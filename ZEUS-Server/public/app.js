'use strict';
/* =========================================================
   ZEUS Offshore – sdílená evidence klientů (server na Railway)
   Data: server (PostgreSQL) + kopie v zařízení (IndexedDB) pro offline.
   ========================================================= */

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const toISO = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => toISO(new Date());
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const LOCALES = {cs: 'cs-CZ', en: 'en-GB', es: 'es-ES'};
const loc = () => LOCALES[LANG];
const fmtDate = s => s ? parseISO(s).toLocaleDateString(loc()) : '—';
const fmtTime = ms => ms ? new Date(ms).toLocaleString(loc(), {day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '—';
const daysUntil = s => Math.round((parseISO(s) - parseISO(today())) / 86400000);
const monthName = (m, short) => new Date(2020, m, 1).toLocaleDateString(loc(), {month: short ? 'short' : 'long'});
const money = (a, c) => (a === '' || a == null) ? '—' : Number(a).toLocaleString(loc(), {maximumFractionDigits: 2}) + ' ' + (c || '');
const fmtSize = b => b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' kB';
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
function relDays(s) {
  const n = daysUntil(s);
  if (n === 0) return t('today'); if (n === 1) return t('tomorrow'); if (n === -1) return t('yesterday');
  return n < 0 ? t('daysAgo', {n: -n}) : t('inDays', {n});
}
function b64FromBytes(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function bytesFromB64(b) { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600); }
function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

// ---------- language ----------
let LANG = (() => { try { return localStorage.getItem('zeus-lang') || 'cs'; } catch { return 'cs'; } })();
if (!LOCALES[LANG]) LANG = 'cs';
const LI = () => ({cs: 0, en: 1, es: 2}[LANG]);
function t(key, vars) {
  const e = STR[key]; let s = e ? (e[LI()] ?? e[0]) : key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return s;
}
function setLang(l) { LANG = l; try { localStorage.setItem('zeus-lang', l); } catch {} document.documentElement.lang = l; if (me) { buildNav(); render(); } else showLogin(); }
const langSwitch = () => `<div class="langs">${['cs', 'en', 'es'].map(l => `<button type="button" class="${LANG === l ? 'on' : ''}" data-lang="${l}">${l.toUpperCase()}</button>`).join('')}</div>`;

// texts of a template (country) item – translated while the user has not edited it
function L(c, kind, item, field) {
  const v = item ? item[field] : c[field];
  if (LANG === 'cs' || !c) return v;
  const lib = DEFAULT_COUNTRIES.find(x => x.id === c.id); if (!lib) return v;
  const idx = field === 'title' ? 0 : 1;
  if (!kind) { // country-level: name / entity / about
    if (lib[field] !== v) return v;
    return (LIB_EN[c.id] || {})[field] || v;
  }
  const li = lib[kind].find(x => x.id === item.id);
  if (!li || li[field] !== v) return v;
  const tr = ((LIB_EN[c.id] || {})[kind] || {})[item.id] || GEN_EN[kind][item.id];
  return tr ? (tr[idx] ?? v) : v;
}
const cName = c => c ? L(c, null, null, 'name') : '';
const cEntity = c => c ? L(c, null, null, 'entity') : '';

// ---------- local storage (IndexedDB) ----------
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('zeus-offshore-v2', 1);
      r.onupgradeneeded = () => { const db = r.result; db.createObjectStore('kv'); db.createObjectStore('files'); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const tr = this.db.transaction(store, mode); const s = tr.objectStore(store);
      const req = fn(s); tr.oncomplete = () => res(req && req.result); tr.onerror = () => rej(tr.error);
    });
  },
  get(store, key) { return this.tx(store, 'readonly', s => s.get(key)); },
  put(store, key, val) { return this.tx(store, 'readwrite', s => s.put(val, key)); },
  del(store, key) { return this.tx(store, 'readwrite', s => s.delete(key)); },
};

// ---------- server ----------
let token = null, me = null;
try { token = localStorage.getItem('zeus-token'); me = localStorage.getItem('zeus-me'); } catch {}
async function apiFetch(path, opts = {}) {
  const r = await fetch(path, {...opts, headers: {...(opts.body && !(opts.body instanceof Blob) ? {'Content-Type': 'application/json'} : {}), ...(token ? {Authorization: 'Bearer ' + token} : {}), ...(opts.headers || {})}});
  if (r.status === 401 && token) { logout(true); throw new Error('unauthorized'); }
  return r;
}

// ---------- data ----------
// cache = {seq, recs: {kind: {id: data}}}; outbox = [{kind,id,data}] waiting for the server
const KINDS = ['client', 'company', 'payment', 'task', 'file', 'country', 'done', 'event', 'setting', 'contact'];
let cache = {seq: 0, recs: {}}, outbox = [], pendingFiles = [];
let state = {};
let online = navigator.onLine, syncing = false, initialSyncDone = false;
function rebuild() {
  const all = k => Object.values(cache.recs[k] || {});
  const live = k => all(k).filter(x => !x.deleted);
  state = {
    contacts: live('contact').sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    clients: live('client'), companies: live('company'), payments: live('payment'), tasks: live('task'), files: live('file'),
    countries: live('country').sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name)),
    events: all('event').sort((a, b) => b.at - a.at),
    done: Object.fromEntries(all('done').filter(d => d.val).map(d => [d.id, d.val])),
    settings: cache.recs.setting || {},
    trash: [...all('client'), ...all('company'), ...all('payment'), ...all('task'), ...all('file'), ...all('contact')].filter(x => x.deleted).sort((a, b) => b.deleted - a.deleted),
  };
}
async function saveLocal() { await DB.put('kv', 'cache', cache); await DB.put('kv', 'outbox', outbox); await DB.put('kv', 'pendingFiles', pendingFiles); }
function applyRec(kind, data) { (cache.recs[kind] = cache.recs[kind] || {})[data.id] = data; }
// every change goes through put(): saved locally at once, sent to the server in the background
function put(kind, obj, {silent} = {}) {
  obj.updated = Date.now(); obj.updatedBy = me;
  if (!obj.created) { obj.created = obj.updated; obj.createdBy = me; }
  const data = JSON.parse(JSON.stringify(obj));
  applyRec(kind, data); outbox.push({kind, id: data.id, data});
  rebuild(); saveLocal(); scheduleSync(300);
  if (!silent) scheduleRender();
  return data;
}
function logEvent(type, text, refs = {}) { put('event', {id: uid(), at: Date.now(), who: me, type, text, ...refs}, {silent: true}); }
function softDelete(kind, obj, group) { obj.deleted = Date.now(); obj.deletedBy = me; obj.delGroup = group; return put(kind, obj, {silent: true}); }

let syncTimer = null;
function scheduleSync(ms = 0) { clearTimeout(syncTimer); syncTimer = setTimeout(sync, ms); }
async function sync() {
  if (syncing || !token) return; syncing = true;
  try {
    // 1) upload waiting files
    while (pendingFiles.length) {
      const id = pendingFiles[0]; const blob = await DB.get('files', id); const meta = (cache.recs.file || {})[id];
      if (blob) {
        const r = await apiFetch('/api/files/' + id, {method: 'PUT', body: blob, headers: {'Content-Type': blob.type || 'application/octet-stream', 'X-Name': encodeURIComponent(meta?.name || 'file')}});
        if (!r.ok) throw new Error('upload ' + r.status);
      }
      pendingFiles.shift(); await saveLocal();
    }
    // 2) send changes
    while (outbox.length) {
      const batch = outbox.slice(0, 200);
      const r = await apiFetch('/api/records', {method: 'POST', body: JSON.stringify({ops: batch})});
      if (!r.ok) throw new Error('push ' + r.status);
      outbox.splice(0, batch.length); await saveLocal();
    }
    // 3) receive changes
    let more = true, fresh = [];
    while (more) {
      const r = await apiFetch('/api/sync?since=' + cache.seq);
      if (!r.ok) throw new Error('pull ' + r.status);
      const j = await r.json();
      for (const rec of j.records) {
        const local = (cache.recs[rec.kind] || {})[rec.id];
        if (!local || (rec.data.updated || 0) >= (local.updated || 0)) applyRec(rec.kind, rec.data);
        if (rec.kind === 'event' && !local) fresh.push(rec.data);
      }
      cache.seq = j.seq; more = j.more;
    }
    await saveLocal(); rebuild();
    if (!initialSyncDone) { initialSyncDone = true; await seedCountries(); }
    else notifyFresh(fresh);
    setOnline(true);
    scheduleRender();
  } catch (e) {
    if (String(e.message) !== 'unauthorized') setOnline(false);
  } finally { syncing = false; }
  if (outbox.length || pendingFiles.length) scheduleSync(online ? 5000 : 20000);
}
function setOnline(v) { if (online !== v) { online = v; renderStatus(); } else renderStatus(); }
let es = null;
function startStream() {
  if (!window.EventSource || !token) return;
  try { es && es.close(); } catch {}
  es = new EventSource('/api/stream?token=' + encodeURIComponent(token));
  es.onmessage = () => scheduleSync(100);
  es.onopen = () => { setOnline(true); scheduleSync(0); };
  es.onerror = () => setOnline(false);
}
addEventListener('online', () => { scheduleSync(0); startStream(); });
addEventListener('offline', () => setOnline(false));
document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleSync(0); });
setInterval(() => scheduleSync(0), 60000);

// templates: on the very first start the library is written to the server; later library additions appear automatically
async function seedCountries() {
  const removed = (state.settings.removedLib || {}).list || [];
  DEFAULT_COUNTRIES.forEach((lib, i) => {
    if (!(cache.recs.country || {})[lib.id] && !removed.includes(lib.id)) put('country', {...JSON.parse(JSON.stringify(lib)), order: i}, {silent: true});
  });
  rebuild();
}

// ---------- notifications ----------
const seenKey = () => 'zeus-seen-' + me;
const lastSeen = () => { try { return Number(localStorage.getItem(seenKey()) || 0); } catch { return 0; } };
const unreadEvents = () => state.events.filter(e => e.who !== me && e.at > lastSeen());
function notifyFresh(list) {
  const other = list.filter(e => e.who !== me);
  if (!other.length) return;
  const e = other[0];
  const txt = eventText(e);
  toast('🔔 ' + txt);
  try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification('ZEUS Offshore', {body: txt, icon: 'icon-192.png', tag: e.id}); } catch {}
}
function eventText(e) {
  const k = 'ev_' + e.type;
  return STR[k] ? t(k, {who: e.who, name: e.text || ''}) : `${e.who}: ${e.text || ''}`;
}

// ---------- login ----------
function logout(expired) {
  try { localStorage.removeItem('zeus-token'); localStorage.removeItem('zeus-me'); } catch {}
  token = null; me = null; try { es && es.close(); } catch {}
  if (expired) toast(t('sessionExpired'));
  showLogin();
}
async function showLogin(selected) {
  $('#app').hidden = true; $('#main').innerHTML = ''; $('#modal-root').innerHTML = '';
  const lock = $('#lock'); lock.hidden = false;
  let users = [{name: 'Johny'}, {name: 'Pablo'}, {name: 'Lukas'}, {name: 'Camila'}], needsCode = false, err = '';
  try { const r = await fetch('/api/users'); if (r.ok) { const j = await r.json(); users = j.users; needsCode = j.needsCode; } else err = t('serverError'); }
  catch { err = t('needInternetLogin'); }
  const u = users.find(x => x.name === selected);
  lock.innerHTML = `<div class="box">${langSwitch()}<div class="bolt">⚡</div><h1>ZEUS Offshore</h1>
    ${!u ? `<p class="muted">${t('whoAreYou')}</p><div class="userpick">${users.map(x => `<button type="button" class="btn big" data-pick="${esc(x.name)}">👤 ${esc(x.name)}</button>`).join('')}</div>`
      : u.hasPassword ? `<form id="lf"><p class="muted">${t('hello', {name: esc(u.name)})}</p>
          <input type="password" name="p" placeholder="${t('password')}" autocomplete="current-password" required>
          <div class="err" id="lock-err">${esc(err)}</div><button class="btn primary big">${t('login')}</button></form>`
      : `<form id="sf"><p class="muted">${t('firstLogin', {name: esc(u.name)})}</p>
          ${needsCode ? `<input name="code" placeholder="${t('teamCode')}" autocomplete="off" required>` : ''}
          <input type="password" name="p1" placeholder="${t('newPassword')}" autocomplete="new-password" required minlength="6">
          <input type="password" name="p2" placeholder="${t('passwordAgain')}" autocomplete="new-password" required>
          <div class="err" id="lock-err">${esc(err)}</div><button class="btn primary big">${t('savePasswordStart')}</button>
          <p class="small muted" style="margin-top:12px">${t('rememberPw')}</p></form>`}
    ${u ? `<p class="small"><a href="#" data-pick="">← ${t('otherPerson')}</a></p>` : `<div class="err">${esc(err)}</div>`}</div>`;
  lock.querySelectorAll('[data-pick]').forEach(b => b.onclick = e => { e.preventDefault(); showLogin(b.dataset.pick || undefined); });
  lock.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { LANG = b.dataset.lang; try { localStorage.setItem('zeus-lang', LANG); } catch {} showLogin(selected); });
  const finish = async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { $('#lock-err').textContent = t('err_' + (j.error || 'server_error')); return; }
    token = j.token; me = j.name;
    try { localStorage.setItem('zeus-token', token); localStorage.setItem('zeus-me', me); } catch {}
    enter();
  };
  const lf = $('#lf'); if (lf) { lf.p.focus(); lf.onsubmit = async e => { e.preventDefault(); try { await finish(await fetch('/api/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: u.name, password: lf.p.value})})); } catch { $('#lock-err').textContent = t('needInternetLogin'); } }; }
  const sf = $('#sf'); if (sf) { sf.querySelector('input').focus(); sf.onsubmit = async e => {
    e.preventDefault();
    if (sf.p1.value !== sf.p2.value) return $('#lock-err').textContent = t('pwMismatch');
    try { await finish(await fetch('/api/setup', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: u.name, password: sf.p1.value, code: sf.code ? sf.code.value.trim() : ''})})); } catch { $('#lock-err').textContent = t('needInternetLogin'); }
  }; }
}
async function enter() {
  cache = (await DB.get('kv', 'cache')) || {seq: 0, recs: {}};
  outbox = (await DB.get('kv', 'outbox')) || [];
  pendingFiles = (await DB.get('kv', 'pendingFiles')) || [];
  if (cache.owner && cache.owner !== me) { /* same device, other person – data is shared anyway */ }
  rebuild();
  $('#lock').hidden = true; $('#lock').innerHTML = ''; $('#app').hidden = false;
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  try { if (!localStorage.getItem(seenKey())) localStorage.setItem(seenKey(), String(Date.now() - 7 * 86400000)); } catch {}
  buildNav(); render(); startStream(); scheduleSync(0);
}

// ---------- deadlines engine ----------
function occurrences(fromISO, toISO_) {
  const from = parseISO(fromISO), to = parseISO(toISO_), out = [];
  for (const co of state.companies) {
    if (!co.formedDate || co.status === 'closed') continue;
    const c = country(co.countryId); if (!c) continue;
    const f = parseISO(co.formedDate), cl = client(co.clientId);
    for (const dl of c.deadlines || []) {
      for (let y = from.getFullYear(); y <= to.getFullYear(); y++) {
        if (y <= f.getFullYear()) continue;
        const anniv = new Date(y, f.getMonth(), Math.min(f.getDate(), new Date(y, f.getMonth() + 1, 0).getDate()));
        let d;
        if (dl.rule === 'anniv_month_first') d = new Date(y, f.getMonth(), 1);
        else if (dl.rule === 'anniv') d = anniv;
        else if (dl.rule === 'anniv_offset') { d = new Date(anniv); d.setDate(d.getDate() + Number(dl.offset || 0)); }
        else if (dl.rule === 'by_half' && f.getMonth() >= 6) d = new Date(y, (dl.month2 || 1) - 1, dl.day2 || 1);
        else d = new Date(y, (dl.month || 1) - 1, dl.day || 1);
        if (d < from || d > to || (co.trackFrom && toISO(d) < co.trackFrom)) continue;
        const key = `${co.id}|${dl.id}|${y}`;
        out.push({key, kind: 'dl', date: toISO(d), title: L(c, 'deadlines', dl, 'title'), info: L(c, 'deadlines', dl, 'info'), remind: dl.remind || 30, link: dl.link, phone: dl.phone, role: dl.role, countryId: c.id,
          companyId: co.id, clientId: co.clientId, who: (co.name || t('noName')) + (cl ? ' · ' + cl.name : ''), done: state.done[key] || null});
      }
    }
  }
  for (const tk of state.tasks) {
    if (tk.date < fromISO || tk.date > toISO_) continue;
    const co = company(tk.companyId), cl = client(tk.clientId || co?.clientId);
    out.push({key: 't|' + tk.id, kind: 'task', date: tk.date, title: tk.title, info: tk.note, remind: 7, companyId: tk.companyId, clientId: tk.clientId || co?.clientId,
      who: [co?.name, cl?.name].filter(Boolean).join(' · '), done: tk.done || null});
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
const urgent = () => occurrences(addDays(today(), -365), addDays(today(), 60)).filter(o => !o.done);
function setDone(key, val) {
  if (key.startsWith('t|')) { const tk = state.tasks.find(x => x.id === key.slice(2)); if (tk) put('task', {...tk, done: val}); }
  else put('done', {id: key, val});
}

// ---------- lookups ----------
const country = id => state.countries.find(c => c.id === id);
const client = id => state.clients.find(c => c.id === id);
const company = id => state.companies.find(c => c.id === id);
const companiesOf = cid => state.companies.filter(c => c.clientId === cid);
const paymentsOf = (key, id) => state.payments.filter(p => p[key] === id);
function docStatus(co, d) { return (co.docs && co.docs[d.id] && co.docs[d.id].status) || 'missing'; }
function coProgress(co) {
  const c = country(co.countryId); const steps = c ? c.steps : [];
  const done = steps.filter(s => co.steps && co.steps[s.id]).length;
  const next = steps.find(s => !(co.steps && co.steps[s.id]));
  return {done, total: steps.length, next, pct: steps.length ? Math.round(done / steps.length * 100) : 0};
}
const missingDocs = co => { const c = country(co.countryId); return c ? c.docs.filter(d => d.required && docStatus(co, d) !== 'ok') : []; };
function docTags(d) {
  return (d.required ? `<span class="tag rq">${t('tagRequired')}</span>` : '') + (d.certified ? `<span class="tag ce">${t('tagCertified')}</span>` : '') +
    (d.apostille ? `<span class="tag ap">${t('tagApostille')}</span>` : '') + (d.translation ? `<span class="tag tr">${t('tagTranslation')}</span>` : '');
}
const ST = {
  doc: {missing: 'bad', received: 'warn', ok: 'ok'},
  pay: {unpaid: 'bad', processing: 'warn', paid: 'ok'},
  co: {forming: 'gold', active: 'ok', closed: 'muted'},
};
const stLabel = (group, k) => t(group + '_' + k);
const whoLine = o => o && o.updatedBy ? `<span class="small muted">${t('lastChange')}: ${esc(o.updatedBy)}, ${fmtTime(o.updated)}</span>` : '';

// ---------- router & render ----------
function route() { const p = (location.hash || '#/').slice(2).split('/').map(decodeURIComponent); return {name: p[0] || '', a: p[1], b: p[2]}; }
let renderQueued = false;
function scheduleRender() { if (renderQueued) return; renderQueued = true; requestAnimationFrame(() => { renderQueued = false; render(); }); }
function buildNav() {
  const items = [['dash', '#/', '🏠', t('nav_dash')], ['clients', '#/klienti', '👥', t('nav_clients')], ['cal', '#/kalendar', '📅', t('nav_cal')], ['pay', '#/platby', '💳', t('nav_pay')], ['contacts', '#/kontakty', '📇', t('nav_contacts')], ['set', '#/nastaveni', '⚙️', t('nav_set')]];
  $('#nav').innerHTML = `<div class="logo"><div class="bolt">⚡</div><div>ZEUS<small>OFFSHORE</small></div></div>
    ${items.map(([k, h, ic, l]) => `<a href="${h}" data-nav="${k}"><span class="ic">${ic}</span>${l}<span class="badge-n" id="badge-${k}" hidden></span></a>`).join('')}
    <div class="spacer"></div>
    <div class="me"><span id="status-dot" class="dot"></span><span>👤 ${esc(me)}</span></div>
    ${langSwitch()}`;
}
function renderStatus() {
  const d = $('#status-dot'); if (!d) return;
  const waiting = outbox.length + pendingFiles.length;
  d.className = 'dot ' + (online ? (waiting ? 'wait' : 'on') : 'off');
  d.title = online ? (waiting ? t('syncing') : t('onlineSaved')) : t('offlineMode', {n: waiting});
  const bar = $('#offbar'); if (bar) { bar.hidden = online; bar.textContent = t('offlineMode', {n: waiting}); }
}
function render() {
  if (!me) return;
  const r = route();
  if (r.name === 'zeme' && draft) collectDraft();
  const navKey = {'': 'dash', klienti: 'clients', klient: 'clients', firma: 'clients', kalendar: 'cal', platby: 'pay', kontakty: 'contacts', nastaveni: 'set', zeme: 'set', kos: 'set', historie: 'dash'}[r.name] || 'dash';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === navKey));
  const views = {'': viewDash, klienti: viewClients, klient: viewClient, firma: viewCompany, kalendar: viewCalendar, platby: viewPayments, kontakty: viewContacts, nastaveni: viewSettings, zeme: viewCountry, kos: viewTrash, historie: viewActivity};
  const main = $('#main');
  const focusId = document.activeElement && main.contains(document.activeElement) ? document.activeElement.id : null;
  const selStart = focusId ? document.activeElement.selectionStart : null;
  const sameView = render.last === location.hash, y = scrollY;
  main.innerHTML = `<div id="offbar" class="offbar" hidden></div>` + (views[r.name] || viewDash)(r);
  if (sameView) scrollTo(0, y); else scrollTo(0, 0);
  if (focusId && $('#' + focusId)) { const el = $('#' + focusId); el.focus(); try { el.setSelectionRange(selStart, selStart); } catch {} }
  render.last = location.hash;
  const u = urgent().filter(o => daysUntil(o.date) <= 30).length;
  const up = state.payments.filter(p => p.status !== 'paid').length;
  const badge = (k, n) => { const b = $('#badge-' + k); if (b) { b.hidden = !n; b.textContent = n; } };
  badge('cal', u); badge('pay', up); badge('dash', unreadEvents().length + state.clients.filter(c => c.intake === 'new').length);
  renderStatus();
  if (r.name === 'zeme') bindCountryEditor();
}
addEventListener('hashchange', render);

// ---------- views ----------
function deadlineRow(o, showWho = true, showInfo = true) {
  const n = daysUntil(o.date);
  const cls = o.done ? 'ok' : n <= 14 ? 'bad' : n <= 30 ? 'warn' : 'muted';
  const href = o.companyId ? `#/firma/${o.companyId}/terminy` : '#/kalendar/' + o.date.slice(0, 7);
  const d = parseISO(o.date);
  return `<div class="item">
    <div class="datebox"><div class="dd">${d.getDate()}.</div><div class="small muted">${monthName(d.getMonth(), true)} ${d.getFullYear()}</div></div>
    <div class="main"><a href="${href}" class="t plain">${esc(o.title)}</a>
      ${showWho && o.who ? `<div class="d">${esc(o.who)}</div>` : ''}${showInfo && o.info ? `<div class="d">${esc(o.info)}</div>` : ''}${showInfo ? howTo(o, o.countryId) : ''}</div>
    <span class="pill ${cls}">${o.done ? t('doneOn', {d: fmtDate(o.done)}) : relDays(o.date)}</span>
    ${o.done ? `<button class="btn small ghost" data-act="undone" data-key="${esc(o.key)}" title="${t('undo')}">↺</button>`
      : `<button class="btn small ok" data-act="done" data-key="${esc(o.key)}">✔ ${t('done')}</button>`}</div>`;
}
function payRow(p, showWho = true) {
  const cl = client(p.clientId), co = company(p.companyId);
  const late = p.status !== 'paid' && p.due && daysUntil(p.due) < 0;
  return `<div class="item wrap"><div class="main mw">
    <div class="t">${esc(p.title)} <span class="muted fw5">· ${money(p.amount, p.currency)}</span></div>
    <div class="d">${showWho ? `<a href="#/klient/${p.clientId}">${esc(cl?.name || '?')}</a>${co ? ' · ' + esc(co.name || t('noName')) : ''} · ` : ''}${t('dueOn')} ${fmtDate(p.due)}${late ? ` <b class="badtext">· ${t('overdue')}</b>` : ''}${p.status === 'paid' && p.paidDate ? ' · ' + t('paidOn') + ' ' + fmtDate(p.paidDate) : ''}${p.updatedBy ? ' · ' + esc(p.updatedBy) : ''}</div></div>
    <div class="seg">${Object.entries(ST.pay).map(([k, c]) => `<button class="s-${c} ${p.status === k ? 'on' : ''}" data-act="paystatus" data-id="${p.id}" data-st="${k}">${stLabel('pay', k)}</button>`).join('')}</div>
    <button class="btn small ghost" data-act="editpay" data-id="${p.id}" title="${t('edit')}">✏️</button></div>`;
}
function eventRow(e) {
  const unread = e.who !== me && e.at > lastSeen();
  const href = e.companyId ? `#/firma/${e.companyId}` : e.clientId ? `#/klient/${e.clientId}` : '';
  return `<div class="item ${unread ? 'unread' : ''}"><span class="avatar">${esc((e.who || '?')[0])}</span>
    <div class="main"><div>${href ? `<a class="plain" href="${href}">${esc(eventText(e))}</a>` : esc(eventText(e))}</div><div class="d">${fmtTime(e.at)}</div></div>
    ${unread ? '<span class="pill gold">' + t('new') + '</span>' : ''}</div>`;
}

function viewDash() {
  const u = urgent();
  const overdue = u.filter(o => daysUntil(o.date) < 0), soon = u.filter(o => daysUntil(o.date) >= 0);
  const forming = state.companies.filter(c => c.status === 'forming');
  const unpaid = state.payments.filter(p => p.status !== 'paid').sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const intake = state.clients.filter(c => c.intake === 'new').sort((a, b) => b.created - a.created);
  const ev = state.events.slice(0, 8); const unread = unreadEvents().length;
  return `<div class="head"><div class="grow"><h1>${t('nav_dash')}</h1><p class="sub m0">${t('hello', {name: esc(me)})} · ${new Date().toLocaleDateString(loc(), {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</p></div>
    <button class="btn primary big" data-act="newclient">＋ ${t('newClient')}</button></div>
  ${intake.length ? `<div class="card attention"><h2>🆕 ${t('intakeTitle')} <span class="pill bad">${intake.length}</span></h2><div class="list">
    ${intake.map(c => `<div class="item wrap"><div class="main mw"><a class="t plain" href="#/klient/${c.id}">${esc(c.name)}</a>
      <div class="d">${t('addedBy', {who: esc(c.createdBy || '?'), when: fmtTime(c.created)})}${companiesOf(c.id).length ? ' · ' + companiesOf(c.id).map(co => esc(cName(country(co.countryId)))).join(', ') : ''}</div></div>
      <button class="btn ok" data-act="intake" data-id="${c.id}">▶ ${t('putInProcess')}</button></div>`).join('')}</div></div>` : ''}
  ${!state.clients.length ? `<div class="card"><h2>👋 ${t('startTitle')}</h2><p>${t('startText')}</p></div>` : ''}
  <div class="grid g4 mb16">
    <div class="card stat"><div class="n ${overdue.length ? 'badtext' : ''}">${overdue.length}</div><div class="l">${t('statOverdue')}</div></div>
    <div class="card stat"><div class="n">${soon.filter(o => daysUntil(o.date) <= 30).length}</div><div class="l">${t('stat30')}</div></div>
    <div class="card stat"><div class="n">${unpaid.length}</div><div class="l">${t('statUnpaid')}</div></div>
    <div class="card stat"><div class="n">${forming.length}</div><div class="l">${t('statForming')}</div></div>
  </div>
  <div class="grid g2">
    <div class="card"><h2>⏰ ${t('mustFile')}</h2>
      ${overdue.length ? `<h3 class="badtext">${t('overdueTitle')}</h3><div class="list">${overdue.map(o => deadlineRow(o, true, false)).join('')}</div>` : ''}
      <div class="list">${soon.map(o => deadlineRow(o, true, false)).join('') || (overdue.length ? '' : `<div class="empty">${t('nothing60')}</div>`)}</div></div>
    <div class="card"><div class="row mb8"><h2 class="m0">🔔 ${t('activity')} ${unread ? `<span class="pill bad">${unread}</span>` : ''}</h2>
      ${unread ? `<button class="btn small right" data-act="markseen">✔ ${t('markRead')}</button>` : ''}</div>
      <div class="list">${ev.map(eventRow).join('') || `<div class="empty">${t('noActivity')}</div>`}</div>
      <a class="btn small" href="#/historie">${t('allActivity')}</a></div>
    <div class="card"><h2>🏗️ ${t('formingNext')}</h2><div class="list">
      ${forming.map(co => { const p = coProgress(co); const cl = client(co.clientId); const c = country(co.countryId); return `<a class="item" href="#/firma/${co.id}">
        <div class="main"><div class="t">${esc(co.name || t('noName'))} <span class="muted fw5">· ${esc(cl?.name || '')}</span></div>
        <div class="d">➡️ ${esc(p.next ? L(c, 'steps', p.next, 'title') : t('allDone'))}${cl?.assignee ? ' · ' + t('handledBy') + ' ' + esc(cl.assignee) : ''}</div>
        <div class="progress mt6"><div style="width:${p.pct}%"></div></div></div><span class="pill">${p.done}/${p.total}</span></a>`; }).join('') || `<div class="empty">${t('noForming')}</div>`}
    </div></div>
    <div class="card"><h2>💳 ${t('waitingPay')}</h2><div class="list">${unpaid.slice(0, 6).map(p => payRow(p)).join('') || `<div class="empty">${t('allPaid')}</div>`}</div>
      ${unpaid.length > 6 ? `<a href="#/platby" class="btn small">${t('showAll')} (${unpaid.length})</a>` : ''}</div>
    <div class="card"><h2>📄 ${t('missingDocs')}</h2><div class="list">
      ${state.companies.filter(c => c.status === 'forming' && missingDocs(c).length).map(co => { const m = missingDocs(co); const c = country(co.countryId); return `<a class="item" href="#/firma/${co.id}/dokumenty">
        <div class="main"><div class="t">${esc(client(co.clientId)?.name || '')}</div><div class="d">${m.map(d => esc(L(c, 'docs', d, 'title'))).join(', ')}</div></div>
        <span class="pill bad">${m.length}</span></a>`; }).join('') || `<div class="empty">${t('nothingMissing')}</div>`}
    </div></div>
  </div>`;
}

function viewActivity() {
  return `<div class="crumb"><a href="#/">${t('nav_dash')}</a> ›</div><div class="head"><div class="grow"><h1>🔔 ${t('activity')}</h1></div>
    <button class="btn" data-act="markseen">✔ ${t('markRead')}</button></div>
    <div class="card"><div class="list">${state.events.slice(0, 300).map(eventRow).join('') || `<div class="empty">${t('noActivity')}</div>`}</div></div>`;
}

let clientQ = '';
function viewClients() {
  const q = clientQ.toLowerCase();
  const list = state.clients.filter(c => !q || [c.name, c.email, c.phone, c.assignee, ...companiesOf(c.id).map(x => x.name)].join(' ').toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, loc()));
  return `<div class="head"><div class="grow"><h1>${t('nav_clients')}</h1><p class="sub m0">${t('countClients', {a: state.clients.length, b: state.companies.length})}</p></div>
    <button class="btn primary big" data-act="newclient">＋ ${t('newClient')}</button></div>
    <input class="search" id="q" placeholder="🔍 ${t('searchClients')}" value="${esc(clientQ)}">
    <div class="card mt12"><div class="list">${list.map(c => {
      const cos = companiesOf(c.id); const unpaid = paymentsOf('clientId', c.id).filter(p => p.status !== 'paid').length;
      return `<a class="item" href="#/klient/${c.id}"><div class="main"><div class="t">${esc(c.name)}</div>
        <div class="d">${cos.map(co => `${country(co.countryId)?.flag || ''} ${esc(co.name || t('noName'))}`).join(', ') || t('noCompanyYet')}${c.assignee ? ' · 👤 ' + esc(c.assignee) : ''}</div></div>
        ${c.intake === 'new' ? `<span class="pill bad">${t('intake_new')}</span>` : ''}
        ${unpaid ? `<span class="pill bad">${t('unpaidN', {n: unpaid})}</span>` : ''}
        ${cos.some(co => co.status === 'forming') ? `<span class="pill gold">${stLabel('co', 'forming')}</span>` : ''}<span class="muted">›</span></a>`; }).join('')
      || `<div class="empty">${q ? t('nothingFound') : t('noClients')}</div>`}</div></div>`;
}

function viewClient(r) {
  const c = client(r.a); if (!c) return notFound();
  const cos = companiesOf(c.id), pays = paymentsOf('clientId', c.id);
  const files = state.files.filter(f => f.clientId === c.id && !f.companyId);
  return `<div class="crumb"><a href="#/klienti">${t('nav_clients')}</a> ›</div>
  <div class="head"><div class="grow"><h1>${esc(c.name)}</h1>${whoLine(c)}</div>
    <button class="btn" data-act="editclient" data-id="${c.id}">✏️ ${t('edit')}</button>
    <button class="btn primary" data-act="newcompany" data-client="${c.id}">＋ ${t('newCompany')}</button></div>
  ${c.intake === 'new' ? `<div class="note warn row"><span>🆕 ${t('intakeNote', {who: esc(c.createdBy || '?')})}</span><button class="btn ok right" data-act="intake" data-id="${c.id}">▶ ${t('putInProcess')}</button></div>` : ''}
  <div class="grid g2">
    <div class="card"><h2>${t('details')}</h2><dl class="kv">
      <dt>${t('f_email')}</dt><dd>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</dd>
      <dt>${t('f_phone')}</dt><dd>${c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : '—'}</dd>
      <dt>${t('f_nationality')}</dt><dd>${esc(c.nationality) || '—'}</dd>
      <dt>${t('f_address')}</dt><dd>${esc(c.address) || '—'}</dd>
      <dt>${t('f_assignee')}</dt><dd>${esc(c.assignee) || '—'}</dd>
      <dt>${t('f_note')}</dt><dd class="pre">${esc(c.note) || '—'}</dd>
      <dt>${t('clientSince')}</dt><dd>${fmtTime(c.created)} (${esc(c.createdBy || '')})</dd></dl></div>
    <div class="card"><h2>${t('companies')}</h2><div class="list">${cos.map(co => { const p = coProgress(co); const cc = country(co.countryId);
      return `<a class="item" href="#/firma/${co.id}"><div class="main"><div class="t">${cc?.flag || ''} ${esc(co.name || t('noName'))}</div>
        <div class="d">${esc(cName(cc))} – ${esc(cEntity(cc))}${co.formedDate ? ' · ' + t('formedOn') + ' ' + fmtDate(co.formedDate) : ''}</div>
        ${co.status === 'forming' ? `<div class="progress mt6"><div style="width:${p.pct}%"></div></div>` : ''}</div>
        <span class="pill ${ST.co[co.status] || 'gold'}">${stLabel('co', co.status || 'forming')}</span></a>`; }).join('') || `<div class="empty">${t('noCompanyHint')}</div>`}</div></div>
  </div>
  <div class="card"><div class="row mb8"><h2 class="m0">${t('nav_pay')}</h2><button class="btn small right" data-act="newpay" data-client="${c.id}">＋ ${t('addPayment')}</button></div>
    <div class="list">${pays.map(p => payRow(p, false)).join('') || `<div class="empty">${t('noPayments')}</div>`}</div></div>
  <div class="card"><div class="row mb8"><h2 class="m0">${t('otherFiles')}</h2>
    <label class="btn small right">📎 ${t('upload')}<input type="file" multiple hidden data-upload data-client="${c.id}"></label></div>
    <div class="list">${files.map(fileRow).join('') || `<div class="empty">${t('otherFilesHint')}</div>`}</div></div>
  <div class="row"><button class="btn danger" data-act="delclient" data-id="${c.id}">🗑 ${t('toTrash')}</button></div>`;
}
function fileRow(f) {
  return `<div class="item"><span>📄</span><div class="main"><div class="t fw5">${esc(f.name)}</div><div class="d">${fmtSize(f.size)} · ${fmtTime(f.created)} · ${esc(f.createdBy || '')}${pendingFiles.includes(f.id) ? ' · ⏳ ' + t('waitingUpload') : ''}</div></div>
    <button class="btn small" data-act="openfile" data-id="${f.id}">${t('open')}</button>
    <button class="btn small ghost" data-act="delfile" data-id="${f.id}" title="${t('toTrash')}">🗑</button></div>`;
}

function viewCompany(r) {
  const co = company(r.a); if (!co) return notFound();
  const c = country(co.countryId), cl = client(co.clientId), tab = r.b || 'postup';
  const p = coProgress(co);
  const tabs = [['postup', t('tab_steps')], ['dokumenty', t('tab_docs')], ['terminy', t('tab_deadlines')], ['platby', t('nav_pay')], ['info', t('tab_info')], ['udaje', t('details')]];
  let body = '';
  if (!c) body = `<div class="note bad">${t('templateMissing')}</div>`;
  else if (tab === 'postup') {
    body = `<div class="card"><div class="row mb8"><h2 class="m0">${t('stepsTitle', {c: esc(cName(c))})}</h2><span class="pill right">${t('xOfY', {a: p.done, b: p.total})}</span></div>
      <div class="progress mb16"><div style="width:${p.pct}%"></div></div>
      <ol class="steps">${c.steps.map((s, i) => {
        const done = co.steps && co.steps[s.id]; const cur = !done && p.next && p.next.id === s.id;
        const by = co.stepsBy && co.stepsBy[s.id];
        let hint = '';
        if (cur && s.check === 'docs') { const m = missingDocs(co); hint = m.length ? `<div class="note warn mt8">${t('stillMissing')}: ${m.map(d => esc(L(c, 'docs', d, 'title'))).join(', ')} – <a href="#/firma/${co.id}/dokumenty">${t('openDocs')}</a></div>` : `<div class="note mt8">✅ ${t('allDocsOk')}</div>`; }
        if (cur && s.check === 'payment') { const ps = paymentsOf('companyId', co.id); hint = !ps.length ? `<div class="note warn mt8">${t('noPaymentYet')} – <a href="#/firma/${co.id}/platby">${t('addPayment')}</a></div>` : ps.every(x => x.status === 'paid') ? `<div class="note mt8">✅ ${t('paymentsPaid')}</div>` : `<div class="note warn mt8">${t('paymentNotPaid')} – <a href="#/firma/${co.id}/platby">${t('check')}</a></div>`; }
        return `<li class="step ${done ? 'done' : ''} ${cur ? 'current' : ''}"><div class="num">${done ? '✓' : i + 1}</div><div class="body">
          <div class="t">${esc(L(c, 'steps', s, 'title'))}</div>${L(c, 'steps', s, 'info') ? `<div class="i">${esc(L(c, 'steps', s, 'info'))}</div>` : ''}${cur ? howTo(s, c.id) : ''}${hint}
          ${done ? `<div class="i">✔ ${t('doneOn', {d: fmtDate(done)})}${by ? ' · ' + esc(by) : ''} <a href="#" data-act="stepundo" data-co="${co.id}" data-step="${s.id}">${t('undo')}</a></div>` : ''}
          ${cur ? `<div class="row mt10"><button class="btn ok big" data-act="stepdone" data-co="${co.id}" data-step="${s.id}">✔ ${t('doneNext')}</button></div>` : ''}
        </div></li>`; }).join('')}</ol>
      ${!p.next ? `<div class="note">🎉 ${t('allStepsDone')}</div>` : ''}</div>`;
  } else if (tab === 'dokumenty') {
    const files = state.files.filter(f => f.companyId === co.id);
    body = `<div class="note">${t('docsIntro', {c: esc(cName(c))})}${howTo({role: 'notary'}, c.id, true)}${howTo({role: 'translator'}, c.id, true)}</div>
      <div class="card"><div class="list">${c.docs.map(d => {
        const st = docStatus(co, d); const fs = files.filter(f => f.docId === d.id);
        return `<div class="item wrap"><div class="main mw240"><div class="t">${esc(L(c, 'docs', d, 'title'))}</div>
          <div class="mt4">${docTags(d)}</div>${L(c, 'docs', d, 'info') ? `<div class="d">${esc(L(c, 'docs', d, 'info'))}</div>` : ''}
          ${fs.map(f => `<div class="d">📄 <a href="#" data-act="openfile" data-id="${f.id}">${esc(f.name)}</a> <span class="muted">(${esc(f.createdBy || '')})</span> <a href="#" data-act="delfile" data-id="${f.id}" title="${t('toTrash')}">✕</a></div>`).join('')}</div>
          <label class="btn small">📎 ${t('upload')}<input type="file" multiple hidden data-upload data-client="${co.clientId}" data-company="${co.id}" data-doc="${d.id}"></label>
          <div class="seg">${Object.entries(ST.doc).map(([k, cl2]) => `<button class="s-${cl2} ${st === k ? 'on' : ''}" data-act="docstatus" data-co="${co.id}" data-doc="${d.id}" data-st="${k}">${stLabel('doc', k)}</button>`).join('')}</div>
        </div>`; }).join('')}</div></div>
      <div class="card"><div class="row mb8"><h2 class="m0">${t('companyDocs')}</h2>
        <label class="btn small right">📎 ${t('upload')}<input type="file" multiple hidden data-upload data-client="${co.clientId}" data-company="${co.id}"></label></div>
        <div class="list">${files.filter(f => !f.docId).map(fileRow).join('') || `<div class="empty">${t('nothingYet')}</div>`}</div></div>`;
  } else if (tab === 'terminy') {
    const occ = occurrences(addDays(today(), -400), addDays(today(), 800)).filter(o => o.companyId === co.id);
    body = `${!co.formedDate ? `<div class="note warn">${t('noFormedDate')}</div>` : ''}
      <div class="card"><div class="row mb8"><h2 class="m0">${t('tab_deadlines')}</h2><button class="btn small right" data-act="newtask" data-co="${co.id}">＋ ${t('customDeadline')}</button></div>
      <div class="list">${occ.map(o => deadlineRow(o, false)).join('') || `<div class="empty">${t('noDeadlines')}</div>`}</div></div>`;
  } else if (tab === 'info') {
    body = aboutCard(c);
  } else if (tab === 'platby') {
    body = `<div class="card"><div class="row mb8"><h2 class="m0">${t('companyPayments')}</h2><button class="btn small right" data-act="newpay" data-client="${co.clientId}" data-co="${co.id}">＋ ${t('addPayment')}</button></div>
      <div class="list">${paymentsOf('companyId', co.id).map(x => payRow(x, false)).join('') || `<div class="empty">${t('noPayments')}</div>`}</div></div>`;
  } else {
    body = `<div class="card"><dl class="kv">
      <dt>${t('f_coName')}</dt><dd>${esc(co.name) || '—'}</dd><dt>${t('f_jurisdiction')}</dt><dd>${esc(cName(c))} (${esc(cEntity(c))})</dd>
      <dt>${t('f_status')}</dt><dd><span class="pill ${ST.co[co.status] || 'gold'}">${stLabel('co', co.status || 'forming')}</span></dd><dt>${t('f_formedDate')}</dt><dd>${fmtDate(co.formedDate)}</dd>
      <dt>${t('f_ein')}</dt><dd>${esc(co.ein) || '—'}</dd><dt>${t('f_agent')}</dt><dd>${esc(co.agent) || '—'}</dd>
      <dt>${t('f_note')}</dt><dd class="pre">${esc(co.note) || '—'}</dd><dt>${t('createdBy')}</dt><dd>${esc(co.createdBy || '')} · ${fmtTime(co.created)}</dd></dl>
      <div class="row mt14"><button class="btn" data-act="editcompany" data-id="${co.id}">✏️ ${t('edit')}</button>
      <button class="btn danger right" data-act="delcompany" data-id="${co.id}">🗑 ${t('toTrash')}</button></div></div>`;
  }
  return `<div class="crumb"><a href="#/klienti">${t('nav_clients')}</a> › <a href="#/klient/${cl?.id}">${esc(cl?.name || '?')}</a> ›</div>
    <div class="head"><div class="grow"><h1>${c?.flag || ''} ${esc(co.name || t('noName'))}</h1>
      <div class="row"><span class="pill ${ST.co[co.status] || 'gold'}">${stLabel('co', co.status || 'forming')}</span><span class="muted small">${esc(cName(c))} – ${esc(cEntity(c))}${co.ein ? ' · ' + esc(co.ein) : ''}</span>${whoLine(co)}</div></div>
      <button class="btn" data-act="editcompany" data-id="${co.id}">✏️ ${t('edit')}</button></div>
    <div class="tabs">${tabs.map(([k, l]) => `<a href="#/firma/${co.id}/${k}" class="${tab === k ? 'active' : ''}">${l}${k === 'dokumenty' && missingDocs(co).length ? ` <span class="pill bad">${missingDocs(co).length}</span>` : ''}</a>`).join('')}</div>${body}`;
}
function ruleText(d) {
  const dm = (a, b) => `${a}. ${b}.`;
  return {anniv_month_first: t('rule_anniv_month_first'), anniv: t('rule_anniv'), anniv_offset: t('rule_offset_txt', {n: d.offset || 0}),
    yearly: t('rule_yearly_txt', {d: dm(d.day, d.month)}), by_half: t('rule_half_txt', {a: dm(d.day, d.month), b: dm(d.day2, d.month2)})}[d.rule] || '';
}
function aboutCard(c) {
  return `<div class="card"><h2>${esc(c.flag || '')} ${esc(cName(c))} – ${esc(cEntity(c))}</h2>
    <div class="pre">${esc(L(c, null, null, 'about')) || `<span class="muted">${t('noAbout')}</span>`}</div>
    <h3 class="mt16">${t('watchedDeadlines')}</h3>
    <div class="list">${(c.deadlines || []).map(d => `<div class="item"><div class="main"><div class="t">${esc(L(c, 'deadlines', d, 'title'))}</div><div class="d">${esc(ruleText(d))}${L(c, 'deadlines', d, 'info') ? ' · ' + esc(L(c, 'deadlines', d, 'info')) : ''}</div></div></div>`).join('') || `<div class="empty">${t('none')}</div>`}</div>
    <p class="small muted mt12">${t('disclaimer')}</p></div>`;
}

let calSel = null;
function viewCalendar(r) {
  const [y, m] = (r.a || today().slice(0, 7)).split('-').map(Number);
  const first = new Date(y, m - 1, 1); const startOff = (first.getDay() + 6) % 7;
  const start = new Date(y, m - 1, 1 - startOff); const end = new Date(start); end.setDate(end.getDate() + 41);
  const occ = occurrences(toISO(start), toISO(end));
  const pays = state.payments.filter(p => p.status !== 'paid' && p.due && p.due >= toISO(start) && p.due <= toISO(end));
  const sel = calSel && calSel.startsWith(`${y}-${pad(m)}`) ? calSel : null;
  const prev = toISO(new Date(y, m - 2, 1)).slice(0, 7), next = toISO(new Date(y, m, 1)).slice(0, 7);
  const dows = [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(loc(), {weekday: 'short'}));
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i); const iso = toISO(d);
    const evs = occ.filter(o => o.date === iso), ps = pays.filter(p => p.due === iso);
    cells += `<div class="day ${d.getMonth() !== m - 1 ? 'out' : ''} ${iso === today() ? 'today' : ''} ${iso === sel ? 'sel' : ''}" data-act="calday" data-d="${iso}">
      <div class="dn">${d.getDate()}</div>${evs.map(o => `<div class="ev ${o.done ? 'done' : 'dl'}">${esc(o.title)}</div>`).join('')}
      ${ps.map(p => `<div class="ev pay">💳 ${esc(client(p.clientId)?.name || '')}</div>`).join('')}</div>`;
  }
  const lf = sel || toISO(first), lt = sel || toISO(new Date(y, m, 0));
  const lo = occ.filter(o => o.date >= lf && o.date <= lt), lp = pays.filter(p => p.due >= lf && p.due <= lt);
  return `<div class="head"><div class="grow"><h1>${t('nav_cal')}</h1><p class="sub m0">${t('calSub')}</p></div>
    <button class="btn" data-act="newtask">＋ ${t('customDeadline')}</button>
    <button class="btn gold" data-act="ics">📲 ${t('exportCal')}</button></div>
    <div class="row mb12"><a class="btn" href="#/kalendar/${prev}">‹</a><h2 class="m0 calh">${monthName(m - 1)} ${y}</h2><a class="btn" href="#/kalendar/${next}">›</a>
      <a class="btn small" href="#/kalendar/${today().slice(0, 7)}">${t('today')}</a></div>
    <div class="cal">${dows.map(x => `<div class="dh">${x}</div>`).join('')}${cells}</div>
    <div class="card mt16"><div class="row mb8"><h2 class="m0">${sel ? fmtDate(sel) : t('wholeMonth')}</h2>${sel ? `<button class="btn small right" data-act="calday" data-d="">${t('showWholeMonth')}</button>` : ''}</div>
      <div class="list">${lo.map(o => deadlineRow(o)).join('')}${lp.map(p => payRow(p)).join('')}${!lo.length && !lp.length ? `<div class="empty">${t('nothingPlanned')}</div>` : ''}</div></div>`;
}

function viewPayments(r) {
  const f = r.a || 'open';
  const list = state.payments.filter(p => f === 'all' || (f === 'open' ? p.status !== 'paid' : p.status === f)).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const curs = [...new Set(list.map(p => p.currency))];
  const sum = cur => list.filter(p => p.currency === cur).reduce((a, p) => a + Number(p.amount || 0), 0);
  const fl = [['open', t('pf_open')], ['processing', stLabel('pay', 'processing')], ['paid', t('pf_paid')], ['all', t('pf_all')]];
  return `<div class="head"><div class="grow"><h1>${t('nav_pay')}</h1><p class="sub m0">${t('paySub')}</p></div>
    <button class="btn primary big" data-act="newpay">＋ ${t('addPayment')}</button></div>
    <div class="tabs">${fl.map(([k, l]) => `<a href="#/platby/${k}" class="${f === k ? 'active' : ''}">${l}</a>`).join('')}</div>
    ${curs.length ? `<p class="muted">${t('total')}: <b>${curs.map(c => money(sum(c), c)).join(' + ')}</b></p>` : ''}
    <div class="card"><div class="list">${list.map(p => payRow(p)).join('') || `<div class="empty">${t('nothingHere')}</div>`}</div></div>`;
}

function viewTrash() {
  const label = x => x.name || x.title || t('noName');
  const kindOf = x => ['client', 'company', 'payment', 'task', 'contact'].find(k => (cache.recs[k] || {})[x.id] === x) || 'file';
  return `<div class="crumb"><a href="#/nastaveni">${t('nav_set')}</a> ›</div><h1>🗑 ${t('trash')}</h1><p class="sub">${t('trashSub')}</p>
    <div class="card"><div class="list">${state.trash.map(x => { const k = kindOf(x); return `<div class="item"><div class="main"><div class="t">${esc(label(x))}</div>
      <div class="d">${t('kind_' + k)} · ${t('deletedBy', {who: esc(x.deletedBy || '?'), when: fmtTime(x.deleted)})}</div></div>
      <button class="btn small ok" data-act="restore" data-kind="${k}" data-id="${x.id}">↩ ${t('restore')}</button></div>`; }).join('') || `<div class="empty">${t('trashEmpty')}</div>`}</div></div>`;
}

function viewSettings() {
  const notifOk = 'Notification' in window;
  return `<h1>${t('nav_set')}</h1><p class="sub">${t('setSub')}</p>
  <div class="card"><h2>👤 ${t('account')}</h2><p>${t('loggedAs', {name: esc(me)})}</p>
    <div class="row"><button class="btn" data-act="changepw">🔑 ${t('changePw')}</button><button class="btn" data-act="resetpw">♻️ ${t('resetColleague')}</button>
    <button class="btn danger right" data-act="logout">${t('logout')}</button></div></div>
  <div class="card"><h2>🌐 ${t('language')}</h2>${langSwitch()}</div>
  <div class="card"><h2>🔔 ${t('notifTitle')}</h2><p class="small">${t('notifText')}</p>
    ${notifOk ? (Notification.permission === 'granted' ? `<p class="pill ok">${t('notifOn')}</p>` : `<button class="btn" data-act="notif">🔔 ${t('notifEnable')}</button>`) : `<p class="muted small">${t('notifNo')}</p>`}</div>
  <div class="card"><div class="row mb8"><h2 class="m0">🌍 ${t('jurisdictions')}</h2><button class="btn small right" data-act="newcountry">＋ ${t('addJurisdiction')}</button></div>
    <p class="muted small">${t('jurisdictionsSub')}</p>
    <div class="list">${state.countries.map(c => `<a class="item" href="#/zeme/${c.id}"><span class="flag">${c.flag || '🏳️'}</span><div class="main"><div class="t">${esc(cName(c))}</div>
      <div class="d">${esc(cEntity(c))} · ${t('countsTpl', {s: c.steps.length, d: c.docs.length, t: c.deadlines.length})}</div></div><span class="muted">›</span></a>`).join('')}</div></div>
  <div class="card"><h2>🛟 ${t('safety')}</h2><p class="small">${t('safetyText')}</p>
    <div class="row"><a class="btn" href="#/kos">🗑 ${t('trash')} (${state.trash.length})</a>
      <button class="btn" data-act="export" data-files="1">⬇️ ${t('backupWithFiles')}</button>
      <button class="btn" data-act="export" data-files="0">⬇️ ${t('backupNoFiles')}</button>
      <label class="btn">⬆️ ${t('importBackup')}<input type="file" accept=".json,application/json" hidden id="importfile"></label></div>
    <p class="small muted mt12">${t('syncState')}: ${online ? (outbox.length + pendingFiles.length ? t('syncing') : t('onlineSaved')) : t('offlineMode', {n: outbox.length + pendingFiles.length})}</p></div>
  <div class="card"><h2>ℹ️ ${t('about')}</h2><p class="small muted">${t('aboutText')}</p></div>`;
}

// ---------- country editor ----------
let draft = null;
function viewCountry(r) {
  const c = country(r.a); if (!c) return notFound();
  if (!draft || draft.id !== c.id) draft = JSON.parse(JSON.stringify(c));
  const d = draft;
  const yn = (name, v, l) => `<label class="check small"><input type="checkbox" data-f="${name}" ${v ? 'checked' : ''}> ${l}</label>`;
  const ctl = (list, i) => `<div class="row right"><button class="btn small ghost" data-ed="up" data-list="${list}" data-i="${i}">↑</button><button class="btn small ghost" data-ed="down" data-list="${list}" data-i="${i}">↓</button><button class="btn small ghost" data-ed="del" data-list="${list}" data-i="${i}">🗑</button></div>`;
  return `<div class="crumb"><a href="#/nastaveni">${t('nav_set')}</a> ›</div>
  <div class="head"><div class="grow"><h1>${esc(d.flag)} ${esc(d.name)}</h1><p class="sub m0">${t('editorSub')}</p></div>
    <a class="btn" href="#/nastaveni" data-act="cancelcountry">${t('cancel')}</a><button class="btn primary" data-ed="save">💾 ${t('save')}</button></div>
  ${LANG !== 'cs' ? `<div class="note small">${t('editorLangNote')}</div>` : ''}
  <div id="ced">
  <div class="card"><div class="f2"><div class="field"><label class="req">${t('f_jurName')}</label><input data-root="name" value="${esc(d.name)}"></div>
    <div class="field"><label>${t('f_entity')}</label><input data-root="entity" value="${esc(d.entity)}"></div>
    <div class="field"><label>${t('f_flag')}</label><input data-root="flag" value="${esc(d.flag)}"></div></div>
    <div class="field"><label>${t('f_about')}</label><textarea data-root="about" class="tall">${esc(d.about)}</textarea></div></div>
  <div class="card"><h2>${t('tab_steps')}</h2>${d.steps.map((s, i) => `<div class="editor-item" data-list="steps" data-i="${i}">
    <div class="row"><b>${i + 1}.</b><input type="text" data-f="title" value="${esc(s.title)}">${ctl('steps', i)}</div>
    <textarea data-f="info">${esc(s.info)}</textarea>
    <div class="row mt6"><input type="url" data-f="link" value="${esc(s.link || '')}" placeholder="🌐 ${t('f_web')}" class="grow1"><input type="text" data-f="phone" value="${esc(s.phone || '')}" placeholder="📞 ${t('f_phone')}" class="w160">
      <select data-f="role"><option value="">${t('noRole')}</option>${ROLES.map(r => `<option value="${r}" ${s.role === r ? 'selected' : ''}>${t('role_' + r)}</option>`).join('')}</select></div>
    <div class="row mt6">${yn('askDate', s.askDate, t('askDateOpt'))}
      <select data-f="check" class="small"><option value="">${t('noCheck')}</option><option value="docs" ${s.check === 'docs' ? 'selected' : ''}>${t('checkDocs')}</option><option value="payment" ${s.check === 'payment' ? 'selected' : ''}>${t('checkPay')}</option></select></div></div>`).join('')}
    <button class="btn small" data-ed="add" data-list="steps">＋ ${t('addStep')}</button></div>
  <div class="card"><h2>${t('clientDocs')}</h2>${d.docs.map((s, i) => `<div class="editor-item" data-list="docs" data-i="${i}">
    <div class="row"><input type="text" data-f="title" value="${esc(s.title)}">${ctl('docs', i)}</div>
    <textarea data-f="info">${esc(s.info)}</textarea>
    <div class="row mt6 gap16">${yn('required', s.required, t('tagRequired'))}${yn('certified', s.certified, t('tagCertified'))}${yn('apostille', s.apostille, t('tagApostille'))}${yn('translation', s.translation, t('tagTranslation'))}</div></div>`).join('')}
    <button class="btn small" data-ed="add" data-list="docs">＋ ${t('addDoc')}</button></div>
  <div class="card"><h2>${t('yearlyDeadlines')}</h2>${d.deadlines.map((s, i) => `<div class="editor-item" data-list="deadlines" data-i="${i}">
    <div class="row"><input type="text" data-f="title" value="${esc(s.title)}">${ctl('deadlines', i)}</div>
    <div class="row mt6"><select data-f="rule">${['anniv_month_first', 'anniv', 'anniv_offset', 'yearly', 'by_half'].map(k => `<option value="${k}" ${s.rule === k ? 'selected' : ''}>${t('rule_' + k)}</option>`).join('')}</select>
      <span class="small">${t('dayMonth')}:</span><input type="number" data-f="day" min="1" max="31" value="${s.day || ''}" class="w60"><input type="number" data-f="month" min="1" max="12" value="${s.month || ''}" class="w60">
      <span class="small">${t('dayMonth2')}:</span><input type="number" data-f="day2" min="1" max="31" value="${s.day2 || ''}" class="w60"><input type="number" data-f="month2" min="1" max="12" value="${s.month2 || ''}" class="w60">
      <span class="small">${t('plusDays')}:</span><input type="number" data-f="offset" min="0" value="${s.offset ?? ''}" class="w60">
      <span class="small">${t('remindDays')}:</span><input type="number" data-f="remind" min="0" value="${s.remind ?? 30}" class="w60"></div>
    <textarea data-f="info">${esc(s.info)}</textarea>
    <div class="row mt6"><input type="url" data-f="link" value="${esc(s.link || '')}" placeholder="🌐 ${t('f_web')}" class="grow1"><input type="text" data-f="phone" value="${esc(s.phone || '')}" placeholder="📞 ${t('f_phone')}" class="w160">
      <select data-f="role"><option value="">${t('noRole')}</option>${ROLES.map(r => `<option value="${r}" ${s.role === r ? 'selected' : ''}>${t('role_' + r)}</option>`).join('')}</select></div></div>`).join('')}
    <button class="btn small" data-ed="add" data-list="deadlines">＋ ${t('addDeadline')}</button></div>
  ${state.countries.length > 1 ? `<button class="btn danger" data-ed="delcountry">🗑 ${t('removeJurisdiction')}</button>` : ''}</div>`;
}
function collectDraft() {
  const root = $('#ced'); if (!root || !draft) return;
  root.querySelectorAll('[data-root]').forEach(el => draft[el.dataset.root] = el.value.trim());
  root.querySelectorAll('.editor-item').forEach(it => {
    const o = draft[it.dataset.list][Number(it.dataset.i)]; if (!o) return;
    it.querySelectorAll('[data-f]').forEach(el => {
      const k = el.dataset.f;
      if (el.type === 'checkbox') o[k] = el.checked;
      else if (el.type === 'number') { if (el.value === '') delete o[k]; else o[k] = Number(el.value); }
      else o[k] = el.value.trim();
    });
  });
}
function bindCountryEditor() {
  $('#main').onclick = e => {
    const b = e.target.closest('[data-ed]'); if (!b) return;
    e.preventDefault(); collectDraft();
    const Lk = b.dataset.list, i = Number(b.dataset.i), arr = Lk && draft[Lk];
    switch (b.dataset.ed) {
      case 'add': arr.push(Lk === 'steps' ? {id: uid(), title: '', info: ''} : Lk === 'docs' ? {id: uid(), title: '', info: '', required: true} : {id: uid(), title: '', info: '', rule: 'anniv_month_first', remind: 30}); break;
      case 'del': if (!confirm(t('confirmRemoveItem'))) return; arr.splice(i, 1); break;
      case 'up': if (i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; break;
      case 'down': if (i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; break;
      case 'save': {
        if (!draft.name) return alert(t('needName'));
        for (const k of ['steps', 'docs', 'deadlines']) draft[k] = draft[k].filter(x => x.title);
        for (const d of draft.deadlines) {
          if ((d.rule === 'yearly' || d.rule === 'by_half') && !(d.day && d.month)) return alert(t('needDayMonth', {x: d.title}));
          if (d.rule === 'by_half' && !(d.day2 && d.month2)) return alert(t('needDayMonth2', {x: d.title}));
        }
        put('country', draft, {silent: true}); logEvent('template', draft.name); draft = null;
        location.hash = '#/nastaveni'; toast(t('saved')); return;
      }
      case 'delcountry': {
        const used = state.companies.filter(c => c.countryId === draft.id).length;
        if (used) return alert(t('jurInUse', {n: used}));
        if (!confirm(t('confirmRemoveJur'))) return;
        if (DEFAULT_COUNTRIES.some(l => l.id === draft.id)) { const s = state.settings.removedLib || {id: 'removedLib', list: []}; put('setting', {...s, list: [...(s.list || []), draft.id]}, {silent: true}); }
        softDelete('country', {...draft}, uid()); draft = null;
        location.hash = '#/nastaveni'; toast(t('removed')); return;
      }
    }
    const y = scrollY; $('#main').innerHTML = viewCountry(route()); scrollTo(0, y);
  };
}
const ROLES = ['agent', 'accountant', 'lawyer', 'notary', 'translator', 'bank', 'authority', 'courier', 'other'];
function contactsFor(role, countryId) { return state.contacts.filter(x => x.role === role && (!x.countryIds || !x.countryIds.length || x.countryIds.includes(countryId))); }
function contactCard(x) {
  return `<div class="contact"><b>${esc(x.name)}</b>${x.company ? ' · ' + esc(x.company) : ''}
    <div class="row mt4">${x.phone ? `<a class="btn small" href="tel:${esc(x.phone.replace(/\s/g, ''))}">📞 ${esc(x.phone)}</a>` : ''}
    ${x.email ? `<a class="btn small" href="mailto:${esc(x.email)}">✉️ ${esc(x.email)}</a>` : ''}
    ${x.web ? `<a class="btn small" href="${esc(x.web)}" target="_blank" rel="noopener">🌐 ${t('web')}</a>` : ''}</div>
    ${x.address ? `<div class="d pre">📮 ${esc(x.address)}</div>` : ''}${x.note ? `<div class="d pre">${esc(x.note)}</div>` : ''}</div>`;
}
// "how to do it": official web + phone of the step + the right people from the address book
function howTo(s, countryId, compact) {
  const parts = [];
  if (s.link) parts.push(`<a class="btn small" href="${esc(s.link)}" target="_blank" rel="noopener">🌐 ${t('openWeb')}</a>`);
  if (s.phone) parts.push(`<a class="btn small" href="tel:${esc(s.phone.replace(/\s/g, ''))}">📞 ${esc(s.phone)}</a>`);
  let who = '';
  if (s.role) {
    const list = contactsFor(s.role, countryId);
    who = list.length ? `<div class="d mt4">${t('whoHelps')} – <b>${t('role_' + s.role)}</b>:</div>${list.map(contactCard).join('')}`
      : (compact ? '' : `<div class="d mt4">${t('noContactRole', {r: t('role_' + s.role)})} <a href="#/kontakty">${t('nav_contacts')}</a></div>`);
  }
  if (!parts.length && !who) return '';
  return `<div class="howto">${parts.length ? `<div class="row">${parts.join('')}</div>` : ''}${who}</div>`;
}
function viewContacts() {
  return `<div class="head"><div class="grow"><h1>📇 ${t('nav_contacts')}</h1><p class="sub m0">${t('contactsSub')}</p></div>
    <button class="btn primary big" data-act="newcontact">＋ ${t('addContact')}</button></div>
    ${ROLES.map(r => { const list = state.contacts.filter(x => x.role === r); if (!list.length) return '';
      return `<div class="card"><h2>${t('role_' + r)}</h2>${list.map(x => `<div class="item"><div class="main">${contactCard(x)}
        ${x.countryIds && x.countryIds.length ? `<div class="d">${x.countryIds.map(id => esc(cName(country(id)))).join(', ')}</div>` : ''}</div>
        <button class="btn small ghost" data-act="editcontact" data-id="${x.id}">✏️</button></div>`).join('')}</div>`; }).join('')
    || `<div class="card empty">${t('noContacts')}</div>`}`;
}
function contactForm(x = {}) {
  return `<div class="f2">${F(t('f_name'), inp('name', x.name, 'required'), '', true)}${F(t('f_role'), `<select name="role">${opt(ROLES.map(r => [r, t('role_' + r)]), x.role || 'agent')}</select>`)}</div>` +
    F(t('f_companyName'), inp('company', x.company)) +
    `<div class="f2">${F(t('f_phone'), inp('phone', x.phone, 'type="tel"'))}${F(t('f_email'), inp('email', x.email, 'type="email"'))}</div>` +
    F(t('f_web'), inp('web', x.web, 'type="url" placeholder="https://"')) + F(t('f_postAddress'), `<textarea name="address">${esc(x.address)}</textarea>`, t('postAddressHint')) +
    F(t('f_forJur'), `<div class="checks">${state.countries.map(c => `<label class="check small"><input type="checkbox" name="cc_${c.id}" ${(x.countryIds || []).includes(c.id) ? 'checked' : ''}> ${c.flag || ''} ${esc(cName(c))}</label>`).join('')}</div>`, t('forJurHint')) +
    F(t('f_note'), `<textarea name="note">${esc(x.note)}</textarea>`);
}
const contactFromForm = d => { const o = {}; const ids = []; for (const [k, v] of Object.entries(d)) { if (k.startsWith('cc_')) { if (v) ids.push(k.slice(3)); } else o[k] = v; } o.countryIds = ids; return o; };
function notFound() { return `<div class="card"><h2>${t('notFound')}</h2><p>${t('notFoundText')}</p><a class="btn" href="#/">${t('backHome')}</a></div>`; }

// ---------- modal forms ----------
function modal(title, body, onSubmit, {submit = t('save'), wide = false} = {}) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="back"><form class="modal ${wide ? 'wide' : ''}" novalidate><div class="mh"><h2>${title}</h2><button type="button" class="btn ghost" data-close>✕</button></div>
    <div class="mb">${body}</div><div class="mf"><button type="button" class="btn" data-close>${t('cancel')}</button><button class="btn primary">${submit}</button></div></form></div>`;
  const form = root.querySelector('form');
  root.querySelectorAll('[data-close]').forEach(b => b.onclick = () => root.innerHTML = '');
  form.onsubmit = async e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = Object.fromEntries(new FormData(form).entries());
    form.querySelectorAll('input[type=checkbox]').forEach(c => data[c.name] = c.checked);
    const r = await onSubmit(data, form);
    if (r !== false) root.innerHTML = '';
  };
  const first = form.querySelector('input:not([type=hidden]):not([type=checkbox]),select,textarea'); if (first) setTimeout(() => first.focus(), 50);
  return form;
}
const F = (label, input, hint = '', req = false) => `<div class="field"><label class="${req ? 'req' : ''}">${label}</label>${input}${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
const inp = (name, v = '', a = '') => `<input name="${name}" value="${esc(v)}" ${a}>`;
const opt = (pairs, sel) => pairs.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('');
const TEAM = ['Johny', 'Pablo', 'Lukas', 'Camila'];

function clientForm(c = {}) {
  return F(t('f_name'), inp('name', c.name, 'required autocomplete="off"'), '', true) +
    `<div class="f2">${F(t('f_email'), inp('email', c.email, 'type="email"'))}${F(t('f_phone'), inp('phone', c.phone, 'type="tel"'))}</div>` +
    `<div class="f2">${F(t('f_nationality'), inp('nationality', c.nationality))}${F(t('f_address'), inp('address', c.address))}</div>` +
    F(t('f_assignee'), `<select name="assignee">${opt([['', '—'], ...TEAM.map(x => [x, x])], c.assignee)}</select>`) +
    F(t('f_note'), `<textarea name="note">${esc(c.note)}</textarea>`);
}
function companyForm(co = {}, isNew = false) {
  return F(t('f_jurisdiction'), `<select name="countryId" id="cf-country" required ${isNew ? '' : 'disabled'}>${opt(state.countries.map(c => [c.id, `${c.flag || ''} ${cName(c)} – ${cEntity(c)}`]), co.countryId)}</select>`, '', true) +
    (isNew ? `<div id="cf-about" class="note small pre aboutbox"></div>` : '') +
    F(t('f_coName'), inp('name', co.name), t('coNameHint')) +
    (isNew ? `<label class="check mb12"><input type="checkbox" name="existing" id="existing"> ${t('existingCo')}</label>` : '') +
    `<div class="f2">${F(t('f_formedDate'), inp('formedDate', co.formedDate, 'type="date"'), t('formedHint'))}${F(t('f_ein'), inp('ein', co.ein))}</div>` +
    (isNew ? '' : F(t('f_status'), `<select name="status">${opt(Object.keys(ST.co).map(k => [k, stLabel('co', k)]), co.status)}</select>`)) +
    F(t('f_agent'), inp('agent', co.agent)) + F(t('f_note'), `<textarea name="note">${esc(co.note)}</textarea>`);
}
function payForm(p = {}) {
  const cls = [...state.clients].sort((a, b) => a.name.localeCompare(b.name, loc()));
  const cid = p.clientId || cls[0]?.id;
  return F(t('f_client'), `<select name="clientId" required id="pf-client">${opt(cls.map(c => [c.id, c.name]), cid)}</select>`, '', true) +
    F(t('f_companyOpt'), `<select name="companyId" id="pf-co">${opt([['', '—'], ...companiesOf(cid).map(c => [c.id, c.name || t('noName')])], p.companyId)}</select>`) +
    F(t('f_payFor'), inp('title', p.title, `required placeholder="${t('payForPh')}"`), '', true) +
    `<div class="f2">${F(t('f_amount'), inp('amount', p.amount, 'type="number" step="0.01" min="0" required'), '', true)}${F(t('f_currency'), `<select name="currency">${opt([['EUR', 'EUR'], ['USD', 'USD'], ['CZK', 'CZK']], p.currency || 'EUR')}</select>`)}</div>` +
    `<div class="f2">${F(t('f_due'), inp('due', p.due || addDays(today(), 14), 'type="date"'))}${F(t('f_status'), `<select name="status">${opt(Object.keys(ST.pay).map(k => [k, stLabel('pay', k)]), p.status || 'unpaid')}</select>`)}</div>` +
    F(t('f_note'), `<textarea name="note">${esc(p.note)}</textarea>`);
}
function bindPayForm(form) {
  const sel = form.querySelector('#pf-client'), co = form.querySelector('#pf-co');
  sel.onchange = () => co.innerHTML = opt([['', '—'], ...companiesOf(sel.value).map(c => [c.id, c.name || t('noName')])], '');
}

// ---------- files ----------
async function uploadFiles(input) {
  const {client: clientId, company: companyId, doc: docId} = input.dataset;
  const files = [...input.files]; if (!files.length) return;
  for (const f of files) {
    if (f.size > 25e6) { alert(t('fileTooBig', {x: f.name})); continue; }
    const id = uid();
    await DB.put('files', id, f);
    pendingFiles.push(id);
    put('file', {id, clientId, companyId: companyId || null, docId: docId || null, name: f.name, type: f.type, size: f.size}, {silent: true});
  }
  const cl = client(clientId);
  logEvent('file', `${files.map(f => f.name).join(', ')} (${cl?.name || ''})`, {clientId, companyId: companyId || null});
  if (docId) { const co = company(companyId); const docs = {...(co.docs || {})}; const cur = docs[docId]?.status; if (!cur || cur === 'missing') { docs[docId] = {status: 'received'}; put('company', {...co, docs}, {silent: true}); } }
  toast(files.length > 1 ? t('uploadedN', {n: files.length}) : t('uploaded1')); scheduleRender(); scheduleSync(0);
}
async function getBlob(id) {
  let blob = await DB.get('files', id);
  if (blob) return blob;
  const r = await apiFetch('/api/files/' + id);
  if (!r.ok) return null;
  blob = await r.blob(); await DB.put('files', id, blob); return blob;
}
async function openFile(id) {
  const meta = state.files.find(f => f.id === id) || (cache.recs.file || {})[id];
  let blob; try { blob = await getBlob(id); } catch { blob = null; }
  if (!blob) return alert(t('fileUnavailable'));
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) download(meta?.name || 'file', blob);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ---------- ICS export ----------
function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m); }
function icsFold(line) { const out = []; let s = line; while (s.length > 73) { out.push(s.slice(0, 73)); s = ' ' + s.slice(73); } out.push(s); return out.join('\r\n'); }
function exportICS() {
  const from = addDays(today(), -30), to = addDays(today(), 730);
  const occ = occurrences(from, to).filter(o => !o.done);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const Ls = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ZEUS Offshore//' + LANG.toUpperCase(), 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:ZEUS Offshore'];
  const ev = (uidv, date, summary, desc, remind) => {
    Ls.push('BEGIN:VEVENT', 'UID:' + uidv + '@zeus-offshore', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + date.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + addDays(date, 1).replace(/-/g, ''),
      'SUMMARY:' + icsEscape(summary), 'DESCRIPTION:' + icsEscape(desc), 'TRANSP:TRANSPARENT');
    for (const r of [remind, 1].filter((v, i, a) => v > 0 && a.indexOf(v) === i)) Ls.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(summary), `TRIGGER:-P${r}D`, 'END:VALARM');
    Ls.push('END:VEVENT');
  };
  for (const o of occ) ev(o.key.replace(/\|/g, '-'), o.date, `⚡ ${o.title}${o.who ? ' – ' + o.who : ''}`, o.info || '', o.remind);
  for (const p of state.payments.filter(p => p.status !== 'paid' && p.due && p.due >= from)) ev('pay-' + p.id, p.due, `💳 ${client(p.clientId)?.name || ''} – ${p.title}`, `${money(p.amount, p.currency)}\n${p.note || ''}`, 3);
  Ls.push('END:VCALENDAR');
  download(`ZEUS-Offshore-${today()}.ics`, new Blob([Ls.map(icsFold).join('\r\n')], {type: 'text/calendar'}));
  modal(t('exportCal'), `<p>${t('icsDone', {n: occ.length})}</p><p>${t('icsMac')}</p><p>${t('icsIpad')}</p><p class="muted small">${t('icsRepeat')}</p>`, () => {}, {submit: 'OK'});
}

// ---------- backup ----------
async function exportBackup(withFiles) {
  toast(t('preparing'));
  const files = [];
  if (withFiles) for (const f of state.files) { try { const b = await getBlob(f.id); if (b) files.push({id: f.id, data: b64FromBytes(new Uint8Array(await b.arrayBuffer()))}); } catch {} }
  const payload = {app: 'zeus-offshore', version: 2, exported: new Date().toISOString(), by: me, withFiles, recs: cache.recs, files};
  download(`ZEUS-Offshore-${today()}${withFiles ? '' : '-no-files'}.json`, new Blob([JSON.stringify(payload)], {type: 'application/json'}));
  toast(t('backupDone'));
}
async function importBackup(file) {
  let data; try { data = JSON.parse(await file.text()); } catch { return alert(t('notBackup')); }
  if (data.app !== 'zeus-offshore') return alert(t('notBackup'));
  // version 1 (offline app) → convert
  let recs = data.recs;
  if (!recs && data.state) {
    const s = data.state; recs = {};
    const add = (k, arr) => { recs[k] = recs[k] || {}; (arr || []).forEach(x => recs[k][x.id] = x); };
    add('client', s.clients); add('company', s.companies); add('payment', s.payments); add('task', s.tasks); add('file', s.files);
    add('done', Object.entries(s.done || {}).map(([id, val]) => ({id, val})));
    add('country', s.countries);
  }
  if (!recs) return alert(t('notBackup'));
  const n = k => Object.keys(recs[k] || {}).length;
  modal(t('importBackup'), `<p>${t('importInfo', {c: n('client'), f: n('company'), p: n('payment')})}</p><p class="small muted">${t('importMerge')}</p>`, async () => {
    let added = 0;
    for (const [k, map] of Object.entries(recs)) {
      if (!KINDS.includes(k) || k === 'event') continue;
      for (const x of Object.values(map)) {
        const local = (cache.recs[k] || {})[x.id];
        if (!local || (x.updated || 0) > (local.updated || 0)) { const d = {...x}; if (!d.updated) d.updated = Date.now(); applyRec(k, d); outbox.push({kind: k, id: d.id, data: d}); added++; }
      }
    }
    for (const f of data.files || []) { if (!(await DB.get('files', f.id))) { const meta = (recs.file || {})[f.id] || {}; await DB.put('files', f.id, new Blob([bytesFromB64(f.data)], {type: meta.type || ''})); pendingFiles.push(f.id); } }
    rebuild(); await saveLocal(); logEvent('import', String(added)); scheduleSync(0); scheduleRender(); toast(t('importDone', {n: added}));
  }, {submit: t('importBtn')});
}

// ---------- actions ----------
const actions = {
  newclient: () => modal(t('newClient'), clientForm(), d => {
    const name = d.name.trim(); if (!name) return alert(t('needName')), false;
    const c = put('client', {id: uid(), ...d, name, intake: 'new'}, {silent: true});
    logEvent('client_new', name, {clientId: c.id});
    location.hash = '#/klient/' + c.id; toast(t('clientAdded'));
    setTimeout(() => { if (confirm(t('addCompanyNow'))) actions.newcompany({client: c.id}); }, 300);
  }),
  editclient: ({id}) => { const c = client(id); modal(t('editClient'), clientForm(c), d => { put('client', {...c, ...d, name: d.name.trim()}); toast(t('saved')); }); },
  intake: ({id}) => { const c = client(id); put('client', {...c, intake: 'processing', assignee: c.assignee || me}); logEvent('intake', c.name, {clientId: id}); toast(t('inProcess')); },
  delclient: ({id}) => {
    const c = client(id); if (!confirm(t('confirmTrashClient', {x: c.name}))) return;
    const g = uid();
    companiesOf(id).forEach(co => softDelete('company', {...co}, g));
    paymentsOf('clientId', id).forEach(p => softDelete('payment', {...p}, g));
    state.files.filter(f => f.clientId === id).forEach(f => softDelete('file', {...f}, g));
    softDelete('client', {...c}, g); logEvent('trash', c.name, {clientId: id});
    location.hash = '#/klienti'; toast(t('movedToTrash'));
  },
  newcompany: ({client: clientId}) => {
    const form = modal(t('newCompany'), companyForm({countryId: state.countries[0]?.id}, true), d => {
      if (d.existing && !d.formedDate) return alert(t('needFormedDate')), false;
      const c = country(d.countryId);
      const co = {id: uid(), clientId, countryId: d.countryId, name: d.name.trim(), formedDate: d.formedDate || null, ein: d.ein, agent: d.agent, note: d.note,
        status: d.existing ? 'active' : 'forming', steps: {}, stepsBy: {}, docs: {}, trackFrom: d.existing ? today() : null};
      if (d.existing) { c.steps.forEach(s => co.steps[s.id] = d.formedDate); c.docs.forEach(x => co.docs[x.id] = {status: 'ok'}); }
      put('company', co, {silent: true}); logEvent('company_new', `${co.name || cName(c)} (${client(clientId)?.name || ''})`, {clientId, companyId: co.id});
      location.hash = '#/firma/' + co.id; toast(t('companyAdded'));
    }, {submit: t('add')});
    const sel = form.querySelector('#cf-country'), box = form.querySelector('#cf-about');
    const show = () => { const c = country(sel.value); if (!c) return; box.innerHTML = `<b>${esc(cName(c))} – ${esc(cEntity(c))}</b>\n${esc(L(c, null, null, 'about') || '')}\n\n<b>${t('willWatch')}:</b> ${c.deadlines.map(x => esc(L(c, 'deadlines', x, 'title'))).join(', ') || '—'}`; };
    sel.onchange = show; show();
  },
  editcompany: ({id}) => { const co = company(id); modal(t('editCompany'), companyForm(co), d => {
    put('company', {...co, name: d.name.trim(), formedDate: d.formedDate || null, ein: d.ein, agent: d.agent, note: d.note, status: d.status}); toast(t('saved')); }); },
  delcompany: ({id}) => {
    const co = company(id); if (!confirm(t('confirmTrashCompany', {x: co.name || ''}))) return;
    const g = uid();
    paymentsOf('companyId', id).forEach(p => softDelete('payment', {...p}, g));
    state.tasks.filter(x => x.companyId === id).forEach(x => softDelete('task', {...x}, g));
    state.files.filter(f => f.companyId === id).forEach(f => softDelete('file', {...f}, g));
    softDelete('company', {...co}, g); logEvent('trash', co.name || '', {clientId: co.clientId});
    location.hash = '#/klient/' + co.clientId; toast(t('movedToTrash'));
  },
  restore: ({kind, id}) => {
    const x = (cache.recs[kind] || {})[id]; if (!x) return;
    const g = x.delGroup;
    for (const k of ['client', 'company', 'payment', 'task', 'file', 'contact']) for (const y of Object.values(cache.recs[k] || {})) if (y.deleted && (y.id === id || (g && y.delGroup === g))) put(k, {...y, deleted: null, deletedBy: null, delGroup: null}, {silent: true});
    logEvent('restore', x.name || x.title || ''); scheduleRender(); toast(t('restored'));
  },
  stepdone: ({co: id, step}) => {
    const co = company(id), c = country(co.countryId), s = c.steps.find(x => x.id === step);
    const finish = (date, name) => {
      const n = {...co, steps: {...(co.steps || {}), [step]: today()}, stepsBy: {...(co.stepsBy || {}), [step]: me}};
      if (s.askDate) n.formedDate = date; if (name) n.name = name;
      const nextStep = c.steps.find(x => !n.steps[x.id]);
      if (!nextStep && n.status === 'forming') n.status = 'active';
      put('company', n); logEvent('step', `${L(c, 'steps', s, 'title')} – ${n.name || client(co.clientId)?.name || ''}`, {clientId: co.clientId, companyId: id});
      toast(nextStep ? t('nextStepToast', {x: L(c, 'steps', nextStep, 'title')}) : '🎉 ' + t('companyFormed'));
    };
    if (s.check === 'docs' && missingDocs(co).length && !confirm(t('confirmDocsMissing'))) return;
    if (s.check === 'payment' && !paymentsOf('companyId', co.id).some(p => p.status === 'paid') && !confirm(t('confirmNoPayment'))) return;
    if (s.askDate) modal(t('formedDateTitle'), F(t('formedWhen'), inp('date', co.formedDate || today(), 'type="date" required'), t('formedWhenHint'), true) +
      (co.name ? '' : F(t('approvedName'), inp('name', ''))), d => finish(d.date, d.name && d.name.trim()), {submit: t('saveContinue')});
    else finish();
  },
  stepundo: ({co: id, step}) => { const co = company(id); const steps = {...co.steps}; delete steps[step]; put('company', {...co, steps, status: co.status === 'active' ? 'forming' : co.status}); toast(t('stepReverted')); },
  docstatus: ({co: id, doc, st}) => { const co = company(id); put('company', {...co, docs: {...(co.docs || {}), [doc]: {...((co.docs || {})[doc] || {}), status: st, by: me}}}); },
  paystatus: ({id, st}) => {
    const p = state.payments.find(x => x.id === id);
    put('payment', {...p, status: st, paidDate: st === 'paid' ? (p.paidDate || today()) : null});
    logEvent('pay_' + st, `${p.title} – ${client(p.clientId)?.name || ''} (${money(p.amount, p.currency)})`, {clientId: p.clientId, companyId: p.companyId || null});
    toast(stLabel('pay', st) + ' ✔');
  },
  newpay: ({client: cid, co}) => {
    if (!state.clients.length) return alert(t('addClientFirst'));
    const form = modal(t('addPayment'), payForm({clientId: cid, companyId: co}), d => {
      const p = put('payment', {id: uid(), ...d, amount: Number(d.amount), paidDate: d.status === 'paid' ? today() : null});
      logEvent('pay_new', `${p.title} – ${client(p.clientId)?.name || ''} (${money(p.amount, p.currency)})`, {clientId: p.clientId, companyId: p.companyId || null}); toast(t('paymentAdded'));
    }); bindPayForm(form);
  },
  editpay: ({id}) => {
    const p = state.payments.find(x => x.id === id);
    const form = modal(t('editPayment'), payForm(p) + `<button type="button" class="btn danger small" id="delpay">🗑 ${t('toTrash')}</button>`, d => {
      const n = {...p, ...d, amount: Number(d.amount)}; if (n.status === 'paid' && !n.paidDate) n.paidDate = today(); if (n.status !== 'paid') n.paidDate = null; put('payment', n); toast(t('saved'));
    }); bindPayForm(form);
    form.querySelector('#delpay').onclick = () => { if (!confirm(t('confirmTrash'))) return; softDelete('payment', {...p}, uid()); $('#modal-root').innerHTML = ''; scheduleRender(); toast(t('movedToTrash')); };
  },
  done: ({key}) => { setDone(key, today()); toast(t('markedDone')); },
  undone: ({key}) => { setDone(key, null); toast(t('reverted')); },
  newtask: ({co}) => {
    const cos = state.companies.map(c => [c.id, `${c.name || t('noName')} · ${client(c.clientId)?.name || ''}`]);
    modal(t('customDeadline'), F(t('f_whatToDo'), inp('title', '', 'required'), '', true) + F(t('f_date'), inp('date', calSel || today(), 'type="date" required'), '', true) +
      F(t('f_companyOpt'), `<select name="companyId">${opt([['', '—'], ...cos], co || '')}</select>`) + F(t('f_note'), `<textarea name="note"></textarea>`), d => {
      put('task', {id: uid(), title: d.title, date: d.date, note: d.note, companyId: d.companyId || null, clientId: company(d.companyId)?.clientId || null, done: null});
      toast(t('deadlineAdded'));
    });
  },
  calday: ({d}) => { calSel = d || null; render(); },
  ics: () => exportICS(),
  openfile: ({id}) => openFile(id),
  delfile: ({id}) => { const f = state.files.find(x => x.id === id); if (!confirm(t('confirmTrashFile', {x: f?.name || ''}))) return; softDelete('file', {...f}, uid()); scheduleRender(); toast(t('movedToTrash')); },
  export: ({files}) => exportBackup(files === '1'),
  markseen: () => { try { localStorage.setItem(seenKey(), String(Date.now())); } catch {} render(); },
  notif: async () => { try { await Notification.requestPermission(); } catch {} render(); },
  newcountry: () => modal(t('addJurisdiction'), F(t('f_jurName'), inp('name', '', `required placeholder="${t('jurNamePh')}"`), '', true) +
    `<div class="f2">${F(t('f_entity'), inp('entity', 'LLC'))}${F(t('f_flag'), inp('flag', '🏳️'))}</div>` +
    F(t('startFrom'), `<select name="from">${opt([['', t('emptyTemplates')], ...state.countries.map(c => [c.id, t('copyOf') + ' ' + cName(c)])], '')}</select>`, t('copyHint')), d => {
    const src = country(d.from);
    const c = put('country', {id: uid(), name: d.name.trim(), entity: d.entity, flag: d.flag, about: src ? src.about : '', order: 50,
      steps: src ? src.steps.map(s => ({...s, id: uid()})) : [], docs: src ? src.docs.map(s => ({...s, id: uid()})) : [], deadlines: src ? src.deadlines.map(s => ({...s, id: uid()})) : []}, {silent: true});
    draft = null; location.hash = '#/zeme/' + c.id; toast(t('addedEditNow'));
  }),
  cancelcountry: () => { draft = null; },
  newcontact: () => modal(t('addContact'), contactForm(), d => { put('contact', {id: uid(), ...contactFromForm(d)}); toast(t('saved')); }, {wide: true}),
  editcontact: ({id}) => { const x = state.contacts.find(c => c.id === id);
    const form = modal(t('editContact'), contactForm(x) + `<button type="button" class="btn danger small" id="delcontact">🗑 ${t('toTrash')}</button>`, d => { put('contact', {...x, ...contactFromForm(d)}); toast(t('saved')); }, {wide: true});
    form.querySelector('#delcontact').onclick = () => { if (!confirm(t('confirmTrash'))) return; softDelete('contact', {...x}, uid()); $('#modal-root').innerHTML = ''; scheduleRender(); toast(t('movedToTrash')); }; },
  changepw: () => modal(t('changePw'), F(t('currentPw'), '<input type="password" name="old" required>') + F(t('newPassword'), '<input type="password" name="p1" required minlength="6">') + F(t('passwordAgain'), '<input type="password" name="p2" required>'), async d => {
    if (d.p1 !== d.p2) return alert(t('pwMismatch')), false;
    try { const r = await apiFetch('/api/password', {method: 'POST', body: JSON.stringify({old: d.old, password: d.p1})}); if (!r.ok) { const j = await r.json(); return alert(t('err_' + j.error)), false; } }
    catch { return alert(t('needInternet')), false; }
    toast(t('pwChanged'));
  }),
  resetpw: () => modal(t('resetColleague'), `<p class="small">${t('resetText')}</p>` + F(t('person'), `<select name="name">${opt(TEAM.filter(x => x !== me).map(x => [x, x]), '')}</select>`), async d => {
    if (!confirm(t('resetConfirm', {x: d.name}))) return false;
    try { const r = await apiFetch('/api/reset-password', {method: 'POST', body: JSON.stringify({name: d.name})}); if (!r.ok) throw 0; } catch { return alert(t('needInternet')), false; }
    logEvent('pwreset', d.name); toast(t('resetDone', {x: d.name}));
  }, {submit: t('reset')}),
  logout: () => { if ((outbox.length || pendingFiles.length) && !confirm(t('logoutUnsynced'))) return; if (confirm(t('confirmLogout'))) logout(); },
};
document.addEventListener('click', e => {
  const lb = e.target.closest('[data-lang]'); if (lb && me) { setLang(lb.dataset.lang); return; }
  const el = e.target.closest('[data-act]'); if (!el || !me) return;
  if (el.tagName === 'A' && el.dataset.act !== 'cancelcountry') e.preventDefault();
  const fn = actions[el.dataset.act]; if (fn) fn(el.dataset, el);
});
document.addEventListener('change', e => {
  if (!me) return;
  if (e.target.matches('[data-upload]')) uploadFiles(e.target).finally(() => e.target.value = '');
  if (e.target.id === 'importfile') { const f = e.target.files[0]; e.target.value = ''; if (f) importBackup(f); }
});
document.addEventListener('input', e => { if (e.target.id === 'q') { clientQ = e.target.value; render(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#modal-root').innerHTML = ''; });

// ---------- start ----------
(async () => {
  document.documentElement.lang = LANG;
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  try { await DB.open(); } catch { document.body.innerHTML = '<p style="padding:30px">' + t('noStorage') + '</p>'; return; }
  if (token && me) enter(); else showLogin();
})();
