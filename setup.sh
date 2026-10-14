#!/bin/sh
# One-time setup on Cloudflare: creates the team database and its tables, then deploys.
# Opens a browser the first time to sign in to Cloudflare.
set -e
cd "$(dirname "$0")"
W="npx --yes wrangler@4"
if grep -q '00000000-0000-0000-0000-000000000000' wrangler.toml; then
  echo "Creating the team database…"
  OUT=$($W d1 create animal-drs 2>&1) || { echo "$OUT"; exit 1; }
  ID=$(echo "$OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  [ -n "$ID" ] || { echo "$OUT"; echo "Could not read the database id. Paste it into wrangler.toml (database_id) and run again."; exit 1; }
  sed -i '' "s/00000000-0000-0000-0000-000000000000/$ID/" wrangler.toml
fi
echo "Creating tables…"
$W d1 execute animal-drs --remote --file schema.sql
./deploy.sh
echo ""
echo "Optional: require a team code so only your staff can read and send reports:"
echo "  $W pages secret put TEAM_CODE --project-name animal-drs"
