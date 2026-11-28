import { createHmac, timingSafeEqual } from "node:crypto";
import AuthenticateToken from "./TokenValidation.js";
import { SECRETS } from "../Configurations/Secrets.js";
import { CommerceError } from "../Utilities/CommerceMoney.js";

export const csrfToken = (request) => createHmac("sha256", SECRETS.SITEKEY).update(request.cookies.loginToken).digest("hex");

export function commerceFailure(response, error) {
  const status = error.status || (error.code === "ER_DUP_ENTRY" ? 409 : 500);
  if (status >= 500) console.error("Commerce request failed:", error.code || error.status || "internal_error");
  return response.status(status).json({ Status: false,
    Error: error.status ? error.message : status === 409 ? "This value already exists. Reload and retry." : "Commerce request failed. Please retry.",
    ...(error.orderId ? { Result: { orderId: error.orderId } } : {}) });
}

export function authorizeCommerce(store, config, role = "Member") {
  return [
    (request, response, next) => request.cookies?.loginToken ? AuthenticateToken(request, response, next) :
      response.status(401).json({ Status: false, Error: "Sign in to access member purchasing." }),
    async (request, response, next) => {
      try {
        if (!Number.isSafeInteger(request.principal?.id) || !request.principal.email) throw new CommerceError(401, "Sign in again.");
        const account = await store.transaction((db) => store.account(db, request.principal.id, role));
        if (account.account_email !== request.principal.email) throw new CommerceError(401, "Account identity changed. Sign in again.");
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
          const token = request.get("X-Commerce-CSRF");
          if (request.get("Origin") !== config.origin || !/^[a-f0-9]{64}$/.test(token || "") ||
              !timingSafeEqual(Buffer.from(token), Buffer.from(csrfToken(request)))) throw new CommerceError(403, "Request verification failed. Reload and retry.");
        }
        next();
      } catch (error) { commerceFailure(response, error); }
    },
  ];
}
