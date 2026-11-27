import DatastoreConnection, { createDatastoreConnection } from "../Utilities/Datastore.js";
import { createMemberRegistrationHandler, createMemberReadHandler, createMemberUpdateHandler, createMemberDeleteHandler } from "./MemberRegistration.js";

export const ageGroupsAccountAccess = (request, response) => {
  const SQLQuery = "SELECT * FROM age_groups";
  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get age groups failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const membershipCategoriesAccountAccess = (request, response) => {
  const SQLQuery = "SELECT * FROM membership_categories";
  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get membership categories failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const accountDetailsAccountAccess = (request, response) => {
  const account_email = request.params.account_email;

  const SQLQuery = "SELECT * FROM accounts WHERE account_email = ?";
  DatastoreConnection.query(SQLQuery, [account_email], (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get account details failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const accountMembersAccountAccess = (request, response) => {
  const account_email = request.params.account_email;

  const SQLQuery = "SELECT * FROM members WHERE account_email = ?";
  DatastoreConnection.query(SQLQuery, [account_email], (error, result) => {
    if (error) {
      console.log("Get account members failed: " + error);

      return response.json({
        Status: false,
        Error: "Get account members failed.",
      });
    }

    return response.json({ Status: true, Result: result });
  });
};

export const registerMemberAccountAccess = createMemberRegistrationHandler(() => createDatastoreConnection().promise());
export const getMemberAccountAccess = createMemberReadHandler(() => createDatastoreConnection().promise());
export const updateMemberAccountAccess = createMemberUpdateHandler(() => createDatastoreConnection().promise());
export const deleteMemberAccountAccess = createMemberDeleteHandler(() => createDatastoreConnection().promise());

export const getEventAccountAccess = (request, response) => {
  const id = request.params.id;

  const SQLQuery = "SELECT * FROM events WHERE id = ? AND published = TRUE";
  DatastoreConnection.query(SQLQuery, [id], (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get event failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const logoutAccountAccess = (request, response) => {
  response.clearCookie("loginToken");
  return response.json({ Status: true });
};
