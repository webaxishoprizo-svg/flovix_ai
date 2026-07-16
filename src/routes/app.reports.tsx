import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Sparkles,
  ArrowRight,
  Download,
  Users,
  AlertCircle,
  Plus,
} from "lucide-react";
import { getMetrics, syncMetrics } from "@/lib/metrics.functions";
import { getLatestAudit } from "@/lib/audit.functions";
import { listCompetitors } from "@/lib/competitors.functions";

// Recharts for Executive Dashboard
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const search = z.object({ shop: z.string().optional() });

export const Route = createFileRoute("/app/reports")({
  validateSearch: (s) => search.parse(s),
  component: Page,
  head: () => ({ meta: [{ title: "Reports — Flovix" }] }),
});

type Day = { day: string; revenue_usd: number | null; orders: number | null };
type Competitor = {
  id: string;
  domain: string;
  label: string | null;
  latest: { performance: number | null; seo: number | null; lcp: string | null; insight: string | null } | null;
};

function Page() {
  const { shop } = Route.useSearch();
  if (!shop) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center">
        <h1 className="font-serif text-2xl">No store connected</h1>
        <p className="mt-2 text-sm text-muted-foreground">Open Flovix from Shopify Admin to view reports.</p>
      </div>
    );
  }
  return <Body shop={shop} />;
}

function Body({ shop }: { shop: string }) {
  const get = useServerFn(getMetrics);
  const sync = useServerFn(syncMetrics);
  const fetchAudit = useServerFn(getLatestAudit);
  const fetchCompetitors = useServerFn(listCompetitors);

  const [days, setDays] = useState<Day[]>([]);
  const [audit, setAudit] = useState<{ score: number | null; summary: string | null } | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const refresh = async () => {
    setLoadError(null);
    const results = await Promise.allSettled([
      get({ data: { shop } }),
      fetchAudit({ data: { shop } }),
      fetchCompetitors({ data: { shop } }),
    ]);

    const [mRes, aRes, cRes] = results;
    if (mRes.status === "fulfilled") {
      setDays((mRes.value?.rows ?? []) as Day[]);
    } else {
      setDays([]);
      const msg = (mRes.reason as Error)?.message || "Failed to load metrics";
      setLoadError(msg.includes("Store not installed") ? "This store isn't connected yet. Install Flovix from Shopify Admin." : msg);
    }
    if (aRes.status === "fulfilled") {
      const a: any = aRes.value?.audit ?? null;
      setAudit(a ? { score: a.score ?? null, summary: a.summary ?? null } : null);
    }
    if (cRes.status === "fulfilled") {
      setCompetitors((cRes.value?.competitors ?? []) as Competitor[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    setMounted(true);
    refresh().catch((e) => {
      setLoadError((e as Error)?.message || "Unexpected error");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  const totals = useMemo(
    () => ({
      revenue: days.reduce((a, x) => a + Number(x?.revenue_usd ?? 0), 0),
      orders: days.reduce((a, x) => a + Number(x?.orders ?? 0), 0),
    }),
    [days],
  );

  // Real period-over-period comparison: last half vs prior half of the window.
  const trends = useMemo(() => {
    if (days.length < 4) return { revenue: null as number | null, orders: null as number | null, aov: null as number | null };
    const half = Math.floor(days.length / 2);
    const prior = days.slice(0, half);
    const recent = days.slice(days.length - half);
    const sum = (arr: Day[], k: "revenue_usd" | "orders") =>
      arr.reduce((a, x) => a + Number(x?.[k] ?? 0), 0);
    const pct = (a: number, b: number) => (b === 0 ? null : ((a - b) / b) * 100);
    const priorRev = sum(prior, "revenue_usd");
    const recentRev = sum(recent, "revenue_usd");
    const priorOrd = sum(prior, "orders");
    const recentOrd = sum(recent, "orders");
    const priorAov = priorOrd > 0 ? priorRev / priorOrd : 0;
    const recentAov = recentOrd > 0 ? recentRev / recentOrd : 0;
    return {
      revenue: pct(recentRev, priorRev),
      orders: pct(recentOrd, priorOrd),
      aov: pct(recentAov, priorAov),
    };
  }, [days]);

  const aovVal = totals.orders > 0 ? totals.revenue / totals.orders : 0;
  const aov = totals.orders > 0 ? "$" + aovVal.toFixed(2) : "—";

  const chartData = useMemo(
    () =>
      days.map((d) => ({
        date: new Date(d.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        revenue: Math.round(Number(d?.revenue_usd ?? 0)),
        orders: Number(d?.orders ?? 0),
      })),
    [days],
  );

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-2 sm:px-0 space-y-8 print-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">Executive Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? "Loading store performance…"
              : `Store performance for the last ${days.length} day${days.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handlePrint}
            className="h-10 text-[13px] font-medium border border-border bg-white text-slate-700 rounded-xl px-3 sm:px-4 flex items-center gap-2 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>

          <button
            onClick={async () => {
              setBusy(true);
              try {
                await sync({ data: { shop } });
                await refresh();
              } catch (e) {
                setLoadError((e as Error)?.message || "Sync failed");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="h-10 text-[13px] font-semibold bg-primary text-white hover:bg-primary-hover rounded-xl px-3 sm:px-4 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
          >
            <RefreshCw className={"h-4 w-4 " + (busy ? "animate-spin" : "")} />
            {busy ? "Syncing…" : "Sync Shopify"}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-amber-900">Couldn't load some metrics</div>
            <div className="text-xs text-amber-800 mt-0.5 break-words">{loadError}</div>
          </div>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          label="Total Revenue"
          value={"$" + Math.round(totals.revenue).toLocaleString()}
          icon={DollarSign}
          trendPct={trends.revenue}
        />
        <StatCard
          label="Shopify Orders"
          value={totals.orders.toLocaleString()}
          icon={ShoppingBag}
          trendPct={trends.orders}
        />
        <StatCard
          label="Average Order Value"
          value={aov}
          icon={TrendingUp}
          trendPct={trends.aov}
        />
      </div>

      {/* Revenue Area Chart */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-soft space-y-4">
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0">
            <h3 className="text-[16px] font-bold text-slate-800">Revenue Growth</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">Daily gross sales</p>
          </div>
          <span className="text-[11px] font-semibold text-primary bg-indigo-50 px-3 py-1 rounded-full shrink-0">
            Sales timeline
          </span>
        </div>

        {mounted && chartData.length > 0 ? (
          <div className="h-64 sm:h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: "11px", fill: "#6B7280" }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: "11px", fill: "#6B7280" }} />
                <Tooltip contentStyle={{ background: "#111827", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px" }} />
                <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 sm:h-72 flex items-center justify-center text-sm text-slate-400 italic bg-slate-50/50 rounded-xl text-center px-4">
            {loading ? "Loading sales…" : "No sales records available yet. Click Sync Shopify to populate."}
          </div>
        )}
      </div>

      {/* Two-Column Grid: Real AI summary + Real competitors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* AI Audit Summary Card (real data) */}
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex gap-2.5 items-center">
            <span className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-[16px] font-bold text-slate-800">Latest AI Audit</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">Generated by Flovix AI on your store</p>
            </div>
          </div>

          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100/50 space-y-3.5">
            {audit?.summary ? (
              <>
                {audit.score != null && (
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-bold text-slate-800">{audit.score}</div>
                    <div className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Store Score</div>
                  </div>
                )}
                <p className="text-[14px] text-slate-700 leading-relaxed">{audit.summary}</p>
              </>
            ) : (
              <p className="text-[13px] text-slate-500">
                No audit yet. Open the AI Workspace and run an audit to generate a real summary of your store.
              </p>
            )}
            <Link
              to="/app"
              search={{ shop } as never}
              className="text-[12px] font-semibold text-primary flex items-center gap-1.5 hover:underline pt-1"
            >
              {audit?.summary ? "Ask Flovix to fix issues" : "Run an audit now"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Real Competitor Comparison */}
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex gap-2.5 items-center justify-between">
            <div className="flex gap-2.5 items-center min-w-0">
              <span className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Users className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold text-slate-800 truncate">Competitors</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                  Benchmarked with PageSpeed
                </p>
              </div>
            </div>
            <Link
              to="/app/competitors"
              search={{ shop } as never}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
            >
              <Plus className="h-3 w-3" /> Add
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {competitors.length === 0 ? (
              <div className="text-center py-6 px-4 bg-slate-50/60 border border-slate-100 rounded-xl">
                <span className="text-[13px] font-semibold text-slate-700 block">No competitors tracked</span>
                <span className="text-[12px] text-muted-foreground block mt-1">
                  Add a competitor domain to benchmark performance.
                </span>
              </div>
            ) : (
              competitors.slice(0, 5).map((c) => {
                const perf = c.latest?.performance ?? null;
                const seo = c.latest?.seo ?? null;
                return (
                  <div
                    key={c.id}
                    className="flex justify-between items-center gap-3 p-3 rounded-xl border border-slate-50 bg-slate-50/50"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-bold text-slate-800 block truncate">
                        {c.label || c.domain}
                      </span>
                      <div className="flex gap-3 text-[11px] text-slate-500 mt-1">
                        <span>Perf: <span className="font-semibold text-slate-700">{perf ?? "—"}</span></span>
                        <span>SEO: <span className="font-semibold text-slate-700">{seo ?? "—"}</span></span>
                      </div>
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      perf == null ? "bg-slate-300" : perf >= 80 ? "bg-success" : perf >= 60 ? "bg-primary" : "bg-rose-500"
                    }`} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground text-center pt-4">
        Metrics sync from Shopify Orders API · Audit and competitor scores are AI-generated.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  trendPct,
}: {
  label: string;
  value: string;
  icon: any;
  trendPct?: number | null;
}) {
  const hasTrend = trendPct != null && Number.isFinite(trendPct);
  const trendUp = hasTrend && (trendPct as number) >= 0;
  const trendLabel = hasTrend ? `${trendUp ? "+" : ""}${(trendPct as number).toFixed(1)}%` : null;
  return (
    <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-soft flex flex-col gap-3 relative hover:border-slate-300 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <span className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        {trendLabel && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}>
            {trendLabel}
          </span>
        )}
      </div>
      <div className="mt-1">
        <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{label}</div>
        <div className="mt-1.5 font-serif text-2xl sm:text-3xl font-bold text-foreground break-all">{value}</div>
      </div>
    </div>
  );
}
