/* =====================================================================
   DRS ⇄ Cloudflare: the hooks the DRS app calls (see "MAIN-APP HOOKS" in app.js).
   - DRS_STORAGE  shared data. Synchronous reads from a local cache; writes queue and push to /api/kv.
                  A conflict (someone else changed the key) is merged three ways, as in the original demo adapter.
                  Pulls every few seconds; urgent keys (alerts, SOS, notices, tickets) pop up at once.
   - DRS_LOGIN    employee number + PIN.  DRS_PASSKEY_LOGIN / DRS_BIOMETRIC: face or fingerprint (passkeys).
   - DRS_MEDIA_UPLOAD  photos, video and voice to /api/media.   DRS_RESET_PIN  admin issues a one-time PIN.
   Device-only keys (who is signed in on this phone, language, view) never leave the phone.
   ===================================================================== */
(function () {
  "use strict";
  var LS = window.localStorage, MIRROR = "drs2-cache", SINCE = "drs2-since";
  var DEVICE = /^(kc-role|kc-lang|kc-replang|drs-user|drs-site|kc-export|kc-tr-|drs-ants-|drsdemo|drs-now-offset|drs-last-active|drs-sess-|drs-office-net|@_\/)/;
  var URGENT = /kc-(alerts|issues|notices|sos|verify|checkin)$/;
  var cache = {}; try { cache = JSON.parse(LS.getItem(MIRROR) || "{}"); } catch (e) {}
  var since = +(LS.getItem(SINCE) || 0);
  var lastRead = {}, queue = [], changed = false, inflight = null, online = navigator.onLine, authed = true;
  var signingIn = false;   /* sign-in sheets are open: no syncing (a sync could reload the page under them) */
  var mirror = function () { try { LS.setItem(MIRROR, JSON.stringify(cache)); LS.setItem(SINCE, String(since)); } catch (e) {} };
  var dev = { get: function (k) { try { return LS.getItem("u:" + k); } catch (e) { return null; } }, set: function (k, v) { try { LS.setItem("u:" + k, v); } catch (e) {} } };
  var me = function () { try { return JSON.parse(dev.get("drs-user") || "null"); } catch (e) { return null; } };
  /* someone else's personal keys (@u:<uid>/…) are not shared; mine are, so they follow me between phones */
  var isDevice = function (k) { if (DEVICE.test(k)) return true; var m = /^@u:([^/]+)\//.exec(k); return !!(m && m[1] !== me()); };

  function merge3(prev, mine, theirs) {
    var P, M, T; try { P = prev == null ? null : JSON.parse(prev); M = JSON.parse(mine); T = theirs == null ? null : JSON.parse(theirs); } catch (e) { return mine; }
    if (T == null) return mine;
    var isIdList = function (a) { return Array.isArray(a) && a.every(function (o) { return o && typeof o === "object" && "id" in o; }); };
    if (isIdList(M) && isIdList(T) && (P == null || isIdList(P))) {
      var byId = function (a) { var m = {}; (a || []).forEach(function (o) { m[o.id] = o; }); return m; };
      var p = byId(P), m = byId(M), out = T.slice(), idx = {}; out.forEach(function (o, i) { idx[o.id] = i; });
      Object.keys(m).forEach(function (id) { if (JSON.stringify(m[id]) !== JSON.stringify(p[id])) { if (id in idx) out[idx[id]] = m[id]; else out.unshift(m[id]); } });
      Object.keys(p).forEach(function (id) { if (!(id in m)) out = out.filter(function (o) { return String(o.id) !== String(id); }); });
      return JSON.stringify(out);
    }
    if (M && T && typeof M === "object" && typeof T === "object" && !Array.isArray(M) && !Array.isArray(T)) {
      var o = Object.assign({}, T), pp = (P && typeof P === "object" && !Array.isArray(P)) ? P : {};
      Object.keys(M).forEach(function (k) { if (JSON.stringify(M[k]) !== JSON.stringify(pp[k])) o[k] = M[k]; });
      Object.keys(pp).forEach(function (k) { if (!(k in M)) delete o[k]; });
      return JSON.stringify(o);
    }
    return mine;
  }

  window.DRS_STORAGE = {
    get: function (k) { if (isDevice(k)) return dev.get(k); var v = k in cache ? cache[k] : null; lastRead[k] = v; return v; },
    set: function (k, v) {
      if (isDevice(k)) { dev.set(k, v); return; }
      if (cache[k] === v) return;
      var pend = queue.filter(function (x) { return x.k === k; })[0];
      var prev = pend ? pend.prev : (k in lastRead ? lastRead[k] : null);
      queue = queue.filter(function (x) { return x.k !== k; });
      queue.push({ k: k, v: v, prev: prev });
      cache[k] = v; lastRead[k] = v; mirror(); saveQueue(); flush();
    }
  };
  /* writes made offline survive a reload */
  var QKEY = "drs2-queue";
  function saveQueue() { try { LS.setItem(QKEY, JSON.stringify(queue)); } catch (e) {} }
  try { queue = JSON.parse(LS.getItem(QKEY) || "[]"); } catch (e) { queue = []; }

  function api(path, opts) {
    opts = opts || {};
    return fetch("api/" + path, Object.assign({ credentials: "same-origin" }, opts, { headers: Object.assign({ "content-type": "application/json" }, opts.headers || {}) }));
  }
  function signedOut() {
    if (!me()) return;
    dev.set("drs-user", "null"); dev.set("kc-role", "null");
    try { sessionStorage.setItem("drs-signed-out", "1"); } catch (e) {}
    location.reload();
  }

  var busyFlush = false;
  function flush() {
    if (!me() || busyFlush || !queue.length || !authed || signingIn) return;
    busyFlush = true;
    var ui = queue.findIndex(function (x) { return URGENT.test(x.k); });
    var it = queue.splice(ui > 0 ? ui : 0, 1)[0]; inflight = it.k;
    var put = function (v, base) {
      return api("kv", { method: "POST", body: JSON.stringify({ k: it.k, v: v, prev: base }) }).then(function (r) {
        if (r.status === 401) { authed = false; signedOut(); throw { code: "auth" }; }
        if (r.status === 403) return r.json().then(function (j) { banner("noWrite", j.error); throw { code: "forbidden" }; });
        if (!r.ok) throw { code: "http" + r.status };
        return r.json().then(function (j) {
          if (j.conflict) { var merged = merge3(it.prev, v, j.cur); it.prev = j.cur; return put(merged, j.cur); }
          if (v !== it.v && !queue.some(function (x) { return x.k === it.k; })) { cache[it.k] = v; changed = true; soon(); } if (j.ts) since = Math.max(since, 0); mirror(); });
      });
    };
    put(it.v, it.prev).then(function () { banner(online ? "live" : "off"); })
      .catch(function (e) { if (!e || (e.code !== "forbidden" && e.code !== "auth")) { queue.unshift(it); banner("retry"); } })
      .then(function () { busyFlush = false; inflight = null; saveQueue(); setTimeout(flush, queue.length ? 60 : 0); });
  }

  /* ---------- pull: everything changed since the last pull that I may read ---------- */
  var first = true, pulling = false;
  function pull() {
    if (!me() || pulling || !authed || signingIn) return;
    pulling = true;
    api("kv?since=" + since).then(function (r) {
      if (r.status === 401) { authed = false; signedOut(); return null; }
      if (!r.ok) throw new Error("pull " + r.status);
      return r.json();
    }).then(function (j) {
      if (!j) return;
      var diff = false, urgent = [];
      j.items.forEach(function (x) {
        if (x.k === inflight || queue.some(function (q) { return q.k === x.k; })) return;
        if (cache[x.k] !== x.v) { cache[x.k] = x.v; diff = true; if (URGENT.test(x.k)) urgent.push(x.k); }
      });
      since = j.now; mirror(); online = true; banner("live");
      if (typeof j.office === "boolean") try { LS.setItem("drs-office-net", JSON.stringify(j.office)); } catch (e) {}
      if (j.user) applyUser(j.user);
      if (first) { first = false; if (diff && !sessionStorage.getItem("drs2-booted")) { sessionStorage.setItem("drs2-booted", "1"); location.reload(); return; } }
      if (urgent.length && typeof window.DRS_URGENT === "function") { try { window.DRS_URGENT(urgent); } catch (e) {} }
      if (diff) { changed = true; soon(); }
      flush();
    }).catch(function () { online = false; banner("off"); }).then(function () { pulling = false; });
  }
  /* account changes made by an admin reach this phone on the next pull */
  function applyUser(u) {
    if (u.signedOut) return signedOut();
  }

  function busy() { var a = document.activeElement, s = document.getElementById("repSheet"); return (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.type !== "checkbox" && a.type !== "radio") || (s && !s.hidden) || !!document.querySelector(".mview"); }
  var t = null;
  function soon() { clearTimeout(t); t = setTimeout(function () { if (!changed) return; if (busy() || queue.length) { soon(); return; } changed = false; if (!(window.DRS_REFRESH && window.DRS_REFRESH())) location.reload(); }, 800); }

  function banner(kind, extra) {
    var el = document.getElementById("demoBanner"); if (!el) return;
    var hi = (dev.get("kc-lang") || "\"en\"").indexOf("hi") >= 0;
    var M = {
      live: "",
      off: hi ? "📴 सिग्नल नहीं। काम इसी फ़ोन पर सेव है और सिग्नल आने पर भेजा जाएगा।" : "📴 No signal. Your work is saved on this phone and sends when you're back in range.",
      noWrite: extra || (hi ? "👁 आपके पास सिर्फ देखने की अनुमति है।" : "👁 You have read-only access."),
      retry: hi ? "⏳ भेजने की दोबारा कोशिश…" : "⏳ Trying to send again…"
    };
    el.textContent = M[kind] || ""; el.className = "demobanner " + kind; el.hidden = !M[kind];
  }

  /* ---------- sign-in ---------- */
  function startSession(j) {
    signingIn = true;
    try { LS.setItem("drs-office-net", JSON.stringify(j.office !== false)); } catch (e) {}
    dev.set("drs-user", JSON.stringify(j.uid)); dev.set("kc-role", JSON.stringify(j.role)); dev.set("drs-site", JSON.stringify(j.site));
    try { dev.set("drs-sess-" + j.uid, String(Date.now())); dev.set("drs-last-active", String(Date.now())); sessionStorage.removeItem("drs-signed-out"); sessionStorage.removeItem("drs2-booted"); } catch (e) {}
    /* a different person on this phone: start from a clean shared cache */
    if (LS.getItem("drs2-owner") !== j.uid) { cache = {}; since = 0; queue = []; mirror(); saveQueue(); LS.setItem("drs2-owner", j.uid); }
  }
  window.DRS_LOGIN = function (ep, pin) {
    return api("auth/login", { method: "POST", body: JSON.stringify({ ep: ep, pin: pin }) }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) { var m = document.getElementById("lgMsg"); if (m && j.error) setTimeout(function () { m.textContent = j.error; }, 0); return false; }
        startSession(j);
        if (j.mustChange) return changePinSheet(true).then(function () { return offerPasskey(j); });
        return offerPasskey(j);
      });
    });
  };

  /* ---------- passkeys: face or fingerprint ---------- */
  var PK = !!(window.PublicKeyCredential && navigator.credentials && window.isSecureContext);
  var b64u = {
    enc: function (buf) { var s = "", b = new Uint8Array(buf); for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); },
    dec: function (str) { str = str.replace(/-/g, "+").replace(/_/g, "/"); while (str.length % 4) str += "="; var s = atob(str), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b.buffer; }
  };
  function getAssertion(opts) {
    opts.challenge = b64u.dec(opts.challenge);
    (opts.allowCredentials || []).forEach(function (c) { c.id = b64u.dec(c.id); });
    return navigator.credentials.get({ publicKey: opts }).then(function (cred) {
      return { id: cred.id, rawId: b64u.enc(cred.rawId), type: cred.type, response: {
        clientDataJSON: b64u.enc(cred.response.clientDataJSON), authenticatorData: b64u.enc(cred.response.authenticatorData),
        signature: b64u.enc(cred.response.signature), userHandle: cred.response.userHandle ? b64u.enc(cred.response.userHandle) : null }, clientExtensionResults: {} };
    });
  }
  function passkeyAuth(forUser) {
    return api("auth/passkey/login-options", { method: "POST", body: JSON.stringify({ uid: forUser || null }) })
      .then(function (r) { if (!r.ok) throw new Error("No passkey set up yet"); return r.json(); })
      .then(function (j) { return getAssertion(j.options).then(function (a) { return api("auth/passkey/login-verify", { method: "POST", body: JSON.stringify({ id: j.id, response: a }) }); }); })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Not recognised"); return j; }); });
  }
  if (PK) {
    window.DRS_PASSKEY_LOGIN = function () { return passkeyAuth(null).then(function (j) { startSession(j); return true; }); };
    /* app lock: unlock with face or fingerprint, must be the signed-in person */
    window.DRS_BIOMETRIC = function () { return passkeyAuth(me()).then(function (j) { return j.uid === me(); }).catch(function () { return false; }); };
  }
  document.addEventListener("click", function (e) {
    if (e.target.id !== "lgBio" || !window.DRS_PASSKEY_LOGIN) return;
    var m = document.getElementById("lgMsg"); if (m) m.textContent = "…";
    window.DRS_PASSKEY_LOGIN().then(function () { location.reload(); }).catch(function (err) { if (m) m.textContent = err && err.name === "NotAllowedError" ? "Cancelled. Try again or use your PIN." : (err.message || "Not recognised. Use your PIN."); });
  });
  function registerPasskey() {
    return api("auth/passkey/register-options", { method: "POST", body: "{}" }).then(function (r) { if (!r.ok) throw new Error("Could not start"); return r.json(); }).then(function (o) {
      o.challenge = b64u.dec(o.challenge); o.user.id = b64u.dec(o.user.id);
      (o.excludeCredentials || []).forEach(function (c) { c.id = b64u.dec(c.id); });
      return navigator.credentials.create({ publicKey: o });
    }).then(function (cred) {
      var resp = { id: cred.id, rawId: b64u.enc(cred.rawId), type: cred.type, response: {
        clientDataJSON: b64u.enc(cred.response.clientDataJSON), attestationObject: b64u.enc(cred.response.attestationObject),
        transports: cred.response.getTransports ? cred.response.getTransports() : [] }, clientExtensionResults: {} };
      return api("auth/passkey/register-verify", { method: "POST", body: JSON.stringify({ response: resp, device: navigator.userAgent.slice(0, 120) }) });
    }).then(function (r) { if (!r.ok) throw new Error("Could not save"); return true; });
  }
  window.DRS_PASSKEY_REGISTER = PK ? registerPasskey : null;

  /* ---------- small sheets: change PIN, offer face / fingerprint ---------- */
  function sheet(html) {
    return new Promise(function (resolve) {
      var o = document.createElement("div"); o.className = "overlay"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true");
      o.style.zIndex = 9999; o.innerHTML = '<div class="sheet">' + html + "</div>"; document.body.appendChild(o);
      o.addEventListener("click", function (e) { var a = e.target.closest("[data-s]"); if (a) resolve({ act: a.dataset.s, el: o }); });
    });
  }
  function changePinSheet(forced) {
    var hi = (dev.get("kc-lang") || "\"en\"").indexOf("hi") >= 0;
    return sheet('<h2>' + (forced ? "Choose your own PIN" : "Change PIN") + '</h2><p>' + (forced ? "You signed in with a one-time PIN. Pick a new PIN of 4 to 8 digits that only you know." : "") +
      '</p><div class="field"><span>New PIN</span><input type="password" inputmode="numeric" maxlength="8" id="npA" autocomplete="new-password"></div>' +
      '<div class="field"><span>Repeat new PIN</span><input type="password" inputmode="numeric" maxlength="8" id="npB" autocomplete="new-password"></div>' +
      '<button class="btn" data-s="save">Save PIN</button><p class="counter" id="npMsg"></p>').then(function loop(res) {
      var a = res.el.querySelector("#npA").value, b = res.el.querySelector("#npB").value, msg = res.el.querySelector("#npMsg");
      if (!/^\d{4,8}$/.test(a)) { msg.textContent = "Use 4 to 8 digits."; return waitAgain(res.el).then(loop); }
      if (a !== b) { msg.textContent = "The two PINs don't match."; return waitAgain(res.el).then(loop); }
      if (/^(\d)\1+$/.test(a) || "0123456789".indexOf(a) >= 0) { msg.textContent = "Too easy to guess. Avoid repeated or running digits."; return waitAgain(res.el).then(loop); }
      msg.textContent = "Saving…";
      return api("auth/pin", { method: "POST", body: JSON.stringify({ pin: a }) }).then(function (r) {
        if (!r.ok) { msg.textContent = "Could not save. Check your signal and try again."; return waitAgain(res.el).then(loop); }
        res.el.remove();
      });
    });
  }
  function waitAgain(el) { return new Promise(function (resolve) { el.addEventListener("click", function h(e) { var a = e.target.closest("[data-s]"); if (a) { el.removeEventListener("click", h); resolve({ act: a.dataset.s, el: el }); } }); }); }
  function offerPasskey(j) {
    if (!PK || j.passkeys > 0) return Promise.resolve(true);
    return sheet('<h2>Sign in faster next time?</h2><p>Use your face or fingerprint instead of typing your PIN on this phone. Your fingerprint never leaves the phone.</p>' +
      '<button class="btn" data-s="yes">Use face or fingerprint</button><button class="btn ghost" data-s="no" style="margin-top:8px">Not now</button><p class="counter" id="pkMsg"></p>')
      .then(function (res) {
        if (res.act !== "yes") { res.el.remove(); return true; }
        res.el.querySelector("#pkMsg").textContent = "…";
        return registerPasskey().then(function () { res.el.remove(); return true; }).catch(function () { res.el.remove(); return true; });
      });
  }
  window.DRS_CHANGE_PIN = function () { return changePinSheet(false); };

  /* ---------- admin: one-time PIN for someone ---------- */
  window.DRS_RESET_PIN = function (uid) {
    return api("auth/reset", { method: "POST", body: JSON.stringify({ uid: uid }) }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Could not reset"); return { message: "One-time PIN: " + j.pin + " · give it to " + j.name + " in person. They choose their own PIN when they sign in." }; });
    });
  };

  /* ---------- media: photos, video, voice ---------- */
  window.DRS_MEDIA_UPLOAD = function (blob, meta) {
    var id = (meta && meta.id ? String(meta.id) : "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60);
    return fetch("api/media/" + id, { method: "PUT", credentials: "same-origin", headers: { "content-type": blob.type || "application/octet-stream", "x-site": (meta && meta.site) || "" }, body: blob })
      .then(function (r) { if (!r.ok) throw new Error("upload " + r.status); return "api/media/" + id; });
  };

  /* ---------- sign out on the server too ---------- */
  document.addEventListener("click", function (e) { if (e.target && e.target.id === "signOutBtn") { try { fetch("api/auth/logout", { method: "POST", credentials: "same-origin", keepalive: true }); } catch (x) {} LS.removeItem("drs2-owner"); } }, true);

  /* ---------- run ---------- */
  window.DRS_FLUSH = flush;
  if (me()) { pull(); flush(); }
  setInterval(function () { if (document.visibilityState === "visible") pull(); }, 4000);
  setInterval(function () { if (document.visibilityState !== "visible") pull(); }, 30000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") pull(); });
  window.addEventListener("online", function () { online = true; pull(); flush(); });
  window.addEventListener("offline", function () { online = false; banner("off"); });
})();
