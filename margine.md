# Flovix — Margins, Expenses & Profit Model

Currency: **USD**. Timeframe: **per month**. All numbers are conservative real-world estimates from public pricing (Lovable Cloud/Supabase, Lovable AI Gateway, Cloudflare Workers, Google PageSpeed API, Shopify Partner fees) as of 2026.

> Shopify keeps a **revenue share** on billing. New Partners: **0% up to $1M/yr**, then 15%. We assume **0%** in the base case and show a "with Shopify fee" line for scale.

---

## 1. Pricing (per merchant / month)

| Plan     | Price      | Trial  | Positioning                                   |
| -------- | ---------- | ------ | --------------------------------------------- |
| Basic    | $0         | —      | Suggestions only, no auto-fix                 |
| Growth   | **$29**    | 7 days | 20 AI fixes/day                               |
| Pro      | **$79**    | 7 days | 100 AI fixes/day, coding agent                |
| Agency   | **$399**   | 7 days | Unlimited + fully autonomous, multi-store     |

**Blended ARPU** (assumed mix: 40% Growth, 45% Pro, 15% Agency of paying users):
`0.40 × 29 + 0.45 × 79 + 0.15 × 399 = 11.60 + 35.55 + 59.85 =` **$107.00 / paying merchant**

We assume **60% of installs convert to paid** (post-trial). So blended revenue per install ≈ `0.60 × 107 =` **$64.20**.

---

## 2. Fixed monthly expenses (platform baseline)

These costs exist even with 0 customers.

| Item                              | Monthly    | Notes                                             |
| --------------------------------- | ---------- | ------------------------------------------------- |
| Lovable Cloud (Supabase Pro)      | $25        | DB, Auth, Storage baseline                        |
| Cloudflare Workers (Paid plan)    | $5         | Includes 10M requests + KV                        |
| Domain + email (Resend/Postmark)  | $15        | flovix.app + transactional email                  |
| Monitoring (Sentry team)          | $26        | Error tracking                                    |
| Shopify Partner account           | $0         | Free                                              |
| Google PageSpeed API              | $0         | Free tier (25k queries/day)                       |
| GitHub / CI                       | $4         | Team seat                                         |
| Logging / analytics (PostHog)     | $0         | Free tier below 1M events                         |
| **Fixed total**                   | **$75**    |                                                   |

Founder / support labor is **not** counted here — treat that as owner draw from profit.

---

## 3. Variable cost per active merchant (per month)

Driven by AI tokens, DB storage, Shopify Asset API traffic, PageSpeed calls.

### 3.1 Cost assumptions

- **Chat / agent LLM**: Gemini 3 Flash via Lovable AI Gateway.
  - Input: **$0.30 / 1M tokens** · Output: **$2.50 / 1M tokens** (Flash pricing tier)
  - Avg turn: 4k input + 1.5k output tokens.
  - Cost per turn ≈ `(4000/1M)×0.30 + (1500/1M)×2.50` = **$0.00495 ≈ $0.005**
- **Audit run**: 30 files scanned + JSON report = ~25k input + 4k output tokens.
  - Cost per audit ≈ `(25000/1M)×0.30 + (4000/1M)×2.50` = **$0.0175 ≈ $0.018**
- **PageSpeed**: free.
- **Supabase storage + egress per merchant**: ~$0.05 (file_versions + audit history).
- **Shopify Admin API**: free (rate-limited but no cost).

### 3.2 Usage assumptions per plan (per merchant / month)

| Plan   | AI turns / mo | Audits / mo | LLM cost | DB cost | **Variable / merchant** |
| ------ | ------------- | ----------- | -------- | ------- | ----------------------- |
| Basic  | 15            | 1           | $0.09    | $0.03   | **$0.12**               |
| Growth | 150           | 4           | $0.82    | $0.06   | **$0.88**               |
| Pro    | 500           | 12          | $2.72    | $0.08   | **$2.80**               |
| Agency | 2,000         | 30          | $10.54   | $0.15   | **$10.69**              |

**Blended variable cost / paying merchant** at the mix above:
`0.40 × 0.88 + 0.45 × 2.80 + 0.15 × 10.69 = 0.35 + 1.26 + 1.60 =` **$3.21**

Adding a 20% safety buffer for retries, tool loops, and edge cases → **$3.85 / paying merchant**.

For free (Basic) users we assume 1 Basic user per 2 paying users → 0.5 × $0.12 = **$0.06 extra per paying merchant**.

**Effective variable cost per paying merchant ≈ $3.91.**

---

## 4. Scenarios: 1 · 100 · 1,000 customers

Assumes the mix above and the effective variable cost. "Customers" = paying merchants.

### 4.1 Per single paying customer (average)

| Line                       | Value       |
| -------------------------- | ----------- |
| Revenue (ARPU)             | $107.00     |
| Variable cost              | –$3.91      |
| Share of fixed cost ($75)  | –$75.00     |
| **Profit (1 customer)**    | **$28.09**  |
| **Margin**                 | **26.3%**   |

> Note: fixed cost dominates until scale. Break-even is at **~1 paying customer** on the blended plan, but only ~3 Growth-only customers.

### 4.2 100 paying customers

| Line                                | Value          |
| ----------------------------------- | -------------- |
| Revenue: `100 × 107`                | $10,700        |
| Variable cost: `100 × 3.91`         | –$391          |
| Fixed cost                          | –$75           |
| Shopify fee (0% under $1M ARR)      | $0             |
| **Gross profit**                    | **$10,234**    |
| **Margin**                          | **95.6%**      |
| **Profit per head**                 | **$102.34**    |

If Shopify's 15% kicked in: profit = $10,700 × 0.85 − $391 − $75 = **$8,629 (80.6%)** → per head **$86.29**.

### 4.3 1,000 paying customers

Additional scale costs kick in: bigger Supabase plan, Sentry business, more logging, part-time support.

| Item                             | Monthly  |
| -------------------------------- | -------- |
| Supabase Team                    | $599     |
| Cloudflare Workers Paid + KV     | $50      |
| Sentry Business                  | $80      |
| Support / part-time contractor   | $2,500   |
| Marketing / SEO tooling          | $500     |
| Misc (email volume, monitoring)  | $150     |
| **Scaled fixed cost**            | **$3,879** |

| Line                                | Value          |
| ----------------------------------- | -------------- |
| Revenue: `1000 × 107`               | $107,000       |
| Variable cost: `1000 × 3.91`        | –$3,910        |
| Scaled fixed cost                   | –$3,879        |
| Shopify fee (15% over $1M ARR)      | –$16,050       |
| **Gross profit**                    | **$83,161**    |
| **Margin**                          | **77.7%**      |
| **Profit per head**                 | **$83.16**     |

Annualized: **$107k MRR ≈ $1.28M ARR**, profit ≈ **$998k / year**.

---

## 5. Summary table

| Scale   | Revenue / mo | Variable | Fixed  | Shopify fee | Profit / mo | Margin | Profit / head |
| ------- | ------------ | -------- | ------ | ----------- | ----------- | ------ | ------------- |
| 1       | $107         | $4       | $75    | $0          | **$28**     | 26%    | $28           |
| 100     | $10,700      | $391     | $75    | $0          | **$10,234** | 96%    | **$102**      |
| 1,000   | $107,000     | $3,910   | $3,879 | $16,050     | **$83,161** | 78%    | **$83**       |

---

## 6. Sensitivity notes

- **If Agency mix rises to 25%** (agencies adopting faster), ARPU jumps to ~$142, margin at 1k customers pushes above **82%**.
- **If LLM costs double** (heavier autonomous use), variable per merchant ≈ $7.50, still <10% of ARPU.
- **Basic → paid conversion** is the biggest lever. Every +5% conversion adds ~$5.35 per install.
- **Refunds/churn buffer**: assume 8% monthly churn; LTV per paying customer at ARPU $107 and 26% net margin ≈ **$347**. CAC target ≤ **$120** for healthy payback (<4 months).

---

## 7. Takeaway

Flovix is a high-margin SaaS at every scale. The **Agency $399** tier is the single biggest margin lever — one Agency customer pays for ~14 Growth customers and costs less than 3× to serve. Focus growth on Pro + Agency conversion; treat Basic as pure lead-gen.
