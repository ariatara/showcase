import Axios from "axios";
import { ServerLocation } from "./Locations.js";
import { prepareEventPayload, missingEventFields, completeProducts } from "./EventValidation.js";

export async function saveEvent({ details, products, nonMemberProducts, id }, client = Axios) {
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
  const collections = [{ rows: products, endpoint: "memberProducts", version: details.productsVersion ?? 1,
    receipt: "productReceipt", label: "Products", requiresTarget: true }];
  if (nonMemberProducts !== undefined) collections.push({ rows: nonMemberProducts, endpoint: "nonMemberProducts",
    version: details.nonMemberProductsVersion, receipt: "nonMemberProductReceipt", label: "Non-member products", requiresTarget: false });
  const warnings = [];
  for (const collection of collections) {
    if (!completeProducts(collection.rows, { requiresTarget: collection.requiresTarget })) {
      warnings.push(`Event saved. ${collection.label} were not saved; complete all product rows and save again.`);
      continue;
    }
    if (!id && collection.rows.length === 0) continue;
    const productPayload = collection.rows.map((product) => ({ ...product, eventURL: saved.url }));
    const options = { headers: { "X-Product-Version": collection.version } };
    try {
      const productResponse = !id && collection.requiresTarget
        ? await client.post(ServerLocation("/auth/memberProducts"), productPayload, options)
        : await client.put(ServerLocation(`/auth/${collection.endpoint}/${encodeURIComponent(saved.url)}`), productPayload, options);
      if (!productResponse.data.Status) throw new Error(productResponse.data.Error || "Product save failed.");
      if (productResponse.data.Result) result[collection.receipt] = productResponse.data.Result;
    } catch (error) {
      warnings.push(`Event saved, but ${collection.label.toLowerCase()} were not saved: ${error.response?.data?.Error || error.message}`);
    }
  }
  result.warning = warnings.join("\n");
  return result;
}
