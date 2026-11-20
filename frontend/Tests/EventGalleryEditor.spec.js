import { test, expect } from "@playwright/test";
import { galleryFixture, selectedImage } from "./GalleryFixtures.js";

const upperEditor = (page) => page.getByRole("group", { name: /^Upper hub event images:?$/i });
const lowerEditor = (page) => page.getByRole("group", { name: /^Lower hub event images:?$/i });
const savedList = (editor) => editor.getByRole("list", { name: "Uploaded images" });
const pendingList = (editor) => editor.getByRole("list", { name: "Selected images" });

for (const [hub, editor] of [["Upper", upperEditor], ["Lower", lowerEditor]]) {
  test(`edit ${hub.toLowerCase()} gallery heading matches the background heading typography and title case`, async ({ page }) => {
    await galleryFixture(page);
    await page.goto("/adminDashboard/editEvent/gallery_event");
    const galleryHeading = editor(page).getByText(`${hub} Hub Event Images:`, { exact: true });
    await expect(galleryHeading).toBeVisible();
    const backgroundHeading = page.getByRole("group", { name: `${hub} Hub Background Image:`, exact: true })
      .getByText(`${hub} Hub Background Image:`, { exact: true });
    for (const property of ["font-family", "font-size", "font-weight", "font-style", "line-height", "text-transform"]) {
      const expected = await backgroundHeading.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
      await expect(galleryHeading).toHaveCSS(property, expected);
    }
  });
}

test("edit gallery file pickers and upload buttons match the upper background controls", async ({ page }) => {
  await galleryFixture(page, { upper: 1, lower: 1 });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const background = page.getByRole("group", { name: "Upper Hub Background Image:", exact: true });
  const readStyles = (element) => {
    const properties = ["font-family", "font-size", "line-height", "padding", "color", "background-color",
      "border-top-width", "border-top-color", "border-radius"];
    const read = (pseudo) => Object.fromEntries(properties.map((property) =>
      [property, getComputedStyle(element, pseudo).getPropertyValue(property)]));
    return { control: read(null), fileButton: element.tagName === "INPUT" ? read("::file-selector-button") : null };
  };
  for (const editor of [upperEditor(page), lowerEditor(page)]) {
    const upload = editor.getByRole("button", { name: "Upload selected images", exact: true });
    await expect(upload).toBeVisible();
    await expect(upload).toBeDisabled();
    await editor.getByLabel("Add images", { exact: true }).setInputFiles([
      selectedImage("first.png"), selectedImage("second.png"),
    ]);
    await expect(upload).toBeEnabled();
    await expect(upload).toHaveText("Upload");
    await expect(pendingList(editor).getByRole("listitem")).toHaveCount(2);
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const backgroundInput = background.locator('input[type="file"]');
    const backgroundUpload = background.getByRole("button", { name: "Upload", exact: true });
    for (const editor of [upperEditor(page), lowerEditor(page)]) {
      const input = editor.getByLabel("Add images", { exact: true });
      const upload = editor.getByRole("button", { name: "Upload selected images", exact: true });
      expect(await input.evaluate(readStyles)).toEqual(await backgroundInput.evaluate(readStyles));
      expect(await upload.evaluate(readStyles)).toEqual(await backgroundUpload.evaluate(readStyles));
      const inputBox = await input.boundingBox();
      const uploadBox = await upload.boundingBox();
      expect(inputBox.height).toBeCloseTo((await backgroundInput.boundingBox()).height, 1);
      expect(uploadBox.height).toBeCloseTo((await backgroundUpload.boundingBox()).height, 1);
      expect(uploadBox.y).toBeCloseTo(inputBox.y, 1);
      expect(uploadBox.x).toBeCloseTo(inputBox.x + inputBox.width - 1, 1);
      expect(uploadBox.y + uploadBox.height).toBeLessThan((await pendingList(editor).boundingBox()).y);
    }
  }
  await upperEditor(page).screenshot({ path: test.info().outputPath("gallery-upload-controls.png") });
  for (const editor of [upperEditor(page), lowerEditor(page)]) {
    const upload = editor.getByRole("button", { name: "Upload selected images", exact: true });
    await upload.click();
    await expect(savedList(editor).getByRole("listitem")).toHaveCount(3);
    await expect(upload).toBeVisible();
    await expect(upload).toBeDisabled();
  }
});

for (const [hub, editorFor] of [["upper", upperEditor], ["lower", lowerEditor]]) {
  test(`edit ${hub} file picker displays pending filenames through selection, removal and upload`, async ({ page }) => {
    const state = await galleryFixture(page, { upper: 1, lower: 1 });
    await page.goto("/adminDashboard/editEvent/gallery_event");
    const editor = editorFor(page);
    const input = editor.getByLabel("Add images", { exact: true });
    const selectedNames = () => input.evaluate((element) => Array.from(element.files, (file) => file.name));
    await input.setInputFiles(selectedImage("first.png"));
    await expect(input).toHaveValue(/first\.png$/);
    expect(await selectedNames()).toEqual(["first.png"]);
    await input.screenshot({ path: test.info().outputPath(`${hub}-selected-filename.png`) });

    await input.setInputFiles(selectedImage("second.png"));
    expect(await selectedNames()).toEqual(["first.png", "second.png"]);
    await pendingList(editor).getByRole("button", { name: "Move second.png earlier", exact: true }).click();
    expect(await selectedNames()).toEqual(["second.png", "first.png"]);
    await pendingList(editor).getByRole("button", { name: "Remove first.png", exact: true }).click();
    await expect(input).toHaveValue(/second\.png$/);
    await input.setInputFiles([]);
    await expect(input).toHaveValue(/second\.png$/);
    await input.setInputFiles({ ...selectedImage("invalid.txt"), mimeType: "text/plain" });
    await expect(editor.getByRole("alert")).toContainText("JPEG");
    await expect(input).toHaveValue(/second\.png$/);
    expect(await selectedNames()).toEqual(["second.png"]);

    await pendingList(editor).getByRole("button", { name: "Remove second.png", exact: true }).click();
    await expect(input).toHaveValue("");
    await input.setInputFiles(selectedImage("second.png"));
    await expect(input).toHaveValue(/second\.png$/);
    await editor.getByRole("button", { name: "Upload selected images", exact: true }).click();
    await expect(savedList(editor).getByRole("listitem")).toHaveCount(2);
    await expect(input).toHaveValue("");
    expect(await selectedNames()).toEqual([]);
    expect(state.uploadNames).toEqual(["second.png"]);
  });
}

for (const hub of ["Upper", "Lower"]) {
  test(`edit ${hub.toLowerCase()} background shows a gallery-style thumbnail that updates after uploading`, async ({ page }) => {
    const state = await galleryFixture(page, { upper: 1, lower: 1 });
    const field = `${hub.toLowerCase()}HubBackground`;
    const filename = `${hub} background #1.png`;
    state.row[`${hub.toLowerCase()}_hub_background_image_name`] = filename;
    const messages = [];
    page.on("dialog", async (dialog) => { messages.push(dialog.message()); await dialog.accept(); });
    await page.goto("/adminDashboard/editEvent/gallery_event");
    const background = page.getByRole("group", { name: `${hub} Hub Background Image:`, exact: true });
    const input = background.locator('input[type="file"]');
    const upload = background.getByRole("button", { name: "Upload", exact: true });
    const list = background.getByRole("list", { name: "Uploaded background image" });
    const image = list.locator("img");
    await expect(image).toHaveAttribute("src", `http://localhost:3000/Uploads/${encodeURIComponent(filename)}`);
    await expect(image).toHaveAttribute("alt", filename);
    await expect(background.getByText(filename, { exact: true })).toHaveCount(0);
    expect(await input.evaluate((element) => element.multiple)).toBe(false);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const reference = savedList(upperEditor(page)).getByRole("listitem").first();
      const card = list.getByRole("listitem");
      for (const property of ["border-radius", "padding", "background-color"]) {
        await expect(card).toHaveCSS(property, await reference.evaluate(
          (element, name) => getComputedStyle(element).getPropertyValue(name), property));
      }
      await expect(image).toHaveCSS("object-fit", "cover");
      await expect(image).toHaveCSS("border-radius", "6px");
      const listBox = await list.boundingBox();
      const cardBox = await card.boundingBox();
      const imageBox = await image.boundingBox();
      expect(cardBox.width).toBeCloseTo(Math.max(140, (listBox.width - 4 * 12) / 5), 1);
      expect(imageBox.width / imageBox.height).toBeCloseTo(4 / 3, 1);
      expect((await upload.boundingBox()).y).toBeLessThan(imageBox.y);
    }
    await background.screenshot({ path: test.info().outputPath(`${hub.toLowerCase()}-background-thumbnail.png`) });
    await input.setInputFiles(selectedImage("replacement.png"));
    await expect(image).toHaveAttribute("alt", filename);
    state.failUploads.add(1);
    await upload.click();
    await expect.poll(() => messages.length).toBe(1);
    expect(messages[0]).toContain("Upload temporarily unavailable");
    await expect(image).toHaveAttribute("alt", filename);
    await upload.click();
    await expect(image).toHaveAttribute("alt", `${field}_2.png`);
    await expect(list.getByRole("listitem")).toHaveCount(1);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/adminDashboard\/events$/);
    expect(state.writes.at(-1).payload[field]).toBe(`${field}_2.png`);
    await page.goto("/adminDashboard/editEvent/gallery_event");
    await expect(image).toHaveAttribute("alt", `${field}_2.png`);
  });
}

test("edit background thumbnails handle empty and broken references and recover on replacement", async ({ page }) => {
  const state = await galleryFixture(page);
  state.row.lower_hub_background_image_name = "broken-background.png";
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const upper = page.getByRole("group", { name: "Upper Hub Background Image:", exact: true });
  const lower = page.getByRole("group", { name: "Lower Hub Background Image:", exact: true });
  await expect(upper.getByRole("list", { name: "Uploaded background image" })).toHaveCount(0);
  await expect(lower.getByRole("img", { name: "broken-background.png preview unavailable", exact: true })).toBeVisible();
  for (const [background, field, attempt] of [[upper, "upperHubBackground", 1], [lower, "lowerHubBackground", 2]]) {
    await background.locator('input[type="file"]').setInputFiles(selectedImage());
    await background.getByRole("button", { name: "Upload", exact: true }).click();
    const image = background.getByRole("list", { name: "Uploaded background image" }).locator("img");
    await expect(image).toHaveAttribute("alt", `${field}_${attempt}.png`);
    await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
    await expect(background.getByText("Preview unavailable", { exact: true })).toHaveCount(0);
  }
});

test("all edit box headings match the lower gallery border title without changing form controls", async ({ page }) => {
  await galleryFixture(page);
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const referenceLegend = lowerEditor(page).locator("legend");
  const referenceTitle = referenceLegend.getByText("Lower Hub Event Images:", { exact: true });
  const titleProperties = ["font-family", "font-size", "font-weight", "font-style", "line-height", "text-transform", "color"];
  const legendProperties = ["float", "padding-left", "padding-right", "font-size", "font-weight"];
  const titleStyles = await referenceTitle.evaluate((element, properties) =>
    Object.fromEntries(properties.map((property) => [property, getComputedStyle(element).getPropertyValue(property)])), titleProperties);
  const legendStyles = await referenceLegend.evaluate((element, properties) =>
    Object.fromEntries(properties.map((property) => [property, getComputedStyle(element).getPropertyValue(property)])), legendProperties);
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const title of [
      "Event Start:", "Event End:", "Banner Background Image:", "Upper Hub Content:",
      "Upper Hub Background Image:", "Upper Hub Event Images:", "Lower Hub Content:",
      "Lower Hub Background Image:", "Lower Hub Event Images:", "Member Products:", "URL:", "Visibility:",
    ]) {
      const box = page.getByRole("group", { name: title, exact: true });
      const legend = box.locator(":scope > legend");
      const heading = legend.getByText(title, { exact: true });
      await expect(heading).toBeVisible();
      expect(await box.evaluate((element) => element.tagName)).toBe("FIELDSET");
      await expect(box).toHaveCSS("border-radius", "0px");
      for (const property of titleProperties) await expect(heading).toHaveCSS(property, titleStyles[property]);
      for (const property of legendProperties) {
        await expect(legend).toHaveCSS(property, legendStyles[property]);
      }
      const boxBounds = await box.boundingBox();
      const legendBounds = await legend.boundingBox();
      expect(legendBounds.y).toBeCloseTo(boxBounds.y, 1);
      expect(legendBounds.width).toBeLessThan(boxBounds.width);
    }
  }
  await expect(page.getByRole("textbox", { name: "Page Title", exact: true })).toHaveValue("Gallery Event");
  await expect(page.getByRole("group", { name: "Banner Background Image:", exact: true }).getByText("banner.png", { exact: true }))
    .toBeVisible();
  await expect(page.getByRole("group", { name: "Event Start:", exact: true }).getByLabel("Start Date", { exact: true }))
    .toHaveValue("2026-04-01");
  await expect(page.getByRole("group", { name: "Visibility:", exact: true }).getByLabel("Publish", { exact: true })).toBeChecked();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await page.screenshot({ path: test.info().outputPath("edit-box-headings.png"), fullPage: true });
});

test("edit galleries use the same section gap before adjacent content", async ({ page }) => {
  await galleryFixture(page);
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const content = page.getByRole("group", { name: "Upper Hub Content:", exact: true });
  const background = page.getByRole("group", { name: "Upper Hub Background Image:", exact: true });
  const lowerContent = page.getByRole("group", { name: "Lower Hub Content:", exact: true });
  const lowerBackground = page.getByRole("group", { name: "Lower Hub Background Image:", exact: true });
  const products = page.getByRole("group", { name: "Member Products:", exact: true });
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const contentBox = await content.boundingBox();
    const backgroundBox = await background.boundingBox();
    const galleryBox = await upperEditor(page).boundingBox();
    const lowerContentBox = await lowerContent.boundingBox();
    const lowerBackgroundBox = await lowerBackground.boundingBox();
    const lowerGalleryBox = await lowerEditor(page).boundingBox();
    const productsBox = await products.boundingBox();
    const sectionGap = backgroundBox.y - contentBox.y - contentBox.height;
    expect(sectionGap).toBeCloseTo(10, 1);
    expect(galleryBox.y - backgroundBox.y - backgroundBox.height).toBeCloseTo(sectionGap, 1);
    expect(lowerContentBox.y - galleryBox.y - galleryBox.height).toBeCloseTo(sectionGap, 1);
    expect(lowerGalleryBox.y - lowerBackgroundBox.y - lowerBackgroundBox.height).toBeCloseTo(sectionGap, 1);
    expect(productsBox.y - lowerGalleryBox.y - lowerGalleryBox.height).toBeCloseTo(sectionGap, 1);
  }
});

test("edit gallery sections have square outlines while cards and previews stay rounded", async ({ page }) => {
  await galleryFixture(page, { upper: 1, lower: 1 });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  for (const editor of [upperEditor(page), lowerEditor(page)]) {
    await expect(editor).toHaveCSS("border-radius", "0px");
    await expect(savedList(editor).getByRole("listitem")).toHaveCSS("border-radius", "10px");
    await expect(savedList(editor).locator("img")).toHaveCSS("border-radius", "6px");
    await editor.getByLabel("Add images", { exact: true }).setInputFiles(selectedImage());
    await expect(pendingList(editor).getByRole("listitem")).toHaveCSS("border-radius", "10px");
    await expect(pendingList(editor).locator("img")).toHaveCSS("border-radius", "6px");
  }
  await page.goto("/adminDashboard/addEvent");
  for (const editor of [upperEditor(page), lowerEditor(page)]) {
    await expect(editor).toHaveCSS("border-radius", "12px");
  }
});

test("gallery image actions are compact single-row icons with accessible labels and tooltips", async ({ page }) => {
  await galleryFixture(page, { upper: 2, lower: 2 });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  for (const editor of [upperEditor(page), lowerEditor(page)]) {
    await editor.getByLabel("Add images", { exact: true }).setInputFiles(selectedImage());
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const editor of [upperEditor(page), lowerEditor(page)]) {
      for (const list of [savedList(editor), pendingList(editor)]) {
        for (const card of await list.getByRole("listitem").all()) {
          const filename = await card.locator("img").getAttribute("alt");
          const bounds = [];
          for (const [name, title] of [
            [`Move ${filename} earlier`, "Move earlier"],
            [`Move ${filename} later`, "Move later"],
            [`Remove ${filename}`, "Remove"],
          ]) {
            const button = card.getByRole("button", { name, exact: true });
            await expect(button).toHaveText("");
            await expect(button).toHaveAttribute("title", title);
            const icon = button.locator('[aria-hidden="true"]');
            await expect(icon).toHaveCount(1);
            expect(await icon.evaluate((element) => getComputedStyle(element, "::before").content))
              .not.toMatch(/^(none|normal|""|''|)$/);
            bounds.push(await button.boundingBox());
          }
          const cardBox = await card.boundingBox();
          for (const box of bounds) {
            expect(box.y).toBeCloseTo(bounds[0].y, 1);
            expect(box.width).toBeGreaterThanOrEqual(24);
            expect(box.width).toBeLessThanOrEqual(36);
            expect(box.height).toBeGreaterThanOrEqual(24);
            expect(box.height).toBeLessThanOrEqual(36);
            expect(box.x).toBeGreaterThanOrEqual(cardBox.x);
            expect(box.x + box.width).toBeLessThanOrEqual(cardBox.x + cardBox.width);
          }
          expect(bounds[0].x + bounds[0].width).toBeLessThan(bounds[1].x);
          expect(bounds[1].x + bounds[1].width).toBeLessThan(bounds[2].x);
        }
      }
    }
  }
  await savedList(upperEditor(page)).screenshot({ path: test.info().outputPath("gallery-icon-actions.png") });
});

for (const count of [1, 10]) {
  test(`edit galleries fit ${count} uploaded images in five columns and at most two rows without filenames`, async ({ page }) => {
    await galleryFixture(page, { upper: count, lower: count });
    await page.goto("/adminDashboard/editEvent/gallery_event");
    for (const editor of [upperEditor(page), lowerEditor(page)]) {
      if (count < 10) {
        await editor.getByLabel("Add images", { exact: true }).setInputFiles(selectedImage());
        await expect(pendingList(editor).getByText("selected.png", { exact: true })).toBeVisible();
      }
    }
    for (const width of [390, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const editor of [upperEditor(page), lowerEditor(page)]) {
        for (const list of count < 10 ? [savedList(editor), pendingList(editor)] : [savedList(editor)]) {
          const listBox = await list.boundingBox();
          const metrics = await list.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              columns: style.gridTemplateColumns.split(" ").length,
              rows: style.gridTemplateRows.split(" ").length,
              gap: parseFloat(style.columnGap),
              overflowX: style.overflowX,
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
            };
          });
          const cards = await list.getByRole("listitem").all();
          expect(metrics.columns).toBe(5);
          expect(metrics.rows).toBe(Math.ceil(cards.length / 5));
          expect(metrics.rows).toBeLessThanOrEqual(2);
          const expectedCardWidth = Math.max(140, (listBox.width - 4 * metrics.gap) / 5);
          if (listBox.width < 5 * 140 + 4 * metrics.gap) {
            expect(metrics.overflowX).toBe("auto");
            expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
          }
          for (const card of cards) {
            const cardBox = await card.boundingBox();
            const image = card.locator("img");
            const imageBox = await image.boundingBox();
            expect(cardBox.width).toBeCloseTo(expectedCardWidth, 1);
            expect(imageBox.width).toBeGreaterThan(0);
            expect(imageBox.width / imageBox.height).toBeCloseTo(4 / 3, 1);
            await expect(image).toHaveCSS("object-fit", "cover");
          }
        }
        for (const image of await savedList(editor).locator("img").all()) {
          const filename = await image.getAttribute("alt");
          await expect(savedList(editor).getByText(filename, { exact: true })).not.toBeVisible();
          await expect(editor.getByRole("button", { name: `Remove ${filename}`, exact: true })).toBeVisible();
        }
      }
    }
    await upperEditor(page).screenshot({ path: test.info().outputPath(`editor-five-columns-${count}.png`) });
    await page.goto("/events/gallery_event");
    const publicImage = page.getByRole("region", { name: "Upper hub image gallery" }).locator("img").first();
    expect((await publicImage.boundingBox()).width).toBeGreaterThan(140);
    await page.goto("/adminDashboard/addEvent");
    await upperEditor(page).getByLabel("Add images", { exact: true }).setInputFiles(selectedImage());
    expect((await pendingList(upperEditor(page)).locator("img").boundingBox()).width).toBeGreaterThan(140);
  });
}

test("edit appends, reorders, removes and saves independent CSV galleries that reopen in public order", async ({ page }) => {
  const state = await galleryFixture(page, { upper: 2, lower: 1 });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const upper = upperEditor(page);
  const lower = lowerEditor(page);
  await expect(savedList(upper).getByRole("listitem")).toHaveCount(2);
  await upper.getByLabel("Add images", { exact: true }).setInputFiles([selectedImage("first.png"), selectedImage("second.png")]);
  await pendingList(upper).getByRole("button", { name: "Move first.png later", exact: true }).click();
  await upper.getByRole("button", { name: "Upload selected images", exact: true }).click();
  await expect(savedList(upper).getByRole("listitem")).toHaveCount(4);
  expect(state.uploadNames).toEqual(["second.png", "first.png"]);
  await upper.getByRole("button", { name: "Remove upper_1.png", exact: true }).click();
  await upper.getByRole("button", { name: "Move upperHubEventImages_2.png earlier", exact: true }).click();
  await lower.getByRole("button", { name: "Remove lower_1.png", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/adminDashboard\/events$/);
  const csv = "upper_2.png,upperHubEventImages_2.png,upperHubEventImages_1.png";
  expect(state.writes.at(-1).payload.upperHubEventImages).toBe(csv);
  expect(state.writes.at(-1).payload.lowerHubEventImages).toBeNull();
  await page.goto("/adminDashboard/editEvent/gallery_event");
  await expect(savedList(upperEditor(page)).locator("img")).toHaveCount(3);
  expect(await savedList(upperEditor(page)).locator("img").evaluateAll((images) => images.map((image) => image.src.split("/").at(-1))))
    .toEqual(csv.split(","));
  await page.goto("/events/gallery_event");
  const gallery = page.getByRole("region", { name: "Upper hub image gallery" });
  expect(await gallery.getByRole("list").locator("img").evaluateAll((images) => images.map((image) => image.src.split("/").at(-1))))
    .toEqual(csv.split(","));
  await expect(page.getByRole("region", { name: "Lower hub image gallery" })).toHaveCount(0);
});

test("create preserves pending-file warnings and reuses the saved draft ID instead of creating twice", async ({ page }) => {
  const state = await galleryFixture(page, { upper: 0, lower: 0 });
  const messages = [];
  page.on("dialog", async (dialog) => { messages.push(dialog.message()); await dialog.accept(); });
  await page.goto("/adminDashboard/addEvent");
  await page.getByRole("textbox", { name: "Page Title", exact: true }).fill("Gallery Draft");
  const upper = upperEditor(page);
  await upper.getByLabel("Add images", { exact: true }).setInputFiles(selectedImage());
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => messages.length).toBe(1);
  expect(messages[0]).toContain("Selected images are not saved");
  expect(state.writes[0].payload.upperHubEventImages).toBeNull();
  await expect(page).toHaveURL(/\/adminDashboard\/addEvent$/);
  await expect(pendingList(upper).getByRole("listitem")).toHaveCount(1);
  await upper.getByRole("button", { name: "Upload selected images", exact: true }).click();
  await expect(savedList(upper).getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/adminDashboard\/events$/);
  expect(state.writes.map((write) => write.method)).toEqual(["POST", "PUT"]);
  expect(state.writes[1].payload.upperHubEventImages).toBe("upperHubEventImages_1.png");
});

test("ten-image total rejects extras, permits replacement, and validates format before uploading", async ({ page }) => {
  const state = await galleryFixture(page, { upper: 10, lower: 0 });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const upper = upperEditor(page);
  await expect(upper.getByText("10 / 10", { exact: true })).toBeVisible();
  await upper.getByLabel("Add images", { exact: true }).setInputFiles(selectedImage());
  await expect(upper.getByRole("alert")).toContainText("at most 10");
  await expect(savedList(upper).getByRole("listitem")).toHaveCount(10);
  expect(state.uploadAttempts).toHaveLength(0);
  await upper.getByRole("button", { name: "Remove upper_1.png", exact: true }).click();
  await upper.getByLabel("Add images", { exact: true }).setInputFiles(selectedImage());
  await expect(upper.getByText("10 / 10", { exact: true })).toBeVisible();
  await upper.getByRole("button", { name: "Upload selected images", exact: true }).click();
  await expect(savedList(upper).getByRole("listitem")).toHaveCount(10);
  const lower = lowerEditor(page);
  await lower.getByLabel("Add images", { exact: true }).setInputFiles(
    Array.from({ length: 11 }, (_, index) => selectedImage(`${index}.png`)));
  await expect(lower.getByRole("alert")).toContainText("at most 10");
  await lower.getByLabel("Add images", { exact: true }).setInputFiles({ ...selectedImage("invalid.txt"), mimeType: "text/plain" });
  await expect(lower.getByRole("alert")).toContainText("JPEG");
  await expect(pendingList(lower)).toHaveCount(0);
  expect(state.uploadAttempts).toHaveLength(1);
});

for (const [hub, editorFor, field] of [
  ["upper", upperEditor, "upperHubEventImages"],
  ["lower", lowerEditor, "lowerHubEventImages"],
]) {
  test(`edit ${hub} pending uploads appear first with the upload button above and completed images append in order`, async ({ page }) => {
    const state = await galleryFixture(page, { upper: 2, lower: 2 });
    await page.goto("/adminDashboard/editEvent/gallery_event");
    const editor = editorFor(page);
    const uploadButton = editor.getByRole("button", { name: "Upload selected images", exact: true });
    const expected = [`${hub}_1.png`, `${hub}_2.png`];
    const filenames = () => savedList(editor).locator("img").evaluateAll(
      (images) => images.map((image) => image.src.split("/").at(-1)));
    const checkLayout = async () => {
      const buttonBox = await uploadButton.boundingBox();
      const pendingBox = await pendingList(editor).boundingBox();
      const uploadedBox = await savedList(editor).boundingBox();
      expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(pendingBox.y);
      expect(pendingBox.y + pendingBox.height).toBeLessThanOrEqual(uploadedBox.y);
      expect(await editor.getByRole("list").evaluateAll((lists) => lists.map((list) => list.getAttribute("aria-label"))))
        .toEqual(["Selected images", "Uploaded images"]);
    };

    await editor.getByLabel("Add images", { exact: true }).setInputFiles(selectedImage("first.png"));
    await expect(uploadButton).toHaveText("Upload");
    await checkLayout();
    let releaseFirst;
    state.uploadGate = new Promise((resolve) => { releaseFirst = resolve; });
    await uploadButton.click();
    await expect.poll(() => state.uploadAttempts.length).toBe(1);
    await expect(pendingList(editor).getByRole("listitem").first()).toContainText("Uploading...");
    await checkLayout();
    expect(await filenames()).toEqual(expected);
    releaseFirst();
    expected.push(`${field}_1.png`);
    await expect(savedList(editor).getByRole("listitem")).toHaveCount(expected.length);
    await expect(pendingList(editor)).toHaveCount(0);
    expect(await filenames()).toEqual(expected);

    await editor.getByLabel("Add images", { exact: true }).setInputFiles([
      selectedImage("second.png"), selectedImage("third.png"),
    ]);
    let releaseSecond;
    state.uploadGate = new Promise((resolve) => { releaseSecond = resolve; });
    await uploadButton.click();
    await expect.poll(() => state.uploadAttempts.length).toBe(2);
    let releaseThird;
    state.uploadGate = new Promise((resolve) => { releaseThird = resolve; });
    releaseSecond();
    await expect.poll(() => state.uploadAttempts.length).toBe(3);
    await expect(pendingList(editor).getByRole("listitem")).toHaveCount(1);
    await expect(pendingList(editor).getByRole("listitem").first()).toContainText("third.png");
    await expect(pendingList(editor).getByRole("listitem").first()).toContainText("Uploading...");
    await expect(editor.getByLabel("Add images", { exact: true })).toHaveValue(/third\.png$/);
    await checkLayout();
    expected.push(`${field}_2.png`);
    expect(await filenames()).toEqual(expected);
    releaseThird();
    expected.push(`${field}_3.png`);
    await expect(savedList(editor).getByRole("listitem")).toHaveCount(expected.length);
    await expect(pendingList(editor)).toHaveCount(0);
    expect(await filenames()).toEqual(expected);

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/adminDashboard\/events$/);
    expect(state.writes.at(-1).payload[field]).toBe(expected.join(","));
    await page.goto("/adminDashboard/editEvent/gallery_event");
    await expect(savedList(editorFor(page)).getByRole("listitem")).toHaveCount(expected.length);
    expect(await filenames()).toEqual(expected);
  });
}

test("partial upload failure preserves successes, releases busy state and retries only remaining files", async ({ page }) => {
  const state = await galleryFixture(page, { upper: 1, lower: 1 });
  state.failUploads.add(2);
  let release;
  state.uploadGate = new Promise((resolve) => { release = resolve; });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const upper = upperEditor(page);
  await upper.getByLabel("Add images", { exact: true }).setInputFiles([
    selectedImage("one.png"), selectedImage("two.png"), selectedImage("three.png"),
  ]);
  await upper.getByRole("button", { name: "Upload selected images", exact: true }).click();
  await expect.poll(() => state.uploadAttempts.length).toBe(1);
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await expect(lowerEditor(page).getByLabel("Add images", { exact: true })).toBeDisabled();
  release();
  await expect(upper.getByRole("alert")).toContainText("Upload temporarily unavailable");
  await expect(savedList(upper).getByRole("listitem")).toHaveCount(2);
  await expect(pendingList(upper).getByRole("listitem")).toHaveCount(2);
  expect(await upper.getByLabel("Add images", { exact: true }).evaluate((element) =>
    Array.from(element.files, (file) => file.name))).toEqual(["two.png", "three.png"]);
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await upper.getByRole("button", { name: "Retry upload", exact: true }).click();
  await expect(savedList(upper).getByRole("listitem")).toHaveCount(4);
  await expect(pendingList(upper)).toHaveCount(0);
  await expect(upper.getByLabel("Add images", { exact: true })).toHaveValue("");
  expect(state.uploadNames).toEqual(["one.png", "two.png", "two.png", "three.png"]);
  await expect(savedList(lowerEditor(page)).getByRole("listitem")).toHaveCount(1);
});

test("failed event saves retain gallery edits and permit retry", async ({ page }) => {
  const state = await galleryFixture(page, { upper: 2, lower: 0 });
  state.failSave = true;
  const messages = [];
  page.on("dialog", async (dialog) => { messages.push(dialog.message()); await dialog.accept(); });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const upper = upperEditor(page);
  await upper.getByRole("button", { name: "Move upper_2.png earlier", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => messages.length).toBe(1);
  expect(messages[0]).toBe("Event save unavailable.");
  await expect(page).toHaveURL(/editEvent/);
  await expect(savedList(upper).getByRole("listitem")).toHaveCount(2);
  state.failSave = false;
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/adminDashboard\/events$/);
  expect(state.writes.at(-1).payload.upperHubEventImages).toBe("upper_2.png,upper_1.png");
});

test("preview URLs are released on removal, upload and route change; stale uploads cannot edit another event", async ({ page }) => {
  const state = await galleryFixture(page, { upper: 0, lower: 0 });
  await page.addInitScript(() => {
    window.galleryURLs = { created: [], revoked: [] };
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (file) => {
      const url = create(file);
      window.galleryURLs.created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => { window.galleryURLs.revoked.push(url); revoke(url); };
  });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const upper = upperEditor(page);
  await upper.getByLabel("Add images", { exact: true }).setInputFiles([selectedImage("remove.png"), selectedImage("upload.png")]);
  await upper.getByRole("button", { name: "Remove remove.png", exact: true }).click();
  await upper.getByRole("button", { name: "Upload selected images", exact: true }).click();
  await expect(savedList(upper).getByRole("listitem")).toHaveCount(1);
  let release;
  state.uploadGate = new Promise((resolve) => { release = resolve; });
  await upper.getByLabel("Add images", { exact: true }).setInputFiles(selectedImage("stale.png"));
  await upper.getByRole("button", { name: "Upload selected images", exact: true }).click();
  await expect.poll(() => state.uploadAttempts.length).toBe(2);
  state.row.upper_hub_event_image_names = "other-event.png";
  await page.evaluate(() => {
    window.history.pushState({}, "", "/adminDashboard/editEvent/other_event");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(savedList(upperEditor(page)).getByRole("img", { name: "other-event.png", exact: true })).toBeVisible();
  const completed = page.waitForResponse((response) => response.url().includes("/auth/upload/"));
  release();
  await completed;
  await expect(savedList(upperEditor(page)).getByRole("listitem")).toHaveCount(1);
  await expect(savedList(upperEditor(page)).locator("img")).toHaveAttribute("src", /other-event\.png$/);
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => [...window.galleryURLs.created].sort()))
    .toEqual(await page.evaluate(() => [...window.galleryURLs.revoked].sort()));
});

for (const form of ["addEvent", "editEvent/gallery_event"]) {
  test(`${form} uploads ten selected images and a separate lower gallery without replacing either hub`, async ({ page }) => {
    const state = await galleryFixture(page, { upper: 0, lower: 0 });
    await page.goto(`/adminDashboard/${form}`);
    if (form === "addEvent") {
      await page.getByRole("textbox", { name: "Page Title", exact: true }).fill("Gallery Event");
    }
    const upper = upperEditor(page);
    const lower = lowerEditor(page);
    await upper.getByLabel("Add images", { exact: true }).setInputFiles(
      Array.from({ length: 10 }, (_, index) => selectedImage(`upper-${index}.png`)));
    await lower.getByLabel("Add images", { exact: true }).setInputFiles(selectedImage("lower-first.png"));
    await expect(upper.getByText("10 / 10", { exact: true })).toBeVisible();
    await upper.getByRole("button", { name: "Upload selected images", exact: true }).click();
    await expect(savedList(upper).getByRole("listitem")).toHaveCount(10);
    await lower.getByRole("button", { name: "Upload selected images", exact: true }).click();
    await expect(savedList(lower).getByRole("listitem")).toHaveCount(1);
    await lower.getByLabel("Add images", { exact: true }).setInputFiles(selectedImage("lower-second.png"));
    await lower.getByRole("button", { name: "Upload selected images", exact: true }).click();
    await expect(savedList(lower).getByRole("listitem")).toHaveCount(2);
    await lower.getByRole("button", { name: "Move lowerHubEventImages_12.png earlier", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(savedList(lower).getByRole("listitem").first().locator("img"))
      .toHaveAttribute("src", /lowerHubEventImages_12\.png$/);
    await lower.screenshot({ path: test.info().outputPath("gallery-editor.png") });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/adminDashboard\/events$/);
    expect(state.writes.at(-1).payload.upperHubEventImages)
      .toBe(Array.from({ length: 10 }, (_, index) => `upperHubEventImages_${index + 1}.png`).join(","));
    expect(state.writes.at(-1).payload.lowerHubEventImages)
      .toBe("lowerHubEventImages_12.png,lowerHubEventImages_11.png");
  });
}

test("legacy galleries over ten remain readable but must be reduced before saving", async ({ page }) => {
  const state = await galleryFixture(page, { upper: 11, lower: 1 });
  const messages = [];
  page.on("dialog", async (dialog) => { messages.push(dialog.message()); await dialog.accept(); });
  await page.goto("/adminDashboard/editEvent/gallery_event");
  const upper = upperEditor(page);
  await expect(savedList(upper).getByRole("listitem")).toHaveCount(11);
  await expect(upper.getByRole("alert")).toContainText("Remove images before saving");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => messages.length).toBe(1);
  expect(messages[0]).toContain("at most 10");
  expect(state.writes).toHaveLength(0);
  await upper.getByRole("button", { name: "Remove upper_11.png", exact: true }).click();
  await expect(upper.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/adminDashboard\/events$/);
  expect(state.writes.at(-1).payload.upperHubEventImages.split(",")).toHaveLength(10);
  expect(state.writes.at(-1).payload.lowerHubEventImages).toBe("lower_1.png");
});
