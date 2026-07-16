import { createFileRoute, Link } from "@tanstack/react-router";
import { FlovixLogo, FLOVIX_LOGO_URL } from "@/components/brand/logo";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import { z } from "zod";
import {
  Send,
  Sparkles,
  Code2,
  Gauge,
  Eye,
  ChevronRight,
  ChevronDown,
  X,
  Save,
  FileCode,
  Plus,
  TrendingUp,
  Activity,
  AlertCircle,
  Clock,
  Globe,
  CheckCircle,
  RotateCcw,
} from "lucide-react";

// Recharts for Premium Analytics
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  getWorkspace,
  readFile,
  writeFile,
  createDraftTheme,
  publishDraft,
} from "@/lib/theme.functions";
import { getLatestAudit, revertAllSessionFixes } from "@/lib/audit.functions";
import { getAuditHistory } from "@/lib/chat.functions";

const searchSchema = z.object({
  shop: z.string().optional(),
  host: z.string().optional(),
});

export const Route = createFileRoute("/app/")({
  validateSearch: (s) => searchSchema.parse(s),
  component: WorkspaceIndex,
  head: () => ({ meta: [{ title: "Flovix — AI Workspace" }] }),
});

function WorkspaceIndex() {
  const { shop } = Route.useSearch();

  if (!shop) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <FlovixLogo size={48} className="mx-auto mb-4" />
          <h1 className="font-serif text-3xl">No store connected</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Open Flovix from your Shopify Admin, or install it now.
          </p>
          <Link
            to="/install"
            className="inline-block mt-6 bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-opacity"
          >
            Install
          </Link>
        </div>
      </main>
    );
  }

  return <Workspace shop={shop} />;
}

type Mode = "chat" | "ide";
type PanelMode = "health" | "browser" | "audit";

interface ChatMessage {
  id: string;
  role: string;
  parts: Array<{ type: string; text?: string; input?: any; output?: any; state?: string }>;
}

function Workspace({ shop }: { shop: string }) {
  const [mode, setMode] = useState<Mode>("chat");
  const [activePath, setActivePath] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [panelMode, setPanelMode] = useState<PanelMode>("health");
  const [mounted, setMounted] = useState(false);

  // Database Data States
  const [latestAudit, setLatestAudit] = useState<any>(null);
  const [latestIssues, setLatestIssues] = useState<any[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  // Mobile Tabs inside IDE mode
  const [mobileTab, setMobileTab] = useState<"chat" | "files" | "code" | "preview">("chat");

  const getLatestAuditFn = useServerFn(getLatestAudit);
  const getAuditHistoryFn = useServerFn(getAuditHistory);

  const openInIDE = useCallback((path: string) => {
    setActivePath(path);
    setMode("ide");
    setMobileTab("code");
  }, []);

  const onFileChanged = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  // Fetch Latest Audit & Audit history
  const loadWorkspaceData = useCallback(async () => {
    try {
      const res = await getLatestAuditFn({ data: { shop } });
      if (res?.audit) {
        setLatestAudit(res.audit);
        if (res.issues) {
          setLatestIssues(res.issues);
        }
      }

      const historyRes = await getAuditHistoryFn({ data: { shop } });
      if (historyRes?.audits) {
        // Map audits to simple recharts-friendly structure
        const formatted = historyRes.audits.map((a: any) => ({
          name: new Date(a.finished_at || a.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          score: a.score || 0,
        }));
        setAuditHistory(formatted);
      }
    } catch (e) {
      console.error("Failed to load audit metrics:", e);
    }
  }, [getLatestAuditFn, getAuditHistoryFn, shop]);

  useEffect(() => {
    setMounted(true);
    loadWorkspaceData();
  }, [loadWorkspaceData, refreshTick]);

  const triggerDataRefresh = () => {
    setRefreshTick((t) => t + 1);
  };

  return (
    <div
      className={`grid h-[calc(100vh-56px)] md:h-screen w-full transition-[grid-template-columns] duration-500 ease-out overflow-hidden bg-background ${mode === "ide" ? "grid-cols-1 md:grid-cols-[1fr_60%]" : "grid-cols-1 md:grid-cols-[1fr_320px]"
        }`}
    >
      {/* Middle Column: Conversation Pane */}
      <div className={`flex flex-col min-h-0 min-w-0 ${mode === "ide" && mobileTab !== "chat" ? "hidden md:flex" : "flex"}`}>
        <ConversationPane
          shop={shop}
          mode={mode}
          onOpenIDE={openInIDE}
          onToggleIDE={() => setMode((m) => (m === "ide" ? "chat" : "ide"))}
          onFileChanged={onFileChanged}
          activePath={activePath}
          onSetPanelMode={setPanelMode}
          onRefreshData={triggerDataRefresh}
          latestIssues={latestIssues}
        />
      </div>

      {/* Right Column: Dynamic Panel (Store Health / Progress Logs OR IDE Editor Pane) */}
      <div className={`overflow-hidden border-l border-border bg-white transition-all duration-500 ${mode === "ide" ? (mobileTab === "chat" ? "hidden md:block" : "block") : "hidden md:block"}`}>
        {mode === "ide" ? (
          <IDEPane
            shop={shop}
            activePath={activePath}
            setActivePath={setActivePath}
            onClose={() => setMode("chat")}
            refreshTick={refreshTick}
            mobileTab={mobileTab}
            setMobileTab={setMobileTab}
          />
        ) : (
          <RightContextPanel
            shop={shop}
            panelMode={panelMode}
            setPanelMode={setPanelMode}
            latestAudit={latestAudit}
            latestIssues={latestIssues}
            auditHistory={auditHistory}
            mounted={mounted}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Center Conversation Pane
// ─────────────────────────────────────────────────────────────
function ConversationPane({
  shop,
  mode,
  onOpenIDE,
  onToggleIDE,
  onFileChanged,
  activePath,
  onSetPanelMode,
  onRefreshData,
  latestIssues,
}: {
  shop: string;
  mode: Mode;
  onOpenIDE: (p: string) => void;
  onToggleIDE: () => void;
  onFileChanged: () => void;
  activePath: string | null;
  onSetPanelMode: (m: PanelMode) => void;
  onRefreshData: () => void;
  latestIssues: any[];
}) {
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ shop }),
      }),
    [shop],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: shop,
    transport,
    onFinish: () => {
      onFileChanged();
      onRefreshData();
    },
  });

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    composerRef.current?.focus();
  }, [messages.length, mode]);

  const busy = status === "submitted" || status === "streaming";

  // Auto-detect AI tasks to morph Right Context Panel
  useEffect(() => {
    if (busy) {
      if (input.toLowerCase().includes("website") || input.toLowerCase().includes("competitor") || input.toLowerCase().includes("nike") || input.toLowerCase().includes("browse")) {
        onSetPanelMode("browser");
      } else if (input.toLowerCase().includes("audit") || input.toLowerCase().includes("score") || input.toLowerCase().includes("lighthouse")) {
        onSetPanelMode("audit");
      }
    }
  }, [busy, input, onSetPanelMode]);

  // Auto-switch to IDE mode if the AI writes a file
  useEffect(() => {
    if (mode === "ide") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const editedFile = last.parts.find((p) => {
      const t = (p as { type: string }).type;
      return t === "tool-write_file" || t === "tool-read_file";
    });
    if (editedFile) {
      const path =
        ((editedFile as { input?: { path?: string } }).input?.path) ??
        ((editedFile as { output?: { path?: string } }).output?.path);
      if (path) onOpenIDE(path);
    }
  }, [messages, mode, onOpenIDE]);

  const submit = () => {
    if (!input.trim() || busy) return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  const empty = messages.length === 0;

  return (
    <div className="relative flex flex-col h-full bg-slate-50/50">
      {/* Floating IDE Toggle Button */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        {activePath && (
          <span className="hidden md:inline-flex items-center text-[11px] font-mono bg-white/85 backdrop-blur-sm text-slate-700 px-3 py-1.5 rounded-xl border border-slate-100 shadow-soft truncate max-w-[200px]">
            {activePath}
          </span>
        )}
        <button
          onClick={onToggleIDE}
          className={
            "text-[12px] font-medium px-4 py-2 rounded-xl border transition flex items-center gap-2 " +
            (mode === "ide"
              ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_12px_rgba(79,70,229,0.15)]"
              : "border-border bg-white/85 backdrop-blur-sm hover:bg-slate-50 text-slate-700 shadow-soft")
          }
        >
          <Code2 className="h-3.5 w-3.5" />
          {mode === "ide" ? "Close IDE" : "Open IDE"}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {empty && <EmptyState onPick={(s) => setInput(s)} />}

          <div className="space-y-8">
            {messages.map((m, idx) => (
              <div key={m.id} className="flovix-fade-up">
                <ChatMessage
                  message={m}
                  onOpenFile={onOpenIDE}
                  streaming={busy && idx === messages.length - 1 && m.role === "assistant"}
                />
              </div>
            ))}

            {busy &&
              (messages.length === 0 ||
                messages[messages.length - 1]?.role === "user") && (
                <ThinkingIndicator />
              )}

            {error && (
              <div className="text-sm text-destructive border border-destructive/20 bg-destructive/5 rounded-2xl p-4 flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                  <div className="font-semibold">Execution Error</div>
                  <div className="mt-0.5 opacity-90">{error.message}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Composer Input */}
      <div className="shrink-0 bg-transparent">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div
            className={
              "relative rounded-2xl border transition-all duration-300 " +
              (busy
                ? "border-primary shadow-[0_0_0_4px_rgba(79,70,229,0.08)] bg-white"
                : "border-border bg-white focus-within:border-primary focus-within:shadow-[0_4px_20px_rgba(15,23,42,0.04)]")
            }
          >
            <textarea
              ref={composerRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask Flovix to audit, fix theme, compare competitors, or redesign pages…"
              className="w-full bg-transparent px-4 sm:px-5 pt-4 pb-2 text-[15px] resize-none outline-none placeholder:text-muted-foreground min-h-[72px] max-h-[200px]"
              rows={2}
            />

            {/* Bottom bar: chips + send */}
            <div className="flex items-end justify-between gap-2 px-3 sm:px-4 pb-3 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <QuickChip onClick={() => {
                  setInput("Audit my store and show what's hurting my conversions");
                  onSetPanelMode("audit");
                }}>
                  <Gauge className="h-3 w-3" /> Run Audit
                </QuickChip>
                <QuickChip onClick={() => {
                  setInput("Analyze my storefront visuals and highlight key layout/color issues");
                  onSetPanelMode("browser");
                }}>
                  <Eye className="h-3 w-3" /> Visuals
                </QuickChip>
                <QuickChip onClick={() => {
                  setInput("Compare my Shopify store with Nike's design and features");
                  onSetPanelMode("browser");
                }}>
                  <Globe className="h-3 w-3" /> Compare
                </QuickChip>
              </div>

              <button
                onClick={submit}
                disabled={busy || !input.trim()}
                className="shrink-0 h-10 w-10 rounded-xl bg-primary text-primary-foreground grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary-hover shadow-md hover:shadow-lg transition-all"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickChip({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="text-[12px] px-3 py-1.5 rounded-full border border-border bg-slate-50 text-slate-600 hover:text-foreground hover:border-slate-300 transition flex items-center gap-1.5 font-medium shadow-sm hover:shadow"
    >
      {children}
    </button>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  const suggestions = [
    { icon: Gauge, label: "Audit store conversions", text: "Audit my store and show what's hurting my conversions" },
    { icon: Eye, label: "Analyze mobile visuals", text: "Analyze my storefront visuals and highlight problem areas" },
    { icon: Sparkles, label: "Optimize product page", text: "Improve my product page spacing and add trust badges" },
    { icon: Globe, label: "Compare with competitor", text: "Compare my Shopify storefront design with Nike.com" },
  ];
  return (
    <div className="flex flex-col items-center text-center py-12 md:py-20">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-3xl bg-indigo-500/10 blur-3xl scale-150" />
        <div className="relative hover:scale-105 transition-all duration-300">
          <FlovixLogo size={80} />
        </div>
      </div>
      <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-foreground">
        Flovix Shopify Engineer
      </h1>
      <p className="mt-3 text-muted-foreground max-w-md text-[16px]">
        I am your conversational Shopify engineer. I audit conversion rates, analyze competitor DOMs, write Liquid themes, and fix bugs.
      </p>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {suggestions.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => onPick(s.text)}
              className="group text-left rounded-2xl border border-border bg-white p-5 hover:border-slate-300 hover:shadow-soft transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="h-8 w-8 rounded-xl bg-primary/10 grid place-items-center text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-semibold text-sm text-foreground">{s.label}</span>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{s.text}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-4.5 flovix-fade-up">
      <div className="relative h-9 w-9 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/15 overflow-hidden p-1.5 shadow-[0_0_15px_rgba(79,70,229,0.15)] animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 animate-spin [animation-duration:8s]" />
        <FlovixLogo size={24} className="relative z-10 h-full w-full object-contain animate-fade-in" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">Flovix is executing</span>
        <span className="flex gap-1 text-slate-400">
          <span className="flovix-dot" />
          <span className="flovix-dot" />
          <span className="flovix-dot" />
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Right Context Panel
// ─────────────────────────────────────────────────────────────
function RightContextPanel({
  shop,
  panelMode,
  setPanelMode,
  latestAudit,
  latestIssues,
  auditHistory,
  mounted,
}: {
  shop: string;
  panelMode: PanelMode;
  setPanelMode: (m: PanelMode) => void;
  latestAudit: any;
  latestIssues: any[];
  auditHistory: any[];
  mounted: boolean;
}) {
  const tabs = [
    { key: "health" as PanelMode, label: "Health", icon: Activity },
    { key: "audit" as PanelMode, label: "Audit", icon: Gauge },
    { key: "browser" as PanelMode, label: "Browser", icon: Globe },
  ];

  const overallScore = latestAudit?.score ?? null;

  const scoreSpeed = latestAudit?.score_speed ?? null;
  const scoreSeo = latestAudit?.score_seo ?? null;
  const scoreUx = latestAudit?.score_ux ?? null;
  const scoreConversion = latestAudit?.score_conversion ?? null;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Panel Headers */}
      <div className="h-[64px] flex items-center justify-between px-6 shrink-0 bg-slate-50/50">
        <span className="text-[13px] font-bold uppercase tracking-wider text-slate-800">
          Context Panel
        </span>
        <div className="flex rounded-xl border border-border bg-white p-0.5">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = panelMode === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setPanelMode(t.key)}
                className={
                  "p-1.5 rounded-lg transition-all " +
                  (active ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-slate-50")
                }
                title={t.label}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {panelMode === "health" && (
          <>
            <div>
              <h3 className="text-[16px] font-bold text-foreground">Store Health</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">Aggregate visual performance metrics</p>
            </div>

            {/* Score & Gauge */}
            <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-white to-slate-50/60 rounded-3xl border border-slate-100/80 shadow-soft">
              <div className="relative h-28 w-28 flex items-center justify-center">
                <svg className="absolute w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="#F1F5F9"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    stroke="#4F46E5"
                    strokeWidth="8"
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray="301.59"
                    strokeDashoffset={301.59 - (301.59 * overallScore) / 100}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="text-center">
                  <span className="text-3xl font-extrabold text-slate-800 leading-none">{overallScore}</span>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Score</span>
                </div>
              </div>
              <div className="mt-5 text-center">
                <span className="text-[14px] font-bold text-slate-800">
                  {overallScore === null 
                    ? "Pending Audit" 
                    : overallScore >= 80 ? "Excellent" : overallScore >= 60 ? "Good Status" : "Action Needed"}
                </span>
                <span className="block text-[11px] text-muted-foreground mt-1">
                  Estimated revenue loss: <span className="font-semibold text-slate-500">
                    {latestIssues.reduce((a, i) => a + (Number(i.revenue_impact_usd) || 0), 0) > 0
                      ? `$${latestIssues.reduce((a, i) => a + (Number(i.revenue_impact_usd) || 0), 0).toLocaleString()}/mo`
                      : "—"}
                  </span>
                </span>
              </div>
            </div>

            {/* Subscores */}
            <div className="grid grid-cols-2 gap-3">
              <MiniStat progress={scoreSpeed} label="Speed" color="bg-rose-500" text="rose-500" />
              <MiniStat progress={scoreSeo} label="SEO" color="bg-amber-500" text="amber-500" />
              <MiniStat progress={scoreUx} label="UX & Design" color="bg-success" text="success" />
              <MiniStat progress={scoreConversion} label="Conversion" color="bg-amber-500" text="amber-500" />
            </div>

            {/* Historical Trend Chart */}
            {mounted && auditHistory.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Historical Trend</span>
                <div className="h-28 w-full mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={auditHistory} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        contentStyle={{ background: "#111827", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                        labelStyle={{ display: "none" }}
                      />
                      <Area type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent activity log list */}
            <div className="space-y-3">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground block">Recent activity</span>
              <div className="space-y-2">
                {latestAudit ? (
                  <ActivityLog title="Store Audit Complete" desc={`Scored ${overallScore}`} time="recently" />
                ) : (
                  <div className="text-[12px] text-slate-400 italic">No recent activity</div>
                )}
              </div>
            </div>
          </>
        )}

        {panelMode === "audit" && (
          <>
            <div>
              <h3 className="text-[16px] font-bold text-foreground">Top Issues Found</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">Prioritized by conversion & revenue impact</p>
            </div>

            <div className="space-y-3">
              {latestIssues.length > 0 ? (
                latestIssues.slice(0, 5).map((issue) => (
                  <div key={issue.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 shadow-soft space-y-3">
                    <div className="flex gap-2.5 items-start">
                      <span className="h-6 w-6 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 mt-0.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-slate-800 leading-tight">{issue.title}</div>
                        <div className="text-[11px] text-slate-500 uppercase font-semibold mt-1">
                          {issue.category} · {issue.severity} impact
                        </div>
                      </div>
                    </div>
                    {issue.revenue_impact_usd && (
                      <div className="text-[12px] text-rose-600 bg-rose-50/50 px-2.5 py-1 rounded-lg inline-block font-medium">
                        Loss: -${issue.revenue_impact_usd}/mo
                      </div>
                    )}
                    <div className="text-[12px] text-slate-600 leading-relaxed">
                      {issue.description}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 bg-slate-50 border border-slate-100 rounded-2xl">
                  <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                  <span className="text-[13px] font-semibold text-slate-700 block">Clean audit</span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">No critical issue detected on storefront.</span>
                </div>
              )}
            </div>
          </>
        )}

        {panelMode === "browser" && (
          <>
            <div>
              <h3 className="text-[16px] font-bold text-foreground">Browser Agent</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">Live DOM crawler logs & comparison logs</p>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[11px] text-slate-300 space-y-1.5 shadow-editorial">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>[AGENT] Initiating browser instance...</span>
              </div>
              <div>[HTTP] GET https://nike.com - 200 OK</div>
              <div>[DOM] Extracted 4,203 DOM nodes</div>
              <div>[SEO] Main title tag: "Nike. Just Do It."</div>
              <div>[IMG] Captured mobile & desktop screenshots</div>
              <div className="text-slate-500 font-semibold">[SYSTEM] Comparing conversion structure...</div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden shadow-soft">
              <div className="p-3 border-b border-slate-100 bg-white flex justify-between items-center">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Browser Session</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 font-medium">Pending</span>
              </div>
              <div className="h-32 bg-slate-200 grid place-items-center">
                <Globe className="h-8 w-8 text-slate-400" />
              </div>
              <div className="p-4 space-y-2 text-center text-muted-foreground text-sm">
                Ask Flovix to browse a competitor's storefront to view logs.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  progress,
  label,
  color,
  text,
}: {
  progress: number | null;
  label: string;
  color: string;
  text: string;
}) {
  return (
    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-1.5">
      <div className="flex justify-between items-center leading-none">
        <span className="text-[11px] text-slate-500 font-medium">{label}</span>
        <span className={`text-[12px] font-bold ${progress === null ? "text-slate-400" : "text-" + text}`}>
          {progress === null ? "—" : progress}
        </span>
      </div>
      <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
        <div 
          className={`h-full ${progress === null ? "bg-slate-300" : color}`} 
          style={{ width: `${progress ?? 0}%` }} 
        />
      </div>
    </div>
  );
}

function ActivityLog({
  title,
  desc,
  time,
}: {
  title: string;
  desc: string;
  time: string;
}) {
  return (
    <div className="flex gap-2 px-1">
      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-[12px] font-semibold text-slate-700 truncate">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <span className="text-[10px] text-slate-400 font-medium shrink-0">{time}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Message Formatting
// ─────────────────────────────────────────────────────────────
function ChatMessage({
  message,
  onOpenFile,
  streaming,
}: {
  message: UIMessage;
  onOpenFile: (p: string) => void;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-indigo-50/40 border border-indigo-100/30 text-slate-800 rounded-2xl rounded-tr-sm px-5 py-3.5 text-[14px] font-medium leading-relaxed shadow-soft">
          {message.parts.map((p, i) =>
            p.type === "text" ? <span key={i}>{p.text}</span> : null,
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="shrink-0 h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center shadow-md mt-0.5 border border-primary/20 overflow-hidden p-1.5 animate-fade-in">
        <FlovixLogo size={24} className="h-full w-full object-contain" />
      </div>
      <div className="flex-1 min-w-0 space-y-3 bg-gradient-to-b from-white to-slate-50/10 border border-slate-100/80 p-6 rounded-2xl shadow-soft leading-relaxed">
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <div key={i} className="prose prose-slate max-w-none text-[14px] leading-relaxed text-slate-800 prose-headings:font-serif prose-headings:tracking-tight prose-code:text-primary prose-code:bg-indigo-50/50 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-lg prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:p-4 border-none shadow-none">
                <ReactMarkdown>{part.text}</ReactMarkdown>
                {streaming && i === message.parts.length - 1 && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary align-middle animate-pulse rounded-sm" />
                )}
              </div>
            );
          }
          if (part.type.startsWith("tool-")) {
            return <ToolCard key={i} part={part as ToolPart} onOpenFile={onOpenFile} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

type ToolPart = {
  type: string;
  state?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
};

function ToolCard({
  part,
  onOpenFile,
}: {
  part: ToolPart;
  onOpenFile: (p: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const name = part.type.replace("tool-", "");
  const path =
    (part.input?.path as string | undefined) ??
    (part.output?.path as string | undefined);
  const summary = part.output?.summary as string | undefined;
  const running = part.state && part.state !== "output-available";

  const labelFor = () => {
    if (name === "write_file") return "Editing theme file";
    if (name === "read_file") return "Reading theme file";
    if (name === "list_files") return "Scanning theme index";
    return name;
  };

  return (
    <div
      className={
        "rounded-xl border transition-all overflow-hidden shadow-soft " +
        (running
          ? "border-indigo-200 bg-indigo-50/30 flovix-tool-scanning"
          : "border-border bg-white")
      }
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-slate-50/50"
      >
        <span
          className={
            "h-6 w-6 rounded-lg grid place-items-center shrink-0 " +
            (running
              ? "bg-primary text-white"
              : "bg-emerald-100 text-emerald-700 border border-emerald-200")
          }
        >
          {running ? (
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          ) : (
            <span className="text-[12px] font-bold">✓</span>
          )}
        </span>
        <span className="text-[13px] font-semibold text-slate-800">{labelFor()}</span>
        {path && (
          <code className="text-[11px] font-mono text-muted-foreground truncate flex-1 ml-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
            {path}
          </code>
        )}
        {path && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onOpenFile(path);
            }}
            role="button"
            className="text-[11px] font-semibold tracking-wide text-primary hover:underline px-2"
          >
            Open
          </span>
        )}
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && summary && (
        <div className="px-4 pb-3.5 pt-1 text-[12px] text-slate-600 border-t border-slate-100 bg-slate-50/50 leading-relaxed">
          {summary}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// IDE Editor Pane (slide-in editor)
// ─────────────────────────────────────────────────────────────
function IDEPane({
  shop,
  activePath,
  setActivePath,
  onClose,
  refreshTick,
  mobileTab,
  setMobileTab,
}: {
  shop: string;
  activePath: string | null;
  setActivePath: (p: string | null) => void;
  onClose: () => void;
  refreshTick: number;
  mobileTab: "chat" | "files" | "code" | "preview";
  setMobileTab: (t: "chat" | "files" | "code" | "preview") => void;
}) {
  const getWs = useServerFn(getWorkspace);
  const readFn = useServerFn(readFile);
  const writeFn = useServerFn(writeFile);
  const createDraft = useServerFn(createDraftTheme);
  const publish = useServerFn(publishDraft);
  const revertAllFn = useServerFn(revertAllSessionFixes);

  const [files, setFiles] = useState<string[]>([]);
  const [themeId, setThemeId] = useState<number | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [content, setContent] = useState<string>("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"code" | "preview">("code");
  const [reverting, setReverting] = useState(false);

  const handleRevertAll = async () => {
    if (!confirm("Are you sure you want to revert all fixes applied during this session? This will roll back all AI edits on the draft theme.")) return;
    setReverting(true);
    setBusy("Reverting all fixes…");
    try {
      const res = await revertAllFn({ data: { shop } });
      alert(`Successfully rolled back ${res.count} file edits.`);
      refreshWorkspace();
      setActivePath(null);
      setContent("");
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReverting(false);
      setBusy(null);
    }
  };

  const refreshWorkspace = useCallback(async () => {
    try {
      const ws = await getWs({ data: { shop } });
      setFiles(ws.files);
      setThemeId(ws.themeId);
      setHasDraft(!!ws.store.draftThemeId);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [getWs, shop]);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace, refreshTick]);

  const openFile = useCallback(
    async (path: string) => {
      if (dirty && !confirm("Discard unsaved changes?")) return;
      setActivePath(path);
      setLoadingFile(true);
      setMobileTab("code");
      try {
        const r = await readFn({ data: { shop, path } });
        setContent(r.binary ? "// binary file — preview not available" : r.content);
        setDirty(false);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoadingFile(false);
      }
    },
    [dirty, readFn, setActivePath, shop, setMobileTab],
  );

  useEffect(() => {
    if (activePath && !content && !loadingFile) {
      openFile(activePath);
    }
  }, [activePath, openFile, content, loadingFile]);

  const save = async () => {
    if (!activePath) return;
    setSaving(true);
    try {
      await writeFn({ data: { shop, path: activePath, content } });
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onCreateDraft = async () => {
    setBusy("Creating draft…");
    try {
      await createDraft({ data: { shop } });
      await refreshWorkspace();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onPublish = async () => {
    if (!confirm("Publish the Flovix draft as the live theme?")) return;
    setBusy("Publishing…");
    try {
      await publish({ data: { shop } });
      await refreshWorkspace();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const tree = useMemo(() => buildTree(files), [files]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Mobile Top Tabs for IDE */}
      <div className="flex md:hidden bg-slate-50 border-b border-border text-[13px] font-medium shrink-0">
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${mobileTab === "chat" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground"
            }`}
        >
          Chat
        </button>
        <button
          onClick={() => setMobileTab("files")}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${mobileTab === "files" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground"
            }`}
        >
          Files
        </button>
        <button
          onClick={() => setMobileTab("code")}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${mobileTab === "code" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground"
            }`}
        >
          Code
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${mobileTab === "preview" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground"
            }`}
        >
          Preview
        </button>
      </div>

      {/* Editor Main Content Area */}
      <div className="flex-1 grid grid-rows-[56px_1fr] grid-cols-[200px_1fr] min-h-0 min-w-0">
        {/* Toolbar spanning across columns */}
        <div className="col-span-2 flex items-center gap-3 px-4 bg-slate-50/50 justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
              IDE MODE
            </span>
            {!hasDraft && (
              <button
                onClick={onCreateDraft}
                className="text-[12px] font-medium px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
              >
                <Plus className="h-3 w-3 inline mr-1" />
                Create draft
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {busy && <span className="text-[12px] text-muted-foreground animate-pulse mr-2">{busy}</span>}

            {/* View selectors */}
            <div className="hidden md:flex rounded-xl border border-border bg-white p-0.5">
              <button
                onClick={() => setView("code")}
                className={
                  "text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all " +
                  (view === "code" ? "bg-primary text-white" : "text-slate-600 hover:text-foreground hover:bg-slate-50")
                }
              >
                Code
              </button>
              <button
                onClick={() => setView("preview")}
                className={
                  "text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all " +
                  (view === "preview" ? "bg-primary text-white" : "text-slate-600 hover:text-foreground hover:bg-slate-50")
                }
              >
                Preview
              </button>
            </div>

            {hasDraft && (
              <button
                onClick={handleRevertAll}
                disabled={reverting}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-40 flex items-center gap-1.5 shadow-sm transition-all"
                title="Roll back all AI edits on the draft theme"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {reverting ? "Reverting…" : "Revert All"}
              </button>
            )}

            <button
              onClick={save}
              disabled={!dirty || saving}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </button>

            {hasDraft && themeId && view === "preview" && (
              <a
                href={`https://${shop}/?preview_theme_id=${themeId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-medium px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 shadow-sm"
              >
                Open ↗
              </a>
            )}

            {hasDraft && (
              <button
                onClick={onPublish}
                className="text-[12px] font-semibold px-4 py-1.5 rounded-xl bg-primary text-white hover:bg-primary-hover shadow-md transition-all"
              >
                Publish
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 ml-1.5"
              aria-label="Close IDE"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Column 1: File tree */}
        <aside className={`border-r border-border overflow-y-auto bg-slate-50/30 flex-col min-h-0 ${mobileTab === "files" ? "flex col-span-2 md:col-span-1" : "hidden md:flex"
          }`}>
          <div className="p-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex justify-between border-b border-slate-100">
            <span>Theme files</span>
            <span className="bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-700">{files.length}</span>
          </div>
          <TreeView nodes={tree} active={activePath} onOpen={openFile} depth={0} />
          {files.length === 0 && (
            <div className="p-4 text-xs text-muted-foreground italic">
              {themeId ? "No files found." : "No active theme draft."}
            </div>
          )}
        </aside>

        {/* Column 2: Editor / Preview Pane */}
        <section className={`overflow-hidden relative bg-white flex-col h-full min-h-0 min-w-0 ${mobileTab === "code" || mobileTab === "preview" ? "flex col-span-2 md:col-span-1" : "hidden md:flex"
          }`}>
          {error && (
            <div className="absolute top-3 left-3 right-3 z-10 text-[12px] bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-lg">
              <span className="font-medium">{error}</span>
              <button className="text-[13px] opacity-70 hover:opacity-100 font-bold ml-3" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          )}

          {((view === "preview" && !isMobileTabOverridden(mobileTab)) || mobileTab === "preview") ? (
            hasDraft && themeId ? (
              <iframe
                title="Storefront preview"
                src={`https://${shop}/?preview_theme_id=${themeId}`}
                className="w-full h-full border-0 bg-white"
              />
            ) : (
              <div className="h-full grid place-items-center text-sm text-slate-500 p-6 text-center">
                Create a draft theme to activate the live preview storefront.
              </div>
            )
          ) : !activePath ? (
            <div className="h-full grid place-items-center text-center px-6">
              <div className="max-w-xs space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-primary flex items-center justify-center mx-auto shadow-sm">
                  <FileCode className="h-6 w-6" />
                </div>
                <div className="font-serif text-xl font-bold text-slate-800">Select a file</div>
                <div className="text-[12px] text-muted-foreground leading-relaxed">
                  Browse files in the left sidebar directory, or ask Flovix to make surgical edits directly in the chat panel.
                </div>
              </div>
            </div>
          ) : loadingFile ? (
            <div className="h-full grid place-items-center text-sm text-slate-500 font-medium bg-slate-50">
              <span className="animate-pulse">Loading {activePath}...</span>
            </div>
          ) : (
            <div className="h-full flex flex-col min-h-0 min-w-0">
              <div className="border-b border-slate-100 px-5 py-2.5 text-[12px] flex items-center justify-between bg-slate-50/50 shrink-0">
                <code className="text-slate-700 font-mono font-semibold truncate">{activePath}</code>
                {dirty && <span className="text-amber-600 font-bold text-[10px] uppercase tracking-wider">● Unsaved Changes</span>}
              </div>
              <div className="flex-1 min-h-0 min-w-0 relative">
                <Editor
                  theme="light"
                  language={langFor(activePath)}
                  value={content}
                  onChange={(v) => {
                    setContent(v ?? "");
                    setDirty(true);
                  }}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function isMobileTabOverridden(tab: string) {
  return tab === "chat" || tab === "files" || tab === "code";
}

// ─────────────────────────────────────────────────────────────
// File tree helpers
// ─────────────────────────────────────────────────────────────
type TreeNode = { name: string; path: string; children?: TreeNode[] };

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const p of paths) {
    const parts = p.split("/");
    let level = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      let node = level.find((n) => n.name === part);
      if (!node) {
        node = { name: part, path: acc };
        if (i < parts.length - 1) node.children = [];
        level.push(node);
      }
      if (node.children) level = node.children;
    });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const ad = !!a.children,
        bd = !!b.children;
      if (ad !== bd) return ad ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.children && sort(n.children));
  };
  sort(root);
  return root;
}

function langFor(path: string) {
  if (path.endsWith(".liquid")) return "html";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".css") || path.endsWith(".scss")) return "css";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

function TreeView({
  nodes,
  active,
  onOpen,
  depth,
}: {
  nodes: TreeNode[];
  active: string | null;
  onOpen: (p: string) => void;
  depth: number;
}) {
  return (
    <ul className="text-xs pb-3 pt-1">
      {nodes.map((n) => (
        <TreeItem key={n.path} node={n} active={active} onOpen={onOpen} depth={depth} />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  active,
  onOpen,
  depth,
}: {
  node: TreeNode;
  active: string | null;
  onOpen: (p: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(depth === 0);
  const isDir = !!node.children;
  return (
    <li>
      <button
        onClick={() => (isDir ? setOpen(!open) : onOpen(node.path))}
        className={
          "w-full text-left px-4 py-1.5 hover:bg-slate-100 transition truncate flex items-center gap-1.5 " +
          (active === node.path
            ? "bg-primary/10 text-primary font-bold border-l-2 border-primary"
            : "text-slate-600 hover:text-slate-900")
        }
        style={{ paddingLeft: 16 + depth * 12 }}
      >
        {isDir ? (
          open ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {node.name}
      </button>
      {isDir && open && node.children && (
        <TreeView nodes={node.children} active={active} onOpen={onOpen} depth={depth + 1} />
      )}
    </li>
  );
}
