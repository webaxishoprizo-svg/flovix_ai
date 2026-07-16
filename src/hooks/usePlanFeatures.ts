import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getActivePlan } from "@/lib/billing.functions";

type PlanName = "FREE" | "GROWTH" | "PRO" | "AGENCY";

export interface PlanFeatures {
  visualAudit: boolean;
  codeGen: boolean;
  autoFix: boolean;
  chatLimit: number;
  auditsPerMonth: number;
}

const FEATURES: Record<PlanName, PlanFeatures> = {
  FREE:   { visualAudit: false, codeGen: false, autoFix: false, chatLimit: 10, auditsPerMonth: 3 },
  GROWTH: { visualAudit: true,  codeGen: false, autoFix: false, chatLimit: 100, auditsPerMonth: 10 },
  PRO:    { visualAudit: true,  codeGen: true,  autoFix: false, chatLimit: 9999, auditsPerMonth: 9999 },
  AGENCY: { visualAudit: true,  codeGen: true,  autoFix: true,  chatLimit: 9999, auditsPerMonth: 9999 },
};

export function usePlanFeatures(shop: string) {
  const [plan, setPlan] = useState<PlanName>("FREE");
  const [loading, setLoading] = useState(true);
  const fetchPlan = useServerFn(getActivePlan);

  useEffect(() => {
    async function load() {
      if (!shop) return;
      try {
        const res = await fetchPlan({ data: { shop } });
        if (res?.charge?.plan_name) {
          const name = res.charge.plan_name.toUpperCase() as PlanName;
          if (FEATURES[name]) setPlan(name);
        }
      } catch (e) {
        console.error("Failed to load plan", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [shop, fetchPlan]);

  return { plan, features: FEATURES[plan], loading };
}
