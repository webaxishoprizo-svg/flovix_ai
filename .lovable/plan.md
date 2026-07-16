# Flovix AI-First Redesign

Transform the current multi-page app into a Claude/Cursor-style AI operating system with only three pages: **AI Workspace**, **Reports**, **Settings**. All backend, APIs, database, auth, audit engine, visual engine, competitor engine, code-gen, and billing stay untouched — this is a frontend architecture + UX migration.

## Scope

**Keep as-is:** every file under `src/lib/*.functions.ts`, `src/lib/*.server.ts`, `src/routes/api/**`, `src/integrations/**`, `supabase/**`, `src/lib/audit.functions.ts`, `src/lib/visual.*`, `src/lib/competitors.functions.ts`, `src/lib/metrics.functions.ts`, `src/lib/notifications.functions.ts`, `src/lib/billing.functions.ts`, `src/lib/theme.functions.ts`, `src/lib/plan.server.ts`.

**Replace/consolidate:** the app-shell UI, navigation, and per-feature pages.

## New route map

- `/app` → **AI Workspace** (default; conversation-first with adaptive panels)
- `/app/reports` → **Reports** (redesigned analytics)
- `/app/settings` → **Settings** (unified: Shopify, billing, competitors, notifications, AI prefs)
- Delete/redirect: `/app/action-plan`, `/app/visual`, `/app/competitors`, `/app/notifications` → redirect to `/app`
- Keep marketing routes (`/`, `/pricing`, `/auth`, `/install`, `/privacy`, `/terms`, `/support`, `/dashboard` marketing)

## AI Workspace architecture

Single conversation surface with an **adaptive right panel** that morphs based on the active AI tool:

- **Default mode:** centered Claude-style conversation, generous whitespace, no side panel.
- **Audit mode:** right panel slides in with animated score ring, category breakdown, revenue-impact list, streaming issues.
- **Visual mode:** right panel shows storefront screenshot with annotated overlays + before/after.
- **IDE mode:** three-pane layout — chat (left), Monaco editor + file tree (center), live preview iframe (right). Top toolbar: Preview, Apply, Revert, Copy, Save Snippet, History.
- **Report/chart mode:** inline chart cards render inside the assistant message.

Mode is inferred from the last assistant tool call (`run_audit`, `run_visual`, `write_file`, `read_file`, `list_files`, `compare_competitors`, `get_metrics`). Smooth Framer-Motion-style transitions between modes; no route change.

## Message parts renderer

Extend `message.parts` handling so assistant messages can render rich blocks:
- `AuditCard`, `ScoreRing`, `RevenueImpactList`, `IssueRow`
- `VisualOverlay` (screenshot + hotspots)
- `CodeDiffBlock` (before/after with syntax highlight)
- `MetricsChart` (recharts area/line)
- `CompetitorCompareCard`
- `ActionButton` (calls existing server fns)
- `ProgressStream` (live audit/visual progress)

Text parts render through `react-markdown` with prose styling. Tool invocation parts render as collapsible activity cards ("Auditing store…", "Editing product.liquid").

## Backend tool expansion

Add these tools to `src/routes/api/chat.ts` so AI can orchestrate existing engines without user leaving chat:
- `run_audit` → calls `runAudit`
- `run_visual` → calls `runVisualAudit`
- `list_competitors` / `snapshot_competitor` → calls `competitors.functions`
- `get_metrics` → calls `metrics.functions`
- `get_latest_audit` → surfaces prior audit inline

Existing `list_files`/`read_file`/`write_file` stay. All tool bodies stream progress through the UI message stream.

## Visual language

- Light theme primary; dark accents optional
- Flovix logo everywhere; soft blue gradient (matches logo) for primary accents
- Typography: Instrument Serif for display + Inter for body (already loaded)
- 6px button radius (existing rule), 16–20px card radius
- Subtle shadows (`shadow-elegant` token), gradient tokens
- Framer Motion for panel transitions, message enter animations, score ring animation, streaming shimmer

## Mobile

- Top bar with hamburger (no bottom nav)
- Drawer: AI Workspace, Reports, Settings, Recent Chats, Store selector, Plan status, Profile
- IDE mode collapses to tabs: Chat / Files / Code / Preview / Changes

## Settings unification

Merge current `/app/settings` + `/app/competitors` + `/app/notifications` into a tabbed Settings page:
- Store & Shopify connection
- Billing & Plan (uses existing `billing.functions`)
- Competitors (add/remove, uses existing `competitors.functions`)
- Notifications (existing table)
- AI preferences (auto-fix toggle, auto-audit schedule)

## Reports redesign

Executive dashboard using existing `metrics.functions`, `audits`, `visual_audits`, `reports` tables:
- Hero: current store score with animated ring
- Revenue/orders trend (recharts area chart)
- Audit history timeline
- Applied fixes list
- Competitor delta
- Export PDF button (wires to existing report generation stub)

## File plan

**New files:**
- `src/components/workspace/workspace-shell.tsx` — adaptive layout controller
- `src/components/workspace/conversation.tsx` — AI Elements-based transcript
- `src/components/workspace/composer.tsx` — prompt input with quick actions
- `src/components/workspace/sidebar.tsx` — recent chats, store selector
- `src/components/workspace/panels/audit-panel.tsx`
- `src/components/workspace/panels/visual-panel.tsx`
- `src/components/workspace/panels/ide-panel.tsx`
- `src/components/workspace/message-parts/*` (audit-card, code-diff, chart, competitor, progress-stream)
- `src/components/reports/*` (score-hero, revenue-chart, audit-timeline)
- `src/components/settings/*` (tab components)
- `src/lib/workspace-mode.ts` — mode inference hook

**Rewritten files:**
- `src/routes/app.tsx` — becomes AI Workspace shell
- `src/routes/app.reports.tsx` — redesigned reports
- `src/routes/app.settings.tsx` — unified tabbed settings
- `src/routes/api/chat.ts` — add audit/visual/metrics/competitor tools
- `src/components/app/app-frame.tsx` — simplified 3-tab nav

**Deleted routes (redirect to /app):**
- `src/routes/app.action-plan.tsx`
- `src/routes/app.visual.tsx`
- `src/routes/app.competitors.tsx`
- `src/routes/app.notifications.tsx`

## Execution order

1. Install AI Elements (conversation, message, prompt-input, tool, shimmer, response)
2. Build workspace shell + mode controller + conversation transport
3. Build message-part renderers (audit card, code diff, chart, progress)
4. Expand chat API with audit/visual/metrics/competitor tools
5. Replace `/app` with new shell; wire IDE panel with existing Monaco setup
6. Redesign Reports + Settings pages
7. Delete obsolete routes, add redirects
8. Mobile drawer + IDE tabs
9. Polish animations, typecheck, verify

Preserves 100% of backend and business logic; only frontend architecture changes.
