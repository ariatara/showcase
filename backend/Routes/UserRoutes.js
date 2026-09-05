import Express from "express";
import {
  createAccountUserAccess,
  loginUserAccess,
  viewEventUserAccess,
  viewPageUserAccess,
} from "../Controllers/UserAccess.js";

const UserRouter = Express.Router();

UserRouter.get("/events/:event_url", viewEventUserAccess);

UserRouter.get("/pages/:page_url", viewPageUserAccess);

UserRouter.post("/createAccount", createAccountUserAccess);

UserRouter.post("/", loginUserAccess);

export default UserRouter;
