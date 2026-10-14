import { json, signedInReply } from "../../_lib/auth.js";
export async function onRequestGet({ env, data }) {
  if (!data.session) return json({ error: "Not signed in" }, 401);
  return json(await signedInReply(env, data.session.person));
}
