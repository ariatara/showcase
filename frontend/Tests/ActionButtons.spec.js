import { test, expect } from "@playwright/test";
import { expectActionIcon } from "./ActionIconAssertions.js";

const tables = [
  { path: "", endpoint: "adminRecords", row: { account_email: "admin@example.test" } },
  { path: "accounts", row: { first_name: "Test", last_name: "Account", account_email: "account@example.test" } },
  { path: "members", row: { first_name: "Test", last_name: "Member", member_email: "member@example.test" } },
  { path: "roleTypes", row: { role: "Member" } },
  { path: "ageGroups", row: { group: "18-45" } },
  { path: "membershipCategories", row: { category: "Adult" } },
  { path: "membershipPrices", row: { category: "Adult", price: 25 } },
  { path: "productTypes", row: { type: "Ticket" } },
  { path: "events", row: { page_title: "Test Event", url: "test_event", published: true } },
  { path: "pages", row: { page_title: "Test Page", url: "test_page" } },
];

async function mockAdmin(page, results) {
  await page.addInitScript(() => sessionStorage.setItem("loginSession", JSON.stringify({
    expiry: Math.floor(Date.now() / 1000) + 3600, roles: ["Administrator"],
  })));
  await page.route(/^https:\/\/(?:fonts\.(?:googleapis|gstatic)\.com|use\.fontawesome\.com)\//, (route) => route.abort());
  await page.route("http://localhost:3000/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== "GET" || !Object.hasOwn(results, path)) {
      throw new Error(`Unexpected action button request: ${route.request().method()} ${path}`);
    }
    await route.fulfill({ json: { Status: true, Result: results[path] } });
  });
}

for (const { path, endpoint = path, row } of tables) {
  test(`${path || "admin home"} Edit actions are green and Delete actions are red`, async ({ page }) => {
    await mockAdmin(page, {
      [`/auth/${endpoint}`]: [{ id: 1, ...row }],
      "/auth/adminCount": [{ count: 1 }],
      "/auth/accountCount": [{ count: 1 }],
      "/auth/memberCount": [{ count: 1 }],
    });
    await page.goto(`/adminDashboard/${path}`);
    const table = page.getByRole("table");
    const edit = table.getByRole(path ? "link" : "button", { name: "Edit", exact: true });
    const remove = table.getByRole("button", { name: "Delete", exact: true });
    await expectActionIcon(edit, "pencil-square");
    await expectActionIcon(remove, "trash");
    await expect(edit).toHaveCSS("background-color", "rgb(25, 135, 84)");
    await expect(edit).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(remove).toHaveCSS("background-color", "rgb(255, 0, 0)");
    await expect(remove).toHaveCSS("color", "rgb(255, 255, 255)");
  });
}

for (const { name, color, hover, destination } of [
  { name: "Roles", color: "rgb(128, 96, 173)", hover: "rgb(109, 82, 147)", destination: "/adminDashboard/accountRoles/" },
  { name: "Dashboard", color: "rgb(173, 82, 120)", hover: "rgb(147, 70, 102)", destination: "/accountDashboard/" },
]) {
  test(`${name} buttons use their own color and preserve account navigation`, async ({ page }) => {
    const account = tables.find(({ path }) => path === "accounts").row;
    await mockAdmin(page, { "/auth/accounts": [{ id: 1, ...account }] });
    await page.goto("/adminDashboard/accounts");
    const button = page.getByRole("link", { name, exact: true });
    await expectActionIcon(button, name === "Roles" ? "shield-lock" : "speedometer2");
    await expect(button).toHaveCSS("background-color", color);
    await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(button).toHaveAttribute("href", destination + account.account_email);
    await button.hover();
    await expect(button).toHaveCSS("background-color", hover);
    await button.focus();
    await expect(button).toBeFocused();
    await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
  });
}

for (const { path, row } of tables.filter(({ path }) => ["events", "pages"].includes(path))) {
  test(`${path} Copy actions are brown, including on hover`, async ({ page }) => {
    await mockAdmin(page, { [`/auth/${path}`]: [{ id: 1, ...row }] });
    await page.goto(`/adminDashboard/${path}`);
    const copy = page.getByRole(path === "events" ? "button" : "link", { name: "Copy", exact: true });
    await expectActionIcon(copy, "copy");
    await expectActionIcon(page.getByRole("link", { name: "View", exact: true }), "eye");
    await expect(copy).toHaveCSS("background-color", "rgb(121, 85, 72)");
    await expect(copy).toHaveCSS("color", "rgb(255, 255, 255)");
    await copy.hover();
    await expect(copy).toHaveCSS("background-color", "rgb(93, 64, 55)");
  });
}

test("Create Event matches Create Page colors and preserves the event creation route", async ({ page }) => {
  await mockAdmin(page, { "/auth/events": [], "/auth/pages": [] });
  await page.goto("/adminDashboard/pages");
  const createPage = page.getByRole("link", { name: "Create Page", exact: true });
  await expect(createPage).toBeVisible();
  await expectActionIcon(createPage, "plus-circle");
  const colors = await createPage.evaluate((element) => {
    const style = getComputedStyle(element);
    return { "background-color": style.backgroundColor, color: style.color, "border-top-color": style.borderTopColor };
  });
  await page.goto("/adminDashboard/events");
  const createEvent = page.getByRole("link", { name: "Create Event", exact: true });
  await expectActionIcon(createEvent, "plus-circle");
  await expect(createEvent).toHaveAttribute("href", "/adminDashboard/addEvent");
  for (const [property, color] of Object.entries(colors)) await expect(createEvent).toHaveCSS(property, color);
});

test("Product Type add controls are blue and retain their icons and route", async ({ page }) => {
  await mockAdmin(page, { "/auth/productTypes": [] });
  await page.goto("/adminDashboard/productTypes");
  const link = page.getByRole("link", { name: "Add Product Type", exact: true });
  await expect(link).toHaveCSS("background-color", "rgb(59, 113, 202)");
  await expectActionIcon(link, "plus-circle");
  await expect(link).toHaveAttribute("href", "/adminDashboard/addProductType");
  await link.click();
  const button = page.getByRole("button", { name: "Add Product Type", exact: true });
  await expect(button).toHaveCSS("background-color", "rgb(59, 113, 202)");
  await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
  await expectActionIcon(button, "plus-circle");
  await button.hover();
  await expect(button).toHaveCSS("background-color", "rgb(44, 90, 160)");
});

test("coupon Edit is green despite panel styling and still loads the selected coupon", async ({ page }) => {
  await mockAdmin(page, {
    "/auth/commerce/settings": { version: 1, fee_enabled: false, fee_basis_points: 0, fee_fixed_cents: 0, csrf: "test-csrf" },
    "/auth/commerce/coupons": { coupons: [{ id: 1, code: "WELCOME", kind: "percent", amount: 1000, active: true }], next: null },
  });
  await page.goto("/adminDashboard/commerce");
  const edit = page.getByRole("button", { name: "Edit WELCOME", exact: true });
  await expectActionIcon(edit, "pencil-square");
  await expect(edit).toHaveCSS("background-color", "rgb(25, 135, 84)");
  await expect(edit).toHaveCSS("color", "rgb(255, 255, 255)");
  await edit.click();
  await expect(page.getByLabel("Code", { exact: true })).toHaveValue("WELCOME");
});
