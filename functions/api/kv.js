// Shared DRS data.
// GET  /api/kv?since=<ms>   -> { now, items: [{k, v}] }  every key changed since, that I may read
// POST /api/kv {k, v, prev} -> { ok, ts } | { conflict: true, cur }  write if the stored value is still `prev` (else merge and retry)
// Keys: "@<SITE>/…" per site (only people whose scope includes the site), "@u:<uid>/…" personal (only that person),
// anything else is organisation-wide. Admin settings may be written only by admins; read-only accounts write only their own keys.
import { json, scopeSites, isOffice } from "../_lib/auth.js";

const MAX = 900 * 1024;
const ADMIN_KEYS = /^(kc-useradm|kc-settings)$/;
function keyInfo(k) {
  let m = /^@u:([A-Za-z0-9_-]{1,24})\//.exec(k); if (m) return { uid: m[1], site: null };
  m = /^@([A-Za-z0-9_]{1,24})\//.exec(k); if (m) return { uid: null, site: m[1] };
  return { uid: null, site: null };
}

export async function onRequestGet({ request, env, data }) {
  const s = data.session, since = Math.max(0, +new URL(request.url).searchParams.get("since") || 0);
  const sites = scopeSites(s.person), now = Date.now();
  const marks = sites.map((_, i) => "?" + (i + 3)).join(",") || "''";
  const { results } = await env.DB.prepare(
    `SELECT k, v FROM kv WHERE ts > ?1 AND ((site IS NULL AND uid IS NULL) OR uid = ?2 OR site IN (${marks})) ORDER BY ts LIMIT 5000`
  ).bind(since, s.uid, ...sites).all();
  /* cursor a little behind "now" so writes that land during this read are picked up next time */
  return json({ now: now - 3000, items: results, office: isOffice(request, env) });
}

export async function onRequestPost({ request, env, data }) {
  const s = data.session;
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  const k = String(b.k || ""), v = b.v, prev = b.prev == null ? null : String(b.prev);
  if (!k || k.length > 200 || typeof v !== "string" || v.length > MAX || /^(u:|drs-user|drs-site|kc-role$)/.test(k)) return json({ error: "Bad key or value" }, 400);
  const info = keyInfo(k), p = s.person, ro = s.account.status === "readonly";
  if (info.uid && info.uid !== s.uid) return json({ error: "That belongs to someone else." }, 403);
  if (info.site && !scopeSites(p).includes(info.site)) return json({ error: "That site is outside your access." }, 403);
  if (ADMIN_KEYS.test(k) && !["sadmin", "siteadmin"].includes(p.role)) return json({ error: "Only admins can change access settings." }, 403);
  if (ro && !info.uid) return json({ error: "You have read-only access." }, 403);
  const cur = await env.DB.prepare("SELECT v FROM kv WHERE k = ?1").bind(k).first();
  const curV = cur ? cur.v : null;
  if (curV !== prev && curV !== v) return json({ conflict: true, cur: curV });
  const ts = Date.now();
  await env.DB.prepare("INSERT INTO kv (k, v, ts, site, uid, by_uid) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT (k) DO UPDATE SET v = excluded.v, ts = excluded.ts, by_uid = excluded.by_uid")
    .bind(k, v, ts, info.site, info.uid, s.uid).run();
  return json({ ok: true, ts });
}
