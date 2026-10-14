/* =====================================================================
   ANTS sample organisation for DRS (connected mode).
   Same contract as the real ANTS adapter (see ORG.JS in app.js):
     clusters(), staff(), animals(site), history(id), schedules(site), record(kind, payload), agencies(), roleMap
   Size: 2 clusters · 10 sites · 59 staff · 20 species · about 500 animals.
   Curator, Assistant Curator, Biologist, Vet, Paravet and Facility Manager serve every site in their cluster:
   staff() lists them once per site they serve (same uid), with `sites` naming all of them.
   Runs in the browser (window.ANTS) and in node (tools/build-staff.mjs builds the server's staff list from it).
   ===================================================================== */
(function (root) {
  "use strict";
  function rng(seed) { let h = 1779033703 ^ seed.length; for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return function () { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const pad = (n, w) => String(n).padStart(w, "0");
  const today = (() => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1, 2) + "-" + pad(d.getDate(), 2); })();
  const addD = (k, n) => { const d = new Date(k + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  const ANTS_ROLE_MAP = {
    "Chief Executive Officer": "exec", "Chief Operating Officer": "exec", "Cluster Head": "ch",
    "Site Manager": "mgr", "Curator": "cur", "Assistant Curator": "acur", "Biologist": "bio",
    "Veterinarian": "vet", "Paravet": "pvet", "Assistant Facility Manager": "afm",
    "Head Animal Keeper": "sup", "Site Supervisor": "sup", "Animal Keeper": "keeper", "Night Keeper": "keeper",
    "DRS Super Admin": "sadmin", "DRS Site Admin": "siteadmin", "Maintenance Agency": "agency"
  };
  const CLUSTERS = [["V1", "North cluster", 5], ["V2", "South cluster", 5]];
  const SITE_NAMES = { V1S1: "Lakeside Zoo", V1S2: "Hill Wildlife Park", V1S3: "Riverbank Rescue Centre", V1S4: "Forest Safari", V1S5: "City Aviary",
    V2S1: "Coastal Zoo", V2S2: "Grassland Reserve", V2S3: "Valley Breeding Centre", V2S4: "Desert Wildlife Park", V2S5: "Island Reptile House" };
  /* people are named by a single given name: no surnames, caste or family names. One name per person, never repeated. */
  const GIVEN = ["Ravi", "Amit", "Sunita", "Pooja", "Kiran", "Meena", "Rahul", "Neha", "Vikram", "Asha", "Suresh", "Kavita", "Manoj", "Divya", "Arjun", "Lata", "Imran", "Farah", "Joseph", "Anita", "Deepak", "Rekha", "Sanjay", "Priya", "Harish", "Geeta", "Naveen", "Sapna", "Rakesh", "Uma", "Anil", "Bhavna", "Chetan", "Deepa", "Esha", "Faisal", "Gopal", "Hema", "Irfan", "Jaya", "Karthik", "Leela", "Mohan", "Nisha", "Omkar", "Padma", "Qasim", "Radha", "Salim", "Tanvi", "Uday", "Vani", "Waseem", "Yamini", "Zubin", "Aarti", "Bala", "Charu", "Dinesh", "Ganga", "Hari", "Indu", "Jatin", "Kamala"];
  const SPECIES = [["Bengal tiger", 1, 3], ["Asian elephant", 1, 4], ["Indian leopard", 1, 2], ["Asiatic lion", 2, 4], ["Blackbuck", 6, 14], ["Spotted deer", 8, 20], ["Nilgai", 3, 8], ["Sloth bear", 1, 3], ["Gharial", 3, 8], ["Mugger crocodile", 2, 6], ["Indian rhinoceros", 1, 2], ["Sarus crane", 2, 4], ["Indian star tortoise", 6, 20], ["Hoolock gibbon", 2, 4], ["Lion-tailed macaque", 4, 9], ["Red panda", 1, 3], ["Indian rock python", 1, 3], ["Striped hyena", 2, 4], ["Indian peafowl", 4, 10], ["Himalayan black bear", 1, 2]];
  const NAMES = ["Raja", "Rani", "Moti", "Shera", "Gauri", "Bholu", "Chinu", "Mira", "Tara", "Kali", "Sultan", "Leela", "Bijli", "Sheru", "Champa", "Badal", "Heera", "Juhi", "Kesar", "Laddu", "Munna", "Noor", "Pari", "Rocky", "Sona", "Toofan", "Veer", "Zara"];
  const BIG = ["Bengal tiger", "Asian elephant", "Indian leopard", "Asiatic lion", "Sloth bear", "Indian rhinoceros", "Red panda", "Himalayan black bear", "Hoolock gibbon", "Striped hyena"];
  const KG = { "Bengal tiger": 190, "Asian elephant": 3200, "Indian leopard": 55, "Asiatic lion": 160, "Blackbuck": 35, "Spotted deer": 70, "Nilgai": 220, "Sloth bear": 110, "Gharial": 140, "Mugger crocodile": 200, "Indian rhinoceros": 2100, "Sarus crane": 7, "Indian star tortoise": 1.5, "Hoolock gibbon": 7, "Lion-tailed macaque": 8, "Red panda": 5, "Indian rock python": 45, "Striped hyena": 35, "Indian peafowl": 4, "Himalayan black bear": 120 };
  const PER_SITE = 50;   /* animals per site, about 500 in all */

  let _clusters = null, _staff = null; const _animals = {};
  function clusters() {
    if (_clusters) return _clusters;
    _clusters = CLUSTERS.map(([cc, cname, n]) => ({ code: cc, name: cname, sites: Array.from({ length: n }, (_, si) => {
      const sc = cc + "S" + (si + 1), r = rng(sc), nz = 2 + Math.floor(r() * 2);
      return { code: sc, name: SITE_NAMES[sc] || "Site S" + (si + 1), cluster: cc, zones: Array.from({ length: nz }, (_, zi) => ({ code: "Z" + (zi + 1),
        enclosures: Array.from({ length: 3 + Math.floor(r() * 2) }, (_, ei) => "Z" + (zi + 1) + "-E" + pad(ei + 1, 2)) })) };
    }) }));
    return _clusters;
  }
  const allSites = () => clusters().flatMap(c => c.sites);

  function staff() {
    if (_staff) return _staff;
    const out = []; let ep = 1000;
    const person = (seed, antsRole, extra) => { ep++; const p = Object.assign({ uid: "EP" + ep, ep: "EP" + ep, name: GIVEN[ep - 1001] || "Staff " + ep, antsRole, role: ANTS_ROLE_MAP[antsRole], cluster: "", site: "", zone: "" }, extra); out.push(p); return p; };
    person("ceo", "Chief Executive Officer", { title: "CEO" });
    person("coo", "Chief Operating Officer", { title: "COO" });
    person("sa1", "DRS Super Admin");
    clusters().forEach(c => {
      const sites = c.sites.map(s => s.code);
      person("ch" + c.code, "Cluster Head", { cluster: c.code });
      person("sad" + c.code, "DRS Site Admin", { cluster: c.code });
      /* one person serves every site in the cluster: listed once per site, same uid */
      ["Curator", "Assistant Curator", "Biologist", "Veterinarian", "Paravet", "Assistant Facility Manager"].forEach(t => {
        const p = person(c.code + t, t, { cluster: c.code, site: sites[0], sites });
        sites.slice(1).forEach(s => out.push(Object.assign({}, p, { site: s })));
      });
      c.sites.forEach(s => {
        const b = { cluster: c.code, site: s.code };
        person(s.code + "Site Manager", "Site Manager", b);
        person(s.code + "hak", "Head Animal Keeper", Object.assign({ zone: "Z1" }, b));
        person(s.code + "k1", "Animal Keeper", Object.assign({ zone: s.zones[1] ? "Z2" : "Z1" }, b));
        person(s.code + "nk", "Night Keeper", Object.assign({ zone: "Z1" }, b));
      });
    });
    AGENCIES0.forEach(a => out.push({ uid: a.login, ep: a.login, name: a.name, antsRole: "Maintenance Agency", role: "agency", cluster: a.clusters[0], site: "", zone: "", agency: a.id }));
    _staff = out; return out;
  }
  const AGENCIES0 = [
    { id: "AG1", login: "AG-1021", name: "Shree Fabricators", trades: ["Fabrication", "Civil", "Mesh", "Painting", "Carpentry"], person: "Mahesh", phone: "", clusters: ["V1", "V2"] },
    { id: "AG2", login: "AG-1034", name: "Aqua Plumbing & Electrical", trades: ["Plumbing", "Electrical", "AC", "Equipment"], person: "Irfan", phone: "", clusters: ["V1", "V2"] }
  ];
  function animals(site) {
    if (_animals[site]) return _animals[site];
    const s = allSites().find(x => x.code === site); if (!s) return [];
    const r = rng("animals" + site), plan = [];
    s.zones.forEach(z => z.enclosures.forEach(enc => { const [sp, lo, hi] = pick(r, SPECIES); plan.push({ z: z.code, enc, sp, cnt: lo + Math.floor(r() * (hi - lo + 1)) }); }));
    const total = plan.reduce((n, x) => n + x.cnt, 0), f = PER_SITE / total;
    const out = []; let n = 0;
    plan.forEach(({ z, enc, sp, cnt }) => { const k = Math.max(1, Math.round(cnt * f)), big = BIG.includes(sp);
      for (let i = 0; i < k; i++) { n++;
        out.push({ id: site + "-A" + pad(n, 4), name: big ? pick(r, NAMES) : sp + " #" + (i + 1), species: sp, site, zone: z, enclosure: enc, sex: pick(r, ["Male", "Female", "Female", "Unknown"]), dob: addD(today, -Math.floor(365 * (1 + r() * 14))) }); } });
    _animals[site] = out; return out;
  }
  function history(id) {
    const site = id.split("-A")[0], a = animals(site).find(x => x.id === id); if (!a) return { weights: [], bcs: [], vacc: [], events: [] };
    const r = rng("hist" + id), base = KG[a.species] || 20, w = [], b = [], v = [], ev = [];
    let kg = base * (0.85 + r() * 0.3), sc = 3;
    for (let m = 11; m >= 0; m--) { kg = kg * (0.97 + r() * 0.06); w.push({ date: addD(today, -m * 30 - Math.floor(r() * 5)), kg: Math.round(kg * 10) / 10 });
      if (m % 3 === 0) { sc = Math.max(2, Math.min(4, sc + (r() < 0.25 ? -0.5 : r() < 0.5 ? 0.5 : 0))); b.push({ date: addD(today, -m * 30), score: sc }); } }
    v.push({ date: addD(today, -150 - Math.floor(r() * 60)), type: "Vaccination", by: "Vet" }, { date: addD(today, -80 - Math.floor(r() * 30)), type: "Deworming", by: "Paravet" });
    ev.push({ date: a.dob, text: "Born / acquired" }, { date: addD(today, -200 - Math.floor(r() * 100)), text: "Moved to enclosure " + a.enclosure });
    return { weights: w, bcs: b, vacc: v, events: ev };
  }
  function schedules(site) {
    const r = rng("sched" + site), out = [];
    animals(site).filter((a, i) => i % 3 === 0).forEach((a, i) => { const d = Math.floor(r() * 40) - 8;
      out.push({ id: "SCH-" + a.id + "-" + i, animalId: a.id, animal: a.name, species: a.species, enclosure: a.enclosure, type: r() < 0.5 ? "Vaccination" : "Deworming", due: addD(today, d) }); });
    return out;
  }
  let _ref = 0;
  function record(kind, payload) {
    /* sample ANTS: keeps a log of what DRS sent (real build: POST to ANTS) */
    let log = []; try { log = JSON.parse(localStorage.getItem("ants-demo-records") || "[]"); } catch (e) {}
    const ref = "ANTS-" + { birth: "B", death: "D", "vaccination-done": "V" }[kind] + "-" + new Date().getFullYear().toString().slice(2) + pad(log.length + 1 + (_ref++), 5);
    log.unshift({ ref, kind, payload, at: Date.now() }); try { localStorage.setItem("ants-demo-records", JSON.stringify(log.slice(0, 500))); } catch (e) {}
    return { ok: true, ref };
  }
  /* sites a person may work in: shared cluster staff get all their sites */
  function scopeSites(u) { return u && u.sites && u.sites.length ? u.sites.slice() : null; }

  root.ANTS = { demo: false, sample: true, connected: true, clusters, staff, animals, history, schedules, record, scopeSites, agencies: () => AGENCIES0, roleMap: ANTS_ROLE_MAP };
})(typeof window !== "undefined" ? window : globalThis);
