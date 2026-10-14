// Demo mode: no sign-in, switch to any person from the toolbar at the top of the app.
// On only while the Pages variable DEMO_SWITCH is "1" (turn it off before real staff use DRS; PIN sign-in then applies again).
// GET  /api/auth/demo        -> { enabled }
// POST /api/auth/demo {uid}  -> signs in as that person without a PIN (same reply as a normal sign-in)
import { json, person, accountOf, createSession, sessionCookie, signedInReply } from "../../_lib/auth.js";

const on = env => String(env.DEMO_SWITCH || "") === "1";

export async function onRequestGet({ env }) { return json({ enabled: on(env) }); }

export async function onRequestPost({ request, env }) {
  if (!on(env)) return json({ error: "Role switching is turned off. Sign in with your employee number and PIN." }, 403);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  const p = person(String(b.uid || "").toUpperCase());
  if (!p) return json({ error: "Unknown person" }, 404);
  if ((await accountOf(env, p.uid)).status === "suspended") return json({ error: "This account is suspended." }, 403);
  const token = await createSession(env, request, p.uid);
  return json({ ...(await signedInReply(env, p, request)), demo: true }, 200, { "set-cookie": sessionCookie(token) });
}
