import DatastoreConnection from "../Utilities/Datastore.js";
import BCrypt from "bcrypt";

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

export const generatePasswordCode = (request, response) => {
  const accountEmail = request.body.account_email;
  const resetCode = Math.floor(100000 + Math.random() * 900000);
  const accountQuery =
    "SELECT account_email, account_password FROM accounts WHERE account_email = ?";

  DatastoreConnection.query(accountQuery, [accountEmail], (error, result) => {
    if (error) {
      console.log("Account lookup for password reset failed: " + error);
      return response.json({
        Status: false,
        Error: "Password reset request failed.",
      });
    }

    if (result.length === 0) {
      return response.json({
        Status: false,
        Error: "No account was found with that email address.",
      });
    }

    const resetQuery = `
      INSERT INTO password_reset
        (account_email, old_account_password, reset_code)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        old_account_password = VALUES(old_account_password),
        reset_code = VALUES(reset_code),
        expiry_date = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE)
    `;

    DatastoreConnection.query(
      resetQuery,
      [accountEmail, result[0].account_password, resetCode],
      (resetError) => {
        if (resetError) {
          console.log("Password reset code assignment failed: " + resetError);
          return response.json({
            Status: false,
            Error: "Password reset code generation failed.",
          });
        }

        return response.json({ Status: true, reset_code: resetCode });
      }
    );
  });
};

export const verifyPasswordCode = (request, response) => {
  const { account_email: accountEmail, reset_code: resetCode } = request.body;
  const query =
    "SELECT id FROM password_reset WHERE account_email = ? AND reset_code = ? AND expiry_date > CURRENT_TIMESTAMP";

  DatastoreConnection.query(query, [accountEmail, resetCode], (error, result) => {
    if (error) {
      return response.json({ Status: false, Error: "Code verification failed." });
    }

    return response.json({
      Status: result.length > 0,
      Error: result.length > 0 ? undefined : "The reset code is invalid or expired.",
    });
  });
};

export const resetAccountPassword = (request, response) => {
  const {
    account_email: accountEmail,
    reset_code: resetCode,
    account_password: accountPassword,
  } = request.body;
  const query =
    "SELECT id FROM password_reset WHERE account_email = ? AND reset_code = ? AND expiry_date > CURRENT_TIMESTAMP";

  DatastoreConnection.query(query, [accountEmail, resetCode], (error, result) => {
    if (error || result.length === 0) {
      return response.json({
        Status: false,
        Error: "The reset code is invalid or expired.",
      });
    }

    BCrypt.hash(accountPassword, 10, (hashError, hash) => {
      if (hashError) {
        return response.json({ Status: false, Error: "Password update failed." });
      }

      DatastoreConnection.query(
        "UPDATE accounts SET account_password = ? WHERE account_email = ?",
        [hash, accountEmail],
        (updateError) => {
          if (updateError) {
            return response.json({ Status: false, Error: "Password update failed." });
          }

          DatastoreConnection.query(
            "DELETE FROM password_reset WHERE account_email = ?",
            [accountEmail],
            (deleteError) => {
              if (deleteError) {
                return response.json({ Status: false, Error: "Password update failed." });
              }
              return response.json({ Status: true });
            }
          );
        }
      );
    });
  });
};
