import { test, expect } from "@playwright/test";
import { galleryFixture, selectedImage } from "./GalleryFixtures.js";
import { dismissPopup } from "./PopupAssertions.js";
import { commerceFixture } from "./CommerceFixtures.js";

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
for (const selected of ["signature", "festive"]) test(`${selected} saves, reopens and switching preserves pending gallery selection`, async ({ page }) => {
  const state = await galleryFixture(page);
  if (selected === "festive") await page.setViewportSize({ width: 390, height: 950 });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const editor = page.getByRole("group", { name: /^Upper hub event images:?$/i });
  await editor.locator('input[type="file"]').setInputFiles(selectedImage("pending.png"));
  await page.locator(`input[name="eventViewTemplate"][value="${selected}"]`).check();
  const selector = page.getByRole("group", { name: "Event View Template:", exact: true });
  expect(await selector.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(state.writes).toHaveLength(0);
  await expect(editor.getByRole("list", { name: "Selected images" })).toContainText("pending.png");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await dismissPopup(page, "Selected images are not saved");
  await expect.poll(() => state.row.view_template).toBe(selected);
  await page.goto("/adminDashboard/editEvent/gallery_event");
  await expect(page.locator(`input[name="eventViewTemplate"][value="${selected}"]`)).toBeChecked();
});

for (const copied of ["classic", "festive"]) test(`Create defaults to Signature and Copy preserves ${copied} as a draft`, async ({ page }) => {
  const state = await galleryFixture(page);
  await page.goto("/adminDashboard/addEvent");
  await expect(page.getByRole("radio", { name: /Signature/ })).toBeChecked();
  await page.getByRole("textbox", { name: "Page Title", exact: true }).fill("New event");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.row.view_template).toBe("signature");
  state.row.view_template = copied;
  await page.goto("/adminDashboard/events");
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(2);
  expect(state.writes[1].payload.viewTemplate).toBe(copied);
  expect(state.writes[1].payload.isPublished).toBe(false);
});

for (const [initial, selected] of [["signature", "classic"], ["classic", "signature"], ["classic", "festive"], ["festive", "classic"]]) {
  test(`switching from ${initial} to ${selected} saves only on Save and renders the saved template`, async ({ page }) => {
    const state = await galleryFixture(page);
    state.row.view_template = initial;
    await page.goto("/adminDashboard/editEvent/gallery_event");
    const radio = page.locator(`input[name="eventViewTemplate"][value="${selected}"]`);
    await radio.locator("..").locator("strong").click();
    await expect(radio).toBeChecked();
    expect(state.writes).toHaveLength(0);
    expect(state.row.view_template).toBe(initial);

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => state.row.view_template).toBe(selected);
    expect(state.writes[0].payload.viewTemplate).toBe(selected);
    await page.goto("/adminDashboard/editEvent/gallery_event");
    await expect(page.locator(`input[name="eventViewTemplate"][value="${selected}"]`)).toBeChecked();
    await page.goto("/events/gallery_event");
    await expect(page.locator(`[data-event-template="${selected}"]`)).toBeVisible();
    await page.reload();
    await expect(page.locator(`[data-event-template="${selected}"]`)).toBeVisible();
  });
}

for (const width of [390, 768, 1440, 1920]) {
  test(`Festive fits ${width}px with event details, rich content, backgrounds and both galleries`, async ({ page }) => {
    const state = await galleryFixture(page);
    Object.assign(state.row, {
      view_template: "festive", event_title: "An evening of music, food and community celebrations",
      map_link: "https://maps.example.test/venue", upper_hub_background_image_name: "upper-background.png",
      lower_hub_background_image_name: "lower-background.png",
      upper_hub_content: "<h2>Join the celebration</h2><p><strong>Upper hub text</strong></p>",
    });
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/events/gallery_event");
    const festive = page.locator('[data-event-template="festive"]');
    await expect(festive).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(state.row.event_title);
    const details = page.getByRole("region", { name: "Event details", exact: true });
    await expect(details).toContainText("April 1, 2026");
    await expect(details).toContainText("10:00 AM");
    await expect(details).toContainText("April 2, 2026");
    await expect(details).toContainText("5:00 PM");
    await expect(details).toContainText("Event Hall");
    await expect(details.getByRole("link", { name: "View venue map" })).toHaveAttribute("href", state.row.map_link);
    await expect(festive.locator("header").first()).toHaveCSS("background-image", /banner\.png/);
    for (const hub of ["Upper", "Lower"]) {
      const region = page.getByRole("region", { name: `${hub} hub`, exact: true });
      await expect(region).toContainText(`${hub} hub text`);
      await expect(region).toHaveCSS("background-image", new RegExp(`${hub.toLowerCase()}-background\\.png`));
      await expect(region.getByRole("button", { name: /^Open / })).toHaveCount(3);
    }
    await expect(festive.locator("strong").filter({ hasText: "Upper hub text" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Member Products", exact: true }).getByRole("link", { name: /sign in/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`festive-${width}.png`), fullPage: true });
    for (const hub of ["Upper", "Lower"]) {
      const opener = page.getByRole("region", { name: `${hub} hub`, exact: true }).getByRole("button", { name: /^Open / }).first();
      await opener.click();
      const viewer = page.getByRole("dialog", { name: `${hub} hub image viewer`, exact: true });
      await expect(viewer).toBeVisible();
      await page.keyboard.press("ArrowRight");
      await expect(viewer.getByText("2 / 3", { exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(opener).toBeFocused();
    }
  });
}

for (const banner of ["", "broken-banner.png"]) test(`Festive handles empty hubs and a ${banner ? "broken" : "missing"} banner`, async ({ page }) => {
  const state = await galleryFixture(page, { upper: 0, lower: 0 });
  Object.assign(state.row, { view_template: "festive", event_title: "Celebration".repeat(30),
    banner_background_image_name: banner, upper_hub_content: "", lower_hub_content: null, map_link: "javascript:alert(1)" });
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto("/events/gallery_event");
  await expect(page.locator('[data-event-template="festive"]')).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(state.row.event_title);
  await expect(page.getByRole("region", { name: /^(Upper|Lower) hub$/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View venue map" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Festive exposes the shared member catalog and Add to cart flow", async ({ page }) => {
  const state = await commerceFixture(page, { viewTemplate: "festive" });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/events/gallery_event");
  await expect(page.locator('[data-event-template="festive"]')).toBeVisible();
  await page.getByLabel("Member for First ticket").selectOption("101");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to cart.")).toBeVisible();
  await expect(page.getByRole("link", { name: "View cart (1)" })).toBeVisible();
  expect(state.lines).toHaveLength(1);
  expect(state.lines[0].product_id).toBe(101);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a failed template save retains the stored template and allows retrying the selection", async ({ page }) => {
  const state = await galleryFixture(page);
  await page.goto("/adminDashboard/editEvent/gallery_event");
  await page.getByRole("radio", { name: /Signature/ }).check();
  state.failSave = true;
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await dismissPopup(page, "Event save unavailable");
  expect(state.row.view_template).toBe("classic");
  await expect(page.getByRole("radio", { name: /Signature/ })).toBeChecked();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  state.failSave = false;
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.row.view_template).toBe("signature");
});

test("unknown templates render Signature but cannot silently save in the editor", async ({ page }) => {
  const state = await galleryFixture(page);
  state.row.view_template = "removed-template";
  await page.goto("/events/gallery_event");
  await expect(page.locator('[data-event-template="signature"]')).toBeVisible();
  await page.goto("/adminDashboard/editEvent/gallery_event");
  await expect(page.getByRole("alert")).toContainText("unavailable template");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await dismissPopup(page, "Select an available Event View template.");
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
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await dismissPopup(page, "Selected images are not saved");
  await expect.poll(() => savedVersions.length).toBe(1);
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await dismissPopup(page, "Selected images are not saved");
  await expect.poll(() => savedVersions.length).toBe(2);
  expect(savedVersions).toEqual([{ product: 1, collection: "1" }, { product: 2, collection: "2" }]);
  await expect(editor.getByRole("list", { name: "Selected images" })).toContainText("not-yet-uploaded.png");
});
