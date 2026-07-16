import * as cheerio from "cheerio";
import { search } from "duck-duck-scrape";

async function testScrape() {
  console.log("=== Testing Web Scrape ===");
  try {
    const res = await fetch("https://example.com");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, iframe").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim().substring(0, 5000);
    const images = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src) images.push(src);
    });
    console.log("SUCCESS: Scrape extracted text of length:", text.length);
    console.log("Images found:", images.length);
  } catch(e) {
    console.error("FAIL: Scrape error", e);
  }
}

async function testSearch() {
  console.log("\n=== Testing Web Search ===");
  try {
    const results = await search("Shopify SEO strategies 2024");
    if (results && results.results && results.results.length > 0) {
      console.log("SUCCESS: Found", results.results.length, "results.");
      console.log("Top result:", results.results[0].title);
    } else {
      console.log("FAIL: No results found.");
    }
  } catch(e) {
    console.error("FAIL: Search error", e);
  }
}

async function main() {
  await testScrape();
  await testSearch();
}

main();
