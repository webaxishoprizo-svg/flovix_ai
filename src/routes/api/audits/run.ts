import { createFileRoute } from "@tanstack/react-router";
import { runAudit } from "@/lib/audit.functions";

export const Route = createFileRoute("/api/audits/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          if (!body.shop) {
            return new Response(JSON.stringify({ success: false, error: "Shop is required" }), { status: 400 });
          }

          // In a real background job system, we would return 202 and run this asynchronously.
          // Since TanStack Start API routes are synchronous and serverless, we await it.
          const result = await runAudit({ data: { shop: body.shop } });
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
