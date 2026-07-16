import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Check,
  Plus,
  Trash2,
  RefreshCw,
  Store,
  CreditCard,
  Users,
  Bell,
  Shield,
  Sparkles,
  Sliders,
  User,
  Link as LinkIcon,
} from "lucide-react";
import { AppFrame } from "@/components/app/app-frame";
import { getActivePlan, startSubscription } from "@/lib/billing.functions";
import {
  addCompetitor,
  listCompetitors,
  removeCompetitor,
  snapshotCompetitor,
} from "@/lib/competitors.functions";
import { listNotifications, markAllNotificationsRead } from "@/lib/notifications.functions";
import { getAIPreferences, updateAIPreferences } from "@/lib/theme.functions";

const search = z.object({ shop: z.string().optional() });

export const Route = createFileRoute("/app/settings")({
  validateSearch: (s) => search.parse(s),
  component: Page,
  head: () => ({ meta: [{ title: "Settings — Flovix" }] }),
});

type Tab = "plan" | "competitors" | "notifications" | "store" | "ai_preferences" | "account" | "integrations";

function Page() {
  const { shop } = Route.useSearch();
  if (!shop) {
    return null;
  }
  return <Body shop={shop} />;
}

function Body({ shop }: { shop: string }) {
  const [tab, setTab] = useState<Tab>("plan");

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "store", label: "Shopify Connection", icon: Store },
    { key: "plan", label: "Billing & Plans", icon: CreditCard },
    { key: "competitors", label: "Competitors", icon: Users },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "ai_preferences", label: "AI Preferences", icon: Sliders },
    { key: "account", label: "Account Profile", icon: User },
    { key: "integrations", label: "Integrations", icon: LinkIcon },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Settings Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your AI preferences, Shopify connection, billing plans, and competitors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
        {/* Sidebar tabs */}
        <aside className="space-y-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium text-left transition-all " +
                  (active
                    ? "bg-primary text-white shadow-[0_4px_12px_rgba(79,70,229,0.15)]"
                    : "text-muted-foreground hover:bg-slate-100 hover:text-foreground")
                }
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </aside>

        {/* Tab contents wrapper */}
        <section className="bg-white rounded-2xl border border-border p-6 shadow-soft min-w-0">
          {tab === "plan" && <PlanTab shop={shop} />}
          {tab === "competitors" && <CompetitorsTab shop={shop} />}
          {tab === "notifications" && <NotificationsTab shop={shop} />}
          {tab === "store" && <StoreTab shop={shop} />}
          {tab === "ai_preferences" && <AIPreferencesTab shop={shop} />}
          {tab === "account" && <AccountTab shop={shop} />}
          {tab === "integrations" && <IntegrationsTab />}
        </section>
      </div>
    </div>
  );
}

// ─────────────────── Plan
const PLANS = [
  { key: "Growth", price: 29, features: ["50 chats/day", "5 auto CSS fixes/mo", "Daily audit"] },
  { key: "Pro", price: 79, features: ["Unlimited chat", "Liquid edits", "Visual audit"] },
  {
    key: "Agency",
    price: 399,
    features: ["Unattended auto-fix", "Multi-store", "Competitor scans", "Priority support"],
  },
] as const;

function PlanTab({ shop }: { shop: string }) {
  const get = useServerFn(getActivePlan);
  const up = useServerFn(startSubscription);
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await get({ data: { shop } });
      setCurrent(r.charge?.plan_name ?? null);
    })();
  }, [get, shop]);

  const choose = async (plan: "Growth" | "Pro" | "Agency") => {
    setBusy(plan);
    try {
      const r = await up({ data: { shop, plan, returnHost: window.location.origin } });
      if (r.confirmationUrl) window.top!.location.href = r.confirmationUrl;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current plan card */}
      <div className="rounded-2xl border border-border bg-slate-50/50 p-6 flex justify-between items-center">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Current Plan</span>
          <div className="mt-1 font-serif text-2xl font-bold text-slate-800">{current ?? "Basic (Free Tier)"}</div>
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const active = current === p.key;
          return (
            <div
              key={p.key}
              className={
                "relative rounded-2xl border p-5 flex flex-col justify-between transition-all " +
                (active
                  ? "border-primary bg-indigo-50/10 shadow-soft"
                  : "border-border bg-white hover:border-slate-300 hover:shadow-soft")
              }
            >
              {active && (
                <span className="absolute top-4 right-4 text-[10px] uppercase font-bold tracking-wider bg-primary text-white px-2.5 py-0.5 rounded-full">
                  Active
                </span>
              )}
              
              <div className="space-y-3">
                <div className="font-serif text-xl font-bold text-slate-800">{p.key}</div>
                <div className="font-serif text-3xl font-bold text-slate-800">
                  ${p.price}
                  <span className="text-xs text-muted-foreground"> /mo</span>
                </div>
                <ul className="mt-4 space-y-2 text-[12px] text-slate-600">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => choose(p.key)}
                disabled={active || busy === p.key}
                className={
                  "mt-6 w-full h-[48px] rounded-xl text-[14px] font-semibold transition-all " +
                  (active
                    ? "bg-slate-100 text-slate-400 cursor-default"
                    : "bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-lg")
                }
              >
                {active ? "Current" : busy === p.key ? "…" : "Choose Plan"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────── Competitors
type CompRow = {
  id: string;
  domain: string;
  label: string | null;
  created_at: string;
  latest: {
    performance: number | null;
    seo: number | null;
    lcp: string | null;
    insight: string | null;
  } | null;
};

function CompetitorsTab({ shop }: { shop: string }) {
  const list = useServerFn(listCompetitors);
  const add = useServerFn(addCompetitor);
  const remove = useServerFn(removeCompetitor);
  const snap = useServerFn(snapshotCompetitor);
  const [rows, setRows] = useState<CompRow[]>([]);
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    const r = await list({ data: { shop } });
    setRows(r.competitors as CompRow[]);
  };
  
  useEffect(() => {
    refresh();
  }, [shop]);

  const onAdd = async () => {
    if (!domain) return;
    setBusy("adding");
    try {
      await add({ data: { shop, domain } });
      setDomain("");
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[16px] font-bold text-slate-800">Tracked Competitors</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Flovix references these competitors to analyze layout CRO design and benchmark performance.
        </p>
      </div>

      {/* Input section conforming to Design System input height */}
      <div className="flex gap-3">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="competitor-domain.com"
          className="flex-1 h-[48px] bg-white border border-border rounded-xl px-4 text-[14px] outline-none focus:border-primary transition"
        />
        <button
          onClick={onAdd}
          disabled={!domain || busy === "adding"}
          className="h-[48px] text-[14px] font-semibold bg-primary text-white hover:bg-primary-hover rounded-xl px-6 flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Competitor
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-slate-50/50 p-12 text-center text-sm text-muted-foreground">
          No competitors configured yet. Add one above to start auditing.
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((c) => (
            <li key={c.id} className="rounded-2xl border border-border bg-white p-5 shadow-soft hover:border-slate-300 transition-all space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-800 text-sm truncate">{c.domain}</div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={async () => {
                      setBusy(c.id);
                      try {
                        await snap({ data: { shop, id: c.id } });
                        await refresh();
                      } finally {
                        setBusy(null);
                      }
                    }}
                    disabled={busy === c.id}
                    className="p-2 rounded-xl border border-border bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 shadow-sm"
                    aria-label="Refresh"
                  >
                    <RefreshCw className={"h-3.5 w-3.5 " + (busy === c.id ? "animate-spin" : "")} />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Remove?")) return;
                      await remove({ data: { shop, id: c.id } });
                      await refresh();
                    }}
                    className="p-2 rounded-xl border border-border bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 shadow-sm"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Perf" v={c.latest?.performance ?? null} />
                <Metric label="SEO" v={c.latest?.seo ?? null} />
                <Metric
                  label="LCP"
                  v={c.latest?.lcp ? parseFloat(c.latest.lcp) : null}
                  suffix="s"
                />
              </div>
              {c.latest?.insight && (
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100/50 text-[12px] text-slate-600 leading-relaxed">
                  {c.latest.insight}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, v, suffix }: { label: string; v: number | null; suffix?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 text-center">
      <div className="text-[9px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">{label}</div>
      <div className="font-serif text-lg font-bold mt-1 text-slate-700">
        {v == null ? "—" : suffix ? v.toFixed(1) + suffix : Math.round(v)}
      </div>
    </div>
  );
}

// ─────────────────── Notifications
type Notif = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

function NotificationsTab({ shop }: { shop: string }) {
  const list = useServerFn(listNotifications);
  const mark = useServerFn(markAllNotificationsRead);
  const [rows, setRows] = useState<Notif[]>([]);

  const refresh = async () => {
    const r = await list({ data: { shop } });
    setRows(r.rows as Notif[]);
  };
  
  useEffect(() => {
    refresh();
  }, [shop]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-[16px] font-bold text-slate-800">Notifications</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Historical logs of store audits and recommendations</p>
        </div>
        <button
          onClick={async () => {
            await mark({ data: { shop } });
            await refresh();
          }}
          className="h-10 text-[12px] font-semibold border border-border bg-white text-slate-700 rounded-xl px-4 flex items-center gap-1.5 hover:bg-slate-50 transition shadow-sm"
        >
          Mark all read
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-slate-50/50 p-12 text-center text-sm text-muted-foreground">
          No notifications yet.
        </div>
      ) : (
        <ul className="rounded-2xl border border-border bg-white divide-y divide-slate-100 overflow-hidden shadow-soft">
          {rows.map((n) => (
            <li key={n.id} className={"p-5 transition-opacity duration-300 " + (n.read_at ? "opacity-60 bg-slate-50/20" : "bg-white")}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-primary bg-indigo-50 px-2.5 py-1 rounded-full">
                  {n.kind}
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              <div className="mt-3 font-semibold text-slate-800 text-[14px]">{n.title}</div>
              {n.body && <p className="mt-1 text-[13px] text-slate-600 leading-relaxed">{n.body}</p>}
              {n.href && (
                <a
                  href={n.href}
                  className="text-[11px] font-bold uppercase tracking-wider text-primary hover:underline mt-3 inline-block"
                >
                  Open Report →
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────── Store
function StoreTab({ shop }: { shop: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[16px] font-bold text-slate-800">Shopify Integration</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your Shopify storefront data collection sync.</p>
      </div>
      
      <div className="rounded-2xl border border-border bg-slate-50/50 p-6 space-y-2.5">
        <div className="flex items-center gap-2 text-slate-700">
          <Store className="h-5 w-5" />
          <h2 className="font-serif text-lg font-bold">Connected Shopify Store</h2>
        </div>
        <p className="font-mono text-sm text-slate-700 bg-white border border-border/80 px-3.5 py-2 rounded-xl inline-block">{shop}</p>
        <p className="text-[12px] text-muted-foreground">
          Uninstalling Flovix from your Shopify Store admin dashboard instantly deletes all OAuth tokens and access permissions.
        </p>
      </div>
      
      <div className="rounded-2xl border border-border bg-slate-50/50 p-6 space-y-2">
        <div className="flex items-center gap-2 text-slate-700">
          <Shield className="h-5 w-5" />
          <h2 className="font-serif text-lg font-bold">Data & Privacy Compliance</h2>
        </div>
        <p className="text-[13px] text-slate-600 leading-relaxed">
          GDPR compliance webhooks are securely configured with Shopify. All theme modifications generate backup versions, allowing instant reversals of code changes in the active workspace.
        </p>
      </div>
    </div>
  );
}

// ─────────────────── AI Preferences (New design system requirement)
function AIPreferencesTab({ shop }: { shop: string }) {
  const getPrefs = useServerFn(getAIPreferences);
  const updatePrefs = useServerFn(updateAIPreferences);
  const [autonomous, setAutonomous] = useState(false);
  const [model, setModel] = useState("gemini-pro");

  useEffect(() => {
    getPrefs({ data: { shop } })
      .then((res) => {
        setAutonomous(res.autonomous);
        setModel(res.model);
      })
      .catch((e) => console.error(e));
  }, [shop, getPrefs]);

  const handleToggleAutonomous = async () => {
    const next = !autonomous;
    setAutonomous(next);
    try {
      await updatePrefs({ data: { shop, autonomous: next, model } });
    } catch (e) {
      console.error(e);
      setAutonomous(!next); // fallback
    }
  };

  const handleSetModel = async (m: string) => {
    setModel(m);
    try {
      await updatePrefs({ data: { shop, autonomous, model: m } });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[16px] font-bold text-slate-800">AI Preferences</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Configure model selection and autonomous action limits.</p>
      </div>

      <div className="space-y-4">
        {/* Toggle autonomous code edit */}
        <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="max-w-[70%]">
            <span className="text-[14px] font-bold text-slate-800 block">Autonomous Code Application</span>
            <span className="text-[12px] text-slate-500 block mt-1">Allow the AI Shopify Engineer to write and edit theme templates without asking for permission first.</span>
          </div>
          <button 
            onClick={handleToggleAutonomous}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${autonomous ? "bg-primary" : "bg-slate-300"}`}
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${autonomous ? "translate-x-6" : ""}`} />
          </button>
        </div>

        {/* Model Selector list */}
        <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
          <span className="text-[14px] font-bold text-slate-800 block">Model Engine Selection</span>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleSetModel("gemini-flash")}
              className={`p-4 rounded-xl border text-left transition-all ${
                model === "gemini-flash" ? "border-primary bg-indigo-50/10 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="text-[13px] font-bold text-slate-800 block">Gemini 3.5 Flash</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Highly responsive, optimized for scanning code structures.</span>
            </button>
            <button 
              onClick={() => handleSetModel("gemini-pro")}
              className={`p-4 rounded-xl border text-left transition-all ${
                model === "gemini-pro" ? "border-primary bg-indigo-50/10 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="text-[13px] font-bold text-slate-800 block">Gemini 3.5 Pro</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Deconstructs complex conversion rate signals and drafts robust CSS fixes.</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────── Account (New design system requirement)
function AccountTab({ shop }: { shop: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[16px] font-bold text-slate-800">Account Profile</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Manage credentials, access permissions and role roles.</p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider block">Administrator Email</span>
            <span className="text-sm font-semibold text-slate-700 mt-1 block">admin@{shop}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider block">Role Type</span>
            <span className="text-sm font-semibold text-slate-700 mt-1 block">Store Owner</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────── Integrations (New design system requirement)
function IntegrationsTab() {
  const list = [
    { name: "Shopify API Client", status: "Connected", desc: "Crawls theme assets and templates." },
    { name: "Supabase DB Connector", status: "Connected", desc: "Stores audit histories and settings." },
    { name: "Google PageSpeed Insights", status: "Connected", desc: "Automates Google Lighthouse metrics collection." },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[16px] font-bold text-slate-800">Connected Integrations</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Verify integrations required for audit features.</p>
      </div>

      <div className="space-y-3">
        {list.map((item) => (
          <div key={item.name} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div>
              <span className="text-[13px] font-bold text-slate-800 block">{item.name}</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">{item.desc}</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
