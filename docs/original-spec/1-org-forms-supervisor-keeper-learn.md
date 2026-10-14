# DRS rebuild spec, part A: org, labels, forms, supervisor, keeper, animals, learn, plans (all_en.js lines 1–2400)

Source: `all_en.js` (L = line). Markup: `<body>` views `v-sup`, `v-today`, `v-animals`, `v-plans`, `v-learn`, `v-log`, `v-form`, overlay `rolePick`, `nav#navIn`, `#toast`.
Note: in the stripped source, Hindi strings are "…". In the original, every label and content string is a bilingual pair `[en, hi]`, read with `XL()`/`L2()`. Some structures look like plain strings here (SOP titles `c[2][L]`, labels `I[k]`) but the original stores them as pairs. A rebuild should store `{en, hi, …}` per string.
Later code (L2400+, other slices) overrides several things defined here: `ROLES` and nav, `renderNav`, `buildReport`, the issue/AFM model, and send/inbox. This part describes the **base** behaviour and says where it is extended later.

---

## 0. App shell (HTML)

- Title "DEMO · DRS · Daily Report System". Fonts: Bricolage Grotesque, Atkinson Hyperlegible, Noto Sans Devanagari.
- `#demoBanner`.
- Top bar, in order: app name (`I.appName` = "Keeper's Companion"), events icon button `#evTop` 📅 (later slice), role button `#roleBtn` ("Supervisor ▾" etc.), language toggle `#langBtn`.
- Slot divs filled by later slices: `#coverBox`, `#pinBox`, `#alertBox`, `#evBox`.
- One `<section class="view">` per screen. Exactly one has class `on`.
- Bottom nav `<nav><div id="navIn" role="tablist">`: tab buttons with SVG icon and label. CSS var `--n` = number of tabs.
- Overlays: `#repSheet` (later) and `#rolePick` (role chooser sheet).
- `#toast` shows a message for 1.9 s (L1965).

---

## 1. ORG.JS: ANTS adapter, sample org, identity, scoping, clock (L2–188)

### 1.1 Purpose
DRS keeps no master data. Animals, sites and staff come from **ANTS** (the animal/HR system) through `window.ANTS`. The demo ships a deterministic SAMPLE, seeded so every phone gets the same data (L29–35).

### 1.2 ANTS adapter contract (L12–18, L135–136)
| fn | returns |
|---|---|
| `clusters()` | `[{code,name,sites:[{code,name,cluster,zones:[{code,enclosures:[code]}]}]}]` |
| `staff()` | `[{uid,name,ep,antsRole,role,cluster,site,zone,agency?,title?}]` |
| `animals(site)` | `[{id,name,species,site,zone,enclosure,sex,dob}]` |
| `history(animalId)` | `{weights:[{date,kg}],bcs:[{date,score}],vacc:[{date,type,by}],events:[{date,text}]}` |
| `schedules(site)` | `[{id,animalId,animal,species,enclosure,type:"Vaccination"\|"Deworming",due}]` |
| `record(kind,payload)` | `{ok,ref}`, kind ∈ `birth`, `death`, `vaccination-done` |
| `login(user,pass)` | `{uid,token}` (real build only) |
| `agencies()` | the agency list (demo) |
| `roleMap` | ANTS title → DRS role |

- Flags: `demo:true` on the sample; `ANTS.connected` on the real build.
- If `window.ANTS` is already defined, the sample is not used (L136).

### 1.3 ANTS job title → DRS role (L38–44)
| ANTS title | DRS role |
|---|---|
| Chief Executive Officer, Chief Operating Officer | exec |
| Cluster Head | ch |
| Site Manager | mgr |
| Curator | cur |
| Assistant Curator | acur |
| Biologist | bio |
| Veterinarian | vet |
| Paravet | pvet |
| Assistant Facility Manager | afm |
| Head Animal Keeper, Site Supervisor | sup |
| Animal Keeper, Night Keeper | keeper |
| DRS Super Admin | sadmin |
| DRS Site Admin | siteadmin |
| Maintenance Agency | agency |

### 1.4 Sample org: exact sizes and naming
- **Clusters**: `V1`–`V5`, named "Cluster V1"… Sites per cluster are `[10,9,10,8,3]`, so **40 sites** (L47).
- **Sites**: code `V{c}S{n}` (e.g. `V1S2`), name "Site S{n}".
- **Zones**: 2–4 per site (seeded), code `Z1`…. Total 121 zones.
- **Enclosures**: 3–6 per zone, code `Z{z}-E{nn}` (e.g. `Z1-E03`). Total 561 enclosures.
- **Animals**: per enclosure, one species from 20 SPECIES, with a count in a min–max range (L50):
  - tiger 1–3, Asian elephant 1–4, Indian leopard 1–2, Asiatic lion 2–4, blackbuck 6–14, spotted deer 8–20, nilgai 3–8, sloth bear 1–3, gharial 3–8, mugger 2–6, Indian rhino 1–2, sarus crane 2–4, Indian star tortoise 6–20, hoolock gibbon 2–4, lion-tailed macaque 4–9, red panda 1–3, rock python 1–3, striped hyena 2–4, peafowl 4–10, Himalayan black bear 1–2.
  - Total **2,629 animals**.
  - Animal id `{site}-A{nnnn}` (e.g. `V1S1-A0001`).
  - Name: the 10 "BIG" species get a personal name from 28 NAMES (Raja, Rani, Moti, Shera…). Others get "{species} #{i}".
  - Sex is picked from [Male, Female, Female, Unknown]. dob is 1–15 years ago.
- **history(id)**:
  - 12 monthly weights, starting from KG base × 0.85–1.15 and drifting ±3%.
  - Quarterly BCS, starting at 3 and clamped 2–4.
  - One Vaccination (by Vet) 150–210 days ago and one Deworming (by Paravet) 80–110 days ago.
  - Events: "Born / acquired" and "Moved to enclosure X".
- **schedules(site)**: every 3rd animal gets one Vaccination or Deworming due between −8 and +31 days (some overdue). Id `SCH-{animalId}-{i}`.
- **record()**: writes to the local log `ants-demo-records` (max 500 kept). Ref format `ANTS-{B|D|V}-{yy}{nnnnn}`, e.g. `ANTS-B-2600001`.
- **Staff** (L68–90): **620 people**. uid = ep = `EP1001`… in creation order. Name = FIRST (30 names) + LAST (20 names), seeded.
  - EP1001 CEO (title "CEO") and EP1002 COO.
  - 2 DRS Super Admins.
  - Per cluster: 1 Cluster Head and 1 DRS Site Admin.
  - Per site, 7 people: Site Manager, Curator, Assistant Curator, Biologist, Veterinarian, Paravet, AFM.
  - Per zone:
    - zone 1: Head Animal Keeper, plus Animal Keeper (k1), plus Night Keeper (k2).
    - zone 2: Site Supervisor, plus 2 Animal Keepers.
    - zone 3+: 2 Animal Keepers.
  - Totals: 202 Animal Keepers, 40 Night Keepers, 40 Head Animal Keepers, 40 Site Supervisors, and 40 of each site role.
- **Agencies** (L91–96). Each logs in as a staff record with `role:"agency"` and `cluster` = its first cluster.
  - AG1 `AG-1021` Shree Fabricators [Fabrication, Civil, Mesh]; contact Mahesh; clusters V1,V2
  - AG2 `AG-1034` Aqua Plumbing Services [Plumbing, Electrical]; Irfan; V1,V3,V4
  - AG3 `AG-1047` GreenBuild Civil Works [Civil, Painting, Carpentry]; Raghav; V2,V4,V5
  - AG4 `AG-1052` CoolAir Technicians [AC, Electrical, Equipment]; Salim; V1–V5

### 1.5 ORG helpers (L139–157)
- `clusters`, `sites`, `site(code)`, `staff`, `user(uid)`.
- `people(filter)`: AND of key = value. An array value means "in".
- `roleMap`.
- `MULTI` = exec, ch, sadmin, siteadmin, agency (roles that work across sites).
- `scopeSites(u)`:

  | role | sites in scope |
  |---|---|
  | exec, sadmin | all |
  | ch, siteadmin | sites in own cluster |
  | agency | sites in the agency's clusters |
  | anyone else | own site |

- `me()` = the staff record for stored `drs-user`.
- `activeSite()` = stored `drs-site` if it is in scope, else the user's site, else the first site in scope, else `"_"`.
- `clusterOf(site)`.
- `tkCode(site)` = site code. This is the ticket prefix, e.g. `V1S2` (used by later ticket numbering).

### 1.6 Clock (L160)
`NOW()` = `Date.now()` + `localStorage["drs-now-offset"]`. This is a demo fast-forward for testing reminders, escalations and missed targets.

### 1.7 Storage scoping (L163–179)
- All DRS keys go through `DRS_STORAGE.get/set`. The host app may pre-define `window.DRS_STORAGE` (e.g. synced to a server).
- **GLOBAL keys** (stored unchanged) match: `kc-role, kc-lang, kc-replang, drs-user, drs-site, kc-agencies, kc-notices, kc-useradm, kc-settings, kc-tr-*, kc-export*, drs-ants-*, drsdemo-*, kc-sessions, kc-pmjobs-all`.
- **USER keys** are stored as `@u:{uid}/{key}`. They match: `kc-lastto-*, kc-read, kc-alpop-*, kc-evpop-*, kc-agpop-*, kc-afm-popped, kc-afmdone-pop, kc-vetmfpop, kc-pvpop, kc-notes, kc-done*, kc-logs*, kc-train*, kc-quiz*, kc-mem-*, kc-sup-name*, kc-bio-name*, kc-pin*, kc-quiet*, kc-ntpop*, kc-duty*, kc-ntseen*, kc-sos-*`.
- **Everything else is per site**: `@{activeSite}/{key}`, e.g. `@V1S2/kc-issues`.
- `storeAt.get/set(site,key)` reads or writes another site's data (dashboards, cross-site notices).

### 1.8 Identity / sign-in (L182–187)
- URL `?uid=EP1001&token=…[&site=V1S2]` (when ANTS is not "connected" and the uid exists) sets `drs-user`, `kc-role` = user.role and, optionally, `drs-site`.
- `window.DRS_ANTS_USER = {uid, role, name, site, zone}` is the owner stamped on new records.
- `kc-role` is always forced to the signed-in user's role. If nobody is signed in, it is set to null.

---

## 2. I18N and label tables

- **`I`**: UI label dictionary, extended with `Object.assign(I,…)` throughout (L190, 355, 461, 505, 1099…). Keys:
  - Supervisor: `s1…s10`, `r1…r9`.
  - Biologist: `b1…b8`, `c_*`.
  - Plans: `plansH…`. Learn: `learnH…`. Quiz: `quizP…`.
  - Plus the register/weekly/insects keys.
  - Placeholders use `{n}`-style tokens: `ofDone:"{n} of {t} done"`, `meshCount:"{n} of {t} {w} checked"`, `openFor:"Open {d}"`, `nDays:"{n} days"`, `confirmDel:"Delete {id}?"`, `scored:"You scored {s} of 5"`, `best:"Best: {s}/5"`, `chShort:"Book {b}, Ch {c}"`, `level:"Level {n}"`, `trained:"{n} of {t} signed off"`, `due:"Due {d}"`, `stepsDone:"{n} of {t} steps"`.
- **`V`**: translations for stored English **values**. Records always store English values; the UI translates them on display (`tv(v)`).
- **`OP(...pairs)`** (L1803): declares option lists and registers their Hindi in V.
- Functions (L1954–1964):
  - `LANG` = stored `kc-lang` (default "en"). `t(key, vars)`, `L2(pair)`, `tv(value)`.
  - Languages other than en/hi use `window.TRX[english]` (multi-language slice, L3776+).
  - `LOCALES` for date formatting: hi, mr, gu, rwr→hi-IN, ta, te, ml, kn, bn, pa, or, es, de.
  - `fmtDate("YYYY-MM-DD")` → e.g. "Tue, 14 Oct 2026" in the locale. `nowHM()` → "HH:MM". `TODAY` = local "YYYY-MM-DD".
- **Language toggle** (L2213–2226):
  - `#langBtn` switches en↔hi. The button shows the other language's name.
  - It saves `kc-lang` and runs `applyLang()`:
    - sets `<html lang>`;
    - fills every `[data-i18n]` text, `[data-i18n-ph]` placeholder and `[data-v]` value label;
    - re-renders every module (supervisor, keeper, care, explorer, skills, log segs, nav, biologist, plans, SOP, quiz, bugs, register, weekly, open report/role sheet).

---

## 3. DRS form definitions (FORMS, L1802–1949)

### 3.1 Form schema
- Form: `{title, small, role, sections:[{k, l, sub?, fields:[…]}]}`.
- Field: `{k, t, l, o?, bad?, req?, mem?, now?, min?, add?, item?, fields?, afm?}`.
- Field types (`t`):

  | type | meaning |
  |---|---|
  | `text` | single-line text |
  | `area` | textarea |
  | `time` | time; `now:1` pre-fills the current HH:MM |
  | `date` | date |
  | `num` | number |
  | `check` | checkbox |
  | `seg` | single choice (radio pills) |
  | `multi` | multi-select chips |
  | `group` | repeatable sub-records; `min` = minimum count, `add` = add-button label, `item` = item title |

- `bad`: options shown red and counted as flags (they feed alerts and red-flag counts in the engine).
- `req:1`: required to send.
- `mem:1`: remembered per user (`kc-mem-*`, USER scope) and auto-filled next time.
- `afm:1`: the checkbox "Send site work to AFM" creates an AFM ticket from that row.
- Rendering, draft/save, send and recipients are in the **DRS ENGINE** (L2771+, other slice). Records are keyed `RECK(form, day)`.

### 3.2 Shared option lists (L1804–1807)
- `RECIP_PEOPLE`: Head Animal Keeper, Site Supervisor, Biologist, Assistant Curator, Curator, Vet, Paravet, AFM, Manager, Security (+ "Cluster Head", added at L3110).
- `RECIP_GROUPS`: Site group, Zone group, Vet team, Curator office.
- `REPORT_TO`: Head Animal Keeper, Site Supervisor, Paravet, Vet, Curator, Security, AFM.
- `YN`: Yes, No.
- `ROLE_LABEL` (L1901): keeper Keeper, sup Site Supervisor, bio Biologist, acur Assistant Curator, cur Curator, vet Vet, afm AFM, mgr Manager.

### 3.3 `night` (Night keeper log, small "DRS · Night duty", role keeper, L1811)
1. **d** Duty details:
   - name text "Keeper name" (req, mem)
   - zone text "Zone / section" (req, mem)
   - start time "Duty started" (now)
   - end time "Duty ended"
   - tookFrom text "Took handover from"
2. **r** Night rounds ("Start and finish time of each round"): rounds = group, min 1, add "Add a round", item "Round", with fields:
   - start time "Round started" (now)
   - end time "Round finished"
   - seen seg "All animals seen" Yes/No (bad No)
   - locks seg "All locks checked" Yes/No (bad No)
   - notes area
3. **f** Findings during the night ("Birth, death, fight, injury, dull animal and more"):
   - none check "Nothing unusual tonight"
   - finds = group, add "Add a finding", item "Finding", with fields:
     - type seg "What happened": Birth, Mortality, Fight, Injury, Animal looks dull / lethargic, Not eating / not drinking, Unusual calling / distress, Escape / near-miss, Lock or gate problem, Power cut / equipment fault, Water leak / flooding, Storm, heat or cold, Intruder / security, Fire or smoke, Other. **Bad**: Mortality, Fight, Injury, Escape / near-miss, Fire or smoke, Intruder / security.
     - animal text "Animal / species"
     - cage text "Cage no."
     - time (now)
     - emer seg "Emergency?" YN (bad Yes)
     - to multi "Reported to" (REPORT_TO)
     - toTime time "Reported at"
     - details area "What you saw and did"
   - Night findings of types Birth, Mortality, Fight, Injury, dull, not eating, distress or escape become **animal alerts** automatically (L3112, AL_NIGHT).
4. **o** Other observations: obs area "Anything else noticed (noise, weather, visitors, equipment)".
5. **h** Morning handover:
   - to text "Handed over to"
   - time
   - done check "Handover given" (req)

### 3.4 `special` (Special duty log, role keeper, L1833)
1. **d** Duty details:
   - name (req, mem)
   - duty seg "Special duty" (req): New arrival watch, New pair / introduction, Pregnant / birth watch, Mother & newborn watch, After surgery / treatment, Sick animal watch, Quarantine watch, Hand-rearing, After-shifting settling, Other
   - other text "If other, describe"
   - animal text "Animal(s) / ID" (req)
   - cage text "Cage / enclosure"
   - start time "Started" (now)
   - end time "Finished"
   - instr area "Instructions from Vet / Curator"
2. **w** Observations ("Add one each time you check the animal"): obs = group, min 1, add "Add observation", item "Check", with fields:
   - time (now)
   - tags multi "What you saw": Normal, Eating, Drinking, Resting, Active / moving, Nursing / suckling, Getting along well, Aggression, Restless / distressed, Calling / vocalising, Not eating, Heavy breathing, Bleeding / wound. **Bad**: Aggression, Restless / distressed, Not eating, Heavy breathing, Bleeding / wound.
   - note area
3. **rep** Concerns reported: to multi REPORT_TO; what area "What was reported".
4. **h** Handover: to text; done check "Handover given" (req).

### 3.5 `acur` (Assistant Curator daily report, L1850)
1. **d** Details: name (req, mem); zone text "Site / zone" (req, mem).
2. **m** Morning check-in:
   - with multi "Met with" (req): Site Supervisor, Head Animal Keeper, Keepers, Biologist, Vet
   - pts area "Points discussed"
3. **r** Enclosure round ("Every enclosure, every day"): cages = group, min 1, "Add an enclosure", item "Enclosure", with fields:
   - cage text
   - animals text
   - with multi "Checked with": Site Supervisor, Keeper, Biologist
   - health seg All good / Concern (bad Concern)
   - encl seg "Enclosure condition" Good / Needs work (bad Needs work)
   - diet seg "Diet & water" OK / Concern (bad Concern)
   - notes area "Notes / action"
   - **afm check "Send site work to AFM" (afm:1)**: on send, creates an AFM ticket for that enclosure.
4. **o** Daily operations: done area "Work supported today"; esc area "Issues escalated".

### 3.6 `cur` (Curator daily review, L1864)
1. **d**: name (req, mem); site text (req, mem).
2. **rv** Reports reviewed:
   - read multi "Reviewed today" (req): Day keeper, Night keeper, Special duty, Site Supervisor, Biologist, Ethogram studies, Animal shifting, Assistant Curator, Vet, AFM
   - key area "Key points from reports"
3. **ap** Decisions & approvals ("Plans, shifting, enrichment, diet changes"): items = group "Add a decision", item "Decision", with fields:
   - what text "About"
   - dec seg Approved / Not approved / On hold (bad Not approved)
   - note area
4. **w**: welf area "Welfare concerns"; instr area "Instructions to team".

### 3.7 `vet` (Vet daily health report, L1872)
1. **d**: name "Vet name" (req, mem); site (req, mem).
2. **hr** Health round: health = group, min 1, "Add an animal", with fields:
   - animal text "Animal / ID"
   - cage
   - res seg "Finding" Normal / Concern / Under treatment (bad Concern)
   - note
3. **tx** Treatments: treat = group, with fields:
   - animal
   - dx text "Diagnosis / problem"
   - med text "Medicine & dose"
   - route seg: Oral, Injection, Topical, Eye / ear drops, In food, Other
   - by text "Given by"
   - next text "Next dose / review"
4. **sx** Surgery & procedures: proc = group, with fields:
   - animal
   - proc text
   - an seg "Anaesthesia" YN
   - out seg "Outcome": Successful, Under observation, Complications (bad Complications)
   - note
5. **fr** Food & kitchen round:
   - hyg seg "Kitchen hygiene" Good / Needs attention (bad)
   - qual seg "Diet quality" Good / Needs attention (bad)
   - note
6. **er** Enclosure round: note area "Health risks seen in enclosures".
7. **bi** Births: births = group, with fields:
   - species text "Species / mother"
   - cage
   - n num "Number born"
   - cond seg Healthy / Weak / Hand-rearing (bad Weak)
   - These become Birth alerts (L3114).
8. **mo** Mortality: morts = group, with fields:
   - animal
   - cage
   - time "Found at"
   - cause text "Suspected cause"
   - pm seg "Post-mortem": Done, Planned, Not needed
   - samples check "Samples sent to lab"
9. **q** Hospital & quarantine: note area.
10. **s** Summary: sum area "Overall site health today" (req).

### 3.8 `mgr` (Manager remarks, L1885)
One section **d** "Remarks":
- name (req, mem)
- note area "Remarks and instructions for all teams" (req)

### 3.9 `shift` (Animal shifting, role bio, one record per move, L1888)
1. **a** Animal & move:
   - animal (req)
   - species
   - kind seg "Type of move" (req): Within enclosure / night house, To another enclosure (same site), To another site, To hospital / quarantine, Incoming from outside
   - from, to (text)
   - date "Planned date"
   - time "Planned time"
   - why area "Reason"
   - how seg "Method": Walk-through / gate, Crate, Crate + vehicle, Under sedation
   - status seg: Planned, Approved, In progress, Completed, Cancelled
2. **pre** Before the move:
   - chk multi "Checks done" (req): Vet health check, Curator approval, Crate-trained / crate inspected, Receiving enclosure ready & checked, Route cleared, Team briefed, Weather suitable, Emergency kit & vet on standby, Transport papers / permits
   - team text
3. **post** After the move:
   - done time "Move completed at"
   - settle multi "Settling": Calm, Exploring, Eating, Drinking, Stressed / pacing, Hiding, Not eating, Injury seen (bad: Stressed / pacing, Not eating, Injury seen)
   - note area "Notes for the next 3 days"
- Screen: Plans → "Shifting" segment (`#pm-shift`, buttons `newShiftBtn` "Plan an animal move" and `shiftList`; logic in a later slice).

### 3.10 `inc` (Incident report, role sup, L1926)
1. **w** What happened:
   - date (req)
   - time "Time noticed" (now, req)
   - type seg (req): Animal escape, Animal down / collapsed, Injury to animal, Fight between animals, Staff injury / bite, Near-miss, Enclosure breach / damage, Visitor incident, Fire / smoke, Theft / intrusion, Other. **Bad**: Animal escape, Animal down / collapsed, Staff injury / bite, Fire / smoke.
   - sev seg "Severity": Low, Medium, High, Critical (bad High, Critical)
2. **a** Animal details:
   - animal "Animal name" (req)
   - aid "ID / microchip"
   - species
   - sex seg Male / Female / Unknown
   - age text
   - cage "Cage / enclosure no." (req)
   - zone (mem)
3. **o** Outcome:
   - out seg "Result" (req): Got back / in enclosure, Returned on its own, Still missing / not found, Contained, did not escape, Treated by vet, Died, Other (bad: Still missing / not found, Died)
   - rtime "Time resolved"
   - where text "Where the animal was found"
   - how multi "How it was brought back": Herded back, Lured with food, Net / crate, Darted by vet, Came back by itself, Not applicable
   - inj seg "Injuries": No injuries, Animal injured, Staff injured, Animal and staff (bad: all except No injuries)
4. **p** People informed:
   - to multi "Informed" (req): Head Animal Keeper, Curator, Assistant Curator, Vet, Manager, Security, AFM, Biologist
   - ttime "Time informed"
   - vet seg "Vet attended" YN
5. **d** Full details:
   - story area "How it happened, step by step" (req)
   - act area "Actions taken"
   - wit text "Witnesses / staff present"
   - cause area "Likely cause"
   - prev area "What will stop it happening again"
   - **afm check "Enclosure repair needed: send to AFM"** (creates an AFM ticket)
   - status seg Open / Closed
- Incident tab "tInc" is added for the supervisor at L3359 (later slice).

---

## 4. Ethogram catalogue (L1903–1924, plus ETHO at L414)

- **ETH_CATS**: 14 categories as `[key, label, colour, behaviours[]]`:
  - rest Resting #6B8F71: Lying, Sitting, Standing still, Sleeping
  - move Movement #2F6F8F: Walking, Running, Climbing, Swimming, Flying, Jumping
  - feed Feeding #C08A2E: Eating, Foraging / searching food, Drinking, Chewing cud
  - care Self-care #8C6BB1: Self-grooming, Scratching / rubbing, Wallowing / mud bath, Dust bathing, Basking / sunbathing
  - soc Social – friendly #3E9C6E: Grooming another, Playing together, Resting together, Greeting
  - agg Social – conflict #C0503A: Threat display, Chasing, Fighting, Displacing another, Submissive
  - play Play & exploring #D9A13B: Solo play, Exploring / sniffing, Object play
  - enr Enrichment #1F7A4D: Using food enrichment, Using object enrichment, Investigating scent / sound, Ignoring enrichment
  - alert Alert & watching #5A6C8A: Vigilant / scanning, Watching keepers, Reacting to visitors / noise
  - comm Communication #A0662E: Vocalising, Scent marking
  - rep Breeding & parenting #B5527E: Courtship, Mating, Nursing / suckling, Carrying young
  - elim Toilet #8A8A6A: Urinating, Defecating
  - **abn Abnormal / repetitive #E04A2F**: Pacing, Swaying / weaving, Head bobbing, Over-grooming / self-harm, Bar biting / licking, Regurgitation & reingestion, Repetitive swimming
  - oos Out of sight #9AA39C: Out of sight
- `ETH_B2C`: map from behaviour to category.
- **ETH_LOC** (location): Indoor / night house, Outdoor area, Near barrier / fence, Near keeper door, Pool / water, Shade, Elevated / platform / tree, Den / hide box, Feeding spot.
- **ETH_CTX** (context): Before feeding, After feeding, Enrichment given, Keeper present, Visitors / vehicles, Loud noise, Rain, Hot weather, Training session, After shifting, After vet procedure.
- **ETH_INT** (intensity): Low, Medium, High.
- **Older biologist ETHO list** (L414): `[key, en, hi, repetitive?]` × 18:
  - Resting, Feeding, Foraging, Drinking, Walking / moving, Exploring, Self-grooming, Social – friendly, Social – aggressive, Play, Vocalising, Using enrichment, Alert / watching, Out of sight
  - **Repetitive pacing, Swaying / head bobbing, Over-grooming / self-harm** (flag = 1)
  - Other
- A repetitive behaviour shows the warning `stereoWarn`. In a scan, the repetitive share triggers `stereoHigh` "Repetitive behaviour {p}% … Report".

---

## 5. SUPERVISOR daily report (`v-sup`, L1968–2124, HTML `v-sup`)

### 5.1 Purpose and roles
Daily site report by the Site Supervisor or Head Animal Keeper (role `sup`).

Base tabs for sup: Report (`sup`), Animals, Learn. Later slices change them:
- L3036: Report, Inbox, Animals, Learn
- L3359: Report, Incident, Inbox, Animals, Learn
- L3760: Report, Incident, Attendance, Inbox, Learn

### 5.2 Header
- Brand block: small "Vantara site supervisor", H1 "Daily report".
- Progress meter `#supBar` and `#supPct` "{n} of {t} done", with t = 9 tracked sections.

### 5.3 Sections
Each section is a collapsible `<details class="card" data-sec>` with a number, title, subtitle and status pill. The pill shows "Done" (card gets class `ok`), else a count label or "Pending". Fields bind with `data-k` to dotted paths in state S.

1. **info: Shift details** (open by default; subtitle = today's formatted date):
   - `name` text "Supervisor name". Remembered in `kc-sup-name` (USER) and pre-filled.
   - `zone` text "Zone / section", placeholder "e.g. Zone 12". Remembered in `kc-sup-zone`.
   - `shift` select: Morning, General, Evening, Night (default Morning).
   - Done when name and zone are filled.
2. **ho: Handover from night keeper** ("What happened overnight"):
   - `ho.keeper` text "Night keeper name"
   - `ho.time` time
   - `ho.notes` area "Night incidents / remarks" (placeholder "Animal behaviour, alarms, power cuts, anything unusual")
   - `ho.done` tick "Handover received"
   - **Auto-stamp**: ticking sets `ho.time` to now if it is empty (`data-stamp`). The same applies to round, brief and close.
   - Done = `ho.done`.
3. **round: Morning first round** ("See every animal, check every lock"):
   - `round.time` "Start time"
   - `round.head` seg "Headcount": Matched / **Not matched** (bad)
   - `round.notes` area "Observations"
   - `round.done` tick "First round completed"
4. **brief: Morning briefing** ("Staff, duties, today's plan"):
   - `brief.time`
   - `brief.present` number "Staff present"
   - `brief.absent` text "Absent / on leave (names)"
   - `brief.points` area (placeholder "Duty allocation, vet procedures, visits, safety reminders")
   - `brief.done` tick "Briefing done"
5. **animals: Animal status** ("Births, deaths, sick, treatment"):
   - Tick `allNormal` "All animals normal, nothing to report".
   - Event list `S.events[]`. "Add animal event" pushes `{count:1, time:now}` and clears allNormal. Each event box "Event N" has Remove and these fields:
     - type seg: Birth, Mortality, Sick / injured, Under treatment, New arrival, Transfer out, Behaviour concern, Staff injury / bite, Escape / near-miss, Good news. **Bad**: Mortality, Sick / injured, Staff injury / bite, Escape / near-miss.
     - species text "Species / animal"
     - cage text "Cage no."
     - count number (min 1)
     - time
     - details area
     - vet check "Vet / curator informed"
   - Done = allNormal OR at least one event.
   - **Each event with a type becomes an animal alert**, `id sup:{day}:{i}` (L3113, later slice). Alerts go automatically to bio, cur, acur, vet and mgr (AL_TO).
6. **diet: Random diet check** ("At least 3 animals"):
   - Starts with 3 boxes. "Add another diet check" adds more. Boxes 4+ are removable.
   - Box fields:
     - animal text "Animal name"
     - cage
     - qty seg "Quantity as per diet chart": As per chart / Short / Excess (bad: not As per chart)
     - quality seg: Good / Average / Poor (bad Poor)
     - remark text "Remarks"
   - Done when 3 boxes have animal, cage, qty and quality. Pill shows "n of 3".
7. **mesh: Enclosure & mesh check** ("5 zones or 10 cages"):
   - Mode seg `meshMode`: "By zone (5)" (default) or "By cage (10)". Required count is 5 or 10. Rows auto-pad to the required count. "Add one more" adds a row.
   - Row fields:
     - `no` text (placeholder "Zone no." or "Cage no.")
     - status seg OK / Damaged / Needs repair (bad: not OK)
     - If status is not OK, a remark text appears (placeholder "What is damaged? (also log it in Maintenance)")
   - Counter "{n} of {t} zones|cages checked" counts rows that have both no and status.
   - Done when that count ≥ the required count.
8. **maint: Maintenance issues (AFM)** ("AC, electrical, civil, plumbing and more"). Pill "{n} open", red if any open issue is Urgent. Not counted in progress. Details in §5.4.
9. **safety: Safety & site checks** ("Locks, water, stores, equipment"):
   - 14 checkboxes (SAFETY, L247 plus L456). Done when all are ticked; pill shows "n of 14". Stored as index array `S.safety`. Items:
     1. All enclosure locks and slide doors double-checked
     2. Keys and radios accounted for
     3. Water troughs and drinkers clean and full
     4. Feed store stock checked, no expired items
     5. Kitchen and diet prep area hygiene
     6. Footbaths filled with disinfectant
     7. First aid kit and fire extinguisher in place
     8. Rescue / emergency equipment ready (nets, crates, darting kit with vet team)
     9. Shade, sprinklers and coolers working
     10. Waste and soiled bedding cleared from site
     11. Key register checked, every key accounted for (Book 1, Ch 3)
     12. Food quality & CSSD bowls rechecked (Book 1, Ch 5)
     13. Pool water check done if due, every 15 days (Book 1, Ch 6)
     14. Contractor hardware counted in & out, if any work (Book 2, Ch 8)
10. **close: Evening closing** ("Final round and handover to night keeper"):
    - `close.time` "Final round time"
    - `close.keeper` "Handed over to" (placeholder "Night keeper")
    - `close.notes` area "Instructions for night" (placeholder "Animals to watch, pending vet checks, open issues")
    - `close.done` tick "All animals in, locks checked, handover given" (auto-stamps the time)
- After the sections: `other` area "Other remarks (visits, VIP movement, drills)".
- Then the button **Create report** (gold).
- Then `#reportWrap`, which holds:
  - `<pre id=report>`
  - "Send to Signal group" (link to a fixed signal.group URL)
  - "Send to WhatsApp group" (fixed chat.whatsapp.com invite)
  - help text "The report is copied when you tap. In the group, press and hold the message box, tap Paste, then send."
  - Tapping either link copies the report text (execCommand plus the clipboard API) and toasts "Report copied. Paste it in the group".
- `#sendSup`: the DRS-engine "send to people" panel (L3053, later slice). It calls `mountSend("sendSup", "sup:{TODAY}", {title:"Supervisor report", role:"sup", text:buildReport(S,TODAY)})`.
- **Past reports** `#hist`: up to 30 most recent days from `kc-sup-index`. Each row shows the date and "View". View rebuilds that day's report into `#report`.

### 5.4 Maintenance issue workflow (base version; later slices turn this into AFM/agency tickets)
- **Category chips** (MCATS), default Plumbing. Each category has quick-pick problems:
  - AC: Not cooling, Water dripping, Making noise, Not switching on
  - Electrical: Light not working, Exposed wire, Switch board fault, Power trip / no supply, Fan not working
  - Civil: Tile broken, Wall crack, Door / gate damaged, Floor damaged, Roof leakage
  - Plumbing: Pipe leakage, Tap broken, Drain blocked, No water supply, Pool / moat leak
  - Cleaning: Garbage not cleared, Drain needs cleaning, Pest / insects, Area not cleaned
  - Equipment: Hose pipe damaged, Weighing scale fault, Cooler not working, Sprinkler fault, Tool broken
  - Mesh: Mesh torn, Mesh loose, Welding needed, Lock / latch faulty
  - Fabrication: Gate / door fabrication, Railing / grill repair, New frame / stand needed, Rust / painting of metal
  - Carpentry: Wooden structure broken, Platform / perch repair, Nest box / den box
  - Painting: Wall painting, Signboard
  - Other: no quick picks ("Type the problem below") and an extra free-text input "Type the kind of work (e.g. Welding, Painting)".
- Tapping a quick pick fills Problem and focuses Location.
- Fields:
  - Problem `m-prob` (required; placeholder "e.g. Water pipe leaking near night house")
  - Location / cage no. `m-loc`
  - Priority seg Normal (default) / **Urgent** (bad)
- **Log issue**:
  1. Reloads the latest `kc-issues` (other users may have added some).
  2. If the problem is empty, focuses it with placeholder "Write or tap the problem first".
  3. Increments `kc-issue-n` (per site).
  4. Creates `{id:"M-"+nnn, cat, prob, loc, pri, step:0, times:[now], date:TODAY}` at the top of the list.
  5. Resets the form and toasts "Issue logged".
  - Later slices replace the id with a site-prefixed one (`tkCode`).
- **Steps** (STEPS): 0 Reported → 1 Informed AFM → 2 Work started → 3 Fixed. `times[step]` = timestamp of each step.
- **Tabs**: Open (step < 3) and Fixed (step 3). Empty texts: "No open issues. Log any problem you see above." and "No fixed issues yet."
- **Issue card** shows:
  - problem, id
  - category, location
  - URGENT tag
  - "Open {n days}" age tag if open for more than 2 days
  - 4-dot progress
  - "current step, date-time"
  - buttons: "Next: {step}" (advance, stamp time, toast), "Undo" (step back, truncate times), "Delete" (confirm "Delete M-001?")
- Footer: "Open issues stay on the list every day until marked fixed." Issues are **per site, not per day**.

### 5.5 Data model
- `kc-sup-{YYYY-MM-DD}` (site scope):
  `{date, name, zone, shift, ho:{keeper,time,notes,done}, round:{time,head,notes,done}, brief:{time,present,absent,points,done}, allNormal, events:[{type,species,cage,count,time,details,vet}], diets:[{animal,cage,qty,quality,remark}], meshMode:"zone"|"cage", mesh:[{no,status,remark}], safety:[idx], close:{time,keeper,notes,done}, other}`
- `kc-sup-index`: list of days, newest first.
- `kc-sup-name`, `kc-sup-zone`: remembered values.
- `kc-issues` (site): `[{id,cat,prob,loc,pri,step,times[],date}]`. `kc-issue-n`: the counter.
- Autosave on every input. No explicit draft button.

### 5.6 Report text format (`buildReport`, L2089; later overridden at L3253)
WhatsApp markdown, `*bold*` headers, "-" for empty values:
```
*VANTARA SITE SUPERVISOR REPORT*
Date: Tue, 14 Oct 2026
Supervisor: X
Zone: Z   Shift: Morning

*1. Handover from night keeper*
Keeper: ..  Time: ..  Received: Yes|No
[Remarks: ..]

*2. Morning first round*
Time: ..  Done: Yes  Headcount: Matched
[Notes: ..]

*3. Morning briefing*
Time: ..  Staff present: n
[Absent: ..] [Points: ..]

*4. Animal status*
1) Type: species, Cage c, Count n, HH:MM
   details
   Vet / curator informed: Yes
   (or "All animals normal. Nothing to report." / "Not filled")

*5. Random diet check*
1) animal, Cage c: Qty As per chart, Quality Good (remark)   (or "Not filled")

*6. Enclosure / mesh check (zones|cages)*
Checked: a, b, c
Problem at X: Damaged - remark   (or "All OK"; "Not filled")

*7. Maintenance (AFM)*
Open: n   Fixed today: m
M-001 [Plumbing] prob @ loc (URGENT)
   Status: Informed AFM, Open 3 days
M-002 [..] prob: Fixed

*8. Safety & site checks* (k/14)
Not done:
- item ...   (or "All checks done")

*9. Evening closing*
Final round: ..  Handed to: ..  Done: Yes
[Night instructions: ..]

[*Other remarks*
text]
```

---

## 6. KEEPER DAY (`v-today` day duty, L2126–2137)

- **Roles**: keeper. Base tabs: My day (`today`), Log, Animals, Learn. Later tabs: My duty, Log, Animals, Learn.
- **Duty segment** (HTML `#dutySeg`):
  - Day duty: this module.
  - Night duty: mounts FORMS.night into `#duty-night`.
  - Special duty: mounts FORMS.special into `#duty-special`.
  - Duty switching and the send panel `#sendDay` (`kday:{TODAY}`, text `kdayText()`) are in a later slice (L2887–2888). The duty choice is stored in `kc-duty`.
- **Screen layout**:
  - H1 "Keeper's day", with the long date below.
  - Progress ring (`#arc`, dashoffset 201) and `#pct` %.
  - Hazard box: "Before you open any door / Know where every animal is. Check every lock twice. Never enter a dangerous animal's space alone or with the animal inside."
  - Timeline of 4 shifts.
  - Button "Start a new day".
  - Footer: "Tasks marked with a yellow diamond are safety-critical. Your progress is saved on this device."
- **Tasks** (DAY, L272): 18 tasks as `{id, time, s(safety), t, w(why)}`. Safety-critical ones (s = 1) are marked ◆.
  - **Arrival 7:00–8:00**:
    - a1 7:00 Read the handover notes
    - a2 7:10 Collect keys and radio, test the radio ◆
    - a3 7:15 Do the morning headcount ◆
    - a4 7:30 Check perimeter fences and barriers ◆
  - **Morning 8:00–12:00**:
    - m1 8:00 Observe each animal before cleaning
    - m2 8:20 Shift animals out, then double-check locks ◆
    - m3 8:30 Clean the enclosure and night quarters
    - m4 9:30 Do a final sweep and remove all tools ◆
    - m5 10:00 Prepare diets in the kitchen
    - m6 11:00 Set out enrichment
  - **Afternoon 12:00–16:00**:
    - p1 13:00 Run a training session
    - p2 14:00 Give a keeper talk or feeding demo
    - p3 15:00 Midday welfare check
    - p4 15:30 Tidy the work area and stores
  - **Closing 16:00–17:30**:
    - c1 16:00 Shift animals into night quarters
    - c2 16:45 Final headcount and lock check ◆
    - c3 17:00 Write the daily report
    - c4 17:20 Return keys and radio ◆
- **Data**: `kc-done` (USER) = `{date, ids:[taskId]}`. It auto-resets when the date is not TODAY. Progress % = done / 18.
- "Start a new day" clears the ids.

---

## 7. ANIMALS view (`v-animals`)

Segments (`#amSeg`): "Species by region" (`am-ex`), "Insects & feeders" (`am-bugs`, rendered by a later slice, L2715/2758), "Care guides" (`am-care`). Available to every role whose tabs include Animals.

### 7.1 Care guides (L2139–2148, GROUPS L297)
- Intro text: "How care changes from one group to the next."
- Chips: one per group.
- Group article shows:
  - name and examples
  - danger badge (class d-high / d-med / d-low) with a label
  - 5 sections: Feeding, Enclosure, Health signs to watch, Enrichment ideas, Keeper safety (2–3 bullets each)
- The 6 groups:

  | group | examples | danger | badge text |
  |---|---|---|---|
  | Big cats | Lions, tigers, leopards, jaguars | high | "Dangerous: no shared space ever" |
  | Primates | Chimpanzees, gorillas, lemurs, monkeys | high | "Great apes are very strong and clever" |
  | Hoofstock | Giraffes, zebras, antelope, deer, rhinos | med | "Can kick, charge or crush in panic" |
  | Birds | Parrots, flamingos, penguins, raptors | low | "Beaks and talons can still hurt" |
  | Reptiles | Crocodiles, snakes, tortoises, lizards | high | "Venomous species and crocodiles need special training" |
  | Aquatic | Seals, sea lions, otters, fish | med | "Sea lions can bite hard" |

### 7.2 Species explorer (L2150–2187)
- **Data**: SP rows `[country, class, name, hindiName, scientific, foodTags, habitatTags, IUCN, subspecies(;-separated), note/fact, pet(0/1), CITES]`.
- **Sources**: SP (L520), SP2 (L719, with a pet flag), SP3 (L874), and the ADD_B/M/R/A/F/I batches (L1109–1695), de-duplicated by scientific name.
  - FF (L1697) fills missing facts.
  - CITES0 and CITESFIX fill CITES appendices (I, II, III, I/II).
- **Totals**: **1,056 species**: birds 285, mammals 426, reptiles 150, amphibians 52, fish/aquatic 89, insects & more 54. 104 are flagged as pets.
- **Regions** (7), as `[key, name, hi, css]`:

  | region | species |
  |---|---|
  | asia Asia (r1) | 386 |
  | africa Africa (r2) | 191 |
  | oceania Australia & Oceania (r3) | 87 |
  | americas The Americas (r4) | 275 |
  | europe Europe & Middle East (r5) | 71 |
  | world Domestic & worldwide (r6) | 29 |
  | polar Polar regions (r7) | 17 |

- **Countries / areas** (42, each with a flag emoji):
  - Asia: IN, ID, CN, PK, TH, JP, MY Malaysia & Borneo, VN Vietnam & Laos, PH, MN
  - Africa: KE, ZA, MG, GH Ghana & West Africa, SN Sahel, EG Egypt & North Africa, TZ, CD, CM Cameroon & Gabon, ET, SC, MA
  - Oceania: AU, PG, NZ
  - Americas: US, BR, PE, MX, CL, CO, CRC Costa Rica & Central America, AR, EC Ecuador & Galápagos
  - Europe: ES Spain & Southern Europe, GB, SY, SA Arabian Peninsula, RU Russia & Siberia
  - World: WW Worldwide (domestic)
  - Polar: AQ Antarctica, ARC Arctic
- **TAGS**: food and habitat keyword → label, e.g. seeds, fruit, nectar, insects, fish, "meat (hunts prey)", carrion, …, rainforest, savanna, wetlands, mangroves, tundra, "towns & gardens", reefs, "homes & farms", bones, swamps.
- **IUCN codes**: LC, NT, VU, EN, CR, EW, NE, DD, DOM (with labels). A legend is rendered under the list.
- **UI**:
  - Search box "Search by name or scientific name". It searches name, Hindi name and scientific name across all classes and shows "{n} results" or "No species found".
  - Class chips. The base version has Birds and Mammals only. The v2 explorer at L2730 adds reptiles, amphibians, fish and insects, plus pets.
  - With no search: region grid cards with "{n} species" for the current class → country cards ("{n} species", ›) → species cards.
  - Breadcrumbs: "All regions" and the region name.
  - **Species card** shows:
    - name and Hindi name
    - IUCN badge with tooltip
    - italic scientific name
    - Food (tag labels)
    - Where found: flag, country, habitat tags
    - Subspecies (list, or "None")
    - fact note
  - Footer: "IUCN Red List status at time of writing… check iucnredlist.org". The CITES note is at L1099.
- **Feeder reference data** (rendered by a later slice):
  - BUGS: 17 insects around us
  - FEEDI: 11 feeder insects, with size / protein / fat / fed to / tips
  - MICE stages (6): Pinky, Fuzzy, Hopper, Weaner, Adult, Jumbo
  - RATS stages (8): Pinky, Fuzzy, Pup, Weaner, Small, Medium, Large, Jumbo/XL
  - ASF stages (6)
  - PREY (4): day-old chick, Japanese quail, guinea pig, rabbit
  - RODPROF (3): mouse, rat, ASF
  - Gut-load note and rodent thawing note

---

## 8. LEARN view (`v-learn`)

Segments: "SOP books" (`lm-sop`), "Quiz" (`lm-quiz`), "Basics" (`lm-basics`). Every role base set includes Learn.

### 8.1 Basics / Skills (L2189–2193, SKILLS L336)
- Intro "The core knowledge behind every task on your list."
- Accordion of 8 skills, each with a paragraph and bullets:
  1. Safety and locks (4 bullets)
  2. Reading animal health (7)
  3. Animal welfare: the Five Domains (5)
  4. Enrichment (6)
  5. Training with positive reinforcement (5)
  6. Hygiene and biosecurity (5)
  7. Diets and food safety (5)
  8. Records and reports (4)

### 8.2 SOP library (L2317–2362, SOPDATA L1801)
- **Structure**:
  - `books`: 5 titles.
  - `ch`: chapter rows `[book, "NN", title, objective, paragraphs[]]`, all strings bilingual.
  - Paragraph conventions:
    - "1. …" numbered step (the number is kept in Hindi)
    - "#Heading" sub-heading
    - "#NOTE" marker; the next paragraph renders as a note box
    - "● …" bullet
- **51 chapters**. Paragraph count in brackets.
- **Book 1 Foundations (10)**:
  - 01 Staff Health & Safety Protocol [11]
  - 02 New Keeper Induction & Sign-Off [12]
  - 03 Key & Lock Control [14]
  - 04 Daily Opening & Closing Checklist [20]
  - 05 Feeding & Diet SOP [12]
  - 06 Water Management Protocol [9]
  - 07 Animal Enclosure Cleaning SOP [31]
  - 08 Animal Enrichment Guideline & Observation Report [21]
  - 09 Animal ID & Microchipping [11]
  - 10 Daily Report Writing & Record-Keeping [13]
- **Book 2 Routine Depth (10)**:
  - 01 Diet Preparation & Commissary Hygiene [17]
  - 02 Animal Training SOP [40]
  - 03 Body Condition Scoring & Weighing [13]
  - 04 Behavioral Observation & Recording [13]
  - 05 Waste Management Protocol [10]
  - 06 Biohazard Waste Management Protocol [9]
  - 07 Pest & Rodent Control SOP [17]
  - 08 Repair & Maintenance Work Near Animal Areas [41]
  - 09 Extreme Weather Protocol [19]
  - 10 Zoonotic Disease & Staff Health Surveillance [12]
- **Book 3 Handling & Movement (10)**:
  - 01 New Arrival & Introduction Protocol [14]
  - 02 Species Handling Certification Matrix [12]
  - 03 Quarantine & Isolation SOP [25]
  - 04 Animal Handling & Transfer SOP [21]
  - 05 Vehicle & Equipment Operation Near Animals [13]
  - 06 Intra-Site Animal Shifting SOP [18]
  - 07 Inter-Site Animal Shifting Protocol [36]
  - 08 Animal Transfer to and from Hospital Protocol [14]
  - 09 Animal Welfare Assessment [12]
  - 10 Enrichment Device Safety Testing [12]
- **Book 4 Emergency & Specialised Medical (10)**:
  - 01 Animal Escape SOP [17]
  - 02 Fire & Natural Disaster Evacuation Plan [14]
  - 03 Venomous & High-Risk Species Protocol [13]
  - 04 Crisis Communication & Incident Reporting [12]
  - 05 CCTV & Night Monitoring Protocol [12]
  - 06 Animal Death, Necropsy & Mortality Protocol [13]
  - 07 Geriatric & Palliative Care [12]
  - 08 Reproductive Management & Hand-Rearing Protocol [14]
  - 09 Wildlife Transport & Legal Compliance [11]
  - 10 Media, VIP & Visitor Interaction Safety Protocol [12]
- **Book 5 Species Mastery & Leadership (11)**:
  - 01 Elephant-Specific Husbandry [14]
  - 02 Big Cat Handling & Enrichment [13]
  - 03 Primate-Specific Husbandry [13]
  - 04 Avian Husbandry & Flight Safety [13]
  - 05 Reptile Husbandry & Thermal Management [13]
  - 06 Live Feed & Feeder Species Management [17]
  - 07 Aquatic & Marine Water Systems [13]
  - 08 Volunteer & Intern Supervision [12]
  - 09 Individual Animal Care Plans [11]
  - 10 Enclosure Design & Renovation Requests [11]
  - 11 Supervisor & Team Leadership SOP [13]
- **Screens**:
  - **Search** `#sopSearch` "Search all SOPs". When non-empty, it searches title, objective and paragraphs of all chapters (case-insensitive, current language). It shows "{n} results"; each result shows "Book b, Ch c", the title and a ±40/80-character snippet with `<mark>` highlight. Tapping opens the chapter and clears the search. No hits: "No SOP matches your search".
  - **Book list**: per book, a level badge, "Level n: title", "{n} chapters · {d} of {t} signed off" and a progress bar.
  - **Book view**: crumb "All books", title, "{n} of {t} signed off". Each chapter row has a sign-off checkbox ("Trained on this chapter") and a chapter button "NN title". Below: field "Trainer / Supervisor name".
  - **Chapter view**: crumb "Level n: book", "Book b, Ch c", title, objective box, then the rendered paragraphs.
  - Footer: "For internal training use only. Do not share outside Vantara."
- **Data**: `kc-train` (USER) = `{[book]:{ch:["01",…], by:"trainer name"}}`.
- `openSop(book, chNo)` deep-links into a chapter (used by the quiz "Read the SOP" button).

### 8.3 Quiz (L2364–2385, QUIZ L429)
- **Content**: 25 questions, 5 per book. Row = `[book, question, 4 options, correctIndex, chapterNo]`.
  - Book 1: first step at opening (ch 04); lost key (03); CSSD bowls (05); pool check every 15 days (06); "no issues" log (10).
  - Book 2: record behaviour "Pacing near the fence" (04); report repetitive behaviour to Biologist / Vet (04); weight drop → Vet (03); contractor hardware count (08); heat stress → Vet (09).
  - Book 3: new arrival → vet check, then quarantine (01); introduction through a barrier (01); certification species by species (02); quarantine observed twice daily (03); enrichment approval by Curator / Biologist (10).
  - Book 4: escape → Site Supervisor first (01); bird escape → mist water (01); venomous → second trained person (03); dead animal → don't move it (06); comms → Facility Head only (04).
  - Book 5: big cats → protected contact (02); elephants → positive reinforcement only (01); good care-plan entry (09); enclosure design approval by Curator, Biologist and Facility Head (10); Supervisor's first responsibility is welfare and safety (11).
- **List screen**:
  - Intro: "5 questions per book, taken from the SOPs. Score 4 or more to pass."
  - Per book: "Best: s/5" (green "pass" class if ≥ 4) or "Not taken yet", plus a "Start quiz" button.
- **Run**:
  - Questions come in book order; the **options are shuffled** per question.
  - Header "Level n · Question i of 5" and crumb "All quizzes".
  - Tap an option: options lock, the correct one is marked "right" and a wrong pick is marked "wrongp". Feedback "Correct!" or "Not quite.".
  - Buttons: "Next question" or "See result", and "Read the SOP" (opens the cited chapter).
- **Result**: big "s/5", "You scored s of 5", then "Passed. Well done!" (≥ 4) or "Not passed yet. Read the SOPs and try again." Buttons: Try again, All quizzes.
- **Data**: `kc-quiz` (USER) = `{[book]: bestScore}`, updated with max() at finish.

---

## 9. LOG: keeper daily log (`v-log`, L2195–2211)

- **Roles**: keeper (tab "Log").
- Header "Daily log": "Write down what you saw. Small changes matter."
- **Form**:
  - Animal or group (required; placeholder "e.g. Raja (Sumatran tiger)"; empty → placeholder "Enter an animal name to save")
  - Appetite seg: Normal / Reduced / Not eating / Increased
  - Behaviour seg: Normal / Quiet / Restless / Aggressive
  - Droppings seg: Normal / Loose / None / Unusual
  - All three segs default to Normal; any non-Normal value is flagged red.
  - Notes area (placeholder "Weight, injuries, training progress, enrichment used…")
  - Button "Save entry"
- **Save**: adds `{animal, app, beh, dro, notes, at:ms}` to the top of `kc-logs` (USER scope), then resets the form.
- **Entries list**: animal, date-time, 3 flag chips (red if not Normal), notes, Delete (no confirm). Empty text: "No entries yet. Add your first observation above."

---

## 10. ROLES and NAV (base, L2229–2249)

- Base ROLES (later slices add more):

  | role | label | description | icon | tabs |
  |---|---|---|---|---|
  | sup | "Site Supervisor" | "Daily site report, AFM issues, checks" | S | Report(sup), Animals, Learn |
  | bio | "Biologist" | "Checks, behaviour, welfare, plans" | B | Report(bio), Plans, Animals, Learn |
  | keeper | "Keeper" | "Daily tasks, animal log, training" | K | My day(today), Log, Animals, Learn |

  Later slices add acur, cur, vet, afm, mgr, agency, dop, pvet, exec, ch, sadmin, siteadmin (L3036, 3359, 3553, 3760, 4011, 4138).
- `renderNav`:
  - VIEW defaults to the role's first tab.
  - Shows `#v-{VIEW}`.
  - Role button text: "Supervisor ▾", "Biologist ▾" or "Keeper ▾".
  - `go(v)` switches the view and scrolls to the top.
- **Role picker** `#rolePick`:
  - Text: "Who is using the app?" / "You can change this any time from the top bar."
  - One option per role.
  - Choosing a role stores `kc-role`, closes the sheet and resets VIEW.
  - Escape closes the sheet if a role is already set.
  - With ANTS sign-in, the role is forced from identity (§1.8).

---

## 11. PLANS (`v-plans`, L2251–2315)

- **Roles**: bio (tab "Plans", later "Manage").
- Segments (`#pmSeg`):
  - Plans (this module)
  - Shifting (FORMS.shift, later slice)
  - Animal register (`pm-reg`, later slice, L2670)
  - Weekly summary (`pm-week`, later slice, L2699)
- Intro: "Long-term work: ethogram studies, enrichment programmes, introductions, breeding, enclosure changes and care plans."
- **New plan form** (`newPlanBtn`). Draft defaults: type "Ethogram study", start TODAY, team [Curator, Vet]. Fields:
  - Plan type seg (7 types)
  - Plan title (required; "Give the plan a title")
  - Animals / species
  - Objective (area)
  - Start date, Target date
  - Team involved checkboxes: Curator, Vet, Supervisor, Keepers, Facility Head
  - Buttons: Create plan, Cancel
- **Plan types and template steps** (PLANTYPES, copied into steps on create):
  - Ethogram study: Define the behaviour list (ethogram) · Train observers on the terms · Pilot observations (3 days) · Main data collection · Analyse the activity budget · Share findings with Curator & Vet
  - Enrichment programme: Set the goal behaviour · Design the items · Curator / Biologist approval · Safety test (Book 3, Ch 10) · Trial and observe response · Monthly review
  - Introduction plan: Quarantine & Vet clearance · Visual / scent contact through a barrier · Protected contact through mesh · Short supervised sessions · Full introduction · Close monitoring for 2 weeks
  - Breeding plan: Pair selection with Curator · Health check by Vet · Monitor oestrus / breeding behaviour · Pairing · Pregnancy monitoring with Vet · Birth & newborn care plan
  - Enclosure improvement: Describe the need · Draft the design · Approval: Curator, Biologist, Facility Head · Plan animal shifting & work (Book 2, Ch 8) · Joint inspection after work
  - Care plan update: Review daily logs & welfare scores · Draft the changes · Team review: Curator, Vet · Brief the keepers · Update the ANTS System
  - Research / other: no steps
- **Record**: `{id:"P"+ms, type, title, animals, obj, start, target, team[], status:"Planning", steps:[{t,d:false}], etho:[] (Ethogram study only), log:[{t,at}], created}`.
  - Stored in `kc-plans` (site scope).
  - Statuses (PSTAT): Planning, Active, On hold, Completed.
- **List**: tabs Active (status ≠ Completed) and Completed. Empty text: "No plans here yet."
- **Plan card** (`<details>`):
  - Summary: type, title, meta (status · animals · "Overdue · Due d" if target < today and not completed · "n of t steps"), progress bar (% steps done).
  - Body:
    - objective box
    - Status select
    - Team line
    - Steps checklist, each step removable. Ticking any step while status is Planning auto-sets status to **Active**. "Add a step" input with + (Enter submits).
    - For Ethogram study: "Ethogram behaviours" chip list with ×, an add input (no duplicates) and help "These appear in Behaviour notes for this plan's animals." Changes refresh the biologist behaviour form (`rBeh`).
    - "Progress log": timestamped updates, newest first, via the "Add update" input.
    - "Delete plan" (confirm).
- Every change also refreshes the biologist "Plans & projects" card (`rBPlans`) and the biologist status (`bStatus`).

---

## 12. Static lists used by the Biologist (defined here; screens in the next slice)

- **CHECKS** (audit type → items):
  - Enclosure: 8 items (Mesh, walls & fences intact … No debris, tools or hazards)
  - Habitat: 7 (Temperature … Mud, dust bath or misting)
  - Enrichment: 6
  - Social group: 5
  - Feeding & diet: 5 (Diet matches the chart, Fed at the species time slot, CSSD bowls clean, Leftovers recorded, Food refusal reported)
  - Behaviour & welfare: 5
- **BODY** (12 nose-to-tail points): Eyes, Ears, Nose & nostrils, Mouth/teeth/beak, Breathing, Skin/coat/feathers/scales, Body shape & condition, Limbs & joints, Feet/hooves/nails/claws, Tail & vent area, Wounds/lumps/swelling, Movement & posture.
- **DIETQ** (8): Items match the diet sheet; Weights match; Fresh: no bruises, insects, mould or rot; No contamination; CSSD bowl used; Supplements as prescribed; Presented the species' natural way; Served promptly.
- **WATERQ** (4): Drinkers clean and full; Water clear; No stagnant water; Misting, mud or pools working.
- Value options (V, L398–501):
  - Check results: OK, Concern, N/A
  - Observation methods: Focal, Scan, Ad lib
  - Enrichment types: Food-based, Sensory, Physical, Social
  - Enrichment responses: Interest, Play, Ignored, Aggression, Stress relief
  - Physical check: Normal, Abnormal, Not seen; method Visual, During training, Hands-on (protected)
  - Faeces: Normal, Soft, Diarrhoea, Hard, None seen
  - Round result: All normal, Issues found
  - Training behaviours: Target, Station, Foot present, Open mouth, Scale, Blood draw, Crate
  - Training results: Did well, Partly, Did not
  - Sex: Male, Female, Unknown

## 13. START (L2387–2389)
Empty placeholder section; init happens in later slices. Biologist begins at L2390 (next slice).
