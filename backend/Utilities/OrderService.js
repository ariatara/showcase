import { randomUUID } from "node:crypto";
import { CommerceError, couponCode, integer } from "./CommerceMoney.js";
import { hash, utcDate } from "./CommerceStore.js";
import { verifyOrder, verifyPayment } from "../Services/PayPalClient.js";

const finalStates = ["paid", "refunded", "reversed", "cancelled", "expired", "failed"];
const creationWindow = 5 * 60 * 60 * 1000;

export class OrderService {
  constructor(store, paypal) {
    this.store = store; this.paypal = paypal;
    this.providerKey = hash([paypal.config.mode, paypal.config.merchantId, paypal.config.clientId]);
  }

  assertProvider(order) {
    if (order.pricing.providerKey !== this.providerKey) {
      throw new CommerceError(503, "PayPal configuration changed for this order. Restore its original configuration before reconciliation.");
    }
  }

  async read(db, id, owner, lock = false) {
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) throw new CommerceError(400, "Invalid order ID.");
    const [[order]] = await db.query(`SELECT * FROM commerce_orders WHERE id=?${owner == null ? "" : " AND account_id=?"}${lock ? " FOR UPDATE" : ""}`,
      owner == null ? [id] : [id, owner]);
    if (!order) throw new CommerceError(404, "Order not found.");
    const [items] = await db.query("SELECT * FROM commerce_order_items WHERE order_id=? ORDER BY product_id,id", [id]);
    return { ...order, items };
  }

  async get(id, owner) {
    return this.store.transaction((db) => this.read(db, id, owner));
  }

  async reserve(owner, input) {
    if (!input || typeof input.key !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(input.key) ||
        typeof input.hash !== "string" || !/^[a-f0-9]{64}$/.test(input.hash)) throw new CommerceError(400, "A quote and checkout request key are required.");
    if (input.coupon != null && typeof input.coupon !== "string") throw new CommerceError(400, "Coupon must be a single code.");
    const code = input.coupon ? couponCode(input.coupon) : "";
    const payload = hash([input.hash, code]);
    return this.store.transaction(async (db) => {
      const account = await this.store.account(db, owner);
      await this.store.loadCart(db, account);
      const [[existing]] = await db.query("SELECT id,payload_hash FROM commerce_orders WHERE account_id=? AND idempotency_key=?", [owner, input.key]);
      if (existing) {
        if (existing.payload_hash !== payload) throw new CommerceError(409, "Checkout request key was already used for different details.");
        return this.read(db, existing.id, owner);
      }
      const [[pending]] = await db.query("SELECT id FROM commerce_orders WHERE account_id=? AND status NOT IN (?) LIMIT 1", [owner, finalStates]);
      if (pending) {
        const error = new CommerceError(409, "An earlier checkout is unresolved. Open that order before starting another payment.");
        error.orderId = pending.id;
        throw error;
      }
      const quote = await this.store.priceCart(db, account, code);
      if (quote.hash !== input.hash) throw new CommerceError(409, "Prices, coupon, fee or cart changed. Review a new quote before paying.");
      const id = randomUUID(), amounts = quote.amounts;
      await db.query(`INSERT INTO commerce_orders(id,account_id,cart_version,subtotal_cents,discount_cents,fee_cents,total_cents,pricing,
        coupon_id,idempotency_key,payload_hash,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,DATE_ADD(NOW(6),INTERVAL 30 MINUTE))`,
      [id, owner, quote.cart.version, amounts.subtotal, amounts.discount, amounts.fee, amounts.total,
        JSON.stringify({ coupon: quote.coupon, settings: quote.settings, providerKey: this.providerKey }), quote.coupon?.id ?? null, input.key, payload]);
      const quantities = new Map();
      for (const line of quote.cart.lines) {
        const snapshot = { name: line.name, type: line.type, target: line.target, eventTitle: line.event_title,
          eventURL: line.event_url, eventDate: line.event_date, memberName: `${line.first_name} ${line.last_name}` };
        await db.query(`INSERT INTO commerce_order_items(order_id,product_id,event_id,member_id,cart_item_id,cart_item_version,
          product_version,quantity,unit_cents,snapshot) VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [id, line.product_id, line.event_id, line.member_id, line.id, line.version, line.current_version, line.quantity, line.unit_cents, JSON.stringify(snapshot)]);
        quantities.set(line.product_id, (quantities.get(line.product_id) || 0) + line.quantity);
      }
      for (const [product, quantity] of quantities) await db.query("INSERT INTO commerce_reservations(order_id,product_id,quantity) VALUES(?,?,?)", [id, product, quantity]);
      if (quote.coupon) await db.query("INSERT INTO commerce_coupon_redemptions(order_id,coupon_id,account_id) VALUES(?,?,?)", [id, quote.coupon.id, owner]);
      return this.read(db, id, owner);
    });
  }

  async checkout(owner, input) {
    if (!this.paypal.config.enabled) throw new CommerceError(503, "Purchasing is not enabled. No payment has been created.");
    const order = await this.reserve(owner, input);
    try { return await this.createPayment(order); }
    catch (error) { error.orderId = order.id; throw error; }
  }

  async createPayment(order) {
    if (order.status !== "creating_payment") return order;
    this.assertProvider(order);
    if (Date.now() - utcDate(order.created_at).getTime() >= creationWindow) {
      await this.store.transaction((db) => db.query("UPDATE commerce_orders SET status='reconciliation_required' WHERE id=? AND status='creating_payment'", [order.id]));
      throw new CommerceError(409, "Payment creation requires reconciliation; its safe retry window has elapsed.");
    }
    const provider = await this.paypal.create(order);
    return this.store.transaction(async (db) => {
      const current = await this.read(db, order.id, null, true);
      if (current.paypal_order_id && current.paypal_order_id !== provider.id) throw new CommerceError(502, "PayPal returned a conflicting order. Reconciliation is required.");
      await db.query(`UPDATE commerce_orders SET paypal_order_id=?,approval_url=?,status='awaiting_approval'
        WHERE id=? AND status='creating_payment'`, [provider.id, provider.approval, order.id]);
      return this.read(db, order.id);
    });
  }

  async applyPayment(order, provider) {
    this.assertProvider(order);
    const capture = verifyPayment(provider, order, this.paypal.config.merchantId);
    return this.store.transaction(async (db) => {
      const current = await this.read(db, order.id, null, true);
      if (current.capture_id) {
        if (current.capture_id !== capture.id) throw new CommerceError(502, "Unexpected additional capture; reconciliation is required.");
        return current;
      }
      if (["cancelled", "expired", "failed"].includes(current.status)) throw new CommerceError(409, "Payment arrived after release. Operator reconciliation is required.");
      const [reservations] = await db.query("SELECT * FROM commerce_reservations WHERE order_id=? AND state='active' ORDER BY product_id FOR UPDATE", [order.id]);
      if (!reservations.length) throw new CommerceError(409, "Payment has no active reservation. Reconciliation is required.");
      for (const reservation of reservations) {
        const [result] = await db.query("UPDATE member_products SET inventory=inventory-?,version=version+1 WHERE id=? AND inventory>=?",
          [reservation.quantity, reservation.product_id, reservation.quantity]);
        if (!result.affectedRows) throw new CommerceError(409, "Reserved stock is inconsistent. Reconciliation is required.");
      }
      await db.query("UPDATE commerce_reservations SET state='consumed' WHERE order_id=? AND state='active'", [order.id]);
      await db.query("UPDATE commerce_coupon_redemptions SET state='consumed' WHERE order_id=? AND state='reserved'", [order.id]);
      await db.query("UPDATE commerce_orders SET status='paid',capture_id=?,approval_url=NULL WHERE id=?", [capture.id, order.id]);
      for (const item of current.items) {
        const [[line]] = await db.query("SELECT quantity FROM commerce_cart_items WHERE id=? FOR UPDATE", [item.cart_item_id]);
        if (line?.quantity > item.quantity) await db.query("UPDATE commerce_cart_items SET quantity=quantity-?,version=version+1 WHERE id=?", [item.quantity, item.cart_item_id]);
        else if (line) await db.query("DELETE FROM commerce_cart_items WHERE id=?", [item.cart_item_id]);
      }
      await db.query("UPDATE commerce_carts SET version=version+1 WHERE account_id=?", [current.account_id]);
      return this.read(db, order.id);
    });
  }

  async capture(id, owner) {
    let order = await this.get(id, owner);
    if (order.capture_id) return order;
    if (["cancelled", "expired", "failed"].includes(order.status)) throw new CommerceError(409, "This checkout is no longer payable.");
    this.assertProvider(order);
    if (order.status === "creating_payment") order = await this.createPayment(order);
    if (!order.paypal_order_id) throw new CommerceError(409, "Payment creation needs reconciliation.");
    const provider = await this.paypal.get(order.paypal_order_id);
    verifyOrder(provider, order, this.paypal.config.merchantId);
    const captures = provider.purchase_units?.flatMap((unit) => unit.payments?.captures || []) || [];
    if (provider.status === "COMPLETED" && captures[0]?.status === "COMPLETED") return this.applyPayment(order, provider);
    if (captures.length && captures.every((capture) => ["DENIED", "DECLINED"].includes(capture.status))) return this.cancel(id, owner);
    if (captures.length) {
      await this.store.transaction((db) => db.query("UPDATE commerce_orders SET status='payment_pending' WHERE id=? AND capture_id IS NULL AND status NOT IN ('cancelled','expired','failed')", [id]));
      return this.get(id, owner);
    }
    if (provider.status !== "APPROVED") return order;
    const begin = await this.store.transaction(async (db) => {
      const current = await this.read(db, id, owner, true);
      if (current.capture_id) return false;
      if (current.status === "capture_in_progress" && Date.now() - utcDate(current.created_at).getTime() < creationWindow) return true;
      if (current.status !== "awaiting_approval") return false;
      if (utcDate(current.expires_at).getTime() <= Date.now()) throw new CommerceError(409, "Checkout expired. Cancel it and review a new quote.");
      const account = await this.store.account(db, current.account_id);
      for (const item of current.items) {
        const [[eligible]] = await db.query(`SELECT p.id FROM member_products p JOIN events e ON e.url=p.event_url
          JOIN members m ON m.id=? WHERE p.id=? AND e.id=? AND p.active=TRUE AND e.published=TRUE
          AND m.account_email=? AND m.membership_category=p.target FOR SHARE`,
        [item.member_id, item.product_id, item.event_id, account.account_email]);
        if (!eligible) throw new CommerceError(409, "Event or member eligibility changed. Cancel this checkout and review your cart.");
      }
      await db.query("UPDATE commerce_orders SET status='capture_in_progress' WHERE id=?", [id]);
      return true;
    });
    // Recovery retries only the same persisted provider request key inside the conservative window.
    if (!begin) return this.get(id, owner);
    const result = await this.paypal.capture(order);
    const completed = result.purchase_units?.[0]?.payments?.captures?.[0];
    if (result.status === "COMPLETED" && completed?.status === "COMPLETED") return this.applyPayment(order, result);
    await this.store.transaction((db) => db.query("UPDATE commerce_orders SET status='payment_pending' WHERE id=? AND status='capture_in_progress'", [id]));
    return this.get(id, owner);
  }

  async cancel(id, owner, expired = false) {
    let order = await this.get(id, owner);
    if (finalStates.includes(order.status)) return order;
    this.assertProvider(order);
    if (order.status === "creating_payment") order = await this.createPayment(order);
    if (!order.paypal_order_id) throw new CommerceError(409, "Payment creation is uncertain; reservations cannot be released.");
    const provider = await this.paypal.get(order.paypal_order_id);
    verifyOrder(provider, order, this.paypal.config.merchantId);
    const captures = provider.purchase_units?.flatMap((unit) => unit.payments?.captures || []) || [];
    if (captures[0]?.status === "COMPLETED") return this.applyPayment(order, provider);
    const denied = captures.length > 0 && captures.every((capture) => ["DENIED", "DECLINED"].includes(capture.status));
    if (!denied && (captures.length || !["CREATED", "SAVED", "APPROVED", "PAYER_ACTION_REQUIRED", "VOIDED"].includes(provider.status))) {
      throw new CommerceError(409, "Payment is pending or uncertain; reservations have been retained.");
    }
    return this.store.transaction(async (db) => {
      const current = await this.read(db, id, owner, true);
      if (finalStates.includes(current.status)) return current;
      if (!denied && !["creating_payment", "awaiting_approval"].includes(current.status)) throw new CommerceError(409, "Capture may be in progress; cancellation cannot release stock.");
      await db.query("UPDATE commerce_reservations SET state='released' WHERE order_id=? AND state='active'", [id]);
      await db.query("UPDATE commerce_coupon_redemptions SET state='released' WHERE order_id=? AND state='reserved'", [id]);
      await db.query("UPDATE commerce_orders SET status=?,approval_url=NULL WHERE id=?", [denied ? "failed" : expired ? "expired" : "cancelled", id]);
      await db.query("UPDATE commerce_carts SET version=version+1 WHERE account_id=?", [current.account_id]);
      return this.read(db, id, owner);
    });
  }

  async webhook(event, headers) {
    if (!event || typeof event.id !== "string" || event.id.length > 128 || typeof event.event_type !== "string" ||
        event.event_type.length > 100) throw new CommerceError(400, "Invalid payment event.");
    await this.paypal.verifyWebhook(event, headers);
    const [[record]] = await this.store.transaction((db) => db.query("SELECT processed FROM commerce_payment_events WHERE id=?", [event.id]));
    if (record?.processed) return { duplicate: true };
    let providerId = event.event_type.startsWith("CHECKOUT.ORDER.") ? event.resource?.id :
      event.resource?.supplementary_data?.related_ids?.order_id;
    let captureId = event.resource?.supplementary_data?.related_ids?.capture_id;
    if (!captureId && event.event_type.startsWith("PAYMENT.CAPTURE.") && event.event_type !== "PAYMENT.CAPTURE.REFUNDED") captureId = event.resource?.id;
    if (!captureId && event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
      const up = event.resource?.links?.find((link) => link.rel === "up")?.href;
      if (up) {
        const url = new URL(up);
        if (url.origin === this.paypal.config.host) captureId = /^\/v2\/payments\/captures\/([A-Za-z0-9-]{1,64})$/.exec(url.pathname)?.[1];
      }
    }
    if (!providerId && captureId) {
      const capture = await this.paypal.getCapture(captureId);
      providerId = capture.supplementary_data?.related_ids?.order_id;
    }
    for (const value of [providerId, captureId]) {
      if (value != null && (typeof value !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(value))) throw new CommerceError(400, "Invalid payment event reference.");
    }
    let order;
    if (providerId) {
      const [[found]] = await this.store.transaction((db) => db.query("SELECT id FROM commerce_orders WHERE paypal_order_id=?", [providerId]));
      if (found) order = await this.get(found.id);
      else {
        const provider = await this.paypal.get(providerId);
        const reference = provider.purchase_units?.[0]?.reference_id;
        const [[local]] = await this.store.transaction((db) => db.query("SELECT id FROM commerce_orders WHERE id=?", [reference || ""]));
        if (local) {
          order = await this.get(local.id);
          this.assertProvider(order);
          verifyOrder(provider, { ...order, paypal_order_id: providerId }, this.paypal.config.merchantId);
          if (order.paypal_order_id && order.paypal_order_id !== providerId) throw new CommerceError(502, "Conflicting payment order correlation.");
          await this.store.transaction((db) => db.query(`UPDATE commerce_orders SET paypal_order_id=?,status='awaiting_approval'
            WHERE id=? AND paypal_order_id IS NULL AND status='creating_payment'`, [providerId, order.id]));
          order = await this.get(local.id);
        }
      }
    }
    if (!order && captureId) {
      const [[found]] = await this.store.transaction((db) => db.query("SELECT id FROM commerce_orders WHERE capture_id=?", [captureId]));
      if (found) order = await this.get(found.id);
    }
    if (order) this.assertProvider(order);
    await this.store.transaction((db) => db.query("INSERT IGNORE INTO commerce_payment_events(id,order_id,event_type) VALUES(?,?,?)",
      [event.id, order?.id ?? null, event.event_type]));
    if (order && event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const provider = await this.paypal.get(order.paypal_order_id);
      const unit = verifyOrder(provider, order, this.paypal.config.merchantId);
      const currentCapture = unit.payments?.captures?.[0];
      if (unit.payments?.captures?.length !== 1 || currentCapture?.id !== event.resource.id) {
        throw new CommerceError(502, "Verified completion does not match the provider's capture.");
      }
      // A verified completion remains historical proof after a later provider refund.
      const proof = { ...provider, status: "COMPLETED", purchase_units: [{ ...unit, payments: { captures: [event.resource] } }] };
      await this.applyPayment(order, proof);
      if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(currentCapture.status)) {
        await this.store.transaction((db) => db.query("UPDATE commerce_orders SET status='refunded' WHERE id=? AND status='paid'", [order.id]));
      }
    } else if (order && ["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.PENDING", "PAYMENT.CAPTURE.DENIED"].includes(event.event_type) &&
        !(event.event_type === "CHECKOUT.ORDER.APPROVED" && finalStates.includes(order.status))) {
      await this.capture(order.id);
    } else if (order?.capture_id && ["PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED"].includes(event.event_type)) {
      if (captureId !== order.capture_id) throw new CommerceError(502, "Payment adjustment does not match the original capture.");
      await this.store.transaction((db) => db.query("UPDATE commerce_orders SET status=IF(status='reversed',status,?) WHERE id=? AND capture_id=?",
        [event.event_type.endsWith("REFUNDED") ? "refunded" : "reversed", order.id, order.capture_id]));
    } else if (order && ["PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED"].includes(event.event_type)) {
      throw new CommerceError(503, "Original capture must be reconciled before its adjustment.");
    }
    await this.store.transaction((db) => db.query("UPDATE commerce_payment_events SET processed=TRUE WHERE id=?", [event.id]));
    return { processed: true };
  }

  async reconcile(limit = 20, { signal } = {}) {
    integer(limit, "Recovery batch size", 1, 100);
    const [rows] = await this.store.transaction((db) => db.query("SELECT id FROM commerce_orders WHERE status NOT IN (?) ORDER BY updated_at,id LIMIT ?", [finalStates, Number(limit)]));
    const results = [];
    for (const row of rows) {
      if (signal?.aborted) break;
      try {
        let order = await this.get(row.id);
        if (order.status === "creating_payment") order = await this.createPayment(order);
        if (order.status === "awaiting_approval" && utcDate(order.expires_at).getTime() <= Date.now()) order = await this.cancel(order.id, undefined, true);
        else order = await this.capture(order.id);
        results.push({ id: row.id, status: order.status });
      } catch (error) {
        console.error("Payment reconciliation needs attention:", row.id, error.status || error.code || "provider_error");
        results.push({ id: row.id, status: "reconciliation_required" });
      }
      await this.store.transaction((db) => db.query("UPDATE commerce_orders SET updated_at=NOW(6) WHERE id=?", [row.id]));
    }
    return results;
  }
}
