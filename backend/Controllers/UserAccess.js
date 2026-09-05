import JWToken from "jsonwebtoken";
import BCrypt from "bcrypt";
import { SECRETS } from "../Configurations/Secrets.js";
import DatastoreConnection from "../Utilities/Datastore.js";
import { response } from "express";

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

  const accountRoles = [];

  DatastoreConnection.query(
    SQLAccountRolesQuery,
    [request.body.account_email],
    (error, result) => {
      if (error) {
        console.log("Roles missing:" + error);

        return response.status(401).json({
          loginStatus: false,
          Error: `Login failed.`,
        });
      }

      if (result.length > 0) {
        for (let i = 0; i < result.length; i++) {
          accountRoles.push(result[i].account_role);
        }
      } else {
        console.log("Roles not assigned: " + error);

        return response.status(401).json({
          loginStatus: false,
          Error: `Login failed.`,
        });
      }
    }
  );

  const SQLAccountQuery = "SELECT * FROM accounts WHERE account_email = ?";

  DatastoreConnection.query(
    SQLAccountQuery,
    [request.body.account_email],
    (error, result) => {
      if (error) {
        console.log("Account fetch error: " + error);

        return response.status(401).json({
          loginStatus: false,
          Error: `Login failed.`,
        });
      }

      if (result.length > 0) {
        BCrypt.compare(
          request.body.account_password,
          result[0].account_password,
          (bcryptError, bcryptResult) => {
            if (bcryptError) {
              console.log("Password comparison failed: " + bcryptError);

              return response.status(403).json({
                loginStatus: false,
                Error: `Login failed.`,
              });
            }

            if (bcryptResult) {
              const loginToken = JWToken.sign(
                {
                  id: result[0].id,
                  first_name: result[0].first_name,
                  last_name: result[0].last_name,
                  account_email: result[0].account_email,
                  account_roles: accountRoles,
                },
                SECRETS.SITEKEY,
                {
                  expiresIn: "1h",
                }
              );
              response.cookie("loginToken", loginToken);

              JWToken.verify(
                loginToken,
                SECRETS.SITEKEY,
                (error, decodedToken) => {
                  if (error) {
                    console.log("Token decoding failed: " + error);

                    return response.json({
                      login_status: true,
                      id: result[0].id,
                      first_name: result[0].first_name,
                      last_name: result[0].last_name,
                      account_email: result[0].account_email,
                      account_roles: accountRoles,
                      login_expiry: Math.floor(Date.now() / 1000),
                    });
                  } else {
                    decodedToken.account_roles;

                    return response.json({
                      login_status: true,
                      id: decodedToken.id,
                      first_name: decodedToken.first_name,
                      last_name: decodedToken.last_name,
                      account_email: decodedToken.account_email,
                      account_roles: accountRoles,
                      login_expiry: decodedToken.exp,
                    });
                  }
                }
              );
            }
          }
        );
      } else {
        console.log("Account fetch failed: " + error);

        return response.status(401).json({
          loginStatus: false,
          Error: `Login failed.`,
        });
      }
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
