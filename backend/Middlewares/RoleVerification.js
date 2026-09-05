import JWToken from "jsonwebtoken";
import { SECRETS } from "../Configurations/Secrets.js";

const VerifyRole = (request, response, next) => {
  const loginToken = request.cookies.loginToken;
  const account_role = request.params.account_role;

  if (loginToken) {
    JWToken.verify(loginToken, SECRETS.SITEKEY, (error, decodedToken) => {
      if (error) {
        console.log("Token verification failed: " + error);

        return response
          .status(401)
          .json({ Status: false, Error: "Authorization failed." });
      } else {
        if (!decodedToken.account_roles.includes(account_role)) {
          return response
            .status(403)
            .json({ Status: false, Error: "Access denied." });
        }

        next();
      }
    });
  } else {
    console.log("Token not found.");

    return response.status(400).json({ Status: false, Error: "User error." });
  }
};

export default VerifyRole;
