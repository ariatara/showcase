import test from "node:test";
import assert from "node:assert/strict";
import { commerceRequest, localReturn, paypalRedirect } from "./CommerceApi.js";

test("commerce writes send credentials and CSRF and propagate errors", async () => {
  const client = { async request(options) {
    assert.equal(options.withCredentials, true);
    assert.equal(options.headers["X-Commerce-CSRF"], "csrf");
    return { data: { Status: true, Result: { version: 2 } } };
  } };
  assert.equal((await commerceRequest("/account/commerce/cart/items", { method: "POST", csrf: "csrf" }, client)).version, 2);
  await assert.rejects(commerceRequest("/account/commerce/cart", {}, { async request() {
    throw { response: { status: 409, data: { Error: "Cart changed" } } };
  } }), { status: 409, message: "Cart changed" });
});
test("return navigation and approval redirects cannot leave their intended destinations", () => {
  assert.equal(localReturn("/shoppingCheckout?order=abc&action=return"), "/shoppingCheckout?order=abc&action=return");
  for (const path of ["https://other.example", "//other.example", "/\\other.example", "/login", "/shoppingArea\n"]) assert.equal(localReturn(path), "");
  assert.equal(paypalRedirect("https://www.sandbox.paypal.com/checkoutnow?token=test"), "https://www.sandbox.paypal.com/checkoutnow?token=test");
  assert.throws(() => paypalRedirect("https://paypal.com.example/"));
});
