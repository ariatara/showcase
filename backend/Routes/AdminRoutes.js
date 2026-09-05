import Express from "express";
import AuthenticateToken from "../Middlewares/TokenValidation.js";
import AuthorizeRoles from "../Middlewares/RoleAuthorization.js";
import { ROLES } from "../Configurations/Roles.js";
import {
  accountAdminAccess,
  accountCountAdminAccess,
  accountRolesAdminAccess,
  addAccountRoleAdminAccess,
  addAgeGroupAdminAccess,
  addMembershipCategoryAdminAccess,
  addMembershipPriceAdminAccess,
  addProductTypeAdminAccess,
  addRoleTypeAdminAccess,
  adminCountAdminAccess,
  adminRecordsAdminAccess,
  ageGroupsAdminAccess,
  allAccountsAdminAccess,
  allMembersAdminAccess,
  createEventAdminAccess,
  createMemberProductsAdminAccess,
  createPageAdminAccess,
  deleteAccountRoleAdminAccess,
  deleteEventAdminAccess,
  deleteMemberProductsByEventAdminAccess,
  deletePageAdminAccess,
  editAccountAdminAccess,
  editMemberAdminAccess,
  getEventsAdminAccess,
  getMemberProductsAdminAccess,
  getPagesAdminAccess,
  logoutAdminAccess,
  memberAdminAccess,
  memberCountAdminAccess,
  membershipCategoriesAdminAccess,
  membershipPricesAdminAccess,
  productTypesAdminAccess,
  roleTypesAdminAccess,
  updateEventAdminAccess,
  updateMemberProductsByEventAdminAccess,
  uploadFileAdminAccess,
} from "../Controllers/AdminAccess.js";

const AdminRouter = Express.Router();

AdminRouter.post(
  "/addRoleType",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  addRoleTypeAdminAccess
);

AdminRouter.get(
  "/roleTypes",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  roleTypesAdminAccess
);

AdminRouter.post(
  "/addAgeGroup",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  addAgeGroupAdminAccess
);

AdminRouter.get(
  "/ageGroups",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  ageGroupsAdminAccess
);

AdminRouter.post(
  "/addMembershipCategory",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  addMembershipCategoryAdminAccess
);

AdminRouter.get(
  "/membershipCategories",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  membershipCategoriesAdminAccess
);

AdminRouter.post(
  "/addMembershipPrice",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  addMembershipPriceAdminAccess
);

AdminRouter.post(
  "/addProductType",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  addProductTypeAdminAccess
);

AdminRouter.get(
  "/productTypes",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  productTypesAdminAccess
);

AdminRouter.get(
  "/membershipPrices",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  membershipPricesAdminAccess
);

AdminRouter.get(
  "/accounts",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  allAccountsAdminAccess
);

AdminRouter.get(
  "/account/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  accountAdminAccess
);

AdminRouter.put(
  "/editAccount/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  editAccountAdminAccess
);

AdminRouter.get(
  "/accountRoles/:account_email",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  accountRolesAdminAccess
);

AdminRouter.post(
  "/addAccountRole",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  addAccountRoleAdminAccess
);

AdminRouter.delete(
  "/deleteAccountRole/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  deleteAccountRoleAdminAccess
);

AdminRouter.get(
  "/members",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  allMembersAdminAccess
);

AdminRouter.get(
  "/member/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  memberAdminAccess
);

AdminRouter.put(
  "/editMember/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  editMemberAdminAccess
);

AdminRouter.get(
  "/adminCount",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  adminCountAdminAccess
);

AdminRouter.get(
  "/accountCount",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  accountCountAdminAccess
);

AdminRouter.get(
  "/memberCount",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  memberCountAdminAccess
);

AdminRouter.get(
  "/adminRecords",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  adminRecordsAdminAccess
);

AdminRouter.post(
  "/upload/:fieldName",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  uploadFileAdminAccess
);

AdminRouter.get(
  "/events",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  getEventsAdminAccess
);

AdminRouter.post(
  "/events",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  createEventAdminAccess
);

AdminRouter.put(
  "/events/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  updateEventAdminAccess
);

AdminRouter.delete(
  "/events/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  deleteEventAdminAccess
);

AdminRouter.get(
  "/pages/",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  getPagesAdminAccess
);

AdminRouter.post(
  "/pages/",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  createPageAdminAccess
);

AdminRouter.put(
  "/pages/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  updateEventAdminAccess // Assuming this is the correct handler for updating pages
)

AdminRouter.delete(
  "/pages/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  deletePageAdminAccess
)

AdminRouter.get(
  "/memberProducts/:event_url",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  getMemberProductsAdminAccess
);

AdminRouter.post(
  "/memberProducts",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  createMemberProductsAdminAccess
);

AdminRouter.put(
  "/memberProducts/:event_url",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  updateMemberProductsByEventAdminAccess
);

AdminRouter.delete(
  "/memberProducts/:event_url",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR),
  deleteMemberProductsByEventAdminAccess
);

AdminRouter.get("/logout", logoutAdminAccess);

export default AdminRouter;
