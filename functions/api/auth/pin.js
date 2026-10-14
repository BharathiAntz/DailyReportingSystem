// POST /api/auth/pin {pin} -> change my own PIN (signed in). Clears the "one-time PIN" flag.
import { json, hashPin, newSalt } from "../../_lib/auth.js";
export async function onRequestPost({ request, env, data }) {
  if (!data.session) return json({ error: "Please sign in again" }, 401);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  const pin = String(b.pin || "");
  if (!/^\d{4,8}$/.test(pin) || /^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) return json({ error: "Use 4 to 8 digits that are not repeated or in a row." }, 400);
  const salt = newSalt();
  await env.DB.prepare("INSERT INTO users (uid, pin_hash, pin_salt, must_change, updated) VALUES (?1, ?2, ?3, 0, ?4) ON CONFLICT (uid) DO UPDATE SET pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt, must_change = 0, failed = 0, locked_until = 0, updated = excluded.updated")
    .bind(data.session.uid, await hashPin(pin, salt), salt, Date.now()).run();
  return json({ ok: true });
}
