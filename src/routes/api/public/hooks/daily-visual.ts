import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/daily-visual")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runVisualAudit } = await import("@/lib/visual.functions");
        const { data: stores } = await supabaseAdmin
          .from("stores")
          .select("shop_domain")
          .is("uninstalled_at", null);
        let ok = 0;
        for (const s of stores ?? []) {
          try {
            await runVisualAudit({ data: { shop: s.shop_domain } });
            ok++;
          } catch (e) {
            console.warn("visual failed", (e as Error).message);
          }
        }
        return Response.json({ ok });
      },
    },
  },
});
