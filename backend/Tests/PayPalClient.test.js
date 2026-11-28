import test from "node:test";
import assert from "node:assert/strict";
import { PayPalClient, verifyPayment } from "../Services/PayPalClient.js";
import { commerceConfig } from "../Configurations/Commerce.js";

export const paymentOrder = { id: "11111111-1111-4111-8111-111111111111", paypal_order_id: "PAYPAL1",
  subtotal_cents: 2000, discount_cents: 200, fee_cents: 82, total_cents: 1882,
  items: [{ product_id: 1, snapshot: { name: "Ticket" }, quantity: 2, unit_cents: 1000 }] };
export const completedPayment = () => ({ id: "PAYPAL1", status: "COMPLETED", purchase_units: [{
  reference_id: paymentOrder.id, custom_id: paymentOrder.id, payee: { merchant_id: "MERCHANT" },
  amount: { currency_code: "USD", value: "18.82" },
  payments: { captures: [{ id: "CAPTURE1", status: "COMPLETED", amount: { currency_code: "USD", value: "18.82" } }] },
}] });

test("completed payment proof checks correlation, merchant, currency, amount and capture status", () => {
  assert.equal(verifyPayment(completedPayment(), paymentOrder, "MERCHANT").id, "CAPTURE1");
  for (const mutate of [
    (data) => { data.id = "OTHER"; },
    (data) => { data.purchase_units[0].payee.merchant_id = "OTHER"; },
    (data) => { data.purchase_units[0].payments.captures[0].amount.value = "18.81"; },
    (data) => { data.purchase_units[0].payments.captures[0].amount.currency_code = "EUR"; },
    (data) => { data.purchase_units[0].payments.captures[0].status = "PENDING"; },
  ]) {
    const data = completedPayment(); mutate(data);
    assert.throws(() => verifyPayment(data, paymentOrder, "MERCHANT"));
  }
});
test("PayPal uses persisted action keys, exact breakdowns, fixed redirects and no client secrets", async () => {
  const requests = [];
  const client = new PayPalClient({ configured: true, host: "https://api-m.sandbox.paypal.com",
    clientId: "test", clientSecret: "not-a-real-secret", merchantId: "MERCHANT", origin: "http://localhost:5173", webhookId: "WH" },
  async (url, options) => {
    requests.push({ url, options });
    return Response.json(url.endsWith("/token") ? { access_token: "fake-token", expires_in: 3600 } :
      { id: "PAYPAL1", links: [{ rel: "approve", href: "https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL1" }] });
  });
  await client.create(paymentOrder);
  await client.create(paymentOrder);
  const body = JSON.parse(requests[1].options.body);
  assert.equal(body.purchase_units[0].amount.value, "18.82");
  assert.equal(body.purchase_units[0].items[0].unit_amount.value, "10.00");
  assert.equal(body.purchase_units[0].items[0].quantity, "2");
  assert.equal(body.purchase_units[0].amount.breakdown.handling.value, "0.82");
  assert.equal(body.purchase_units[0].amount.breakdown.discount.value, "2.00");
  assert.equal(requests[1].options.headers["PayPal-Request-Id"], requests[2].options.headers["PayPal-Request-Id"]);
  assert.ok(body.payment_source.paypal.experience_context.return_url.startsWith("http://localhost:5173/shoppingCheckout?"));
  assert.equal(commerceConfig({}).enabled, false);
});

test("provider errors, invalid JSON and unverified webhook messages never become successful payments", async () => {
  const config = { configured: true, host: "https://api-m.sandbox.paypal.com", clientId: "test", clientSecret: "fake", webhookId: "WH" };
  for (const response of [new Response("unavailable", { status: 429 }), new Response("{"), new Response("x".repeat(1048577))]) {
    const client = new PayPalClient(config, async () => response);
    await assert.rejects(client.get("PAYPAL1"), { status: 502 });
  }
  const calls = [];
  const client = new PayPalClient(config, async (url, options) => {
    calls.push({ url, options });
    return Response.json(url.endsWith("/token") ? { access_token: "test", expires_in: 300 } : { verification_status: "FAILURE" });
  });
  await assert.rejects(client.verifyWebhook({}, {}), { status: 400 });
  const headers = Object.fromEntries(["auth-algo", "cert-url", "transmission-id", "transmission-sig", "transmission-time"].map((key) =>
    [`paypal-${key}`, key === "cert-url" ? "https://foreign.invalid/cert" : "test"]));
  await assert.rejects(client.verifyWebhook({ id: "event" }, headers), { status: 400 });
  assert.ok(calls.every((call) => call.url.startsWith(config.host)));
  assert.equal(JSON.parse(calls.at(-1).options.body).webhook_id, "WH");
});
