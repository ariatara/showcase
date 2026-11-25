import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { commerceConfig } from "../Configurations/Commerce.js";
import { PayPalClient, verifyPayment } from "../Services/PayPalClient.js";

test("PayPal sandbox existing capture matches the merchant, local correlation and USD total (read-only)", {
  skip: process.env.PAYPAL_SANDBOX_TEST !== "1",
}, async () => {
  const config = commerceConfig();
  assert.equal(config.mode, "sandbox", "This check never calls the live provider.");
  assert.equal(config.configured, true, "Configure sandbox credentials, merchant and webhook IDs.");
  const order = { id: process.env.PAYPAL_SANDBOX_LOCAL_ORDER_ID, paypal_order_id: process.env.PAYPAL_SANDBOX_ORDER_ID,
    total_cents: Number(process.env.PAYPAL_SANDBOX_TOTAL_CENTS) };
  assert.ok(order.id && order.paypal_order_id && Number.isSafeInteger(order.total_cents) && order.total_cents > 0,
    "Supply an already-approved/captured sandbox order and its expected local ID and total.");
  const proof = await new PayPalClient(config).get(order.paypal_order_id);
  assert.ok(verifyPayment(proof, order, config.merchantId).id);
});
