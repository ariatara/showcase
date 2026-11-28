import "dotenv/config";
import DatastoreConnection, { createDatastoreConnection } from "../Utilities/Datastore.js";
import { CommerceStore } from "../Utilities/CommerceStore.js";
import { OrderService } from "../Utilities/OrderService.js";
import { PayPalClient } from "../Services/PayPalClient.js";
import { commerceConfig } from "../Configurations/Commerce.js";

const config = commerceConfig();
await new Promise((resolve, reject) => DatastoreConnection.end((error) => error ? reject(error) : resolve()));
if (!config.configured) {
  console.error("PayPal reconciliation requires configured credentials, merchant and webhook IDs.");
  process.exitCode = 1;
} else {
  const store = new CommerceStore(() => createDatastoreConnection().promise());
  const service = new OrderService(store, new PayPalClient(config));
  const shutdown = new AbortController();
  const stop = () => shutdown.abort();
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try {
    const results = await service.reconcile(Number(process.argv[2] || 20), { signal: shutdown.signal });
    console.log(JSON.stringify(results));
    if (results.some((row) => row.status === "reconciliation_required")) process.exitCode = 1;
  } catch (error) {
    console.error("Reconciliation failed:", error.code || error.status || "internal_error");
    process.exitCode = 1;
  } finally {
    process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop);
  }
}
