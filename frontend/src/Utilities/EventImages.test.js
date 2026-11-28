import test from "node:test";
import assert from "node:assert/strict";
import { parseEventImagePaths, serializeEventImagePaths, eventImageUrl, MAX_GALLERY_IMAGES } from "./EventImages.js";

test("gallery CSV preserves order, clears empties, and reads legacy collections without truncation", () => {
  assert.deepEqual(parseEventImagePaths(null), []);
  assert.deepEqual(parseEventImagePaths(" b.jpg, , a.png "), ["b.jpg", "a.png"]);
  assert.equal(serializeEventImagePaths([]), null);
  assert.equal(serializeEventImagePaths(["b.jpg", "a.png"]), "b.jpg,a.png");
  const paths = Array.from({ length: 11 }, (_, i) => `${i}.jpg`);
  assert.equal(parseEventImagePaths(paths.join(",")).length, 11);
});

test("gallery serialization accepts ten but rejects eleven, invalid entries, and oversized text", () => {
  assert.equal(MAX_GALLERY_IMAGES, 10);
  const ten = Array.from({ length: 10 }, (_, i) => `${i}.jpg`);
  assert.equal(serializeEventImagePaths(ten), ten.join(","));
  assert.throws(() => serializeEventImagePaths([...ten, "extra.jpg"]), /10/);
  for (const entry of ["", "a,b.jpg", "../a.jpg", "a\\b.jpg", "http://a.jpg", ".", "..", "a\0b.jpg", {}, 1]) {
    assert.throws(() => serializeEventImagePaths([entry]), /filename/i);
  }
  assert.throws(() => serializeEventImagePaths(["é".repeat(32768)]), /text limit/i);
  const atLimit = "é".repeat(32767) + "a";
  assert.equal(serializeEventImagePaths([atLimit]), atLimit);
  assert.throws(() => serializeEventImagePaths({}), /list/i);
  assert.throws(() => parseEventImagePaths({}), /text/i);
});

test("gallery URLs encode legacy filenames without changing their stored value", () => {
  const name = "fête #1 %.png";
  assert.equal(serializeEventImagePaths([name]), name);
  assert.equal(eventImageUrl(name), `http://localhost:3000/Uploads/${encodeURIComponent(name)}`);
});
