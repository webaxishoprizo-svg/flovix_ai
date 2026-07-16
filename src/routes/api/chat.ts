// Streaming AI chat via Lovable AI Gateway.
// Attempts full Shopify-aware flow with tools; falls back to plain chat if the
// merchant store cannot be resolved so the assistant is always responsive.
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";

import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
} from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are Flovix, an elite Shopify theme engineer and CRO analyst.

Style:
- Editorial, calm, expert. Never chatty. Answer in tight, structured markdown.
- When the user asks for a change and you have tools, DO IT — call the tools.
- Without tools, provide clear, actionable guidance and copy-pasteable snippets.

Rules:
- If file tools are available: always list_files first if you don't know the file. Read before rewriting. Preserve {% schema %} JSON. Prefer surgical edits.
- Keep responses short. Summarize what changed in 1-3 bullets and reference paths in backticks.
- For product image detection or scraping external URLs, use web_scrape.
- For market research, competitor analysis, and product launch strategies, use web_search.`;

async function tryResolveStoreContext(shop: string) {
  try {
    const { resolveStoreFromShop } = await import("@/lib/shopify/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await resolveStoreFromShop(shop);
    const themeId = store.draftThemeId ?? store.liveThemeId;
    
    // Fetch latest audit and metrics
    let metricsText = "";
    const { data: audit } = await supabaseAdmin
      .from("audits")
      .select("id, score, score_speed, score_seo, score_ux, score_conversion")
      .eq("store_id", store.storeId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (audit) {
      metricsText += `\nLIVE STORE DATA:
- Overall Health Score: ${audit.score}/100
- Speed Score: ${audit.score_speed}/100
- SEO Score: ${audit.score_seo}/100
- UX Score: ${audit.score_ux}/100
- Conversion Score: ${audit.score_conversion}/100\n`;

      const { data: issues } = await supabaseAdmin
        .from("audit_issues")
        .select("title, revenue_impact_usd")
        .eq("audit_id", audit.id)
        .eq("status", "open")
        .order("revenue_impact_usd", { ascending: false })
        .limit(3);

      if (issues && issues.length > 0) {
        metricsText += `\nTOP OPEN ISSUES:\n`;
        issues.forEach((i: any, idx: number) => {
          metricsText += `${idx + 1}. ${i.title} — losing $${i.revenue_impact_usd || 0}/month\n`;
        });
      }
    }

    if (!themeId) return null;
    return { store, themeId, metricsText };
  } catch (e) {
    console.warn("chat: store context unavailable, falling back to plain chat:", (e as Error)?.message);
    return null;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let stage = "init";
        try {
          stage = "parse-body";
          type Body = { messages?: UIMessage[]; shop?: string };
          const { messages, shop } = (await request.json()) as Body;
          if (!Array.isArray(messages)) {
            return new Response("messages required", { status: 400 });
          }

          stage = "check-credentials";
          const key = process.env.LOVABLE_API_KEY || "";
          if (!key) {
            return new Response("Missing LOVABLE_API_KEY", { status: 500 });
          }

          stage = "gateway";
          const gateway = createLovableAiGatewayProvider(key, getLovableAiGatewayRunId(request));
          const model = gateway("google/gemini-3-flash-preview");

          // Try to build the full Shopify context. If unavailable, respond
          // as a plain assistant so the merchant is never blocked.
          stage = "resolve-store";
          const ctx = shop ? await tryResolveStoreContext(shop) : null;

          if (!ctx) {
            stage = "stream-plain";
            const result = streamText({
              model,
              system: SYSTEM_PROMPT,
              messages: convertToModelMessages(messages),
            });
            return result.toUIMessageStreamResponse({ originalMessages: messages });
          }

          const { store, themeId, metricsText } = ctx;
          const dynamicSystemPrompt = metricsText ? `${SYSTEM_PROMPT}\n${metricsText}` : SYSTEM_PROMPT;

          stage = "imports-shopify";
          const { listAssets, getAsset, putAsset } = await import("@/lib/shopify/asset-api.server");

          const tools = {
            list_files: tool({
              description: "List every file in the active theme.",
              inputSchema: z.object({}),
              execute: async () => {
                const assets = await listAssets(store.shop, store.accessToken, themeId);
                return { files: assets.map((a) => a.key).sort() };
              },
            }),
            read_file: tool({
              description: "Read a theme file by path (e.g. sections/header.liquid).",
              inputSchema: z.object({ path: z.string() }),
              execute: async ({ path }) => {
                const asset = await getAsset(store.shop, store.accessToken, themeId, path);
                return { path, content: asset.value ?? "" };
              },
            }),
            write_file: tool({
              description: "Overwrite a theme file with new content. Pass the FULL new file.",
              inputSchema: z.object({
                path: z.string(),
                content: z.string(),
                summary: z.string().describe("One short sentence describing the change."),
              }),
              execute: async ({ path, content, summary }) => {
                try {
                  await putAsset(store.shop, store.accessToken, themeId, path, content);
                  return { ok: true, path, summary };
                } catch (e) {
                  return { ok: false, error: (e as Error).message };
                }
              },
            }),
            web_scrape: tool({
              description: "Scrape a website to extract its main text content and images. Useful for product image detection.",
              inputSchema: z.object({ url: z.string() }),
              execute: async ({ url }) => {
                try {
                  const cheerio = await import("cheerio");
                  const res = await fetch(url);
                  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
                  const html = await res.text();
                  const $ = cheerio.load(html);
                  $("script, style, noscript, iframe").remove();
                  const text = $("body").text().replace(/\s+/g, " ").trim().substring(0, 5000);
                  const images: string[] = [];
                  $("img").each((_, el) => {
                    const src = $(el).attr("src") || $(el).attr("data-src");
                    if (src) images.push(src);
                  });
                  return { ok: true, text, images: images.slice(0, 10) };
                } catch (e) {
                  return { ok: false, error: (e as Error).message };
                }
              }
            }),
            web_search: tool({
              description: "Search the web for real-time information, market research, or competitor analysis.",
              inputSchema: z.object({ query: z.string() }),
              execute: async ({ query }) => {
                try {
                  const cheerio = await import("cheerio");
                  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
                    headers: {
                      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                    }
                  });
                  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
                  const html = await res.text();
                  const $ = cheerio.load(html);
                  const results: Array<{title: string, url: string, snippet: string}> = [];
                  $(".result").each((i, el) => {
                    const title = $(el).find(".result__title").text().trim();
                    const snippet = $(el).find(".result__snippet").text().trim();
                    const url = $(el).find(".result__url").text().trim();
                    if (title && snippet) results.push({ title, url, snippet });
                  });
                  return { ok: true, results: results.slice(0, 5) };
                } catch (e) {
                  return { ok: false, error: (e as Error).message };
                }
              }
            }),
          };

          stage = "stream-tools";
          const result = streamText({
            model,
            system: dynamicSystemPrompt,
            messages: convertToModelMessages(messages),
            tools,
            stopWhen: stepCountIs(20),
          });

          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (error) {
          const e = error as Error & { cause?: unknown };
          console.error(`api/chat failed at ${stage}:`, e, e?.cause);
          const detail = `stage: ${stage} | ${e?.message || "Unknown error"}`;
          return new Response(detail, { status: 500 });
        }
      },
    },
  },
});
