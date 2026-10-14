// PUT /api/clips/<id>  body = audio  -> { ok }      GET /api/clips/<id> -> the audio
import { json } from "../_middleware.js";

const ID = /^clip-[a-z0-9]{6,40}$/, MAX = 3 * 1024 * 1024;

export async function onRequestPut({ request, env, params }) {
  if (!ID.test(params.id)) return json({ error: "Bad clip id" }, 400);
  const type = (request.headers.get("content-type") || "").split(";")[0];
  if (!/^audio\/[a-z0-9.+-]+$/.test(type)) return json({ error: "Audio only" }, 415);
  const buf = await request.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > MAX) return json({ error: "Clip too large" }, 413);
  await env.DB.prepare("INSERT OR IGNORE INTO clips (id, type, size, body, created) VALUES (?1, ?2, ?3, ?4, ?5)").bind(params.id, type, buf.byteLength, buf, Date.now()).run();
  return json({ ok: true });
}

export async function onRequestGet({ env, params }) {
  if (!ID.test(params.id)) return json({ error: "Bad clip id" }, 400);
  const row = await env.DB.prepare("SELECT type, body FROM clips WHERE id = ?1").bind(params.id).first();
  if (!row) return json({ error: "Not found" }, 404);
  return new Response(new Uint8Array(row.body), { headers: { "content-type": row.type, "cache-control": "private, max-age=31536000, immutable" } });
}
