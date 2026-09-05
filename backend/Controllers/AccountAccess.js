import DatastoreConnection from "../Utilities/Datastore.js";

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

export const registerMemberAccountAccess = (request, response) => {
  const SQLAccountRoleQuery =
    "INSERT INTO account_roles(account_email, account_role) VALUES (?)";

  const accountRoleDetails = [request.body.account_email, "Member"];

  const SQLRegisterMembershipQuery =
    "INSERT INTO members (account_email, first_name, last_name, age_group, member_email, membership_category) VALUES (?)";

  const membershipDetails = [
    request.body.account_email,
    request.body.first_name,
    request.body.last_name,
    request.body.age_group,
    request.body.member_email,
    request.body.membership_category,
  ];

  DatastoreConnection.query(
    SQLAccountRoleQuery,
    [accountRoleDetails],
    (error, result) => {
      if (error) {
        console.log("Member role assignment failed: " + error);

        return response.json({
          Status: false,
          Error: "Register member failed.",
        });
      }
    }
  );

  DatastoreConnection.query(
    SQLRegisterMembershipQuery,
    [membershipDetails],
    (error, result) => {
      if (error) {
        console.log("Register member failed: " + error);

        return response.json({
          Status: false,
          Error: "Register member failed.",
        });
      }
      return response.json({ Status: true });
    }
  );
};

export const getEventAccountAccess = (request, response) => {
  const id = request.params.id;

  const SQLQuery = "SELECT * FROM events WHERE id = ?";
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
