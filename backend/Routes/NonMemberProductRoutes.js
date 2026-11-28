import Express from "express";
import AuthenticateToken from "../Middlewares/TokenValidation.js";
import AuthorizeRoles from "../Middlewares/RoleAuthorization.js";
import { ROLES } from "../Configurations/Roles.js";
import { createNonMemberProductHandlers } from "../Controllers/NonMemberProductAccess.js";

export function createNonMemberProductRouter(db, connect) {
  const router = Express.Router();
  const handlers = createNonMemberProductHandlers(db, connect);
  router.use(AuthenticateToken, AuthorizeRoles(ROLES.ADMINISTRATOR));
  router.get("/:event_url", handlers.getProducts);
  router.put("/:event_url", handlers.saveProducts);
  return router;
}
