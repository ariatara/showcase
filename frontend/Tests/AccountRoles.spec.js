import { test, expect } from "@playwright/test";

async function accountRolesPage(page, { roles = [], failDetails = false } = {}) {
  const account = { first_name: "Jamie", last_name: "Example", account_email: "jamie+roles@example.test" };
  await page.addInitScript(() => {
    sessionStorage.setItem("loginSession", JSON.stringify({
      expiry: Math.floor(Date.now() / 1000) + 3600, roles: ["Administrator"],
    }));
  });
  await page.route(/^https:\/\/(?:fonts\.(?:googleapis|gstatic)\.com|use\.fontawesome\.com)\//,
    (route) => route.abort());
  await page.route("http://localhost:3000/**", async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path === `/auth/accountRoles/${account.account_email}`) {
      return route.fulfill({ json: { Status: true, Result: roles } });
    }
    if (path === `/account/accountDetails/${account.account_email}`) {
      return failDetails ? route.abort("failed") : route.fulfill({ json: { Status: true, Result: [account] } });
    }
    throw new Error(`Unexpected account roles request: ${path}`);
  });
  await page.goto(`/adminDashboard/accountRoles/${encodeURIComponent(account.account_email)}`);
  return account;
}

for (const assigned of [true, false]) test(`account identity appears above the table ${assigned ? "with" : "without"} assigned roles`, async ({ page }) => {
  const roles = assigned ? [{ id: 5, account_role: "Member" }] : [];
  const account = await accountRolesPage(page, { roles });
  const details = page.getByRole("region", { name: "Account details", exact: true });
  await expect(details).toBeVisible();
  for (const [label, value] of [["First Name", account.first_name], ["Last Name", account.last_name], ["Email Address", account.account_email]]) {
    await expect(details.getByText(label, { exact: true })).toBeVisible();
    await expect(details.getByText(value, { exact: true })).toBeVisible();
  }
  const detailBounds = await details.boundingBox(), tableBounds = await page.getByRole("table").boundingBox();
  expect(detailBounds.y + detailBounds.height).toBeLessThanOrEqual(tableBounds.y);
  const addButtonBounds = await page.getByRole("link", { name: "Add Account Roles", exact: true }).boundingBox();
  const emailBounds = await details.getByText(account.account_email, { exact: true }).boundingBox();
  const lastNameBounds = await details.getByText(account.last_name, { exact: true }).boundingBox();
  const lineHeight = await details.evaluate((element) => parseFloat(getComputedStyle(element).lineHeight));
  expect(addButtonBounds.y).toBeGreaterThanOrEqual(tableBounds.y + tableBounds.height);
  expect(emailBounds.y - lastNameBounds.y - lastNameBounds.height).toBeLessThanOrEqual(8);
  expect(tableBounds.y - emailBounds.y - emailBounds.height).toBeCloseTo(2 * lineHeight, 0);
  await expect(page.getByRole("columnheader", { name: "Roles", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(roles.length);
  await expect(page.getByRole("link", { name: "Add Account Roles", exact: true })).toHaveAttribute("href", `/adminDashboard/addAccountRole/${account.account_email}`);
  await page.reload();
  await expect(details.getByText(account.first_name, { exact: true })).toBeVisible();
});

test("account detail failures are visible without hiding assigned roles", async ({ page }) => {
  await accountRolesPage(page, { roles: [{ id: 5, account_role: "Member" }], failDetails: true });
  await expect(page.getByRole("alert")).toHaveText("Unable to load account details. Please try again.");
  await expect(page.getByRole("cell", { name: "Member", exact: true })).toBeVisible();
  await expect(page.getByText("Jamie", { exact: true })).toHaveCount(0);
});
