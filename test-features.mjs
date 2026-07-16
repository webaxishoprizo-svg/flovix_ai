import { Readable } from "stream";

async function runTest(name, prompt) {
  console.log(`\n=== Running Test: ${name} ===`);
  try {
    const res = await fetch("http://127.0.0.1:8082/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }]
      })
    });
    
    if (!res.ok) {
      console.error(`Failed: HTTP ${res.status}`);
      console.error(await res.text());
      return;
    }

    const text = await res.text();
    // Vercel AI SDK streams look like: 
    // 0:"Response chunk"
    // 0:" another chunk"
    // We will parse out the lines that start with '0:' to get the final text.
    let output = "";
    for (const line of text.split("\n")) {
      if (line.startsWith('0:')) {
        try {
          const chunk = JSON.parse(line.substring(2));
          output += chunk;
        } catch(e) {}
      } else if (line.startsWith('9:')) {
         console.log("[Tool Execution]:", line);
      }
    }
    console.log(`Output:\n${output}`);
  } catch (err) {
    console.error(`Error:`, err);
  }
}

async function main() {
  await runTest("Web Search Tool Test", "Search the web for the current top SEO strategies for Shopify in 2024. Just give me one sentence.");
  await runTest("Web Scrape Tool Test", "Scrape https://example.com and tell me what the main text says, and if there are any images.");
}

main();
