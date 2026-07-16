import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import {
  buildAuthorizeUrl,
  newNonce,
  normalizeShopDomain,
} from "@/lib/shopify/oauth.server";
import { getAppUrl } from "@/lib/shopify/config.server";

export const Route = createFileRoute("/api/public/shopify/install")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const shop = normalizeShopDomain(url.searchParams.get("shop"));
        if (!shop) {
          return new Response(
            "Missing or invalid ?shop=your-store.myshopify.com",
            { status: 400 },
          );
        }


        const state = newNonce();
        setCookie("flovix_oauth_state", state, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 600,
        });
        const authorizeUrl = buildAuthorizeUrl(shop, getAppUrl(request), state);
        return new Response(null, { status: 302, headers: { Location: authorizeUrl } });
      },
    },
  },
});
