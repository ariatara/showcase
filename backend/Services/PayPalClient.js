import { cents, dollars, CommerceError } from "../Utilities/CommerceMoney.js";
import { hash } from "../Utilities/CommerceStore.js";

export function verifyOrder(provider, order, merchantId) {
  const unit = provider?.purchase_units?.[0];
  if (provider?.id !== order.paypal_order_id ||
      provider.purchase_units?.length !== 1 || unit.reference_id !== order.id || unit.custom_id !== order.id ||
      unit.payee?.merchant_id !== merchantId || unit.amount?.currency_code !== "USD" ||
      !["CREATED", "SAVED", "APPROVED", "VOIDED", "COMPLETED", "PAYER_ACTION_REQUIRED"].includes(provider.status) ||
      unit.amount?.value !== dollars(Number(order.total_cents))) {
    throw new CommerceError(502, "PayPal order does not match this checkout. Reconciliation is required.");
  }
  return unit;
}

export function verifyPayment(provider, order, merchantId) {
  const unit = verifyOrder(provider, order, merchantId), capture = unit?.payments?.captures?.[0];
  if (provider.status !== "COMPLETED" || unit.payments?.captures?.length !== 1 ||
      !capture?.id || capture.status !== "COMPLETED" || capture.amount?.currency_code !== "USD" ||
      cents(capture.amount?.value) !== Number(order.total_cents)) {
    throw new CommerceError(502, "PayPal payment proof does not match this order. Reconciliation is required.");
  }
  return capture;
}

export class PayPalClient {
  constructor(config, fetcher = fetch) { this.config = config; this.fetcher = fetcher; this.token = null; }

  async request(path, method = "GET", body, requestId, oauth = false) {
    if (!this.config.configured) throw new CommerceError(503, "PayPal is not configured. Purchasing is unavailable.");
    if (!oauth && (!this.token || this.token.expires <= Date.now())) {
      const token = await this.request("/v1/oauth2/token", "POST", "grant_type=client_credentials", undefined, true);
      if (typeof token.access_token !== "string" || !(token.expires_in > 60)) throw new CommerceError(502, "PayPal returned an invalid access token.");
      this.token = { value: token.access_token, expires: Date.now() + (token.expires_in - 60) * 1000 };
    }
    try {
      const response = await this.fetcher(this.config.host + path, {
        method, redirect: "error", signal: AbortSignal.timeout(15000),
        headers: { Authorization: oauth ? `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}` : `Bearer ${this.token.value}`,
          "Content-Type": oauth ? "application/x-www-form-urlencoded" : "application/json",
          ...(requestId ? { "PayPal-Request-Id": requestId, Prefer: "return=representation" } : {}) },
        body: body === undefined ? undefined : oauth ? body : JSON.stringify(body),
      });
      if (!response.ok) throw new CommerceError(502, `PayPal request failed (${response.status}); payment status may require reconciliation.`);
      const reader = response.body?.getReader();
      if (!reader) throw new CommerceError(502, "PayPal returned an empty response.");
      const chunks = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1048576) {
          await reader.cancel();
          throw new CommerceError(502, "PayPal returned an oversized response.");
        }
        chunks.push(value);
      }
      const text = Buffer.concat(chunks).toString("utf8");
      const data = JSON.parse(text);
      if (!data || typeof data !== "object") throw new CommerceError(502, "PayPal returned an invalid response.");
      return data;
    } catch (error) {
      if (error instanceof CommerceError) throw error;
      throw new CommerceError(502, "PayPal response was unavailable or invalid. Do not start another payment; check this order's status.");
    }
  }

  async create(order) {
    const money = (value) => ({ currency_code: "USD", value: dollars(Number(value)) });
    const data = await this.request("/v2/checkout/orders", "POST", {
      intent: "CAPTURE",
      purchase_units: [{ reference_id: order.id, custom_id: order.id, invoice_id: order.id,
        payee: { merchant_id: this.config.merchantId },
        ...(order.items?.length ? { items: order.items.map((item) => ({
          name: [...item.snapshot.name].slice(0, 127).join(""), sku: String(item.product_id),
          quantity: String(item.quantity), unit_amount: money(item.unit_cents),
        })) } : {}),
        amount: { ...money(order.total_cents), breakdown: { item_total: money(order.subtotal_cents),
          discount: money(order.discount_cents), handling: money(order.fee_cents) } } }],
      payment_source: { paypal: { experience_context: { shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW",
        return_url: `${this.config.origin}/shoppingCheckout?order=${encodeURIComponent(order.id)}&action=return`,
        cancel_url: `${this.config.origin}/shoppingCheckout?order=${encodeURIComponent(order.id)}&action=cancel` } } },
    }, hash(["create", order.id]).slice(0, 32));
    const approval = Array.isArray(data.links) ? data.links.find((link) => ["approve", "payer-action"].includes(link.rel))?.href : undefined;
    let url;
    try { url = new URL(approval); } catch { throw new CommerceError(502, "PayPal returned no approval URL."); }
    if (typeof data.id !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(data.id) ||
        url.protocol !== "https:" || !["www.paypal.com", "www.sandbox.paypal.com", "sandbox.paypal.com"].includes(url.hostname)) {
      throw new CommerceError(502, "PayPal returned an invalid approval URL.");
    }
    return { id: data.id, approval: url.href };
  }

  get(id) {
    if (typeof id !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(id)) throw new CommerceError(400, "Invalid PayPal order ID.");
    return this.request(`/v2/checkout/orders/${encodeURIComponent(id)}`);
  }

  getCapture(id) {
    if (typeof id !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(id)) throw new CommerceError(400, "Invalid PayPal capture ID.");
    return this.request(`/v2/payments/captures/${encodeURIComponent(id)}`);
  }

  capture(order) {
    if (!order.paypal_order_id) throw new CommerceError(409, "Payment creation is still being reconciled.");
    return this.request(`/v2/checkout/orders/${encodeURIComponent(order.paypal_order_id)}/capture`, "POST", {},
      hash(["capture", order.id]).slice(0, 32));
  }

  async verifyWebhook(event, headers) {
    const fields = { auth_algo: "paypal-auth-algo", cert_url: "paypal-cert-url", transmission_id: "paypal-transmission-id",
      transmission_sig: "paypal-transmission-sig", transmission_time: "paypal-transmission-time" };
    const payload = { webhook_id: this.config.webhookId, webhook_event: event };
    for (const [field, header] of Object.entries(fields)) {
      if (typeof headers[header] !== "string" || headers[header].length > 4096) throw new CommerceError(400, "Missing or invalid PayPal transmission headers.");
      payload[field] = headers[header];
    }
    const result = await this.request("/v1/notifications/verify-webhook-signature", "POST", payload);
    if (result.verification_status !== "SUCCESS") throw new CommerceError(400, "PayPal webhook verification failed.");
    return true;
  }
}
