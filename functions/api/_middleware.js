// Every /api call: optional team code (set TEAM_CODE as a Cloudflare Pages secret to require it).
export async function onRequest({ request, env, next }) {
  if (!env.DB) return json({ error: "Database is not connected. Run setup.sh." }, 503);
  if (env.TEAM_CODE && request.headers.get("x-team-code") !== env.TEAM_CODE) return json({ error: "Team code needed" }, 401);
  try { return await next(); } catch (e) { return json({ error: "Server error" }, 500); }
}
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
