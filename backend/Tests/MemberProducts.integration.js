import test from "node:test";
import assert from "node:assert/strict";
import { commerceDatabase, mysqlEnabled, seedCommerce } from "./CommerceFixtures.js";
import { replaceMemberProducts } from "../Utilities/MemberProductWrites.js";

test("product saves preserve identity, cents, collection versions and retirement", { skip: !mysqlEnabled }, async (t) => {
  const { db } = await commerceDatabase(t);
  await seedCommerce(db);
  const product = { productId: 101, version: 1, productName: "Updated ticket", productType: "Ticket",
    productTarget: "Adult", productPrice: "10.01", productInventory: 0, eventDate: "2026-04-01" };
  const saved = await replaceMemberProducts(db, "first", [product], 1);
  assert.equal(saved.products[0].productId, 101);
  assert.equal(saved.products[0].version, 2);
  assert.equal(saved.version, 2);
  await assert.rejects(replaceMemberProducts(db, "first", [product], 1), { status: 409 });
  await assert.rejects(replaceMemberProducts(db, "second", [saved.products[0]], 1), { status: 409 });
  await replaceMemberProducts(db, "first", [], 2);
  const [[stored]] = await db.query("SELECT * FROM member_products WHERE id=101");
  assert.equal(stored.active, 0);
  assert.equal(stored.price, "10.01");
  assert.equal(stored.inventory, 0);
});
