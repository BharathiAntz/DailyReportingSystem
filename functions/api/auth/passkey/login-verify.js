import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { json, rp, person, accountOf, createSession, sessionCookie, signedInReply } from "../../../_lib/auth.js";
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  const ch = await env.DB.prepare("SELECT * FROM challenges WHERE id = ?1 AND kind = 'auth' AND expires > ?2").bind(String(b.id || ""), Date.now()).first();
  if (!ch) return json({ error: "Took too long. Try again." }, 400);
  await env.DB.prepare("DELETE FROM challenges WHERE id = ?1").bind(ch.id).run();
  const cred = b.response && await env.DB.prepare("SELECT * FROM passkeys WHERE id = ?1").bind(String(b.response.id || "")).first();
  if (!cred || (ch.uid && cred.uid !== ch.uid)) return json({ error: "This face or fingerprint isn't set up for DRS. Use your PIN." }, 401);
  const { id, origin } = rp(request);
  let v; try { v = await verifyAuthenticationResponse({ response: b.response, expectedChallenge: ch.challenge, expectedOrigin: origin, expectedRPID: id, requireUserVerification: true,
    authenticator: { credentialID: cred.id, credentialPublicKey: Uint8Array.from(atob(cred.public_key), c => c.charCodeAt(0)), counter: cred.counter, transports: cred.transports ? JSON.parse(cred.transports) : undefined } }); }
  catch (e) { return json({ error: "Not recognised. Use your PIN." }, 401); }
  if (!v.verified) return json({ error: "Not recognised. Use your PIN." }, 401);
  const p = person(cred.uid); if (!p) return json({ error: "Account not found" }, 401);
  const acc = await accountOf(env, p.uid);
  if (acc.status === "suspended") return json({ error: "Your DRS access is suspended. Please contact your admin." }, 403);
  await env.DB.prepare("UPDATE passkeys SET counter = ?2, last_used = ?3 WHERE id = ?1").bind(cred.id, v.authenticationInfo.newCounter, Date.now()).run();
  const token = await createSession(env, request, p.uid);
  return json(await signedInReply(env, p, request), 200, { "set-cookie": sessionCookie(token) });
}
