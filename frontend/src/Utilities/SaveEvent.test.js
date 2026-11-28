import test from "node:test";
import assert from "node:assert/strict";
import { saveEvent } from "./SaveEvent.js";

const details = { pageTitle: "Fair" };
const products = [{ productName: "Ticket", productType: "Adult", productTarget: "Member",
  productPrice: 10, productInventory: 2, eventDate: "2026-04-01" }];

test("Save persists both audiences independently without requiring a non-member target", async () => {
  const nonMemberProducts = products.map(({ productTarget, ...product }) => { assert.ok(productTarget); return product; });
  const calls = [];
  const client = { async put(url, body, options) {
    calls.push({ url, body, options });
    if (url.endsWith("/events/3")) return { data: { Status: true, Result: { id: 3, url: "fair" } } };
    return { data: { Status: true, Result: { products: body, version: options.headers["X-Product-Version"] + 1 } } };
  } };
  const result = await saveEvent({ id: 3, details: { ...details, productsVersion: 4, nonMemberProductsVersion: 8 },
    products, nonMemberProducts }, client);
  assert.equal(calls.length, 3);
  assert.ok(calls[1].url.endsWith("/memberProducts/fair"));
  assert.ok(calls[2].url.endsWith("/nonMemberProducts/fair"));
  assert.equal(calls[2].body[0].eventURL, "fair");
  assert.equal(Object.hasOwn(calls[2].body[0], "productTarget"), false);
  assert.equal(result.productReceipt.version, 5);
  assert.equal(result.nonMemberProductReceipt.version, 9);
  assert.equal(result.warning, "");
});

test("a failed non-member save returns the member receipt and a retryable warning", async () => {
  const result = await saveEvent({ id: 3, details, products, nonMemberProducts: products }, { async put(url) {
    if (url.includes("/nonMemberProducts/")) throw new Error("Non-member products changed. Reopen the event.");
    return { data: { Status: true, Result: url.includes("/events/") ? { id: 3, url: "fair" } : { products, version: 2 } } };
  } });
  assert.equal(result.productReceipt.version, 2);
  assert.equal(result.nonMemberProductReceipt, undefined);
  assert.match(result.warning, /non-member products were not saved.*changed/i);
});

test("unloaded non-member lists never clear data but an explicit empty list does", async () => {
  for (const nonMemberProducts of [null, []]) {
    const calls = [];
    const result = await saveEvent({ id: 3, details, products: [], nonMemberProducts }, { async put(url, body) {
      calls.push({ url, body });
      return { data: { Status: true, Result: { id: 3, url: "fair" } } };
    } });
    if (nonMemberProducts === null) {
      assert.equal(calls.length, 2);
      assert.match(result.warning, /non-member products were not saved/i);
    } else {
      assert.equal(calls.length, 3);
      assert.deepEqual(calls[2].body, []);
    }
  }
});

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
