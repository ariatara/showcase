import test from "node:test";
import assert from "node:assert/strict";
import { commerceDatabase, seedCommerce, mysqlEnabled } from "./CommerceFixtures.js";
import { CommerceStore } from "../Utilities/CommerceStore.js";
import { OrderService } from "../Utilities/OrderService.js";
import { CommerceError } from "../Utilities/CommerceMoney.js";
import { replaceMemberProducts } from "../Utilities/MemberProductWrites.js";

function providerDouble() {
  const orders = new Map();
  return {
    config: { enabled: true, mode: "sandbox", merchantId: "MERCHANT", clientId: "test-application" }, captures: 0,
    async verifyWebhook(event, headers) {
      if (headers.signature !== "valid") throw new CommerceError(400, "Invalid signature");
      return true;
    },
    async create(order) {
      orders.set(order.id, { id: order.id, status: "APPROVED", purchase_units: [{
        reference_id: order.id, custom_id: order.id, payee: { merchant_id: "MERCHANT" },
        amount: { currency_code: "USD", value: (order.total_cents / 100).toFixed(2) },
      }] });
      return { id: order.id, approval: "https://www.sandbox.paypal.com/checkoutnow?token=" + order.id };
    },
    async get(id) { return structuredClone(orders.get(id)); },
    async capture(order) {
      const data = orders.get(order.paypal_order_id);
      if (data.status !== "COMPLETED") {
        this.captures++;
        data.status = "COMPLETED";
        data.purchase_units[0].payments = { captures: [{ id: order.id, status: "COMPLETED", amount: data.purchase_units[0].amount }] };
      }
      return structuredClone(data);
    },
  };
}

test("checkout holds stock once, verifies capture once and preserves later cart additions", { skip: !mysqlEnabled }, async (t) => {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  const store = new CommerceStore(connect), paypal = providerDouble(), orders = new OrderService(store, paypal);
  await store.changeCart(101, "add", { productId: 101, memberId: 101, quantity: 2, version: 0 });
  const quote = await store.quote(101);
  const input = { hash: quote.hash, coupon: "", key: "checkout-key-1" };
  const order = await orders.checkout(101, input);
  assert.equal((await orders.checkout(101, input)).id, order.id);
  await assert.rejects(orders.checkout(101, { ...input, coupon: "OTHER" }), { status: 409 });
  await assert.rejects(orders.get(order.id, 102), { status: 404 });
  assert.equal((await store.catalog(101, "first")).products[0].available, 3);
  await store.changeCart(101, "add", { productId: 102, memberId: 101, quantity: 1, version: 1 });
  await store.changeCart(101, "add", { productId: 101, memberId: 101, quantity: 1, version: 2 });
  const paid = await orders.capture(order.id, 101);
  assert.equal(paid.status, "paid");
  assert.equal((await orders.capture(order.id, 101)).status, "paid");
  assert.equal(paypal.captures, 1);
  const [[stock]] = await db.query("SELECT inventory,version FROM member_products WHERE id=101");
  assert.equal(stock.inventory, 3); assert.equal(stock.version, 2);
  const remaining = await store.cart(101);
  assert.equal(remaining.lines.length, 2);
  assert.equal(remaining.lines.find((line) => line.product_id === 101).quantity, 1);
  assert.equal(remaining.lines.find((line) => line.product_id === 102).quantity, 1);
  await assert.rejects(db.query("DELETE FROM events WHERE id=101"));
});

test("coupon reservations enforce global limits concurrently and release once on cancellation", { skip: !mysqlEnabled }, async (t) => {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  const store = new CommerceStore(connect), orders = new OrderService(store, providerDouble());
  await db.query("INSERT INTO commerce_coupons(code,kind,amount,max_uses,per_account) VALUES('ONLYONE','fixed',100,1,1)");
  for (const id of [101, 102]) await store.changeCart(id, "add", { productId: id, memberId: id, quantity: 1, version: 0 });
  const quotes = await Promise.all([101, 102].map((id) => store.quote(id, "ONLYONE")));
  const results = await Promise.allSettled([101, 102].map((id, i) => orders.checkout(id, { hash: quotes[i].hash, coupon: "ONLYONE", key: `coupon-${id}` })));
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  const order = results.find((item) => item.status === "fulfilled").value;
  await orders.cancel(order.id, order.account_id); await orders.cancel(order.id, order.account_id);
  const [[usage]] = await db.query("SELECT COUNT(*) AS count FROM commerce_coupon_redemptions WHERE state='reserved'");
  assert.equal(usage.count, 0);
  assert.notEqual((await store.quote(order.account_id, "ONLYONE")).hash, quotes[order.account_id === 101 ? 0 : 1].hash);
});

test("in-flight capture defeats cancellation and honors frozen eligibility after capture starts", { skip: !mysqlEnabled }, async (t) => {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  const store = new CommerceStore(connect), paypal = providerDouble(), orders = new OrderService(store, paypal);
  await store.changeCart(101, "add", { productId: 101, memberId: 101, quantity: 2, version: 0 });
  const quote = await store.quote(101), order = await orders.checkout(101, { hash: quote.hash, coupon: "", key: "capture-race" });
  await assert.rejects(replaceMemberProducts(db, "first", [{ productId: 101, version: 1, productName: "First ticket", productType: "Ticket",
    productTarget: "Adult", productPrice: "10.25", productInventory: 1, eventDate: "2026-04-01" }], 1), { status: 409 });
  let ready, resume;
  const started = new Promise((resolve) => { ready = resolve; }), gate = new Promise((resolve) => { resume = resolve; });
  const capture = paypal.capture.bind(paypal);
  paypal.capture = async (value) => { ready(); await gate; return capture(value); };
  const paying = orders.capture(order.id, 101);
  await started;
  try {
    await assert.rejects(orders.cancel(order.id, 101), { status: 409 });
    await db.query("UPDATE events SET published=FALSE WHERE id=101");
    await db.query("UPDATE members SET membership_category='Senior' WHERE id=101");
  } finally { resume(); }
  assert.equal((await paying).status, "paid");
  const [[stock]] = await db.query("SELECT inventory FROM member_products WHERE id=101");
  assert.equal(stock.inventory, 3);
});

test("verified approval recovers a lost create response, deduplicates and records refunds without restocking", { skip: !mysqlEnabled }, async (t) => {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  const store = new CommerceStore(connect), paypal = providerDouble(), orders = new OrderService(store, paypal);
  await store.changeCart(101, "add", { productId: 101, memberId: 101, quantity: 1, version: 0 });
  const quote = await store.quote(101), order = await orders.reserve(101, { hash: quote.hash, coupon: "", key: "webhook-return" });
  await paypal.create(order);
  const event = { id: "EVENT-1", event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: order.id } };
  await assert.rejects(orders.webhook(event, { signature: "forged" }), { status: 400 });
  await orders.webhook(event, { signature: "valid" });
  assert.equal((await orders.get(order.id, 101)).status, "paid");
  assert.deepEqual(await orders.webhook(event, { signature: "valid" }), { duplicate: true });
  assert.equal(paypal.captures, 1);
  await orders.webhook({ id: "EVENT-2", event_type: "PAYMENT.CAPTURE.REFUNDED", resource: {
    id: "REFUND-1", supplementary_data: { related_ids: { order_id: order.id, capture_id: order.id } },
  } }, { signature: "valid" });
  assert.equal((await orders.get(order.id, 101)).status, "refunded");
  assert.equal((await db.query("SELECT inventory FROM member_products WHERE id=101"))[0][0].inventory, 4);
});

test("recovery expires only definitively unpaid orders and keeps aged ambiguous creation reserved", { skip: !mysqlEnabled }, async (t) => {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  const store = new CommerceStore(connect), paypal = providerDouble(), orders = new OrderService(store, paypal);
  await store.changeCart(101, "add", { productId: 101, memberId: 101, quantity: 1, version: 0 });
  let quote = await store.quote(101), order = await orders.checkout(101, { hash: quote.hash, coupon: "", key: "expire-order" });
  await db.query("UPDATE commerce_orders SET expires_at=DATE_SUB(NOW(),INTERVAL 1 HOUR) WHERE id=?", [order.id]);
  await orders.reconcile();
  assert.equal((await orders.get(order.id, 101)).status, "expired");
  quote = await store.quote(101); order = await orders.reserve(101, { hash: quote.hash, coupon: "", key: "ambiguous-order" });
  await db.query("UPDATE commerce_orders SET created_at=DATE_SUB(NOW(),INTERVAL 7 HOUR) WHERE id=?", [order.id]);
  await orders.reconcile();
  assert.equal((await orders.get(order.id, 101)).status, "reconciliation_required");
  assert.equal((await store.catalog(101, "first")).products[0].available, 4);
});

test("delayed verified capture completion survives an already-recorded provider refund", { skip: !mysqlEnabled }, async (t) => {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  const store = new CommerceStore(connect), paypal = providerDouble(), orders = new OrderService(store, paypal);
  await store.changeCart(101, "add", { productId: 101, memberId: 101, quantity: 1, version: 0 });
  const quote = await store.quote(101), order = await orders.checkout(101, { hash: quote.hash, coupon: "", key: "late-completion" });
  const completed = await paypal.capture(order);
  const get = paypal.get.bind(paypal);
  paypal.get = async (id) => {
    const result = await get(id);
    result.purchase_units[0].payments.captures[0].status = "REFUNDED";
    return result;
  };
  await orders.webhook({ id: "DELAYED-COMPLETION", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: {
    ...completed.purchase_units[0].payments.captures[0], supplementary_data: { related_ids: { order_id: order.id } },
  } }, { signature: "valid" });
  assert.equal((await orders.get(order.id, 101)).status, "refunded");
  assert.equal((await db.query("SELECT inventory FROM member_products WHERE id=101"))[0][0].inventory, 4);
});

test("a changed fee quote is rejected before any reservation or provider order", { skip: !mysqlEnabled }, async (t) => {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  const store = new CommerceStore(connect), orders = new OrderService(store, providerDouble());
  await store.changeCart(101, "add", { productId: 101, memberId: 101, quantity: 1, version: 0 });
  const quote = await store.quote(101);
  await store.saveSettings({ version: 1, fee_enabled: true, fee_basis_points: 200, fee_fixed_cents: 30 });
  await assert.rejects(orders.checkout(101, { hash: quote.hash, coupon: "", key: "old-fee-quote" }), { status: 409 });
  assert.equal((await db.query("SELECT COUNT(*) AS count FROM commerce_orders"))[0][0].count, 0);
  assert.equal((await store.catalog(101, "first")).products[0].available, 5);
});

test("concurrent cross-account checkout cannot oversell or overuse a coupon", { skip: !mysqlEnabled }, async (t) => {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  const store = new CommerceStore(connect), orders = new OrderService(store, providerDouble());
  for (const id of [101, 102]) await store.changeCart(id, "add", { productId: 101, memberId: id, quantity: 4, version: 0 });
  const quotes = await Promise.all([101, 102].map((id) => store.quote(id)));
  const results = await Promise.allSettled([101, 102].map((id, index) => orders.checkout(id, { hash: quotes[index].hash, coupon: "", key: `request-${id}` })));
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  const order = results.find((item) => item.status === "fulfilled").value;
  assert.equal((await orders.cancel(order.id, order.account_id)).status, "cancelled");
  assert.equal((await store.catalog(101, "first")).products[0].available, 5);
  await assert.rejects(orders.capture(order.id, order.account_id), { status: 409 });
});

test("ambiguous capture retains holds and later provider proof reconciles without another charge", { skip: !mysqlEnabled }, async (t) => {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  const store = new CommerceStore(connect), paypal = providerDouble(), orders = new OrderService(store, paypal);
  await store.changeCart(101, "add", { productId: 101, memberId: 101, quantity: 1, version: 0 });
  const quote = await store.quote(101);
  const order = await orders.checkout(101, { hash: quote.hash, coupon: "", key: "lost-response" });
  const capture = paypal.capture.bind(paypal);
  paypal.capture = async (value) => { await capture(value); throw new Error("Lost provider response"); };
  await assert.rejects(orders.capture(order.id, 101), /Lost/);
  assert.equal((await store.catalog(101, "first")).products[0].available, 4);
  assert.equal((await orders.cancel(order.id, 101)).status, "paid");
  assert.equal(paypal.captures, 1);
});

test("an in-flight order cannot be recreated or captured under another provider configuration", { skip: !mysqlEnabled }, async (t) => {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  const store = new CommerceStore(connect), paypal = providerDouble(), orders = new OrderService(store, paypal);
  await store.changeCart(101, "add", { productId: 101, memberId: 101, quantity: 1, version: 0 });
  const quote = await store.quote(101);
  const order = await orders.reserve(101, { hash: quote.hash, coupon: "", key: "provider-change" });
  for (const change of [{ merchantId: "OTHER" }, { mode: "live" }, { clientId: "other-application" }]) {
    const switched = new OrderService(store, { ...paypal, config: { ...paypal.config, ...change } });
    await assert.rejects(switched.createPayment(order), { status: 503 });
  }
  await orders.createPayment(order);
  const switched = new OrderService(store, { ...paypal, config: { ...paypal.config, merchantId: "OTHER" } });
  await assert.rejects(switched.capture(order.id, 101), { status: 503 });
  await assert.rejects(switched.cancel(order.id, 101), { status: 503 });
  assert.equal((await store.catalog(101, "first")).products[0].available, 4);
  assert.equal((await orders.capture(order.id, 101)).status, "paid");
});

test("recovery finishes its current order and stops its batch on shutdown", { skip: !mysqlEnabled }, async (t) => {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  const store = new CommerceStore(connect), paypal = providerDouble(), orders = new OrderService(store, paypal);
  for (const owner of [101, 102]) {
    await store.changeCart(owner, "add", { productId: 101, memberId: owner, quantity: 1, version: 0 });
    const quote = await store.quote(owner);
    await orders.checkout(owner, { hash: quote.hash, coupon: "", key: `shutdown-${owner}` });
  }
  await db.query("UPDATE commerce_orders SET expires_at=DATE_SUB(NOW(),INTERVAL 1 HOUR)");
  const controller = new AbortController(), get = paypal.get.bind(paypal);
  paypal.get = async (id) => { controller.abort(); return get(id); };
  const results = await orders.reconcile(20, { signal: controller.signal });
  assert.equal(results.length, 1);
  assert.equal(results[0].status, "expired");
  assert.equal((await db.query("SELECT COUNT(*) AS count FROM commerce_orders WHERE status='awaiting_approval'"))[0][0].count, 1);
  assert.equal((await store.catalog(101, "first")).products[0].available, 4);
});
