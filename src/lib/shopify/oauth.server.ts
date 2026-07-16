// OAuth helpers: HMAC verification, nonce, code -> access token.
import { getShopifyConfig, SHOPIFY_SCOPES, normalizeShopDomain } from "./config.server";
import { safeEqual } from "./crypto.server";

const ENC = new TextEncoder();

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    ENC.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, ENC.encode(message)));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verify Shopify OAuth callback query-string HMAC. */
export async function verifyOAuthHmac(url: URL): Promise<boolean> {
  const { apiSecret } = getShopifyConfig();
  const hmac = url.searchParams.get("hmac");
  if (!hmac) return false;
  const params: [string, string][] = [];
  for (const [k, v] of url.searchParams.entries()) {
    if (k === "hmac" || k === "signature") continue;
    params.push([k, v]);
  }
  params.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const message = params.map(([k, v]) => `${k}=${v}`).join("&");
  const expected = await hmacSha256Hex(apiSecret, message);
  return safeEqual(hmac, expected);
}

/** Verify Shopify webhook HMAC (base64 of raw body). */
export async function verifyWebhookHmac(
  headerHmacB64: string | null,
  rawBody: string,
): Promise<boolean> {
  if (!headerHmacB64) return false;
  const { apiSecret } = getShopifyConfig();
  const key = await crypto.subtle.importKey(
    "raw",
    ENC.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, ENC.encode(rawBody)));
  let bin = "";
  for (const b of sig) bin += String.fromCharCode(b);
  const expected = btoa(bin);
  return safeEqual(headerHmacB64, expected);
}

export function buildAuthorizeUrl(shop: string, appUrl: string, state: string) {
  const { apiKey } = getShopifyConfig();
  const redirectUri = `${appUrl}/api/public/shopify/callback`;
  const params = new URLSearchParams({
    client_id: apiKey,
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
    "grant_options[]": "",
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(shop: string, code: string): Promise<{
  access_token: string;
  scope: string;
}> {
  const { apiKey, apiSecret } = getShopifyConfig();
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: apiKey, client_secret: apiSecret, code }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; scope: string }>;
}

/** Cryptographically strong nonce. */
export function newNonce(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export { normalizeShopDomain };
