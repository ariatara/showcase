export function commerceConfig(env = process.env) {
  const mode = env.PAYPAL_MODE || "sandbox";
  const origin = env.COMMERCE_APP_ORIGIN || "http://localhost:5173";
  const configured = ["sandbox", "live"].includes(mode) && Boolean(env.PAYPAL_CLIENT_ID &&
    env.PAYPAL_CLIENT_SECRET && env.PAYPAL_MERCHANT_ID && env.PAYPAL_WEBHOOK_ID) &&
    (mode !== "live" || origin.startsWith("https://"));
  return { mode, origin, configured, enabled: configured && env.COMMERCE_PAYMENTS_ENABLED === "true",
    host: mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
    clientId: env.PAYPAL_CLIENT_ID, clientSecret: env.PAYPAL_CLIENT_SECRET,
    merchantId: env.PAYPAL_MERCHANT_ID, webhookId: env.PAYPAL_WEBHOOK_ID };
}
