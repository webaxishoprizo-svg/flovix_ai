import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { MarketingShell } from "@/components/marketing/shell";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Flovix" },
      { name: "description", content: "Simple, transparent plans for Shopify merchants of every size." },
    ],
  }),
  component: PricingPage,
});

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    tag: "Try it",
    for: "Kicking the tires",
    features: ["1 store audit", "Basic AI assistant", "Read-only reports", "Community support"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Growth",
    price: "$29",
    cadence: "/ month",
    tag: "Most popular",
    for: "Small stores getting serious",
    features: ["Daily audits", "Full issue tracking", "AI assistant chat", "Email reports"],
    cta: "Start Growth",
    featured: true,
  },
  {
    name: "Pro",
    price: "$79",
    cadence: "/ month",
    tag: "Best value",
    for: "Growing merchants",
    features: ["Everything in Growth", "Coding agent access", "Competitor insights", "Weekly executive reports"],
    cta: "Start Pro",
    featured: false,
  },
  {
    name: "Agency",
    price: "$399",
    cadence: "/ month",
    tag: "For teams",
    for: "Agencies & multi-store",
    features: ["Multiple stores", "Team seats", "Priority support", "Advanced workflows"],
    cta: "Contact us",
    featured: false,
  },
];

function PricingPage() {
  return (
    <MarketingShell>
      <section className="pt-20 pb-10">
        <div className="container-page text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Pricing</p>
          <h1 className="mt-4 text-5xl md:text-6xl font-semibold tracking-tight text-balance">
            Plans that grow with your store.
          </h1>
          <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
            Start on the free plan. Upgrade when audits, reports, and the coding agent start paying for themselves.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="container-page grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                p.featured
                  ? "border-primary bg-primary text-primary-foreground shadow-editorial"
                  : "border-border bg-surface-elevated"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-background px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-foreground border border-border">
                  {p.tag}
                </span>
              )}
              <div>
                <p className={`text-xs uppercase tracking-widest ${p.featured ? "opacity-70" : "text-muted-foreground"}`}>
                  {p.name}
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
                  <span className={`text-sm ${p.featured ? "opacity-70" : "text-muted-foreground"}`}>{p.cadence}</span>
                </div>
                <p className={`mt-1 text-sm ${p.featured ? "opacity-80" : "text-muted-foreground"}`}>{p.for}</p>
              </div>

              <ul className="mt-6 space-y-3 text-sm flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={`h-4 w-4 mt-0.5 shrink-0 ${p.featured ? "" : "text-primary"}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/auth"
                search={{ mode: "signup" as const }}
                className={`mt-7 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 ${
                  p.featured
                    ? "bg-background text-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {p.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="container-page mt-10 text-center">
          <p className="text-xs text-muted-foreground">Billed via Shopify. Cancel or downgrade anytime.</p>
        </div>
      </section>
    </MarketingShell>
  );
}
