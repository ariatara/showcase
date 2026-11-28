import Express from "express";
import AuthenticateToken from "../Middlewares/TokenValidation.js";
import AuthorizeRoles from "../Middlewares/RoleAuthorization.js";
import { ROLES } from "../Configurations/Roles.js";
import {
  accountDetailsAccountAccess,
  accountMembersAccountAccess,
  ageGroupsAccountAccess,
  getEventAccountAccess,
  logoutAccountAccess,
  membershipCategoriesAccountAccess,
  registerMemberAccountAccess,
  getMemberAccountAccess,
  updateMemberAccountAccess,
  deleteMemberAccountAccess,
} from "../Controllers/AccountAccess.js";

const AccountRouter = Express.Router();

AccountRouter.get(
  "/ageGroups",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER),
  ageGroupsAccountAccess
);

AccountRouter.get(
  "/membershipCategories",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER),
  membershipCategoriesAccountAccess
);

AccountRouter.get(
  "/accountDetails/:account_email",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER),
  accountDetailsAccountAccess
);

AccountRouter.get(
  "/:account_email/accountMembers",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER),
  accountMembersAccountAccess
);

AccountRouter.post(
  "/registerMember",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER),
  registerMemberAccountAccess
);

AccountRouter.get(
  "/members/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER),
  getMemberAccountAccess
);

AccountRouter.put(
  "/members/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER),
  updateMemberAccountAccess
);

AccountRouter.delete(
  "/members/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER),
  deleteMemberAccountAccess
);

AccountRouter.get(
  "/event/:id",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER),
  getEventAccountAccess
);

AccountRouter.get(
  "/logout",
  AuthenticateToken,
  AuthorizeRoles(ROLES.ADMINISTRATOR, ROLES.MEMBER, ROLES.NONMEMBER),
  logoutAccountAccess
);

export default AccountRouter;
