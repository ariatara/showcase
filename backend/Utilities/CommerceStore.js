import { createHash } from "node:crypto";
import { cents, integer, couponCode, totals, CommerceError } from "./CommerceMoney.js";

export const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const utcDate = (value) => value instanceof Date ? value : new Date(String(value).replace(" ", "T") + (/[Zz]|[+-]\d\d:\d\d$/.test(String(value)) ? "" : "Z"));

export class CommerceStore {
  constructor(connect) { this.connect = connect; }

  async transaction(work) {
    const db = await this.connect();
    try {
      db.connection.config.timezone = "Z";
      await db.query("SET time_zone = '+00:00'");
      await db.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
      await db.beginTransaction();
      const result = await work(db);
      await db.commit();
      return result;
    } catch (error) {
      await db.rollback();
      if (["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(error.code)) {
        throw new CommerceError(409, "Another request changed this purchase. Refresh and retry.");
      }
      throw error;
    } finally { await db.end(); }
  }

  async account(db, id, role = "Member") {
    integer(id, "Account ID");
    const [[account]] = await db.query(`SELECT a.id,a.account_email FROM accounts a
      JOIN account_roles r ON r.account_email=a.account_email WHERE a.id=? AND r.account_role=? FOR SHARE`, [id, role]);
    if (!account) throw new CommerceError(403, `${role} access is required.`);
    return account;
  }

  async context(id) {
    return this.transaction(async (db) => {
      const account = await this.account(db, id);
      const [members] = await db.query(`SELECT id,first_name,last_name,membership_category FROM members
        WHERE account_email=? ORDER BY id LIMIT 201`, [account.account_email]);
      if (members.length > 200) throw new CommerceError(409, "This account exceeds the supported member selection limit.");
      const cart = await this.loadCart(db, account);
      const [[pending]] = await db.query(`SELECT id FROM commerce_orders WHERE account_id=?
        AND status NOT IN ('paid','refunded','reversed','cancelled','expired','failed') ORDER BY created_at DESC LIMIT 1`, [id]);
      return { accountId: id, members, cartVersion: cart.version, cartCount: cart.lines.reduce((sum, item) => sum + item.quantity, 0),
        pendingOrderId: pending?.id ?? null };
    });
  }

  async catalog(id, eventURL, after = 0) {
    integer(after, "Catalog cursor", 0);
    if (typeof eventURL !== "string" || eventURL.length > 64) throw new CommerceError(400, "Invalid event URL.");
    return this.transaction(async (db) => {
      await this.account(db, id);
      const [[event]] = await db.query("SELECT id FROM events WHERE url=? AND published=TRUE", [eventURL]);
      if (!event) throw new CommerceError(404, "Published event not found.");
      const [rows] = await db.query(`SELECT p.id,p.name,p.type,p.image_name,p.target,p.price,p.event_date,p.version,
        p.inventory-COALESCE((SELECT SUM(r.quantity) FROM commerce_reservations r WHERE r.product_id=p.id AND r.state='active'),0) AS available
        FROM member_products p WHERE p.event_url=? AND p.active=TRUE AND p.id>? ORDER BY p.id LIMIT 21`, [eventURL, after]);
      return { products: rows.slice(0, 20).map(({ price, ...product }) => ({ ...product, available: Number(product.available), unit_cents: cents(price) })),
        next: rows.length > 20 ? rows[19].id : null };
    });
  }

  async loadCart(db, account) {
    await db.query("INSERT INTO commerce_carts(account_id) VALUES(?) ON DUPLICATE KEY UPDATE account_id=account_id", [account.id]);
    const [[cart]] = await db.query("SELECT id,version FROM commerce_carts WHERE account_id=? FOR UPDATE", [account.id]);
    const [items] = await db.query(`SELECT c.*,p.name,p.type,p.image_name,p.target,p.price,p.version AS current_version,
      p.inventory,p.active,p.event_date,e.id AS event_id,e.url AS event_url,e.event_title,e.published,
      m.first_name,m.last_name,m.membership_category,m.account_email,
      COALESCE((SELECT SUM(oi.quantity) FROM commerce_order_items oi JOIN commerce_reservations r
        ON r.order_id=oi.order_id AND r.product_id=oi.product_id WHERE oi.cart_item_id=c.id AND r.state='active'),0) AS held_for_line,
      COALESCE((SELECT SUM(r.quantity) FROM commerce_reservations r WHERE r.product_id=p.id AND r.state='active'),0) AS reserved
      FROM commerce_cart_items c JOIN member_products p ON p.id=c.product_id JOIN events e ON e.url=p.event_url
      JOIN members m ON m.id=c.member_id WHERE c.cart_id=? ORDER BY p.id,c.id`, [cart.id]);
    const quantities = new Map(), credits = new Map();
    for (const item of items) {
      quantities.set(item.product_id, (quantities.get(item.product_id) || 0) + item.quantity);
      credits.set(item.product_id, (credits.get(item.product_id) || 0) + Number(item.held_for_line));
    }
    cart.lines = items.map(({ account_email, price, reserved, inventory, active, published, held_for_line, ...item }) => ({
      ...item, unit_cents: cents(price), available: inventory - Number(reserved),
      issue: account_email !== account.account_email || item.membership_category !== item.target ? "Member is no longer eligible." :
        !active || !published ? "Product is no longer available." :
        quantities.get(item.product_id) > inventory - Number(reserved) + credits.get(item.product_id) ? "Insufficient available inventory." : "",
      changed: item.product_version !== item.current_version,
    }));
    return cart;
  }

  async cart(id) {
    return this.transaction(async (db) => this.loadCart(db, await this.account(db, id)));
  }

  async changeCart(id, action, input) {
    integer(input?.version, "Cart version", 0);
    if (!["add", "update", "remove"].includes(action)) throw new CommerceError(400, "Invalid cart action.");
    if (action !== "remove") integer(input.quantity, "Quantity", 1, 99);
    return this.transaction(async (db) => {
      const account = await this.account(db, id);
      const cart = await this.loadCart(db, account);
      if (cart.version !== Number(input.version)) throw new CommerceError(409, "Cart changed in another tab. Review the current cart.");
      if (action === "add") {
        integer(input.productId, "Product ID");
        integer(input.memberId, "Member ID");
        const [[product]] = await db.query(`SELECT p.id,p.version,p.target FROM member_products p JOIN events e ON e.url=p.event_url
          WHERE p.id=? AND p.active=TRUE AND e.published=TRUE FOR UPDATE`, [input.productId]);
        if (!product) throw new CommerceError(404, "Product is unavailable.");
        const [[member]] = await db.query("SELECT id FROM members WHERE id=? AND account_email=? AND membership_category=? FOR SHARE",
          [input.memberId, account.account_email, product.target]);
        if (!member) throw new CommerceError(403, "Select an eligible registered member from your account.");
        const prior = cart.lines.find((line) => line.product_id === Number(input.productId) && line.member_id === Number(input.memberId));
        if (!prior && cart.lines.length >= 50) throw new CommerceError(400, "A cart can contain at most 50 product/member lines.");
        const quantity = integer((prior?.quantity || 0) + Number(input.quantity), "Combined quantity", 1, 99);
        await db.query(`INSERT INTO commerce_cart_items(cart_id,product_id,member_id,quantity,product_version) VALUES(?,?,?,?,?)
          ON DUPLICATE KEY UPDATE quantity=?,version=version+1,product_version=?`,
        [cart.id, product.id, member.id, quantity, product.version, quantity, product.version]);
      } else {
        integer(input.itemId, "Cart item ID");
        const item = cart.lines.find((line) => line.id === Number(input.itemId));
        if (!item) throw new CommerceError(404, "Cart item not found.");
        await db.query("SELECT id FROM member_products WHERE id=? FOR UPDATE", [item.product_id]);
        if (action === "remove") await db.query("DELETE FROM commerce_cart_items WHERE id=? AND cart_id=?", [item.id, cart.id]);
        else await db.query("UPDATE commerce_cart_items SET quantity=?,version=version+1 WHERE id=? AND cart_id=?", [input.quantity, item.id, cart.id]);
      }
      await db.query("UPDATE commerce_carts SET version=version+1 WHERE id=?", [cart.id]);
      const updated = await this.loadCart(db, account);
      const affectedProduct = action === "add" ? Number(input.productId) : cart.lines.find((line) => line.id === Number(input.itemId))?.product_id;
      const invalid = updated.lines.find((line) => line.product_id === affectedProduct && line.issue);
      if (action !== "remove" && invalid) throw new CommerceError(409, invalid.issue);
      return updated;
    });
  }

  async priceCart(db, account, code) {
    const cart = await this.loadCart(db, account);
    if (!cart.lines.length) throw new CommerceError(400, "Your cart is empty.");
    const ids = [...new Set(cart.lines.map((line) => line.product_id))];
    await db.query("SELECT id FROM member_products WHERE id IN (?) ORDER BY id FOR UPDATE", [ids]);
    const refreshed = await this.loadCart(db, account);
    const invalid = refreshed.lines.find((line) => line.issue);
    if (invalid) throw new CommerceError(409, invalid.issue);
    const [[settings]] = await db.query("SELECT * FROM commerce_settings WHERE id=1 FOR SHARE");
    if (!settings) throw new CommerceError(503, "Commerce settings are not installed.");
    let coupon = null;
    if (code !== "" && code != null) {
      const normalized = couponCode(code);
      const [[found]] = await db.query("SELECT * FROM commerce_coupons WHERE code=? FOR UPDATE", [normalized]);
      const now = Date.now();
      if (!found || !found.active || (found.starts_at && utcDate(found.starts_at).getTime() > now) ||
          (found.ends_at && utcDate(found.ends_at).getTime() <= now)) throw new CommerceError(400, "Coupon is invalid or expired.");
      const [[usage]] = await db.query(`SELECT COUNT(*) AS total,COALESCE(SUM(account_id=?),0) AS own FROM commerce_coupon_redemptions
        WHERE coupon_id=? AND state IN ('reserved','consumed')`, [account.id, found.id]);
      if ((found.max_uses != null && usage.total >= found.max_uses) ||
          (found.per_account != null && Number(usage.own) >= found.per_account)) throw new CommerceError(409, "Coupon usage limit reached.");
      coupon = found;
    }
    const amounts = totals(refreshed.lines, coupon, settings);
    const hashInput = { version: cart.version, lines: refreshed.lines.map((line) => [line.id, line.version, line.quantity, line.unit_cents,
      line.current_version, line.member_id, line.event_id, line.event_url, line.target]), settings, coupon };
    return { cart: refreshed, settings, coupon, amounts, hash: hash(hashInput) };
  }

  async quote(id, code = "") {
    return this.transaction(async (db) => this.priceCart(db, await this.account(db, id), code));
  }

  async settings() {
    return this.transaction(async (db) => {
      const [[settings]] = await db.query("SELECT * FROM commerce_settings WHERE id=1");
      if (!settings) throw new CommerceError(503, "Commerce settings are not installed.");
      return settings;
    });
  }

  async saveSettings(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new CommerceError(400, "Fee settings are required.");
    integer(input.version, "Settings version");
    integer(input.fee_basis_points, "Fee percentage", 0, 10000);
    integer(input.fee_fixed_cents, "Fixed fee", 0, 100000000);
    if (typeof input.fee_enabled !== "boolean" || (input.fee_enabled && !Number(input.fee_basis_points) && !Number(input.fee_fixed_cents))) {
      throw new CommerceError(400, "Enabling the fee requires a configured rate.");
    }
    return this.transaction(async (db) => {
      const [result] = await db.query(`UPDATE commerce_settings SET fee_enabled=?,fee_basis_points=?,fee_fixed_cents=?,version=version+1
        WHERE id=1 AND version=?`, [input.fee_enabled, input.fee_basis_points, input.fee_fixed_cents, input.version]);
      if (!result.affectedRows) throw new CommerceError(409, "Fee settings changed. Reload before saving.");
      const [[settings]] = await db.query("SELECT * FROM commerce_settings WHERE id=1");
      return settings;
    });
  }

  async coupons(after = 0) {
    integer(after, "Coupon cursor", 0);
    return this.transaction(async (db) => {
      const [rows] = await db.query("SELECT * FROM commerce_coupons WHERE id>? ORDER BY id LIMIT 51", [after]);
      return { coupons: rows.slice(0, 50), next: rows.length > 50 ? rows[49].id : null };
    });
  }

  async saveCoupon(input, id) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new CommerceError(400, "Coupon details are required.");
    const code = couponCode(input.code);
    if (!["percent", "fixed"].includes(input.kind) || typeof input.active !== "boolean") throw new CommerceError(400, "Invalid coupon type or active state.");
    integer(input.amount, "Coupon amount", 1, input.kind === "percent" ? 10000 : 100000000);
    for (const key of ["max_uses", "per_account"]) if (input[key] != null) integer(input[key], key, 1, 2147483647);
    const date = (value) => {
      if (value == null || value === "") return null;
      if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) {
        throw new CommerceError(400, "Coupon dates must be UTC timestamps.");
      }
      return new Date(value);
    };
    const starts = date(input.starts_at), ends = date(input.ends_at);
    if (starts && ends && ends <= starts) throw new CommerceError(400, "Coupon expiry must be after its start.");
    const values = [code, input.kind, input.amount, input.active, starts, ends, input.max_uses ?? null, input.per_account ?? null];
    return this.transaction(async (db) => {
      if (id != null) {
        integer(id, "Coupon ID"); integer(input.version, "Coupon version");
        const [result] = await db.query(`UPDATE commerce_coupons SET code=?,kind=?,amount=?,active=?,starts_at=?,ends_at=?,max_uses=?,
          per_account=?,version=version+1 WHERE id=? AND version=?`, [...values, id, input.version]);
        if (!result.affectedRows) throw new CommerceError(409, "Coupon changed. Reload before saving.");
      } else {
        const [result] = await db.query("INSERT INTO commerce_coupons(code,kind,amount,active,starts_at,ends_at,max_uses,per_account) VALUES(?,?,?,?,?,?,?,?)", values);
        id = result.insertId;
      }
      const [[coupon]] = await db.query("SELECT * FROM commerce_coupons WHERE id=?", [id]);
      return coupon;
    });
  }
}
