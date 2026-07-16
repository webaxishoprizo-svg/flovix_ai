import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { UpgradeCard } from "@/components/UpgradeCard";
import { useServerFn } from "@tanstack/react-start";
import { runVisualAudit, getLatestVisual } from "@/lib/visual.functions";
import { useEffect, useState } from "react";
import { Eye, Loader2, Play } from "lucide-react";

const search = z.object({ shop: z.string().optional() });

export const Route = createFileRoute("/app/visual")({
  validateSearch: (s) => search.parse(s),
  component: VisualAuditPage,
});

function VisualAuditPage() {
  const { shop } = Route.useSearch();
  if (!shop) return null;

  const { plan, features, loading: planLoading } = usePlanFeatures(shop);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  
  const getVisual = useServerFn(getLatestVisual);
  const runVisual = useServerFn(runVisualAudit);

  useEffect(() => {
    if (planLoading) return;
    if (!features.visualAudit) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const res = await getVisual({ data: { shop: shop! } });
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [shop, planLoading, features.visualAudit, getVisual]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await runVisual({ data: { shop } });
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  if (planLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!features.visualAudit) {
    return (
      <UpgradeCard
        feature="Visual DOM Analysis"
        requiredPlan="GROWTH"
        price="$24/month"
        shop={shop}
      />
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" /> Visual DOM Analysis
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Agentic headless browser scanning for structural UI issues.
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium disabled:opacity-50 hover:bg-primary-hover transition"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run Scan
        </button>
      </div>

      {!data?.mobile && !data?.desktop ? (
        <div className="text-center p-12 border border-slate-100 rounded-2xl bg-white shadow-sm">
          <Eye className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700">No scans yet</h3>
          <p className="text-sm text-slate-500 mt-1">Run a scan to analyze your storefront.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.narrative && (
            <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
              <h3 className="font-bold text-indigo-900 mb-2">AI Summary</h3>
              <p className="text-indigo-800 text-sm leading-relaxed">{data.narrative}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mobile Card */}
            {data.mobile && (
              <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-slate-800">Mobile Viewport</h3>
                  <span className="text-2xl font-extrabold text-primary">{data.mobile.score}</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">CTA Visible Above Fold</span>
                    <span className={data.mobile.ctaVisible ? "text-emerald-500 font-medium" : "text-rose-500 font-medium"}>
                      {data.mobile.ctaVisible ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Trust Badges</span>
                    <span className={data.mobile.trustBadges ? "text-emerald-500 font-medium" : "text-amber-500 font-medium"}>
                      {data.mobile.trustBadges ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reviews Widget</span>
                    <span className={data.mobile.reviews ? "text-emerald-500 font-medium" : "text-rose-500 font-medium"}>
                      {data.mobile.reviews ? "Detected" : "Missing"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Desktop Card */}
            {data.desktop && (
              <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-slate-800">Desktop Viewport</h3>
                  <span className="text-2xl font-extrabold text-primary">{data.desktop.score}</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">CTA Visible Above Fold</span>
                    <span className={data.desktop.ctaVisible ? "text-emerald-500 font-medium" : "text-rose-500 font-medium"}>
                      {data.desktop.ctaVisible ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Trust Badges</span>
                    <span className={data.desktop.trustBadges ? "text-emerald-500 font-medium" : "text-amber-500 font-medium"}>
                      {data.desktop.trustBadges ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reviews Widget</span>
                    <span className={data.desktop.reviews ? "text-emerald-500 font-medium" : "text-rose-500 font-medium"}>
                      {data.desktop.reviews ? "Detected" : "Missing"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
