import { createFileRoute } from "@tanstack/react-router";
import { resolveStoreFromShop } from "@/lib/shopify/session.server";
import { getAsset } from "@/lib/shopify/asset-api.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateObject } from "ai";
import { z } from "zod";

export const Route = createFileRoute("/api/visual-audit/generate-fix")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { shop, issueTitle } = await request.json();
          if (!shop || !issueTitle) {
            return new Response(JSON.stringify({ success: false, error: "Shop and issueTitle required" }), { status: 400 });
          }

          const store = await resolveStoreFromShop(shop);
          const themeId = store.draftThemeId ?? store.liveThemeId;
          if (!themeId) throw new Error("No theme available");

          // Fetch theme.liquid and theme.css
          let themeLiquid = "";
          try {
            const tl = await getAsset(store.shop, store.accessToken, themeId, "layout/theme.liquid");
            themeLiquid = (tl.value ?? "").slice(0, 4000);
          } catch (e) { /* ignore */ }

          const key = process.env.LOVABLE_API_KEY || "";
          const gateway = createLovableAiGatewayProvider(key);
          const model = gateway("google/gemini-3-flash-preview");

          const fixSchema = z.object({
            cssCode: z.string(),
            liquidNote: z.string().optional(),
            explanation: z.string(),
            riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
            reversible: z.boolean()
          });

          const { object } = await generateObject({
            model,
            schema: fixSchema,
            prompt: `You are a Shopify theme developer. Here is the layout/theme.liquid (truncated):
${themeLiquid}

The issue is: ${issueTitle}
Generate a targeted CSS fix.
- Must have a comment header: /* Flovix Fix: ${issueTitle} */
- Must be scoped, reversible, and use media queries for mobile if needed.
`
          });

          return new Response(JSON.stringify({ success: true, codeFix: object }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500 });
        }
      }
    }
  }
});
