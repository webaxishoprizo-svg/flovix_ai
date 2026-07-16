// Weekly AI report — generates a summary and stores in `reports`.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/weekly-report")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { createLovableAiGatewayProvider, hasVertexConfiguration } = await import("@/lib/ai-gateway.server");
        const { generateText } = await import("ai");
        const { pushNotification } = await import("@/lib/notifications.functions");
        const key = process.env.LOVABLE_API_KEY || "";
        const isVertex = hasVertexConfiguration();
        if (!key && !isVertex) return new Response("no key", { status: 500 });
        const gateway = createLovableAiGatewayProvider(key);

        const { data: stores } = await supabaseAdmin
          .from("stores")
          .select("id, shop_domain, shop_email")
          .is("uninstalled_at", null);
        let ok = 0;
        for (const s of stores ?? []) {
          try {
            const { data: audit } = await supabaseAdmin
              .from("audits")
              .select("score, score_seo, score_speed, score_ux, score_conversion, summary")
              .eq("store_id", s.id)
              .order("started_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            const { data: metrics } = await supabaseAdmin
              .from("metrics_daily")
              .select("revenue_usd, orders, day")
              .eq("store_id", s.id)
              .order("day", { ascending: false })
              .limit(7);
            const revenue = (metrics ?? []).reduce((a, m) => a + Number(m.revenue_usd ?? 0), 0);
            const orders = (metrics ?? []).reduce((a, m) => a + Number(m.orders ?? 0), 0);
            const { text } = await generateText({
              model: gateway("google/gemini-3-flash-preview"),
              prompt: `Write a concise weekly Shopify performance report (markdown, 250 words max). Score ${
                audit?.score ?? "?"
              }. Revenue 7d $${revenue.toFixed(0)} across ${orders} orders. Speed ${
                audit?.score_speed ?? "?"
              }, SEO ${audit?.score_seo ?? "?"}, UX ${audit?.score_ux ?? "?"}, Conversion ${
                audit?.score_conversion ?? "?"
              }. Audit summary: ${audit?.summary ?? "n/a"}. Sections: Highlights, Risks, Top 3 actions.`,
            });
            const today = new Date();
            const start = new Date(today);
            start.setDate(today.getDate() - 7);
            await supabaseAdmin.from("reports").insert({
              store_id: s.id,
              kind: "weekly",
              period_start: start.toISOString().slice(0, 10),
              period_end: today.toISOString().slice(0, 10),
              summary: `Revenue $${revenue.toFixed(0)} · Orders ${orders}`,
              body_md: text,
            });
            await pushNotification(
              s.id,
              "report_ready",
              "Your weekly Flovix report is ready",
              `Revenue $${revenue.toFixed(0)} · ${orders} orders`,
              `/app/reports?shop=${encodeURIComponent(s.shop_domain)}`,
            );

            if (s.shop_email) {
              const { sendEmail } = await import("@/lib/resend.server");
              await sendEmail({
                to: s.shop_email,
                subject: `Weekly Flovix Performance Report - ${s.shop_domain}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
                    <h2 style="font-size: 20px; font-weight: bold; color: #1e1b4b; margin: 0;">Weekly Flovix Performance Report</h2>
                    <p style="font-size: 14px; color: #64748b; margin-top: 5px; margin-bottom: 20px;">Performance insights for ${s.shop_domain}</p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                      <p style="font-size: 16px; font-weight: bold; margin: 0; color: #4f46e5;">Summary: ${audit?.summary ?? "Overview ready in workspace."}</p>
                      <p style="font-size: 14px; margin: 10px 0 0 0;"><strong>Revenue:</strong> $${revenue.toFixed(0)} across ${orders} orders</p>
                      <p style="font-size: 14px; margin: 5px 0 0 0;"><strong>Audit Scores:</strong> Speed ${audit?.score_speed ?? "?"} · SEO ${audit?.score_seo ?? "?"} · UX ${audit?.score_ux ?? "?"} · Conversion ${audit?.score_conversion ?? "?"}</p>
                    </div>
                    
                    <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; background-color: #ffffff; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px;">
                      ${text}
                    </div>
                    
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
                    <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Sent by Flovix AI. Open the connected admin to configure settings.</p>
                  </div>
                `,
              });
            }

            ok++;
          } catch (e) {
            console.warn("report failed", (e as Error).message);
          }
        }
        return Response.json({ ok });
      },
    },
  },
});
