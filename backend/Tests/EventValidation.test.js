import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEventPayload,
  validateDraft,
  validatePublish,
  validateEvent,
  EVENT_FIELDS,
} from "../Utilities/EventValidation.js";

const complete = {
  pageTitle: "Spring Fair", eventURL: "spring_fair", eventTitle: "Fair",
  startDate: "2026-04-01", endDate: "2026-04-02",
  startTime: "10:00", endTime: "17:00", venueAddress: "Town Hall",
  bannerBackground: "banner.jpg", isPublished: true,
};

test("normalizeEventPayload trims fields, maps blanks to null and parses false explicitly", () => {
  assert.deepEqual(normalizeEventPayload({ pageTitle: " Fair ", startDate: "", isPublished: "false" }),
    { pageTitle: "Fair", startDate: null, isPublished: false });
  assert.equal(normalizeEventPayload({ isPublished: 1 }).isPublished, true);
  assert.equal(normalizeEventPayload({ isPublished: "0" }).isPublished, false);
});

test("normalizeEventPayload preserves omitted fields and rejects malformed input", () => {
  assert.deepEqual(normalizeEventPayload({}), {});
  assert.throws(() => normalizeEventPayload(null), /object/i);
  assert.throws(() => normalizeEventPayload([]), /object/i);
  assert.throws(() => normalizeEventPayload({ isPublished: "maybe" }), /visibility/i);
  assert.throws(() => normalizeEventPayload({ bannerBackground: {} }), /text/i);
});

test("validateDraft accepts only page title and derived URL but not empty identity", () => {
  assert.deepEqual(validateDraft({ pageTitle: "Fair", eventURL: "fair" }), []);
  assert.deepEqual(validateDraft({}), ["pageTitle", "eventURL"]);
  assert.deepEqual(validateDraft({ pageTitle: " ", eventURL: "" }), ["pageTitle", "eventURL"]);
});

test("validatePublish checks every required field, including an uploaded banner", () => {
  assert.deepEqual(validatePublish(complete), []);
  for (const field of Object.keys(complete).filter((key) => key !== "isPublished")) {
    assert.ok(validatePublish({ ...complete, [field]: null }).includes(field), field);
  }
  assert.ok(validatePublish({ ...complete, bannerBackground: {} }).includes("bannerBackground"));
});

test("validateEvent permits a title-only draft and rejects incomplete publication", () => {
  assert.deepEqual(validateEvent({ pageTitle: "Fair", eventURL: "fair", isPublished: false }), {});
  const errors = validateEvent({ pageTitle: "Fair", eventURL: "fair", isPublished: true });
  assert.ok(errors.startDate);
  assert.ok(errors.bannerBackground);
  assert.deepEqual(validateEvent(complete), {});
});

test("validateEvent enforces SQL widths and valid calendar values even for drafts", () => {
  assert.ok(validateEvent({ ...complete, pageTitle: "x".repeat(65) }).pageTitle);
  assert.ok(validateEvent({ ...complete, startDate: "2026-02-30" }).startDate);
  assert.ok(validateEvent({ ...complete, startDate: "0000-00-00" }).startDate);
  assert.ok(validateEvent({ ...complete, startTime: "25:00" }).startTime);
  assert.ok(validateEvent({ ...complete, upperHubContent: "x".repeat(65536) }).upperHubContent);
  assert.deepEqual(validateEvent({ ...complete, startDate: "2028-02-29", startTime: "00:00:00" }), {});
});

test("validateEvent enforces every declared VARCHAR limit and UTF-8 TEXT byte size", () => {
  for (const [field, [, , max]] of Object.entries(EVENT_FIELDS)) {
    if (!max) continue;
    assert.equal(validateEvent({ ...complete, [field]: "x".repeat(max) })[field], undefined);
    assert.ok(validateEvent({ ...complete, [field]: "x".repeat(max + 1) })[field], field);
  }
  assert.ok(validateEvent({ ...complete, upperHubContent: "\u{1f600}".repeat(16384) }).upperHubContent);
});
