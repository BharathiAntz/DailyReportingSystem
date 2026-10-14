// Photos, short videos and voice messages attached to DRS records.
// PUT /api/media/<id> (body = the file) stores it in parts; GET streams it back. Any signed-in person may view.
import { json } from "../../_lib/auth.js";
const ID = /^[A-Za-z0-9_-]{4,60}$/, MAX = 40 * 1024 * 1024, PART = 1536 * 1024;

export async function onRequestPut({ request, env, params, data }) {
  if (!ID.test(params.id)) return json({ error: "Bad id" }, 400);
  const type = (request.headers.get("content-type") || "application/octet-stream").split(";")[0].slice(0, 80);
  if (!/^(image|video|audio)\/|^application\/pdf$/.test(type)) return json({ error: "Photos, video, audio or PDF only" }, 415);
  const buf = new Uint8Array(await request.arrayBuffer());
  if (!buf.length || buf.length > MAX) return json({ error: "File too large (40 MB at most)" }, 413);
  const parts = Math.ceil(buf.length / PART), now = Date.now(), site = (request.headers.get("x-site") || "").slice(0, 24);
  const stmts = [env.DB.prepare("DELETE FROM media WHERE id = ?1").bind(params.id)];
  for (let i = 0; i < parts; i++) stmts.push(env.DB.prepare("INSERT INTO media (id, part, type, size, parts, site, uid, body, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)")
    .bind(params.id, i, type, buf.length, parts, site, data.session.uid, buf.slice(i * PART, (i + 1) * PART), now));
  await env.DB.batch(stmts);
  return json({ ok: true, url: "api/media/" + params.id });
}

export async function onRequestGet({ env, params }) {
  if (!ID.test(params.id)) return json({ error: "Bad id" }, 400);
  const { results } = await env.DB.prepare("SELECT part, type, body FROM media WHERE id = ?1 ORDER BY part").bind(params.id).all();
  if (!results.length) return json({ error: "Not found" }, 404);
  const body = new Blob(results.map(r => new Uint8Array(r.body)), { type: results[0].type });
  return new Response(body, { headers: { "content-type": results[0].type, "cache-control": "private, max-age=31536000, immutable" } });
}
