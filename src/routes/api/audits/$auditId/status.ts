import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/audits/$auditId/status")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { auditId } = params;
          const { data, error } = await supabaseAdmin
            .from("audits")
            .select("status, score")
            .eq("id", auditId)
            .maybeSingle();

          if (error || !data) {
            return new Response(JSON.stringify({ success: false, error: "Not found" }), { status: 404 });
          }

          return new Response(JSON.stringify({ success: true, status: data.status, overallScore: data.score }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500 });
        }
      },
    },
  },
});
