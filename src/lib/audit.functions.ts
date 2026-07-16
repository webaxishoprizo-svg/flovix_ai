// Audit engine + version history server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ShopInput = z.object({ shop: z.string() });

const IssueSchema = z.object({
  path: z.string(),
  category: z.enum([
    "performance",
    "seo",
    "accessibility",
    "design",
    "conversion",
    "code_quality",
    "product",
    "checkout",
    "mobile",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  fix_steps: z.array(z.string()).max(8),
  revenue_impact_usd: z.number().nullable().optional(),
  admin_path: z.string().nullable().optional(),
});
const AuditSchema = z.object({
  score: z.number().min(0).max(100),
  score_seo: z.number().min(0).max(100),
  score_speed: z.number().min(0).max(100),
  score_ux: z.number().min(0).max(100),
  score_conversion: z.number().min(0).max(100),
  summary: z.string(),
  issues: z.array(IssueSchema).max(30),
});

export const runAudit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY || "";
    const { hasVertexConfiguration } = await import("@/lib/ai-gateway.server");
    const isVertex = hasVertexConfiguration();
    if (!key && !isVertex) {
      throw new Error("Missing LOVABLE_API_KEY or Google Cloud Vertex AI credentials");
    }

    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { listAssets, getAsset } = await import("@/lib/shopify/asset-api.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateObject } = await import("ai");

    const store = await resolveStoreFromShop(data.shop);
    const themeId = store.draftThemeId ?? store.liveThemeId;
    if (!themeId) throw new Error("No theme available");

    const { data: auditRow, error: aErr } = await supabaseAdmin
      .from("audits")
      .insert({
        store_id: store.storeId,
        status: "running",
        started_at: new Date().toISOString(),
        triggered_by: "user",
      })
      .select("id")
      .single();
    if (aErr || !auditRow) throw new Error(aErr?.message ?? "audit insert failed");

    const assets = await listAssets(store.shop, store.accessToken, themeId);

    // Run PageSpeed Insights in parallel with theme scan.
    const { runPageSpeed } = await import("@/lib/pagespeed.server");
    const pagespeedPromise = runPageSpeed(store.shop).catch((e) => {
      console.warn("pagespeed:", e?.message);
      return null;
    });

    const priority = assets
      .filter(
        (a) =>
          /^(sections|templates|snippets|config|layout)\//.test(a.key) &&
          /\.(liquid|json)$/.test(a.key),
      )
      .slice(0, 30);

    const files: { path: string; content: string }[] = [];
    for (const a of priority) {
      try {
        const asset = await getAsset(store.shop, store.accessToken, themeId, a.key);
        if (asset.value) files.push({ path: a.key, content: asset.value.slice(0, 5000) });
      } catch {
        /* skip */
      }
    }

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");
    const catalog = files.map((f) => `\n\n===== ${f.path} =====\n${f.content}`).join("");
    const pagespeed = await pagespeedPromise;
    const psContext = pagespeed
      ? `\n\nLIVE STOREFRONT (Google Lighthouse, mobile):
- Performance: ${pagespeed.performance ?? "?"} / SEO: ${pagespeed.seo ?? "?"} / Accessibility: ${pagespeed.accessibility ?? "?"} / Best Practices: ${pagespeed.bestPractices ?? "?"}
- LCP: ${pagespeed.lcp ?? "?"} · CLS: ${pagespeed.cls ?? "?"} · TBT: ${pagespeed.tbt ?? "?"}
- Top opportunities: ${pagespeed.opportunities.slice(0, 6).map((o) => `${o.title} (~${o.savingsMs}ms)`).join("; ")}`
      : "";

    try {
      const { object } = await generateObject({
        model,
        schema: AuditSchema,
        prompt: `You are an elite Shopify theme auditor. Analyze the theme source AND the live Lighthouse report, then return a strict JSON audit covering these categories: performance, seo, accessibility, design, conversion, code_quality, product, checkout, mobile.
- overall score 0-100 (weight live Lighthouse heavily for speed/seo)
- subscores for seo, speed, ux, conversion (0-100 each)
- 1-paragraph summary calling out top conversion risks
- up to 25 concrete issues. For EACH issue include: path (a real file from the catalog), category, severity, priority, title, 1-2 sentence description, recommendation, an array "fix_steps" of 3-6 concrete engineer-ready steps, a rough "revenue_impact_usd" per month if unaddressed (small store baseline; null if unknown), and an "admin_path" (Shopify admin URL path like "/admin/themes/current/editor" or "/admin/settings/checkout" when relevant, else null).
- Include product-page issues (schema, badges, PDP), checkout issues (upsells, trust, express pay), and mobile-specific issues (tap targets, viewport, layout shift) as their own items.
${psContext}
${catalog}`,
      });

      // Blend Lighthouse into speed/seo if available.
      const speed =
        pagespeed?.performance != null
          ? Math.round((object.score_speed + pagespeed.performance) / 2)
          : Math.round(object.score_speed);
      const seo =
        pagespeed?.seo != null
          ? Math.round((object.score_seo + pagespeed.seo) / 2)
          : Math.round(object.score_seo);

      await supabaseAdmin
        .from("audits")
        .update({
          status: "completed",
          score: Math.round((Math.round(object.score) + speed + seo) / 3),
          score_seo: seo,
          score_speed: speed,
          score_ux: Math.round(object.score_ux),
          score_conversion: Math.round(object.score_conversion),
          summary: object.summary,
          finished_at: new Date().toISOString(),
        })
        .eq("id", auditRow.id);

      if (object.issues.length) {
        await supabaseAdmin.from("audit_issues").insert(
          object.issues.map((i) => ({
            audit_id: auditRow.id,
            store_id: store.storeId,
            location: i.path,
            category: i.category,
            severity: i.severity,
            priority: i.priority,
            title: i.title,
            description: i.description,
            fix_prompt: i.recommendation,
            fix_steps: i.fix_steps as never,
            revenue_impact_usd: i.revenue_impact_usd ?? null,
            admin_deep_link: i.admin_path
              ? `https://${store.shop}${i.admin_path.startsWith("/") ? "" : "/"}${i.admin_path}`
              : null,
            status: "open",
          })),
        );
      }

      // Notify merchant of audit completion.
      const { pushNotification } = await import("@/lib/notifications.functions");
      await pushNotification(
        store.storeId,
        "audit_completed",
        `Audit complete — score ${Math.round(object.score)}`,
        `${object.issues.length} issues found. Open the Action Plan to review.`,
        `/app/action-plan?shop=${encodeURIComponent(store.shop)}`,
      );

      return {
        auditId: auditRow.id,
        score: Math.round(object.score),
        count: object.issues.length,
      };
    } catch (e) {
      await supabaseAdmin
        .from("audits")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("id", auditRow.id);
      throw e;
    }
  });

export const getLatestAudit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    const { data: audit } = await supabaseAdmin
      .from("audits")
      .select(
        "id, status, score, score_seo, score_speed, score_ux, score_conversion, summary, started_at, finished_at",
      )
      .eq("store_id", store.storeId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!audit) return { audit: null, issues: [] as IssueRow[] };
    const { data: issues } = await supabaseAdmin
      .from("audit_issues")
      .select(
        "id, location, category, severity, priority, title, description, fix_prompt, fix_steps, revenue_impact_usd, admin_deep_link, status, fixed_at",
      )
      .eq("audit_id", audit.id);
    const order = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
    const sorted = (issues ?? []).slice().sort((a, b) => {
      const pr =
        (order[(a.priority as string) ?? a.severity] ?? 9) -
        (order[(b.priority as string) ?? b.severity] ?? 9);
      if (pr !== 0) return pr;
      return (Number(b.revenue_impact_usd ?? 0) - Number(a.revenue_impact_usd ?? 0));
    });
    return { audit, issues: sorted as IssueRow[] };
  });

export type IssueRow = {
  id: string;
  location: string | null;
  category: string;
  severity: string;
  priority: string | null;
  title: string;
  description: string | null;
  fix_prompt: string | null;
  fix_steps: string[] | null;
  revenue_impact_usd: number | null;
  admin_deep_link: string | null;
  status: string;
  fixed_at: string | null;
};

export const listVersions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    const themeId = store.draftThemeId ?? store.liveThemeId;
    if (!themeId) return { versions: [] };
    const { data: themeRow } = await supabaseAdmin
      .from("themes")
      .select("id")
      .eq("store_id", store.storeId)
      .eq("shopify_theme_id", themeId)
      .maybeSingle();
    if (!themeRow) return { versions: [] };
    const { data: versions } = await supabaseAdmin
      .from("file_versions")
      .select("id, path, summary, author, created_at")
      .eq("theme_id", themeRow.id)
      .order("created_at", { ascending: false })
      .limit(100);
    return { versions: versions ?? [] };
  });

const RevertInput = z.object({ shop: z.string(), versionId: z.string() });

export const revertVersion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RevertInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { putAsset } = await import("@/lib/shopify/asset-api.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    const themeId = store.draftThemeId ?? store.liveThemeId;
    if (!themeId) throw new Error("No theme");
    const { data: v } = await supabaseAdmin
      .from("file_versions")
      .select("path, before_content, theme_id")
      .eq("id", data.versionId)
      .maybeSingle();
    if (!v) throw new Error("Version not found");
    await putAsset(store.shop, store.accessToken, themeId, v.path, v.before_content ?? "");
    await supabaseAdmin.from("file_versions").insert({
      theme_id: v.theme_id,
      path: v.path,
      before_content: null,
      after_content: v.before_content ?? "",
      summary: "Reverted to earlier version",
      author: "user",
    });
    return { ok: true };
  });

export const revertAllSessionFixes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { putAsset } = await import("@/lib/shopify/asset-api.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    const themeId = store.draftThemeId ?? store.liveThemeId;
    if (!themeId) throw new Error("No theme");
    const { data: themeRow } = await supabaseAdmin
      .from("themes")
      .select("id")
      .eq("store_id", store.storeId)
      .eq("shopify_theme_id", themeId)
      .maybeSingle();
    if (!themeRow) throw new Error("Theme record not found");

    const { data: versions } = await supabaseAdmin
      .from("file_versions")
      .select("path, before_content, author")
      .eq("theme_id", themeRow.id)
      .order("created_at", { ascending: true });

    if (!versions?.length) return { ok: true, count: 0 };

    const originalContents = new Map<string, string>();
    const aiEditedPaths = new Set<string>();

    for (const v of versions) {
      if (v.author === "flovix") {
        aiEditedPaths.add(v.path);
        if (!originalContents.has(v.path)) {
          originalContents.set(v.path, v.before_content ?? "");
        }
      } else if (v.author === "user") {
        aiEditedPaths.delete(v.path);
      }
    }

    let count = 0;
    for (const path of aiEditedPaths) {
      const original = originalContents.get(path);
      if (original !== undefined) {
        await putAsset(store.shop, store.accessToken, themeId, path, original);
        await supabaseAdmin.from("file_versions").insert({
          theme_id: themeRow.id,
          path,
          before_content: null,
          after_content: original,
          summary: "Reverted bulk session fixes",
          author: "user",
        });
        count++;
      }
    }

    return { ok: true, count };
  });

