import test from "node:test";
import assert from "node:assert/strict";
import { createNonMemberProductHandlers } from "../Controllers/NonMemberProductAccess.js";

function response() {
  return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test("non-member reads report missing schema and retain empty-list collection versions", () => {
  const output = response();
  createNonMemberProductHandlers({ query(sql, values, callback) {
    assert.deepEqual(values, ["fair"]);
    callback({ code: "ER_BAD_FIELD_ERROR" });
  } }).getProducts({ params: { event_url: "fair" } }, output);
  assert.equal(output.code, 500);
  assert.match(output.body.Error, /004_non_member_product_editing/);
  const empty = response();
  createNonMemberProductHandlers({ query(sql, values, callback) { callback(null, [{ id: null, collection_version: 5 }]); } })
    .getProducts({ params: { event_url: "fair" } }, empty);
  assert.deepEqual(empty.body, { Status: true, Result: [], Version: 5 });
});

test("non-member connection failure produces an explicit error, not an unhandled request", async () => {
  const handlers = createNonMemberProductHandlers({}, () => { throw new Error("Cannot connect"); });
  const output = response();
  await handlers.saveProducts({ get: () => "1", params: { event_url: "fair" }, body: [] }, output);
  assert.equal(output.code, 500);
  assert.equal(output.body.Status, false);
});

test("a connection close failure does not misrepresent a committed non-member save", async () => {
  const db = {
    async beginTransaction() { return true; },
    async query(sql) {
      if (sql.startsWith("SELECT id, non_member_products_version")) return [[{ id: 1, non_member_products_version: 1 }]];
      return [[]];
    },
    async commit() { return true; },
    async rollback() { assert.fail("Unexpected rollback"); },
    async end() { throw Object.assign(new Error("Connection close failed"), { code: "TEST_CLOSE_FAILURE" }); },
  };
  const handlers = createNonMemberProductHandlers({}, () => ({ promise: () => db }));
  const output = response();
  await handlers.saveProducts({ get: () => "1", params: { event_url: "fair" }, body: [] }, output);
  assert.equal(output.body.Status, true);
  assert.equal(output.body.Result.version, 2);
});
