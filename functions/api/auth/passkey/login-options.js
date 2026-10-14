// Face / fingerprint sign-in. With no uid the phone offers the passkeys it holds for this site.
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { json, rp, randomToken } from "../../../_lib/auth.js";
export async function onRequestPost({ request, env }) {
  let b = {}; try { b = await request.json(); } catch (e) {}
  let allow;
  if (b.uid) { const { results } = await env.DB.prepare("SELECT id, transports FROM passkeys WHERE uid = ?1").bind(String(b.uid)).all();
    if (!results.length) return json({ error: "No face or fingerprint set up yet" }, 404);
    allow = results.map(r => ({ id: r.id, transports: r.transports ? JSON.parse(r.transports) : undefined })); }
  const options = await generateAuthenticationOptions({ rpID: rp(request).id, userVerification: "required", allowCredentials: allow });
  const id = randomToken(12);
  await env.DB.prepare("INSERT INTO challenges (id, challenge, uid, kind, expires) VALUES (?1, ?2, ?3, 'auth', ?4)").bind(id, options.challenge, b.uid || null, Date.now() + 5 * 60e3).run();
  return json({ id, options });
}
