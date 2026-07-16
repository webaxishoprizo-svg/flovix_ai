// Shopify Theme Asset API + theme duplication.
import { SHOPIFY_API_VERSION } from "./config.server";

interface AssetListItem {
  key: string;
  content_type: string;
  size: number;
  updated_at: string;
}

interface AssetDetail {
  key: string;
  value?: string;
  attachment?: string; // base64 for binary
  content_type: string;
  size: number;
  updated_at: string;
}

const BINARY_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|mp3|pdf|zip)$/i;

export function isBinaryPath(p: string) {
  return BINARY_EXT.test(p);
}

async function req<T>(
  shop: string,
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}${path}`,
    {
      ...init,
      headers: {
        "X-Shopify-Access-Token": token,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Shopify ${init?.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export async function listAssets(shop: string, token: string, themeId: number) {

  const { assets } = await req<{ assets: AssetListItem[] }>(
    shop,
    token,
    `/themes/${themeId}/assets.json`,
  );
  return assets;
}

export async function getAsset(
  shop: string,
  token: string,
  themeId: number,
  key: string,
): Promise<AssetDetail> {

  const { asset } = await req<{ asset: AssetDetail }>(
    shop,
    token,
    `/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(key)}`,
  );
  return asset;
}

export async function putAsset(
  shop: string,
  token: string,
  themeId: number,
  key: string,
  value: string,
): Promise<AssetDetail> {

  const { asset } = await req<{ asset: AssetDetail }>(
    shop,
    token,
    `/themes/${themeId}/assets.json`,
    {
      method: "PUT",
      body: JSON.stringify({ asset: { key, value } }),
    },
  );
  return asset;
}

export async function deleteAsset(
  shop: string,
  token: string,
  themeId: number,
  key: string,
) {

  const res = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(key)}`,
    { method: "DELETE", headers: { "X-Shopify-Access-Token": token } },
  );
  if (!res.ok) throw new Error(`Delete asset failed: ${res.status}`);
}

/** Create a duplicate (unpublished) theme from an existing theme id. */
export async function duplicateTheme(
  shop: string,
  token: string,
  sourceThemeId: number,
  name: string,
): Promise<{ id: number; name: string; role: string }> {

  const { theme } = await req<{ theme: { id: number; name: string; role: string } }>(
    shop,
    token,
    "/themes.json",
    {
      method: "POST",
      body: JSON.stringify({
        theme: { name, role: "unpublished" },
      }),
    },
  );
  return theme;
}

/** Copy every asset from source theme -> destination theme. */
export async function copyAllAssets(
  shop: string,
  token: string,
  sourceThemeId: number,
  destThemeId: number,
  onProgress?: (done: number, total: number) => void,
) {
  const assets = await listAssets(shop, token, sourceThemeId);
  let done = 0;
  for (const a of assets) {
    try {
      const detail = await getAsset(shop, token, sourceThemeId, a.key);
      if (detail.value !== undefined) {
        await putAsset(shop, token, destThemeId, a.key, detail.value);
      } else if (detail.attachment) {
        // binary — put via attachment
        await req(shop, token, `/themes/${destThemeId}/assets.json`, {
          method: "PUT",
          body: JSON.stringify({
            asset: { key: a.key, attachment: detail.attachment },
          }),
        });
      }
    } catch (e) {
      console.warn(`copy ${a.key} failed:`, (e as Error).message);
    }
    done++;
    onProgress?.(done, assets.length);
  }
}

/** Publish (main-role) a theme. */
export async function publishTheme(shop: string, token: string, themeId: number) {
  await req(shop, token, `/themes/${themeId}.json`, {
    method: "PUT",
    body: JSON.stringify({ theme: { id: themeId, role: "main" } }),
  });
}
