// Plan tier resolution + daily write-limit enforcement.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PlanTier = "Basic" | "Growth" | "Pro" | "Agency";

export const WRITE_LIMITS: Record<PlanTier, number> = {
  Basic: 0, // suggestions only, no auto-fix
  Growth: 20,
  Pro: 100,
  Agency: Infinity,
};

export async function getPlanTier(storeId: string): Promise<PlanTier> {
  const { data: charge } = await supabaseAdmin
    .from("billing_charges")
    .select("plan_name, status")
    .eq("store_id", storeId)
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const name = charge?.plan_name;
  if (name === "Growth" || name === "Pro" || name === "Agency") return name;
  return "Basic";
}

export async function countTodaysAiWrites(storeId: string): Promise<number> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { data: themes } = await supabaseAdmin
    .from("themes")
    .select("id")
    .eq("store_id", storeId);
  const ids = (themes ?? []).map((t) => t.id);
  if (!ids.length) return 0;
  const { count } = await supabaseAdmin
    .from("file_versions")
    .select("id", { count: "exact", head: true })
    .in("theme_id", ids)
    .eq("author", "flovix")
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

export async function assertWriteAllowed(storeId: string): Promise<{
  tier: PlanTier;
  used: number;
  limit: number;
}> {
  const tier = await getPlanTier(storeId);
  const limit = WRITE_LIMITS[tier];
  if (limit === 0) {
    throw new Error(
      "Your current plan is Basic — Flovix can suggest fixes but cannot edit files. Upgrade to Growth, Pro, or Agency to enable auto-fix.",
    );
  }
  const used = await countTodaysAiWrites(storeId);
  if (used >= limit) {
    throw new Error(
      `Daily auto-fix limit reached (${used}/${limit === Infinity ? "∞" : limit}). Upgrade your plan or try again tomorrow.`,
    );
  }
  return { tier, used, limit };
}
