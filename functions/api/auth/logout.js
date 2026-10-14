import { json, clearCookie } from "../../_lib/auth.js";
export async function onRequestPost({ env, data }) {
  if (data.session) await env.DB.prepare("DELETE FROM sessions WHERE token = ?1").bind(data.session.token).run();
  return json({ ok: true }, 200, { "set-cookie": clearCookie() });
}
