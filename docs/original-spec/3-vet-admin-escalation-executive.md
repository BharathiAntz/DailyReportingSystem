# DRS rebuild spec — Slice C (all_en.js L3861–5082)
Paravet + Vet treatment sheet · Multi-user readiness · Engines 11–19.
Line refs = all_en.js. "notify(ev)" = push hook `window.DRS_NOTIFY({type,title,body,toRoles|toUids,priority,ref})` (L3853). Storage scoping (L164-180): keys are per-site `@<SITE>/key` unless GLOBAL (`kc-role, kc-lang, kc-replang, drs-user, drs-site, kc-agencies, kc-notices, kc-useradm, kc-settings, kc-tr-*, kc-export*, drs-ants-*, kc-sessions, kc-pmjobs-all`) or USER (`@u:<uid>/key`: `kc-lastto-*, kc-read, kc-alpop-*, kc-evpop-*, kc-agpop-*, kc-afm-popped, kc-afmdone-pop, kc-vetmfpop, kc-pvpop, kc-notes, kc-done, kc-logs, kc-train, kc-quiz, kc-mem-*, kc-sup-name, kc-bio-name, kc-pin, kc-quiet, kc-ntpop, kc-duty, kc-ntseen, kc-sos-*`). `storeAt.get/set(site,key)` reads other sites. `NOW()` = Date.now()+demo offset `drs-now-offset`. Hindi strings omitted; every label is bilingual in the original (EN/HI).
Note: no stock/pharmacy logic exists in this slice; `v-stock` (Data Operator/Manager "Stock", L3763-3764) belongs to an earlier slice. Only `kc-stock-open` is reloaded in DRS_REFRESH (L4077).

---
## 0. FINAL ROLES / TABS TABLE (after Engine 11, L4136-4160; later engines append)
Bottom nav = 4–5 tabs; "More" tab opens a grid of extra screens (MORE list + admin-granted "extra access"). `dop` (Data Operator) role is DELETED (L4136) — its staff list now comes from ANTS (L4814); "Data Operator" removed from report recipients, "CEO / COO" added (L4114-4115).

| role (key) | label | ic | Tabs (view → label) | More (in order; "digest" prepended for mgr/ch/exec/cur L4390; "secure" appended to all L4267) |
|---|---|---|---|---|
| exec | CEO / COO — "All clusters and sites, key indicators, digests" | CEO | xdash Dashboard · notices Notices · inv Investigations · inbox Reports · more | digest, timeline, events, learn, secure |
| ch | Cluster Head — "All sites in the cluster, escalations, investigations" | CH | xdash · notices · inv · inbox · more | digest, maint, timeline, safety, events, learn, secure |
| sadmin | Super Admin — "All sites: users, access, settings" | SA | admin Admin · xdash · notices · inbox · more | timeline, events, learn, secure |
| siteadmin | Site Admin — "Users and access for a cluster's sites" | AD | admin · notices · inbox · more | events, learn, secure |
| mgr | Manager | M | dash Dashboard · maint Maintenance · notices · att Attendance · more | digest, inbox, verifyLog (Births & deaths), timeline, safety, roster, inv, events, etho, learn, secure |
| cur | Curator | C | cdash Dashboard · verify Verify · notices · inbox · more | digest, form, timeline, etho, notes, safety, inv, events, learn, secure |
| acur | Assistant Curator | AC | form "My report" · verify · notices · inbox · more | timeline, safety, events, animals, learn, secure |
| bio | Biologist | B | bio Report · etho Ethogram · notices · plans Manage · more | timeline, notes, inbox, safety, events, animals, learn, secure |
| vet | Vet | V | cdash Dashboard · verify · rx Treatments · notices · more | pobs, form, inbox, timeline, notes, events, learn, secure |
| pvet | Paravet — "Treatment doses, health observations and medical flags; reports to the Vet" | PV | pvtoday Today · rx Treatments · pobs Observations · notices · more | timeline, inbox, events, learn, secure |
| afm | AFM | A | afm Issues · maint · notices · att · more | inbox, events, learn, secure |
| sup | Supervisor / Head Animal Keeper | S | sup Report · inc Incidents · notices · att · more | inbox, roster, safety, timeline, events, animals, learn, secure |
| keeper | Keeper | K | today Duty · log Log · notices · more | leave, timeline, events, animals, learn, secure |
| agency | Maintenance Agency | AG | agency "My jobs" only (unchanged from L3557; no More list) | — |

Navigation guard (L4163-4166): a VIEW not in role tabs, MORE, user extra access, or {events, animals, rx, pobs, more} resets to default. "More" tab highlighted while on a More screen. `addView(id,title,intro)` creates section `v-<id>` with body `<id>Body`; `RENDER[id]()` called on navigation (L4119-4121).
ANTS job title → role map (L39-43): CEO/COO→exec; Cluster Head→ch; Site Manager→mgr; Curator→cur; Assistant Curator→acur; Biologist→bio; Veterinarian→vet; Paravet→pvet; Assistant Facility Manager→afm; Head Animal Keeper, Site Supervisor→sup; Animal Keeper, Night Keeper→keeper; DRS Super Admin→sadmin; DRS Site Admin→siteadmin; Maintenance Agency→agency. Paravet post aliases: "paravet","para vet","veterinary assistant" (L3879). `pvet` added to animal-alert recipients AL_TO = [bio,cur,acur,vet,mgr,pvet] (L3120, L3880).
Site scope (L148-153): exec/sadmin all sites; ch/siteadmin all sites of own cluster; agency sites of clusters it serves; others own site. Multi-site roles = exec, ch, sadmin, siteadmin, agency.

---
## 1. PARAVET + VET TREATMENT SHEET (L3861-4024)
### 1.1 Data
- `kc-rx` (site) array of prescriptions: `{id:"RX"+ts, animal, aid, site, cage, dx, med, dose, route, times:"08:00, 20:00", start:YYYY-MM-DD, days:int, instr, follow:date, status:"active"|"completed"|"stopped", pending:bool (true if created by non-vet), by:role, doses:{"<date>|<HH:MM>":{st:"given"|"partial"|"refused"|"missed", at, by, note}}, verify:{<date>:{ok:bool,note,at}}, hist:[{at,by:role,text}], changedAt}` (L3886, L3953).
- `kc-pobs` (site) observations: `{id:"PO"+ts, kind, site, cage, animal, time, tags[], temp, note, prod, date, by, vetSeen:bool, vetReply}` (L3980).
- `kc-mflag` (site) map flagId → `{pv:{at,note}, vet:{at,note,closed:bool}}` (L3886).
- `kc-mem-pv-site` (user) remembers last site typed. `kc-pvpop` (user) {rxId: changedAt seen}; `kc-vetmfpop` (user) [flagIds already popped].
- Derived: rxDays(r) = start..start+days-1; rxTimes = parse "times" by comma/space, keep H:MM/HH:MM, zero-pad (L3888-3889). Slot state for a date: recorded status, else "over" if date<today or (today and time<now), else "due" (L3890). Only `status==="active"` rx produce slots.

### 1.2 Option lists
- ROUTES: Oral, Injection, Topical, Eye / ear drops, In food, Other (default Oral) (L3884).
- Dose status (DST): given "Given"(ok), partial "Partly given"(mid), refused "Refused"(bad), missed "Not given"(bad); grid symbols ✓ ½ R ✗; overdue "!"; future "·" (L3885, L3927).
- OBS_KIND: Health observation (default), Vaccination, Deworming, Wound dressing, Sample collected, Weighing, Other procedure (L3882).
- OBS_TAGS (multi): Normal, Not eating, Not drinking, Lethargic / dull, Limping, Wound / injury, Swelling, Discharge (eye / nose), Diarrhoea, Vomiting, Breathing difficulty, Coughing / sneezing, Hair or feather loss, Weight loss, Recovering well. Flagged "bad" (OBS_BAD): all except Normal, Hair or feather loss, Recovering well (L3881-3883).

### 1.3 Treatment sheet screen `rx` ("Treatment sheet"; intro "Every active treatment by site. Record each dose; the Vet sees it side by side with the instructions.") L3941-3963
Mode: vet / pvet / view (any other role, e.g. Manager via "Open treatment sheet"; view shows a "Dashboard" back crumb).
1. Button "New prescription" (vet) / "Add treatment on Vet's instruction" (pvet).
2. Form (L3915-3925), fields: Animal name `animal` text (datalist animalList, REQUIRED), ID / microchip `aid`, Site / zone `site` (prefill last), Cage `cage`, Diagnosis / problem `dx`, Medicine `med` (REQUIRED), Dose `dose`, Route `route` radio ROUTES, Dose times `times` text ("08:00, 20:00"), Start date `start` (today), Number of days `days` number ≥1 (5), Instructions `instr` textarea, Follow-up date `follow` date; when editing also Reason for change `why`. Buttons Save treatment / Cancel. Missing animal/med → toast "needName".
3. Site filter chips: All sites + distinct rx sites.
4. Cards sorted active→completed→stopped, then site. Card: animal (+aid), site · cage, dx · status; if pending: "Added by Paravet – Vet to confirm" (+ vet button "Confirm prescription"). Two columns: "Vet instructions" (med · dose · route; times · "Day n of t"; instr; follow-up) and "Paravet record · Today" (slot buttons per dose time showing time + Given/…/Overdue/Due, enabled only for pvet; notes listed).
5. Pvet taps slot → panel: status radio (default Given) + "Note / how the animal took it" + "Save dose". Saves dose, appends history "date time: Status – note". If status≠given → notify `dose_missed` "<animal>: <status>" body "<med> <time>" to vet.
6. Non-pvet modes: "Last 7 days" grid (dates in course × times). Today's verification message "Vet checked {d}: ✓ Instructions followed / ✗ Not followed: note".
7. Vet actions on active rx: "✓ Instructions followed" / "✗ Not followed" (prompt "What was wrong?", cancellable) → `verify[today]`, history. Links: "Change dose / treatment" (opens form prefilled; history records diff of med/dose/route/times/days/instr/follow "Label: old → new" + "(reason)", sets changedAt), "Add follow-up" (prompt YYYY-MM-DD default today+3; changedAt), "Treatment completed" / "Stop treatment" (status; changedAt), Confirm (pending=false; changedAt).
8. "History (n)" collapsible: time · role · text. Media box `rx:<id>` (strip-only in view mode) (L4892).
New rx history first entry: "med dose route · times · days d".

### 1.4 Observations screen `pobs` ("Health observations"; "Site-wise health observations for the Vet.") L3964-3983
- Pvet: "Add observation" → form: Type of entry `kind` radio OBS_KIND; if kind ≠ Health observation: "Vaccine / medicine / sample details" `prod`; Site/zone, Cage; Animal name (REQUIRED), Time (default now); "What you saw" `tags` checkboxes (bad ones styled red); Temperature (°C, if taken) number step 0.1; Notes; media box `pobsdraft`→moved to `pobs:<id>`; "Save and send to Vet" (toast sentOk; notify `health_observation` "Paravet observation" → vet).
- List (latest 60): card red if any bad tag; "<Kind>: animal", date time, site·cage·prod·temp; tags – note; Vet reply; "✓ Seen by Vet". Vet: "Mark seen", "Reply" (inline text + "+"; reply sets vetSeen).
- Empty: "No observations yet."

### 1.5 Medical flags (L3892-3911, multi-user override L4040-4042)
Sources (date ≥ today-6 unless noted): (a) shared animal alerts of types Mortality, Sick / injured, Injury, Injury to animal, Fight, Fight between animals, Animal looks dull / lethargic, Not eating / not drinking, Animal down / collapsed, Under treatment, Unusual calling / distress (id `al:<alertId>`, src = reporter role); (b) today's Biologist actions addressed "Tell Vet" (`bio:`); (c) alerts of type "Special duty concern" (from keeper special-duty obs tags Aggression, Restless / distressed, Not eating, Heavy breathing, Bleeding / wound) — replaces local `sp:` items; (d) paravet observations with bad tags (`po:`).
States: open → checked (paravet note) → closed (vet). Sort open, checked, closed; then newest. Card: title, date, where · From: source; status label "Open"/"Checked by Paravet"/"Closed by Vet"; pv log; vet log.
Actions: Pvet on open: "Check on Vet's behalf" → textarea "What you found and did" (REQUIRED) → "Save check" → notify `medical_flag_checked` → vet. Vet: button "✓ Confirm & close" (if checked) or "Give instruction" → textarea; "Confirm & close" (note optional, closed=true) or "Give instruction" (note REQUIRED, closed=false). Only vet can close.

### 1.6 Paravet Today `pvtoday` (L3985-3990, +vaccination box L4717)
Top: Vaccinations & deworming due box (see 9.2). Tiles: Doses due today (all slots), Given (st=given), "Missed / refused / Overdue" (non-given recorded + overdue; hot if >0). List "💊 Doses due today" sorted by time: time animal · med dose (site · cage) → status. "⚠ Medical flags (n open)" + intro "Health concerns from all teams. The Paravet can check them on the Vet's behalf; only the Vet can close them."; cards of non-closed flags. Send box (key `pvet:<date>`, title "Paravet", role pvet) with text:
```
*DRS · PARAVET DAILY REPORT*
Date: <date>
*Doses due today (n)*  - HH:MM animal – med dose: Status (note) | Overdue | Due
*Health observations (n)*  - time Kind: prod – animal (site · cage): tags, temp °C – note
*Checked by Paravet (n)*  - title: pv note   (flags checked today)
```
Inbox: SENT keys `pvet:*` appear as report kind "pvet" (owner role pvet) (L4008-4009).

### 1.7 Vet dashboard additions (cdash, L3992-3995)
Box "🩺 Paravet updates": tiles given/total, Missed (missed+overdue; hot), Checked by Paravet (hot), Open flags, Health observations unseen, Treatments to verify (active and pending or not verified today). Warning "{n} flags checked by Paravet – Vet to confirm". Up to 6 non-closed flag cards. Vaccination box prepended (L4716).
### 1.8 Manager dashboard box (L4020-4023) "🩺 Medical today (Vet & Paravet)": tiles Active treatments, Given x/y, Missed (hot), Open flags (hot), Checked by Paravet, Procedures today (# obs today); list of missed/overdue doses; 4 flag cards (read-only); buttons "Open treatment sheet", "Open observations".
### 1.9 Pop-ups & badges (L3997-4006), poll every 5 s for pvet/vet (skipped while typing; suppressed in quiet hours, see 4.6)
- Pvet pop-up "💊 Vet updated n treatment(s)" for rx with changedAt > last seen: animal, site, med · dose · times · status, last history entry. OK/Close.
- Vet pop-up "🩺 n flags checked by Paravet – Vet to confirm" for newly checked flags.
- Badges: pvet `pvtoday` = overdue slots + open flags (red if overdue). vet `rx` = pending rx (red), `pobs` = unseen obs.

---
## 2. MULTI-USER READINESS (L4026-4089)
- Biologist red flags published to shared `kc-bioflags-<date>` = {bioName:[{txt,k:"v"|"c"|"s",done}]} on each bio save; other roles read actions from it (v=Tell Vet, c=Tell Curator, s=Tell Supervisor) (L4034-4036).
- Special-duty concerns (keeper) become alerts type "Special duty concern" (added to AL_BAD) with details "tags – note" (L4037-4039).
- Data Operator movement register `autoMoves()` built from shared data (L4043-4047): alerts Birth→Birth, Mortality→Mortality, New arrival→Arrival (in), Transfer out→Departure (out) (count, cage, src sup/keeper/vet); incidents with outcome "Died"→Mortality; completed shiftings: "To another site"→Site change, "Incoming from outside"→Arrival (in), else Cage change.
- Manager dashboard Births/Mortality tiles = sum of counts of today's shared alerts (Mortality tile hot if >0) (L4048-4049). syncAlerts runs on every navigation.
- Alert ownership (L4053-4065): `meId()` = DRS_ANTS_USER.uid or "local". Alert id = `<uid>/<localId>` in multi-user. Source prefix→roles that may create: sup,inc→sup; night,sp→keeper; vetb,vetm→vet; incident alerts only by incident's uid. A phone deletes only today's alerts it owns that vanished. Alert record `{id,type,animal,cage,count,details,time,from,own,date,at,seen:{role:1}}` in `kc-alerts`; new alerts notify `animal_alert` to AL_TO.
- Ticket id suffix "/<last 3 of uid>" (L4067-4069) — superseded by Engine 11 numbering.
- URL params `role, post, name, zone, agency, lock=1` apply user (L4071).
- `window.DRS_REFRESH()` (L4074-4083): reloads shared keys (kc-issues, kc-alerts, kc-sent, kc-pins, kc-shifts, kc-etho, kc-incidents, kc-events, kc-agencies, kc-cover, kc-staff, kc-att, kc-moves, kc-move-verify, kc-stock-open, kc-plans, kc-reg, rx/pobs/mflag) and redraws in place keeping open `<details>` and scroll; on own-report screens (sup, bio, today) redraws only shared parts (issues, alert box, pins, event banner, cover, badges).
- Incidents store reporter `uid` (L4086). File-save hook `window.DRS_SAVE_FILE(name, base64, mime)` for Android WebView (L4051).
- Version: DRS 2.0.0, build 2026-10-10; "DRS version {v} · build {b}" shown in role menu and Learn screen (L4089-4093).

---
## 3. ENGINE 11 — Identity, roles, site context, screens, ticket numbers, report privacy (L4094-4242)
### 3.1 Sign-in (demo) L4178-4201
Sheet "Sign in": intro "Demo: choose a job role and site. In the real app, staff sign in with their ANTS account and DRS opens with their role, site and zone." Selects Cluster (default V1) and Site (default V1S1; changing cluster selects its first site). Role buttons (SIGN_ROLES, only those defined): exec "Chief Executive Officer", ch, sadmin "DRS Super Admin", siteadmin "DRS Site Admin", mgr "Site Manager", cur, acur, bio, vet "Veterinarian", pvet, afm "Assistant Facility Manager", sup "Head Animal Keeper", keeper "Animal Keeper", agency "Maintenance Agency"; each shows matching person name · ANTS title · cluster/site. personFor: exec/sadmin first such person; ch/siteadmin by cluster; agency serving cluster; others by role+site. signIn stores `drs-user`, `kc-role`, `drs-site` (multi-site roles: selected site if in scope else first scope site), records `kc-sessions[uid]=ts`, reloads. Buttons: away (`awayBtn`), "Sign out" (clears user/role). Footer version · "Demo data"/"ANTS". If connected to ANTS: "You are signed in with your ANTS account." card (name, uid · ANTS title · site), no role picker. `window.drsSignIn(role,site)`.
### 3.2 Context bar (L4169-4176) under top bar: "<name> · <role>" + button "📍 where": exec/sadmin on xdash "All clusters"; ch/siteadmin on xdash "Cluster X"; else "cluster · siteCode · zone". Enabled only if >1 scope site → sheet "📍 Choose site" grouped by cluster, site buttons code + name + "n 🛠" open tickets; choosing stores `drs-site`, remembers current view (sessionStorage `drs-view`), reloads and restores view (L5012).
### 3.3 Ticket numbers (L4203-4224)
Format `<siteCode>-<YY>-<WorkLetter>-<NNNN>` e.g. `V1S2-26-P-0001` (header text says V1S2-26-0001; code includes letter). One running counter per site per year (`kc-tkn-<YY>`, site-scoped), shared across letters. Server override `window.DRS_NEXT_TICKET(site,yy,letter)`. Ticket also gets `wc, _num:1, site, byUid, byName`.
Letters: P Plumbing · F Fabrication / metal (Fabrication, Mesh) · C Carpentry & painting · E Electrical · M Masonry / civil (Civil) · A AC & cooling · H Housekeeping · Q Equipment · O Other. Free-text category fallback keyword regex (drain/water/pipe/tap/pool/leak/plumb/sewer/tank→P; weld/metal/mesh/gate/grill/lock/iron/steel/fabric→F; wood/carpent/paint/door frame/platform/nest/furniture→C; electric/light/power/wire/generator/bulb/switch→E; wall/floor/roof/civil/plaster/brick/moat/concrete/mason→M; ac/cool/fan/chiller/hvac→A; clean/waste/garbage/sweep→H; machine/equip/vehicle/tool/pump→Q; else O). Legend "Ticket letter: P Plumbing · …" under complaint category buttons.
### 3.4 Reports visible only to recipients (L4225-4235)
canSeeReport: admins (sadmin, siteadmin) see all ("Admin view"); unsent draft visible only to its owner role; sent: visible to sender role / sender uid, or if `to` contains a label of the viewer's role (LBL_OF: sup→Site Supervisor/Head Animal Keeper, bio→Biologist, acur→Assistant Curator, cur→Curator, vet→Vet, pvet→Paravet, afm→AFM, mgr→Manager, ch→Cluster Head, exec→CEO / COO) or a group containing the role (Site group = sup,bio,acur,cur,vet,pvet,afm,mgr,keeper; Zone group = sup,keeper; Vet team = vet,pvet; Curator office = cur,acur). Sent records gain `byUid, byName, site`. Inbox banner "🔒 Reports you can see: sent to you, sent by you, or your own drafts."
Pre-fill: signed-in name into all form "name" fields, supervisor zone (L4237-4238). Agencies imported from ANTS into global `kc-agencies` once; agency user's agency id → `kc-agency-id`.

---
## 4. ENGINE 12 — Security & Admin (L4244-4365)
### 4.1 Data
- `kc-settings` (global) defaults: exportRoles [mgr,cur,ch,exec,sadmin,siteadmin]; officeOnly [sadmin]; lockMin 5; signOutH 12.
- `kc-useradm` (global) uid → `{status:"active"|"suspended"|"readonly", extra:[viewIds], signoutAt, by, at}`.
- `kc-pin` (user) `{salt, hash}` (FNV-1a 32-bit over "salt:pin" + 2000 mixing rounds; production: secure keystore + biometrics via `window.DRS_BIOMETRIC()`).
- `kc-exportlog` (site) last 300 `{name, by, byName, role, at}`. Device: `drs-sess-<uid>`, `drs-last-active`, `drs-office-net`.
### 4.2 Permission: canAdmin(uid): sadmin any; siteadmin only people in own cluster and not sadmin/exec. Admin list excludes self.
### 4.3 Guards on load (L4281-4288), in order: remote sign-out if `signoutAt` > this device's session start → alert "You were signed out by an admin."; auto sign-out if inactive > signOutH hours; suspended → block screen "Your DRS access is suspended. Please contact your admin." (+Sign out); role in officeOnly and device not on office network → "For security, DRS opens only from the office network for your role."; readonly → body class `readonly` ("Read-only access" banner); role not in exportRoles → class `noexport`.
### 4.4 App lock: lock screen when PIN set and idle > lockMin minutes (check every 15 s); unlock by PIN ("Wrong PIN") or fingerprint/face. Activity = click/keydown/touch.
Security screen `secure` (More for all; "App lock and sign-out for this phone."): status "App PIN is on. DRS locks after {m} minutes without use." / "No app PIN yet."; New 4-digit PIN + Repeat PIN (must be 4 digits, match → "PIN saved" / "PINs do not match"); Set/Change PIN, Lock now, Remove PIN; Quiet hours box (4.6 below); Sign out.
### 4.5 Exports (L4313-4320): only exportRoles may save files (else toast "Your role cannot download files."). Watermark "Exported by {name} ({role}), {datetime} · DRS · {site}" appended to Word/PDF text, prepended to CSV/text; Excel gets sheet "Export info" (Exported by, Role, EP, Site, Time). Every export logged.
### 4.6 Admin screen `admin` (sadmin, siteadmin) L4325-4359
1. "👥 Users": search (name, EP, site, ANTS title), Role filter (All roles + roles present), Site filter (All clusters, cluster codes, site codes); "Showing n of t" (max 40).
2. Row: name, EP, status tag (Active/Read-only/Suspended); role · ANTS title · site/cluster · zone; "+ extra views". "⋯" opens panel: Suspend/Activate; Read-only/Full access; "Extra access" checkboxes from {maint Maintenance, verify Verify, afm Issues, inbox Reports, att Attendance, timeline Animal timeline, safety Safety, inv Investigations, xdash Dashboard, roster Roster and leave, etho Ethogram, events Events} minus the person's own tabs (extra views appear in their More); "Sign out all devices" (sets signoutAt); "Transfer work" → select "Transfer open work from {a} to" (same-site people, max 30) → toast "{n} items transferred".
3. Transfer (L4361-4365): in person's site (or admin scope) lists kc-issues, kc-events, kc-incidents, kc-shifts, kc-plans, kc-inv, kc-leave, kc-pmjobs; non-closed records and their `actions[]` fields byUid/uid/ownerUid/assigneeUid = from → to (byName updated); open notices sent by them reassigned.
4. Super Admin only "🛡 Security settings": "Who may download Word, PDF, Excel" (role checkboxes), "Open DRS only from the office network" (role checkboxes), "Lock DRS after (minutes without use)" ≥1, "Sign out after (hours without use)" ≥1.
5. "🔗 ANTS job titles → DRS roles" table (ANTS, DRS, people count): "Read from ANTS. New staff added in ANTS get DRS access with the matching role automatically."
6. "📥 Export log (this site)" last 10.
7. "🧪 Demo tools": office-network checkbox; clock forward +1 h/+3 h/+7 h/+1 day/Reset ("Demo clock: +{h} h") — re-runs reminders/escalations.
Header note: server must enforce the same checks.

---
## 5. ENGINE 13 — Compulsory notices, shifting, priority & quiet hours, escalation, digest (L4367-4511)
### 5.1 Data `kc-notices` (GLOBAL) notice: `{id:"NT"+ts+rand, kind:"notice"|"shifting", rev:1, revAt, at, byUid, byName, byRole, site, sites[], roles[], title, body, pri:"Critical"|"Important"|"Information", targets:[uid] (sender excluded, dedup), resp:{uid:{choice, comment, at, rev, role}}, remind:{uid:ts}, esc:{uid:{to,toName,toRole,at}}, closed, opts?, roleOpts?, link:{shift, ants}, sig}`. Pending for me = not closed, I'm a target, and no response with rev ≥ notice rev.
### 5.2 Create (roles CAN_NOTICE = cur, mgr, ch, exec, sadmin, siteadmin) — "New compulsory notice" form: Title (REQUIRED), Message, Priority radio Critical/Important/Information (default Important), "Who must reply" role checkboxes (all roles except sadmin, siteadmin, agency; default sup+keeper; ≥1 REQUIRED, else "Add a title and choose who must reply"), Sites radio: "This site" (all), "My cluster" (ch, siteadmin, exec, sadmin), "All sites" (exec, sadmin); media box. "Send notice" → toast "Notice sent to {n} people"; notify `compulsory_notice` to targets with priority. Targets = staff with chosen role at chosen sites, plus ch/siteadmin whose cluster contains a chosen site, plus exec if exec chosen.
### 5.3 Reply: options default NT_OPTS = Acknowledged / ready · Need changes · Can't attend (first preselected); comment "Comment (needed for 'Need changes' / 'Can't')" REQUIRED when choice matches Need changes|Can't|Hold|Not fit|Sedation. "✓ Send reply" → "Reply sent". Choices Need changes/Can't/Hold/Not fit notify sender `notice_reply` (Important).
### 5.4 Red banner on every screen (except Notices): "⚠ {n} notice(s) needs your reply · <title of first Critical or first> · Reply now ›"; badge on Notices tab.
### 5.5 Notices screen sections: New button/form; "⚠ Waiting for your reply (n)" ("Nothing waiting for you."); "⬆ Escalated to you" (board mode); "📤 Notices I sent" (last 15); "✓ Replied" (last 10). Card: (🦓 for shifting) title, time, priority tag, "From {n}" · role · site, "Updated – please reply again" if rev>1, body, "🔗 ANTS transfer: …", media; mine/board: "Replies: a of b" + progress bar, "Show all" → per-target rows (unreplied first, max 60) with ✓ choice – comment / "escalated to {name}" / "reminded" / "Pending"; sender: "Close notice".
### 5.6 Timers (tickAll every 60 s on every phone; server in production) L4401-4416: since = revAt||at. No reply after **2 h** → reminder push `notice_reminder` "Reminder: <title>" to that person (once per rev). After **6 h** → escalate to next level `notice_escalation` "No reply: <title>" body "<name> has not replied in 6 hours" (Important). Escalation ladder NEXT_UP: keeper→sup (same zone preferred), sup→mgr, pvet→vet, vet→mgr, bio→cur, acur→cur, cur→mgr, afm→mgr, mgr→ch (of cluster), siteadmin→sadmin, ch→exec, agency→afm; exec/sadmin none.
### 5.7 Shifting → compulsory notice (L4471-4481): shifting form gains field `toSite` "Destination site code (e.g. V2S4)". On shifting edits (debounce 2.5 s input / 0.8 s change), each shifting with animal+date and not Completed/Cancelled: signature = animal|kind|date|time|to|toSite|from. New → notice kind shifting, title "Animal shifting: {animal}", body "animal (species)\nkind: from → to [DEST]\ndate · time\nhow\nwhy", pri Important, targets = this site's sup, cur, bio, vet, mgr + destination site's sup, cur, mgr; link ants "ANTS transfer to be raised in ANTS"; toast "Shifting notice sent – everyone involved must reply." Role-specific options SH_OPTS: vet: Health check done / Sedation needed / Not fit to move; sup: Keepers and route ready / Need changes / Can't attend; cur: Approve / Hold / Need changes; mgr: Approve / Hold; bio, acur: Ready / Need changes. Changed signature → rev+1, revAt=now, targets merged, reminders/escalations reset, push `shifting_update` (everyone must reply again).
### 5.8 Quiet hours & priority (L4483-4491): per user `kc-quiet {on:false, from:"22:00", to:"06:00"}` (wraps midnight). UI in Security screen: "🌙 Quiet hours" "During quiet hours only Critical items pop up. Others wait in the list." checkbox + From/To. During quiet hours these pop-ups are suppressed: alertPopup, afmPopup (shown anyway if any new P1 ticket), evPopup, agencyPopup, afmDonePopup, pvPopups. SOS pop-ups are NOT suppressed. Push priority `DRS_PRIORITY_OF(ev)` = ev.priority or animal_alert Important, afm_ticket Important, sos Critical, compulsory_notice Important, else Information.
### 5.9 Daily digest `digest` (More for mgr, ch, exec, cur) L4493-4510: generated on demand for TODAY (no scheduled send time in code). Site: mgr/cur own; others current site if in scope else first. Text:
```
*DRS · DAILY DIGEST*  <site> · <date>
*Animals* Births: Σcount Birth alerts · Mortality: Σcount Mortality alerts · Animal alerts: #alerts today
*Maintenance* opened today · closed today (closed-history date) · open total · past time target (SLA breach)
*Staff* present/staffN present   (present = att status in Present, Late, Half day, On duty elsewhere; staffN = keepers+sups at site)
*Safety* - incident type: animal (outcome) | "No incidents"
*Notices* n replies pending (open notices for site; targets at site with no response)
```
Also computes verified (recorded) and awaiting verification counts. AI box (7.4) + Send box (key `digest:<date>`, title "Daily digest <site>"); inbox kind "digest" (owner mgr), filtered by canSeeReport.

---
## 6. ENGINE 14 — Births/deaths verification → ANTS; Maintenance P1–P4 (L4513-4649)
### 6.1 Verification data `kc-verify` (site): `{id(alert id), type:"Birth"|"Mortality", species, cage, count, details, from, repUid, repName, date, at, status:"pending"|"recorded"|"rejected", encl, payload, antsRef, by, byName, verifiedAt, rejectReason}`.
Sync (on every syncAlerts): each Birth/Mortality alert creates a pending item + notify `verify_needed` "Birth to verify: X" → acur, cur, vet (Important) / "Death to verify: X" → vet (Critical). Pending items track alert edits (species/count/cage); pending items of today whose alert disappeared are removed.
Rules: Births verified by Assistant Curator, Curator OR Vet; Deaths by Vet only (others see "Deaths are verified by the Vet only.").
### 6.2 Verify screen `verify` ("Verify births and deaths"; "Reported by Supervisors, keepers and the Vet. Once verified, DRS records it in ANTS for that enclosure."): "⏳ Waiting for verification (n)" ("Nothing waiting.") + "✓ Recorded in ANTS" (last 20). Card: 🐣/🕯 Type: species × count, date, Cage · From reporter, details, media strip (`evt:<alertId without user prefix>`), status line "✓ Recorded in ANTS: {ref} · Verified by {n} · time" or "↩ Sent back: reason · name". "Verify" opens form:
- Enclosure (from ANTS) select (distinct ANTS enclosures for site; preselect cage).
- Birth: Male / Female / Unknown numbers (defaults 0/0/count). Payload count = m+f+u (or original), sex {m,f,u}.
- Death: Animal (from ANTS) select (name · species · enclosure, ≤80), Suspected cause text, "Post-mortem planned" checkbox (checked).
- "✓ Verify and record in ANTS" → `ANTS.record("birth"|"death", {site, enclosure, species, date, reportedBy, verifiedBy, drsId, …})` → ref (demo format `ANTS-B|D|V-YY#####`); status recorded; notify `birth_recorded`/`death_recorded` "<Type> recorded in ANTS: species (site)" → mgr, ch, exec (death Critical, birth Important); notify reporter `verify_result`. Photos optional.
- "Send back" → prompt "Why is it being sent back?" (required) → rejected; notify reporter (or reporter role).
Births & deaths log `verifyLog` (Manager More): last 40 cards, read-only ("who reported, who verified, and the ANTS record number"). Supervisor's Animal status shows "Your reported births and deaths" for today: ✓ ref / ↩ reason / Waiting.
### 6.3 Priorities & time targets (L4579-4588)
| P | label | respond within | fix within |
|---|---|---|---|
| P1 | Emergency | 30 min | 4 h |
| P2 | Urgent | 4 h | 24 h |
| P3 | Routine | 1 day | 5 days |
| P4 | Scheduled | 3 days | by scheduled date 17:00 (no date: +30 days) |
Legacy tickets: Urgent→P2, else P3. Response time = first history status in seen/assigned/accepted; fix time = first done/closed. respOk/fixOk: true/false, or null while still within target. breach = open and (response missed with none yet, or fix missed with none yet). "soon" = open, unfixed, <25% of fix window left.
Complaint form: Normal/Urgent radio hidden, replaced by P1–P4 radio (default P3, P1 styled red); P4 shows "Scheduled date" `due`. P1/P2 map to legacy Urgent. Logging P1 → notify `afm_ticket` "P1 EMERGENCY <id>" → afm, mgr (Critical). Programmatic newIssue accepts p, due, tag.
Ticket card SLA row: priority chip, work-letter chip "L · name", "Preventive" tag, "respond by {t}" / "fix by {t}" each as ✓ (on time) / ⚠ … late or "{d} over" / "{d} left"; last escalation "⬆ Escalated to {name}: no response in time | not fixed in time". AFM list sorted: open before closed, P1→P4, breached first (−5), then newest.
### 6.4 Escalation (slaTick every 60 s on site-role phones; not exec/sadmin/ch/siteadmin/agency) — AFM owns tickets → Manager → Cluster Head. Level mgr: when response or fix target missed (and not yet happened) → site Manager, push `ticket_escalation` "Escalated <id> (P)" (Critical for P1, else Important). Level ch: P1 fix missed, or any fix overdue by more than one more fix-window (P4: 1 day) → cluster's CH (Critical). Each level once; stored `x.esc=[{level, toName, toUid, at, why:"escResp"|"escFix"}]`.
### 6.5 Preventive jobs `kc-pmjobs` (site) `{id:"PM"+ts, title, cat (MCATS; default Mesh), loc, n (≥1), unit:"day"|"week"|"month", next date, active, last ticketId, byUid}`. pmTick (afm/mgr phones, every 60 s and on save): while active and next ≤ today (max 6 catch-ups): create ticket cat, prob "Preventive: <title>", loc, P4, due next+3 days, tag "pm"; next += n units. Toast "{n} preventive ticket(s) created". Pause/Resume (afm, mgr).
### 6.6 Maintenance screen `maint` (mgr, afm tabs; ch More; extra access). Scope: ch all cluster sites ("📍 Cluster X · n sites"), else current site.
1. "⏱ Time targets" tiles: Responded on time % (of tickets with determined respOk), Fixed on time %, Escalated tickets (open with esc; hot), Open P1..P4.
2. "⬆ Escalated tickets (n)" up to 15 ticket cards with site.
3. "🏗 Agency performance" table per agency with jobs: Agency (+ n open) · Jobs · Avg response (assigned→accepted) · Avg fix (accepted→done) · On time (% closed with fixOk) · Sent back (% jobs where a non-done status followed a done). Durations "x min / h / d".
4. "🔁 Preventive jobs" list (title; category · loc · Every n unit · Next due · last ticket) + Add form (Job, Type of work, Location, Every, Repeat day/week/month, Next due).
5. "📊 Ticket sheets" ("Every ticket keeps its opened and closed date…"): Month picker (default current) + "Whole year" checkbox, "{n} tickets", "Download sheet" → `DRS-Tickets-<site|cluster>-<YYYY-MM|YYYY>.xlsx` (sheets Tickets + Export info; CSV fallback). Columns: Ticket, Site, Opened, Priority, Work letter, Category, Problem, Location, Raised by, Agency, Status, Responded, Fixed, Closed, Response target met, Fix target met (Yes/No/blank), Escalated (levels). Includes archived months (Engine 18).

---
## 7. ENGINE 15 — Animals from ANTS, vaccination reminders, investigations, SOS, drills, roster/leave (L4651-4814)
Access by animal group: keepers and supervisors with a zone see only animals of their zone ("🔒 Showing animals of zone {z}"); others whole site.
### 7.1 Animal timeline `timeline`: search "Search animal name, ID or species" (40 results: name, id, species · enclosure · sex). Detail: name; id · species · sex · "{y} years" · enclosure · zone · "from ANTS"; Weight (kg) line chart (ANTS weights); Body condition score (1–5) chart; "📎 Photos and documents for this animal" media box `animal:<id>`; "History" merged newest first with ANTS/DRS pill: ANTS events, vaccinations "💉 type (by)", last 3 weights; DRS mentions by name/id: alerts (or species+enclosure match), rx "💊 med dose (dx)", obs "👁 kind: tags – note", incidents "⚠ type – outcome", verified deaths "🕯 type · ref".
### 7.2 Vaccinations & deworming (schedules from ANTS) `kc-vaccdone` (site) {scheduleId:{ref,by,at}}: due list = not done and due ≤ today+7, sorted by date; card animal · type, species · enclosure · "overdue (date)" / "due {d}". Vet/Pvet "Done – record in ANTS" → ANTS.record("vaccination-done") → "Recorded in ANTS: {r}". Box on Vet dashboard and Paravet Today (max 12, "+n"). Once per day per phone for vet/pvet: push `vaccination_due` "{n} vaccinations / dewormings due or overdue" (due ≤ today) (key `kc-vxnote-<date>`).
### 7.3 Investigations `inv` (`kc-inv` site) `{id:"INV"+ts, incId, site, incType, incAnimal, incDate, cat, cause, actions:[{text, ownerUid, due, done}], prev, status:"draft"|"submitted"|"more"|"closed", byUid, byName, subAt, chNote, closedBy}`.
List: every incident in scope (ch/exec: cluster/all scope; else site), newest first: type: animal, site · date, outcome · status (Not started / Draft / With Cluster Head / More needed / Closed) · done/total actions · "n overdue". Buttons "Start investigation"/"Edit" for cur, mgr, acur (own site) and ch. Exec read-only.
Editor: Cause type radio (Human error, Equipment / structure, Procedure gap, Animal behaviour, Weather, Other); Root cause textarea; Corrective actions (Action text, Owner select = site staff, Due default +7 d, Done checkbox) + "Add action"; "How we stop it happening again"; CH note shown. Author: "Submit to Cluster Head" (requires cause + ≥1 action) → status submitted, notify `investigation_submitted` → CH (Important), `action_assigned` to each owner "Corrective action: …" "Due …"; "Save draft". CH on submitted: Notes + "Accept and close" (closed) / "Ask for more" (note required → status more, notify author `investigation_more`).
### 7.4 Night SOS + check-ins (`kc-sos` site `{id, kind:"sos"|"missed", uid, name, zone, at, status:"open"|"responding"|"resolved", note, by, byAt}`; `kc-checkin` site uid→`{active,last,name,zone,missed,missedAt}`):
Keeper night panel (night duty + Safety screen): big "🆘 SOS – I need help" (confirm "Send SOS now?") → toast "SOS sent to Supervisor, Manager and Vet"; "Start night watch (check-ins every 60 min)" → shows "Last check-in {t} · next by {t+60}", "✓ I'm OK" (resets), "End night watch". Missed check-in: >75 min (60+15 grace) since last → auto SOS kind "missed" (once per lapse). Targets: site mgr, vet, sup of same zone; push `sos` Critical "🚨 SOS: name (site zone)" / "⚠ Missed check-in: …". sup/mgr/vet phones check every 20 s (and every 5 s / instantly on sync, overriding other open sheets): full-screen pop-up "🚨 SOS" with vibration [400,150,400,150,400], "I'm responding". Safety screen `safety`: last 15 SOS (status, responder); sup/mgr/vet "I'm responding" (open) / "Resolved".
### 7.5 Drills `kc-drills` (site): sup, mgr, cur, afm "Record a drill": Drill radio Fire / Animal escape / First aid / Evacuation / Power failure / Other (Fire); Date, Time, Minutes (20); "Who took part" checkboxes (site staff, excluding exec/ch/admins/agency); What we saw; Actions needed; Result Good / Needs improvement; media → `drill:<id>`. List cards (type, date time, min · #people · result · by, obs, actions in warning style).
### 7.6 Roster & leave (`kc-roster` site {weekMonday:{uid:{date:code}}}; `kc-leave` site `{id:"LV"+ts, uid, name, role, zone, from, to, type, reason, status:"pending"|"approved"|"rejected", at, by, byAt}`):
Roster `roster` (sup, mgr More): "🗓 Leave requests (n)" pending (mgr all; sup only keepers of own zone) with Approve/Reject; week grid (Monday start, ‹ Previous / Next ›) rows = keepers+sups of site (sup: own zone + self); tap cell cycles M → E → N → OFF → blank (sup/mgr); approved leave shows L (not editable). Legend "M = Morning · E = Evening · N = Night · OFF · L = Leave". Approval writes attendance `kc-att[date][uid]={st:"Sick leave"|"Leave"}` for each day; push `leave_result` to requester.
Leave `leave` (keeper More): "My shifts this week"; "Request leave": Type Casual/Sick/Earned/Other, From/To (default tomorrow; To ≥ From), Reason; push `leave_request` to approver (keeper→sup, others→mgr); my requests with status Waiting/Approved/Not approved.
Attendance staff list = ANTS staff at site excluding exec/ch/admins/agency (L4814).

---
## 8. ENGINE 16 — Photos, videos, documents (always optional) (L4816-4897)
Limits: file ≤40 MB ("File is too large"); video ≤60 s ("Video must be 60 seconds or less"); photos resized to max 1600 px, JPEG quality 0.82; document = PDF or image. Media box: thumbnails + buttons "📷 Photo" (camera), "🎥 Video" (camera), "📄 Document" (no capture) + "Optional – add photos, a short video or documents". Read-only strip where only viewing.
Mark-up editor after each photo: canvas tools "✏️ Draw" (pen), "⭕ Circle" (ellipse drag), "➜ Arrow" (line + head), "↶ Undo", "✓ Use photo", Cancel; red #FF2D2D, line width max(4, width/180).
Storage: blobs in IndexedDB `drs-media`/`blobs`; metadata `kc-media` (site) ref→[{id:"MD"+ts, type:image|video|pdf, name, size, mime, by, byName, at, pending, url}]. With server `window.DRS_MEDIA_UPLOAD(blob,meta)→url`; pending items retry every 30 s and on reconnect ("⏳ Waiting for network – will upload"). Viewer: full image/video/"Open document", name · by · time; Delete only own items (not in read-only strip).
Attach points (refs): complaint form `issuedraft`→`tk:<ticketId>` (strip on every ticket card); supervisor animal events `evt:sup:<date>:<i>` (shown on verify cards); incidents `inc:<id>`; paravet obs `pobsdraft`→`pobs:<id>`; rx `rx:<id>`; biologist report `bio:<date>`; night log `night:<date>`; role form `form:<date>`; shifting `shift:<id>`; notices `ntdraft:<key>`→`nt:<id>`; drills `drdraft:<key>`→`drill:<id>`; animal `animal:<id>`. Visible only where the record is visible.

---
## 9. ENGINE 17 — Executive layer (L4899-4978) screen `xdash`
Scope: exec/sadmin all clusters; ch (and siteadmin) start at own cluster. Period radio Today / 7 days (default) / 30 days. Real build: server "GET /exec/kpis". Demo adds deterministic sample history for past days ("Past days include demo history."); today always live.
Per-site per-day live values: opened (tickets created that day), closed (closed-history date), ontime (closed that day with fixOk), births (Σ verified recorded birth counts), deaths (# recorded deaths), inc (incidents dated that day), att % (present/keepers+sups ×100, null if not marked), esc (tickets with an escalation that day).
Site KPIs over period: sums of opened, closed, ontime, births, deaths, inc, esc; open = currently open tickets; breach = open breaching SLA; att = average of daily att%; ontimePct = ontime/closed; sos = unresolved SOS; pendR = targets at site with no reply on open notices. Aggregation (sumK) sums and averages att across sites.
KPI tiles (hot/ok rules): Open tickets (hot if breach>0), Fixed on time % (hot <70%, else ok), Escalated (hot >0), Births (ok), Deaths (hot >0), Attendance % (hot <85%), Incidents (hot >0), Replies pending (hot >0), SOS (hot >0).
Levels: (a) All: "n sites · n clusters", tiles, AI box, trend, cluster cards (tiles each, tap → cluster), feed. (b) Cluster: Back (exec/sadmin), "Cluster X · n sites", tiles, trend, "Sites in X · Needs attention first" table (Site, Open tickets (+breach ⚠), Fixed on time, Escalated, Births/Deaths, Attendance) ranked by breach×3 + esc×2 + deaths×3 + sos×5 + pendR; tap row → site; feed. (c) Site: Back, "code · name", tiles, trend, open tickets (8 cards), Daily digest text, AI box, "Open this site" (switch site).
Trend chart "Tickets opened vs closed": two lines per day over period (Today → last 14 days); orange opened, green closed.
Feed "Latest across sites" (12): recorded births/deaths, ticket escalations, submitted investigations, SOS.
AI summary box "✨ AI summary of the day": default offline text, button "✨ Write summary" → `window.DRS_AI_SUMMARY(facts)` or LLM prompt "short daily operations summary for leadership … plain calm English, 3–5 sentences, no headings, no invented facts. Mention what needs attention first. Data (JSON)". Facts: scope, period, sites, KPI sums, worst 3 (breach + esc×2 + deaths×3). Offline template: "<scope>, <period>: X complaints opened and Y closed (Z% fixed on time); N still open, B past their time target. Animals: … births and … deaths recorded in ANTS. Average attendance A%. n incidents reported. ⚠ n SOS alerts still open. n compulsory notice replies are pending. Needs attention first: site (n late tickets, n escalations, n deaths)."

---
## 10. ENGINE 18 — Platform (L4980-5012)
- Archive: closed tickets whose close time is >60 days old move from `kc-issues` to `kc-issues-arch-YYMM` (YYMM of opening date), run on afm/mgr phones 3 s after load. Ticket sheets also read archive months (selected month or all 12).
- Installable app (http/https only, unless `DRS_NO_SW`): manifest.webmanifest, apple-touch-icon icons/icon-192.png, apple-mobile-web-app-capable, title "DRS", theme-color #123F31, service worker sw.js (offline).
- ANTS login mode: if `window.DRS_LOGIN` and nobody signed in → sheet "Sign in to DRS" / "Use your ANTS employee number and password." fields Employee number (EP), Password; "Signing in…", error "Wrong employee number or password"; success reload. Opened inside ANTS → token / `?uid=&site=` auto sign-in (L171-173).

## 11. ENGINE 19 — "Send now" + instant delivery (L5014-5077)
- Supervisor animal events no longer half-sent while typing: an alert exists only after "Send now", and carries the sent snapshot (type, species, cage, count, details, time).
- Event card footer: not sent → "Not sent yet" + button "🚨 Send now to Vet, Curators, Biologist and Manager" (red if type in Mortality, Sick / injured, Staff injury / bite, Escape / near-miss, Under treatment, Behaviour concern); requires type ("Choose the type of event first"). Sent → "✓ Sent at HH:MM · Vet, Curators, Biologist, Paravet and Manager were notified." + "Seen by: roles | not seen yet" (from alert.seen); if edited after sending → "Changed after sending — tap Send update so everyone sees the new details." + "🔁 Send update". Send: snapshot, sentAt, sentBy, save, syncAlerts, DRS_FLUSH (immediate upload), toast "Sent — everyone concerned has been notified". Hint on events section "Urgent events go out the moment you tap Send now — you don't wait for the evening report." Legacy events with existing alerts count as sent.
- Updated alert: upd+1, updAt, seen reset to sender; push `animal_alert` "Updated: type: animal" (priority critical for Mortality, Escape / near-miss; else high); pops up again (pop tag id#upd; per-role `kc-alpop-<role>`, last 400; vibrate [150,80,150]). Pop-ups wait while another sheet is open (except SOS).
- `window.DRS_URGENT(keys)` called by connector on remote changes: refresh alerts box + popup, tickets (afmPopup, agencyPopup), notice banner, badges, event footers; kc-sos/kc-checkin → SOS immediately. Fallback poll every 4 s for alerts, 5 s for SOS.
- Sync adapter (s2.js): shared KV collection; device-only keys (`kc-role, kc-lang, kc-replang, drs-user, drs-site, kc-export, kc-tr-, drs-ants-, drsdemo, drs-now-offset, drs-last-active, @u:*, @_/*`); URGENT keys regex `kc-(alerts|issues|notices|sos|verify|checkin)$` uploaded first and trigger DRS_URGENT; offline queue with retry; 3-way merge: id-lists merged per id (local changes win, local deletions applied), objects merged per key; soft refresh via DRS_REFRESH after 800 ms when not busy (not typing, no sheet/media viewer open). Banners: live / off / view only / retrying.

## 12. NOTIFICATION TYPES (this slice)
dose_missed→vet; health_observation→vet; medical_flag_checked→vet; animal_alert→AL_TO; compulsory_notice→targets; notice_reminder (2 h); notice_escalation (6 h)→next level; notice_reply→sender; shifting_update→targets; verify_needed→acur/cur/vet (birth) or vet (death, Critical); birth_recorded/death_recorded→mgr/ch/exec; verify_result→reporter; afm_ticket (P1)→afm/mgr Critical; ticket_escalation→mgr / ch; vaccination_due→vet/pvet; investigation_submitted→ch; action_assigned→owner; investigation_more→author; sos (Critical)→mgr/vet/zone sup; leave_request→sup|mgr; leave_result→requester.

## 13. NOTED GAPS / QUIRKS (for rebuild decisions)
- Ticket header example omits work letter; code uses `SITE-YY-L-NNNN`. Engine 10 uid suffix is overwritten by Engine 11 numbering.
- Daily digest has no automatic schedule; built on open / sent manually.
- Death verification animal list is not filtered by chosen enclosure at render time (encl unset until saved).
- Notice "Replies pending" counts any response (ignores rev); pending-for-me respects rev.
- Admin "Transfer to" list = same-site people (role filter ineffective).
- Agency role has no More tab/Security screen.
- "Skip marking" label defined but unused.
