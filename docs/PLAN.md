# Daily Report System v2: full feature parity

Goal: every role, screen and workflow of the original DRS (specs in `docs/original-spec/`), running on Cloudflare
with shared live data, real sign-in, and the GRC v2 look with tap-first inputs.

Decisions (2026-10-14)
- Reuse the original DRS code (`original/drs-original.html`); improve it in place.
- Organisation: 2 clusters, 10 sites, about 60 staff, 20 species, about 500 animals.
  Curator, Assistant Curator, Biologist, Vet, Paravet and Facility Manager serve every site in their cluster.
- Sign-in: employee number + PIN (Site Admin resets PINs), plus passkeys (face or fingerprint on the phone).

## Phase 1: platform (full original app, live)
1. `site/index.html` = original app; the claude.ai demo adapter is replaced by `site/drs-sync.js` (Cloudflare store).
2. `site/ants.js`: sample organisation at the new size (window.ANTS, connected mode); same data drives the server staff list.
3. API (Pages Functions + D1): `/api/kv` (pull since / push with 3-way merge on conflict), `/api/media` (photos, video, voice; chunked),
   `/api/auth/*` (PIN login, change PIN, admin reset, passkey register/login, sign out). Session cookie, scope checks per site / user.
4. Sign-in screen through the original's `DRS_LOGIN` hook + "Use face or fingerprint" button; first sign-in forces a PIN change.
5. Previous app kept at `/lite/`.
6. Tests: two-phone sync, sign-in, passkey (virtual authenticator), PIN reset; then deploy.

## Phase 2: GRC v2 look across all screens
## Phase 3: tap-first inputs and voice notes inside the original forms (pickers for animal/cage/person, voice for notes)
## Phase 4: server-side timers (escalations, P1–P4 targets, SOS check-ins, digest), push notifications, AI translation, real ANTS connection
