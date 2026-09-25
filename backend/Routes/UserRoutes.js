import Express from "express";
import {
  createAccountUserAccess,
  loginUserAccess,
  viewEventUserAccess,
  viewPageUserAccess,
} from "../Controllers/UserAccess.js";
import {
  generatePasswordCode,
  resetAccountPassword,
  verifyPasswordCode,
} from "../Controllers/AccountAccess.js";

const UserRouter = Express.Router();

UserRouter.get("/events/:event_url", viewEventUserAccess);

UserRouter.get("/pages/:page_url", viewPageUserAccess);

UserRouter.post("/createAccount", createAccountUserAccess);

UserRouter.post("/requestPasswordReset", generatePasswordCode);

UserRouter.post("/verifyPasswordCode", verifyPasswordCode);

UserRouter.post("/resetPassword", resetAccountPassword);

UserRouter.post("/", loginUserAccess);

export default UserRouter;
