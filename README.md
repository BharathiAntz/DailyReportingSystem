# DRS · Daily Report System

Daily reports, maintenance tickets, treatments, alerts and dashboards for animal facility teams.
Live at **https://animal-drs.pages.dev** (the earlier tap-first app is at `/lite/`).

## Who uses it
14 roles, each with its own screens: CEO/COO, Cluster Head, Super Admin, Site Admin, Site Manager, Curator,
Assistant Curator, Biologist, Vet, Paravet, Facility Manager (AFM), Head Keeper/Supervisor, Keeper, and outside maintenance agencies.
Feature specs: [docs/original-spec/](docs/original-spec/). Roadmap: [docs/PLAN.md](docs/PLAN.md).

## Sign-in
Employee number + PIN. Everyone starts with a one-time PIN and chooses their own at first sign-in.
After that, face or fingerprint (passkeys) can replace the PIN on that phone. Super Admins and Site Admins
reset PINs from Admin → person → Reset PIN. Five wrong PINs lock the account for 15 minutes.

## Layout
| Path | What |
|---|---|
| `site/app.js` | The DRS app (all roles and modules) |
| `site/ants.js` | Organisation data: sites, zones, staff, animals (sample until the real ANTS connection) |
| `site/drs-sync.js` | Connects the app to the server: shared data, sign-in, passkeys, media |
| `site/index.html`, `sw.js`, `manifest.webmanifest`, `icons/` | Page, offline cache, install as app |
| `functions/api/kv.js` | Shared data, scoped per site / person, three-way merge on conflicts |
| `functions/api/auth/` | PIN sign-in, change PIN, admin reset, passkeys, sign-out |
| `functions/api/media/` | Photos, video, voice |
| `functions/_lib/` | Sessions, PIN hashing, scopes; `staff.js` is generated from `site/ants.js` |
| `schema.sql` | Database tables (Cloudflare D1) |
| `tools/` | `build-staff.mjs`, `issue-pins.mjs` |
| `original/drs-original.html` | The original DRS, for reference |

## Run locally
```sh
npm install
npx wrangler@4 d1 execute animal-drs --local --file schema.sql
node tools/build-staff.mjs && node tools/issue-pins.mjs
npx wrangler@4 d1 execute animal-drs --local --file .secrets/pins.sql
npx wrangler@4 pages dev
```
One-time PINs are in `.secrets/` (never committed).

## Deploy
`./setup.sh` once (database, tables, PINs), then `./deploy.sh` for every update.
