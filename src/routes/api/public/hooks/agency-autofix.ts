// Agency-only daily auto-fix — picks the highest-priority open issue per Agency
// store and asks the AI to write a safe CSS/liquid patch to the draft theme.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/agency-autofix")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { getPlanTier } = await import("@/lib/plan.server");
        const { pushNotification } = await import("@/lib/notifications.functions");
        const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
        const { getAsset, putAsset } = await import("@/lib/shopify/asset-api.server");
        const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
        const { generateText } = await import("ai");
        const key = process.env.LOVABLE_API_KEY;

        const { data: stores } = await supabaseAdmin
          .from("stores")
          .select("id, shop_domain")
          .is("uninstalled_at", null);

        let attempted = 0;
        for (const s of stores ?? []) {
          const tier = await getPlanTier(s.id);
          if (tier !== "Agency") continue;

          const store = await resolveStoreFromShop(s.shop_domain);
          const { data: storeRow } = await supabaseAdmin
            .from("stores")
            .select("metadata")
            .eq("id", store.storeId)
            .maybeSingle();
          const meta = (storeRow?.metadata as Record<string, any>) || {};
          const isUnattended = !!meta.unattended_autofix;
          const themeId = store.draftThemeId ?? store.liveThemeId;
          if (!themeId) continue;

          const { data: issues } = await supabaseAdmin
            .from("audit_issues")
            .select("id, title, description, fix_prompt, location, priority, severity")
            .eq("store_id", s.id)
            .eq("status", "open")
            .in("priority", ["critical", "high"])
            .limit(3);
          if (!issues?.length) continue;

          attempted++;

          if (!isUnattended || !key) {
            await pushNotification(
              s.id,
              "autofix_queued",
              "Autonomous fix queued",
              `${issues.length} issue(s) queued for auto-fix on your draft theme.`,
              `/app?shop=${encodeURIComponent(s.shop_domain)}`,
            );
            continue;
          }

          const gateway = createLovableAiGatewayProvider(key);
          const model = gateway("google/gemini-3-flash-preview");

          let fixesCount = 0;
          for (const issue of issues) {
            if (!issue.location) continue;
            try {
              const asset = await getAsset(store.shop, store.accessToken, themeId, issue.location);
              const beforeContent = asset.value ?? "";
              if (!beforeContent) continue;

              const { text: newContent } = await generateText({
                model,
                prompt: `You are an autonomous Shopify theme engineer. Apply a safe, surgical fix to resolve this conversion/performance issue.
Issue: ${issue.title} - ${issue.description}
Recommendation: ${issue.fix_prompt}
File Path: ${issue.location}

Here is the current content of the file:
\`\`\`
${beforeContent}
\`\`\`

Return ONLY the complete raw updated file contents. Do not include markdown code block syntax (like \`\`\`liquid) or explanations. Just the file code.`,
              });

              const cleanContent = newContent
                .replace(/^```[a-z]*\n/, "")
                .replace(/\n```$/, "")
                .trim();

              if (cleanContent && cleanContent !== beforeContent) {
                await putAsset(store.shop, store.accessToken, themeId, issue.location, cleanContent);

                const { data: themeRow } = await supabaseAdmin
                  .from("themes")
                  .select("id")
                  .eq("store_id", store.storeId)
                  .eq("shopify_theme_id", themeId)
                  .maybeSingle();

                if (themeRow) {
                  await supabaseAdmin.from("file_versions").insert({
                    theme_id: themeRow.id,
                    path: issue.location,
                    before_content: beforeContent,
                    after_content: cleanContent,
                    summary: `Autonomous Auto-Fix: ${issue.title}`,
                    author: "flovix",
                  });
                }

                await supabaseAdmin
                  .from("audit_issues")
                  .update({ status: "fixed", fixed_at: new Date().toISOString() })
                  .eq("id", issue.id);

                fixesCount++;
              }
            } catch (e) {
              console.error(`Autonomous fix failed for issue ${issue.id}:`, e);
            }
          }

          if (fixesCount > 0) {
            await pushNotification(
              s.id,
              "autofix_completed",
              "Autonomous fixes applied",
              `Successfully resolved ${fixesCount} issue(s) on your draft theme.`,
              `/app?shop=${encodeURIComponent(s.shop_domain)}`,
            );
          }
        }
        return Response.json({ attempted });
      },
    },
  },
});
