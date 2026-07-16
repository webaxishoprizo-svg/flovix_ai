// Puppeteer-free storefront analyzer: fetches HTML with mobile/desktop UA
// and extracts CTA, reviews, trust badges, urgency, and font signals.
const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const UA_DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

export interface DomSignals {
  device: "mobile" | "desktop";
  url: string;
  ctaVisible: boolean;
  reviewsDetected: boolean;
  trustBadges: boolean;
  urgencyDetected: boolean;
  fontCount: number;
  imageCount: number;
  h1Count: number;
  bytes: number;
  title: string | null;
  metaDescription: string | null;
  score: number;
  hits: Record<string, boolean>;
}

const RE = {
  cta: /add[\s_-]*to[\s_-]*cart|buy[\s_-]*now|shop[\s_-]*now|add-to-cart|product-form__submit/i,
  reviews:
    /trustpilot|yotpo|judge\.me|okendo|loox|stamped|reviews-stars|star-rating|"reviewRating"|itemprop=["']review/i,
  trust:
    /trust[\s_-]*badge|secure[\s_-]*checkout|money[\s_-]*back|30[\s_-]*day[\s_-]*guarantee|ssl[\s_-]*secure|verified/i,
  urgency:
    /only \d+ left|sale ends|hurry|limited time|countdown|selling fast|going fast/i,
  font: /@font-face|fonts\.googleapis\.com|fonts\.gstatic\.com|<link[^>]+font/gi,
};

export async function analyzeStorefront(
  shopDomain: string,
  device: "mobile" | "desktop" = "mobile",
): Promise<DomSignals> {
  const url = `https://${shopDomain}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": device === "mobile" ? UA_MOBILE : UA_DESKTOP,
      Accept: "text/html,application/xhtml+xml",
    },
  });
  const html = await res.text();
  const bytes = html.length;

  const hits = {
    cta: RE.cta.test(html),
    reviews: RE.reviews.test(html),
    trust: RE.trust.test(html),
    urgency: RE.urgency.test(html),
  };
  const fontCount = (html.match(RE.font) ?? []).length;
  const imageCount = (html.match(/<img\b/gi) ?? []).length;
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const title = (/<title>([^<]{1,200})<\/title>/i.exec(html) ?? [])[1] ?? null;
  const meta =
    (/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,300})/i.exec(html) ?? [])[1] ??
    null;

  let score = 100;
  if (!hits.cta) score -= 25;
  if (!hits.reviews) score -= 15;
  if (!hits.trust) score -= 10;
  if (!hits.urgency) score -= 5;
  if (fontCount > 4) score -= 10;
  if (h1Count !== 1) score -= 5;
  if (bytes > 500_000) score -= 10;
  if (!meta) score -= 10;
  score = Math.max(0, Math.min(100, score));

  return {
    device,
    url,
    ctaVisible: hits.cta,
    reviewsDetected: hits.reviews,
    trustBadges: hits.trust,
    urgencyDetected: hits.urgency,
    fontCount,
    imageCount,
    h1Count,
    bytes,
    title,
    metaDescription: meta,
    score,
    hits,
  };
}
