import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FlovixLogo } from "@/components/brand/logo";
import { Gauge, Code2, Globe, Lock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/install")({
  component: InstallPage,
  head: () => ({
    meta: [
      { title: "Install Flovix on your Shopify store" },
      {
        name: "description",
        content:
          "Connect your Shopify store to Flovix — the AI theme editor that turns your storefront premium.",
      },
    ],
  }),
});

function InstallPage() {
  const [shop, setShop] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let s = shop.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!s.endsWith(".myshopify.com")) {
      if (/^[a-z0-9][a-z0-9-]*$/.test(s)) s = `${s}.myshopify.com`;
      else {
        setError("Enter a valid store domain, e.g. my-store.myshopify.com");
        return;
      }
    }
    setBusy(true);
    window.location.href = `/api/public/shopify/install?shop=${encodeURIComponent(s)}`;
  }

  return (
    <main 
      className="min-h-screen flex items-center justify-center px-6 relative py-12"
      style={{
        backgroundColor: "#F8FAFC",
        backgroundImage: `
          radial-gradient(at 0% 0%, hsla(168, 55%, 94%, 0.7) 0px, transparent 50%),
          radial-gradient(at 100% 100%, hsla(230, 60%, 95%, 0.7) 0px, transparent 50%),
          radial-gradient(at 50% 0%, hsla(242, 60%, 96%, 0.4) 0px, transparent 50%)
        `,
      }}
    >
      <div className="w-full max-w-[440px] bg-white rounded-[24px] border border-slate-100 shadow-[0_12px_40px_rgba(15,23,42,0.06)] p-8 md:p-10 space-y-8 relative z-10 flovix-fade-up">
        {/* Brand Logo Container */}
        <div className="flex flex-col items-center">
          <div className="mb-4 hover:scale-105 transition-all">
            <FlovixLogo size={64} />
          </div>
          <h1 className="text-[22px] font-extrabold text-slate-800 text-center tracking-tight leading-tight">
            Connect your Shopify store
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground text-center">
            Enter your store domain to get started with Flovix.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="shop-url" className="text-[12px] font-semibold text-slate-700 block mb-1.5">
              Store URL
            </label>
            <input
              id="shop-url"
              type="text"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="yourstore.myshopify.com"
              className="w-full bg-slate-50/50 border border-slate-200 px-4 py-3 rounded-xl text-[14px] text-slate-800 placeholder:text-muted-foreground/75 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
              autoFocus
              required
            />
          </div>
          {error && <p className="text-[11px] font-medium text-rose-500">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary hover:bg-primary/95 active:scale-[0.98] text-white text-[14px] font-bold py-3 px-4 rounded-xl shadow-[0_4px_16px_rgba(79,70,229,0.18)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.25)] transition-all flex items-center justify-center gap-2"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Connect Store"
            )}
          </button>
        </form>

        {/* Bullet Features List */}
        <div className="space-y-4.5 pt-2 border-t border-slate-100">
          <div className="flex gap-3.5 text-left items-start">
            <span className="h-8.5 w-8.5 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5 border border-primary/5">
              <Gauge className="h-4 w-4" />
            </span>
            <div>
              <span className="text-[13px] font-bold text-slate-800 block">AI Conversion Audits</span>
              <span className="text-[11.5px] text-muted-foreground block mt-0.5 leading-relaxed">
                Real-time scans of product &amp; checkout pages to find conversion leaks.
              </span>
            </div>
          </div>

          <div className="flex gap-3.5 text-left items-start">
            <span className="h-8.5 w-8.5 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5 border border-primary/5">
              <Code2 className="h-4 w-4" />
            </span>
            <div>
              <span className="text-[13px] font-bold text-slate-800 block">Auto-applied Code Fixes</span>
              <span className="text-[11.5px] text-muted-foreground block mt-0.5 leading-relaxed">
                Fast, one-click layout &amp; styling modifications applied directly to your theme.
              </span>
            </div>
          </div>

          <div className="flex gap-3.5 text-left items-start">
            <span className="h-8.5 w-8.5 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5 border border-primary/5">
              <Globe className="h-4 w-4" />
            </span>
            <div>
              <span className="text-[13px] font-bold text-slate-800 block">Competitor Audits</span>
              <span className="text-[11.5px] text-muted-foreground block mt-0.5 leading-relaxed">
                Automated visual and structure comparison insights against top benchmarks.
              </span>
            </div>
          </div>
        </div>

        {/* Secure Message Footer */}
        <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 pt-5 border-t border-slate-100">
          <Lock className="h-3 w-3 text-slate-400" />
          <span>Secure OAuth via Shopify Partner API</span>
        </div>
      </div>
    </main>
  );
}
