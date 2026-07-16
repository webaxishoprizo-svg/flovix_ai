import * as cheerio from "cheerio";

async function testManualSearch(query) {
  console.log("\n=== Testing Manual Search ===");
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];
    $(".result").each((i, el) => {
      const title = $(el).find(".result__title").text().trim();
      const snippet = $(el).find(".result__snippet").text().trim();
      const url = $(el).find(".result__url").text().trim();
      if (title && snippet) {
        results.push({ title, url, snippet });
      }
    });
    console.log(`Found ${results.length} results.`);
    if (results.length > 0) {
      console.log("Top result:", results[0]);
    } else {
      console.log("Check if we got blocked:\n", html.substring(0, 300));
    }
  } catch(e) {
    console.error("FAIL:", e);
  }
}

testManualSearch("Shopify SEO strategies 2024");
