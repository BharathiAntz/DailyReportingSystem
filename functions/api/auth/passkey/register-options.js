// Face / fingerprint: start adding a passkey for the signed-in person.
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { json, rp, randomToken } from "../../../_lib/auth.js";
export async function onRequestPost({ request, env, data }) {
  const s = data.session; if (!s) return json({ error: "Please sign in again" }, 401);
  const { results } = await env.DB.prepare("SELECT id, transports FROM passkeys WHERE uid = ?1").bind(s.uid).all();
  const opts = await generateRegistrationOptions({
    rpName: "DRS · Daily Report System", rpID: rp(request).id, userName: s.uid, userDisplayName: s.person.name,
    userID: new TextEncoder().encode(s.uid), attestationType: "none",
    excludeCredentials: results.map(r => ({ id: r.id, transports: r.transports ? JSON.parse(r.transports) : undefined })),
    authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" }
  });
  await env.DB.prepare("INSERT INTO challenges (id, challenge, uid, kind, expires) VALUES (?1, ?2, ?3, 'reg', ?4)").bind(randomToken(12), opts.challenge, s.uid, Date.now() + 5 * 60e3).run();
  return json(opts);
}
