export class CommerceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function integer(value, label, min = 1, max = Number.MAX_SAFE_INTEGER) {
  if (!["number", "string"].includes(typeof value) || !/^\d+$/.test(String(value)) ||
      !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new CommerceError(400, `${label} must be an integer from ${min} to ${max}.`);
  }
  return Number(value);
}

export function cents(value) {
  if (!["string", "number"].includes(typeof value) || !/^\d{1,10}(\.\d{1,2})?$/.test(String(value))) {
    throw new CommerceError(400, "Price must be a positive USD amount with at most two decimal places.");
  }
  const [whole, fraction = ""] = String(value).split(".");
  return integer(Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))), "Price cents");
}

export function dollars(value) {
  integer(value, "Amount", 0);
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

export function couponCode(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,32}$/.test(value.trim())) {
    throw new CommerceError(400, "Coupon must contain 1-32 ASCII letters, digits, hyphens or underscores.");
  }
  return value.trim().toUpperCase();
}

export function totals(lines, coupon, settings) {
  let subtotal = 0n;
  for (const line of lines) {
    subtotal += BigInt(integer(line.unit_cents, "Price")) * BigInt(integer(line.quantity, "Quantity", 1, 99));
  }
  const rounded = (amount, points) => (amount * BigInt(integer(points, "Percentage", 0, 10000)) + 5000n) / 10000n;
  let discount = coupon ? (coupon.kind === "percent" ? rounded(subtotal, coupon.amount) : BigInt(integer(coupon.amount, "Discount"))) : 0n;
  discount = discount > subtotal ? subtotal : discount;
  const fee = settings.fee_enabled ? rounded(subtotal - discount, settings.fee_basis_points) +
    BigInt(integer(settings.fee_fixed_cents, "Fixed fee", 0, 100000000)) : 0n;
  const total = subtotal - discount + fee;
  if (total <= 0n) throw new CommerceError(400, "PayPal requires a positive payable total; free checkout is not supported.");
  return Object.fromEntries(Object.entries({ subtotal, discount, fee, total }).map(([key, value]) =>
    [key, integer(Number(value), "Order amount", 0)]));
}
