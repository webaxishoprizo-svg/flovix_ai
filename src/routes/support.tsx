import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/shell";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({
    meta: [
      { title: "Support — Flovix" },
      {
        name: "description",
        content: "Get help with Flovix — the AI theme editor for Shopify merchants.",
      },
    ],
  }),
});

function SupportPage() {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-6 py-24 text-[#0a0a0a]">
        <p className="text-[10px] uppercase tracking-[0.25em] opacity-60">Help</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight">Support</h1>
        <p className="mt-4 text-sm opacity-80">
          We respond to every merchant email within one business day.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <a
            href="mailto:support@flovix.app"
            className="border border-black/10 p-6 hover:border-black/30"
          >
            <div className="text-[10px] uppercase tracking-[0.25em] opacity-60">
              General & Technical
            </div>
            <div className="mt-2 font-serif text-xl">support@flovix.app</div>
          </a>
          <a
            href="mailto:privacy@flovix.app"
            className="border border-black/10 p-6 hover:border-black/30"
          >
            <div className="text-[10px] uppercase tracking-[0.25em] opacity-60">
              Privacy & Data Requests
            </div>
            <div className="mt-2 font-serif text-xl">privacy@flovix.app</div>
          </a>
        </div>

        <div className="mt-12 space-y-6 text-sm">
          <div>
            <h2 className="font-serif text-xl">Quick answers</h2>
          </div>
          <details className="border-t border-black/10 pt-4">
            <summary className="cursor-pointer font-medium">
              Will Flovix edit my live theme?
            </summary>
            <p className="mt-2 opacity-80">
              No. Flovix duplicates your live theme into a draft and edits the
              draft. You explicitly click <b>Publish</b> to promote it.
            </p>
          </details>
          <details className="border-t border-black/10 pt-4">
            <summary className="cursor-pointer font-medium">
              Can I undo an AI change?
            </summary>
            <p className="mt-2 opacity-80">
              Yes. Every edit — human or AI — is snapshotted. Open the History
              tab and click <b>Revert</b> to roll back any file.
            </p>
          </details>
          <details className="border-t border-black/10 pt-4">
            <summary className="cursor-pointer font-medium">
              How do I cancel my subscription?
            </summary>
            <p className="mt-2 opacity-80">
              From your Shopify Admin: <i>Settings → Apps and sales channels →
              Flovix → Uninstall</i>. Shopify stops billing immediately.
            </p>
          </details>
          <details className="border-t border-black/10 pt-4">
            <summary className="cursor-pointer font-medium">
              What data does Flovix store?
            </summary>
            <p className="mt-2 opacity-80">
              Short version: shop info, encrypted access token, theme file
              versions, chat history, and audit reports.
            </p>
          </details>
        </div>
      </article>
    </MarketingShell>
  );
}
