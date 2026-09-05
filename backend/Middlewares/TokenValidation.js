import JWToken from "jsonwebtoken";
import { SECRETS } from "../Configurations/Secrets.js";

const AuthenticateToken = (request, response, next) => {
  const loginToken = request.cookies.loginToken;

  if (loginToken) {
    JWToken.verify(loginToken, SECRETS.SITEKEY, (error, decodedToken) => {
      if (error) {
        console.log("Token verification failed: " + error);

        return response
          .status(401)
          .json({ Status: false, Error: "Authentication failed." });
      } else {
        request.roles = decodedToken.account_roles;

        next();
      }
    });
  } else {
    console.log("Token not found.");

    return response
      .status(400)
      .json({ Status: false, Error: "Authentication failed." });
  }
};

export default AuthenticateToken;
