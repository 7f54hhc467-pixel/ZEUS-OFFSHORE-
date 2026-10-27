// ZEUS Offshore – Gmail (IMAP + SMTP) with a Google "app password".
// Env: GMAIL_USER (e.g. office@gmail.com), GMAIL_APP_PASSWORD (16 letters from Google), optional IMAP_HOST/SMTP_HOST for non-Gmail.
// Only e-mails to/from addresses of clients in ZEUS are stored, nothing else from the mailbox.
'use strict';
const {ImapFlow} = require('imapflow');
const {simpleParser} = require('mailparser');
const nodemailer = require('nodemailer');

const USER = (process.env.GMAIL_USER || '').trim();
const PASS = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
const IMAP_HOST = process.env.IMAP_HOST || 'imap.gmail.com';
const IMAP_PORT = Number(process.env.IMAP_PORT || 993);
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SECURE = process.env.MAIL_INSECURE !== '1';
const POLL_MS = 2 * 60 * 1000;
const FIRST_DAYS = 180;

module.exports = function mail({pool, writeRecord}) {
  const enabled = !!(USER && PASS);
  const st = {ok: false, error: '', lastPoll: 0, box: ''};

  async function migrate() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mails (
        id TEXT PRIMARY KEY, msgid TEXT, date TIMESTAMPTZ, from_addr TEXT, from_name TEXT, addrs TEXT[] NOT NULL DEFAULT '{}',
        subject TEXT, snippet TEXT, text TEXT, attachments JSONB NOT NULL DEFAULT '[]', raw BYTEA, created TIMESTAMPTZ DEFAULT now());
      CREATE INDEX IF NOT EXISTS mails_addrs ON mails USING GIN(addrs);
      CREATE TABLE IF NOT EXISTS mail_state (k TEXT PRIMARY KEY, v TEXT);
    `);
  }
  const getState = async k => (await pool.query('SELECT v FROM mail_state WHERE k=$1', [k])).rows[0]?.v;
  const setState = (k, v) => pool.query('INSERT INTO mail_state(k,v) VALUES($1,$2) ON CONFLICT (k) DO UPDATE SET v=EXCLUDED.v', [k, String(v)]);

  // all e-mail addresses of (not deleted) clients → {address: client}
  async function clientMap() {
    const r = await pool.query(`SELECT data FROM records WHERE kind='client' AND (data->>'deleted') IS NULL`);
    const m = new Map();
    for (const {data} of r.rows) for (const a of splitAddrs(data.email)) m.set(a, data);
    return m;
  }
  const splitAddrs = s => String(s || '').toLowerCase().split(/[,;\s]+/).map(x => x.trim()).filter(x => x.includes('@'));
  const addrsOf = env => [...(env.from || []), ...(env.to || []), ...(env.cc || []), ...(env.bcc || []), ...(env.replyTo || [])].map(a => (a.address || '').toLowerCase()).filter(Boolean);

  // ---------- IMAP ----------
  let imap = null, lock = Promise.resolve();
  const serial = fn => (lock = lock.then(fn, fn)); // one IMAP job at a time
  async function connect() {
    if (imap && imap.usable) return imap;
    imap = new ImapFlow({host: IMAP_HOST, port: IMAP_PORT, secure: SECURE, auth: {user: USER, pass: PASS}, logger: false, tls: SECURE ? {} : {rejectUnauthorized: false}});
    imap.on('error', e => { st.ok = false; st.error = e.message; });
    await imap.connect();
    // Gmail: "All Mail" holds received and sent mail together
    const boxes = await imap.list();
    const all = boxes.find(b => b.specialUse === '\\All');
    st.box = all ? all.path : 'INBOX';
    st.boxes = all ? [all.path] : ['INBOX', ...boxes.filter(b => b.specialUse === '\\Sent').map(b => b.path)];
    return imap;
  }

  async function storeMessage(box, msg, cmap, {notify}) {
    const id = msg.emailId ? 'g' + msg.emailId : box + ':' + msg.uid;
    const exists = await pool.query('SELECT 1 FROM mails WHERE id=$1', [id]);
    if (exists.rowCount) return false;
    const parsed = await simpleParser(msg.source);
    const atts = (parsed.attachments || []).filter(a => a.contentDisposition !== 'inline' || a.filename)
      .map((a, idx) => ({idx, filename: a.filename || 'priloha-' + (idx + 1), type: a.contentType, size: a.size}));
    const text = (parsed.text || (parsed.html ? String(parsed.html).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ') : '')).replace(/\r/g, '').trim();
    const from = parsed.from?.value?.[0] || {};
    const addrs = [...new Set(addrsOf(msg.envelope))];
    const date = parsed.date || msg.envelope.date || new Date();
    await pool.query(`INSERT INTO mails(id,msgid,date,from_addr,from_name,addrs,subject,snippet,text,attachments,raw) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
      [id, parsed.messageId || '', date, (from.address || '').toLowerCase(), from.name || '', addrs, parsed.subject || '', text.replace(/\s+/g, ' ').slice(0, 200), text.slice(0, 50000), JSON.stringify(atts), msg.source]);
    const fromAddr = (from.address || '').toLowerCase();
    const cl = cmap.get(fromAddr);
    if (notify && cl && Date.now() - new Date(date).getTime() < 3 * 86400000) {
      await writeRecord('event', 'mail-' + id, {id: 'mail-' + id, at: Date.now(), who: 'Gmail', type: 'mail_in', text: `${cl.name}: ${parsed.subject || ''}`, clientId: cl.id});
    }
    return true;
  }

  // new messages since the last check (only those that concern a client)
  async function poll() {
    if (!enabled) return;
    return serial(async () => {
      try {
        const c = await connect();
        const cmap = await clientMap();
        for (const box of st.boxes) {
          const l = await c.getMailboxLock(box);
          try {
            const key = 'uid:' + box, vkey = 'uidv:' + box;
            let last = Number(await getState(key) || 0);
            const validity = String(c.mailbox.uidValidity);
            if ((await getState(vkey)) !== validity) last = 0;
            let range;
            if (!last) { // first run: remember where we are, older mail is loaded per client on demand
              const since = new Date(Date.now() - 2 * 86400000);
              const uids = await c.search({since}, {uid: true});
              range = uids.length ? uids : [];
            } else range = `${last + 1}:*`;
            let max = last;
            if (range === `${last + 1}:*` || range.length) {
              const metas = [];
              for await (const m of c.fetch(range, {uid: true, envelope: true, emailId: true}, {uid: true})) if (m.uid > last) metas.push(m);
              for (const m of metas) {
                max = Math.max(max, m.uid);
                if (!addrsOf(m.envelope).some(a => cmap.has(a))) continue;
                const full = await c.fetchOne(m.uid, {uid: true, envelope: true, emailId: true, source: true}, {uid: true});
                if (full) await storeMessage(box, full, cmap, {notify: !!last});
              }
            }
            if (!last && !max) max = Math.max(0, (c.mailbox.uidNext || 1) - 1);
            await setState(key, max); await setState(vkey, validity);
          } finally { l.release(); }
        }
        st.ok = true; st.error = ''; st.lastPoll = Date.now();
      } catch (e) {
        st.ok = false; st.error = e.message; console.error('Gmail:', e.message);
        try { imap && imap.close(); } catch {} imap = null;
      }
    });
  }

  // older correspondence with one client – searched in the mailbox the first time it is needed
  async function backfill(addrs) {
    if (!enabled || !addrs.length) return;
    const key = 'bf:' + addrs.slice().sort().join(',');
    const was = Number(await getState(key) || 0);
    if (Date.now() - was < 10 * 60 * 1000) return;
    return serial(async () => {
      try {
        const c = await connect();
        const cmap = await clientMap();
        const since = new Date(Date.now() - FIRST_DAYS * 86400000);
        for (const box of st.boxes) {
          const l = await c.getMailboxLock(box);
          try {
            const crit = addrs.flatMap(a => [{from: a}, {to: a}, {cc: a}]);
            const uids = await c.search({since, or: crit}, {uid: true});
            for (const uid of (uids || []).slice(-300)) {
              const m = await c.fetchOne(uid, {uid: true, envelope: true, emailId: true, source: true}, {uid: true});
              if (m) await storeMessage(box, m, cmap, {notify: false});
            }
          } finally { l.release(); }
        }
        await setState(key, Date.now());
        st.ok = true; st.error = '';
      } catch (e) {
        st.ok = false; st.error = e.message; console.error('Gmail backfill:', e.message);
        try { imap && imap.close(); } catch {} imap = null;
      }
    });
  }

  async function list({addrs, limit = 100}) {
    const r = addrs && addrs.length
      ? await pool.query('SELECT id,date,from_addr,from_name,addrs,subject,snippet,text,attachments FROM mails WHERE addrs && $1 ORDER BY date DESC LIMIT $2', [addrs, limit])
      : await pool.query('SELECT id,date,from_addr,from_name,addrs,subject,snippet,attachments FROM mails ORDER BY date DESC LIMIT $1', [limit]);
    return r.rows.map(x => ({...x, date: new Date(x.date).getTime(), incoming: x.from_addr !== USER.toLowerCase()}));
  }

  async function attachment(id, idx) {
    const r = await pool.query('SELECT raw FROM mails WHERE id=$1', [id]);
    if (!r.rows[0]) return null;
    const parsed = await simpleParser(r.rows[0].raw);
    const list = (parsed.attachments || []).filter(a => a.contentDisposition !== 'inline' || a.filename);
    const a = list[Number(idx)];
    return a ? {name: a.filename || 'priloha', type: a.contentType || 'application/octet-stream', data: a.content} : null;
  }

  const smtp = enabled ? nodemailer.createTransport({host: SMTP_HOST, port: SMTP_PORT, secure: SECURE && SMTP_PORT === 465, auth: {user: USER, pass: PASS}, tls: SECURE ? {} : {rejectUnauthorized: false}}) : null;
  async function sendMail({to, cc, subject, text, files, inReplyTo, fromName}) {
    if (!enabled) throw Object.assign(new Error('mail_off'), {code: 400});
    const info = await smtp.sendMail({from: fromName ? {name: fromName, address: USER} : USER, to, cc: cc || undefined, subject, text,
      inReplyTo: inReplyTo || undefined, references: inReplyTo || undefined, attachments: (files || []).map(f => ({filename: f.name, content: f.data, contentType: f.type}))});
    setTimeout(poll, 4000); // the sent message shows up in the client's conversation
    return info.messageId;
  }

  function start() {
    if (!enabled) { console.log('Gmail: vypnuto (chybí GMAIL_USER / GMAIL_APP_PASSWORD)'); return; }
    console.log('Gmail: zapnuto pro ' + USER);
    setTimeout(poll, 3000); setInterval(poll, POLL_MS);
  }

  return {enabled, user: USER, status: () => ({enabled, user: USER, ...st}), migrate, start, poll, backfill, list, attachment, sendMail, splitAddrs};
};
