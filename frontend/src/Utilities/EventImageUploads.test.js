import test from "node:test";
import assert from "node:assert/strict";
import { validateImageSelection, moveImage, uploadPendingImages } from "./EventImageUploads.js";

const file = (name = "image.png", bytes = 4, type = "image/png") => new File([new Uint8Array(bytes)], name, { type });
const entry = (id) => ({ id, file: file(`${id}.png`), previewUrl: `blob:${id}` });

test("selection validates the combined ten-image limit without changing existing lists", () => {
  assert.equal(validateImageSelection([file()], 9).length, 1);
  assert.equal(validateImageSelection([], 10).length, 0);
  assert.equal(validateImageSelection(Array.from({ length: 10 }, () => file()), 0).length, 10);
  assert.throws(() => validateImageSelection([file()], 10), /10/);
  assert.throws(() => validateImageSelection([file(), file()], 9), /10/);
});

test("selection validates supported type, extension, nonempty data and the exact 10 MiB boundary", () => {
  for (const [name, type] of [["x.JPG", "image/jpeg"], ["x.png", "image/png"], ["x.gif", "image/gif"], ["x.webp", "image/webp"]]) {
    assert.equal(validateImageSelection([file(name, 4, type)], 0).length, 1);
  }
  assert.equal(validateImageSelection([file("x.png", 10 * 1024 * 1024)], 0).length, 1);
  assert.throws(() => validateImageSelection([file("x.png", 10 * 1024 * 1024 + 1)], 0), /10 MiB/);
  assert.throws(() => validateImageSelection([file("x.png", 0)], 0), /empty/);
  assert.throws(() => validateImageSelection([file("x.txt", 4, "text/plain")], 0), /JPEG/);
  assert.throws(() => validateImageSelection([file("x.jpg", 4, "image/png")], 0), /JPEG/);
  assert.throws(() => validateImageSelection([{}], 0), /file/i);
});

test("reordering preserves identities without mutating the source or permitting invalid positions", () => {
  const items = [entry("a"), entry("b"), entry("c")];
  assert.deepEqual(moveImage(items, 2, 0), [items[2], items[0], items[1]]);
  assert.deepEqual(moveImage(items, 0, 2), [items[1], items[2], items[0]]);
  assert.deepEqual(items.map((item) => item.id), ["a", "b", "c"]);
  assert.deepEqual(moveImage(items, 0, 0), items);
  assert.throws(() => moveImage(items, 0, 3), /position/);
  assert.throws(() => moveImage(items, -1, 0), /position/);
});

test("sequential partial uploads preserve retained images and successes; retries upload only remaining entries", async () => {
  const queue = [entry("a"), entry("b"), entry("c")];
  const attempts = [];
  const snapshots = [];
  let fail = true;
  const upload = async (field, selected) => {
    assert.equal(field, "upperHubEventImages");
    attempts.push(selected.name);
    if (selected.name === "b.png" && fail) throw new Error("Storage unavailable");
    return `stored_${selected.name}`;
  };
  const onUploaded = (item, paths) => snapshots.push({ id: item.id, paths: [...paths] });
  const result = await uploadPendingImages({
    queue, fieldName: "upperHubEventImages", uploadedPaths: ["retained.png"], upload, onUploaded,
  });
  assert.match(result.error, /Storage unavailable/);
  assert.deepEqual(result.remaining.map((item) => item.id), ["b", "c"]);
  assert.deepEqual(snapshots, [{ id: "a", paths: ["retained.png", "stored_a.png"] }]);
  fail = false;
  const retry = await uploadPendingImages({
    queue: result.remaining, fieldName: "upperHubEventImages", uploadedPaths: snapshots[0].paths, upload, onUploaded,
  });
  assert.deepEqual(retry.remaining, []);
  assert.deepEqual(attempts, ["a.png", "b.png", "b.png", "c.png"]);
  assert.deepEqual(snapshots.at(-1).paths, ["retained.png", "stored_a.png", "stored_b.png", "stored_c.png"]);
});

test("upload rejects invalid responses and stale completions without persisting local preview metadata", async () => {
  for (const response of [{ Status: false }, "a,b.png", "../x.png", "", null]) {
    let called = false;
    const result = await uploadPendingImages({
      queue: [entry("a")], fieldName: "lowerHubEventImages", uploadedPaths: [],
      upload: async () => response, onUploaded: () => { called = true; },
    });
    assert.ok(result.error);
    assert.equal(result.remaining.length, 1);
    assert.equal(called, false);
  }
  let active = true;
  let called = false;
  const result = await uploadPendingImages({
    queue: [entry("a"), entry("b")], fieldName: "upperHubEventImages", uploadedPaths: [],
    upload: async () => { active = false; return "stored.png"; },
    onUploaded: () => { called = true; }, isActive: () => active,
  });
  assert.equal(result.cancelled, true);
  assert.equal(called, false);
});

test("invalid gallery fields and over-limit queues are rejected before requesting uploads", async () => {
  const options = { queue: [entry("a")], uploadedPaths: [], onUploaded: () => assert.fail("Unexpected success"),
    upload: () => assert.fail("Unexpected request") };
  await assert.rejects(uploadPendingImages({ ...options, fieldName: "bannerBackground" }), /gallery field/i);
  await assert.rejects(uploadPendingImages({
    ...options, fieldName: "upperHubEventImages", uploadedPaths: Array.from({ length: 10 }, (_, i) => `${i}.png`),
  }), /10/);
});
