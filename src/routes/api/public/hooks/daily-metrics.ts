import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/daily-metrics")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { syncMetrics } = await import("@/lib/metrics.functions");
        const { data: stores } = await supabaseAdmin
          .from("stores")
          .select("shop_domain")
          .is("uninstalled_at", null);
        let ok = 0;
        for (const s of stores ?? []) {
          try {
            await syncMetrics({ data: { shop: s.shop_domain } });
            ok++;
          } catch (e) {
            console.warn("metrics failed", (e as Error).message);
          }
        }
        return Response.json({ ok });
      },
    },
  },
});
