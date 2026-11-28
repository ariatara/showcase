import test from "node:test";
import assert from "node:assert/strict";
import { createMemberRegistrationHandler, createMemberReadHandler, createMemberUpdateHandler, createMemberDeleteHandler } from "../Controllers/MemberRegistration.js";

const member = { account_email: "account@example.test", first_name: "Test", last_name: "Member",
  age_group: "18-45", member_email: "person@example.test", membership_category: "Adult" };
const principal = { id: 1, email: member.account_email };

async function invoke(handler, body, identity = principal, id = "101") {
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; } };
  await handler({ body, principal: identity, params: { id } }, response);
  return response;
}

test("registration rejects missing identity and invalid profile fields before opening a connection", async () => {
  const handler = createMemberRegistrationHandler(() => assert.fail("Invalid registration must not connect"));
  assert.equal((await invoke(handler, member, null)).statusCode, 401);
  for (const input of [null, [], { ...member, first_name: " " }, { ...member, last_name: "x".repeat(129) },
    { ...member, member_email: "not-an-email" }, { ...member, account_email: "not-an-email" },
    { ...member, age_group: "" }, { ...member, membership_category: "" }]) {
    const result = await invoke(handler, input);
    assert.equal(result.statusCode, 400);
    assert.equal(result.data.Status, false);
  }
});

test("member operations reject invalid identities, IDs and protected fields before accessing storage", async () => {
  const connect = () => assert.fail("Invalid edit must not connect");
  const read = createMemberReadHandler(connect), update = createMemberUpdateHandler(connect);
  const profile = { ...member }; delete profile.account_email;
  for (const handler of [read, update, createMemberDeleteHandler(connect)]) {
    assert.equal((await invoke(handler, profile, null)).statusCode, 401);
    for (const id of ["0", "-1", "1.5", "101extra", "1e2", "", "9007199254740992"]) {
      assert.equal((await invoke(handler, profile, principal, id)).statusCode, 400);
    }
  }
  for (const body of [null, [], { ...profile, first_name: " " }, { ...profile, member_email: "invalid" },
    { ...profile, account_email: "other@example.test" }, { ...profile, id: 102 }, { ...profile, membership_date: "2020-01-01" }]) {
    assert.equal((await invoke(update, body)).statusCode, 400);
  }
});

test("registration reports connection failure instead of returning success", async () => {
  const handler = createMemberRegistrationHandler(async () => { throw Object.assign(new Error("Unavailable"), { code: "ECONNREFUSED" }); });
  const result = await invoke(handler, member);
  assert.equal(result.statusCode, 500);
  assert.equal(result.data.Status, false);
  assert.equal(result.data.Error, "Unable to register member. Please try again.");
});

test("registration rolls back storage failures and does not misreport a committed save when closing fails", async () => {
  for (const stage of ["commit", "end"]) {
    const calls = [];
    const results = [[[ { id: principal.id, account_email: principal.email } ]], [[{ account_role: "Member" }]],
      [[{ age_valid: 1, category_valid: 1 }]], [{ affectedRows: 0 }], [{ insertId: 42 }]];
    const db = { query: async () => results.shift() };
    for (const method of ["beginTransaction", "commit", "rollback", "end"]) db[method] = async () => {
      calls.push(method);
      if (method === stage) throw Object.assign(new Error("Storage failure"), { code: "TEST_STORAGE_FAILURE" });
    };
    const result = await invoke(createMemberRegistrationHandler(async () => db), member);
    assert.deepEqual(calls, stage === "commit" ? ["beginTransaction", "commit", "rollback", "end"] : ["beginTransaction", "commit", "end"]);
    assert.equal(result.data.Status, stage === "end");
    if (stage === "end") assert.equal(result.data.Result.id, 42);
  }
});

test("member deletion rolls back failures and reports linked records without claiming success", async () => {
  for (const code of ["ER_ROW_IS_REFERENCED_2", "ECONNRESET"]) {
    const calls = [];
    const db = { query: async (sql) => {
      if (sql.startsWith("DELETE")) throw Object.assign(new Error("Database failure"), { code });
      return [[{ id: 101, account_email: principal.email }]];
    } };
    for (const method of ["beginTransaction", "commit", "rollback", "end"]) db[method] = async () => { calls.push(method); };
    const result = await invoke(createMemberDeleteHandler(async () => db));
    assert.deepEqual(calls, ["beginTransaction", "rollback", "end"]);
    assert.equal(result.data.Status, false);
    assert.equal(result.statusCode, code === "ER_ROW_IS_REFERENCED_2" ? 409 : 500);
    assert.equal(result.data.Error, code === "ER_ROW_IS_REFERENCED_2" ? "This member is linked to a cart or order and cannot be deleted." : "Unable to delete member. Please try again.");
  }
});
