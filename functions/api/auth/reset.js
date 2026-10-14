// POST /api/auth/reset {uid} -> {pin, name}: an admin issues a one-time PIN. Super Admin: anyone; Site Admin: people in their cluster
// (not Super Admins or CEO/COO). Signs the person out everywhere; they choose their own PIN at next sign-in.
import { json, person, hashPin, newSalt } from "../../_lib/auth.js";
export async function onRequestPost({ request, env, data }) {
  const s = data.session; if (!s) return json({ error: "Please sign in again" }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  const t = person(String(b.uid || "")), me = s.person;
  if (!t || t.uid === me.uid) return json({ error: "Choose someone else" }, 400);
  const ok = me.role === "sadmin" || (me.role === "siteadmin" && t.cluster === me.cluster && !["sadmin", "exec"].includes(t.role));
  if (!ok) return json({ error: "You can't reset this person's PIN." }, 403);
  const digits = crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000, pin = String(digits), salt = newSalt();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (uid, pin_hash, pin_salt, must_change, updated) VALUES (?1, ?2, ?3, 1, ?4) ON CONFLICT (uid) DO UPDATE SET pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt, must_change = 1, failed = 0, locked_until = 0, updated = excluded.updated")
      .bind(t.uid, await hashPin(pin, salt), salt, Date.now()),
    env.DB.prepare("DELETE FROM sessions WHERE uid = ?1").bind(t.uid)
  ]);
  return json({ ok: true, pin, name: t.name });
}
