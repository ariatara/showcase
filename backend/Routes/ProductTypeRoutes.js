import Express from "express";
import AuthenticateToken from "../Middlewares/TokenValidation.js";
import AuthorizeRoles from "../Middlewares/RoleAuthorization.js";
import { ROLES } from "../Configurations/Roles.js";
import { createProductTypeHandlers } from "../Controllers/ProductTypeAccess.js";

export function createProductTypeRouter(db) {
  const router = Express.Router();
  const handlers = createProductTypeHandlers(db);
  router.use(AuthenticateToken, AuthorizeRoles(ROLES.ADMINISTRATOR));
  router.get("/:id", handlers.getProductType);
  router.put("/:id", handlers.updateProductType);
  router.delete("/:id", handlers.deleteProductType);
  return router;
}
