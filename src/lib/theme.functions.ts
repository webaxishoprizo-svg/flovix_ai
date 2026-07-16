// Server functions for theme editing. Client-safe module.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ShopInput = z.object({ shop: z.string() });

export const getWorkspace = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { listAssets } = await import("@/lib/shopify/asset-api.server");
    const store = await resolveStoreFromShop(data.shop);
    const themeId = store.draftThemeId ?? store.liveThemeId;
    if (!themeId) {
      return { store: { shop: store.shop }, themeId: null, files: [] as string[] };
    }
    const assets = await listAssets(store.shop, store.accessToken, themeId);
    return {
      store: { shop: store.shop, liveThemeId: store.liveThemeId, draftThemeId: store.draftThemeId },
      themeId,
      files: assets.map((a) => a.key).sort(),
    };
  });

const FileInput = z.object({ shop: z.string(), path: z.string() });

export const readFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => FileInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { getAsset, isBinaryPath } = await import("@/lib/shopify/asset-api.server");
    const store = await resolveStoreFromShop(data.shop);
    const themeId = store.draftThemeId ?? store.liveThemeId;
    if (!themeId) throw new Error("No theme selected");
    if (isBinaryPath(data.path)) {
      return { path: data.path, binary: true, content: "" };
    }
    const asset = await getAsset(store.shop, store.accessToken, themeId, data.path);
    return { path: data.path, binary: false, content: asset.value ?? "" };
  });

const WriteInput = z.object({
  shop: z.string(),
  path: z.string(),
  content: z.string(),
});

export const writeFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => WriteInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { getAsset, putAsset } = await import("@/lib/shopify/asset-api.server");
    const store = await resolveStoreFromShop(data.shop);
    const themeId = store.draftThemeId ?? store.liveThemeId;
    if (!themeId) throw new Error("No theme selected");

    // Snapshot previous content into file_versions
    let before = "";
    try {
      const prev = await getAsset(store.shop, store.accessToken, themeId, data.path);
      before = prev.value ?? "";
    } catch {
      // new file
    }
    await putAsset(store.shop, store.accessToken, themeId, data.path, data.content);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: themeRow } = await supabaseAdmin
      .from("themes")
      .select("id")
      .eq("store_id", store.storeId)
      .eq("shopify_theme_id", themeId)
      .maybeSingle();
    if (themeRow) {
      await supabaseAdmin.from("file_versions").insert({
        theme_id: themeRow.id,
        path: data.path,
        before_content: before,
        after_content: data.content,
        author: "user",
      });
    }
    return { ok: true };
  });

const DraftInput = z.object({ shop: z.string(), name: z.string().optional() });

export const createDraftTheme = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DraftInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { duplicateTheme, copyAllAssets } = await import(
      "@/lib/shopify/asset-api.server"
    );
    const store = await resolveStoreFromShop(data.shop);
    if (!store.liveThemeId) throw new Error("No live theme to duplicate");
    const name = data.name ?? `Flovix Draft — ${new Date().toISOString().slice(0, 10)}`;
    const dupe = await duplicateTheme(
      store.shop,
      store.accessToken,
      store.liveThemeId,
      name,
    );
    // Copy assets in the background (fire-and-forget; long op).
    copyAllAssets(store.shop, store.accessToken, store.liveThemeId, dupe.id).catch(
      (e) => console.warn("copy assets:", e.message),
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: themeRow } = await supabaseAdmin
      .from("themes")
      .insert({
        store_id: store.storeId,
        shopify_theme_id: dupe.id,
        source_theme_id: store.liveThemeId,
        name: dupe.name,
        role: dupe.role,
        is_flovix_draft: true,
      })
      .select("id")
      .single();
    await supabaseAdmin
      .from("stores")
      .update({ draft_theme_id: dupe.id })
      .eq("id", store.storeId);

    return { themeId: dupe.id, name: dupe.name, themeRowId: themeRow?.id };
  });

export const publishDraft = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { publishTheme } = await import("@/lib/shopify/asset-api.server");
    const store = await resolveStoreFromShop(data.shop);
    if (!store.draftThemeId) throw new Error("No draft theme");
    await publishTheme(store.shop, store.accessToken, store.draftThemeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("stores")
      .update({ live_theme_id: store.draftThemeId, draft_theme_id: null })
      .eq("id", store.storeId);
    return { ok: true };
  });

const PreferencesInput = z.object({
  shop: z.string(),
  autonomous: z.boolean(),
  model: z.string(),
});

export const getAIPreferences = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    const { data: storeRow } = await supabaseAdmin
      .from("stores")
      .select("metadata")
      .eq("id", store.storeId)
      .maybeSingle();
    const meta = (storeRow?.metadata as Record<string, any>) || {};
    return {
      autonomous: !!meta.unattended_autofix,
      model: (meta.ai_model as string) || "gemini-pro",
    };
  });

export const updateAIPreferences = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PreferencesInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    const { data: storeRow } = await supabaseAdmin
      .from("stores")
      .select("metadata")
      .eq("id", store.storeId)
      .maybeSingle();
    const meta = (storeRow?.metadata as Record<string, any>) || {};
    meta.unattended_autofix = data.autonomous;
    meta.ai_model = data.model;
    
    await supabaseAdmin
      .from("stores")
      .update({ metadata: meta as any })
      .eq("id", store.storeId);
      
    return { ok: true };
  });

