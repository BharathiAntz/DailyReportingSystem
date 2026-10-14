// Issues one-time sign-in PINs for everyone in functions/_lib/staff.js who doesn't have a PIN yet.
// Writes .secrets/pins-<date>.csv (give each person theirs in person) and .secrets/pins.sql (load into D1).
// Everyone must choose their own PIN at first sign-in. Never commit .secrets/.
import fs from "node:fs"; import crypto from "node:crypto";
import { STAFF } from "../functions/_lib/staff.js";
const only = process.argv.slice(2);   // optional: list of uids to (re)issue
const dir = new URL("../.secrets/", import.meta.url); fs.mkdirSync(dir, { recursive: true });
const rows = [], sql = [], now = Date.now();
for (const p of STAFF) {
  if (only.length && !only.includes(p.uid)) continue;
  const pin = String(crypto.randomInt(100000, 1000000)), salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(pin, salt, 100000, 32, "sha256").toString("base64");
  rows.push([p.uid, p.name, p.role, p.antsRole, p.sites.join(" ") || p.cluster, pin].join(","));
  sql.push(`INSERT INTO users (uid, pin_hash, pin_salt, must_change, updated) VALUES ('${p.uid}', '${hash}', '${salt.toString("base64")}', 1, ${now}) ON CONFLICT (uid) DO ${only.length ? "UPDATE SET pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt, must_change = 1, failed = 0, locked_until = 0" : "NOTHING"};`);
}
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + (only.length ? "-reset-" + only.join("-") : "-all");
fs.writeFileSync(new URL(`pins-${stamp}.csv`, dir), "Employee no,Name,DRS role,Job title,Sites,One-time PIN\n" + rows.join("\n") + "\n");
fs.writeFileSync(new URL("pins.sql", dir), sql.join("\n") + "\n");
console.log(`${rows.length} one-time PINs → .secrets/pins-${stamp}.csv`);
