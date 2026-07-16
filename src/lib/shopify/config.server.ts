// Server-only Shopify config. Never import from client code.

export const SHOPIFY_API_VERSION = "2024-10";

export const SHOPIFY_SCOPES = [
  "read_themes",
  "write_themes",
  "read_products",
  "read_content",
  "read_orders",
  "read_online_store_pages",
  "read_files",
  "write_files",
].join(",");

export function getShopifyConfig() {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      "Shopify credentials missing. Set SHOPIFY_API_KEY and SHOPIFY_API_SECRET.",
    );
  }
  return { apiKey, apiSecret };
}

/** Normalize any user input to the canonical myshopify.com domain. */
export function normalizeShopDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!s) return null;
  if (!s.endsWith(".myshopify.com")) {
    // allow bare "my-store" -> "my-store.myshopify.com"
    if (/^[a-z0-9][a-z0-9-]*$/.test(s)) s = `${s}.myshopify.com`;
    else return null;
  }
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s)) return null;
  return s;
}

export function getAppUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
