import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { json, rp, b64 } from "../../../_lib/auth.js";
export async function onRequestPost({ request, env, data }) {
  const s = data.session; if (!s) return json({ error: "Please sign in again" }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  const ch = await env.DB.prepare("SELECT * FROM challenges WHERE uid = ?1 AND kind = 'reg' AND expires > ?2 ORDER BY expires DESC LIMIT 1").bind(s.uid, Date.now()).first();
  if (!ch) return json({ error: "Took too long. Try again." }, 400);
  const { id, origin } = rp(request);
  let v; try { v = await verifyRegistrationResponse({ response: b.response, expectedChallenge: ch.challenge, expectedOrigin: origin, expectedRPID: id, requireUserVerification: true }); }
  catch (e) { return json({ error: "Could not verify" }, 400); }
  await env.DB.prepare("DELETE FROM challenges WHERE id = ?1").bind(ch.id).run();
  if (!v.verified) return json({ error: "Could not verify" }, 400);
  const info = v.registrationInfo;
  await env.DB.prepare("INSERT OR REPLACE INTO passkeys (id, uid, public_key, counter, transports, device, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
    .bind(info.credentialID, s.uid, b64(info.credentialPublicKey), info.counter || 0, JSON.stringify((b.response.response || {}).transports || []), String(b.device || "").slice(0, 120), Date.now()).run();
  return json({ ok: true });
}
