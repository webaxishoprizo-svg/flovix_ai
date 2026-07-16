// Visual DOM audit — runs analyzer for mobile+desktop and asks Gemini for narrative.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ShopInput = z.object({ shop: z.string() });

export const runVisualAudit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { analyzeStorefront } = await import("@/lib/visual.server");
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText } = await import("ai");

    const store = await resolveStoreFromShop(data.shop);
    const [mobile, desktop] = await Promise.all([
      analyzeStorefront(store.shop, "mobile"),
      analyzeStorefront(store.shop, "desktop"),
    ]);

    const key = process.env.LOVABLE_API_KEY || "";
    const { hasVertexConfiguration } = await import("@/lib/ai-gateway.server");
    const isVertex = hasVertexConfiguration();
    let narrative = "";
    if (key || isVertex) {
      const gateway = createLovableAiGatewayProvider(key);
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        prompt: `You are an expert Shopify CRO analyst. Write a tight 4-6 sentence narrative for a merchant summarizing what's working and the top 3 fixes.

MOBILE signals: score ${mobile.score}, CTA above-fold ${mobile.ctaVisible}, reviews ${mobile.reviewsDetected}, trust ${mobile.trustBadges}, urgency ${mobile.urgencyDetected}, fonts ${mobile.fontCount}, images ${mobile.imageCount}, h1 ${mobile.h1Count}, weight ${(mobile.bytes / 1024).toFixed(0)}KB.
DESKTOP signals: score ${desktop.score}, CTA ${desktop.ctaVisible}, reviews ${desktop.reviewsDetected}, trust ${desktop.trustBadges}, urgency ${desktop.urgencyDetected}, fonts ${desktop.fontCount}.
Title: "${mobile.title ?? ""}"
Meta: "${mobile.metaDescription ?? ""}"`,
      });
      narrative = text;
    }

    const rows = [mobile, desktop].map((s) => ({
      store_id: store.storeId,
      device: s.device,
      score: s.score,
      cta_visible: s.ctaVisible,
      reviews_detected: s.reviewsDetected,
      trust_badges: s.trustBadges,
      urgency_detected: s.urgencyDetected,
      font_count: s.fontCount,
      narrative,
      raw: s as never,
    }));
    await supabaseAdmin.from("visual_audits").insert(rows);

    return { mobile, desktop, narrative };
  });

export const getLatestVisual = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    const { data: rows } = await supabaseAdmin
      .from("visual_audits")
      .select("*")
      .eq("store_id", store.storeId)
      .order("created_at", { ascending: false })
      .limit(10);
    const pick = (dev: string) => {
      const r = (rows ?? []).find((x) => x.device === dev);
      if (!r) return null;
      return {
        score: r.score,
        summary: r.narrative,
        ctaVisible: r.cta_visible,
        reviews: r.reviews_detected,
        trustBadges: r.trust_badges,
        urgency: r.urgency_detected,
        fonts: r.font_count,
      };
    };
    return { mobile: pick("mobile"), desktop: pick("desktop") };
  });
