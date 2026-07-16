import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const target = new URL("../node_modules/nf3/dist/_chunks/trace.mjs", import.meta.url);

if (!existsSync(target)) {
  process.exit(0);
}

const source = await readFile(target, "utf8");
const before = 'import { nodeFileTrace } from "@vercel/nft";';
const after = 'import nftPkg from "@vercel/nft";\nconst { nodeFileTrace } = nftPkg;';

if (!source.includes(before) || source.includes(after)) {
  process.exit(0);
}

await writeFile(target, source.replace(before, after), "utf8");
console.log("Patched nf3 to load @vercel/nft via CommonJS-compatible import.");
