import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ShopInput = z.object({ shop: z.string() });
const AddInput = z.object({ shop: z.string(), domain: z.string(), label: z.string().optional() });
const DelInput = z.object({ shop: z.string(), id: z.string() });

export const listCompetitors = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    const { data: comps } = await supabaseAdmin
      .from("competitors")
      .select("id, domain, label, created_at")
      .eq("store_id", store.storeId);
    const ids = (comps ?? []).map((c) => c.id);
    let snapshots: Array<{
      competitor_id: string;
      performance: number | null;
      seo: number | null;
      lcp: string | null;
      insight: string | null;
      created_at: string;
    }> = [];
    if (ids.length) {
      const { data: snaps } = await supabaseAdmin
        .from("competitor_snapshots")
        .select("competitor_id, performance, seo, lcp, insight, created_at")
        .in("competitor_id", ids)
        .order("created_at", { ascending: false });
      snapshots = snaps ?? [];
    }
    const latest = new Map<string, (typeof snapshots)[number]>();
    for (const s of snapshots) if (!latest.has(s.competitor_id)) latest.set(s.competitor_id, s);
    return {
      competitors: (comps ?? []).map((c) => ({ ...c, latest: latest.get(c.id) ?? null })),
    };
  });

export const addCompetitor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AddInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    const domain = data.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    const { error } = await supabaseAdmin
      .from("competitors")
      .insert({ store_id: store.storeId, domain, label: data.label ?? null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeCompetitor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DelInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    await supabaseAdmin
      .from("competitors")
      .delete()
      .eq("id", data.id)
      .eq("store_id", store.storeId);
    return { ok: true };
  });

export const snapshotCompetitor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ shop: z.string(), id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runPageSpeed } = await import("@/lib/pagespeed.server");
    const store = await resolveStoreFromShop(data.shop);
    const { data: comp } = await supabaseAdmin
      .from("competitors")
      .select("id, domain, store_id")
      .eq("id", data.id)
      .eq("store_id", store.storeId)
      .maybeSingle();
    if (!comp) throw new Error("Not found");
    const ps = await runPageSpeed(comp.domain);
    await supabaseAdmin.from("competitor_snapshots").insert({
      competitor_id: comp.id,
      performance: ps.performance,
      seo: ps.seo,
      accessibility: ps.accessibility,
      best_practices: ps.bestPractices,
      lcp: ps.lcp,
      cls: ps.cls,
      tbt: ps.tbt,
    });
    return { ok: true, performance: ps.performance };
  });
