import Axios from "axios";
import { ServerLocation } from "./Locations.js";
import { prepareEventPayload, missingEventFields, completeProducts } from "./EventValidation.js";

export async function saveEvent({ details, products, id }, client = Axios) {
  const payload = prepareEventPayload(details);
  const missing = missingEventFields(payload);
  if (missing.length) throw new Error(`Complete the following fields: ${missing.join(", ")}.`);
  const response = id
    ? await client.put(ServerLocation(`/auth/events/${id}`), payload)
    : await client.post(ServerLocation("/auth/events"), payload);
  if (!response.data.Status) throw new Error(response.data.Error || "Event save failed.");
  const saved = response.data.Result;
  if (!saved?.id || !saved.url) throw new Error("Event save returned no ID or URL. Reload the event list before retrying.");
  const result = { id: saved.id, url: saved.url, warning: "" };
  if (!completeProducts(products)) {
    result.warning = "Event saved. Products were not saved; complete all product rows and save again.";
    return result;
  }
  if (!id && products.length === 0) return result;
  const productPayload = products.map((product) => ({ ...product, eventURL: saved.url }));
  try {
    const productResponse = id
      ? await client.put(ServerLocation(`/auth/memberProducts/${encodeURIComponent(saved.url)}`), productPayload)
      : await client.post(ServerLocation("/auth/memberProducts"), productPayload);
    if (!productResponse.data.Status) throw new Error(productResponse.data.Error || "Product save failed.");
  } catch (error) {
    result.warning = `Event saved, but products were not saved: ${error.response?.data?.Error || error.message}`;
  }
  return result;
}
