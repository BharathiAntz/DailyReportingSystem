# Daily Report System

Tap-first daily reporting for animal-facility field staff: keepers, supervisors, biologists, vets and curators.
Built on the GRC v2 component look. Live at **https://animal-drs.pages.dev**.

## What it does
- **Reports by role**: day keeper, night keeper, special duty, supervisor round, staff attendance, enclosure check, animal shifting, vet health report, curator review, and incidents for everyone.
- **Almost no typing**: radio buttons for one choice, tick buttons for many, animals and enclosures picked from the zone, times set with Now or a tap grid.
- **Notes by voice**: record a voice message or use speak-to-type. Typing stays where words are the data (medicine & dose, "Other" descriptions).
- **Flags**: bad answers (an animal not eating, a broken lock, an injury) are flagged on review and on the Team screen.
- **Works offline**: the app and drafts stay on the phone; sent reports wait for signal and go out by themselves.
- **Team view**: flagged reports first, who still owes a daily report, every sent report with its voice messages.

## Layout
| Path | What |
|---|---|
| `site/index.html` | The whole app (one file: HTML, CSS, JS) |
| `site/sw.js`, `site/manifest.webmanifest`, icons | Offline cache and "Add to Home Screen" |
| `site/_headers` | Allows the microphone on the page |
| `functions/api/` | Cloudflare Pages Functions: `/api/reports`, `/api/clips/<id>`, team-code check |
| `schema.sql` | D1 tables for reports and voice messages |
| `wrangler.toml` | Cloudflare project and D1 binding |
| `setup.sh` / `deploy.sh` | One-time Cloudflare setup / publish an update |

## Run locally
```sh
npx wrangler@4 d1 execute animal-drs --local --file schema.sql
npx wrangler@4 pages dev --binding TEAM_CODE=test
```
Then open http://localhost:8788. Opening `site/index.html` directly also works, without the Team view.

## Deploy
```sh
./deploy.sh            # publishes site/ and functions/ to Cloudflare Pages
```
The API requires a team code, stored as the Pages secret `TEAM_CODE`
(`npx wrangler@4 pages secret put TEAM_CODE --project-name animal-drs`). It is never committed.

## Data
Sites, animals and staff in `site/index.html` (`ANTS`) are sample data. In production the facility system (ANTS) supplies them through the same shape.
