// Thin wrapper around Shopify Admin REST calls.
import { SHOPIFY_API_VERSION } from "./config.server";

export async function shopifyGet<T>(
  shop: string,
  accessToken: string,
  path: string,
): Promise<T> {
  const res = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}${path}`,
    { headers: { "X-Shopify-Access-Token": accessToken, Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Shopify GET ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export async function shopifyPost<T>(
  shop: string,
  accessToken: string,
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}${path}`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`Shopify POST ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export interface ShopInfo {
  shop: {
    id: number;
    name: string;
    email: string;
    domain: string;
    myshopify_domain: string;
    country_code: string;
    currency: string;
    plan_name: string;
  };
}

export interface ThemeInfo {
  id: number;
  name: string;
  role: string; // 'main' | 'unpublished' | 'demo'
}

export async function fetchShopInfo(shop: string, token: string) {
  return shopifyGet<ShopInfo>(shop, token, "/shop.json");
}

export async function listThemes(shop: string, token: string) {
  return shopifyGet<{ themes: ThemeInfo[] }>(shop, token, "/themes.json");
}

/** Register mandatory GDPR + app/uninstalled webhooks. */
export async function registerWebhooks(shop: string, token: string, appUrl: string) {
  const topics = [
    "app/uninstalled",
    "shop/redact",
    "customers/redact",
    "customers/data_request",
    "orders/create",
    "orders/paid",
    "products/update",
    "shop/update",
  ];
  await Promise.all(
    topics.map((topic) =>
      shopifyPost(shop, token, "/webhooks.json", {
        webhook: {
          topic,
          address: `${appUrl}/api/public/shopify/webhooks/${topic.replace("/", ".")}`,
          format: "json",
        },
      }).catch((e) => console.warn(`webhook ${topic} register failed:`, e.message)),
    ),
  );
}
