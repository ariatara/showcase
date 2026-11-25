import { test, expect } from "@playwright/test";
import { galleryFixture, selectedImage } from "./GalleryFixtures.js";

for (const width of [390, 768, 1440, 1920]) {
  test(`Signature fits ${width}px with shared galleries and public content`, async ({ page }) => {
    const state = await galleryFixture(page);
    state.row.view_template = "signature";
    state.row.event_title = "A celebration bringing our community together";
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/events/gallery_event");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(state.row.event_title);
    await expect(page.getByText("Upper hub text")).toBeVisible();
    await expect(page.getByText("Lower hub text")).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `node_modules/.cache/playwright-results/signature-${width}.png`, fullPage: true });
  });
}
test("template choice saves, reopens and switching preserves pending gallery selection", async ({ page }) => {
  const state = await galleryFixture(page);
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const editor = page.getByRole("group", { name: /^Upper hub event images:?$/i });
  await editor.locator('input[type="file"]').setInputFiles(selectedImage("pending.png"));
  await page.getByRole("radio", { name: /Signature/ }).check();
  expect(state.writes).toHaveLength(0);
  await expect(editor.getByRole("list", { name: "Selected images" })).toContainText("pending.png");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.row.view_template).toBe("signature");
  await page.goto("/adminDashboard/editEvent/gallery_event");
  await expect(page.getByRole("radio", { name: /Signature/ })).toBeChecked();
});

test("Create defaults to Signature and Copy preserves Classic as a draft", async ({ page }) => {
  const state = await galleryFixture(page);
  await page.goto("/adminDashboard/addEvent");
  await expect(page.getByRole("radio", { name: /Signature/ })).toBeChecked();
  await page.getByRole("textbox", { name: "Page Title", exact: true }).fill("New event");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.row.view_template).toBe("signature");
  state.row.view_template = "classic";
  await page.goto("/adminDashboard/events");
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(2);
  expect(state.writes[1].payload.viewTemplate).toBe("classic");
  expect(state.writes[1].payload.isPublished).toBe(false);
});

test("unknown templates render Signature but cannot silently save in the editor", async ({ page }) => {
  const state = await galleryFixture(page);
  state.row.view_template = "removed-template";
  await page.goto("/events/gallery_event");
  await expect(page.locator('[data-event-template="signature"]')).toBeVisible();
  await page.goto("/adminDashboard/editEvent/gallery_event");
  await expect(page.getByRole("alert")).toContainText("unavailable template");
  page.on("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect(state.writes).toHaveLength(0);
  await page.getByRole("radio", { name: /Classic/ }).check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.row.view_template).toBe("classic");
});

test("a save that stays open refreshes product versions without resetting pending images", async ({ page }) => {
  await galleryFixture(page);
  let version = 1;
  const savedVersions = [];
  await page.route("http://localhost:3000/auth/memberProducts/**", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { Status: true, Result: [{
      id: 101, version, name: "Ticket", type: "Ticket", target: "Adult", price: "10.25", inventory: 5, event_date: "2026-04-01",
    }] } });
    const products = route.request().postDataJSON();
    savedVersions.push({ product: products[0].version, collection: route.request().headers()["x-product-version"] });
    version++;
    return route.fulfill({ json: { Status: true, Result: { products: products.map((product) => ({ ...product, version })), version } } });
  });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const editor = page.getByRole("group", { name: /^Upper hub event images:?$/i });
  await editor.locator('input[type="file"]').setInputFiles(selectedImage("not-yet-uploaded.png"));
  page.on("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => savedVersions.length).toBe(1);
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => savedVersions.length).toBe(2);
  expect(savedVersions).toEqual([{ product: 1, collection: "1" }, { product: 2, collection: "2" }]);
  await expect(editor.getByRole("list", { name: "Selected images" })).toContainText("not-yet-uploaded.png");
});
