import Express from "express";
import Cors from "cors";
import CookieParser from "cookie-parser";
import DotEnv from "dotenv";
import Morgan from "morgan";
import AdminRouter from "./Routes/AdminRoutes.js";
import AccountRouter from "./Routes/AccountRoutes.js";
import UserRouter from "./Routes/UserRoutes.js";
import VerifyRole from "./Middlewares/RoleVerification.js";

DotEnv.config();

const adminRouteVersion = process.env.ADMIN_API_VERSION;
const accountRouteVersion = process.env.ACCOUNT_ROUTE_VERSION;
const memberRouteVersion = process.env.MEMBER_ROUTE_VERSION;
const userRouteVersion = process.env.USER_ROUTE_VERSION;

const Server = Express();

Server.use(
  Cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
Server.use(Express.json());
Server.use(CookieParser());
Server.use(Morgan("tiny"));

Server.use("/user", UserRouter);
Server.use("/auth", AdminRouter);
Server.use("/account", AccountRouter);
Server.use(Express.static("Public"));

Server.get("/verifyRole/:account_role", VerifyRole, (request, response) => {
  return response.status(200).json({ Status: true });
});

Server.listen(3000, () => {
  console.log("Server is running.");
});
