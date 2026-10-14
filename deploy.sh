#!/bin/sh
# Publish the Daily Report System (app + team API) to Cloudflare Pages. Run setup.sh once first.
set -e
cd "$(dirname "$0")"
# new cache version on every deploy, so phones load the update next time they have signal
sed -i '' "s/^const VERSION = .*/const VERSION = \"drs-lite-$(date +%Y%m%d-%H%M%S)\";/" site/sw.js
npx --yes wrangler@4 pages deploy --branch main
