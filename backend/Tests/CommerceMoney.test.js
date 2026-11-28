import test from "node:test";
import assert from "node:assert/strict";
import { cents, dollars, totals, integer, couponCode } from "../Utilities/CommerceMoney.js";

test("USD conversion is exact and rejects fractions, exponents, negative and unbounded values", () => {
  assert.equal(cents("10.01"), 1001);
  assert.equal(cents("0.1"), 10);
  assert.equal(dollars(1001), "10.01");
  for (const value of ["1.001", "1e2", "-1", "", null, true, "10000000000"]) assert.throws(() => cents(value));
  for (const value of [null, true, 1.5, "1e2", 0, 100]) assert.throws(() => integer(value, "Quantity", 1, 99));
});
test("discounts precede the disclosed fee and rounding occurs once at order level", () => {
  assert.deepEqual(totals([{ unit_cents: 1001, quantity: 2 }], { kind: "percent", amount: 1000 },
    { fee_enabled: true, fee_basis_points: 290, fee_fixed_cents: 30 }),
  { subtotal: 2002, discount: 200, fee: 82, total: 1884 });
  assert.equal(totals([{ unit_cents: 101, quantity: 1 }], { kind: "percent", amount: 5000 }, {}).total, 50);
  assert.equal(totals([{ unit_cents: 123, quantity: 1 }], { kind: "fixed", amount: 23 }, {}).total, 100);
  assert.throws(() => totals([{ unit_cents: 100, quantity: 1 }], { kind: "fixed", amount: 1000 }, {}), /positive/i);
  assert.equal(couponCode(" spring_25 "), "SPRING_25");
  assert.throws(() => couponCode("SPRING\u200b"), /coupon/i);
});
