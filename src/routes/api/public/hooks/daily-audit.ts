// Daily audit hook — iterates every installed store.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/daily-audit")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runAudit } = await import("@/lib/audit.functions");
        const { data: stores } = await supabaseAdmin
          .from("stores")
          .select("shop_domain")
          .is("uninstalled_at", null);
        let ok = 0;
        for (const s of stores ?? []) {
          try {
            await runAudit({ data: { shop: s.shop_domain } });
            ok++;
          } catch (e) {
            console.warn("audit failed", s.shop_domain, (e as Error).message);
          }
        }
        return Response.json({ ok, total: (stores ?? []).length });
      },
    },
  },
});
