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
