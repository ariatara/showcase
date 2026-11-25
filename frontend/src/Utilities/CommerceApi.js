import { createContext, useContext } from "react";
import Axios from "axios";
import { ServerLocation } from "./Locations.js";

export const CommerceContext = createContext(null);
export function useCommerceContext() {
  const value = useContext(CommerceContext);
  if (!value) throw new Error("Member purchasing context is required.");
  return value;
}
export async function commerceRequest(path, { method = "GET", body, csrf, signal } = {}, client = Axios) {
  try {
    const response = await client.request({ url: ServerLocation(path), method, data: body, signal,
      withCredentials: true, headers: csrf ? { "X-Commerce-CSRF": csrf } : {} });
    if (!response.data.Status) throw new Error(response.data.Error || "Commerce request failed.");
    return response.data.Result;
  } catch (error) {
    error.status = error.response?.status || error.status;
    error.orderId = error.response?.data?.Result?.orderId;
    error.message = error.response?.data?.Error || error.message;
    throw error;
  }
}
export const usd = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
export function localReturn(value) {
  return typeof value === "string" && /^\/(?:events\/[^?#\\]+|shoppingArea|shoppingCheckout|orders\/[a-f0-9-]+)(?:\?[^\\#]*)?$/.test(value) &&
    ![...value].some((character) => character.charCodeAt(0) < 32) ? value : "";
}
export function paypalRedirect(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !["www.paypal.com", "www.sandbox.paypal.com", "sandbox.paypal.com"].includes(url.hostname)) {
    throw new Error("Invalid PayPal approval URL.");
  }
  return url.href;
}
