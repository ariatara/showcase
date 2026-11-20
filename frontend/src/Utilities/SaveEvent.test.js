import test from "node:test";
import assert from "node:assert/strict";
import { saveEvent } from "./SaveEvent.js";

const details = { pageTitle: "Fair" };
const products = [{ productName: "Ticket", productType: "Adult", productTarget: "Member",
  productPrice: 10, productInventory: 2, eventDate: "2026-04-01" }];

test("saveEvent waits for the event and supplies its URL to products", async () => {
  const calls = [];
  const client = { async post(url, body) {
    calls.push({ url, body });
    if (calls.length === 1) return { data: { Status: true, Result: { id: 3, url: "fair" } } };
    assert.equal(calls[0].url.endsWith("/events"), true);
    assert.equal(body[0].eventURL, "fair");
    return { data: { Status: true } };
  } };
  const result = await saveEvent({ details, products }, client);
  assert.equal(result.id, 3);
  assert.equal(calls.length, 2);
});

test("saveEvent never saves products after a rejected event", async () => {
  let calls = 0;
  const client = { async post() { calls++; return { data: { Status: false, Error: "Duplicate" } }; } };
  await assert.rejects(saveEvent({ details, products }, client), /Duplicate/);
  assert.equal(calls, 1);
});

test("saveEvent retains the new ID and warns if products fail or are incomplete", async () => {
  const client = { async post(url) {
    if (url.endsWith("/events")) return { data: { Status: true, Result: { id: 3, url: "fair" } } };
    throw new Error("Product request failed");
  } };
  const result = await saveEvent({ details, products }, client);
  assert.equal(result.id, 3);
  assert.match(result.warning, /Event saved.*products.*not saved/i);
  const skipped = await saveEvent({ details, products: [{}] }, client);
  assert.match(skipped.warning, /complete all product rows/i);
});

test("saveEvent skips empty create products, but empty edit products request deletion", async () => {
  const client = { async post() { return { data: { Status: true, Result: { id: 3, url: "fair" } } }; } };
  assert.equal((await saveEvent({ details, products: [] }, client)).warning, "");
  const calls = [];
  const editing = { async put(url, body) {
    calls.push({ url, body });
    return { data: { Status: true, Result: { id: 3, url: "fair" } } };
  } };
  await saveEvent({ details, products: [], id: 3 }, editing);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].body, []);
});

test("gallery create and edit saves send ordered CSV and explicit clears without mutating editor arrays", async () => {
  for (const id of [undefined, 3]) {
    const calls = [];
    const images = ["retained image.png", "new.webp"];
    const request = async (url, body) => {
      calls.push({ url, body });
      return { data: { Status: true, Result: { id: 3, url: "fair" } } };
    };
    await saveEvent({
      id, details: { ...details, upperHubEventImages: images, lowerHubEventImages: [] }, products: [],
    }, { post: request, put: request });
    assert.equal(calls[0].body.upperHubEventImages, "retained image.png,new.webp");
    assert.equal(calls[0].body.lowerHubEventImages, null);
    assert.deepEqual(images, ["retained image.png", "new.webp"]);
  }
});

test("invalid gallery state blocks event and product requests rather than serializing preview metadata", async () => {
  for (const images of [[{ previewUrl: "blob:pending" }], Array.from({ length: 11 }, (_, i) => `${i}.png`)]) {
    let calls = 0;
    const request = () => { calls++; throw new Error("Unexpected request"); };
    await assert.rejects(saveEvent({
      details: { ...details, upperHubEventImages: images }, products,
    }, { post: request, put: request }), /filename|at most 10/);
    assert.equal(calls, 0);
  }
});
