import test from "node:test";
import assert from "node:assert/strict";
import Express from "express";
import CookieParser from "cookie-parser";
import JWToken from "jsonwebtoken";
import { SECRETS } from "../Configurations/Secrets.js";
import { commerceDatabase, seedCommerce, mysqlEnabled } from "./CommerceFixtures.js";
import { CommerceStore } from "../Utilities/CommerceStore.js";
import { OrderService } from "../Utilities/OrderService.js";
import { commerceRouters } from "../Routes/CommerceRoutes.js";

test("commerce endpoints enforce verified identity, current roles, ownership and CSRF", { skip: !mysqlEnabled }, async (t) => {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  const store = new CommerceStore(connect), config = { origin: "http://localhost:5173", enabled: false };
  const routes = commerceRouters(store, new OrderService(store, { config }), config);
  const app = Express(); app.use(Express.json()); app.use(CookieParser());
  app.use("/account/commerce", routes.member); app.use("/auth/commerce", routes.admin);
  const server = await new Promise((resolve) => { const listening = app.listen(0, "127.0.0.1", () => resolve(listening)); });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const token = JWToken.sign({ id: 101, account_email: "one@example.invalid", account_roles: ["Administrator"] }, SECRETS.SITEKEY);
  const request = async (path, { method = "GET", body, csrf, cookie = token, origin = config.origin } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
      headers: { "Content-Type": "application/json", Origin: origin, Cookie: `loginToken=${cookie}`, ...(csrf ? { "X-Commerce-CSRF": csrf } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  };
  assert.equal((await request("/account/commerce/context", { cookie: "" })).status, 401);
  assert.equal((await request("/account/commerce/context", { cookie: "invalid" })).status, 401);
  const context = (await request("/account/commerce/context")).data.Result;
  assert.equal(context.members.length, 1); assert.equal(context.paymentsEnabled, false);
  assert.equal((await request("/auth/commerce/settings")).status, 403);
  const body = { productId: 101, memberId: 101, quantity: 1, version: 0 };
  assert.equal((await request("/account/commerce/cart/items", { method: "POST", body })).status, 403);
  assert.equal((await request("/account/commerce/cart/items", { method: "POST", body, csrf: context.csrf, origin: "https://foreign.invalid" })).status, 403);
  assert.equal((await request("/account/commerce/cart/items", { method: "POST", body, csrf: context.csrf })).status, 200);
  assert.equal((await request("/account/commerce/checkout", { method: "POST", body: {}, csrf: context.csrf })).status, 503);
  await db.query("INSERT INTO account_roles(account_email,account_role) VALUES('one@example.invalid','Administrator')");
  assert.equal((await request("/auth/commerce/settings")).status, 200);
  const fee = { version: 1, fee_enabled: true, fee_basis_points: 200, fee_fixed_cents: 30 };
  assert.equal((await request("/auth/commerce/settings", { method: "PUT", body: fee })).status, 403);
  assert.equal((await request("/auth/commerce/settings", { method: "PUT", body: fee, csrf: context.csrf })).status, 200);
  assert.equal((await request("/auth/commerce/settings", { method: "PUT", body: fee, csrf: context.csrf })).status, 409);
  const coupon = { code: "TEN", kind: "percent", amount: 1000, active: true, starts_at: null, ends_at: null, max_uses: 1, per_account: 1 };
  const saved = await request("/auth/commerce/coupons", { method: "POST", body: coupon, csrf: context.csrf });
  assert.equal(saved.status, 200);
  assert.equal((await request(`/auth/commerce/coupons/${saved.data.Result.id}`, {
    method: "PUT", body: { ...coupon, version: 1, active: false }, csrf: context.csrf,
  })).status, 200);
  await db.query("UPDATE events SET published=FALSE WHERE id=101");
  assert.equal((await request("/account/commerce/events/first/products")).status, 404);
  await db.query("UPDATE account_roles SET account_role='Non-member' WHERE account_email='one@example.invalid' AND account_role='Member'");
  assert.equal((await request("/account/commerce/context")).status, 403);
});
