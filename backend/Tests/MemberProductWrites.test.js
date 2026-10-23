import test from "node:test";
import assert from "node:assert/strict";
import { replaceMemberProducts } from "../Utilities/MemberProductWrites.js";

test("replaceMemberProducts removes all products on an explicit empty list without an empty INSERT", async () => {
  const queries = [];
  const db = {
    async beginTransaction() { queries.push("BEGIN"); },
    async query(sql) { queries.push(sql); return [[{ id: 1 }]]; },
    async commit() { queries.push("COMMIT"); },
    async rollback() { assert.fail("Must not roll back success"); },
  };
  assert.equal(await replaceMemberProducts(db, "fair", []), 0);
  assert.ok(queries.some((sql) => sql.startsWith("DELETE")));
  assert.ok(!queries.some((sql) => sql.startsWith("INSERT")));
  assert.equal(queries.at(-1), "COMMIT");
});

test("replaceMemberProducts rolls back a failed replacement and ignores client event associations", async () => {
  let rolledBack = false;
  const db = {
    async beginTransaction() { return true; },
    async query(sql, values) {
      if (sql.startsWith("INSERT")) {
        assert.equal(values[0][0][6], "fair");
        throw new Error("Invalid product type");
      }
      return [[{ id: 1 }]];
    },
    async commit() { assert.fail("Must not commit a failed replacement"); },
    async rollback() { rolledBack = true; },
  };
  await assert.rejects(replaceMemberProducts(db, "fair", [{
    productName: "Ticket", productType: "Missing", productTarget: "Adult", productPrice: 5,
    productInventory: 1, eventDate: "2026-04-01", eventURL: "wrong_event",
  }]), /Invalid product type/);
  assert.equal(rolledBack, true);
});

test("replaceMemberProducts rejects a missing list before starting a transaction", async () => {
  await assert.rejects(replaceMemberProducts({}, "fair", null), /list/i);
});
