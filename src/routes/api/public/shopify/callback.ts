import { createFileRoute } from "@tanstack/react-router";
import { getCookie, deleteCookie } from "@tanstack/react-start/server";
import {
  verifyOAuthHmac,
  exchangeCodeForToken,
  normalizeShopDomain,
} from "@/lib/shopify/oauth.server";
import { encryptToken } from "@/lib/shopify/crypto.server";
import {
  fetchShopInfo,
  listThemes,
  registerWebhooks,
} from "@/lib/shopify/admin-api.server";
import { getAppUrl } from "@/lib/shopify/config.server";

export const Route = createFileRoute("/api/public/shopify/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const shop = normalizeShopDomain(url.searchParams.get("shop"));
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const cookieState = getCookie("flovix_oauth_state");

        if (!shop || !code || !state) return new Response("Bad request", { status: 400 });
        if (!cookieState || cookieState !== state) {
          return new Response("Invalid state (CSRF)", { status: 403 });
        }
        deleteCookie("flovix_oauth_state");

        if (!(await verifyOAuthHmac(url))) {
          return new Response("HMAC verification failed", { status: 403 });
        }

        // Exchange for access token
        const { access_token, scope } = await exchangeCodeForToken(shop, code);
        const encrypted = await encryptToken(access_token);

        // Fetch shop info + live theme
        const [{ shop: info }, { themes }] = await Promise.all([
          fetchShopInfo(shop, access_token),
          listThemes(shop, access_token),
        ]);
        const liveTheme = themes.find((t) => t.role === "main");

        // Upsert store row via server admin client
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("stores").upsert(
          {
            shop_domain: shop,
            access_token_encrypted: encrypted,
            scopes: scope,
            shop_name: info.name,
            shop_email: info.email,
            country_code: info.country_code,
            currency: info.currency,
            live_theme_id: liveTheme?.id ?? null,
            uninstalled_at: null,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "shop_domain" },
        );

        // Register mandatory webhooks (fire and forget errors)
        registerWebhooks(shop, access_token, getAppUrl(request)).catch(() => {});

        // Redirect into the embedded app
        const host = url.searchParams.get("host") ?? "";
        const dest = `/app?shop=${encodeURIComponent(shop)}${host ? `&host=${encodeURIComponent(host)}` : ""}`;
        return new Response(null, { status: 302, headers: { Location: dest } });
      },
    },
  },
});
