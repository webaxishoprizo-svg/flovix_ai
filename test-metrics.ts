import { syncMetrics } from "./src/lib/metrics.functions.ts";

async function run() {
  try {
    console.log("Calling syncMetrics...");
    const res = await syncMetrics({ data: { shop: "mock-store.myshopify.com" } });
    console.log("Sync response:", res);
  } catch (e) {
    console.error("Sync error:", e);
  }
}

run();
