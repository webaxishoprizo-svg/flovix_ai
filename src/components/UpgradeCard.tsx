import { Lock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { startSubscription } from "@/lib/billing.functions";
import { useState } from "react";

interface UpgradeCardProps {
  feature: string;
  requiredPlan: "GROWTH" | "PRO" | "AGENCY";
  price: string;
  shop: string;
}

export function UpgradeCard({ feature, requiredPlan, price, shop }: UpgradeCardProps) {
  const [loading, setLoading] = useState(false);
  const startSub = useServerFn(startSubscription);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await startSub({
        data: {
          shop,
          plan: requiredPlan.charAt(0) + requiredPlan.slice(1).toLowerCase() as "Growth" | "Pro" | "Agency",
          returnHost: window.location.origin,
        },
      });
      if (res.confirmationUrl) {
        window.location.href = res.confirmationUrl;
      }
    } catch (e) {
      console.error("Upgrade failed:", e);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 border border-slate-100 rounded-3xl m-6 shadow-sm">
      <div className="h-16 w-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        <Lock className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">
        {feature} is locked
      </h3>
      <p className="text-[14px] text-muted-foreground max-w-md mb-8">
        Upgrade to the <strong>{requiredPlan}</strong> plan ({price}) to unlock this feature and supercharge your storefront conversions.
      </p>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold hover:bg-primary-hover transition shadow-sm disabled:opacity-50"
      >
        {loading ? "Redirecting..." : "Upgrade Now"}
      </button>
    </div>
  );
}
