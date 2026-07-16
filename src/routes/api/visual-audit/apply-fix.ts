import { createFileRoute } from "@tanstack/react-router";
import { resolveStoreFromShop } from "@/lib/shopify/session.server";
import { getAsset, putAsset } from "@/lib/shopify/asset-api.server";

export const Route = createFileRoute("/api/visual-audit/apply-fix")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { shop, cssCode, riskLevel } = await request.json();
          if (!shop || !cssCode) {
            return new Response(JSON.stringify({ success: false, error: "Shop and cssCode required" }), { status: 400 });
          }

          if (riskLevel === "HIGH") {
            return new Response(JSON.stringify({ success: false, error: "HIGH risk fixes require manual review" }), { status: 400 });
          }

          const store = await resolveStoreFromShop(shop);
          const themeId = store.draftThemeId ?? store.liveThemeId;
          if (!themeId) throw new Error("No theme available");

          // 1. Fetch or create storecoach-fixes.css
          let currentCss = "";
          try {
            const asset = await getAsset(store.shop, store.accessToken, themeId, "assets/storecoach-fixes.css");
            currentCss = asset.value ?? "";
          } catch (e) {
            // file might not exist yet
          }

          const timestamp = new Date().toISOString();
          const newCss = `${currentCss}\n/* [${timestamp}] Fix */\n${cssCode}\n`;
          await putAsset(store.shop, store.accessToken, themeId, "assets/storecoach-fixes.css", newCss);

          // 2. Inject into theme.liquid if not present
          const themeLiquidAsset = await getAsset(store.shop, store.accessToken, themeId, "layout/theme.liquid");
          let themeLiquid = themeLiquidAsset.value ?? "";
          const linkTag = "{{ 'storecoach-fixes.css' | asset_url | stylesheet_tag }}";
          
          if (!themeLiquid.includes("storecoach-fixes.css")) {
            themeLiquid = themeLiquid.replace("</head>", `  ${linkTag}\n</head>`);
            await putAsset(store.shop, store.accessToken, themeId, "layout/theme.liquid", themeLiquid);
          }

          return new Response(JSON.stringify({ success: true, appliedAt: timestamp }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: String(error) }), { status: 500 });
        }
      }
    }
  }
});
