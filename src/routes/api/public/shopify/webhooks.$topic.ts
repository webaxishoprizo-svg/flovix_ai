import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookHmac } from "@/lib/shopify/oauth.server";

export const Route = createFileRoute("/api/public/shopify/webhooks/$topic")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const raw = await request.text();
        const sig = request.headers.get("x-shopify-hmac-sha256");
        if (!(await verifyWebhookHmac(sig, raw))) {
          return new Response("Invalid signature", { status: 401 });
        }
        const shop = request.headers.get("x-shopify-shop-domain");
        const topic = params.topic.replace(".", "/"); // "app.uninstalled" -> "app/uninstalled"

        let payload: unknown = null;
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = { raw };
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("webhooks_log").insert({
          topic,
          shop_domain: shop,
          payload: payload as never,
          processed: false,
        });

        if (shop) {
          const { data: storeRow } = await supabaseAdmin
            .from("stores")
            .select("id")
            .eq("shop_domain", shop)
            .maybeSingle();
          const storeId = storeRow?.id ?? null;

          if (topic === "app/uninstalled") {
            await supabaseAdmin
              .from("stores")
              .update({
                uninstalled_at: new Date().toISOString(),
                access_token_encrypted: null,
                plan_status: "cancelled",
              })
              .eq("shop_domain", shop);
          } else if ((topic === "orders/create" || topic === "orders/paid") && storeId) {
            const o = payload as { total_price?: string; currency?: string; id?: number };
            const revenue = parseFloat(o.total_price ?? "0") || 0;
            const day = new Date().toISOString().slice(0, 10);
            
            const { data: existing } = await supabaseAdmin
              .from("metrics_daily")
              .select("id, revenue_usd, orders")
              .eq("store_id", storeId)
              .eq("day", day)
              .maybeSingle();
            if (existing) {
              await supabaseAdmin
                .from("metrics_daily")
                .update({
                  revenue_usd: Number(existing.revenue_usd ?? 0) + revenue,
                  orders: Number(existing.orders ?? 0) + (topic === "orders/create" ? 1 : 0),
                })
                .eq("id", existing.id);
            } else {
              await supabaseAdmin.from("metrics_daily").insert({
                store_id: storeId,
                day,
                revenue_usd: revenue,
                orders: topic === "orders/create" ? 1 : 0,
              });
            }
          } else if (topic === "shop/update") {
            const s = payload as { name?: string; email?: string; currency?: string };
            await supabaseAdmin
              .from("stores")
              .update({
                shop_name: s.name ?? undefined,
                shop_email: s.email ?? undefined,
                currency: s.currency ?? undefined,
                last_seen_at: new Date().toISOString(),
              })
              .eq("shop_domain", shop);
          }
        }

        // GDPR topics: shop/redact, customers/redact, customers/data_request
        // We store no PII beyond shop metadata, so acknowledgement is sufficient.

        return new Response("ok", { status: 200 });
      },
    },
  },
});
