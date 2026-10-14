// GET  /api/reports?site=S1[&zone=Z1][&since=<server ms>]  -> { now, reports: [...] }  sent reports, last 3 days
// POST /api/reports  { reports: [...] }                     -> { ok, saved }           upsert, newest edit wins
import { json } from "./_middleware.js";

const CODE = /^[A-Za-z0-9_-]{1,24}$/, ID = /^[a-z0-9]{6,40}$/, DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DATA = 256 * 1024;

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), site = u.searchParams.get("site"), zone = u.searchParams.get("zone"), since = +u.searchParams.get("since") || 0;
  if (!CODE.test(site || "") || (zone && !CODE.test(zone))) return json({ error: "Bad site or zone" }, 400);
  const from = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const q = `SELECT * FROM reports WHERE site = ?1 AND status = 'sent' AND date >= ?2 AND received > ?3 ${zone ? "AND zone = ?4" : ""} ORDER BY received DESC LIMIT 500`;
  const args = zone ? [site, from, since, zone] : [site, from, since];
  const { results } = await env.DB.prepare(q).bind(...args).all();
  return json({ now: Date.now(), reports: results.map(r => ({
    id: r.id, site: r.site, zone: r.zone, by: r.by_uid, form: r.form, date: r.date, status: r.status,
    created: r.created, sentAt: r.sent_at, updated: r.updated, data: JSON.parse(r.data) })) });
}

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch (e) { return json({ error: "Bad JSON" }, 400); }
  const list = Array.isArray(body && body.reports) ? body.reports.slice(0, 50) : [];
  const now = Date.now(), stmts = [];
  for (const r of list) {
    const data = JSON.stringify(r.data || {});
    if (!ID.test(r.id || "") || !CODE.test(r.site || "") || !CODE.test(r.zone || "") || !CODE.test(r.by || "") || !CODE.test(r.form || "")
      || !DAY.test(r.date || "") || !["sent", "draft"].includes(r.status) || data.length > MAX_DATA) return json({ error: "Bad report " + (r.id || "") }, 400);
    stmts.push(env.DB.prepare(`INSERT INTO reports (id, site, zone, by_uid, form, date, status, created, sent_at, updated, received, data)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
      ON CONFLICT (id) DO UPDATE SET status = excluded.status, sent_at = excluded.sent_at, updated = excluded.updated, received = excluded.received, data = excluded.data
      WHERE excluded.updated >= reports.updated AND reports.by_uid = excluded.by_uid`)
      .bind(r.id, r.site, r.zone, r.by, r.form, r.date, r.status, +r.created || now, r.sentAt || null, +r.updated || now, now, data));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true, saved: stmts.length });
}
