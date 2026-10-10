#!/usr/bin/env node
// The E82 office dashboard: a local page that shows the agents, the task board and
// the drafts waiting for the founder, read straight from files on the floor. Code
// only, so watching it costs no tokens. Binds to 127.0.0.1; the one write it does is
// moving a reviewed draft into approved/, and that needs the per-run token in the page.
// Usage: node bin/dashboard.mjs [port]   then open http://127.0.0.1:4782
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarise } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const floor = resolve(here, '..');
const port = Number(process.argv[2] ?? 4782);
const token = randomBytes(16).toString('hex');
const caps = (() => {
  try { return JSON.parse(readFileSync(join(floor, 'office.json'), 'utf8')).caps ?? {}; } catch { return {}; }
})();
const page = readFileSync(join(here, 'dashboard.html'), 'utf8').replace('__TOKEN__', token);

/** Resolve a path the page sent, refusing anything outside `base`. */
function inside(base, rel) {
  if (typeof rel !== 'string' || !rel.endsWith('.md')) return null;
  const p = normalize(join(base, rel));
  return p.startsWith(base + sep) ? p : null;
}

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, page, 'text/html; charset=utf-8');
  if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, summarise(floor, caps));
  if (req.method === 'GET' && url.pathname === '/api/file') {
    const area = url.searchParams.get('area') === 'reviews' ? 'reviews' : url.searchParams.get('area') === 'approved' ? 'approved' : 'drafts';
    const p = inside(join(floor, area), url.searchParams.get('path'));
    if (!p || !existsSync(p)) return send(res, 404, { error: 'not found' });
    return send(res, 200, readFileSync(p, 'utf8'), 'text/plain; charset=utf-8');
  }
  if (req.method === 'POST' && url.pathname === '/api/approve') {
    if (req.headers['x-office-token'] !== token) return send(res, 403, { error: 'bad token' });
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy(); });
    req.on('end', () => {
      let rel;
      try { rel = JSON.parse(body).path; } catch { return send(res, 400, { error: 'bad json' }); }
      const from = inside(join(floor, 'drafts'), rel);
      const review = inside(join(floor, 'reviews'), rel);
      const to = inside(join(floor, 'approved'), rel);
      if (!from || !to || !existsSync(from)) return send(res, 404, { error: 'not found' });
      // Only a draft Dwight passed can be approved here.
      if (!review || !existsSync(review) || !/^Verdict:\s*PASS/im.test(readFileSync(review, 'utf8'))) {
        return send(res, 409, { error: 'no PASS review for this draft' });
      }
      mkdirSync(dirname(to), { recursive: true });
      renameSync(from, to);
      return send(res, 200, { ok: true });
    });
    return;
  }
  send(res, 404, { error: 'not found' });
});

server.listen(port, '127.0.0.1', () => console.log(`E82 office dashboard: http://127.0.0.1:${port}`));
