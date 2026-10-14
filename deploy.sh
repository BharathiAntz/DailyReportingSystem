#!/bin/sh
# Publish DRS (app + API) to Cloudflare Pages. Run setup.sh once first.
set -e
cd "$(dirname "$0")"
node tools/build-staff.mjs
# new cache versions on every deploy, so phones load the update next time they have signal
STAMP=$(date +%Y%m%d-%H%M%S)
sed -i '' "s/^const VERSION = .*/const VERSION = \"drs-$STAMP\";/" site/sw.js
sed -i '' "s/^const VERSION = .*/const VERSION = \"drs-lite-$STAMP\";/" site/lite/sw.js
npx --yes wrangler@4 d1 execute animal-drs --remote --file schema.sql --yes > /dev/null
npx --yes wrangler@4 pages deploy --branch main
