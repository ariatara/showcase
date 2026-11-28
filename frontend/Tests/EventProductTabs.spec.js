import { test, expect } from "@playwright/test";
import { galleryFixture, selectedImage } from "./GalleryFixtures.js";
import { dismissPopup } from "./PopupAssertions.js";

async function productsFixture(page) {
  const event = await galleryFixture(page);
  const state = { event, reads: 0, writes: [], products: [{ id: 101, version: 1, name: "Admission",
    type: "Ticket", target: "Adult", price: "10.25", inventory: 5, event_date: "2026-04-01" }] };
  await page.route("http://localhost:3000/auth/productTypes", (route) =>
    route.fulfill({ json: { Status: true, Result: [{ id: 1, type: "Ticket" }] } }));
  await page.route("http://localhost:3000/auth/membershipCategories", (route) =>
    route.fulfill({ json: { Status: true, Result: [{ id: 1, category: "Adult" }] } }));
  await page.route("http://localhost:3000/auth/upload/productImage", (route) =>
    route.fulfill({ json: "productImage_123_admission.png" }));
  await page.route("http://localhost:3000/auth/memberProducts/**", (route) => {
    if (route.request().method() === "GET") {
      state.reads++;
      return route.fulfill({ json: { Status: true, Result: state.products } });
    }
    expect(route.request().method()).toBe("PUT");
    const products = route.request().postDataJSON();
    state.writes.push(products);
    const saved = products.map((product, index) => ({ ...product,
      productId: product.productId ?? 101 + index, version: (product.version ?? 0) + 1 }));
    state.products = saved.map((product) => ({ id: product.productId, version: product.version,
      name: product.productName, type: product.productType, target: product.productTarget,
      price: product.productPrice, inventory: product.productInventory, event_date: product.eventDate }));
    return route.fulfill({ json: { Status: true, Result: {
      products: saved, version: 2,
    } } });
  });
  return state;
}

for (const editor of ["editEvent/gallery_event", "addEvent"]) test(`${editor} Delete is vertically centered in each product row and removes the right row`, async ({ page }) => {
  const state = await productsFixture(page);
  state.products.push({ ...state.products[0], id: 102, name: "Donation" });
  await page.goto(`/adminDashboard/${editor}`);
  if (editor === "addEvent") {
    const add = page.locator("button").filter({ has: page.locator(".bi-plus-lg") });
    await add.click();
    await add.click();
    await page.getByPlaceholder("Enter Name").nth(0).fill("Admission");
    await page.getByPlaceholder("Enter Name").nth(1).fill("Donation");
  }
  await expect(page.getByPlaceholder("Enter Name")).toHaveCount(2);
  const rows = page.locator('form > div').filter({ has: page.getByPlaceholder("Enter Name") });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const row of await rows.all()) {
      const remove = row.locator("button").filter({ has: page.locator(".bi-trash") });
      const rowBox = await row.boundingBox(), buttonBox = await remove.boundingBox();
      expect(buttonBox.y + buttonBox.height / 2).toBeCloseTo(rowBox.y + rowBox.height / 2, 1);
      await expect(remove).toHaveCSS("background-color", "rgb(255, 0, 0)");
    }
  }
  await rows.nth(0).locator("button").filter({ has: page.locator(".bi-trash") }).click();
  await expect(page.getByPlaceholder("Enter Name")).toHaveCount(1);
  await expect(page.getByPlaceholder("Enter Name")).toHaveValue("Donation");
  expect(state.writes).toHaveLength(0);
});

for (const width of [390, 1440]) test(`Event Products lower borders remain above the footer at ${width}px`, async ({ page }) => {
  await productsFixture(page);
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const section = page.getByRole("group", { name: "Event Products:", exact: true });
  await expect(section.getByPlaceholder("Enter Name")).toHaveValue("Admission");
  const card = section.getByRole("tablist").locator("..");
  for (const label of ["Member Products", "Non-Member Products"]) {
    await section.getByRole("tab", { name: label, exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footer = await page.getByRole("contentinfo").boundingBox();
    for (const [name, element] of [["section", section], ["card", card]]) {
      const bounds = await element.boundingBox();
      expect(bounds.y + bounds.height, `${name} bottom behind footer in ${label}`).toBeLessThanOrEqual(footer.y);
      await expect(element).toHaveCSS("border-bottom-style", "solid");
      await expect(element).toHaveCSS("border-bottom-width", "1px");
      expect(await element.evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        const x = Math.max(0, bounds.left) + Math.min(20, (Math.min(innerWidth, bounds.right) - Math.max(0, bounds.left)) / 2);
        return node.contains(document.elementFromPoint(x, bounds.bottom - .5));
      })).toBe(true);
    }
  }
});

for (const editor of ["editEvent/gallery_event", "addEvent"]) test(`${editor} product dropdown heights match Product Name`, async ({ page }) => {
  await productsFixture(page);
  await page.goto(`/adminDashboard/${editor}`);
  if (editor === "addEvent") await page.locator("button").filter({ has: page.locator(".bi-plus-lg") }).click();
  const name = page.getByPlaceholder("Enter Name");
  await expect(name).toBeVisible();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    const nameHeight = (await name.boundingBox()).height;
    for (const label of ["Product Type", "Product Target"]) {
      const dropdown = page.getByLabel(label, { exact: true });
      await expect(dropdown).toBeEnabled();
      expect((await dropdown.boundingBox()).height, `${label} height at ${width}px`).toBeCloseTo(nameHeight, 2);
    }
  }
  await page.getByLabel("Product Type", { exact: true }).selectOption("Ticket");
  await page.getByLabel("Product Target", { exact: true }).selectOption("Adult");
  await expect(page.getByLabel("Product Type", { exact: true })).toHaveValue("Ticket");
  await expect(page.getByLabel("Product Target", { exact: true })).toHaveValue("Adult");
});

for (const withImage of [false, true]) test(`the plus button adds a member product ${withImage ? "with an uploaded image" : "without an image"} and Save persists it`, async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = await productsFixture(page);
  state.products = [];
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const panel = page.getByRole("tabpanel", { name: "Member Products", exact: true });
  const add = panel.getByRole("button", { name: "Add member product", exact: true });
  await expect(add).toBeEnabled();
  await add.click();
  await panel.getByPlaceholder("Enter Name").fill("New admission");
  await panel.getByLabel("Product Type", { exact: true }).selectOption("Ticket");
  await panel.getByLabel("Product Target", { exact: true }).selectOption("Adult");
  await panel.getByPlaceholder("Enter Price").fill("12.75");
  await panel.getByPlaceholder("Enter Inventory").fill("5");
  await panel.getByPlaceholder("Select Date").fill("2026-12-01");
  expect(state.event.writes).toHaveLength(0);
  expect(state.writes).toHaveLength(0);
  if (withImage) {
    await panel.locator('input[type="file"]').setInputFiles(selectedImage("admission.png"));
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await dismissPopup(page, "Products were not saved");
    expect(state.writes).toHaveLength(0);
    await panel.getByRole("button", { name: "Upload", exact: true }).click();
    await expect(panel.getByText("Product Image:admission.png", { exact: false })).toBeVisible();
  }
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/adminDashboard\/events$/);
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0][0]).toMatchObject({ productName: "New admission", productType: "Ticket",
    productTarget: "Adult", productPrice: "12.75", productInventory: "5", eventDate: "2026-12-01" });
  expect(state.writes[0][0].productImage).toBe(withImage ? "productImage_123_admission.png" : "");
  await page.goto("/adminDashboard/editEvent/gallery_event");
  await expect(panel.getByPlaceholder("Enter Name")).toHaveValue("New admission");
  await expect(panel.getByPlaceholder("Enter Price")).toHaveValue("12.75");
  expect(errors).toEqual([]);
});

for (const width of [390, 1440]) test(`Event Products has two accessible card tabs at ${width}px without losing edits`, async ({ page }) => {
  const state = await productsFixture(page);
  await page.setViewportSize({ width, height: 950 });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const section = page.getByRole("group", { name: "Event Products:", exact: true });
  const tabs = section.getByRole("tablist", { name: "Event product categories" });
  const member = tabs.getByRole("tab", { name: "Member Products", exact: true });
  const nonMember = tabs.getByRole("tab", { name: "Non-Member Products", exact: true });
  const panel = section.getByRole("tabpanel", { name: "Member Products", exact: true });
  await expect(member).toHaveAttribute("aria-selected", "true");
  await expect(nonMember).toHaveAttribute("tabindex", "-1");
  await expect(panel.getByPlaceholder("Enter Name")).toHaveValue("Admission");
  const initialReads = state.reads;
  await panel.getByPlaceholder("Enter Name").fill("Weekend admission");
  await panel.locator('input[type="file"]').setInputFiles(selectedImage("pending-product.png"));
  await nonMember.click();
  await expect(panel).toBeHidden();
  await expect(section.getByRole("tabpanel", { name: "Non-Member Products", exact: true })
    .getByRole("button", { name: "Add non-member product", exact: true })).toBeEnabled();
  await page.keyboard.press("ArrowRight");
  await expect(member).toBeFocused();
  await expect(member).toHaveAttribute("aria-selected", "true");
  await expect(panel.getByPlaceholder("Enter Name")).toHaveValue("Weekend admission");
  expect(await panel.locator('input[type="file"]').evaluate((input) => input.files[0].name)).toBe("pending-product.png");
  await page.keyboard.press("End");
  await expect(nonMember).toBeFocused();
  await page.keyboard.press("Home");
  await expect(member).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(nonMember).toBeFocused();
  expect(state.reads).toBe(initialReads);
  expect(state.event.writes).toHaveLength(0);
  expect(state.writes).toHaveLength(0);
  expect(await tabs.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const card = tabs.locator("..");
  expect(await card.evaluate((element) => parseFloat(getComputedStyle(element).borderRadius))).toBeGreaterThan(0);
  await expect(card).toHaveCSS("border-top-style", "solid");
  await card.screenshot({ path: test.info().outputPath(`event-product-tabs-${width}.png`) });
});

test("Save from Non-Member Products still persists the hidden member editor and reopens the changes", async ({ page }) => {
  const state = await productsFixture(page);
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const memberPanel = page.getByRole("tabpanel", { name: "Member Products", exact: true });
  await expect(memberPanel.getByPlaceholder("Enter Name")).toHaveValue("Admission");
  await memberPanel.getByPlaceholder("Enter Name").fill("Weekend admission");
  await memberPanel.getByPlaceholder("Enter Price").fill("12.75");
  await page.getByRole("tab", { name: "Non-Member Products", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/adminDashboard\/events$/);
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0][0]).toMatchObject({ productName: "Weekend admission", productPrice: "12.75", productId: 101 });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  await expect(page.getByRole("tab", { name: "Member Products", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(memberPanel.getByPlaceholder("Enter Name")).toHaveValue("Weekend admission");
  await expect(memberPanel.getByPlaceholder("Enter Price")).toHaveValue("12.75");
});

test("failed Save keeps the selected tab and blocks tab switching until the popup is dismissed", async ({ page }) => {
  const state = await productsFixture(page);
  state.event.failSave = true;
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const memberPanel = page.getByRole("tabpanel", { name: "Member Products", exact: true });
  await expect(memberPanel.getByPlaceholder("Enter Name")).toHaveValue("Admission");
  await memberPanel.getByPlaceholder("Enter Name").fill("Retry admission");
  const nonMember = page.getByRole("tab", { name: "Non-Member Products", exact: true });
  await nonMember.click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(nonMember).toBeDisabled();
  await dismissPopup(page, "Event save unavailable");
  await expect(nonMember).toBeEnabled();
  await expect(nonMember).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Member Products", exact: true }).click();
  await expect(memberPanel.getByPlaceholder("Enter Name")).toHaveValue("Retry admission");
  expect(state.writes).toHaveLength(0);
});

test("non-member products add, upload, save and reopen independently from member products", async ({ page }) => {
  const state = await productsFixture(page);
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const member = page.getByRole("tabpanel", { name: "Member Products", exact: true });
  await expect(member.getByPlaceholder("Enter Name")).toHaveValue("Admission");
  await member.getByPlaceholder("Enter Name").fill("Member admission");
  await page.getByRole("tab", { name: "Non-Member Products", exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: "Non-Member Products", exact: true });
  await panel.getByRole("button", { name: "Add non-member product" }).click();
  await panel.getByLabel("Product Name", { exact: true }).fill("Guest admission");
  await panel.getByLabel("Product Type", { exact: true }).selectOption("Ticket");
  await expect(panel.getByLabel("Product Target", { exact: true })).toHaveCount(0);
  await panel.getByLabel("Product Price", { exact: true }).fill("19.75");
  await panel.getByLabel("Product Inventory", { exact: true }).fill("0");
  await panel.getByLabel("Event Date", { exact: true }).fill("2026-12-01");
  await panel.getByLabel("Product Image", { exact: true }).setInputFiles(selectedImage("admission.png"));
  await panel.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(panel.getByText("Product Image:admission.png", { exact: false })).toBeVisible();
  await page.getByRole("tab", { name: "Member Products", exact: true }).click();
  await expect(member.getByPlaceholder("Enter Name")).toHaveValue("Member admission");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/adminDashboard\/events$/);
  expect(state.writes[0][0].productName).toBe("Member admission");
  expect(state.event.nonMemberWrites[0].products[0]).toMatchObject({ productName: "Guest admission", productPrice: "19.75", productInventory: "0", productImage: "productImage_123_admission.png" });
  expect(state.event.nonMemberWrites[0].products[0]).not.toHaveProperty("productTarget");
  await page.goto("/adminDashboard/editEvent/gallery_event");
  await page.getByRole("tab", { name: "Non-Member Products", exact: true }).click();
  await expect(panel.getByLabel("Product Name", { exact: true })).toHaveValue("Guest admission");
  await expect(panel.getByLabel("Product Price", { exact: true })).toHaveValue("19.75");
  await panel.getByRole("button", { name: "Delete non-member product 1" }).click();
  await expect(panel.getByPlaceholder("Enter Name")).toHaveCount(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/adminDashboard\/events$/);
  expect(state.event.nonMemberProducts).toHaveLength(0);
  expect(state.products).toHaveLength(1);
  expect(state.products[0].name).toBe("Member admission");
});

test("non-member failed loads never delete saved data and failed saves retain drafts", async ({ page }) => {
  const state = await productsFixture(page);
  state.event.nonMemberProducts = [{ id: 201, version: 1, name: "Guest ticket", type: "Ticket", price: "20.00", inventory: 5, event_date: "2026-12-01" }];
  state.event.failNonMemberLoad = true;
  await page.goto("/adminDashboard/editEvent/gallery_event");
  await page.getByRole("tab", { name: "Non-Member Products", exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: "Non-Member Products", exact: true });
  await expect(panel.getByRole("alert")).toContainText("Non-member products unavailable");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await dismissPopup(page, "Non-member products were not saved");
  expect(state.event.nonMemberWrites).toHaveLength(0);
  state.event.failNonMemberLoad = false;
  await page.reload();
  await page.getByRole("tab", { name: "Non-Member Products", exact: true }).click();
  await expect(panel.getByPlaceholder("Enter Name")).toHaveValue("Guest ticket");
  await panel.getByPlaceholder("Enter Name").fill("Revised guest ticket");
  state.event.failNonMemberSave = true;
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await dismissPopup(page, "non-member products were not saved");
  await expect(panel.getByPlaceholder("Enter Name")).toHaveValue("Revised guest ticket");
  expect(state.event.nonMemberProducts[0].name).toBe("Guest ticket");
  state.event.failNonMemberSave = false;
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/adminDashboard\/events$/);
  expect(state.event.nonMemberProducts[0].name).toBe("Revised guest ticket");
});

test("a non-member product without an image retains its saved identity when member rows need correction", async ({ page }) => {
  const state = await productsFixture(page);
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const member = page.getByRole("tabpanel", { name: "Member Products", exact: true });
  await expect(member.getByPlaceholder("Enter Name")).toHaveValue("Admission");
  await member.getByLabel("Product Price", { exact: true }).fill("");
  await page.getByRole("tab", { name: "Non-Member Products", exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: "Non-Member Products", exact: true });
  await panel.getByRole("button", { name: "Add non-member product" }).click();
  await panel.getByLabel("Product Name", { exact: true }).fill("Guest admission");
  await panel.getByLabel("Product Type", { exact: true }).selectOption("Ticket");
  await panel.getByLabel("Product Price", { exact: true }).fill("9.25");
  await panel.getByLabel("Product Inventory", { exact: true }).fill("10");
  await panel.getByLabel("Event Date", { exact: true }).fill("2026-12-01");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await dismissPopup(page, "Products were not saved");
  expect(state.event.nonMemberProducts).toHaveLength(1);
  const id = state.event.nonMemberProducts[0].id;
  expect(state.event.nonMemberProducts[0].image_name).toBe("");
  await page.getByRole("tab", { name: "Member Products", exact: true }).click();
  await member.getByLabel("Product Price", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/adminDashboard\/events$/);
  expect(state.event.nonMemberProducts).toHaveLength(1);
  expect(state.event.nonMemberProducts[0].id).toBe(id);
  expect(state.event.nonMemberWrites[1]).toMatchObject({ version: 2, products: [{ productId: id, version: 1 }] });
});
