import Express from "express";
import { authorizeCommerce, commerceFailure, csrfToken } from "../Middlewares/CommerceAuthorization.js";

export function presentOrder(order) {
  return { id: order.id, status: order.status, currency: order.currency,
    amounts: { subtotal: Number(order.subtotal_cents), discount: Number(order.discount_cents),
      fee: Number(order.fee_cents), total: Number(order.total_cents) },
    coupon: order.pricing?.coupon?.code || "", approvalUrl: order.approval_url, expiresAt: order.expires_at,
    items: order.items.map((item) => ({ ...item.snapshot, quantity: item.quantity, unit_cents: Number(item.unit_cents) })) };
}

export function commerceRouters(store, orders, config) {
  const member = Express.Router(), admin = Express.Router(), payments = Express.Router();
  const handle = (work) => async (request, response) => {
    try { response.json({ Status: true, Result: await work(request) }); }
    catch (error) { commerceFailure(response, error); }
  };
  member.use(...authorizeCommerce(store, config));
  admin.use(...authorizeCommerce(store, config, "Administrator"));
  member.get("/context", handle(async (request) => ({
    ...await store.context(request.principal.id), csrf: csrfToken(request), paymentsEnabled: config.enabled,
  })));
  member.get("/events/:event_url/products", handle((request) => store.catalog(request.principal.id, request.params.event_url, request.query.after || 0)));
  member.get("/cart", handle((request) => store.cart(request.principal.id)));
  member.post("/cart/items", handle((request) => store.changeCart(request.principal.id, "add", request.body)));
  member.patch("/cart/items/:id", handle((request) => store.changeCart(request.principal.id, "update", { ...request.body, itemId: request.params.id })));
  member.delete("/cart/items/:id", handle((request) => store.changeCart(request.principal.id, "remove", { ...request.body, itemId: request.params.id })));
  member.post("/checkout/quote", handle((request) => store.quote(request.principal.id, request.body?.coupon ?? "")));
  member.post("/checkout", handle(async (request) => presentOrder(await orders.checkout(request.principal.id, request.body))));
  member.get("/orders/:id", handle(async (request) => presentOrder(await orders.get(request.params.id, request.principal.id))));
  for (const action of ["capture", "cancel"]) member.post(`/orders/:id/${action}`,
    handle(async (request) => presentOrder(await orders[action](request.params.id, request.principal.id))));
  admin.get("/settings", handle(async (request) => ({ ...await store.settings(), csrf: csrfToken(request) })));
  admin.put("/settings", handle((request) => store.saveSettings(request.body)));
  admin.get("/coupons", handle((request) => store.coupons(request.query.after || 0)));
  admin.post("/coupons", handle((request) => store.saveCoupon(request.body)));
  admin.put("/coupons/:id", handle((request) => store.saveCoupon(request.body, request.params.id)));
  payments.post("/paypal/webhook", handle((request) => orders.webhook(request.body, request.headers)));
  return { member, admin, payments };
}
