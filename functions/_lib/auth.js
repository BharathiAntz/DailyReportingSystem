// Sessions, PINs, scopes and account status for the DRS API.
import { STAFF, CLUSTERS, AGENCIES } from "./staff.js";

export const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
export const person = uid => STAFF.find(p => p.uid === uid) || null;
const enc = new TextEncoder();
export const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
export const randomToken = (n = 32) => { const b = crypto.getRandomValues(new Uint8Array(n)); return b64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };

/* PIN: PBKDF2-SHA256, 100,000 rounds, per-user salt */
export async function hashPin(pin, saltB64) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256));
}
export const newSalt = () => b64(crypto.getRandomValues(new Uint8Array(16)));
export const sameStr = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

/* sites a person may read and write */
export function scopeSites(p) {
  const all = CLUSTERS.flatMap(c => c.sites);
  if (!p) return [];
  if (["exec", "sadmin"].includes(p.role)) return all;
  if (["ch", "siteadmin"].includes(p.role)) return (CLUSTERS.find(c => c.code === p.cluster) || { sites: [] }).sites;
  if (p.role === "agency") { const a = AGENCIES.find(x => x.id === p.agency) || { clusters: [] }; return CLUSTERS.filter(c => a.clusters.includes(c.code)).flatMap(c => c.sites); }
  return p.sites && p.sites.length ? p.sites : [p.site];
}

/* admin settings live in the shared store (key kc-useradm), written from the Admin screen */
export async function accountOf(env, uid) {
  const row = await env.DB.prepare("SELECT v FROM kv WHERE k = 'kc-useradm'").first();
  try { return (JSON.parse(row ? row.v : "{}") || {})[uid] || {}; } catch (e) { return {}; }
}

const COOKIE = "drs_s", DAYS = 30;
export const sessionCookie = token => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS * 86400}`;
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export async function createSession(env, request, uid) {
  const token = randomToken(), now = Date.now();
  await env.DB.prepare("INSERT INTO sessions (token, uid, created, last_seen, expires, ua) VALUES (?1, ?2, ?3, ?3, ?4, ?5)")
    .bind(token, uid, now, now + DAYS * 864e5, (request.headers.get("user-agent") || "").slice(0, 160)).run();
  return token;
}
/* the signed-in person, or null. Ends sessions an admin signed out or suspended. */
export async function getSession(env, request) {
  const m = /(?:^|;\s*)drs_s=([A-Za-z0-9_-]{20,})/.exec(request.headers.get("cookie") || "");
  if (!m) return null;
  const s = await env.DB.prepare("SELECT * FROM sessions WHERE token = ?1").bind(m[1]).first();
  if (!s || s.expires < Date.now()) return null;
  const p = person(s.uid); if (!p) return null;
  const acc = await accountOf(env, s.uid);
  if (acc.status === "suspended" || (acc.signoutAt && acc.signoutAt > s.created)) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?1").bind(m[1]).run();
    return null;
  }
  if (Date.now() - s.last_seen > 3600e3) await env.DB.prepare("UPDATE sessions SET last_seen = ?2 WHERE token = ?1").bind(m[1], Date.now()).run();
  return { token: m[1], uid: s.uid, created: s.created, person: p, account: acc };
}
export const signedInReply = async (env, p) => {
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM passkeys WHERE uid = ?1").bind(p.uid).first();
  return { uid: p.uid, name: p.name, role: p.role, site: p.site || scopeSites(p)[0] || "", passkeys: n ? n.n : 0 };
};
export const rp = request => { const u = new URL(request.url); return { id: u.hostname, origin: u.origin }; };
