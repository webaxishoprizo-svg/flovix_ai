import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/daily-competitor")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runPageSpeed } = await import("@/lib/pagespeed.server");
        const { data: comps } = await supabaseAdmin
          .from("competitors")
          .select("id, domain, store_id");
        let ok = 0;
        for (const c of comps ?? []) {
          try {
            const { data: prevSnapshot } = await supabaseAdmin
              .from("competitor_snapshots")
              .select("performance, seo")
              .eq("competitor_id", c.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const ps = await runPageSpeed(c.domain);
            await supabaseAdmin.from("competitor_snapshots").insert({
              competitor_id: c.id,
              performance: ps.performance,
              seo: ps.seo,
              accessibility: ps.accessibility,
              best_practices: ps.bestPractices,
              lcp: ps.lcp,
              cls: ps.cls,
              tbt: ps.tbt,
            });

            const { data: store } = await supabaseAdmin
              .from("stores")
              .select("shop_domain, shop_email")
              .eq("id", c.store_id)
              .maybeSingle();

            if (prevSnapshot && store?.shop_email) {
              const prevPerf = prevSnapshot.performance ?? 0;
              const prevSeo = prevSnapshot.seo ?? 0;
              const currPerf = ps.performance ?? 0;
              const currSeo = ps.seo ?? 0;
              const perfDrop = prevPerf - currPerf;
              const seoDrop = prevSeo - currSeo;
              if (perfDrop >= 10 || seoDrop >= 10) {
                const { sendEmail } = await import("@/lib/resend.server");
                await sendEmail({
                  to: store.shop_email,
                  subject: `🚨 Alert: Competitor Threat Detected - ${c.domain}`,
                  html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
                      <h2 style="font-size: 20px; font-weight: bold; color: #991b1b; margin: 0;">Competitor Performance Change Alert</h2>
                      <p style="font-size: 14px; color: #64748b; margin-top: 5px;">Weekly competitor monitoring for ${store.shop_domain}</p>
                      
                      <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <p style="font-size: 15px; font-weight: bold; color: #991b1b; margin: 0;">Changes detected for: ${c.domain}</p>
                        ${perfDrop >= 10 ? `<p style="font-size: 14px; margin: 8px 0 0 0;">⚠️ <strong>Performance score dropped</strong> by ${perfDrop.toFixed(0)} points (New score: ${ps.performance}).</p>` : ""}
                        ${seoDrop >= 10 ? `<p style="font-size: 14px; margin: 8px 0 0 0;">⚠️ <strong>SEO score dropped</strong> by ${seoDrop.toFixed(0)} points (New score: ${ps.seo}).</p>` : ""}
                      </div>
                      
                      <p style="font-size: 14px; line-height: 1.6;">
                        Your competitor's storefront performance metric changes have been processed. Open your Flovix AI workspace to compare detailed diagnostics, LCP, and layout shifts.
                      </p>
                      
                      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
                      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Sent by Flovix AI. Open settings to update competitor configurations.</p>
                    </div>
                  `,
                });
              }
            }

            ok++;
          } catch (e) {
            console.warn("comp failed", c.domain, (e as Error).message);
          }
        }
        return Response.json({ ok });
      },
    },
  },
});
