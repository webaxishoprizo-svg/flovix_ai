import { createFileRoute } from "@tanstack/react-router";
import { runVisualAudit } from "@/lib/visual.functions";

export const Route = createFileRoute("/api/visual-audit/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          if (!body.shop) {
            return new Response(JSON.stringify({ success: false, error: "Shop is required" }), { status: 400 });
          }

          const result = await runVisualAudit({ data: { shop: body.shop } });
          return new Response(JSON.stringify({ success: true, ...result }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500 });
        }
      },
    },
  },
});
