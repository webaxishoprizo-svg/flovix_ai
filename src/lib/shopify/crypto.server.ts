// AES-GCM at-rest encryption for Shopify access tokens.
// Uses WebCrypto so it works on Cloudflare Workers.

const ENC = new TextEncoder();
const DEC = new TextDecoder();

async function getKey(): Promise<CryptoKey> {
  const raw = process.env.FLOVIX_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("FLOVIX_TOKEN_ENCRYPTION_KEY missing");
  // Derive a 256-bit key from the secret via SHA-256.
  const material = await crypto.subtle.digest("SHA-256", ENC.encode(raw));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, ENC.encode(plaintext)),
  );
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0);
  packed.set(ct, iv.length);
  return toB64(packed);
}

export async function decryptToken(payload: string): Promise<string> {
  const key = await getKey();
  const packed = fromB64(payload);
  const iv = packed.slice(0, 12);
  const ct = packed.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return DEC.decode(pt);
}

/** Timing-safe equality for hex/base64 strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
