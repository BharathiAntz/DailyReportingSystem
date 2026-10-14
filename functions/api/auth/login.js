// POST /api/auth/login {ep, pin} -> session cookie + {uid, name, role, site, passkeys, mustChange}
// Five wrong PINs lock the account for 15 minutes.
import { json, person, hashPin, sameStr, accountOf, createSession, sessionCookie, signedInReply } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  const ep = String(b.ep || "").trim().toUpperCase(), pin = String(b.pin || "");
  const p = person(ep), u = p && await env.DB.prepare("SELECT * FROM users WHERE uid = ?1").bind(ep).first();
  if (!p || !u || !u.pin_hash) return json({ error: "Wrong employee number or PIN" }, 401);
  if (u.locked_until > Date.now()) return json({ error: `Too many wrong PINs. Try again after ${new Date(u.locked_until).toISOString().slice(11, 16)} UTC, or ask your Site Admin.` }, 429);
  const ok = sameStr(await hashPin(pin, u.pin_salt), u.pin_hash);
  if (!ok) {
    const failed = u.failed + 1;
    await env.DB.prepare("UPDATE users SET failed = ?2, locked_until = ?3 WHERE uid = ?1").bind(ep, failed >= 5 ? 0 : failed, failed >= 5 ? Date.now() + 15 * 60e3 : 0).run();
    return json({ error: failed >= 5 ? "Too many wrong PINs. Locked for 15 minutes." : "Wrong employee number or PIN" }, 401);
  }
  const acc = await accountOf(env, ep);
  if (acc.status === "suspended") return json({ error: "Your DRS access is suspended. Please contact your admin." }, 403);
  await env.DB.prepare("UPDATE users SET failed = 0, locked_until = 0 WHERE uid = ?1").bind(ep).run();
  const token = await createSession(env, request, ep);
  return json({ ...(await signedInReply(env, p, request)), mustChange: !!u.must_change }, 200, { "set-cookie": sessionCookie(token) });
}
