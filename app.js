/* Pick a Time: Doodle-style group scheduling poll. Frog Baby character art by Dr. Henry Yu. */
"use strict";

/* Firebase Realtime Database (same project as ClassLive). Data lives under pickatime/ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBQsu2DyivPHcBFpybIPZrD5DlL89yC_Ws",
  authDomain: "claive-de74a.firebaseapp.com",
  databaseURL: "https://claive-de74a-default-rtdb.firebaseio.com",
  projectId: "claive-de74a",
  storageBucket: "claive-de74a.firebasestorage.app",
  messagingSenderId: "298164687119",
  appId: "1:298164687119:web:01b074ab6951abdc29ee7a"
};
const ROOT = "pickatime/polls/";
const MAX_SLOTS = 40;
const COFFEE_URL = "https://buymeacoffee.com/henryyu";

/* ---------- storage helpers ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* ---------- backend: Firebase, or a same-browser demo ---------- */
const Backend = (() => {
  const live = typeof firebase !== "undefined" && FIREBASE_CONFIG.apiKey;
  if (live) {
    firebase.initializeApp(FIREBASE_CONFIG);
    const db = firebase.database();
    return {
      mode: "live",
      on(path, cb, err) { const r = db.ref(path); const h = s => cb(s.val()); r.on("value", h, e => err && err(e)); return () => r.off("value", h); },
      async get(p) { return (await db.ref(p).get()).val(); },
      set: (p, v) => db.ref(p).set(v),
      update: (p, v) => db.ref(p).update(v),
      remove: p => db.ref(p).remove()
    };
  }
  const KEY = "pat-demo-db"; const subs = new Set();
  const read = () => store.get(KEY, {});
  const walk = (obj, path) => path.split("/").filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const write = (path, val) => {
    const root = read(); const parts = path.split("/").filter(Boolean); let o = root;
    parts.slice(0, -1).forEach(k => { if (typeof o[k] !== "object" || o[k] === null) o[k] = {}; o = o[k]; });
    const last = parts[parts.length - 1];
    if (val === null || val === undefined) delete o[last]; else o[last] = JSON.parse(JSON.stringify(val));
    store.set(KEY, root); subs.forEach(s => s());
  };
  window.addEventListener("storage", e => { if (e.key === KEY) subs.forEach(s => s()); });
  return {
    mode: "demo",
    on(path, cb) { const f = () => cb(walk(read(), path) ?? null); subs.add(f); setTimeout(f, 0); return () => subs.delete(f); },
    async get(p) { return walk(read(), p) ?? null; },
    async set(p, v) { write(p, v); },
    async update(p, v) { for (const k in v) write(p + "/" + k, v[k]); },
    async remove(p) { write(p, null); }
  };
})();

/* ---------- i18n ---------- */
let lang = store.get("pat-lang", null) || (() => {
  const n = (navigator.language || "en").slice(0, 2).toLowerCase();
  return I18N[n] ? n : "en";
})();
function t(k, v) {
  let s = (I18N[lang] && I18N[lang][k]) ?? I18N.en[k] ?? k;
  if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]);
  return s;
}
const loc = () => (LANGS.find(l => l.code === lang) || LANGS[1]).locale;
const h12 = () => lang === "en";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- time helpers ---------- */
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
function tzOffsetMs(tz, utcMs) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utcMs));
  const p = {}; for (const x of parts) if (x.type !== "literal") p[x.type] = x.value;
  return Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second) - Math.floor(utcMs / 1000) * 1000;
}
function zonedToUtc(date, time, tz) {
  const [y, m, d] = date.split("-").map(Number); const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const o1 = tzOffsetMs(tz, guess); let ts = guess - o1;
  const o2 = tzOffsetMs(tz, ts); if (o2 !== o1) ts = guess - o2;
  return new Date(ts).toISOString();
}
function offsetLabel(tz) {
  const o = Math.round(tzOffsetMs(tz, Date.now()) / 60000); const a = Math.abs(o);
  return "GMT" + (o < 0 ? "-" : "+") + Math.floor(a / 60) + (a % 60 ? ":" + String(a % 60).padStart(2, "0") : "");
}
const fmtDate = (iso, tz) => new Intl.DateTimeFormat(loc(), { timeZone: tz, month: "short", day: "numeric", weekday: "short" }).format(new Date(iso));
const fmtTime = (iso, tz) => new Intl.DateTimeFormat(loc(), { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: h12() }).format(new Date(iso));
const fmtFull = (iso, tz) => new Intl.DateTimeFormat(loc(), { timeZone: tz, year: "numeric", month: "short", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit", hour12: h12() }).format(new Date(iso));
const dateKey = (iso, tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const addMin = (iso, m) => new Date(Date.parse(iso) + m * 60000).toISOString();
const todayKey = () => dateKey(new Date().toISOString(), LOCAL_TZ);
function durLabel(m) { return m % 60 === 0 ? t("hr", { n: m / 60 }) : (m > 60 ? t("hr", { n: Math.floor(m / 60) }) + " " + t("min", { n: m % 60 }) : t("min", { n: m })); }
function fmtHM(hm) { const [h, m] = hm.split(":").map(Number); return new Intl.DateTimeFormat(loc(), { hour: "numeric", minute: "2-digit", hour12: h12(), timeZone: "UTC" }).format(new Date(Date.UTC(2000, 0, 1, h, m))); }
let ZONES = []; try { ZONES = Intl.supportedValuesOf("timeZone"); } catch (e) {}
if (!ZONES.length) ZONES = ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Indiana/Indianapolis", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Asia/Seoul", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney"];
if (!ZONES.includes(LOCAL_TZ)) ZONES.unshift(LOCAL_TZ);
const tzOptions = sel => ZONES.map(z => `<option value="${esc(z)}"${z === sel ? " selected" : ""}>${esc(z.replace(/_/g, " "))} (${offsetLabel(z)})</option>`).join("");

/* ---------- ids and hashing ---------- */
function randId(n) { const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"; const b = new Uint32Array(n); crypto.getRandomValues(b); return Array.from(b, x => a[x % a.length]).join(""); }
async function sha(s) {
  if (crypto.subtle) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, "0")).join(""); }
  let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return "x" + h.toString(16);
}

/* ---------- Frog Baby art ---------- */
const FB = name => `img/${name}.webp`;
const frogImg = (name, cls = "", alt = "") => `<img src="${FB(name)}" class="fb ${cls}" alt="${esc(alt)}" loading="lazy" width="360" height="320">`;

const ICON = {
  y: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  m: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 9c1.5-2 3-2 5 0s3.5 2 5 0" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>',
  n: '<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>',
  u: ""
};

/* ---------- state ---------- */
const S = {
  route: null, unsub: null, poll: null, pollLoaded: false, pollPid: null,
  isAdmin: false, adminKey: null, viewTz: LOCAL_TZ,
  draft: null, dirty: false, busy: false, confirmDel: false, form: null, codeErr: "", dbError: false
};
const app = document.getElementById("app");

function parseRoute() {
  const h = (location.hash || "").replace(/^#\/?/, "");
  if (h === "new") return { name: "new" };
  let m = h.match(/^p\/([A-Za-z0-9]{4,32})$/); if (m) return { name: "poll", pid: m[1] };
  m = h.match(/^a\/([A-Za-z0-9]{4,32})\/([A-Za-z0-9]{8,64})$/); if (m) return { name: "admin", pid: m[1], key: m[2] };
  return { name: "home" };
}
const baseUrl = () => location.origin + location.pathname;
const pollUrl = pid => baseUrl() + "#/p/" + pid;
const adminUrl = (pid, key) => baseUrl() + "#/a/" + pid + "/" + key;

function remember(pid, role, title) {
  const mine = store.get("pat-mine", {});
  const prev = mine[pid] || {};
  mine[pid] = { role: prev.role === "org" ? "org" : role, title: title || prev.title || "", at: prev.at || Date.now() };
  store.set("pat-mine", mine);
}
function forget(pid) { const mine = store.get("pat-mine", {}); delete mine[pid]; store.set("pat-mine", mine); store.del("pat-admin-" + pid); store.del("pat-resp-" + pid); }

let toastTimer;
function toast(msg, art) {
  const el = document.getElementById("toast");
  el.innerHTML = (art ? frogImg(art, "toast-fb") : "") + `<span>${esc(msg)}</span>`;
  el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 2800);
}
async function copyText(text, input) {
  try { await navigator.clipboard.writeText(text); toast(t("copied"), "clap"); }
  catch (e) { if (input) { input.focus(); input.select(); } }
}

/* ---------- chrome: language select, footer ---------- */
function renderChrome() {
  document.documentElement.lang = lang;
  const sel = document.getElementById("langSel");
  sel.innerHTML = LANGS.map(l => `<option value="${l.code}"${l.code === lang ? " selected" : ""}>${esc(l.name)}</option>`).join("");
  document.getElementById("footTxt").textContent = t("footer");
  const c = document.getElementById("coffee"); c.href = COFFEE_URL; c.querySelector("span").textContent = t("coffee");
  document.getElementById("demoBar").hidden = Backend.mode !== "demo";
  document.getElementById("demoBar").textContent = t("demoNote");
  document.getElementById("dbBar").hidden = !S.dbError;
  document.getElementById("dbBar").textContent = t("dbErr");
}

/* ---------- router ---------- */
async function go() {
  const r = parseRoute();
  if (r.name === "admin") {
    const h = await sha(r.key); store.set("pat-admin-" + r.pid, r.key);
    remember(r.pid, "org");
    history.replaceState(null, "", "#/p/" + r.pid);
    S._adminHashHint = h;
    return go();
  }
  const prevPid = S.route && S.route.pid;
  S.route = r; S.confirmDel = false; S.codeErr = r.name === "home" ? S.codeErr : "";
  if (r.name !== "poll" || r.pid !== prevPid) {
    if (S.unsub) { S.unsub(); S.unsub = null; }
    S.poll = null; S.pollLoaded = false; S.draft = null; S.dirty = false; S.isAdmin = false;
  }
  if (r.name === "poll" && !S.unsub) subscribePoll(r.pid);
  window.scrollTo(0, 0);
  render();
}
function subscribePoll(pid) {
  S.pollPid = pid; S.adminKey = store.get("pat-admin-" + pid, null);
  const timer = setTimeout(() => { if (!S.pollLoaded) { S.dbError = true; render(); } }, 9000);
  S.unsub = Backend.on(ROOT + pid, async val => {
    clearTimeout(timer); S.dbError = false;
    S.poll = val; S.pollLoaded = true;
    if (val && val.meta && S.adminKey) S.isAdmin = (await sha(S.adminKey)) === val.meta.adminHash;
    if (val && val.meta && (S.isAdmin || store.get("pat-resp-" + pid, null))) remember(pid, S.isAdmin ? "org" : "voter", val.meta.title);
    render();
  }, () => { clearTimeout(timer); S.dbError = true; S.pollLoaded = true; render(); });
}

function render() {
  renderChrome();
  const r = S.route || { name: "home" };
  if (r.name === "new") return renderCreate();
  if (r.name === "poll") return renderPoll(r.pid);
  renderHome();
}

/* ---------- home ---------- */
function statusOf(m) { if (m.status === "closed") return m.final ? "closed" : "ended"; if (m.deadline && Date.now() > Date.parse(m.deadline)) return "expired"; return "open"; }
const pillCls = st => st === "ended" ? "closed" : st;

function renderHome() {
  const mine = Object.entries(store.get("pat-mine", {})).sort((a, b) => b[1].at - a[1].at);
  app.innerHTML = `
  <section class="hero">
    <div class="hero-txt">
      <p class="eyebrow">${esc(t("heroEyebrow"))}</p>
      <h1>${esc(t("heroTitle"))}</h1>
      <p class="lede">${esc(t("heroLede"))}</p>
      <div class="row" style="margin-top:20px">
        <a class="btn primary big" href="#/new">${esc(t("newPoll"))}</a>
      </div>
      <form id="codeForm" class="row code-form">
        <label for="codeIn">${esc(t("openCode"))}</label>
        <input type="text" id="codeIn" placeholder="${esc(t("codePh"))}" autocomplete="off">
        <button class="btn" type="submit">${esc(t("open"))}</button>
      </form>
      ${S.codeErr ? `<p class="err">${esc(S.codeErr)}</p>` : ""}
    </div>
    <div class="hero-art">${frogImg("hold", "hero-fb", "Frog Baby")}</div>
  </section>
  <section class="steps">
    <div class="step">${frogImg("draw", "step-fb")}<div><b>1. ${esc(t("s1"))}</b><span>${esc(t("s1d"))}</span></div></div>
    <div class="step">${frogImg("point", "step-fb")}<div><b>2. ${esc(t("s2"))}</b><span>${esc(t("s2d"))}</span></div></div>
    <div class="step">${frogImg("cheer", "step-fb")}<div><b>3. ${esc(t("s3"))}</b><span>${esc(t("s3d"))}</span></div></div>
  </section>
  <section class="card stack">
    <div><h2>${esc(t("myPolls"))}</h2><p class="note">${esc(t("myPollsHint"))}</p></div>
    <div class="list" id="myList">${mine.length ? mine.map(([pid, m]) => `
      <a class="item" href="#/p/${esc(pid)}" data-pid="${esc(pid)}">
        <div><div class="t">${esc(m.title || pid)}</div><div class="m" data-meta>${esc(m.role === "org" ? t("roleOrg") : t("roleVoter"))}</div></div>
        <span class="pill" data-pill></span>
      </a>`).join("") : `<div class="empty">${frogImg("sleep", "empty-fb")}<p>${esc(t("none"))}</p></div>`}</div>
  </section>`;
  document.getElementById("codeForm").addEventListener("submit", async e => {
    e.preventDefault();
    const v = document.getElementById("codeIn").value.trim();
    const m = v.match(/#\/[pa]\/([A-Za-z0-9]{4,32})/) || v.match(/^([A-Za-z0-9]{4,32})$/);
    let ok = false;
    if (m) { try { ok = !!(await Backend.get(ROOT + m[1] + "/meta")); } catch (err) { S.dbError = true; } }
    if (!ok) { S.codeErr = t("notFoundCode"); render(); return; }
    S.codeErr = ""; location.hash = "#/p/" + m[1];
  });
  // fill live status for each remembered poll
  mine.slice(0, 30).forEach(async ([pid, info]) => {
    try {
      const meta = await Backend.get(ROOT + pid + "/meta");
      const el = app.querySelector(`[data-pid="${pid}"]`); if (!el) return;
      if (!meta) { forget(pid); el.remove(); return; }
      const resp = await Backend.get(ROOT + pid + "/responses");
      const n = resp ? Object.keys(resp).length : 0; const st = statusOf(meta);
      el.querySelector(".t").textContent = meta.title;
      el.querySelector("[data-meta]").textContent = `${info.role === "org" ? t("roleOrg") : t("roleVoter")} · ${t("slotsN", { n: (meta.slots || []).length })} · ${t("responses", { n })}`;
      const p = el.querySelector("[data-pill]"); p.className = "pill " + pillCls(st); p.textContent = t("st_" + st);
    } catch (e) {}
  });
}

/* ---------- create ---------- */
function newForm() {
  return { title: "", organizer: store.get("pat-name", ""), location: "", description: "", duration: 60, tz: LOCAL_TZ, allowMaybe: true, deadline: "",
    month: todayKey().slice(0, 7), defaults: ["10:00", "14:00"], dates: {}, err: "" };
}
function renderCreate() {
  if (!S.form) S.form = newForm();
  const f = S.form;
  app.innerHTML = `
  <div class="row" style="margin-bottom:10px"><a class="btn small ghost" href="#/">${esc(t("back"))}</a></div>
  <div class="page-head">${frogImg("magnify", "head-fb")}<h1>${esc(t("createTitle"))}</h1></div>
  <form id="cf" class="stack" novalidate>
    <div class="card stack">
      <h2>${esc(t("secWhat"))}</h2>
      <label class="f" for="f-title">${esc(t("fTitle"))}<input type="text" id="f-title" maxlength="120" placeholder="${esc(t("fTitlePh"))}" value="${esc(f.title)}"></label>
      <div class="grid2">
        <label class="f" for="f-org">${esc(t("fOrg"))}<input type="text" id="f-org" maxlength="60" placeholder="${esc(t("fOrgPh"))}" value="${esc(f.organizer)}"></label>
        <label class="f" for="f-loc">${esc(t("fLoc"))}<input type="text" id="f-loc" maxlength="300" placeholder="${esc(t("fLocPh"))}" value="${esc(f.location)}"></label>
      </div>
      <label class="f" for="f-desc">${esc(t("fDesc"))}<textarea id="f-desc" maxlength="1500">${esc(f.description)}</textarea></label>
      <div class="grid2">
        <label class="f" for="f-dur">${esc(t("fDur"))}<select id="f-dur">${[15, 30, 45, 60, 90, 120, 180].map(m => `<option value="${m}"${m === f.duration ? " selected" : ""}>${esc(durLabel(m))}</option>`).join("")}</select></label>
        <label class="f" for="f-tz">${esc(t("fTz"))}<select id="f-tz">${tzOptions(f.tz)}</select></label>
      </div>
      <p class="note" style="margin:0">${esc(t("fTzHint"))}</p>
    </div>
    <div class="card stack">
      <div class="row" style="justify-content:space-between"><h2>${esc(t("secSlots"))}</h2><span class="pill open" id="slotCount"></span></div>
      <div class="slot-layout">
        <div class="cal" id="cal"></div>
        <div class="stack">
          <div><div class="note" style="margin-bottom:6px">${esc(t("defTimes"))}</div><div class="chips" id="defChips"></div></div>
          <div id="dateRows"></div>
        </div>
      </div>
    </div>
    <div class="card stack">
      <h2>${esc(t("secSet"))}</h2>
      <label class="check" for="f-maybe"><input type="checkbox" id="f-maybe"${f.allowMaybe ? " checked" : ""}> ${esc(t("fMaybe"))}</label>
      <label class="f" for="f-dl" style="max-width:320px">${esc(t("fDeadline"))}<input type="datetime-local" id="f-dl" value="${esc(f.deadline)}"></label>
    </div>
    <p class="err" id="cerr" role="alert">${esc(f.err)}</p>
    <div class="row"><button class="btn primary big" type="submit" id="csub"${S.busy ? " disabled" : ""}>${esc(S.busy ? t("saving") : t("submit"))}</button></div>
  </form>`;
  const bind = (id, key, ev, fn) => document.getElementById(id).addEventListener(ev, e => { f[key] = fn ? fn(e.target) : e.target.value; });
  bind("f-title", "title", "input"); bind("f-org", "organizer", "input"); bind("f-loc", "location", "input");
  bind("f-desc", "description", "input"); bind("f-dl", "deadline", "input");
  bind("f-dur", "duration", "change", el => +el.value); bind("f-maybe", "allowMaybe", "change", el => el.checked); bind("f-tz", "tz", "change");
  document.getElementById("cf").addEventListener("submit", e => { e.preventDefault(); createPoll(); });
  renderSlots();
}
const slotTotal = () => Object.values(S.form.dates).reduce((a, arr) => a + arr.length, 0);
const sortTimes = arr => Array.from(new Set(arr)).sort();
function renderSlots() {
  const f = S.form; const [y, m] = f.month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)); const startDow = first.getUTCDay(); const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dowFmt = new Intl.DateTimeFormat(loc(), { weekday: "narrow", timeZone: "UTC" });
  const dows = [0, 1, 2, 3, 4, 5, 6].map(i => dowFmt.format(new Date(Date.UTC(2023, 0, 1 + i))));
  const tk = todayKey();
  let cells = dows.map((d, i) => `<div class="dow${i === 0 ? " sun" : ""}">${esc(d)}</div>`).join("");
  for (let i = 0; i < startDow; i++) cells += "<div></div>";
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const on = !!f.dates[k]; const past = k < tk;
    cells += `<button type="button" data-d="${k}" class="${on ? "on" : ""}${k === tk ? " today" : ""}"${past ? " disabled" : ""} aria-pressed="${on}" aria-label="${k}">${d}</button>`;
  }
  const monthLabel = new Intl.DateTimeFormat(loc(), { year: "numeric", month: "long", timeZone: "UTC" }).format(first);
  const cal = document.getElementById("cal");
  cal.innerHTML = `<div class="cal-head"><button type="button" class="btn small ghost" id="mPrev" aria-label="previous month">‹</button><h3>${esc(monthLabel)}</h3><button type="button" class="btn small ghost" id="mNext" aria-label="next month">›</button></div><div class="cal-grid">${cells}</div>`;
  cal.querySelector("#mPrev").onclick = () => { f.month = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7); renderSlots(); };
  cal.querySelector("#mNext").onclick = () => { f.month = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7); renderSlots(); };
  cal.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { const k = b.dataset.d; if (f.dates[k]) delete f.dates[k]; else f.dates[k] = sortTimes(f.defaults); renderSlots(); });

  const chip = (time, attr) => `<span class="chip">${esc(fmtHM(time))}<button type="button" ${attr} aria-label="remove">×</button></span>`;
  const addBox = (attr) => `<span class="addtime"><input type="time" ${attr}-in step="900" aria-label="time"><button type="button" class="btn small" ${attr}-add>${esc(t("add"))}</button></span>`;
  const dc = document.getElementById("defChips");
  dc.innerHTML = f.defaults.map(x => chip(x, `data-defrm="${x}"`)).join("") + addBox("data-def");
  dc.querySelectorAll("[data-defrm]").forEach(b => b.onclick = () => { f.defaults = f.defaults.filter(x => x !== b.dataset.defrm); renderSlots(); });
  dc.querySelector("[data-def-add]").onclick = () => { const v = dc.querySelector("[data-def-in]").value; if (v) { f.defaults = sortTimes([...f.defaults, v]); renderSlots(); } };

  const keys = Object.keys(f.dates).sort(); const dr = document.getElementById("dateRows");
  dr.innerHTML = keys.length ? keys.map(k => `
    <div class="daterow">
      <div class="d">${esc(fmtDate(k + "T12:00:00Z", "UTC"))}</div>
      <div class="chips">${f.dates[k].map(x => chip(x, `data-rm="${k}|${x}"`)).join("")}${addBox(`data-k="${k}" data-row`)}</div>
      <button type="button" class="btn small ghost" data-rmd="${k}" aria-label="${esc(t("removeDate"))}">×</button>
    </div>`).join("") : `<div class="empty small">${frogImg("ladybug", "empty-fb")}<p>${esc(t("pickDates"))}</p></div>`;
  dr.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { const [k, x] = b.dataset.rm.split("|"); f.dates[k] = f.dates[k].filter(v => v !== x); if (!f.dates[k].length) delete f.dates[k]; renderSlots(); });
  dr.querySelectorAll("[data-rmd]").forEach(b => b.onclick = () => { delete f.dates[b.dataset.rmd]; renderSlots(); });
  dr.querySelectorAll("[data-row-add]").forEach(b => b.onclick = () => { const inp = b.parentElement.querySelector("[data-row-in]"); const k = inp.getAttribute("data-k"); if (inp.value) { f.dates[k] = sortTimes([...f.dates[k], inp.value]); renderSlots(); } });
  document.getElementById("slotCount").textContent = t("slotsN", { n: slotTotal() });
}

async function createPoll() {
  const f = S.form; const errEl = document.getElementById("cerr");
  const fail = msg => { f.err = msg; errEl.textContent = msg; };
  const title = f.title.trim(), organizer = f.organizer.trim();
  if (!title) return fail(t("vTitle"));
  if (!organizer) return fail(t("vOrg"));
  const n = slotTotal();
  if (!n) return fail(t("vSlots"));
  if (n > MAX_SLOTS) return fail(t("vMax", { n: MAX_SLOTS }));
  const starts = []; Object.keys(f.dates).sort().forEach(k => f.dates[k].forEach(x => starts.push(zonedToUtc(k, x, f.tz)))); starts.sort();
  const pid = randId(10), key = randId(20);
  const meta = {
    title, organizer, location: f.location.trim(), description: f.description.trim(), duration: f.duration, tz: f.tz, allowMaybe: !!f.allowMaybe,
    deadline: f.deadline ? zonedToUtc(f.deadline.slice(0, 10), f.deadline.slice(11, 16), f.tz) : null,
    slots: starts.map((s, i) => ({ id: "s" + (i + 1), start: s })), status: "open", final: null,
    createdAt: new Date().toISOString(), adminHash: await sha(key)
  };
  S.busy = true; const btn = document.getElementById("csub"); btn.disabled = true; btn.textContent = t("saving");
  try {
    await withTimeout(Backend.set(ROOT + pid + "/meta", meta), 10000);
    store.set("pat-admin-" + pid, key); store.set("pat-name", organizer); remember(pid, "org", title);
    S.form = null; S.busy = false; S.justCreated = pid; location.hash = "#/p/" + pid;
  } catch (e) { S.busy = false; btn.disabled = false; btn.textContent = t("submit"); fail(t("writeFail")); S.dbError = true; renderChrome(); }
}
function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]); }

/* ---------- poll view ---------- */
function renderPoll(pid) {
  if (!S.pollLoaded) { app.innerHTML = `<div class="empty big">${frogImg("read", "empty-fb")}<p>${esc(t("loading"))}</p></div>`; return; }
  const p = S.poll && S.poll.meta;
  if (!p) { app.innerHTML = `<div class="row" style="margin-bottom:10px"><a class="btn small ghost" href="#/">${esc(t("back"))}</a></div><div class="card empty big">${frogImg("shocked", "empty-fb")}<p>${esc(t("notFound"))}</p></div>`; return; }
  const st = statusOf(p); const isAdmin = S.isAdmin; const tz = S.viewTz;
  const slots = (p.slots || []).slice().sort((a, b) => a.start.localeCompare(b.start));
  const respMap = (S.poll && S.poll.responses) || {};
  const resp = Object.entries(respMap).map(([rid, r]) => ({ rid, ...r, answers: r.answers || {} })).sort((a, b) => (a.updatedAt || "").localeCompare(b.updatedAt || ""));
  const myRef = store.get("pat-resp-" + pid, null);
  const mine = myRef && respMap[myRef.rid] ? resp.find(r => r.rid === myRef.rid) : null;
  if (!S.draft || !S.dirty) S.draft = { name: mine ? mine.name : (S.draft && S.draft.name) || store.get("pat-name", ""), answers: mine ? { ...mine.answers } : {} };
  const canAnswer = st === "open";
  const others = resp.filter(r => !mine || r.rid !== mine.rid);

  const tally = {}; slots.forEach(s => tally[s.id] = { y: 0, m: 0, yesBy: [] });
  resp.forEach(r => slots.forEach(s => { const v = r.answers[s.id]; if (v === "y") { tally[s.id].y++; tally[s.id].yesBy.push(r.name); } else if (v === "m") tally[s.id].m++; }));
  const score = id => tally[id].y * 2 + tally[id].m;
  const bestScore = Math.max(0, ...slots.map(s => score(s.id)));
  const isBest = id => bestScore > 0 && score(id) === bestScore;
  const groups = []; slots.forEach(s => { const k = dateKey(s.start, tz); const g = groups[groups.length - 1]; if (g && g.k === k) g.n++; else groups.push({ k, n: 1, iso: s.start }); });

  const label = v => v ? t({ y: "yes", m: "maybe", n: "no" }[v]) : t("unset");
  const cellBtn = (s, v) => `<button type="button" class="cell v-${v || "u"}" data-slot="${s.id}" aria-label="${esc(fmtFull(s.start, tz))}: ${esc(label(v))}">${ICON[v || "u"]}</button>`;
  const cellStatic = v => `<span class="cell v-${v || "u"}" title="${esc(label(v))}">${ICON[v || "u"]}</span>`;

  let rows = "";
  if (canAnswer) {
    rows += `<tr class="mine"><th class="who"><label class="sr" for="myName">${esc(t("yourName"))}</label><input type="text" id="myName" maxlength="40" placeholder="${esc(t("namePh"))}" value="${esc(S.draft.name)}"></th>${slots.map(s => `<td>${cellBtn(s, S.draft.answers[s.id])}</td>`).join("")}</tr>`;
  } else if (mine) {
    rows += `<tr class="mine"><th class="who">${esc(mine.name)} <span class="muted">(${esc(t("you"))})</span></th>${slots.map(s => `<td>${cellStatic(mine.answers[s.id])}</td>`).join("")}</tr>`;
  }
  rows += others.map(r => `<tr><th class="who"><span>${esc(r.name)}</span>${isAdmin ? `<button type="button" class="x" data-rmresp="${esc(r.rid)}" aria-label="${esc(t("removeResp", { name: r.name }))}" title="${esc(t("removeResp", { name: r.name }))}">×</button>` : ""}</th>${slots.map(s => `<td>${cellStatic(r.answers[s.id])}</td>`).join("")}</tr>`).join("");
  rows += `<tr class="tally"><th class="who">${esc(t("tally"))}</th>${slots.map(s => `<td class="${isBest(s.id) ? "best" : ""}">${tally[s.id].y}${p.allowMaybe && tally[s.id].m ? `<small>+${tally[s.id].m}</small>` : ""}</td>`).join("")}</tr>`;

  const ranked = slots.slice().sort((a, b) => score(b.id) - score(a.id) || a.start.localeCompare(b.start)).filter(s => score(s.id) > 0).slice(0, 5);
  const N = resp.length || 1;
  const finalSlot = p.final ? slots.find(s => s.id === p.final) : null;
  const link = pollUrl(pid);
  const aLink = isAdmin && S.adminKey ? adminUrl(pid, S.adminKey) : "";

  app.innerHTML = `
  <div class="row" style="margin-bottom:10px"><a class="btn small ghost" href="#/">${esc(t("back"))}</a></div>
  <section class="stack">
    <div class="poll-head">
      <div>
        <div class="row"><h1>${esc(p.title)}</h1><span class="pill ${pillCls(st)}">${esc(t("st_" + st))}</span></div>
        <div class="meta">
          <span>${esc(t("organizer", { name: p.organizer || "" }))}</span>
          <span>${esc(durLabel(p.duration || 60))}</span>
          ${p.location ? `<span class="loc">${esc(p.location)}</span>` : ""}
          <span>${esc(t("baseTz", { tz: p.tz.replace(/_/g, " ") + " (" + offsetLabel(p.tz) + ")" }))}</span>
          ${p.deadline ? `<span>${esc(t("deadline", { when: fmtFull(p.deadline, tz) }))}</span>` : ""}
        </div>
        ${p.description ? `<p class="lede" style="white-space:pre-wrap">${esc(p.description)}</p>` : ""}
      </div>
      ${frogImg(finalSlot ? "hearts" : st === "open" ? "wave" : "pray", "poll-fb")}
    </div>

    ${finalSlot ? `
    <div class="card final">
      ${frogImg("gift", "final-fb")}
      <div class="stack" style="gap:6px">
        <div class="eyebrow">${esc(t("finalEyebrow"))}</div>
        <div class="when">${esc(fmtFull(finalSlot.start, tz))} ~ ${esc(fmtTime(addMin(finalSlot.start, p.duration || 60), tz))}</div>
        <div class="note">${esc(t("finalBase", { when: fmtFull(finalSlot.start, p.tz) + " (" + p.tz.replace(/_/g, " ") + ")" }))}</div>
        <div class="row"><a class="btn primary" href="${esc(gcalUrl(p, finalSlot))}" target="_blank" rel="noopener">${esc(t("gcal"))}</a><button class="btn" type="button" id="icsBtn">${esc(t("ics"))}</button></div>
      </div>
    </div>` : ""}

    <div class="card share">
      <h3>${esc(t("shareTitle"))}</h3>
      <div class="line"><input type="text" id="shareLink" readonly value="${esc(link)}" aria-label="${esc(t("shareLink"))}"><button class="btn small primary" type="button" id="cpLink">${esc(t("copy"))}</button></div>
      <p class="note" style="margin:0">${esc(t("shareHint"))}</p>
      ${aLink ? `<details class="admin-link"${S.justCreated === pid ? " open" : ""}><summary>${esc(t("adminTitle"))}</summary>
        <div class="line"><input type="text" id="adminLink" readonly value="${esc(aLink)}" aria-label="${esc(t("adminTitle"))}"><button class="btn small" type="button" id="cpAdmin">${esc(t("copy"))}</button></div>
        <p class="note" style="margin:0">${esc(t("adminHint"))}</p></details>` : ""}
    </div>

    <div class="card stack">
      <div class="row" style="justify-content:space-between;align-items:flex-end">
        <div><h2>${esc(t("respond"))}</h2><div class="note">${esc(t("participants", { n: resp.length }))}</div></div>
        <label class="f tzpick" for="viewTz">${esc(t("showIn"))}<select id="viewTz">${tzOptions(tz)}</select></label>
      </div>
      ${st === "expired" ? `<div class="banner">${frogImg("grumpy", "banner-fb")}<span>${esc(t("expiredNote"))}</span></div>` : ""}
      ${st === "closed" || st === "ended" ? `<div class="banner">${frogImg("pray", "banner-fb")}<span>${esc(t("closedNote"))}</span></div>` : ""}
      <div class="legend">
        <span>${cellStatic("y")} ${esc(t("yes"))}</span>
        ${p.allowMaybe ? `<span>${cellStatic("m")} ${esc(t("maybe"))}</span>` : ""}
        <span>${cellStatic("n")} ${esc(t("no"))}</span>
        ${canAnswer ? `<span class="hint">${esc(p.allowMaybe ? t("hintCycle") : t("hintCycle2"))}</span>` : ""}
      </div>
      <div class="grid-wrap">
        <table class="grid">
          <thead>
            <tr><th class="who" rowspan="2">${esc(t("participants", { n: resp.length }))}</th>${groups.map(g => `<th class="dhead" colspan="${g.n}">${esc(fmtDate(g.iso, tz))}</th>`).join("")}</tr>
            <tr>${slots.map(s => `<th class="thead${isBest(s.id) ? " best" : ""}">${esc(fmtTime(s.start, tz))}</th>`).join("")}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${canAnswer ? `<div class="row">
        <button class="btn" type="button" id="allYes">${esc(t("allYes"))}</button>
        <button class="btn primary" type="button" id="saveBtn"${S.busy ? " disabled" : ""}>${esc(S.busy ? t("saving") : (mine ? t("update") : t("save")))}</button>
        ${mine ? `<button class="btn danger" type="button" id="delMine">${esc(t("delMine"))}</button>` : ""}
        <p class="err" id="saveErr" role="alert"></p>
      </div>
      <p class="note" style="margin:0">${esc(t("editNote"))}</p>` : ""}
    </div>

    <div class="card stack">
      <div class="row" style="justify-content:space-between">
        <div><h2>${esc(t("results"))}</h2><div class="note">${esc(t("resultsSub"))}</div></div>
      </div>
      ${ranked.length ? `<div class="rank">${ranked.map((s, i) => { const y = tally[s.id].y, m = tally[s.id].m; return `
        <div class="r${isBest(s.id) ? " top" : ""}">
          <span class="n">${i + 1}</span>
          <div>
            <div><b>${esc(fmtFull(s.start, tz))}</b></div>
            <div class="note">${esc(t("yes"))} ${y}${p.allowMaybe ? ` · ${esc(t("maybe"))} ${m}` : ""}</div>
            <div class="meter"><i class="y" style="width:${y / N * 100}%"></i><i class="m" style="width:${m / N * 100}%"></i></div>
            ${y ? `<div class="who-yes">${esc(t("yesNames", { names: tally[s.id].yesBy.join(", ") }))}</div>` : ""}
          </div>
          ${isAdmin && p.status !== "closed" ? `<button class="btn small primary" type="button" data-confirm="${s.id}">${esc(t("confirm"))}</button>` : ""}
        </div>`; }).join("")}</div>` : `<div class="empty small">${frogImg("lying", "empty-fb")}<p>${esc(t("noResp"))}</p></div>`}
    </div>

    ${isAdmin ? `<div class="card stack tools">
      <h2>${esc(t("tools"))}</h2>
      <div class="row">
        ${p.status === "closed" ? `<button class="btn" type="button" id="reopen">${esc(t("reopen"))}</button>` : `<button class="btn" type="button" id="closeNow">${esc(t("closeNow"))}</button>`}
        ${S.confirmDel ? `<span>${esc(t("delSure"))}</span><button class="btn danger solid" type="button" id="delYes">${esc(t("delYes"))}</button><button class="btn" type="button" id="delNo">${esc(t("cancel"))}</button>` : `<button class="btn danger" type="button" id="delPoll">${esc(t("delPoll"))}</button>`}
      </div>
    </div>` : ""}
  </section>`;

  /* wiring */
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
  document.getElementById("viewTz").addEventListener("change", e => { S.viewTz = e.target.value; render(); });
  on("cpLink", () => copyText(link, document.getElementById("shareLink")));
  on("cpAdmin", () => copyText(aLink, document.getElementById("adminLink")));
  const nameIn = document.getElementById("myName");
  if (nameIn) nameIn.addEventListener("input", e => { S.draft.name = e.target.value; S.dirty = true; });
  app.querySelectorAll("button.cell[data-slot]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.slot; const cur = S.draft.answers[id];
    const order = p.allowMaybe ? ["y", "m", "n"] : ["y", "n"];
    const next = order[(order.indexOf(cur) + 1) % order.length];
    S.draft.answers[id] = next; S.dirty = true;
    b.className = "cell v-" + next; b.innerHTML = ICON[next];
    b.setAttribute("aria-label", fmtFull(slots.find(s => s.id === id).start, tz) + ": " + label(next));
  }));
  on("allYes", () => { slots.forEach(s => S.draft.answers[s.id] = "y"); S.dirty = true; render(); });
  on("saveBtn", async () => {
    const name = (S.draft.name || "").trim();
    if (!name) { document.getElementById("saveErr").textContent = t("vName"); document.getElementById("myName").focus(); return; }
    const answers = {}; slots.forEach(s => answers[s.id] = S.draft.answers[s.id] || "n");
    const rid = mine ? mine.rid : randId(12);
    S.busy = true; render();
    try {
      await withTimeout(Backend.set(ROOT + pid + "/responses/" + rid, { name, answers, updatedAt: new Date().toISOString() }), 10000);
      store.set("pat-resp-" + pid, { rid }); store.set("pat-name", name); remember(pid, S.isAdmin ? "org" : "voter", p.title);
      S.dirty = false; S.busy = false; toast(t("saved"), "clap");
    } catch (e) { S.busy = false; toast(t("writeFail"), "shocked"); }
    render();
  });
  on("delMine", async () => {
    try { await Backend.remove(ROOT + pid + "/responses/" + mine.rid); store.del("pat-resp-" + pid); S.dirty = false; S.draft = null; toast(t("deleted"), "pray"); }
    catch (e) { toast(t("writeFail"), "shocked"); }
  });
  app.querySelectorAll("[data-rmresp]").forEach(b => b.addEventListener("click", async () => {
    try { await Backend.remove(ROOT + pid + "/responses/" + b.dataset.rmresp); } catch (e) { toast(t("writeFail"), "shocked"); }
  }));
  app.querySelectorAll("[data-confirm]").forEach(b => b.addEventListener("click", async () => {
    try { await Backend.update(ROOT + pid + "/meta", { status: "closed", final: b.dataset.confirm }); toast(t("confirmed"), "cheer"); } catch (e) { toast(t("writeFail"), "shocked"); }
  }));
  on("closeNow", async () => { try { await Backend.update(ROOT + pid + "/meta", { status: "closed", final: null }); toast(t("closedMsg"), "pray"); } catch (e) { toast(t("writeFail"), "shocked"); } });
  on("reopen", async () => { try { await Backend.update(ROOT + pid + "/meta", { status: "open", final: null }); toast(t("reopened"), "jump"); } catch (e) { toast(t("writeFail"), "shocked"); } });
  on("delPoll", () => { S.confirmDel = true; render(); });
  on("delNo", () => { S.confirmDel = false; render(); });
  on("delYes", async () => {
    try { await Backend.remove(ROOT + pid); forget(pid); toast(t("pollDeleted"), "pray"); location.hash = "#/"; }
    catch (e) { toast(t("writeFail"), "shocked"); }
  });
  on("icsBtn", () => downloadIcs(p, finalSlot));
}

/* ---------- calendar export ---------- */
const utcStamp = iso => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
function gcalUrl(p, s) {
  const q = new URLSearchParams({ action: "TEMPLATE", text: p.title, dates: utcStamp(s.start) + "/" + utcStamp(addMin(s.start, p.duration || 60)), details: p.description || "", location: p.location || "" });
  return "https://calendar.google.com/calendar/render?" + q.toString();
}
const icsEsc = s => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
function downloadIcs(p, s) {
  const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pick a Time//EN", "BEGIN:VEVENT",
    "UID:" + randId(12) + "@pickatime", "DTSTAMP:" + utcStamp(new Date().toISOString()),
    "DTSTART:" + utcStamp(s.start), "DTEND:" + utcStamp(addMin(s.start, p.duration || 60)),
    "SUMMARY:" + icsEsc(p.title), "LOCATION:" + icsEsc(p.location), "DESCRIPTION:" + icsEsc(p.description),
    "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" }));
  a.download = (p.title || "meeting").replace(/[\\/:*?"<>|]+/g, "").slice(0, 60) + ".ics";
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- boot ---------- */
document.getElementById("langSel").addEventListener("change", e => { lang = e.target.value; store.set("pat-lang", lang); render(); });
window.addEventListener("hashchange", go);
go();
