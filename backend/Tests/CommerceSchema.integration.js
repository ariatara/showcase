import test from "node:test";
import assert from "node:assert/strict";
import { commerceDatabase, mysqlEnabled, seedCommerce } from "./CommerceFixtures.js";

for (const upgrade of [false, true, "current"]) {
  test(`commerce schema ${upgrade === "current" ? "current-schema upgrade" : upgrade ? "pre-001 upgrade" : "fresh"} defaults and constraints`, { skip: !mysqlEnabled }, async (t) => {
    const { db } = await commerceDatabase(t, upgrade);
    await db.query("INSERT INTO events (page_title,url) VALUES ('Draft','draft')");
    const [[event]] = await db.query("SELECT view_template,published FROM events");
    assert.equal(event.view_template, "signature");
    assert.equal(event.published, 0);
    const [[settings]] = await db.query("SELECT * FROM commerce_settings");
    assert.equal(settings.fee_enabled, 0);
    await assert.rejects(db.query("UPDATE commerce_settings SET fee_basis_points = -1"));
    const [tables] = await db.query("SHOW TABLES LIKE 'commerce_%'");
    assert.equal(tables.length, 9);
    const [[column]] = await db.query("SHOW COLUMNS FROM member_products LIKE 'price'");
    assert.equal(column.Type, "decimal(12,2)");
  });
}

test("commerce migration preserves legacy prices and content, and rejects invalid legacy inventory", { skip: !mysqlEnabled }, async (t) => {
  const { db } = await commerceDatabase(t, "current", async (legacy) => {
    await seedCommerce(legacy);
    await legacy.query("UPDATE member_products SET price=123 WHERE id=101");
    await legacy.query("UPDATE events SET upper_hub_event_image_names='one.jpg,two.jpg',upper_hub_content='<h2>Retained</h2>' WHERE id=101");
  });
  const [[product]] = await db.query("SELECT price,inventory,active,version FROM member_products WHERE id=101");
  assert.deepEqual({ ...product }, { price: "123.00", inventory: 5, active: 1, version: 1 });
  const [[event]] = await db.query("SELECT view_template,upper_hub_event_image_names,upper_hub_content,published FROM events WHERE id=101");
  assert.equal(event.view_template, "signature"); assert.equal(event.published, 1);
  assert.equal(event.upper_hub_event_image_names, "one.jpg,two.jpg"); assert.equal(event.upper_hub_content, "<h2>Retained</h2>");
  await assert.rejects(commerceDatabase(t, "current", async (legacy) => {
    await seedCommerce(legacy);
    await legacy.query("UPDATE member_products SET inventory=-1 WHERE id=101");
  }), { code: "ER_CHECK_CONSTRAINT_VIOLATED" });
});
