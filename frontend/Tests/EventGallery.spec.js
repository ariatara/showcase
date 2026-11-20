import { test, expect } from "@playwright/test";
import { galleryFixture } from "./GalleryFixtures.js";

for (const [width, columns] of [[390, 1], [768, 2], [1440, 3]]) {
  test(`public galleries preserve ten images, styling, and ${columns} columns at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await galleryFixture(page, { upper: 10, lower: 10 });
    await page.goto("/events/gallery_event");
    for (const hub of ["Upper hub", "Lower hub"]) {
      const gallery = page.getByRole("region", { name: `${hub} image gallery` });
      await expect(gallery.getByRole("button", { name: /^Open/ })).toHaveCount(10);
      const grid = gallery.getByRole("list");
      expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(columns);
      const image = grid.locator("img").first();
      await expect(image).toHaveCSS("opacity", "1");
      await expect(image).toHaveCSS("object-fit", "cover");
      const geometry = await image.boundingBox();
      expect(geometry.width / geometry.height).toBeCloseTo(4 / 3, 1);
      const tile = gallery.locator("..");
      expect(await tile.evaluate((element) => getComputedStyle(element, "::before").backgroundColor))
        .toBe("rgba(255, 69, 0, 0.5)");
      const text = page.getByText(`${hub} text`, { exact: true }).locator("..");
      await expect(text).toHaveCSS("background-color", "rgba(0, 0, 0, 0.7)");
      for (const thumbnail of await grid.locator("img").all()) {
        await thumbnail.scrollIntoViewIfNeeded();
        await expect.poll(() => thumbnail.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: test.info().outputPath(`gallery-${width}.png`), fullPage: true });
  });
}

test("lightbox supports keyboard boundaries, focus containment, dismissal and independent hubs", async ({ page }) => {
  await galleryFixture(page);
  await page.goto("/events/gallery_event");
  const first = page.getByRole("button", { name: "Open Gallery Event - Upper hub image 1 of 3", exact: true });
  await first.click();
  const dialog = page.getByRole("dialog", { name: "Upper hub image viewer" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await expect(dialog.getByRole("button", { name: "Previous" })).toBeDisabled();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Next" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("2 / 3")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("button", { name: "Next" })).toBeDisabled();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("3 / 3")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByText("2 / 3")).toBeVisible();
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(first).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await page.getByRole("button", { name: "Open Gallery Event - Lower hub image 2 of 3", exact: true }).click();
  const lower = page.getByRole("dialog", { name: "Lower hub image viewer" });
  await expect(lower.getByText("2 / 3")).toBeVisible();
  await expect(lower.locator("img")).toHaveAttribute("src", /lower_2\.png$/);
  await page.mouse.click(1, 1);
  await expect(lower).not.toBeVisible();
});

test("empty hubs keep their text and single images are centered without navigation", async ({ page }) => {
  await galleryFixture(page, { upper: 0, lower: 1 });
  await page.goto("/events/gallery_event");
  await expect(page.getByText("Upper hub text", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Upper hub image gallery" })).toHaveCount(0);
  const gallery = page.getByRole("region", { name: "Lower hub image gallery" });
  const container = await gallery.boundingBox();
  const thumbnail = gallery.getByRole("button");
  const image = await thumbnail.boundingBox();
  expect(image.width).toBeLessThanOrEqual(640);
  expect(Math.abs(image.x + image.width / 2 - container.x - container.width / 2)).toBeLessThan(1);
  await thumbnail.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: /Previous|Next/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(thumbnail).toBeFocused();
});

test("uncropped portrait and small images, readable errors and route changes restore document state", async ({ page }) => {
  const state = await galleryFixture(page, { upper: 0, lower: 0 });
  state.row.upper_hub_event_image_names = "portrait.png,small.png,broken.png,space #%.png";
  await page.goto("/events/gallery_event");
  const gallery = page.getByRole("region", { name: "Upper hub image gallery" });
  await expect(gallery.getByText(/Image 3 could not be loaded/)).toBeVisible();
  await gallery.getByRole("button", { name: /^Open/ }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("img")).toHaveCSS("object-fit", "contain");
  await expect.poll(() => dialog.locator("img").evaluate((image) => image.naturalWidth)).toBe(240);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => dialog.locator("img").evaluate((image) => image.naturalWidth)).toBe(8);
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("alert")).toContainText("could not be loaded");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator("img")).toHaveAttribute("src", /space%20%23%25\.png$/);
  state.row.upper_hub_event_image_names = "new.png";
  await page.evaluate(() => {
    window.history.pushState({}, "", "/events/another_event");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await expect(page.getByRole("button", { name: /^Open/ })).toHaveCount(1);
});

test("mobile lightbox respects reduced motion and keeps touch controls inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await galleryFixture(page, { upper: 2, lower: 0 });
  await page.goto("/events/gallery_event");
  const thumbnail = page.getByRole("button", { name: /^Open/ }).first();
  await expect(thumbnail).toHaveCSS("transition-duration", "0s");
  await thumbnail.click();
  const dialog = page.getByRole("dialog");
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  const next = dialog.getByRole("button", { name: "Next" });
  expect((await next.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await next.click();
  await expect(dialog.getByText("2 / 2")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("gallery-lightbox-mobile.png") });
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(thumbnail).toBeFocused();
});
