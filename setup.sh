#!/bin/sh
# One-time setup on Cloudflare: team database, tables, one-time PINs for every staff member, then deploy.
# Opens a browser the first time to sign in to Cloudflare.
set -e
cd "$(dirname "$0")"
W="npx --yes wrangler@4"
npm install --silent
if grep -q '00000000-0000-0000-0000-000000000000' wrangler.toml; then
  echo "Creating the team database…"
  OUT=$($W d1 create animal-drs 2>&1) || { echo "$OUT"; exit 1; }
  ID=$(echo "$OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  [ -n "$ID" ] || { echo "$OUT"; echo "Could not read the database id. Paste it into wrangler.toml (database_id) and run again."; exit 1; }
  sed -i '' "s/00000000-0000-0000-0000-000000000000/$ID/" wrangler.toml
fi
echo "Creating tables…"
$W d1 execute animal-drs --remote --file schema.sql --yes
node tools/build-staff.mjs
node tools/issue-pins.mjs
$W d1 execute animal-drs --remote --file .secrets/pins.sql --yes
./deploy.sh
echo ""
echo "One-time PINs for every staff member are in .secrets/ (keep them private; hand them out in person)."
