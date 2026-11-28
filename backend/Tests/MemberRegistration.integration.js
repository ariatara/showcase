import test from "node:test";
import assert from "node:assert/strict";
import Express from "express";
import CookieParser from "cookie-parser";
import JWToken from "jsonwebtoken";
import { SECRETS } from "../Configurations/Secrets.js";
import AuthenticateToken from "../Middlewares/TokenValidation.js";
import AuthorizeRoles from "../Middlewares/RoleAuthorization.js";
import { ROLES } from "../Configurations/Roles.js";
import { createMemberRegistrationHandler, createMemberReadHandler, createMemberUpdateHandler, createMemberDeleteHandler } from "../Controllers/MemberRegistration.js";
import { commerceDatabase, seedCommerce, mysqlEnabled } from "./CommerceFixtures.js";

async function fixture(t) {
  const { db, connect } = await commerceDatabase(t); await seedCommerce(db);
  await db.query("INSERT INTO accounts(id,first_name,last_name,account_email,account_password) VALUES(103,'New','Account','new@example.invalid','unused')");
  await db.query("INSERT INTO account_roles(account_email,account_role) VALUES('new@example.invalid','Non-member'),('one@example.invalid','Administrator')");
  const app = Express(); app.use(Express.json()); app.use(CookieParser());
  app.post("/registerMember", AuthenticateToken, AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER), createMemberRegistrationHandler(connect));
  app.get("/members/:id", AuthenticateToken, AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER), createMemberReadHandler(connect));
  app.put("/members/:id", AuthenticateToken, AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER), createMemberUpdateHandler(connect));
  app.delete("/members/:id", AuthenticateToken, AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER), createMemberDeleteHandler(connect));
  const server = await new Promise((resolve) => { const listening = app.listen(0, "127.0.0.1", () => resolve(listening)); });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = async (body, id = 101, email = "one@example.invalid", roles = ["Administrator"], method = "POST", memberId = 101) => {
    const token = JWToken.sign({ id, account_email: email, account_roles: roles }, SECRETS.SITEKEY);
    const path = method === "POST" ? "/registerMember" : `/members/${memberId}`;
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method, headers: { "Content-Type": "application/json", Cookie: `loginToken=${token}` }, body: method === "GET" ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  const body = { account_email: "new@example.invalid", first_name: " New ", last_name: " Member ",
    age_group: "18-45", member_email: "new-member@example.invalid", membership_category: "Adult" };
  const memberRequest = (method, memberId, details, id = 101, email = "one@example.invalid", roles = ["Member"]) => request(details, id, email, roles, method, memberId);
  return { db, request, body, memberRequest };
}

test("admin and account-holder registration create profiles while preserving a single Member role", { skip: !mysqlEnabled }, async (t) => {
  const { db, request, body } = await fixture(t);
  const saved = await request(body);
  assert.equal(saved.status, 200); assert.equal(saved.data.Status, true);
  const [[profile]] = await db.query("SELECT first_name,last_name,account_email FROM members WHERE id=?", [saved.data.Result.id]);
  assert.deepEqual(profile, { first_name: "New", last_name: "Member", account_email: body.account_email });
  assert.equal((await request({ ...body, member_email: "second-member@example.invalid" }, 103, body.account_email, ["Non-member"])).status, 200);
  const concurrent = await Promise.all(["third", "fourth"].map((name) => request({ ...body, member_email: `${name}@example.invalid` })));
  assert.ok(concurrent.every((result) => result.status === 200));
  assert.equal((await db.query("SELECT COUNT(*) AS count FROM account_roles WHERE account_email=? AND account_role='Member'", [body.account_email]))[0][0].count, 1);
  assert.equal((await db.query("SELECT COUNT(*) AS count FROM members WHERE account_email=?", [body.account_email]))[0][0].count, 4);
});

test("account holders update their saved member profile without changing ownership, membership date, ID or roles", { skip: !mysqlEnabled }, async (t) => {
  const { db, memberRequest } = await fixture(t);
  const original = (await memberRequest("GET", 101)).data.Result;
  assert.equal(original.member_email, "m1@example.invalid");
  const [roles] = await db.query("SELECT * FROM account_roles ORDER BY id");
  const update = { first_name: " Updated ", last_name: " Name ", age_group: "60+", member_email: "updated@example.invalid", membership_category: "Senior" };
  const saved = await memberRequest("PUT", 101, update);
  assert.equal(saved.status, 200); assert.equal(saved.data.Status, true);
  const reloaded = (await memberRequest("GET", 101)).data.Result;
  assert.deepEqual(reloaded, { ...original, ...update, first_name: "Updated", last_name: "Name" });
  const [[stored]] = await db.query("SELECT * FROM members WHERE id=101");
  assert.equal(stored.first_name, "Updated"); assert.equal(stored.member_email, update.member_email);
  assert.equal(stored.account_email, original.account_email);
  assert.deepEqual((await db.query("SELECT * FROM account_roles ORDER BY id"))[0], roles);
  assert.equal((await db.query("SELECT COUNT(*) AS count FROM members"))[0][0].count, 2);
  assert.equal((await memberRequest("PUT", 101, { ...update, first_name: "Updated", last_name: "Name" })).status, 200);
});

test("member editing denies foreign profiles, stale roles and invalid changes without modifying stored data", { skip: !mysqlEnabled }, async (t) => {
  const { db, memberRequest } = await fixture(t);
  const [before] = await db.query("SELECT * FROM members ORDER BY id");
  const update = { first_name: "Changed", last_name: "Member", age_group: "18-45", member_email: "changed@example.invalid", membership_category: "Adult" };
  for (const method of ["GET", "PUT", "DELETE"]) {
    assert.equal((await memberRequest(method, 102, update)).status, 404);
    assert.equal((await memberRequest(method, 999999, update)).status, 404);
    assert.equal((await memberRequest(method, 101, update, 101, "two@example.invalid")).status, 404);
  }
  const duplicate = await memberRequest("PUT", 101, { ...update, member_email: "m2@example.invalid" });
  assert.equal(duplicate.status, 409); assert.match(duplicate.data.Error, /already exists/);
  for (const invalid of [{ age_group: "unknown" }, { membership_category: "unknown" }, { account_email: "two@example.invalid" }, { membership_date: "2020-01-01" }]) {
    assert.equal((await memberRequest("PUT", 101, { ...update, ...invalid })).status, 400);
  }
  await db.query("DELETE FROM account_roles WHERE account_email='one@example.invalid'");
  assert.equal((await memberRequest("GET", 101)).status, 404);
  assert.equal((await memberRequest("PUT", 101, update)).status, 404);
  assert.equal((await memberRequest("DELETE", 101)).status, 404);
  assert.deepEqual((await db.query("SELECT * FROM members ORDER BY id"))[0], before);
});

test("duplicate profiles and invalid lookup values leave no new Member role or partial profile", { skip: !mysqlEnabled }, async (t) => {
  const { db, request, body } = await fixture(t);
  const duplicate = await request({ ...body, member_email: "m1@example.invalid" });
  assert.equal(duplicate.status, 409); assert.match(duplicate.data.Error, /already exists/);
  for (const invalid of [{ age_group: "unknown" }, { membership_category: "unknown" }]) {
    assert.equal((await request({ ...body, ...invalid })).status, 400);
  }
  assert.equal((await db.query("SELECT COUNT(*) AS count FROM account_roles WHERE account_email=? AND account_role='Member'", [body.account_email]))[0][0].count, 0);
  assert.equal((await db.query("SELECT COUNT(*) AS count FROM members WHERE account_email=?", [body.account_email]))[0][0].count, 0);
});

test("registration checks current administrator authority and account ownership, not claimed token roles", { skip: !mysqlEnabled }, async (t) => {
  const { db, request, body } = await fixture(t);
  assert.equal((await request(body, 102, "two@example.invalid", ["Administrator"])).status, 403);
  assert.equal((await request(body, 101, "wrong@example.invalid")).status, 403);
  await db.query("DELETE FROM account_roles WHERE account_email='one@example.invalid' AND account_role='Administrator'");
  assert.equal((await request(body)).status, 403);
  assert.equal((await request(body, 103, body.account_email, ["Non-member"])).status, 200);
});

test("deleting an owned member physically removes only that profile and preserves the account and roles", { skip: !mysqlEnabled }, async (t) => {
  const { db, memberRequest } = await fixture(t);
  const [accounts] = await db.query("SELECT id,account_email FROM accounts ORDER BY id");
  const [roles] = await db.query("SELECT * FROM account_roles ORDER BY id");
  const [otherMembers] = await db.query("SELECT * FROM members WHERE id<>101 ORDER BY id");
  const removed = await memberRequest("DELETE", 101);
  assert.equal(removed.status, 200); assert.equal(removed.data.Status, true);
  assert.deepEqual((await db.query("SELECT * FROM members ORDER BY id"))[0], otherMembers);
  assert.equal((await memberRequest("GET", 101)).status, 404);
  assert.equal((await memberRequest("DELETE", 101)).status, 404);
  assert.deepEqual((await db.query("SELECT id,account_email FROM accounts ORDER BY id"))[0], accounts);
  assert.deepEqual((await db.query("SELECT * FROM account_roles ORDER BY id"))[0], roles);
});

test("deleting a member linked to a cart or order leaves all related records intact", { skip: !mysqlEnabled }, async (t) => {
  const { db, memberRequest } = await fixture(t);
  await db.query("INSERT INTO commerce_carts(id,account_id) VALUES(101,101)");
  await db.query("INSERT INTO commerce_cart_items(cart_id,product_id,member_id,quantity,product_version) VALUES(101,101,101,1,1)");
  const cartConflict = await memberRequest("DELETE", 101);
  assert.equal(cartConflict.status, 409); assert.match(cartConflict.data.Error, /linked to a cart or order/);
  assert.equal((await db.query("SELECT COUNT(*) AS count FROM commerce_cart_items"))[0][0].count, 1);
  await db.query(`INSERT INTO commerce_orders(id,account_id,cart_version,status,subtotal_cents,discount_cents,fee_cents,total_cents,pricing,idempotency_key,payload_hash,expires_at)
    VALUES('member-delete-test',101,0,'paid',1025,0,0,1025,'{}','member-delete-test',REPEAT('a',64),DATE_ADD(NOW(),INTERVAL 1 HOUR))`);
  await db.query(`INSERT INTO commerce_order_items(order_id,product_id,event_id,member_id,cart_item_id,cart_item_version,product_version,quantity,unit_cents,snapshot)
    VALUES('member-delete-test',101,101,101,1,1,1,1,1025,'{}')`);
  await db.query("DELETE FROM commerce_cart_items WHERE cart_id=101");
  const orderConflict = await memberRequest("DELETE", 101);
  assert.equal(orderConflict.status, 409); assert.match(orderConflict.data.Error, /linked to a cart or order/);
  assert.equal((await memberRequest("GET", 101)).status, 200);
  assert.equal((await db.query("SELECT COUNT(*) AS count FROM commerce_orders"))[0][0].count, 1);
  assert.equal((await db.query("SELECT COUNT(*) AS count FROM commerce_order_items"))[0][0].count, 1);
});
