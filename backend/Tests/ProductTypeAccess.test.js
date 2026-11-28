import test from "node:test";
import assert from "node:assert/strict";
import { createProductTypeHandlers } from "../Controllers/ProductTypeAccess.js";

function invoke(handler, id = "7", body) {
  return new Promise((resolve) => handler({ params: { id }, body }, {
    code: 200,
    status(code) { this.code = code; return this; },
    json(data) { resolve({ code: this.code, ...data }); },
  }));
}

test("product types load by ID, trim edits and delete only the selected ID", async () => {
  const calls = [];
  const handlers = createProductTypeHandlers({ query(sql, values, callback) {
    calls.push({ sql, values });
    callback(null, sql.startsWith("SELECT") ? [{ id: 7, type: "Ticket" }] : { affectedRows: 1 });
  } });
  assert.deepEqual((await invoke(handlers.getProductType)).Result, { id: 7, type: "Ticket" });
  assert.equal((await invoke(handlers.updateProductType, "7", { productType: "  Admission  " })).Status, true);
  assert.equal((await invoke(handlers.deleteProductType)).Status, true);
  assert.deepEqual(calls.map(({ values }) => values), [[7], ["Admission", 7], [7]]);
  assert.match(calls[1].sql, /UPDATE product_types SET `type` = \? WHERE id = \?/);
  assert.match(calls[2].sql, /DELETE FROM product_types WHERE id = \?/);
});

test("invalid IDs and blank, malformed or oversized names never reach the database", async () => {
  const handlers = createProductTypeHandlers({ query() { assert.fail("Invalid request reached the database"); } });
  for (const id of [undefined, "0", "-1", "1.2", "7 OR 1=1", "9007199254740992"]) {
    for (const handler of Object.values(handlers)) {
      // Pass params directly so undefined is not replaced by the helper default.
      const result = await new Promise((resolve) => handler({ params: { id }, body: { productType: "Ticket" } }, {
        status(code) { this.code = code; return this; }, json(data) { resolve({ code: this.code, ...data }); },
      }));
      assert.equal(result.code, 400);
    }
  }
  for (const body of [null, {}, { productType: "   " }, { productType: 1 }, { productType: [] }, { productType: "x".repeat(257) }]) {
    assert.equal((await invoke(handlers.updateProductType, "7", body)).code, 400);
  }
});

test("missing product types return not found for reads, edits and deletes", async () => {
  const handlers = createProductTypeHandlers({ query(sql, values, callback) {
    callback(null, sql.startsWith("SELECT") ? [] : { affectedRows: 0 });
  } });
  for (const handler of Object.values(handlers)) {
    const result = await invoke(handler, "7", { productType: "Admission" });
    assert.equal(result.code, 404);
    assert.equal(result.Status, false);
  }
});

test("duplicate and referenced types report conflicts while unexpected database failures remain generic", async () => {
  for (const [code, expectedCode, message] of [
    ["ER_DUP_ENTRY", 409, /already exists/i],
    ["ER_ROW_IS_REFERENCED_2", 409, /used by products/i],
    ["ER_ROW_IS_REFERENCED", 409, /used by products/i],
    ["ER_CONNECTION_LOST", 500, /failed/i],
  ]) {
    const handlers = createProductTypeHandlers({ query(sql, values, callback) { callback({ code, sqlMessage: "private database details" }); } });
    for (const handler of [handlers.updateProductType, handlers.deleteProductType]) {
      const result = await invoke(handler, "7", { productType: "Admission" });
      assert.equal(result.code, expectedCode);
      assert.equal(result.Status, false);
      assert.match(result.Error, message);
      assert.doesNotMatch(result.Error, /private database/);
    }
  }
});
