// Pull Shopify Orders API into metrics_daily.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ShopInput = z.object({ shop: z.string() });

export const syncMetrics = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { SHOPIFY_API_VERSION } = await import("@/lib/shopify/config.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);

    const url =
      `https://${store.shop}/admin/api/${SHOPIFY_API_VERSION}/orders.json` +
      `?status=any&financial_status=any&limit=250&created_at_min=${since.toISOString()}`;
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": store.accessToken },
    });
    if (!res.ok) throw new Error(`Shopify orders: ${res.status}`);
    const { orders } = (await res.json()) as {
      orders: Array<{
        created_at: string;
        total_price: string;
        currency: string;
      }>;
    };

    const bucket = new Map<string, { revenue: number; orders: number; currency: string }>();
    for (const o of orders) {
      const day = o.created_at.slice(0, 10);
      const b = bucket.get(day) ?? { revenue: 0, orders: 0, currency: o.currency ?? "USD" };
      b.revenue += Number(o.total_price ?? 0);
      b.orders += 1;
      bucket.set(day, b);
    }
    const rows = [...bucket.entries()].map(([day, v]) => ({
      store_id: store.storeId,
      day,
      revenue_usd: v.revenue,
      orders: v.orders,
      currency: v.currency,
    }));
    if (rows.length) {
      await supabaseAdmin.from("metrics_daily").upsert(rows, { onConflict: "store_id,day" });
    }
    return { days: rows.length, orders: orders.length };
  });

export const getMetrics = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    const { data: rows } = await supabaseAdmin
      .from("metrics_daily")
      .select("day, revenue_usd, orders, currency")
      .eq("store_id", store.storeId)
      .order("day", { ascending: true })
      .limit(60);
    return { rows: rows ?? [] };
  });
