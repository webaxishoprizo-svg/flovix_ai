import { Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { Menu, MessageSquare, BarChart3, Settings, X, CreditCard, Sparkles, ChevronRight, Store, PanelLeft, PanelLeftClose } from "lucide-react";
import { FlovixLogo } from "@/components/brand/logo";
import { useServerFn } from "@tanstack/react-start";
import { getRecentChats } from "@/lib/chat.functions";
import { getActivePlan } from "@/lib/billing.functions";

const TABS = [
  { to: "/app", label: "AI Workspace", icon: MessageSquare },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppFrame({
  shop,
  active,
  children,
  fullBleed = false,
}: {
  shop: string;
  active: string;
  children: ReactNode;
  fullBleed?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chats, setChats] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [planName, setPlanName] = useState<string>("Basic Plan");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("flovix-sidebar-open");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("flovix-sidebar-open", String(next));
      }
      return next;
    });
  };
  
  const fetchChats = useServerFn(getRecentChats);
  const fetchPlan = useServerFn(getActivePlan);

  useEffect(() => {
    if (shop) {
      fetchChats({ data: { shop } })
        .then((res) => {
          if (res?.chats) setChats(res.chats);
        })
        .catch((e) => console.error(e));
        
      fetchPlan({ data: { shop } })
        .then((res) => {
          if (res?.charge?.plan_name) {
            setPlanName(`${res.charge.plan_name} Plan`);
          }
        })
        .catch((e) => console.error(e));
    }
  }, [shop, fetchChats, fetchPlan]);

  const cleanShopName = shop ? shop.replace(".myshopify.com", "") : "";
  const displayShopName = cleanShopName
    ? cleanShopName.charAt(0).toUpperCase() + cleanShopName.slice(1) + " Store"
    : "Shopify Store";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col md:flex-row">
      {/* Floating Open Sidebar Button */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="hidden md:flex fixed top-[14px] left-4 z-40 p-2 rounded-xl bg-white border border-slate-200/60 hover:bg-slate-50 text-slate-500 hover:text-slate-800 shadow-soft transition-all hover:scale-105"
          title="Open sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      )}

      {/* Desktop Left Sidebar */}
      <aside className={`hidden md:flex flex-col w-[240px] fixed top-0 bottom-0 left-0 bg-white border-r border-border shadow-[2px_0_8px_rgba(15,23,42,0.02)] z-20 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Header/Logo */}
        <div className="h-[64px] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <FlovixLogo size={36} />
            <span className="font-serif text-[20px] font-bold tracking-tight text-primary">Flovix</span>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 shrink-0">
          {TABS.map((t) => {
            const isActive = t.to === active;
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                search={{ shop } as never}
                className={
                  "text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-3 border " +
                  (isActive
                    ? "bg-primary/5 text-primary border-primary/10 font-bold shadow-soft"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-transparent")
                }
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>

        {/* Recent Chats Section */}
        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col min-h-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground px-4 py-2 shrink-0">
            Recent Chats
          </div>
          <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
            {chats.map((c) => (
              <Link
                key={c.id}
                to="/app"
                search={{ shop } as never}
                className="block text-[13px] text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-slate-50 transition truncate max-w-full font-normal"
                title={c.title}
              >
                # {c.title || "Chat session"}
              </Link>
            ))}
            {chats.length === 0 && (
              <div className="text-[12px] text-muted-foreground/60 px-4 py-3 italic">
                No recent chats
              </div>
            )}
          </div>
        </div>

        {/* Footer Area: Store Selector, Subscription, Settings */}
        <div className="p-4 space-y-3 shrink-0 bg-white">
          {/* Store Selector */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/60 border border-slate-100/80 backdrop-blur-sm">
            <div className="h-8.5 w-8.5 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/5">
              <Store className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-slate-800 truncate leading-tight">
                {displayShopName}
              </div>
              <div className="text-[11px] text-slate-400 truncate leading-none mt-1">
                {shop}
              </div>
            </div>
          </div>

          {/* Subscription Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/40 to-slate-50/60 border border-indigo-100/40 flex flex-col gap-2.5">
            <div className="flex items-center justify-between leading-none">
              <span className="text-[12px] font-bold text-indigo-955">{planName}</span>
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            </div>
            <div className="flex items-center justify-between text-[10.5px] font-medium leading-none">
              <span className="text-indigo-950/70">Plan is active</span>
              <Link 
                to="/app/settings" 
                search={{ shop } as never} 
                className="font-bold text-primary hover:underline"
              >
                Manage
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <header className="md:hidden flex items-center justify-between px-4 h-[56px] bg-white sticky top-0 z-30 w-full shrink-0">
        <Link to="/app" search={{ shop } as never} className="flex items-center gap-2.5">
          <FlovixLogo size={30} />
          <span className="font-serif text-[18px] font-bold tracking-tight text-primary">Flovix</span>
        </Link>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white/95 backdrop-blur-xl flovix-fade-up flex flex-col">
          <div className="flex items-center justify-between h-[56px] px-4">
            <div className="flex items-center gap-2.5">
              <FlovixLogo size={30} />
              <span className="font-serif text-[18px] font-bold text-primary">Flovix</span>
            </div>
            <button 
              onClick={() => setMenuOpen(false)} 
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <nav className="p-4 space-y-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = t.to === active;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  search={{ shop } as never}
                  onClick={() => setMenuOpen(false)}
                  className={
                    "flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-medium " +
                    (isActive
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-foreground hover:bg-muted")
                  }
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </Link>
              );
            })}
          </nav>
          
          <div className="mt-auto p-6 border-t border-border bg-slate-50 space-y-3">
            <div className="text-[11px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
              Connected Store
            </div>
            <div className="text-sm font-semibold text-foreground truncate">{displayShopName}</div>
            <div className="text-xs text-muted-foreground truncate">{shop}</div>
            
            <div className="mt-4 pt-3 flex items-center justify-between text-xs border-t border-slate-200">
              <span className="font-medium text-slate-700">{planName}</span>
              <Link 
                to="/app/settings" 
                search={{ shop } as never} 
                onClick={() => setMenuOpen(false)}
                className="font-semibold text-primary hover:underline"
              >
                Manage Plan
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Page Area */}
      <main className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${sidebarOpen ? "md:pl-[240px]" : "md:pl-0"} ${fullBleed ? "" : "p-4 md:p-8"}`}>
        {children}
      </main>
    </div>
  );
}

export function useShop() {
  const s = useSearch({ strict: false }) as { shop?: string };
  return s.shop ?? "";
}
