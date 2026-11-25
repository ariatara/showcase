import { test, expect } from "@playwright/test";

async function registrationPage(page, respond) {
  await page.route(/^https:\/\/(?:fonts\.(?:googleapis|gstatic)\.com|use\.fontawesome\.com)\//,
    (route) => route.abort());
  await page.route("http://localhost:3000/**", async (route) => {
    if (new URL(route.request().url()).pathname === "/user/createAccount") return respond(route);
    throw new Error(`Unexpected registration request: ${route.request().url()}`);
  });
  await page.goto("/createAccount");
  await page.getByLabel("First Name", { exact: true }).fill("Test");
  await page.getByLabel("Last Name", { exact: true }).fill("Member");
  await page.getByLabel("Email", { exact: true }).fill("member@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Example#42");
}

test("registration requires matching passwords and shows success only after creation", async ({ page }) => {
  const requests = [];
  let finish;
  const responseReady = new Promise((resolve) => { finish = resolve; });
  await registrationPage(page, async (route) => {
    requests.push(route.request().postDataJSON());
    await responseReady;
    await route.fulfill({ json: { Status: true } });
  });
  const confirmation = page.getByLabel("Re-enter Password", { exact: true });
  await expect(confirmation).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  expect(await confirmation.evaluate((input) => input.validity.valueMissing)).toBe(true);
  expect(requests).toHaveLength(0);
  await confirmation.fill("example#42");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  const mismatchDialog = page.getByRole("alertdialog", { name: "Create Account", exact: true });
  await expect(mismatchDialog).toBeVisible();
  await expect(mismatchDialog.getByText("Passwords do not match.", { exact: true })).toBeVisible();
  const dismiss = mismatchDialog.getByRole("button", { name: "OK", exact: true });
  await expect(dismiss).toBeFocused();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(requests).toHaveLength(0);
  await dismiss.click();
  await expect(mismatchDialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Create Account", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(mismatchDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(mismatchDialog).toBeHidden();
  expect(requests).toHaveLength(0);
  await confirmation.fill("Example#42");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page.getByRole("button", { name: "Creating account...", exact: true })).toBeDisabled();
  await expect(page.getByRole("status")).toHaveCount(0);
  finish();
  await expect(page.getByRole("status")).toContainText("Account created successfully.");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(requests).toEqual([{ first_name: "Test", last_name: "Member", account_email: "member@example.test", account_password: "Example#42" }]);
  await expect(page.getByRole("button", { name: "Create Account", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Sign in here.", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

for (const failure of ["rejection", "network"]) test(`registration displays ${failure} errors without claiming success and allows retry`, async ({ page }) => {
  let attempts = 0;
  await registrationPage(page, async (route) => {
    attempts++;
    if (attempts > 1) return route.fulfill({ json: { Status: true } });
    if (failure === "network") return route.abort("failed");
    return route.fulfill({ json: { Status: false, Error: "Create account failed." } });
  });
  await page.getByLabel("Re-enter Password", { exact: true }).fill("Example#42");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(failure === "network" ? "Unable to create account. Please try again." : "Create account failed.");
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Account created successfully.");
  expect(attempts).toBe(2);
});

for (const width of [390, 1440]) test(`registration matches login styling on a plain background at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await registrationPage(page, (route) => route.abort());
  await page.goto("/login");
  const appearance = (element) => {
    const style = getComputedStyle(element);
    return { color: style.color, backgroundColor: style.backgroundColor, borderRadius: style.borderRadius,
      borderColor: style.borderColor, fontFamily: style.fontFamily, fontWeight: style.fontWeight };
  };
  const loginHeading = await page.getByRole("heading", { name: "Account Login", exact: true }).evaluate(appearance);
  const loginButton = await page.getByRole("button", { name: "Sign In", exact: true }).evaluate(appearance);
  const loginInput = await page.getByPlaceholder("Enter Email", { exact: true }).evaluate(appearance);
  const loginRadius = await page.getByRole("heading", { name: "Account Login", exact: true }).locator("..").evaluate((element) => getComputedStyle(element).borderRadius);
  await page.goto("/createAccount");
  const heading = page.getByRole("heading", { name: "Create Account", exact: true });
  const card = heading.locator("..");
  await expect(page.getByRole("main")).toHaveCSS("background-image", "none");
  await expect(page.getByRole("main")).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  expect(await heading.evaluate(appearance)).toEqual(loginHeading);
  expect(await page.getByRole("button", { name: "Create Account", exact: true }).evaluate(appearance)).toEqual(loginButton);
  expect(await page.getByLabel("Email", { exact: true }).evaluate(appearance)).toEqual(loginInput);
  await expect(card).toHaveCSS("border-radius", loginRadius);
  const bounds = await card.boundingBox();
  const navigation = await page.locator("#MainNavigation").boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  expect(bounds.y).toBeGreaterThanOrEqual(navigation.y + navigation.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await expect(page.getByLabel("Re-enter Password", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`create-account-${width}.png`), fullPage: true });
});
