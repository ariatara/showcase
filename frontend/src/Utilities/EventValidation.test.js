import test from "node:test";
import assert from "node:assert/strict";
import { prepareEventPayload, missingEventFields, eventFromRow, completeProducts } from "./EventValidation.js";

test("prepareEventPayload derives the URL and never serializes pending upload objects", () => {
  const payload = prepareEventPayload({
    pageTitle: " Spring Fair ", startDate: "", bannerBackground: { name: "pending.jpg" },
    upperHubEventImages: ["a.jpg", "b.jpg"], lowerHubEventImages: [{ name: "pending.jpg" }],
  });
  assert.equal(payload.eventURL, "spring_fair");
  assert.equal(payload.startDate, null);
  assert.equal(payload.bannerBackground, null);
  assert.equal(payload.upperHubEventImages, "a.jpg,b.jpg");
  assert.equal(payload.lowerHubEventImages, null);
});

test("missingEventFields permits drafts and reports publish-only fields", () => {
  assert.deepEqual(missingEventFields({ pageTitle: "Fair", eventURL: "fair" }), []);
  assert.ok(missingEventFields({ pageTitle: "Fair", eventURL: "fair", isPublished: true }).includes("Start date"));
  assert.ok(missingEventFields({}).includes("Page title"));
});

test("eventFromRow reopens null draft fields without string operations on null", () => {
  const event = eventFromRow({ id: 7, page_title: "Fair", url: "fair", start_date: null, published: 0 });
  assert.equal(event.eventId, 7);
  assert.equal(event.startDate, "");
  assert.equal(event.upperHubEventImages, "");
  assert.equal(event.isPublished, false);
});

test("completeProducts rejects the entire incomplete batch rather than deleting saved products", () => {
  const valid = { productName: "Ticket", productType: "Adult", productTarget: "Member",
    productPrice: 10, productInventory: 5, eventDate: "2026-04-01" };
  assert.equal(completeProducts([valid]), true);
  assert.equal(completeProducts([valid, { productName: "Unfinished" }]), false);
  assert.equal(completeProducts([{ ...valid, productImage: {} }]), false);
  assert.equal(completeProducts([{ ...valid, productPrice: "" }]), false);
  assert.equal(completeProducts([]), true);
});
