import { createFileRoute } from "@tanstack/react-router";
import { normalizeShopDomain, SHOPIFY_API_VERSION } from "@/lib/shopify/config.server";

export const Route = createFileRoute("/api/public/shopify/billing-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const shop = normalizeShopDomain(url.searchParams.get("shop"));
        const chargeId = url.searchParams.get("charge_id");
        if (!shop || !chargeId) return new Response("Bad request", { status: 400 });

        const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
        const store = await resolveStoreFromShop(shop);

        // Fetch charge status
        const res = await fetch(
          `https://${store.shop}/admin/api/${SHOPIFY_API_VERSION}/recurring_application_charges/${chargeId}.json`,
          { headers: { "X-Shopify-Access-Token": store.accessToken } },
        );
        if (!res.ok) return new Response(`Shopify: ${res.status}`, { status: 500 });
        const { recurring_application_charge } = (await res.json()) as {
          recurring_application_charge: { id: number; status: string };
        };

        // If pending, activate it (merchant approved on hosted page)
        if (recurring_application_charge.status === "accepted") {
          const activate = await fetch(
            `https://${store.shop}/admin/api/${SHOPIFY_API_VERSION}/recurring_application_charges/${chargeId}/activate.json`,
            {
              method: "POST",
              headers: {
                "X-Shopify-Access-Token": store.accessToken,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({}),
            },
          );
          if (activate.ok) {
            recurring_application_charge.status = "active";
          }
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("billing_charges")
          .update({
            status: recurring_application_charge.status,
            activated_at:
              recurring_application_charge.status === "active"
                ? new Date().toISOString()
                : null,
          })
          .eq("shopify_charge_id", String(chargeId));

        return new Response(null, {
          status: 302,
          headers: {
            Location: `/app?shop=${encodeURIComponent(shop)}&billed=${recurring_application_charge.status}`,
          },
        });
      },
    },
  },
});
