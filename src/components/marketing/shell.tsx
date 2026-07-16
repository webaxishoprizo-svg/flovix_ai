import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FlovixLogo } from "@/components/brand/logo";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}

function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/auth" className="flex items-center gap-2">
          <FlovixLogo size={28} />
          <span className="text-[15px] font-semibold tracking-tight">Flovix</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/support" className="hidden text-sm text-muted-foreground hover:text-foreground transition-colors sm:inline-block">
            Support
          </Link>
          <Link
            to="/install"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Install Flovix
          </Link>
        </div>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="container-page py-12 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <FlovixLogo size={28} />
            <span className="text-[15px] font-semibold tracking-tight">Flovix</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            AI-powered growth studio for Shopify merchants. Audit, understand, and ship fixes without a consulting bill.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Product</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/pricing" className="hover:text-foreground text-muted-foreground">Pricing</Link></li>
            <li><Link to="/auth" className="hover:text-foreground text-muted-foreground">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Company</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/support" className="hover:text-foreground text-muted-foreground">Support</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container-page py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Flovix. Built for Shopify merchants.</p>
          <p className="text-xs text-muted-foreground">Made with intent · not templates</p>
        </div>
      </div>
    </footer>
  );
}
