// Google PageSpeed Insights (Lighthouse) fetcher. No API key required for low volume.
export interface PageSpeedResult {
  url: string;
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  lcp: string | null;
  cls: string | null;
  tbt: string | null;
  opportunities: { id: string; title: string; description: string; savingsMs?: number }[];
}

export async function runPageSpeed(shopDomain: string): Promise<PageSpeedResult> {
  const url = `https://${shopDomain}`;
  const api =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}` +
    `&strategy=mobile&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES`;
  const res = await fetch(api);
  if (!res.ok) throw new Error(`PageSpeed API: ${res.status}`);
  const json = (await res.json()) as any;
  const cats = json.lighthouseResult?.categories ?? {};
  const audits = json.lighthouseResult?.audits ?? {};
  const opps: PageSpeedResult["opportunities"] = [];
  for (const [id, a] of Object.entries<any>(audits)) {
    if (a?.details?.type === "opportunity" && (a.numericValue ?? 0) > 100) {
      opps.push({
        id,
        title: a.title,
        description: a.description?.replace(/\[.*?\]\(.*?\)/g, "") ?? "",
        savingsMs: Math.round(a.numericValue ?? 0),
      });
    }
  }
  opps.sort((a, b) => (b.savingsMs ?? 0) - (a.savingsMs ?? 0));
  return {
    url,
    performance: cats.performance?.score != null ? Math.round(cats.performance.score * 100) : null,
    seo: cats.seo?.score != null ? Math.round(cats.seo.score * 100) : null,
    accessibility:
      cats.accessibility?.score != null ? Math.round(cats.accessibility.score * 100) : null,
    bestPractices:
      cats["best-practices"]?.score != null
        ? Math.round(cats["best-practices"].score * 100)
        : null,
    lcp: audits["largest-contentful-paint"]?.displayValue ?? null,
    cls: audits["cumulative-layout-shift"]?.displayValue ?? null,
    tbt: audits["total-blocking-time"]?.displayValue ?? null,
    opportunities: opps.slice(0, 10),
  };
}
