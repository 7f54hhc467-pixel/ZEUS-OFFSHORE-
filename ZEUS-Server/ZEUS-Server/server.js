// ZEUS Offshore – server (Railway). Serves the app from /public, stores everything in PostgreSQL.
// Env: DATABASE_URL (PostgreSQL), TEAM_CODE (invite code needed when a person sets their password the first time), PORT,
//      GMAIL_USER + GMAIL_APP_PASSWORD (optional – client e-mails inside the app, see mail.js).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {Pool} = require('pg');

const PORT = process.env.PORT || 3000;
const TEAM_CODE = process.env.TEAM_CODE || '';
const USERS = (process.env.USERS || 'Johny,Pablo,Lukas,Camila').split(',').map(s => s.trim()).filter(Boolean);
const MAX_FILE = 25 * 1024 * 1024;

const ssl = /localhost|127\.0\.0\.1|\.railway\.internal/.test(process.env.DATABASE_URL || '') ? false : {rejectUnauthorized: false};
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl});

async function migrate() {
  await pool.query(`
    CREATE SEQUENCE IF NOT EXISTS rec_seq;
    CREATE TABLE IF NOT EXISTS records (
      kind TEXT NOT NULL, id TEXT NOT NULL, data JSONB NOT NULL,
      updated BIGINT NOT NULL DEFAULT 0, updated_by TEXT, seq BIGINT NOT NULL DEFAULT nextval('rec_seq'),
      PRIMARY KEY (kind, id));
    CREATE INDEX IF NOT EXISTS records_seq ON records(seq);
    CREATE TABLE IF NOT EXISTS history (
      id BIGSERIAL PRIMARY KEY, kind TEXT, rid TEXT, data JSONB, by TEXT, at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS users (name TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL, created TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, name TEXT NOT NULL, created TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT, type TEXT, size INT, data BYTEA NOT NULL, by TEXT, created TIMESTAMPTZ DEFAULT now());
  `);
}

// ---------- helpers ----------
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
function send(res, code, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  res.writeHead(code, {'Content-Type': isBuf ? 'application/octet-stream' : 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers});
  res.end(isBuf ? body : JSON.stringify(body));
}
function readBody(req, limit = MAX_FILE) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > limit) { reject(Object.assign(new Error('too large'), {code: 413})); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function json(req) { const b = await readBody(req, 20 * 1024 * 1024); return b.length ? JSON.parse(b.toString('utf8')) : {}; }
async function auth(req, url) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : url.searchParams.get('token');
  if (!token) return null;
  const r = await pool.query('SELECT name FROM sessions WHERE token=$1', [token]);
  return r.rows[0] ? r.rows[0].name : null;
}
// a record written by the server itself (e.g. "new e-mail from a client")
async function writeRecord(kind, id, data, by = 'server') {
  const r = await pool.query(`INSERT INTO records(kind,id,data,updated,updated_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT (kind,id) DO NOTHING RETURNING seq`,
    [kind, id, data, Number(data.updated || Date.now()), by]);
  if (r.rowCount) broadcast(Number(r.rows[0].seq), by);
}
const mail = require('./mail')({pool, writeRecord});
async function newSession(name) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query('INSERT INTO sessions(token,name) VALUES($1,$2)', [token, name]);
  return token;
}

// ---------- live updates (Server-Sent Events) ----------
const streams = new Set();
function broadcast(seq, by) { for (const s of streams) { try { s.write(`data: ${JSON.stringify({seq, by})}\n\n`); } catch {} } }
setInterval(() => { for (const s of streams) { try { s.write(': ping\n\n'); } catch {} } }, 25000);

// ---------- static files ----------
const PUB = path.join(__dirname, 'public');
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'};
function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/' || !path.extname(p)) p = '/index.html';
  const file = path.join(PUB, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUB)) return send(res, 403, {error: 'forbidden'});
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, {error: 'not found'});
    res.writeHead(200, {'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': p === '/sw.js' || p === '/index.html' ? 'no-cache' : 'public, max-age=3600'});
    res.end(data);
  });
}

// ---------- API ----------
async function api(req, res, url) {
  const p = url.pathname, m = req.method;

  if (p === '/api/health') return send(res, 200, {ok: true});

  if (p === '/api/users' && m === 'GET') {
    const r = await pool.query('SELECT name FROM users');
    const has = new Set(r.rows.map(x => x.name));
    return send(res, 200, {users: USERS.map(name => ({name, hasPassword: has.has(name)})), needsCode: !!TEAM_CODE});
  }

  if (p === '/api/setup' && m === 'POST') { // first login: choose your password
    const {name, password, code} = await json(req);
    if (!USERS.includes(name)) return send(res, 400, {error: 'unknown_user'});
    if (TEAM_CODE && code !== TEAM_CODE) return send(res, 403, {error: 'bad_code'});
    if (!password || password.length < 6) return send(res, 400, {error: 'short_password'});
    const salt = crypto.randomBytes(16).toString('hex');
    const r = await pool.query('INSERT INTO users(name,salt,hash) VALUES($1,$2,$3) ON CONFLICT (name) DO NOTHING RETURNING name', [name, salt, hashPw(password, salt)]);
    if (!r.rowCount) return send(res, 409, {error: 'already_set'});
    return send(res, 200, {token: await newSession(name), name});
  }

  if (p === '/api/login' && m === 'POST') {
    const {name, password} = await json(req);
    const r = await pool.query('SELECT salt, hash FROM users WHERE name=$1', [name]);
    const u = r.rows[0];
    if (!u || !password) return send(res, 401, {error: 'bad_login'});
    const ok = crypto.timingSafeEqual(Buffer.from(hashPw(password, u.salt), 'hex'), Buffer.from(u.hash, 'hex'));
    if (!ok) return send(res, 401, {error: 'bad_login'});
    return send(res, 200, {token: await newSession(name), name});
  }

  const me = await auth(req, url);
  if (!me) return send(res, 401, {error: 'unauthorized'});

  if (p === '/api/me') return send(res, 200, {name: me});

  if (p === '/api/password' && m === 'POST') {
    const {old, password} = await json(req);
    const r = await pool.query('SELECT salt, hash FROM users WHERE name=$1', [me]);
    if (!r.rows[0] || hashPw(old || '', r.rows[0].salt) !== r.rows[0].hash) return send(res, 401, {error: 'bad_login'});
    if (!password || password.length < 6) return send(res, 400, {error: 'short_password'});
    const salt = crypto.randomBytes(16).toString('hex');
    await pool.query('UPDATE users SET salt=$2, hash=$3 WHERE name=$1', [me, salt, hashPw(password, salt)]);
    return send(res, 200, {ok: true});
  }

  if (p === '/api/reset-password' && m === 'POST') { // a logged-in colleague can let someone set a new password
    const {name} = await json(req);
    await pool.query('DELETE FROM users WHERE name=$1', [name]);
    await pool.query('DELETE FROM sessions WHERE name=$1', [name]);
    return send(res, 200, {ok: true});
  }

  if (p === '/api/sync' && m === 'GET') {
    const since = Number(url.searchParams.get('since') || 0);
    const r = await pool.query('SELECT kind, id, data, seq FROM records WHERE seq > $1 ORDER BY seq LIMIT 5000', [since]);
    const last = r.rows.length ? Number(r.rows[r.rows.length - 1].seq) : since;
    return send(res, 200, {records: r.rows.map(x => ({kind: x.kind, id: x.id, data: x.data})), seq: last, more: r.rows.length === 5000});
  }

  if (p === '/api/records' && m === 'POST') {
    const {ops} = await json(req);
    if (!Array.isArray(ops)) return send(res, 400, {error: 'bad_request'});
    const client = await pool.connect();
    let seq = 0;
    try {
      await client.query('BEGIN');
      for (const op of ops) {
        if (!op || !op.kind || !op.id || typeof op.data !== 'object') continue;
        const upd = Number(op.data.updated || Date.now());
        // last write wins (by the time the change was made); nothing is ever hard-deleted
        const r = await client.query(`
          INSERT INTO records(kind,id,data,updated,updated_by) VALUES($1,$2,$3,$4,$5)
          ON CONFLICT (kind,id) DO UPDATE SET data=EXCLUDED.data, updated=EXCLUDED.updated, updated_by=EXCLUDED.updated_by, seq=nextval('rec_seq')
            WHERE records.updated <= EXCLUDED.updated
          RETURNING seq`, [op.kind, op.id, op.data, upd, me]);
        if (r.rowCount) {
          seq = Math.max(seq, Number(r.rows[0].seq));
          if (op.kind !== 'event') await client.query('INSERT INTO history(kind,rid,data,by) VALUES($1,$2,$3,$4)', [op.kind, op.id, op.data, me]);
        }
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    if (seq) broadcast(seq, me);
    return send(res, 200, {ok: true, seq});
  }

  const fm = p.match(/^\/api\/files\/([\w-]+)$/);
  if (fm && m === 'PUT') {
    const data = await readBody(req);
    await pool.query(`INSERT INTO files(id,name,type,size,data,by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [fm[1], decodeURIComponent(req.headers['x-name'] || 'file'), req.headers['content-type'] || 'application/octet-stream', data.length, data, me]);
    return send(res, 200, {ok: true});
  }
  if (fm && m === 'GET') {
    const r = await pool.query('SELECT name, type, data FROM files WHERE id=$1', [fm[1]]);
    if (!r.rows[0]) return send(res, 404, {error: 'not found'});
    const f = r.rows[0];
    res.writeHead(200, {'Content-Type': f.type || 'application/octet-stream', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`, 'Cache-Control': 'private, max-age=86400'});
    return res.end(f.data);
  }

  if (p === '/api/stream' && m === 'GET') {
    res.writeHead(200, {'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no'});
    res.write(': hello\n\n');
    streams.add(res);
    req.on('close', () => streams.delete(res));
    return;
  }

  // ---------- e-mail ----------
  if (p === '/api/mail/status' && m === 'GET') return send(res, 200, mail.status());
  if (p === '/api/mail' && m === 'GET') {
    const addrs = mail.splitAddrs(url.searchParams.get('emails'));
    if (!mail.enabled) return send(res, 200, {enabled: false, messages: []});
    if (addrs.length) await Promise.race([mail.backfill(addrs), new Promise(r => setTimeout(r, 20000))]);
    return send(res, 200, {enabled: true, user: mail.user, status: mail.status(), messages: await mail.list({addrs: addrs.length ? addrs : null, limit: addrs.length ? 200 : 100})});
  }
  if (p === '/api/mail/refresh' && m === 'POST') { await mail.poll(); return send(res, 200, mail.status()); }
  const am = p.match(/^\/api\/mail\/att\/([\w:.@-]+)\/(\d+)$/);
  if (am && m === 'GET') {
    const a = await mail.attachment(decodeURIComponent(am[1]), am[2]);
    if (!a) return send(res, 404, {error: 'not found'});
    res.writeHead(200, {'Content-Type': a.type, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(a.name)}`, 'X-Name': encodeURIComponent(a.name), 'Cache-Control': 'private, max-age=86400'});
    return res.end(a.data);
  }
  if (p === '/api/mail/send' && m === 'POST') {
    const {to, cc, subject, text, fileIds, inReplyTo} = await json(req);
    if (!to || !subject) return send(res, 400, {error: 'bad_request'});
    const files = fileIds && fileIds.length ? (await pool.query('SELECT name, type, data FROM files WHERE id = ANY($1)', [fileIds])).rows : [];
    if (fileIds && files.length < fileIds.length) return send(res, 409, {error: 'file_not_uploaded'});
    try { await mail.sendMail({to, cc, subject, text, files, inReplyTo}); }
    catch (e) { console.error('Gmail send:', e.message); return send(res, 502, {error: 'mail_failed', detail: e.message}); }
    return send(res, 200, {ok: true});
  }

  if (p === '/api/history' && m === 'GET') {
    const r = await pool.query('SELECT kind, rid, data, by, at FROM history WHERE rid=$1 ORDER BY id DESC LIMIT 100', [url.searchParams.get('id') || '']);
    return send(res, 200, {history: r.rows});
  }

  return send(res, 404, {error: 'not found'});
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else serveStatic(req, res, url);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, e.code === 413 ? 413 : 500, {error: e.code === 413 ? 'too_large' : 'server_error'});
  }
});

migrate().then(() => mail.migrate()).then(() => server.listen(PORT, () => { console.log('ZEUS Offshore běží na portu ' + PORT); mail.start(); }))
  .catch(e => { console.error('Nelze se připojit k databázi. Zkontrolujte proměnnou DATABASE_URL.', e.message); process.exit(1); });
