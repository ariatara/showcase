import { test, expect } from "@playwright/test";
import { galleryFixture } from "./GalleryFixtures.js";

async function appearance(dialog) {
  return dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color, radius: style.borderRadius,
      border: style.border, padding: style.padding, blur: style.backdropFilter,
      backdrop: getComputedStyle(element, "::backdrop").backgroundColor };
  });
}

async function referencePopup(page) {
  await page.goto("/createAccount");
  await page.getByLabel("Password", { exact: true }).fill("Example#42");
  await page.getByLabel("Re-enter Password", { exact: true }).fill("Different#42");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "Create Account", exact: true });
  await expect(dialog).toBeVisible();
  const result = await appearance(dialog);
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  return result;
}

for (const width of [390, 1440]) {
  test(`Edit Event Save uses the account popup style and restores focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await galleryFixture(page);
    state.failSave = true;
    page.on("dialog", (dialog) => dialog.dismiss());
    const reference = await referencePopup(page);
    await page.goto("/adminDashboard/editEvent/gallery_event");
    const save = page.getByRole("button", { name: "Save", exact: true });
    await save.click();
    const dialog = page.getByRole("alertdialog", { name: "Edit Event", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Event save unavailable.");
    expect(await appearance(dialog)).toEqual(reference);
    const bounds = await dialog.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    const okay = dialog.getByRole("button", { name: "OK", exact: true });
    await expect(okay).toBeEnabled();
    await expect(okay).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(okay).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(save).toBeEnabled();
    await expect(save).toBeFocused();
    expect(state.writes).toHaveLength(1);
  });
}

for (const [collection, title, message] of [
  ["events", "Delete Event", "Event deleted successfully!"],
  ["pages", "Delete Page", "Page deleted successfully!"],
]) {
  test(`${collection} confirmation waits for approval and uses the shared popup theme`, async ({ page }) => {
    await galleryFixture(page);
    let deletions = 0;
    await page.route(`http://localhost:3000/auth/${collection}`, (route) => route.fulfill({ json: {
      Status: true, Result: [{ id: 7, page_title: "Test item", event_title: "Test item", url: "test_item", published: 1 }],
    } }));
    await page.route(`http://localhost:3000/auth/${collection}/7`, (route) => {
      expect(route.request().method()).toBe("DELETE");
      deletions++;
      return route.fulfill({ json: { Status: true } });
    });
    page.on("dialog", (dialog) => dialog.dismiss());
    const reference = await referencePopup(page);
    await page.goto(`/adminDashboard/${collection}`);
    const remove = page.getByRole("button", { name: "Delete", exact: true });
    const confirmation = page.getByRole("alertdialog", { name: title, exact: true });
    await remove.click();
    await expect(confirmation).toBeVisible();
    expect(await appearance(confirmation)).toEqual(reference);
    expect(deletions).toBe(0);
    await expect(confirmation.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(confirmation).toBeHidden();
    await expect(remove).toBeFocused();
    await remove.click();
    await page.keyboard.press("Escape");
    await expect(confirmation).toBeHidden();
    expect(deletions).toBe(0);
    await remove.click();
    const approve = confirmation.getByRole("button", { name: "Delete", exact: true });
    await expect(approve).toHaveCSS("background-color", "rgb(255, 0, 0)");
    await approve.click();
    const notification = page.getByRole("alertdialog");
    await expect(notification).toContainText(message);
    await notification.getByRole("button", { name: "OK", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: "Test item" })).toHaveCount(0);
    expect(deletions).toBe(1);
  });

  test(`${collection} overlapping deletes do not restore an already deleted row`, async ({ page }) => {
    await galleryFixture(page);
    await page.route(`http://localhost:3000/auth/${collection}`, (route) => route.fulfill({ json: {
      Status: true, Result: [7, 8].map((id) => ({ id, page_title: `Item ${id}`, event_title: `Item ${id}`, url: `item_${id}` })),
    } }));
    const pending = [];
    await page.route(`http://localhost:3000/auth/${collection}/*`, (route) => {
      expect(route.request().method()).toBe("DELETE");
      pending.push(route);
    });
    await page.goto(`/adminDashboard/${collection}`);
    for (const id of [7, 8]) {
      await page.getByRole("row").filter({ hasText: `Item ${id}` }).getByRole("button", { name: "Delete", exact: true }).click();
      await page.getByRole("alertdialog", { name: title, exact: true }).getByRole("button", { name: "Delete", exact: true }).click();
      await expect.poll(() => pending.length).toBe(id - 6);
    }
    for (const [index, route] of pending.entries()) {
      await route.fulfill({ json: { Status: true } });
      const notification = page.getByRole("alertdialog");
      await expect(notification).toContainText(message);
      await notification.getByRole("button", { name: "OK", exact: true }).click();
      await expect(page.locator("tbody tr")).toHaveCount(1 - index);
    }
  });
}

test("concurrent errors are queued rather than replacing an open popup", async ({ page }) => {
  await galleryFixture(page);
  const reads = new Map();
  for (const [endpoint, error] of [["productTypes", "Product types unavailable."], ["membershipCategories", "Membership categories unavailable."]]) {
    await page.route(`http://localhost:3000/auth/${endpoint}`, (route) => {
      const count = (reads.get(endpoint) || 0) + 1;
      reads.set(endpoint, count);
      return route.fulfill({ json: count === 1 ? { Status: false, Error: error } : { Status: true, Result: [] } });
    });
  }
  page.on("dialog", (dialog) => dialog.dismiss());
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const messages = [];
  for (let index = 0; index < 2; index++) {
    const dialog = page.getByRole("alertdialog", { name: "Edit Event Products", exact: true });
    await expect(dialog).toBeVisible();
    messages.push(await dialog.locator("p").innerText());
    await dialog.getByRole("button", { name: "OK", exact: true }).click();
  }
  expect(messages.sort()).toEqual(["Membership categories unavailable.", "Product types unavailable."]);
  await expect(page.getByRole("alertdialog")).toBeHidden();
  expect([...reads.values()].reduce((total, count) => total + count, 0)).toBeLessThanOrEqual(4);
});

test("image viewers share the popup theme without losing their large image area", async ({ page }) => {
  await galleryFixture(page);
  const reference = await referencePopup(page);
  await page.goto("/events/gallery_event");
  await page.getByRole("button", { name: "Open Gallery Event - Upper hub image 1 of 3", exact: true }).click();
  const viewer = page.getByRole("dialog", { name: "Upper hub image viewer", exact: true });
  await expect(viewer).toBeVisible();
  expect(await appearance(viewer)).toEqual(reference);
  expect((await viewer.boundingBox()).width).toBeGreaterThan(600);
  await expect(viewer.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText("2 / 3", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
});

test("leaving a page cancels its confirmation without deleting the event", async ({ page }) => {
  await galleryFixture(page);
  let deletions = 0;
  await page.route("http://localhost:3000/auth/events/7", (route) => {
    deletions++;
    return route.fulfill({ json: { Status: true } });
  });
  await page.goto("/createAccount");
  await page.goto("/adminDashboard/events");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Delete Event", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/createAccount$/);
  await expect(page.getByRole("alertdialog")).toBeHidden();
  expect(deletions).toBe(0);
  await page.goForward();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Delete Event", exact: true });
  await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(confirmation).toBeHidden();
  expect(deletions).toBe(0);
});

test("long multiline popup messages remain readable text on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await galleryFixture(page);
  const message = "<strong>This is text, not markup.</strong>\n" + "x".repeat(3000);
  await page.route("http://localhost:3000/auth/events/7", (route) => route.fulfill({
    status: 500, json: { Status: false, Error: message },
  }));
  await page.goto("/adminDashboard/editEvent/gallery_event");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "Edit Event", exact: true });
  await expect(dialog).toBeVisible();
  expect(await dialog.locator("p").textContent()).toBe(message);
  await expect(dialog.locator("strong")).toHaveCount(0);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const bounds = await dialog.boundingBox();
  expect(bounds.height).toBeLessThanOrEqual(700);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
});
