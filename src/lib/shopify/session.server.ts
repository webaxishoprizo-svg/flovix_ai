// Resolve the authenticated store for a request.
// MVP: trusts `shop` query/body param, but requires an installed store row
// (with an encrypted access token) to exist. In production the embedded app
// should attach a Shopify App Bridge session-token JWT and this helper should
// verify it against SHOPIFY_API_SECRET before trusting `shop`.

import { normalizeShopDomain } from "./config.server";
import { decryptToken } from "./crypto.server";

export interface StoreSession {
  storeId: string;
  shop: string;
  accessToken: string;
  liveThemeId: number | null;
  draftThemeId: number | null;
}

export async function resolveStoreFromShop(
  shopInput: string | null | undefined,
): Promise<StoreSession> {
  const shop = normalizeShopDomain(shopInput);
  if (!shop) throw new Response("Missing shop", { status: 400 });


  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let { data, error } = await supabaseAdmin
    .from("stores")
    .select("id, shop_domain, access_token_encrypted, live_theme_id, draft_theme_id")
    .eq("shop_domain", shop)
    .maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });

  if (!data || !data.access_token_encrypted) {
    throw new Response("Store not installed", { status: 404 });
  }

  const accessToken = await decryptToken(data.access_token_encrypted);

  return {
    storeId: data.id,
    shop: data.shop_domain,
    accessToken,
    liveThemeId: data.live_theme_id,
    draftThemeId: data.draft_theme_id,
  };
}
