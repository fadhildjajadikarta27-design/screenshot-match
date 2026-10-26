// Server-only crypto helpers: PIN hashing and signed event-access tokens.
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer | Uint8Array): string {
  return Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const ITER = 100_000;

async function pbkdf2(pin: string, salt: Uint8Array, iter: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iter },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${toHex(salt)}$${await pbkdf2(pin, salt, ITER)}`;
}

export async function verifyPin(pin: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [scheme, iterS, saltHex, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterS || !saltHex || !hash) return false;
  const calc = await pbkdf2(pin, fromHex(saltHex), Number(iterS));
  return timingSafeEqual(calc, hash);
}

function secret(): string {
  const s = process.env["EVENT_ACCESS_SECRET"];
  if (!s) throw new Error("Server misconfigured");
  return s;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/** Token binds event id + current PIN hash (changing the PIN revokes old tokens). */
export async function issueAccessToken(eventId: string, pinHash: string, ttlSec = 60 * 60 * 24 * 7) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = await hmac(`${eventId}.${exp}.${pinHash}`);
  return `${exp}.${sig}`;
}

export async function checkAccessToken(eventId: string, pinHash: string | null, token: string | null | undefined) {
  if (!token || !pinHash) return false;
  const [expS, sig] = token.split(".");
  const exp = Number(expS);
  if (!exp || !sig || exp < Date.now() / 1000) return false;
  return timingSafeEqual(await hmac(`${eventId}.${exp}.${pinHash}`), sig);
}

/** Stable, non-reversible client fingerprint for rate limiting. */
export async function clientHash(ip: string, ua: string, guestId: string) {
  return (await hmac(`client.${ip}.${ua.slice(0, 200)}.${guestId.slice(0, 64)}`)).slice(0, 40);
}
