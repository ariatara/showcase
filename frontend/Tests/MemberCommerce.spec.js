import { test, expect } from "@playwright/test";
import { commerceFixture } from "./CommerceFixtures.js";
import { expectActionIcon } from "./ActionIconAssertions.js";

for (const access of ["guest", "nonmember"]) test(`${access} cannot see member products or prices`, async ({ page }) => {
  const state = await commerceFixture(page, { access });
  await page.goto("/events/gallery_event");
  await expect(page.getByText(access === "guest" ? /available after you/ : /Membership is required/)).toBeVisible();
  expect(state.catalogReads).toBe(0);
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);
});

test("member purchases across events through an authoritative confirmation", async ({ page }, testInfo) => {
  const state = await commerceFixture(page);
  for (const [event, name] of [["gallery_event", "First ticket"], ["second", "Second ticket"]]) {
    await page.goto(`/events/${event}`);
    await page.getByLabel(`Member for ${name}`).selectOption("101");
    await expectActionIcon(page.getByRole("button", { name: "Add to cart" }), "cart-plus");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to cart.")).toBeVisible();
    if (event === "gallery_event") await page.screenshot({ path: testInfo.outputPath("member-storefront.png"), fullPage: true });
  }
  await page.getByRole("link", { name: "View cart (2)" }).click();
  await expect(page.getByRole("heading", { name: "First event", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Second event", exact: true })).toBeVisible();
  await expectActionIcon(page.getByRole("button", { name: "Update", exact: true }).first(), "floppy");
  await expectActionIcon(page.getByRole("button", { name: "Remove", exact: true }).first(), "trash");
  await expectActionIcon(page.getByRole("link", { name: "Review checkout" }), "credit-card");
  const headingContrast = await page.getByRole("heading", { name: "Your member cart" }).evaluate((heading) => {
    const luminance = (rgb) => rgb.map((value) => value / 255).map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const color = getComputedStyle(heading).color.match(/[\d.]+/g).map(Number);
    const background = getComputedStyle(heading.closest("main")).backgroundColor.match(/[\d.]+/g).map(Number);
    const foregroundLight = luminance(color.slice(0, 3));
    const backgroundLight = luminance(background[3] === 0 ? [255, 255, 255] : background.slice(0, 3));
    return (Math.max(foregroundLight, backgroundLight) + 0.05) / (Math.min(foregroundLight, backgroundLight) + 0.05);
  });
  expect(headingContrast).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({ path: testInfo.outputPath("multi-event-cart.png"), fullPage: true });
  await page.getByRole("link", { name: "Review checkout" }).click();
  await expect(page.getByText("$30.25", { exact: true })).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath("checkout.png"), fullPage: true });
  await expectActionIcon(page.getByRole("button", { name: "Pay with PayPal" }), "credit-card");
  await expectActionIcon(page.getByRole("link", { name: "Back to cart" }), "arrow-left");
  await page.getByRole("button", { name: "Pay with PayPal" }).click();
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("confirmation.png"), fullPage: true });
  expect(state.captures).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
});

test("a pending return never displays payment success and can recover by refreshing status", async ({ page }) => {
  const state = await commerceFixture(page);
  const id = "11111111-1111-4111-8111-111111111111";
  state.captureStatus = "payment_pending";
  state.orders[id] = { id, status: "awaiting_approval", amounts: { subtotal: 1000, discount: 0, fee: 0, total: 1000 }, items: [] };
  await page.goto(`/shoppingCheckout?order=${id}&action=return`);
  await expect(page.getByText("payment pending", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toHaveCount(0);
  state.captureStatus = "paid";
  await expectActionIcon(page.getByRole("button", { name: "Refresh order status" }), "arrow-clockwise");
  await page.getByRole("button", { name: "Refresh order status" }).click();
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
});

test("an expired stock or coupon quote blocks payment until explicitly reviewed again", async ({ page }) => {
  const state = await commerceFixture(page);
  state.quoteError = "Coupon expired. Review your cart.";
  await page.goto("/shoppingCheckout");
  await expect(page.getByRole("alert")).toContainText("Coupon expired");
  await expect(page.getByRole("button", { name: "Pay with PayPal" })).toHaveCount(0);
  state.quoteError = "";
  await page.getByRole("button", { name: "Review total", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pay with PayPal" })).toBeVisible();
});

test("administrators save a disclosed fee and a bounded fixed-USD coupon", async ({ page }) => {
  await commerceFixture(page);
  const writes = [];
  await page.route("http://localhost:3000/auth/commerce/**", async (route) => {
    const path = new URL(route.request().url()).pathname, method = route.request().method();
    let result;
    if (method === "GET") result = path.endsWith("/settings") ? { version: 1, fee_enabled: 0, fee_basis_points: 0, fee_fixed_cents: 0, csrf: "admin-csrf" } :
      { coupons: new URL(route.request().url()).searchParams.has("after") ?
        [{ id: 2, code: "WELCOME", kind: "fixed", amount: 300, active: true }] :
        [{ id: 1, code: "EARLY", kind: "fixed", amount: 100, active: true }], next: new URL(route.request().url()).searchParams.has("after") ? null : 1 };
    else {
      const body = route.request().postDataJSON();
      writes.push({ path, body, csrf: route.request().headers()["x-commerce-csrf"] });
      result = { ...body, id: 2, version: 2 };
    }
    await route.fulfill({ json: { Status: true, Result: result } });
  });
  await page.goto("/adminDashboard/commerce");
  await page.getByLabel("Enable payment fee").check();
  await page.getByLabel("Percentage (basis points)", { exact: true }).fill("200");
  await page.getByLabel("Fixed fee (USD cents)").fill("30");
  await page.getByRole("button", { name: "Save payment fee", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Payment fee saved.");
  await page.getByLabel("Code", { exact: true }).fill("WELCOME");
  await page.getByLabel("Discount type").selectOption("fixed");
  await page.getByLabel("Discount amount", { exact: true }).fill("300");
  await page.getByLabel("Global usage limit (blank for unlimited)").fill("10");
  await page.getByLabel("Per-account limit (blank for unlimited)").fill("1");
  await page.getByRole("button", { name: "Save coupon", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit WELCOME" })).toBeVisible();
  expect(writes[0].body).toMatchObject({ fee_enabled: true, fee_basis_points: 200, fee_fixed_cents: 30, version: 1 });
  expect(writes[1].body).toMatchObject({ kind: "fixed", amount: 300, max_uses: 10, per_account: 1 });
  expect(writes.every((write) => write.csrf === "admin-csrf")).toBe(true);
  await expectActionIcon(page.getByRole("button", { name: "More coupons" }), "arrow-right");
  await page.getByRole("button", { name: "More coupons" }).click();
  await expect(page.getByRole("button", { name: "More coupons" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit WELCOME" })).toHaveCount(1);
});
