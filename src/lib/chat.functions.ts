import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ShopInput = z.object({ shop: z.string() });

export const getRecentChats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    try {
      const store = await resolveStoreFromShop(data.shop);
      const { data: chats, error } = await supabaseAdmin
        .from("chats")
        .select("id, title, created_at")
        .eq("store_id", store.storeId)
        .order("created_at", { ascending: false })
        .limit(10);
        
      if (error) throw error;
      return { chats: chats ?? [] };
    } catch (e) {
      console.error("Failed to fetch recent chats:", e);
      return { chats: [] };
    }
  });

export const getAuditHistory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ShopInput.parse(d))
  .handler(async ({ data }) => {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    try {
      const store = await resolveStoreFromShop(data.shop);
      const { data: audits, error } = await supabaseAdmin
        .from("audits")
        .select("id, score, finished_at")
        .eq("store_id", store.storeId)
        .eq("status", "completed")
        .order("finished_at", { ascending: true })
        .limit(15);
        
      if (error) throw error;
      return { audits: audits ?? [] };
    } catch (e) {
      console.error("Failed to fetch audit history:", e);
      return { audits: [] };
    }
  });
