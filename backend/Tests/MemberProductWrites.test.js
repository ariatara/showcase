import test from "node:test";
import assert from "node:assert/strict";
import { replaceMemberProducts, replaceNonMemberProducts } from "../Utilities/MemberProductWrites.js";
import { validateNonMemberProducts } from "../Utilities/MemberProductValidation.js";

test("non-member products validate shared fields without a membership target", () => {
  const product = { productName: "Guest ticket", productType: "Ticket", productPrice: "12.75",
    productInventory: 0, eventDate: "2026-12-01" };
  assert.equal(validateNonMemberProducts([product])[0].productPrice, "12.75");
  for (const patch of [{ productPrice: "1.001" }, { productInventory: -1 }, { productName: "" },
    { eventDate: "2026-02-30" }, { productImage: "../file.png" }, { productId: 1, version: 0 }]) {
    assert.throws(() => validateNonMemberProducts([{ ...product, ...patch }]));
  }
  assert.throws(() => validateNonMemberProducts(null));
});

test("non-member writes use their own table and collection version, retaining product IDs", async () => {
  const queries = [];
  const db = {
    async beginTransaction() { queries.push("BEGIN"); },
    async query(sql, values) {
      queries.push(sql);
      if (sql.startsWith("SELECT id, non_member_products_version")) return [[{ id: 7, non_member_products_version: 3 }]];
      if (sql.startsWith("SELECT id, version")) return [[]];
      if (sql.startsWith("INSERT")) {
        assert.equal(values[5], "fair");
        return [{ insertId: 55 }];
      }
      return [{ affectedRows: 1 }];
    },
    async commit() { queries.push("COMMIT"); },
    async rollback() { assert.fail("Unexpected rollback"); },
  };
  const result = await replaceNonMemberProducts(db, "fair", [{ productName: "Guest ticket", productType: "Ticket",
    productPrice: "12.75", productInventory: 5, eventDate: "2026-12-01", eventURL: "untrusted" }], "3");
  assert.equal(result.version, 4);
  assert.equal(result.products[0].productId, 55);
  assert.equal(result.products[0].version, 1);
  assert.ok(queries.some((sql) => sql.startsWith("INSERT INTO non_member_products")));
  assert.ok(queries.some((sql) => sql.startsWith("UPDATE non_member_products SET active")));
  assert.ok(queries.every((sql) => !/\bmember_products\b|commerce_reservations/.test(sql)));
  assert.equal(queries.at(-1), "COMMIT");
});

test("replaceMemberProducts retires all products on an explicit empty list without an empty INSERT", async () => {
  const queries = [];
  const db = {
    async beginTransaction() { queries.push("BEGIN"); },
    async query(sql) { queries.push(sql); return [[{ id: 1 }]]; },
    async commit() { queries.push("COMMIT"); },
    async rollback() { assert.fail("Must not roll back success"); },
  };
  assert.deepEqual((await replaceMemberProducts(db, "fair", [])).products, []);
  assert.ok(queries.some((sql) => sql.startsWith("UPDATE member_products SET active")));
  assert.ok(!queries.some((sql) => sql.startsWith("DELETE")));
  assert.ok(!queries.some((sql) => sql.startsWith("INSERT")));
  assert.equal(queries.at(-1), "COMMIT");
});

test("replaceMemberProducts rolls back a failed replacement and ignores client event associations", async () => {
  let rolledBack = false;
  const db = {
    async beginTransaction() { return true; },
    async query(sql, values) {
      if (sql.startsWith("INSERT")) {
        assert.equal(values[6], "fair");
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
