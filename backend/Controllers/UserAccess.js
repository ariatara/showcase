import JWToken from "jsonwebtoken";
import BCrypt from "bcrypt";
import { SECRETS } from "../Configurations/Secrets.js";
import DatastoreConnection from "../Utilities/Datastore.js";

export const createAccountUserAccess = (request, response) => {
  const SQLQuery =
    "INSERT INTO accounts (first_name, last_name, account_email, account_password) VALUES (?)";

  const SQLAccountRoleQuery =
    "INSERT INTO account_roles (account_email, account_role) VALUES (?)";

  BCrypt.hash(request.body.account_password, 10, (error, hash) => {
    if (error) {
      console.log("Hashing failed: " + error);

      return response.json({
        Status: false,
        Error: "Account password hashing failed.",
      });
    }

    const accountRoleDetails = [request.body.account_email, "Non-member"];

    const accountDetails = [
      request.body.first_name,
      request.body.last_name,
      request.body.account_email,
      hash,
    ];

    DatastoreConnection.query(SQLQuery, [accountDetails], (error, result) => {
      if (error) {
        console.log("Create account failed: " + error);

        return response.json({
          Status: false,
          Error: "Create account failed.",
        });
      }

      return response.json({ Status: true });
    });

    DatastoreConnection.query(
      SQLAccountRoleQuery,
      [accountRoleDetails],
      (error, result) => {
        if (error) {
          console.log("Non-member role assignment failed: " + error);

          return response.json({
            Status: false,
            Error: "Create account failed.",
          });
        }
      }
    );
  });
};

export const loginUserAccess = (request, response) => {
  const SQLAccountRolesQuery =
    "SELECT * FROM account_roles WHERE account_email = ?";

  DatastoreConnection.query(
    SQLAccountRolesQuery,
    [request.body.account_email],
    (error, result) => {
      if (error) {
        console.log("Account role fetch failed: " + error);

        return response.status(401).json({
          login_status: false,
          Error: "Login failed.",
        });
      }

      if (result.length === 0) {
        console.log("Roles not assigned.");

        return response.status(401).json({
          login_status: false,
          Error: "Login failed.",
        });
      }

      const accountRoles = result.map((accountRole) => accountRole.account_role);
      const SQLAccountQuery = "SELECT * FROM accounts WHERE account_email = ?";

      DatastoreConnection.query(
        SQLAccountQuery,
        [request.body.account_email],
        (accountError, accountResult) => {
          if (accountError) {
            console.log("Account fetch failed: " + accountError);

            return response.status(401).json({
              login_status: false,
              Error: "Login failed.",
            });
          }

          if (accountResult.length === 0) {
            console.log("Account not found.");

            return response.status(401).json({
              login_status: false,
              Error: "Login failed.",
            });
          }

          const account = accountResult[0];

          BCrypt.compare(
            request.body.account_password,
            account.account_password,
            (bcryptError, passwordMatches) => {
              if (bcryptError) {
                console.log("Password comparison failed: " + bcryptError);

                return response.status(403).json({
                  login_status: false,
                  Error: "Login failed.",
                });
              }

              if (!passwordMatches) {
                return response.status(403).json({
                  login_status: false,
                  Error: "Login failed.",
                });
              }

              JWToken.sign(
                {
                  id: account.id,
                  first_name: account.first_name,
                  last_name: account.last_name,
                  account_email: account.account_email,
                  account_roles: accountRoles,
                },
                SECRETS.SITEKEY,
                { expiresIn: "1h" },
                (tokenError, loginToken) => {
                  if (tokenError) {
                    console.log("Token creation failed: " + tokenError);

                    return response.status(500).json({
                      login_status: false,
                      Error: "Login failed.",
                    });
                  }

                  const decodedToken = JWToken.decode(loginToken);

                  response.cookie("loginToken", loginToken);

                  return response.json({
                    login_status: true,
                    id: account.id,
                    first_name: account.first_name,
                    last_name: account.last_name,
                    account_email: account.account_email,
                    account_roles: accountRoles,
                    login_expiry: decodedToken.exp,
                  });
                }
              );
            }
          );
        }
      );
    }
  );
};

export const viewEventUserAccess = (request, response) => {
  const url = request.params.event_url;

  const SQLQuery = "SELECT * FROM events WHERE url = ?";

  DatastoreConnection.query(SQLQuery, [url], (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get event failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const viewPageUserAccess = (request, response) => {
  const url = request.params.page_url;

  const SQLQuery = "SELECT * FROM pages WHERE url = ?";
  DatastoreConnection.query(SQLQuery, [url], (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get page failed.",
      });

    console.log(result);
    return response.json({ Status: true, Result: result });
  });
};
