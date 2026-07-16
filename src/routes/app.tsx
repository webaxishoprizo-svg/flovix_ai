import { createFileRoute, Outlet, useLocation, Link } from "@tanstack/react-router";
import { z } from "zod";
import { FlovixLogo } from "@/components/brand/logo";
import { AppFrame } from "@/components/app/app-frame";

const searchSchema = z.object({
  shop: z.string().optional(),
  host: z.string().optional(),
});

export const Route = createFileRoute("/app")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AppLayout,
});

function AppLayout() {
  const { shop } = Route.useSearch();
  const location = useLocation();

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

  return (
    <AppFrame shop={shop} active={location.pathname} fullBleed>
      <Outlet />
    </AppFrame>
  );
}
