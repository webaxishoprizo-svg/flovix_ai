import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ShopInput = z.object({ shop: z.string() });

export async function pushNotification(
  storeId: string,
  kind: string,
  title: string,
  body?: string,
  href?: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("notifications").insert({
    store_id: storeId,
    kind,
    title,
    body: body ?? null,
    href: href ?? null,
  });
}

export const listNotifications = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    const { data: rows } = await supabaseAdmin
      .from("notifications")
      .select("id, kind, title, body, href, read_at, created_at")
      .eq("store_id", store.storeId)
      .order("created_at", { ascending: false })
      .limit(50);
    return { rows: rows ?? [] };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    await supabaseAdmin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("store_id", store.storeId)
      .is("read_at", null);
    return { ok: true };
  });

export const markIssueFixed = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ shop: z.string(), issueId: z.string(), fixed: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(data.shop);
    await supabaseAdmin
      .from("audit_issues")
      .update({
        status: data.fixed ? "fixed" : "open",
        fixed_at: data.fixed ? new Date().toISOString() : null,
      })
      .eq("id", data.issueId)
      .eq("store_id", store.storeId);
    return { ok: true };
  });
