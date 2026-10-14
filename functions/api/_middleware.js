// /api: Lite reports (/api/reports, /api/clips) keep the team code; everything else needs a signed-in session,
// except sign-in itself (/api/auth/*), which checks what it needs.
import { getSession, json } from "../_lib/auth.js";
export { json };

export async function onRequest(context) {
  const { request, env, next, data } = context;
  if (!env.DB) return json({ error: "Database is not connected. Run setup.sh." }, 503);
  const path = new URL(request.url).pathname;
  try {
    if (/^\/api\/(reports|clips)(\/|$)/.test(path)) {
      if (env.TEAM_CODE && request.headers.get("x-team-code") !== env.TEAM_CODE) return json({ error: "Team code needed" }, 401);
      return await next();
    }
    if (path.startsWith("/api/auth/")) { data.session = await getSession(env, request); return await next(); }
    const s = await getSession(env, request);
    if (!s) return json({ error: "Please sign in again" }, 401);
    data.session = s;
    return await next();
  } catch (e) { return json({ error: "Server error" }, 500); }
}
