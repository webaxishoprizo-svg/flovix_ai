import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { FlovixLogo } from "@/components/brand/logo";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Flovix" }] }),
  beforeLoad: () => {
    // Auth is Shopify-only. Send everything through the install flow.
    throw redirect({ to: "/install" });
  },
  component: AuthPage,
});

function AuthPage() {
  const [shop, setShop] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-background text-foreground grid lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between border-r border-border/60 bg-surface p-12">
        <div className="flex items-center gap-2">
          <FlovixLogo size={32} />
          <span className="text-base font-semibold tracking-tight">Flovix</span>
        </div>
        <div className="max-w-md">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">The AI growth studio</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight leading-tight">
            Connect your Shopify store to unlock AI audits, visuals, and code.
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Flovix</p>
      </aside>
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 inline-flex items-center gap-2">
            <FlovixLogo size={28} />
            <span className="text-[15px] font-semibold tracking-tight">Flovix</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Continue with Shopify</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your store domain to sign in or install Flovix.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Store domain</label>
              <input
                type="text"
                required
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                placeholder="your-store.myshopify.com"
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
          <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
            You'll be redirected to Shopify to approve access. Flovix uses OAuth — no passwords stored.
          </p>
        </div>
      </main>
    </div>
  );
}
