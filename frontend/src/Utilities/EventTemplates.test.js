import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_TEMPLATES, resolveEventTemplate } from "./EventTemplates.js";
import { EVENT_TEMPLATE_IDS } from "../../../backend/Utilities/EventTemplates.js";
import { normalizeEventPayload, validateEvent } from "../../../backend/Utilities/EventValidation.js";
import { eventFromRow, prepareEventPayload, completeProducts } from "./EventValidation.js";

test("template registries agree, legacy reads default, and unavailable values remain visible to editors", () => {
  assert.deepEqual(EVENT_TEMPLATES.map((item) => item.id), EVENT_TEMPLATE_IDS);
  assert.equal(eventFromRow({}).viewTemplate, "signature");
  assert.equal(eventFromRow({ view_template: "unavailable" }).viewTemplate, "unavailable");
  assert.equal(resolveEventTemplate("unavailable"), "signature");
  for (const id of EVENT_TEMPLATE_IDS) {
    assert.equal(prepareEventPayload(eventFromRow({ view_template: id })).viewTemplate, id);
    assert.equal(normalizeEventPayload({ viewTemplate: id }).viewTemplate, id);
  }
  assert.equal(Object.hasOwn(prepareEventPayload({}), "viewTemplate"), false);
});

test("explicit invalid templates fail rather than silently becoming the default", () => {
  for (const value of [null, "", "future", 12, {}, "x".repeat(65)]) {
    assert.throws(() => prepareEventPayload({ viewTemplate: value }), /template/i);
    try {
      const normalized = normalizeEventPayload({ viewTemplate: value });
      assert.ok(validateEvent(normalized).viewTemplate);
    } catch (error) { assert.match(error.message, /template/i); }
  }
});

test("product forms permit zero stock and exact cents while rejecting invalid identities", () => {
  const product = { productName: "Ticket", productType: "Entry", productTarget: "Adult",
    productPrice: "1.25", productInventory: 0, eventDate: "2026-04-01", productId: 1, version: 2 };
  assert.equal(completeProducts([product]), true);
  for (const patch of [{ productPrice: "1.001" }, { productPrice: "1e2" }, { productInventory: -1 }, { version: 0 }]) {
    assert.equal(completeProducts([{ ...product, ...patch }]), false);
  }
});
