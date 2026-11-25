import Express from "express";
import Cors from "cors";
import CookieParser from "cookie-parser";
import DotEnv from "dotenv";
import Morgan from "morgan";
import AdminRouter from "./Routes/AdminRoutes.js";
import AccountRouter from "./Routes/AccountRoutes.js";
import UserRouter from "./Routes/UserRoutes.js";
import VerifyRole from "./Middlewares/RoleVerification.js";
import { PublicDirectory } from "./Utilities/FileUpload.js";
import { createDatastoreConnection } from "./Utilities/Datastore.js";
import { CommerceStore } from "./Utilities/CommerceStore.js";
import { OrderService } from "./Utilities/OrderService.js";
import { PayPalClient } from "./Services/PayPalClient.js";
import { commerceConfig } from "./Configurations/Commerce.js";
import { commerceRouters } from "./Routes/CommerceRoutes.js";

DotEnv.config();

const adminRouteVersion = process.env.ADMIN_API_VERSION;
const accountRouteVersion = process.env.ACCOUNT_ROUTE_VERSION;
const memberRouteVersion = process.env.MEMBER_ROUTE_VERSION;
const userRouteVersion = process.env.USER_ROUTE_VERSION;

const Server = Express();
const commerce = commerceConfig();
const store = new CommerceStore(() => createDatastoreConnection().promise());
const commerceRoutes = commerceRouters(store, new OrderService(store, new PayPalClient(commerce)), commerce);

Server.use(
  Cors({
    origin: [commerce.origin],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
Server.use(CookieParser());
Server.use(Morgan("tiny"));
Server.use("/account/commerce", Express.json({ limit: "32kb" }), commerceRoutes.member);
Server.use("/auth/commerce", Express.json({ limit: "32kb" }), commerceRoutes.admin);
Server.use("/payments", Express.json({ limit: "256kb" }), commerceRoutes.payments);
Server.use(Express.json());

Server.use("/user", UserRouter);
Server.use("/auth", AdminRouter);
Server.use("/account", AccountRouter);
Server.use(Express.static(PublicDirectory));

Server.get("/verifyRole/:account_role", VerifyRole, (request, response) => {
  return response.status(200).json({ Status: true });
});

Server.listen(3000, () => {
  console.log("Server is running.");
});
