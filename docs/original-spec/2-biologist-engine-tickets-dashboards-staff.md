# DRS rebuild spec — Part B (all_en.js lines 2390–3860)

Covers: Biologist checklist, Animal register, Weekly summary, Insects & feeders, Explorer v2, DRS form engine, Send/Share, Inbox, Pins, Keeper duty, AFM v1 + v2 tickets, Agencies, Manager dashboard, Shifting, Ethogram studies, Animal alerts, Export centre, DRS v3 (when-stamp, incidents, Curator/Vet dashboards, events, login hook), Research notes, Cover/delegation, Staff register, Attendance + analytics, Movements + animal count, Multi-language, Main-app hooks.
Line refs are `L####` in all_en.js. Labels are English UI text. Option values are stored as English strings, and `tv()` translates them for display.

Conventions used throughout:
- `TODAY` = local `YYYY-MM-DD`. `nowHM()` = `HH:MM`. `addDays(d,n)` and `daysBetween(a,b)` use noon-anchored dates.
- `store.get/set(key)` holds JSON. Keys are scoped by `scoped()` (L171–176):
  - **Global** (no prefix): `kc-role, kc-lang, kc-replang, drs-user, drs-site, kc-agencies, kc-notices, kc-useradm, kc-settings, kc-tr-*, kc-export, drs-ants-*, kc-sessions, kc-pmjobs-all`.
  - **Per user** `@u:<uid>/<key>`: `kc-lastto-*, kc-read, kc-alpop-*, kc-evpop-*, kc-agpop-*, kc-afm-popped, kc-afmdone-pop, kc-notes, kc-done, kc-logs, kc-mem-*, kc-sup-name, kc-bio-name, kc-pin*` (note: this also matches `kc-pins`, so pins are per user), `kc-duty`, `kc-quiet`, `kc-sos-*` etc.
  - **Per site** `@<SITE>/<key>` (e.g. `@V1S2/kc-issues`): everything else (`kc-bio-*`, `kc-reg`, `kc-pool`, `drs-*`, `kc-sent`, `kc-issues`, `kc-alerts`, `kc-incidents`, `kc-events`, `kc-shifts`, `kc-etho`, `kc-cover`, `kc-staff`, `kc-att`, `kc-moves`, …).
  - `storeAt.get/set(site,k)` reads or writes another site's data.
- "bad" option = renders red (`class="bad"`) and feeds flags.
- Roles: keeper, sup (Site Supervisor / Head Animal Keeper), bio, acur, cur, vet, afm, mgr, agency, dop (Data Operator), pvet (Paravet, defined after L3861), plus multi-site ch/exec/sadmin/siteadmin (defined later).

---

## 1. BIOLOGIST daily checklist (L2390–2668; markup `#v-bio`)

### 1.1 Purpose and roles
Daily welfare/health checklist for the Biologist (role `bio`, tab `bio` "Report"). It is the source for Action list (red flags), Due today, the weekly summary, the dashboards' "Biologist red flags", and the Vet's quarantine view.

### 1.2 Screen order (`#v-bio`)
1. Brand header "DRS · Biologist / Daily report", with progress meter `bioBar` and "{n} of {t} done".
2. **When-stamp** "Report date & time" (date + time, auto-filled, editable; hint "Filled in automatically. Change only if you are writing it later.") (L3247–3254).
3. `actBox` **Action list** with a red count pill. Each row shows text and "Tell Vet/Curator/Supervisor", with ✓ when the follow-up is done. Empty text: "No red flags so far today."
4. `dueBox` **Due today** with a count pill. Empty text: "Nothing due. Add animals to the register to get reminders."
5. Sixteen collapsible cards (`details.card[data-bsec]`). Each pill shows Done, Pending, or a count.
6. "Create report" button, then the report preview `<pre>`, Signal/WhatsApp share links (copy text + open group), and paste help.
7. `sendBio` send box (§6.2).
8. "Past reports": the last 30 days from `kc-bio-index` with View buttons.
9. `datalist#animalList` = register animals (value = name, label = species · cage).

### 1.3 Record & storage
- `kc-bio-<date>` = record B. `kc-bio-index` = array of dates, newest first. `kc-bio-name` / `kc-bio-zone` (per user) remember the name and zone.
- Blank record (L2391): `{name,zone,ho:{},round:{},phys:[],diet:[{},{},{}],water:{r:[]},drop:[],train:[],scans:[],scanSetup:{every:2,total:10},beh:[],enr:[],checks:[],social:"",quar:[],wel:[],wt:[],fu:"",other:"",sign:{},_date,_time}`. Diet starts with 3 empty rows.
- Every input saves immediately (`bSave`), then the status, action list and due list update.
- Typing in an "animal" field fills the enclosure from the register (`REG.cage`), but only if encl is empty. This applies to phys, diet, drop, beh, enr and quar (L2597).
- Ticking any `*.done` checkbox auto-fills `*.time` with now (L2586).

### 1.4 Cards & fields
| # | Card (bsec) | Fields |
|---|---|---|
|1|info "Details" (sub = date)|`name` text "Biologist name" (remembered); `zone` text "Zone / section" (remembered)|
|2|ho "Handover with Supervisor" (sub "Sick animals, arrivals, overnight issues")|`ho.sup` text "Supervisor name"; `ho.time` time; `ho.notes` textarea; `ho.done` check "Handover taken"|
|3|round "Morning welfare round" (sub "Every animal seen")|`round.time` time; `round.seen` number "Animals seen"; `round.res` seg ["All normal","Issues found"(bad)]; `round.notes`; `round.done` check "Round completed"|
|4|phys "Nose-to-tail physical check" (≥1; help "Work far to near, nose to tail, top to bottom.")|Repeating "Add a physical check". New row = `{r:[],how:"Visual"}`. Fields: `animal` "Animal name / ID" (datalist), `encl` "Enclosure / cage no.", `who` "Done with (keeper / trainer)", `how` seg [Visual, During training, Hands-on (protected)], 12 rate rows from BODY with values [Normal, Abnormal(bad), Not seen], `notes`. If any row is Abnormal: warn "Abnormal: {n}" + check `vet` "Vet informed".|
|5|diet "Diet quality check" (≥3)|Repeating. Fields: `animal`, `encl`, `keeper` "Keeper name", 8 DIETQ rows [OK, Concern(bad), N/A], `left` "Yesterday's leftovers" seg [0%, <25%, 25–50%, >50%(bad)], `notes` "Remarks".|
|6|water "Water quality" (single object)|`encl` "Enclosures checked"; 4 WATERQ rows [OK, Concern(bad), N/A]; `pool` "Pool / water body"; `last` date "Last pH & chlorine test". Info line: if last+15d < today → warn "Pool test overdue (every 15 days…)", else "Next test due {d}". Saving pool+last writes `kc-pool[pool]=last`.|
|7|drop "Droppings & urine" (≥1)|Repeating. Fields: `animal`, `encl`, `f` "Faeces" [Normal, Soft, Diarrhoea, Hard, None seen] (every non-Normal is bad), `u` "Urine" [Normal, Abnormal(bad), N/A], `bw` check "Blood, worms or undigested food seen", `lab` check "Sample sent to vet lab", `notes`.|
|8|train "Training session review"|Repeating. Fields: `animal`, `trainer`, `beh` "Behaviour practised" [Target, Station, Foot present, Open mouth, Scale, Blood draw, Crate, Other], `res` [Did well, Partly, Did not(bad)], `chose` "Animal chose to take part" [Yes, No(bad)], `min` number "Duration (min)", `notes`.|
|9|beh "Behaviour: scan & notes"|(a) Behaviour scan timer (§1.6). (b) Repeating "Add observation". New row = `{time:now,method:"Focal"}`. Fields: `animal`, `encl`, `time`, `dur` min, `method` [Focal, Scan, Ad lib], `b` select "Behaviour (ethogram)" (optgroup "Ethogram behaviours" = custom behaviours from active "Ethogram study" plans matching the animal, then the base ETHO list), `loc` "Where in enclosure", `notes`. If `b` is repetitive: warn "Repetitive behaviour: report to Vet / Curator the same day" + check `rep` "Reported to Vet / Curator".|
|10|enr "Enrichment audit"|Repeating. Fields: `item` "Enrichment item", `animal`, `encl`, `type` [Food-based, Sensory, Physical, Social], `resp` [Interest, Play, Ignored, Aggression(bad), Stress relief], `min` "Time used (min)", `safe` check "New item: approved and safety-tested", `rm` check "Item removed (broken / unsafe / aggression)".|
|11|checks "Enclosure & habitat audit" (≥3/day)|Repeating. New row = `{type:"Enclosure",r:[]}`. Fields: `type` select from CHECKS keys (changing it resets `r`), `encl`, `animal` "Species / animal", rate rows from CHECKS[type] [OK, Concern(bad), N/A], `notes`. If any Concern: warn "Concerns: {n}", check `act` "Concern reported to Supervisor / Vet / Curator", and button **"Flag site work to AFM"** (L3057). The button creates an issue `{cat:"Other", prob:concern items joined "; " or notes or "Site work", loc:encl, pri:"Normal", from:"bio"}` and sets `afmSent`, after which the button becomes "✓ Sent to AFM".|
|12|social "Social group & quarantine watch"|`social` textarea "Group notes (fights, access to food, introductions)". Repeating quarantine rows: `animal`, `encl`, `am` check "Morning check", `pm` check "Evening check". Ticking either stamps `amt`/`pmt` = now (shown in the label). `notes`.|
|13|wel "Welfare assessment" (Five Domains, 1–5; 1 = very poor, 5 = very good)|Repeating. Fields: `animal`, then `nut`, `env`, `health`, `beh`, `mental`, each seg 1..5 (≤2 bad), `notes`. Info: "Average {a}". If a previous record exists: "Last time {a} ({d})", and if avg < prev−0.4 → warn "Score dropped. Discuss with Curator / Vet team". Otherwise "First assessment for this animal".|
|14|wt "Weight & body condition"|Repeating. Fields: `animal`, `kg` number (step 0.01), `bcs` seg 1..5 (1 and 5 bad). Info: "Last: {w} kg, BCS {b} ({d}). Change {p}%". Flag when \|Δ%\| ≥ 10 or \|ΔBCS\| ≥ 1 → warn "Sudden change. Report to Vet team". Otherwise "First record for this animal".|
|15|plans "Plans & projects"|Read-only list of non-Completed plans: title, type · status, progress bar, "{n} of {t} steps". Button "Open Plans" goes to the plans view.|
|16|sign "Follow-ups & sign-off"|`fu` "Follow-ups needed (Vet, Curator, Supervisor)"; `other` "Other remarks"; `sign.keepers` "Keepers / trainers worked with"; `sign.sup` "Supervisor acknowledged (name)"; `sign.ok` check "I confirm this report is correct"|

Option lists:
- **BODY** (12): Eyes; Ears; Nose & nostrils; Mouth, teeth or beak; Breathing; Skin, coat, feathers or scales; Body shape & condition; Limbs & joints; Feet, hooves, nails or claws; Tail & vent area; Wounds, lumps or swelling; Movement & posture.
- **DIETQ** (8): Items match the diet sheet; Weights match the diet sheet; Fresh: no bruises, insects, mould or rot; No faecal or other contamination; CSSD bowl used; Supplements added as prescribed; Presented the species' natural way; Served promptly after preparation.
- **WATERQ** (4): Drinkers clean and full; Water clear: no colour, smell, debris or algae; No stagnant water (mosquito breeding); Misting, mud or pools working where needed.
- **CHECKS** (L405):
  - Enclosure (8): Mesh, walls & fences intact / No sharp edges, rust or loose welds / Locks & gates working / Floor / substrate clean & dry / Drainage working / Shade & shelter available / Hiding / retreat space available / No debris, tools or hazards.
  - Habitat (7): Temperature right for the species / Humidity right / Lighting / UVB working / Noise & disturbance low / Plants & browse safe, non-toxic / Pool / water body clean (pH, chlorine, algae) / Mud, dust bath or misting where needed.
  - Enrichment (6): Items safe: non-toxic, no sharp edges, not swallowable / Items approved & safety-tested / Rotation schedule followed / Animal using the items / Broken or dirty items removed / Enrichment log filled.
  - Social group (5): No fighting or fresh wounds / Every animal reaches food & water / Bonded animals kept together / No animal isolated or chased / Introductions going to plan.
  - Feeding & diet (5): Diet matches the chart / Fed at the species time slot / CSSD bowls clean / Leftovers recorded / Food refusal reported.
  - Behaviour & welfare (5): No repetitive behaviour seen / Normal activity & alertness / Animal has choice (in/out, shade/sun) / Body condition looks normal / No signs of pain or illness.
- **ETHO** (L414) `[key,label,hi,repetitive]`: Resting, Feeding, Foraging, Drinking, Locomotion "Walking / moving", Exploring, Self-grooming, Social – friendly, Social – aggressive, Play, Vocalising, Enrichment use "Using enrichment", Vigilance "Alert / watching", Out of sight. Repetitive (flagged): Pacing "Repetitive pacing", Swaying "Swaying / head bobbing", Over-grooming "Over-grooming / self-harm". Then Other.

### 1.5 Completion meter (`bStatus`, L2613)
Counted sections: info (name and zone), ho.done, round.done, phys (≥1 row with animal and ≥6 rated), diet (≥3 rows with animal and ≥5 rated; pill shows "n of 3"), water (all 4 rated), drop (≥1 with animal and f), checks (≥3 with encl and ≥1 rated; pill "n of 3"), sign.ok. Total = 9.
Uncounted sections show a count only: train, beh (beh + scans), enr, social (quar count), wel, wt, plans (active count). Meter text: "{n} of {t} done".

### 1.6 Behaviour scan (instantaneous scan sampling, L2507–2543)
- Setup (`scanSetup`): `encl`; `every` select [1,2,5,10] min (default 2); `animals` CSV "Animals (separate with commas)" (required); `total` select [5,10,15,20,30] (default 10). Button "Start scan".
- On start, push `{encl,animals,every,total,recs:[],active:true,next:now}`.
- An active scan shows a 1-second countdown "Next scan in m:ss". When due: vibrate [200,100,200] and toast "Scan {n} of {t}: record now". Then one select per animal (study behaviours + ETHO) and "Save this scan".
- Save pushes `{at,v:{animal:behaviour}}`. When recs ≥ total, the scan becomes inactive and toasts "Scan complete". Otherwise `next = now + every·60000`.
- "Stop" deactivates the scan, or deletes it if there are no recs. Hint: "Keep the app open during a scan so the timer can alert you."
- A finished session card shows: "Scan session i: encl", the animals, "recs × every min", and the **activity budget**: % per behaviour = count / all non-empty × 100, rounded, sorted descending, with repetitive bars highlighted. If stereotypy % ≥ 10 → warn "Repetitive behaviour {p}% of the time. Report to Vet / Curator." Each card has a remove button.

### 1.7 Action list (red flags) rules — `actions(R,day)` (L2546)
Each item has `{txt, who: Tell Vet (v) / Curator (c) / Supervisor (s), done}`. The `done` follow-up flag is shown as ✓.
| Trigger | Who | done flag |
|---|---|---|
|round.res = Issues found|v|–|
|phys row with any Abnormal ("animal: Abnormal – parts")|v|o.vet|
|diet row with any Concern|s|–|
|diet leftovers >50%|v|–|
|water any Concern|s|–|
|pool last test + 15d < day ("Pool test overdue")|s|–|
|drop f≠Normal, or u=Abnormal, or bw|v|o.lab|
|beh repetitive behaviour|c|o.rep|
|scan with stereotypy ≥10%|c|–|
|enrichment resp=Aggression or item removed|c|–|
|checks with any Concern|s|c.act|
|quarantine with no PM check by 18:00 today|s|–|
|welfare avg dropped >0.4 vs previous|c|–|
|weight flag (\|Δ\|≥10% or \|ΔBCS\|≥1)|v|–|

`prevRec(kind,animal)` searches earlier rows the same day, then earlier days in `kc-bio-index`. It matches the animal name case-insensitively and needs a valid record (wel: all 5 domains; wt: kg>0; phys: any rating).

### 1.8 Due today (`dueList`, L2566)
- For each register animal with `wtEvery` or `welEvery` (days) > 0: due when the last record is missing or older than the interval. Line: "Weigh / Welfare score: Name (cage) · last {d} / never done".
- Pools (`kc-pool` map pool→last date): due when last+15 ≤ today.
- Quarantine rows: missing AM → "Morning check: X"; else missing PM → "Evening check: X".

### 1.9 Report text (`buildBio`, L2625) — WhatsApp-style, `*bold*` headers
`*DRS · BIOLOGIST REPORT*`, Date (when-stamp date · time when set), Biologist, Zone. Then `*⚠ Action list (n)*` with lines `- txt → who ✓`. Then 14 numbered sections:
1. Handover: sup / time / done (+ notes).
2. Morning round: time / seen / result (+ notes).
3. Physical (n): `i) animal (encl), With: who, how → Abnormal: parts | All OK` + notes + "Vet informed: yes/no".
4. Diet (n with animal): concerns / All OK; leftovers.
5. Water: enclosures → concerns / All OK / Not filled; pool last test, next due.
6. Droppings.
7. Training.
8. Behaviour (scan budgets + observations).
9. Enrichment.
10. Enclosure audit: `Type: cage X, species → Concerns n: …`.
11. Social + quarantine `AM ✓ time / ✗, PM …`.
12. Welfare: domains + Average.
13. Weight: `kg, BCS, (Change ±x%)`.
14. Plans: `• title [type] status, n of t steps, Due d`.

Then optional *Follow-ups needed*, *Other remarks*, and the sign-off lines (keepers, supervisor acknowledged, confirm yes/no). Empty sections print "Not filled" (mandatory sections) or "None".

---

## 2. ANIMAL REGISTER (L2670–2697; `#v-plans` segment "Animal register")
- Bio tab "Manage" (`plans`) has segment `pmSeg` with Plans | Shifting | Animal register | Weekly. Help text: "Add each animal once. Forms fill in automatically and you get reminders and history."
- Store `kc-reg` = array `{id:"A<ts>", name*, aid "ID / microchip", species, cage "Enclosure / cage no.", keeper, sex [Male, Female, Unknown], wtEvery, welEvery}`. `wtEvery` and `welEvery` are selects [0(-),7,14,30,60,90] days, default 30. The list is sorted by name.
- Add/Edit form: Save requires a name (placeholder "Enter a name"). Cancel discards changes.
- List rows show the name plus "species · id · cage · sex". Tapping a row expands its History:
  - "Last physical check: date | never done".
  - "Last welfare score: avg (date)".
  - "Weights": the last 6 of `date kg / BCS`.
  - Edit, and "Delete animal" (asks confirm "Delete this animal from the register?").
- The register feeds `#animalList`, auto-fills encl, and drives Due today.

## 3. WEEKLY summary (L2699–2713)
- Uses days in `kc-bio-index` from today−6 to today.
- Stats grid, 6 tiles: "Days reported", "Enclosure audits" (Σ checks), "Physical checks" (Σ phys), "Diet checks" (Σ diet with animal), "Behaviour scans" (Σ scans with recs), "Red flags" (Σ actions).
- "Animals with concerns": counts by the text before ":" in each action, sorted descending.
- "Create weekly report" builds:
  - `*VANTARA BIOLOGIST WEEKLY SUMMARY*`, then `Week: d1 – d2`, `Biologist: name`, then the 6 stats.
  - `*Action list*`: per day `date:` followed by lines `- txt → who ✓`.
  - `*Plans & projects*`: `• title: status, n of t steps`.
- Share via Signal/WhatsApp (copy to clipboard).

## 4. INSECTS & FEEDERS / EXPLORER v2 (L2715–2769; `#v-animals`)
- Animals tab segment `amSeg`: Explorer (`ex`) | Insects & feeders (`bugs`) | Care (`care`).
- **Feeders** (`bugChips`):
  - **around** "Insects around us": cards from BUGS `[name, hi, sci, food, role, note]`.
  - **feedi** "Feeder insects": a gut-loading info box, then FEEDI cards `[name, hi, sci, size, protein, fat, usedFor, note]`, then the button "Read the live-food SOP" (opens Learn → SOP book 5, chapter 06).
  - **rod** "Rodents": info box, then rodent profiles RODPROF `[name, hi, sci, desc, usedFor]`, then stage tables (columns Stage | Age | Weight g | Looks) for Mice (*Mus musculus*), Rats (*Rattus norvegicus*), ASF (*Mastomys natalensis*) and Other prey, then the SOP button.
- **Explorer v2**:
  - Class chips: birds, mammals, reptiles, amphibians, aquatic "Fish & aquatic", insects "Insects & more", pets (filter `s[10]`).
  - Species tuple: `[country, class, name, hiName, sci, food, habitat, IUCN, subspecies ";"-sep, note, pet, CITES]`.
  - Navigation: Regions grid (count per region; disabled if 0) → Countries list (count) → species cards. Breadcrumbs go back.
  - A search box over name, hi and sci shows "{n} results".
  - Card: IUCN badge (code + label), class tag, Pet tag, "CITES App. {a}" tag, Food tags, "Where: flag country: habitat tags", Subspecies, note. A legend of IUCN codes and a CITES note follow.

---

## 5. DRS FORM ENGINE (L2806–2853)
Generic, schema-driven daily forms. FORMS keys: night, special, acur, cur, vet, mgr, shift, inc (schemas L1809–1950; inc and shift are summarised in §11 and §10).

- **Schema**: `{title, small, role, sections:[{k, l, sub?, fields:[…]}]}`.
- **Field types** (`t`): text, area, time, date, num, seg (radio, `o` options, `bad`), multi (checkbox set, `o`, `bad`), check, group (repeating; `item` label, `add` button label, `fields`, `min`).
- **Field flags**: `req`, `min` (group min count), `mem` (remember last value per user in `kc-mem-<fk>-<k>`), `now` (time defaults to now on new record or new group item), `afm` (a check inside a group item that raises an AFM issue on send).
- **Storage**: `drs-<fk>-<date>` = record; `drs-idx-<fk>` = dates, newest first. `getRec` builds a new record with mem values, now-times and empty arrays.
- **Section state**: only req/min fields count. Done = all of them filled (check = true; group length ≥ min; multi non-empty; other non-blank). Null = no required fields. Meter = done / sections-with-required.
- **Card UI**: numbered `<details>` with title + sub and a pill (Done / Pending / item count). Only the first card opens by default, and open state is kept across re-renders.
- **Brand header**: small, title, meter, date. Then the when-stamp for all forms except shift and inc (L3255).
- **Group UI**: one box per item, titled "Item n" with "Remove". The "Add …" button scrolls to the new item.
- **Text output** `formText` (L2830): `*DRS · TITLE*`, `Date: d · time`, then per section `*n. Section*`. Plain fields print `Label: value`. Groups print `i) Label: v | Label: v`. An empty section prints "-". Check → "Yes"; multi → joined ", ".
- **Mounted contexts** (CTX): daily forms are mounted into a container (`mountDaily`). Per-record forms (shift, inc) use `data-rid`.
- **afmFromForm** (L2853), run on send: for each group item where `afm` is ticked and not yet `afmSent`, call `newIssue({cat:"Other", prob:notes||cage||"Site work", loc:cage, pri:"Normal", from:ROLE})` and mark it `afmSent`. Used by the Assistant Curator enclosure round ("Send site work to AFM").

## 6. SEND / SHARE / INBOX / PINS

### 6.1 Report kinds (`KINDS`, L2897 + later pushes)
| kind | label | owner role |
|---|---|---|
|kday|Day keeper|keeper|
|night|Night keeper|keeper|
|special|Special duty|keeper|
|sup|Site Supervisor|sup|
|inc|Incident (inserted at index 4)|sup|
|bio|Biologist|bio|
|etho|Ethogram|bio|
|shift|Shifting|bio|
|acur|Asst. Curator|acur|
|cur|Curator|cur|
|vet|Vet|vet|
|afm|AFM|afm|
|mgr|Manager|mgr|
|mgrx|Manager report|mgr|
|note|Research note|bio|
|dop|Data Operator|dop|
|att|Staff attendance|sup|

### 6.2 Send box (`sendHTML`, L2857)
- Header "Send report"; hint "Choose people or groups. In the main app this goes to their DRS chat."
- **People** chips = RECIP_PEOPLE: Head Animal Keeper, Site Supervisor, Biologist, Assistant Curator, Curator, Vet, Paravet, AFM, Manager, Security, + Cluster Head (L3110), + Data Operator (L3597).
- **Groups** chips: Site group, Zone group, Vet team, Curator office.
- Restrictions: the dop role sees people [Curator, Manager] and groups [Curator office] only. The pvet role sees [Vet, Manager] and [Vet team] only.
- Preselection = the previous send for this key, or else the user's last recipients (`kc-lastto-<role>`).
- Buttons:
  - "Send in DRS" (becomes "Send again" after sending). Needs ≥1 recipient, else toast "Choose at least one person or group".
  - "Preview report" / "Hide preview".
  - `<details>` "Also share outside DRS": Signal and WhatsApp group links. Tapping copies the text.
- After sending: "✓ Sent to {w} at {t}".
- Send flow: `finishSend` (translation, §17) → `commitSend`. It runs `onSend` (e.g. AFM issue creation), stores `SENT[key] = {to, at, title, role, text, orig, lang, from}` in `kc-sent`, saves lastto, toasts "Report sent", re-renders the box, and calls `DRS_SEND`.
- Send keys: `kday:<d>`, `night:<d>`, `special:<d>`, `sup:<d>`, `bio:<d>`, `acur|cur|vet|mgr:<d>`, `afm:<d>`, `etho:<id>`, `shift:<id>`, `inc:<id>`, `mgrx:<d>`, `note:<id>`, `dop:<d>`, `att:<date>:<site>|<zone>`.

### 6.3 Inbox (`#v-inbox`, tab "Reports"; L2895–2921)
- Intro: "Every report saved or sent on this device. In the main app, each person sees the reports sent to them." (Later, L4094+ "engine 11" restricts this to recipients only.)
- Sources: sup days, bio days, form records (night, special, acur, cur, vet, mgr), etho studies (date = start, author = observer), shifts, SENT kday/afm/mgrx/dop/att entries, incidents, published notes.
- Sort: by sent time descending, then by date descending.
- Filters: kind chips (All + KINDS), and date tabs Today | 7 days (default) | All dates.
- Row: title + "New" tag when unread (`kc-read[key]`, per user); then "date · author · Sent → recipients" or "Draft".
- Opening a report shows a sheet with title, date, sent info, and the full text `<pre>`. Escape or Close closes it. Opening marks it read.
  - If role ∈ {cur, acur, mgr, bio, sup}: `<details>` "Flag site work to AFM", with fields "What needs fixing?"* text, "Location", and "Type of problem" (MCATS key). The button "Send to AFM" calls `newIssue(pri Normal)` and toasts "Sent to AFM".
  - If role ∈ {cur, acur, mgr}: "📌 Pin for the team" pins "title (date)".

### 6.4 Pins (L2876–2882)
- Store `kc-pins` = `[{text, by:role, at}]`. Shown in the top `pinBox` "📌 Pinned for the team (n)".
- Only cur, acur and mgr can add (inline input "Pin a note for everyone" + "+") or Unpin. Other roles see the box only when pins exist.

### 6.5 Keeper duty (L2884–2893; `#v-today`)
- Segment Day | Night | Special duty (`kc-duty`, per user).
  - Day = timeline checklist + send key `kday:<d>`.
  - Night and special = engine forms.
- Day text: `*DRS · DAY KEEPER REPORT*`, Date, `*Tasks done: n/N*`, "Not done:" list (⚠ when safety-critical) or "all checks", then `*Animal log (n)*` with lines `- animal: Appetite x, Behaviour y, Droppings z – notes` (today's log entries).

### 6.6 Role tabs (final, after all overrides in this slice)
| role | tabs |
|---|---|
|keeper|today "My duty", log, animals, learn|
|sup|sup "Report", inc "Incidents", att "Attendance", inbox, learn|
|bio|bio "Report", etho, plans "Manage", notes, learn|
|acur|form "My report", inbox, animals, learn|
|cur|cdash "Dashboard", inbox, form "My report", etho, notes|
|vet|cdash, form "Report", inbox, notes, learn|
|afm|afm "Issues", att, learn|
|mgr|dash, inbox, att, stock "Count", etho|
|agency|agency "My jobs"|
|dop|moves "Movements", stock "Count", att, staff "Staff", inbox|

- Events (`events`) open from the top 📅 button for every role.
- Learn gets a "🐾 Animal guide" button (L3567) for roles without an Animals tab.
- Role descriptions:
  - acur "Daily enclosure round and operations"
  - cur "Reads all reports, approvals, flags to AFM"
  - vet "Health round, treatments, births, mortality"
  - afm "Only maintenance issues for your team"
  - mgr "Dashboard and every team's reports"
  - agency "Only your assigned complaint jobs"
  - dop "Animal in/out, births, deaths, moves, counts and staff attendance"
- Badges:
  - afm tab = count of tickets in new + done.
  - mgr dash tab = open tickets (red when any is urgent) + pending cover requests.
  - agency tab = assigned jobs.
  - dop moves tab = movements to verify.
  - 📅 top button = pending events (mgr) or upcoming events for me.

---

## 7. AFM ISSUES / TICKETS

### 7.1 Issue record (`kc-issues`, per site; `newIssue` L2874)
`{id:"M-001" (counter kc-issue-n; replaced later by V1S2-26-0001 in engine 11, L4094+), cat, prob, loc, pri:"Normal"|"Urgent", step:0..3, times:[ts per step], date, from:role, notes:[{t,at,by}], st, hist:[{st,at,by,note,agency}], agency?, target?, instr?, eta?, photo?, afmSent…}`

- **Categories** (MCATS, L259) with their sub-problems:
  - AC: Not cooling / Water dripping / Making noise / Not switching on.
  - Electrical: Light not working / Exposed wire / Switch board fault / Power trip / no supply / Fan not working.
  - Civil: Tile broken / Wall crack / Door / gate damaged / Floor damaged / Roof leakage.
  - Plumbing: Pipe leakage / Tap broken / Drain blocked / No water supply / Pool / moat leak.
  - Cleaning: Garbage not cleared / Drain needs cleaning / Pest / insects / Area not cleaned.
  - Equipment: Hose pipe damaged / Weighing scale fault / Cooler not working / Sprinkler fault / Tool broken.
  - Mesh: Mesh torn / Mesh loose / Welding needed / Lock / latch faulty.
  - Fabrication: Gate / door fabrication / Railing / grill repair / New frame / stand needed / Rust / painting of metal.
  - Carpentry: Wooden structure broken / Platform / perch repair / Nest box / den box.
  - Painting: Wall painting / Signboard.
  - Other.
- **Priority**: Normal | Urgent. The Supervisor form chooses it (out of slice). Incidents with severity High or Critical create Urgent issues.
- **Sources**:
  - Supervisor "addIssue" (from = role).
  - Biologist audit "Flag to AFM".
  - Inbox "Flag site work to AFM".
  - Form group `afm` checks (Asst. Curator).
  - Incident `afm` check (cat "Mesh", prob "Type: cause/story" ≤140 chars, from sup).

### 7.2 v1 lifecycle (L2923–2941, later superseded)
- Steps: 0 New → 1 Seen → 2 In progress → 3 Fixed. Buttons: "Mark seen", "Start work", "Mark fixed".
- Filter tabs 0/1/2/3/All, each with a count.
- An age tag "Open {d}" shows when step < 3 and the issue was created more than **2 days** ago.

### 7.3 v2 ticket lifecycle with agencies (L3395–3487) — final
- States STS: `new` → `seen` → `assigned` → `accepted` ⇄ `parts` → `done` → `closed`.
- Step mapping ST2STEP: new 0, seen 1, assigned/accepted/parts/done 2, closed 3.
- Labels: New; Seen by AFM; Assigned to agency; Work in progress; Waiting for parts / on hold; Work done – AFM to check; Closed.
- `setSt(x,st,note,extra)` sets st and step, stamps `times[step]` the first time, pushes to hist `{st,at,by:ROLE,note,agency}`, appends the note to notes, merges extra, and fires DRS_NOTIFY.

| Actor | From state | Action | Result |
|---|---|---|---|
|AFM|new|Mark seen|seen|
|AFM|seen/assigned|"Assign to agency" / "Change agency". Form: Agency select (name + trades), "Finish by" date (default today+2), Instructions → "Assign job". Disabled with "No agencies yet…" when the list is empty.|assigned (note = instructions; sets agency, target, instr)|
|AFM|seen|"Do in-house"|agency="inhouse", accepted|
|Agency|assigned|"Accept job"|accepted|
|Agency|accepted/parts|"Expected finish" date+time (default target or today, 17:00) → "Update timeline"|eta set; hist note "Expected finish: …" (state unchanged)|
|Agency|accepted|"Need parts / on hold" with required text "What is needed and how long?"|parts|
|Agency|parts|"Resume work"|accepted|
|Agency|accepted/parts|"Work done" with required "What was done" + optional photo (resized ≤900px, JPEG 0.72) → "Submit for AFM check"|done (+photo)|
|AFM|done|"✓ Confirm & close ticket"|closed|
|AFM|done|"Not OK – send back" (prompt "What still needs fixing?")|back to assigned (external agency) or accepted (in-house)|
|AFM/Agency|any open|Add a note (+)|note + hist entry, same state|
|Supervisor|new|Delete (own list)|removed|

- **Timings** (`times`):
  - created = times[0].
  - assigned = first "assigned"; accepted = first "accepted".
  - done = last "done"; closed = last "closed" (only while st=closed).
  - Response = accepted − created. Work = done − accepted. Total = closed − created.
  - `dur()` formats as "N min", "H h M min" or "D d H h".
- **Ticket card** (`tkInfo`):
  - Problem, id.
  - "cat, loc · Raised by: role · time", plus an Urgent tag.
  - 6-step bar (parts shown as a wait style on step 4).
  - Status label · "Assigned to: agency" · "Finish by" · "Expected finish".
  - Instructions, photo.
  - When closed: "Response · Work · Total".
  - Last note (time · role).
  - Collapsible "Ticket history (n)" listing every hist entry.
  - When the AFM is under cover: "🔁 AFM away – covered by X".
- **AFM screen** (`#v-afm` "AFM work list"; "Only site-work issues raised by Supervisors, Biologists, Curators and others."):
  - Chips: New, Seen, With agency (assigned/accepted/parts), To check (done; red when >0), Closed, All, each with a count.
  - `sendAfm` box for the AFM daily summary:
    - `*DRS · AFM DAILY SUMMARY*`, Date.
    - `*Fixed today (n)*`: `- id [cat] prob @ loc – status (agency) · Time taken dur`.
    - `*Still open (n)*`: `…, age`.
- **Supervisor maintenance list** (`renderIssues`): Open/Closed filter, full ticket cards. A "Delete" button shows only while the ticket is new.
- **Agency screen** (`#v-agency`, title = agency name, sub "Only your assigned complaint jobs"):
  - Chips: New jobs (assigned) | In progress (accepted, parts) | Waiting AFM check (done) | Closed.
  - Accepting a job switches to In progress. Submitting done switches to the done tab.
- **Popups / notifications**:
  - AFM new-complaint popup (L3075): on nav and every 5s poll (skipped while the user is typing) plus the storage event. Shows new issues not yet popped (`kc-afm-popped`): vibrate, browser Notification "DRS · AFM" "{n} new complaint(s)". The sheet lists up to 6 issues, with buttons "Open work list" (go to afm, filter New) and "Later", plus "Turn on phone alerts" when permission is default.
  - Agency popup "{n} new job(s) assigned" (`kc-agpop-<agency>`, keyed id:histLen so re-assignments pop again).
  - AFM done popup "{n} job(s) finished – please check and close" (`kc-afmdone-pop`), with buttons "To check" and "Later".
  - The 4s poll watches the hist length of every ticket and refreshes afm, agency, mgr dash and sup views.
- **DRS_NOTIFY on status change**: assigned → toRoles [agency]; done → [afm]; other → [afm, mgr, raiser]. New issue → `afm_ticket` to [afm, mgr].
- **Escalation / time targets in this slice**:
  - "Open > 2 days" filter and age tag.
  - Agency "Finish by" target (default +2 days).
  - Urgent tag and red styling.
  - (P1–P4 maintenance priorities and SLA escalation are defined later, L4578+.)

### 7.4 Agencies (Manager dashboard `agBox`, L3407–3426)
- Store `kc-agencies` (global): `{id:"AG<ts>", name*, trades:[…], person, phone, login}`.
- Trades: Civil, Electrical, Plumbing, Fabrication, Carpentry, Painting, AC, Mesh, Cleaning, Equipment, Other.
- Header "Agencies"; help "Contractors who receive AFM jobs. Give each the login ID created in the main app."
- Row: name; trades · person · phone · ID; "{n} open · {n} closed · avg {dur}" (average total time of closed tickets). Buttons Edit and Delete (with confirm).
- Agency sign-in:
  - Role picker "Agency" → "Which agency are you?" list. The choice sets `kc-agency-id`.
  - Main app: `?role=agency&agency=<id|login|name>`.

### 7.5 Manager AFM tickets (on the dash, L3093–3105, rewritten L3508–3515)
- Section "🛠 AFM tickets" — "All open site-work tickets from every team."
- Chips: All open, New (new+seen), With agency, To check, Urgent (open & Urgent), Closed.
- The Closed filter shows a table: Ticket/raised-by | Problem/cat, loc | Agency | Started (accepted) | Finished (done) | Closed | Time taken (total).
- Other filters show ticket cards.
- The "Open AFM issues" stat tile scrolls to this section.

---

## 8. MANAGER DASHBOARD (`#v-dash`, L2943–2957 + additions)
Order:
1. Date.
2. **Stats grid**. Deaths and red-flag tiles turn "hot" when > 0.
   - Births = Σ supervisor events Birth (count, default 1) + night finds Birth + vet births rows.
   - Mortality = the same for Mortality.
   - Red flags = biologist actions today + night finds with Emergency=Yes.
   - Open AFM issues = step < 3.
   - Active ethogram studies.
   - Animal moves planned = shifts in Planned, Approved or In progress.
3. Warning "{n} urgent · Open AFM issues".
4. **Reports today** grid with status per team (Day keeper, Night keeper, Special duty, Site Supervisor, Biologist, Asst. Curator, Curator, Vet, AFM): "✓ Sent" if `SENT[kind:today]`, "Draft" if any record exists, else "Not started".
5. **🐾 Animal alerts today (n)** with alert cards that include "Seen by".
6. **Latest reports**: the top 8 from the inbox list, opening the report sheet.
7. `mgrStaff` attendance analytics (§15.4).
8. **Movements today (n)**: type: species × n, with Verified / To verify.
9. **🔁 Cover requests**: pending ones with Approve/Reject, plus active-cover lines.
10. 🛠 AFM tickets (§7.5).
11. Agencies (§7.4).
12. Export centre (§9).
13. "Manager remarks" form (FORMS.mgr: `name`* mem, `note`* "Remarks and instructions for all teams") with its send box.

## 9. EXPORT CENTRE (L3153–3228)
- Header "📤 Export & send to Cluster Head". Help: "Pick dates and what to include, build the report, edit it, then download or send."
- State `kc-export` (global): `{range:"1"|"7"|"m"|"c", from, to, inc:[…], text}`. Defaults: range 7, all sections included.
- **Dates**: Today | 7 days | This month (1st → today) | Choose dates (From/To).
- **Include** checkboxes: sum "Summary numbers", bm "Births & mortality", al "Other animal alerts", afm "AFM tickets", rep "Full team reports", rem "Manager remarks".
- **Data in range**:
  - reports = all inbox items in range except mgrx.
  - alerts = `kc-alerts` with date in range, oldest first.
  - afm = all open tickets + tickets whose close/created date is in range.
- **"Build report"** writes text into an editable textarea "Edit before exporting":
  - `*VANTARA DRS · MANAGER REPORT*`, Period, Prepared by (mgr form name).
  - *Summary numbers*: Reports received n (per-kind counts); Births/Mortality (Σ count) · Animal alerts n; AFM tickets open n ({u} urgent) · fixed n.
  - *Births & mortality (n)* and *Other animal alerts (n)*, one line each: `- date time: Type – animal, cage X, count N (role) – details`.
  - *AFM tickets (n)*: `- id [cat] prob @ loc – status (Urgent), from role, age`.
  - *Full team reports (n)*: each report's full text, separated by "────────────" lines.
  - *Manager remarks*: mgr.note.
- **Export buttons** (file base `DRS-Manager-Report-<from>_to_<to>`; libraries load from the cdnjs CDN; save goes through `claude.use("downloads")` or falls back to an `<a download>` link):
  - 📄 Word `.docx`: a minimal JSZip document. `*x*` lines become bold headings in colour 123F31 (size 13pt; title 16pt), body text is 11pt Calibri, page A4 with 2 cm margins.
  - 📕 PDF: html2canvas + jsPDF A4, sliced into pages with a 28pt margin.
  - 📊 Excel `.xlsx`, sheets:
    - Summary: Item, Value — Period, Reports received, Births, Mortality, Animal alerts, AFM open, AFM fixed.
    - Animal alerts: Date, Time, Type, Animal, Cage, Count, From, Details, Seen by.
    - AFM tickets (v2): Ticket, Raised, Raised by, Category, Problem, Location, Priority, Status, Agency, Assigned, Started, Work done, Closed, Response time, Work time, Total time, Last note.
    - Reports: Date, Team, Report, Author, Status (Sent/Draft), Sent to, Full text (column width 80).
  - 📝 Notes `.txt` (asterisks stripped).
  - Errors: "Needs internet to load the file maker" / "Could not create the file here". While working: "Preparing file…"; when finished: "File ready".
- Once built, a send box `mgrx:<today>` sends the edited text (kind "Manager report").

## 10. ANIMAL SHIFTING (L2959–2966; Manage → Shifting; FORMS.shift)
- Store `kc-shifts`: one record per move. New record = `{id:"S<ts>", status:"Planned", date:today, chk:[], settle:[]}`.
- Cards show: kind; animal; "from → to"; date; status.
- **Sections**:
  - **Animal & move**: animal*; species; kind* [Within enclosure / night house, To another enclosure (same site), To another site, To hospital / quarantine, Incoming from outside]; from; to; date; time; why "Reason"; how [Walk-through / gate, Crate, Crate + vehicle, Under sedation]; status [Planned, Approved, In progress, Completed, Cancelled].
  - **Before the move**: chk* multi [Vet health check, Curator approval, Crate-trained / crate inspected, Receiving enclosure ready & checked, Route cleared, Team briefed, Weather suitable, Emergency kit & vet on standby, Transport papers / permits]; team.
  - **After the move**: done time; settle multi [Calm, Exploring, Eating, Drinking, Stressed / pacing(bad), Hiding, Not eating(bad), Injury seen(bad)]; note "Notes for the next 3 days".
- Each record has its own send box `shift:<id>` and Delete (confirm).
- **Approval**: the Curator dashboard lists Planned shifts under "Waiting for your approval". Approve → status Approved; Reject → Cancelled.
- Completed shifts feed the movement register (§16).

## 11. ETHOGRAM STUDIES (L2968–3032; `#v-etho`; roles bio, cur, mgr)
- Store `kc-etho`: `{id:"E<ts>", animal*, species, encl, period:"day"|"week"|"month"|"custom", start, end, goal, observer (default bio name), obs:[{id,date,time,b,dur,loc,ctx[],int,notes}], status:"Active"|"Completed"}`.
- **New study form** "New study":
  - Period seg: 1 day / 1 week / 1 month / Custom. End date = start, +6 or +29 days; it is editable only for Custom.
  - Fields "What do you want to learn?" and Observer. "Create study" needs an animal. If end < start, end = start.
- **List**: animal · species; "start – end · Day n of N · n entries · status".
- **Study screen**:
  1. Crumb, header and goal box.
  2. **Quick log**: category chips (ETH_CATS) → behaviour buttons. A tap logs `{date:selected day, time:now, b}` and toasts "Logged: b at t".
  3. **Detailed entry**: date (limited to the study range), time, behaviour select (grouped), duration, Where seg (ETH_LOC), Situation multi (ETH_CTX), Intensity (Low, Medium, High), notes → "Add entry".
  4. **Day timeline**: day navigation ‹ date ›, a 24-hour strip coloured by the dominant category per hour, and the list of entries with remove buttons.
  5. **Activity budget (whole study)**: % per category, weighted by duration (default 1).
  6. "Abnormal / repetitive: {p}% of entries" (warns at ≥10%).
  7. "Most active hour" (excludes rest and oos).
  8. "Entries per day" bar chart (only for multi-day studies).
  9. "Mark study completed" / "Reopen".
  10. Send box `etho:<id>`.
- **ETH_CATS** (key, label, colour, behaviours):
  - rest Resting: Lying, Sitting, Standing still, Sleeping.
  - move Movement: Walking, Running, Climbing, Swimming, Flying, Jumping.
  - feed Feeding: Eating, Foraging / searching food, Drinking, Chewing cud.
  - care Self-care: Self-grooming, Scratching / rubbing, Wallowing / mud bath, Dust bathing, Basking / sunbathing.
  - soc Social – friendly: Grooming another, Playing together, Resting together, Greeting.
  - agg Social – conflict: Threat display, Chasing, Fighting, Displacing another, Submissive.
  - play Play & exploring: Solo play, Exploring / sniffing, Object play.
  - enr Enrichment: Using food enrichment, Using object enrichment, Investigating scent / sound, Ignoring enrichment.
  - alert Alert & watching: Vigilant / scanning, Watching keepers, Reacting to visitors / noise.
  - comm Communication: Vocalising, Scent marking.
  - rep Breeding & parenting: Courtship, Mating, Nursing / suckling, Carrying young.
  - elim Toilet: Urinating, Defecating.
  - **abn Abnormal / repetitive**: Pacing, Swaying / weaving, Head bobbing, Over-grooming / self-harm, Bar biting / licking, Regurgitation & reingestion, Repetitive swimming.
  - oos Out of sight.
- **ETH_LOC**: Indoor / night house, Outdoor area, Near barrier / fence, Near keeper door, Pool / water, Shade, Elevated / platform / tree, Den / hide box, Feeding spot.
- **ETH_CTX**: Before feeding, After feeding, Enrichment given, Keeper present, Visitors / vehicles, Loud noise, Rain, Hot weather, Training session, After shifting, After vet procedure.
- **Text output**:
  - `*DRS · ETHOGRAM STUDY*`, then Animal (species), Enclosure, Period, Observer, Goal, Status.
  - `*Activity budget*` lines `- cat: p%`, then "Abnormal…%".
  - Per date `*date*` with lines `HH:MM behaviour (n min) @ loc – ctx – notes`.
- Studies with ≥10% abnormal entries appear on the Curator dashboard.

---

## 12. ANIMAL ALERTS (L3109–3151, incidents L3267–3269)
- **Auto-generated** (`currentAlerts`, today only):
  - Supervisor events: every event with a type (from "sup"; fields species, cage, count, details, time).
  - Night-keeper finds with type in AL_NIGHT: Birth, Mortality, Fight, Injury, Animal looks dull / lethargic, Not eating / not drinking, Unusual calling / distress, Escape / near-miss.
  - Vet births (type Birth; count n; details = condition).
  - Vet mortalities (details = cause, PM).
  - Today's incidents (animal "name – species", details "outcome. story", from sup).
- **Sync** (`syncAlerts`, debounced 400ms after any input or click):
  - `kc-alerts` = map id → `{id,type,animal,cage,count,details,time,from,date,at,seen:{role:1}}`.
  - New alerts are added (seen by the source role). Changed fields are updated. Today's alerts are deleted when their source row is removed.
- **Recipients** AL_TO = bio, cur, acur, vet, mgr. A recipient never sees their own alerts.
- **Bad (urgent styling)** AL_BAD: Mortality, Sick / injured, Fight, Injury, Escape / near-miss, Staff injury / bite, Animal looks dull / lethargic, Not eating / not drinking, Unusual calling / distress, + Animal escape, Animal down / collapsed, Injury to animal, Fight between animals, Enclosure breach / damage, Fire / smoke. Birth uses green styling.
- **UI**:
  - Top bar `alertBox` "🐾 {n} new animal alert(s)" shows the first 2 alerts and "View ›".
  - The sheet "Animal alerts" (help: "Births, deaths, injuries and other animal events reach the Biologist, Curators, Vet and Manager automatically.") shows unseen alerts, or the last 30. "Mark all as seen" sets `seen[ROLE]`.
  - Popup on nav per role (`kc-alpop-<role>`), with vibrate. 5s poll + storage event.
  - The Supervisor events card shows "🐾 Sent automatically to Biologist, Curators, Vet and Manager".
  - Card: "Type: animal", time, "cage · count · From: role · date", details, optional "Seen by: roles".
- DRS_NOTIFY `animal_alert` → AL_TO for each new alert.

## 13. DRS v3 additions (L3230–3376)
- **Branding**: top bar "DRS / Daily Report System". A splash shows once per session (`sessionStorage drs-splash`) with "DRS · Daily Report System · Vantara" (1.3s).
- **When-stamp** `_date`/`_time` on sup, bio and all engine forms except shift and inc. Report text replaces "Date: d" with "Date: _date · _time".

### 13.1 INCIDENTS (`#v-inc`, Supervisor tab "Incidents")
- Intro: "Escape, injury, animal down, breach or any other incident. Curator, Vet, Biologist and Manager are alerted automatically."
- Button "Report a new incident" → `{id:"I<ts>", date:today, time:now, zone:(mem or sup zone), how:[], to:[], status:"Open"}`. It opens with all sections expanded.
- Store `kc-incidents`. Every save re-syncs alerts.
- Summary header: type · severity; animal · cage; date time; outcome (red when Still missing or Died); status. Cards with High/Critical severity are hot.
- **FORMS.inc fields**:
  - **What happened**:
    - date*; time* (now).
    - type* [Animal escape(bad), Animal down / collapsed(bad), Injury to animal, Fight between animals, Staff injury / bite(bad), Near-miss, Enclosure breach / damage, Visitor incident, Fire / smoke(bad), Theft / intrusion, Other].
    - sev [Low, Medium, High(bad), Critical(bad)].
  - **Animal details**: animal*; aid "ID / microchip"; species; sex [Male, Female, Unknown]; age; cage*; zone (mem).
  - **Outcome**:
    - out* [Got back / in enclosure, Returned on its own, Still missing / not found(bad), Contained, did not escape, Treated by vet, Died(bad), Other].
    - rtime "Time resolved"; where "Where the animal was found".
    - how multi [Herded back, Lured with food, Net / crate, Darted by vet, Came back by itself, Not applicable].
    - inj [No injuries, Animal injured(bad), Staff injured(bad), Animal and staff(bad)].
  - **People informed**: to* multi [Head Animal Keeper, Curator, Assistant Curator, Vet, Manager, Security, AFM, Biologist]; ttime; vet "Vet attended" Yes/No.
  - **Full details**: story* "How it happened, step by step"; act "Actions taken"; wit "Witnesses / staff present"; cause; prev "What will stop it happening again"; afm check "Enclosure repair needed: send to AFM"; status [Open, Closed].
- **Send** `inc:<id>`. Title "Incident: type – animal". On send, if afm is ticked and not yet sent → AFM issue (cat Mesh, Urgent when sev is High/Critical).
- Incidents appear in the inbox (kind inc). out=Died creates an auto Mortality movement.

### 13.2 Curator / Vet dashboard (`#v-cdash`, tab "Dashboard"; L3273–3305)
Title "Curator dashboard" or "Vet dashboard".
- Stats: Births, Mortality, Open incidents (status ≠ Closed), Red flags (biologist actions), then [Vet] "Treatments to follow up" (today's health rows Under treatment + today's treatments) or [Curator] Active ethogram studies, then Open AFM issues.
- **Vet sections**:
  - 🩺 Health alerts: alerts of type Mortality, Sick / injured, Injury, Injury to animal, Fight, Fight between animals, dull, not eating, Animal down, Birth, Under treatment, Unusual calling.
  - ⚠ Flags for the Vet: biologist actions with who = Tell Vet.
  - 👁 Special duty concerns: today's special-duty observations tagged Aggression, Restless / distressed, Not eating, Heavy breathing, or Bleeding / wound.
  - 💊 Treatments to follow up: yesterday's and today's treat rows with a `next` value (animal – dx · med, next).
  - 🔒 Quarantine checks: bio quar rows, AM ✓/✗ · PM ✓/✗.
  - 🚨 Open incidents.
- **Curator sections**:
  - ✅ Waiting for your approval: Planned shifts with Approve/Reject.
  - "📅 Waiting approval: n" events count.
  - 🐾 Animal alerts today.
  - 🚨 Open incidents (they open the report sheet).
  - ⚠ Biologist red flags today.
  - 📈 Ethogram studies with repetitive behaviour ≥10% (they open the study).
  - Reports today grid (same as the manager's, without the Curator tile).

### 13.3 EVENTS / calendar (`#v-events`; L3306–3357)
- Intro: "Trainings, drills, meetings and visits. Curators and Biologists create them, the Manager approves, then staff get a reminder until the day."
- Store `kc-events`: `{id:"EV<ts>", title*, type, date* (min today), start (default 10:00), end, loc, aud*[…], desc, img (dataURL ≤800px JPEG 0.72), byRole, at, rev, status:"pending"|"approved"|"rejected", rejNote}`.
- **Types**: Training – animal care (default), Training – health / vet, Safety / emergency drill, Meeting, VIP / official visit, Enrichment day, Vaccination / health camp, Celebration / awareness day, Other.
- **Audience**: All staff, Keepers (default), Supervisors, Biologists, Assistant Curators, Curators, Vets, AFM, Manager. Role-to-audience map: keeper → Keepers, sup → Supervisors, …
- **Who creates**: cur, bio, mgr, acur.
- **Save**:
  - A Manager save gets status approved ("Save and publish", toast "Event published").
  - Other roles get pending ("Save and send for approval", toast "Sent to Manager for approval").
  - Validation: title, date and ≥1 audience, else "Add a title, date and who should attend".
- **Edit**: allowed for the creator role or mgr. Each edit increments `rev`. A non-manager editing a rejected event resubmits it as pending. Approved events with rev > 1 show an "Updated" tag.
- **Manager actions** on pending events: Approve (approved, rejNote cleared) or Reject (prompt "Reason (optional)" → rejected + note shown). Delete asks for confirm.
- **Tabs**:
  - Upcoming: approved events with date ≥ today. Managers and creators see all; others see only events for them.
  - Waiting approval: creators only, with a count. Lists pending events for mgr, or own pending events otherwise.
  - Past: date < today or rejected.
- **Card**: image, type, title, "📅 date · 🕒 start–end, 📍 loc, 👥 audience", desc, status tag, "Created by role", and the reject note. Today's events are highlighted.
- **Reminders**:
  - Top banner `evBox` "📅 Upcoming: title · Today/date · start · loc · +n more" (hidden on the events view).
  - Popup "Event reminder" once per day per event revision (`kc-evpop-<role>-<date>` = id:rev) with "OK, noted". Reminders repeat daily until the event date.
  - 📅 badge.
  - DRS_NOTIFY types `event_approved` (declared).

### 13.4 Main-app login hook (L3367–3376, L3564, L3773)
- URL form: `drs.html?role=sup&name=Ravi%20Patel&zone=Zone%204&lock=1`, or `postMessage({type:"drs-user", role|post, name, zone, agency, lock})`.
- `POST_TO_ROLE` maps job titles to roles:
  - keeper / animal keeper → keeper
  - site supervisor / supervisor / head animal keeper → sup
  - biologist / senior biologist → bio
  - assistant curator → acur
  - curator / site curator → cur
  - vet / veterinarian / paravet → vet
  - afm → afm
  - manager / facility manager / site manager → mgr
  - data operator / data entry operator → dop
  - agency → agency
- Effects: name is written to `kc-sup-name`, `kc-bio-name` and every `kc-mem-<fk>-name`. Zone is written to the sup/bio zone and every `kc-mem-<fk>-zone` and `-site`. `lock` adds the body class "locked" (hides the role switch). The role picker closes.
- (Real build: ANTS sign-in `?uid=&token=&site=`, L190.)

## 14. RESEARCH NOTES (L3518–3549; tab "Notes" for bio, cur, vet)
- Intro: "Private workspace for research, papers and ideas. Nothing is sent until you publish."
- Store `kc-notes` (per user): `{id:"N<ts>", owner:role, title*, type, tags (datalist animals), body, img (≤1000px JPEG 0.75), upd, pub, pubAt}`.
- **Types**: Research (default), Paper / article draft, Observation notes, Literature notes, Data & results, Idea / plan.
- **List**: search box "Search your notes" (title + tags + body) and cards showing title, type · 🌐 Published / 🔒 Private · time, and tags. Sorted by update time, newest first.
- **Editor**: "Save note" requires a title. "Publish" (with confirm "Publish this note? It will appear in Reports for the team.") / "Make private again". "Delete" asks for confirm. Shows "Saved {t}".
- Published notes appear in the inbox (kind note, date = pubAt) and get a send box `note:<id>`. Text: `*DRS · RESEARCH NOTE*`, Title, Type, Tags, "role · date", body.

## 15. COVER / DELEGATION, STAFF, ATTENDANCE (L3569–3694)

### 15.1 Cover / delegation
- Role sheet button "🏖 I'm not available (leave / handover)" opens "Mark yourself not available" ("Choose dates and who will cover your work. The Manager approves it."):
  - From (today) and To (today+1). Must be valid with to ≥ from.
  - Reason seg AWAY_WHY: Leave (default), Holiday, Sick, Training, Official travel, Other.
  - "Hand over to" role select from [mgr, acur, sup ("Site Supervisor / Head Animal Keeper"), cur, bio, vet, afm, dop] minus the user's own role.
  - "Person's name" and notes.
  - "Send for approval".
- Store `kc-cover`: `{id:"CV<ts>", role, name, from, to, why, toRole, toName, note, at, status:"pending"|"approved"|"rejected"}`. A Manager's own request is auto-approved.
- **Manager approval**: the dash card "🔁 Cover requests" lists pending requests with Approve/Reject. Approved, active covers show "{r} away – covered by {c} · until". The mgr badge adds the pending count.
- **Active cover** = approved and from ≤ today ≤ to.
- **Covering user** sees the bar "🔁 You are covering for {r} (name) until {d}". For AFM cover it also shows a badge with the new + done count. Button "Open {r} work" switches ROLE to the covered role (ACTING `{orig, as}`), showing the bar "Acting as {r} (cover). [Back to {orig}]". The saved role is not overwritten (`kc-role` is kept), and the body gets class "acting".
- **Away user** sees "🏖 You are marked not available until {d}. Covered by {r} (name)." or "Waiting for Manager approval (from – to)", with Cancel (deletes the request).
- Ticket cards show the AFM cover note.
- 5s poll on `kc-cover`.
- DRS_NOTIFY types `cover_request` and `cover_approved` (declared).

### 15.2 Staff register (`#v-staff`; dop edits, others view)
- Store `kc-staff`: `{id:"ST<ts>", name*, ep "EP / employee no.", post, site, zone, shift, phone}`.
- **POSTS**: Keeper (default), Night keeper, Senior keeper, Head Animal Keeper, Site Supervisor, Kitchen staff, Cleaner, Driver, Security, Other.
- **Shift**: -, Morning, General, Evening, Night.
- Site and zone fields have datalists of existing values.
- **Bulk add** "Add many at once": one line per person, "Name, EP no., Post, Site, Zone". Post is matched case-insensitively (default Keeper). Toast "{n} added".
- List sorted by site + zone + name, with an "On roll: n" count. Edit and Delete (confirm).
- (Later, ANTS supplies staff — L1–20.)

### 15.3 Attendance marking (`#v-att`; sup and dop mark, mgr and afm view)
- **ATT statuses**:

| Status | Short | Class |
|---|---|---|
|Present|P|ok|
|Absent|A|bad|
|Leave|L|mid|
|Sick leave|SL|bad|
|Weekly off|WO|off|
|Holiday|H|off|
|Half day|HD|mid|
|Late|LT|ok|
|On duty elsewhere|OD|ok|

  "On duty" = Present, Late, Half day, On duty elsewhere.
- Store `kc-att` = `{date: {staffId: {st, by:role, tm:"HH:MM", at}}}`.
- **Controls**: Date (max today), Site (All + list), Zone (All + zones of the chosen site). A Supervisor defaults to their own zone.
- **Summary tiles**: Present (= P + LT + HD + OD), Absent, Leave (= L + WO + H), Sick leave, Not marked.
- "✓ Mark all present" fills only unmarked staff.
- **Row**: name, EP, post · zone, "Marked by role at time", and 9 buttons. Tapping the same status again clears it.
- Legend line, then send box `att:<date>:<site>|<zone>`.
- **Text**:
  - `*DRS · STAFF ATTENDANCE*`, Date, Site · Zone, "On roll: n · Present: n".
  - Per status `*Status (n)*` with lines `- name (EP)`.
  - `*Not marked (n)*` list.
- **syncSupPresent**: when a Supervisor marks today, S.brief.present = on-duty count and S.brief.absent = "name (status)" list (fills the Supervisor's morning briefing).

### 15.4 Attendance analytics & export (mgr and dop: `attAnalytics` + dash `mgrStaff`)
- "👥 Staff today": tiles On roll, Present, Absent, Leave+WO+H, Sick leave, Not marked.
- "By site and zone" table: Site · Zone | On roll | P | A | L/WO/H | SL | Not marked.
- **"📊 Attendance export"**:
  - Range: Today | 7 days | This month | This year | Choose dates. Capped at 400 days. Shows "date – date · {n} days".
  - Person select: All (n) or one person. One person shows status-count tiles and a grid of the last 62 days (short codes; "·" = unmarked).
  - **Download Excel** `DRS-Attendance-<from>_to_<to>[-name].xlsx`, two sheets:
    - "Register": Name, EP no., Post, Site, Zone, one column per date (short code), "<Status> (days)" ×9, Not marked.
    - "Daily by site-zone": Date, Site, Zone, On roll, Present, Absent, Leave, Sick leave, Weekly off, Holiday, Half day, Late, On duty elsewhere, Not marked.
  - **Download CSV**: the Register sheet only, UTF-8 BOM, all values quoted.

## 16. DATA OPERATOR: MOVEMENTS & ANIMAL COUNT (L3695–3749)

### 16.1 Movement register (`#v-moves`)
- Intro: "Every birth, death, arrival, departure, cage and site change reported in DRS comes here. Verify each one so the count stays correct."
- **Auto movements** (`autoMoves`):
  - Supervisor events: Birth → Birth, Mortality → Mortality, New arrival → Arrival (in), Transfer out → Departure (out). Count = event count; site = zone.
  - Night finds Birth/Mortality (count 1).
  - Vet births (count n) and mortalities.
  - Incidents with out=Died → Mortality.
  - Completed shifts: To another site → Site change; Incoming from outside → Arrival (in); everything else → Cage change.
  - Ids are stable, e.g. `a-sup:<d>:<i>`.
- **Manual** (`kc-moves`):
  - Form "Add a movement": Type seg MV_TYPES [Birth, Mortality, Arrival (in) (default), Departure (out), Cage change, Site change, Count correction]; Species*; Number (default 1); Male/Female/Unknown counts; From (site / cage); To; Site; Date; "Reference / permit no."; Notes.
  - Manual entries count as verified, show source "Entered by Data Operator", and can be deleted.
- **Verification** `kc-move-verify` {id: "ok"|"dup"}: buttons "✓ Verify" / "Duplicate", then "Undo".
- **Filters**: To verify (red chip when > 0; default) | Verified | All.
- **Card**: "Type: species × n", date, site · cage · from → to · Source: Supervisor/Night keeper/Vet/Incident/Shifting · ♂♀? · ref, note. Colour by sign (in / out / move).
- **Send** `dop:<today>` (recipients restricted to Curator, Manager, Curator office). Text:
  - `*DRS · DATA OPERATOR DAILY REPORT*`, Date.
  - `*Animal movements today (n)*`: `- type: species × n (from → to) – Verified / To verify` (duplicates excluded).
  - `*Count changes*`: `- species (site): open → now`.
  - `*Staff today*`: "On roll · Present · Absent · Leave · Sick leave · Not marked".

### 16.2 Animal count (`#v-stock`, dop edits; mgr views)
- Intro: "Opening count plus verified births and arrivals, minus deaths and departures. Set the opening count once."
- Opening counts `kc-stock-open` = {"species|site": {sp, site, n}}. dop edits them inline and can "Add species".
- **Rows** grouped by species (lower-case) + site, using verified movements only: Opening, +Birth, +In, −Mortality, −Out, ±Correction, Now = open + b + i − d − o + c. Cage and site changes have sign 0.
- Tiles: Total animals (Σ now) and species count.
- **"Download Excel"** `DRS-Animal-count-<today>.xlsx`:
  - Sheet "Count": Species, Site, Opening, Births, Arrivals, Mortality, Departures, Corrections, Current.
  - Sheet "Movements": Date, Type, Species, Number, Male, Female, Unknown, From, To, Site, Cage, Reference, Source, Status (Verified / Duplicate / To verify), Notes.

## 17. MULTI-LANGUAGE (L3776–3842)
- **LANGS** (code, native, English, script):
  - en English; hi Hindi (both built in).
  - mr Marathi (Devanagari), gu Gujarati, rwr Marwari (Devanagari), ta Tamil, te Telugu, ml Malayalam, kn Kannada, bn Bengali, pa Punjabi (Gurmukhi), or Odia (Oriya), es Spanish, de German.
  - Fonts: the matching Noto Sans <script> family is loaded from Google Fonts (CSS var `--xf`).
- **Language sheet** "🌐 Language":
  - Help: "English and Hindi are built in. Other languages are translated by AI the first time you choose them, then saved on this phone."
  - Grid tags: Built in / ✓ Ready (>200 strings cached) / AI translated.
  - "Translate again" for the current language.
  - "Reports are sent in": English | Hindi (`kc-replang`).
  - The top button shows EN / Hindi / the first 2–3 letters of the language.
- **UI translation**:
  - `uiStrings()` collects every English string: I values, V keys, and strings in FORMS, DAY, SKILLS, CHECKS, BODY, DIETQ, WATERQ, SAFETY, MCATS, PLANTYPES, ETH_CATS, ROLE_LABEL, TAGS, IUCN, GROUPS and SOP books.
  - Strings are sent in chunks of 90, two in parallel, to the translator: `DRS_TRANSLATE`, or `claude.use("sample").json` (prompt rules: simple words; keep {placeholders}; keep abbreviations DRS, AFM, CSSD, ID, EP, pH, UVB, IUCN, CITES, BCS, SOP, VIP, AC, PDF and the attendance codes; keep emoji; keep species names if unsure; reply with JSON English → translation).
  - A translation is accepted only if it keeps all placeholders. Results cache in `kc-tr-<code>` (global) and are applied live.
  - Progress bar "Translating DRS into {l}… {p}%" with Stop.
  - On failure: "Translation is not available here. Using English", and fall back to en if nothing is cached.
- **Outgoing report translation** (`finishSend`):
  - The text is rebuilt in the target language (labels in en/hi).
  - `needsTr`:
    - Target en: the text contains Indic script (U+0900–0DFF), or the UI language is es/de.
    - Target hi: the text contains non-Devanagari Indic script, or the UI language is es/de/mr/rwr.
  - If translation is needed: show "Translating your report…", call `T.text` (`DRS_TRANSLATE_TEXT` or AI; keep layout, asterisks, names, ids, numbers), then the sheet "Check the {l} report before sending". The textarea is editable, "Show what I typed" reveals the original, and "Send" commits.
  - With no translator or on error, the original is sent and toasts "Sent without translation".
  - The stored SENT record keeps `text` (translated), `orig`, `lang`, `from`.

## 18. MAIN-APP HOOKS (L3844–3859)
Optional window functions:
- `DRS_SEND({key, to[], title, role, text, original, language, at})`: called after every send.
- `DRS_NOTIFY({type, title, body, toRoles[], ref})`. Types:
  - `afm_ticket`: new issue → [afm, mgr].
  - `ticket_update`: assigned → [agency]; done → [afm]; else → [afm, mgr, raiser].
  - `animal_alert` → [bio, cur, acur, vet, mgr].
  - `event_approved`, `cover_request`, `cover_approved`.
- `DRS_TRANSLATE(strings, lang)` → Promise<{en: tr}>; `DRS_TRANSLATE_TEXT(text, lang)` → Promise<string>.
- `DRS_STORAGE {get, set}`: replaces localStorage (the scoping wrapper sits on top).
- Entry: `?role=&name=&zone=&agency=&lock=1`, or a postMessage of type `drs-user`.

## 19. Cross-role hand-off summary
| From | Trigger | To | Mechanism |
|---|---|---|---|
|Sup / Night keeper / Vet / Incident|animal event|Bio, Cur, Acur, Vet, Mgr|animal alert + popup + notify|
|Sup, Bio, Cur, Acur, Mgr, Incident, Acur form|site work|AFM (+Mgr)|ticket + AFM popup|
|AFM|assign|Agency|job popup|
|Agency|work done|AFM|"to check" popup → close or send back|
|Bio|shift Planned|Curator|approve / reject on cdash|
|Cur, Bio, Acur|event|Manager|approve / reject → staff reminders|
|Any role|away request|Manager|approve → covering role gets "Open X work"|
|All sources|births, deaths, moves|Data Operator|verify → animal count|
|Sup|attendance today|Sup report|brief present / absent auto-fill|
|Any|Send report|chosen people/groups|SENT + DRS_SEND (+ translation)|
|Mgr|export|Cluster Head|mgrx send / file download|
