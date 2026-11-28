import { ROLES } from "../Configurations/Roles.js";

const failure = (status, message) => Object.assign(new Error(message), { status });
const editableFields = ["first_name", "last_name", "age_group", "member_email", "membership_category"];
const ownedMemberQuery = `SELECT m.id,m.account_email,m.first_name,m.last_name,m.age_group,m.member_email,m.membership_category,m.membership_date
  FROM members m JOIN accounts a ON a.account_email=m.account_email JOIN account_roles r ON r.account_email=a.account_email
  WHERE m.id=? AND a.id=? AND a.account_email=? AND r.account_role IN (?,?,?)`;

function requirePrincipal(principal) {
  if (!Number.isSafeInteger(principal?.id) || principal.id < 1 || typeof principal.email !== "string" || !principal.email.trim()) {
    throw failure(401, "Sign in to manage members.");
  }
  return principal;
}

function requireMemberId(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw failure(400, "Enter a valid member ID.");
  }
  return Number(value);
}

async function ownedMember(db, id, principal, lock = false) {
  const [[member]] = await db.query(ownedMemberQuery + (lock ? " FOR UPDATE" : ""),
    [id, principal.id, principal.email, ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER]);
  if (!member) throw failure(404, "Member not found or you do not have permission to access it.");
  return member;
}

function memberFailure(response, error, action) {
  const status = error.status || (["ER_DUP_ENTRY", "ER_ROW_IS_REFERENCED_2"].includes(error.code) ? 409 :
    error.code === "ER_NO_REFERENCED_ROW_2" ? 400 :
      ["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(error.code) ? 409 : 500);
  console.error(`Member ${action} failed:`, error.code || status);
  const message = error.status ? error.message : error.code === "ER_ROW_IS_REFERENCED_2" ? "This member is linked to a cart or order and cannot be deleted." :
    error.code === "ER_DUP_ENTRY" ? "A member with this email address already exists." :
    status === 400 ? "Member options changed. Reload and select a valid age group and membership category." :
      status === 409 ? "Another request changed this account. Please try again." : `Unable to ${action} member. Please try again.`;
  return response.status(status).json({ Status: false, Error: message });
}

async function closeConnection(db) {
  try { await db.end(); }
  catch (error) { console.error("Member connection close failed:", error.code || "UNKNOWN"); }
}

function validateMember(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw failure(400, "Member details are required.");
  const fields = { account_email: 128, first_name: 128, last_name: 128, age_group: 32, member_email: 128, membership_category: 64 };
  const member = {};
  for (const [field, limit] of Object.entries(fields)) {
    if (typeof input[field] !== "string" || !input[field].trim() || [...input[field].trim()].length > limit) {
      throw failure(400, `Enter a valid ${field.replaceAll("_", " ")} (maximum ${limit} characters).`);
    }
    member[field] = input[field].trim();
  }
  for (const field of ["account_email", "member_email"]) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member[field])) throw failure(400, "Enter a valid account and member email address.");
  }
  return member;
}

function createMemberWriteHandler(connect, update) {
  return async (request, response) => {
    try {
      const principal = requirePrincipal(request.principal);
      const id = update ? requireMemberId(request.params?.id) : undefined;
      if (update && (!request.body || typeof request.body !== "object" || Array.isArray(request.body) ||
        Object.keys(request.body).some((field) => !editableFields.includes(field)))) {
        throw failure(400, "Only member profile fields may be updated.");
      }
      const member = validateMember(update ? { ...request.body, account_email: principal.email } : request.body);
      const db = await connect();
      let memberId;
      try {
        await db.beginTransaction();
        let account;
        if (update) {
          account = await ownedMember(db, id, principal, true);
        } else {
          [[account]] = await db.query("SELECT id,account_email FROM accounts WHERE account_email=? FOR UPDATE", [member.account_email]);
          if (!account) throw failure(404, "Account not found.");
          const [roles] = await db.query(`SELECT r.account_role FROM account_roles r JOIN accounts a ON a.account_email=r.account_email
            WHERE a.id=? AND a.account_email=? FOR SHARE`, [principal.id, principal.email]);
          const allowed = roles.some((row) => [ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER].includes(row.account_role));
          if (!allowed || (account.id !== principal.id && !roles.some((row) => row.account_role === ROLES.ADMINISTRATOR))) {
            throw failure(403, "You may only register members for your own account unless you are an administrator.");
          }
        }
        const [[lookup]] = await db.query(`SELECT
          EXISTS(SELECT 1 FROM age_groups WHERE \`group\`=?) AS age_valid,
          EXISTS(SELECT 1 FROM membership_categories WHERE category=?) AS category_valid`, [member.age_group, member.membership_category]);
        if (!lookup.age_valid || !lookup.category_valid) throw failure(400, "Select a valid age group and membership category.");
        if (update) {
          await db.query(`UPDATE members SET first_name=?,last_name=?,age_group=?,member_email=?,membership_category=?
            WHERE id=? AND account_email=?`, [...editableFields.map((field) => member[field]), id, account.account_email]);
          memberId = id;
        } else {
          await db.query(`INSERT INTO account_roles(account_email,account_role) VALUES(?,?)
            ON DUPLICATE KEY UPDATE id=id`, [account.account_email, ROLES.MEMBER]);
          const [result] = await db.query(`INSERT INTO members(account_email,first_name,last_name,age_group,member_email,membership_category)
            VALUES(?,?,?,?,?,?)`, [account.account_email, ...editableFields.map((field) => member[field])]);
          memberId = result.insertId;
        }
        await db.commit();
      } catch (error) {
        try { await db.rollback(); }
        catch (rollbackError) { console.error("Member registration rollback failed:", rollbackError.code || "UNKNOWN"); }
        throw error;
      } finally {
        await closeConnection(db);
      }
      return response.json({ Status: true, Result: { id: memberId } });
    } catch (error) {
      return memberFailure(response, error, update ? "update" : "register");
    }

  };
}

export const createMemberRegistrationHandler = (connect) => createMemberWriteHandler(connect, false);
export const createMemberUpdateHandler = (connect) => createMemberWriteHandler(connect, true);

export function createMemberReadHandler(connect) {
  return async (request, response) => {
    try {
      const principal = requirePrincipal(request.principal);
      const id = requireMemberId(request.params?.id);
      const db = await connect();
      let member;
      try { member = await ownedMember(db, id, principal); }
      finally { await closeConnection(db); }
      return response.json({ Status: true, Result: member });
    } catch (error) { return memberFailure(response, error, "load"); }
  };
}

export function createMemberDeleteHandler(connect) {
  return async (request, response) => {
    try {
      const principal = requirePrincipal(request.principal);
      const id = requireMemberId(request.params?.id);
      const db = await connect();
      try {
        await db.beginTransaction();
        const member = await ownedMember(db, id, principal, true);
        const [result] = await db.query("DELETE FROM members WHERE id=? AND account_email=?", [id, member.account_email]);
        if (result.affectedRows !== 1) throw failure(404, "Member not found.");
        await db.commit();
      } catch (error) {
        try { await db.rollback(); }
        catch (rollbackError) { console.error("Member deletion rollback failed:", rollbackError.code || "UNKNOWN"); }
        throw error;
      } finally { await closeConnection(db); }
      return response.json({ Status: true, Result: { id } });
    } catch (error) { return memberFailure(response, error, "delete"); }
  };
}
