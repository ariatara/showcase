import { test, expect } from "@playwright/test";
import { galleryFixture } from "./GalleryFixtures.js";
import { dismissPopup } from "./PopupAssertions.js";

async function productTypesFixture(page) {
  await galleryFixture(page);
  const state = { rows: [{ id: 7, type: "Ticket" }, { id: 8, type: "Donation" }], writes: [], failure: "", loadFailure: false };
  await page.route("http://localhost:3000/auth/productTypes{,/**}", async (route) => {
    const method = route.request().method();
    const last = new URL(route.request().url()).pathname.split("/").at(-1);
    const id = Number(last), row = state.rows.find((item) => item.id === id);
    if (method === "GET") {
      if (state.loadFailure) return route.fulfill({ status: 503, json: { Status: false, Error: "Product types unavailable." } });
      if (last === "productTypes") return route.fulfill({ json: { Status: true, Result: state.rows } });
      return route.fulfill({ status: row ? 200 : 404, json: row ? { Status: true, Result: row } : { Status: false, Error: "Product type not found." } });
    }
    expect(["PUT", "DELETE"]).toContain(method);
    state.writes.push({ method, id, body: method === "PUT" ? route.request().postDataJSON() : null });
    if (state.failure) return route.fulfill({ status: 409, json: { Status: false, Error: state.failure } });
    if (method === "PUT") row.type = route.request().postDataJSON().productType.trim();
    else state.rows = state.rows.filter((item) => item.id !== id);
    return route.fulfill({ json: { Status: true } });
  });
  return state;
}

test("Edit opens the selected product type and Save persists it across reopening", async ({ page }) => {
  const state = await productTypesFixture(page);
  await page.goto("/adminDashboard/productTypes");
  await page.getByRole("row").filter({ hasText: "Ticket" }).getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page).toHaveURL(/\/editProductType\/7$/);
  const name = page.getByLabel("Product Type", { exact: true });
  await expect(name).toHaveValue("Ticket");
  await name.fill("Admission");
  expect(state.writes).toHaveLength(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/productTypes$/);
  await expect(page.getByRole("cell", { name: "Admission", exact: true })).toBeVisible();
  expect(state.writes).toEqual([{ method: "PUT", id: 7, body: { productType: "Admission" } }]);
  await page.getByRole("row").filter({ hasText: "Admission" }).getByRole("link", { name: "Edit", exact: true }).click();
  await expect(name).toHaveValue("Admission");
  await page.reload();
  await expect(name).toHaveValue("Admission");
  await name.fill("Discard this change");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/productTypes$/);
  expect(state.writes).toHaveLength(1);
});

test("Delete requires confirmation and removes only the selected product type", async ({ page }) => {
  const state = await productTypesFixture(page);
  await page.goto("/adminDashboard/productTypes");
  const remove = page.getByRole("row").filter({ hasText: "Ticket" }).getByRole("button", { name: "Delete", exact: true });
  const dialog = page.getByRole("alertdialog", { name: "Delete Product Type", exact: true });
  await remove.click();
  await expect(dialog).toContainText("Ticket");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(remove).toBeEnabled();
  await remove.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(state.writes).toHaveLength(0);
  await remove.click();
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Ticket", exact: true })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "Donation", exact: true })).toBeVisible();
  expect(state.writes).toEqual([{ method: "DELETE", id: 7, body: null }]);
  await page.reload();
  await expect(page.getByRole("cell", { name: "Ticket", exact: true })).toHaveCount(0);
});

test("edit conflicts retain the input and delete conflicts retain the row", async ({ page }) => {
  const state = await productTypesFixture(page);
  state.failure = "This product type is used by products and cannot be renamed or deleted.";
  await page.goto("/adminDashboard/editProductType/7");
  const name = page.getByLabel("Product Type", { exact: true });
  await expect(name).toHaveValue("Ticket");
  await name.fill("Admission");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await dismissPopup(page, "used by products");
  await expect(name).toHaveValue("Admission");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const remove = page.getByRole("row").filter({ hasText: "Ticket" }).getByRole("button", { name: "Delete", exact: true });
  await remove.click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click();
  await dismissPopup(page, "used by products");
  await expect(remove).toBeEnabled();
  state.failure = "";
  await remove.click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Ticket", exact: true })).toHaveCount(0);
});

test("unavailable product types display an error and cannot be saved", async ({ page }) => {
  const state = await productTypesFixture(page);
  await page.goto("/adminDashboard/editProductType/99");
  await expect(page.getByRole("alert")).toContainText("Product type not found");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  state.loadFailure = true;
  await page.goto("/adminDashboard/productTypes");
  await expect(page.getByRole("alert")).toContainText("Product types unavailable");
  expect(state.writes).toHaveLength(0);
});

test("blank edits do not submit and duplicate names allow correction and retry", async ({ page }) => {
  const state = await productTypesFixture(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/adminDashboard/editProductType/7");
  const name = page.getByLabel("Product Type", { exact: true });
  await expect(name).toHaveValue("Ticket");
  await name.fill("   ");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await dismissPopup(page, "Enter a product type");
  expect(state.writes).toHaveLength(0);
  state.failure = "A product type with this name already exists.";
  await name.fill("Donation");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await dismissPopup(page, "already exists");
  await expect(name).toHaveValue("Donation");
  state.failure = "";
  await name.fill("Admission");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Admission", exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(2);
});
