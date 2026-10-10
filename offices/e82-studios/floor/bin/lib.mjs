// Pure helpers for the E82 office floor: build the one-page brief, check drafts,
// and summarise the floor for the dashboard. No model calls: everything here is
// code, so it costs no tokens. Tested by test/e82-office.test.cjs.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Lines inside a ```<lang> fenced block. */
export function fencedList(md, lang) {
  const m = md.match(new RegExp('```' + lang + '\\n([\\s\\S]*?)```'));
  return m ? m[1].split('\n').map((l) => l.trim()).filter(Boolean) : [];
}

/** Body of a "## Heading" section (up to the next "## "). */
export function section(md, heading) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l.replace(/^##\s+/, '').trim().toLowerCase().startsWith(heading.toLowerCase()) && l.startsWith('## '));
  if (start < 0) return '';
  const out = [];
  for (const l of lines.slice(start + 1)) {
    if (l.startsWith('## ')) break;
    out.push(l);
  }
  return out.join('\n').trim();
}

const plain = (s) => s.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/`/g, '').trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

/** Open decisions still unanswered: rows of the table that are not struck through. */
export function openDecisions(contextMd) {
  return section(contextMd, 'Open decisions')
    .split('\n')
    .filter((l) => /^\|\s*\d+\s*\|/.test(l) && !l.includes('~~'))
    .map((l) => {
      const cells = l.split('|').slice(1, -1).map((c) => plain(c));
      return { n: Number(cells[0]), decision: cells[1], blocking: cells[3] ?? '' };
    });
}

/** Newest live decisions (struck-through entries were replaced). */
export function recentDecisions(contextMd, limit = 5) {
  return section(contextMd, 'Decisions log')
    .split('\n')
    .filter((l) => l.startsWith('- ') && !l.startsWith('- ~~'))
    .slice(0, limit)
    .map((l) => clip(plain(l.slice(2)), 220));
}

/** The one-page brief every agent reads instead of five operating files. */
export function buildBrief({ quarter, context, style, generatedOn }) {
  const bullets = (md) => md.split('\n').filter((l) => l.startsWith('- ')).map((l) => `- ${clip(plain(l.slice(2)), 160)}`);
  const lengths = section(style, 'Length').split('\n').filter((l) => l.startsWith('|') && !/^\|\s*-/.test(l) && !/Output/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim())).map(([k, v]) => `${k}: ${v}`);
  const decisions = openDecisions(context);
  return [
    `# E82 brief (generated ${generatedOn} by bin/build-brief.mjs; do not edit, re-run it)`,
    '',
    'Read this instead of the operating files. Open a full file only when a task needs a detail that is not here.',
    '',
    '## The one thing',
    plain(section(quarter, 'The one thing')),
    '',
    '## Market',
    plain(section(quarter, 'Market')),
    'Exception: the video service sells to the US and Canada (decision 30 Sep 2026).',
    '',
    '## YES this quarter',
    ...bullets(section(quarter, 'YES')),
    '',
    '## NO this quarter',
    ...bullets(section(quarter, 'NO')),
    '',
    '## Open decisions (do not decide these; ask Michael)',
    ...decisions.map((d) => `- #${d.n} ${clip(d.decision, 60)}. Blocks: ${clip(d.blocking, 90)}`),
    '',
    '## Latest decisions',
    ...recentDecisions(context).map((d) => `- ${d}`),
    '',
    '## Words',
    `Never in client text: ${fencedList(style, 'banned-everywhere').join(', ')}.`,
    `Also never in cold outreach: ${fencedList(style, 'banned-in-outreach').join(', ')}.`,
    '',
    '## Lengths',
    ...lengths.map((l) => `- ${l}`),
    ''
  ].join('\n');
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Words of a "## <name>" section, or the whole text if there is none. */
function partOf(text, name) {
  const s = section(text, name);
  return s || '';
}

const NUMBER_CLAIM = /(₹|US\$|\$|Rs\.?)\s?\d|\b\d[\d,.]*\s?(%|x\b|hours?\b|hrs?\b|minutes?\b|mins?\b|leads?\b|calls?\b|days?\b|clients?\b|customers?\b)/i;

/**
 * Mechanical checks Dwight would otherwise spend tokens on.
 * kind 'outreach' adds the cold-outreach word list and the 60-word opener limit.
 * Returns { ok, issues: [{ rule, detail }] }.
 */
export function checkDraft(text, { banned = [], outreachBanned = [], kind = 'general' } = {}) {
  const issues = [];
  const body = text.replace(/^Verdict:.*$/m, '');
  for (const w of banned) {
    const re = new RegExp(`(^|[^A-Za-z])${escapeRe(w)}(?![A-Za-z])`, 'i');
    if (re.test(body)) issues.push({ rule: 'banned-word', detail: w });
  }
  if (kind === 'outreach') {
    const opener = partOf(text, 'Opener');
    if (!opener) issues.push({ rule: 'missing-section', detail: '## Opener' });
    else {
      const words = opener.split(/\s+/).filter(Boolean).length;
      if (words > 60) issues.push({ rule: 'too-long', detail: `opener is ${words} words (max 60)` });
      for (const w of outreachBanned) {
        // "AI" is matched case-sensitively so "said" or "aim" never trip it.
        const re = new RegExp(`(^|[^A-Za-z])${escapeRe(w)}(?![A-Za-z])`, w === w.toUpperCase() ? '' : 'i');
        if (re.test(opener)) issues.push({ rule: 'outreach-word', detail: w });
      }
    }
  }
  for (const [i, line] of text.split('\n').entries()) {
    if (NUMBER_CLAIM.test(line) && !/\[(source|est):[^\]]+\]/i.test(line)) {
      issues.push({ rule: 'unsourced-number', detail: `line ${i + 1}: ${clip(line.trim(), 80)}` });
    }
  }
  return { ok: issues.length === 0, issues };
}

/** Which checks apply to a draft at this path. */
export function kindFor(path) {
  return path.split(/[\\/]/).includes('outreach') ? 'outreach' : 'general';
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name.startsWith('.')) return [];
    return statSync(p).isDirectory() ? walk(p) : name.endsWith('.md') ? [p] : [];
  });
}

const readJson = (p, fallback) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; }
};

/** "Verdict: PASS" / "Verdict: NEEDS WORK" on a review's first lines. */
export function verdictOf(md) {
  const m = md.match(/^Verdict:\s*(PASS|NEEDS WORK)/im);
  return m ? m[1].toUpperCase() : null;
}

/** Everything the dashboard shows, read from files on the floor. */
export function summarise(floor, caps = {}) {
  const hive = join(floor, 'hive');
  const registry = readJson(join(hive, 'registry.json'), { agents: {} });
  const fleet = readJson(join(hive, 'fleet.json'), { agents: [] });
  const live = new Map((Array.isArray(fleet.agents) ? fleet.agents : []).map((r) => [r.id, r]));
  const tasks = readJson(join(hive, 'tasks.json'), { tasks: [] }).tasks ?? [];
  const agents = Object.entries(registry.agents ?? {})
    .filter(([, a]) => !a.archived)
    .map(([id, a]) => {
      const row = live.get(id) ?? {};
      const tokens = Number(row.tokens ?? 0) || 0;
      const cap = caps[id] ?? null;
      return {
        id,
        name: a.name ?? id,
        role: a.role ?? '',
        isGod: !!a.isGod,
        tokens,
        usd: Number(row.usd ?? 0) || 0,
        lastTool: row.lastTool ?? null,
        lastActiveSecAgo: row.lastActiveSecAgo ?? null,
        inbox: row.inboxBacklog ?? 0,
        onHold: !!(row.onHold ?? a.onHold),
        breaker: row.breaker ?? null,
        cap
      };
    });
  const drafts = walk(join(floor, 'drafts')).map((p) => {
    const rel = relative(join(floor, 'drafts'), p).split(sep).join('/');
    const reviewPath = join(floor, 'reviews', ...rel.split('/'));
    const verdict = existsSync(reviewPath) ? verdictOf(readFileSync(reviewPath, 'utf8')) : null;
    return { path: rel, verdict, kind: kindFor(rel), updated: statSync(p).mtime.toISOString() };
  });
  const approved = walk(join(floor, 'approved')).map((p) => relative(join(floor, 'approved'), p).split(sep).join('/'));
  const byStatus = { todo: [], doing: [], blocked: [], done: [] };
  for (const t of tasks) (byStatus[t.status] ?? byStatus.todo).push({ id: t.id, title: t.title, assignee: t.assignee ?? null, ask: (t.humanQA ?? []).find((q) => !q.a && !q.dismissedAt)?.q ?? null });
  return {
    agents,
    tasks: byStatus,
    ready: drafts.filter((d) => d.verdict === 'PASS'),
    needsWork: drafts.filter((d) => d.verdict === 'NEEDS WORK'),
    waiting: drafts.filter((d) => !d.verdict),
    approved,
    totals: { tokens: agents.reduce((s, a) => s + a.tokens, 0), usd: Number(agents.reduce((s, a) => s + a.usd, 0).toFixed(2)) }
  };
}
