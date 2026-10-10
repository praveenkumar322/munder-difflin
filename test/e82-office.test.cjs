'use strict';

// The E82 Studios office pack (offices/e82-studios/): every hire passes the app's
// own import validator and stays token-lean, the seeded board is valid, and the
// floor scripts (brief, draft checks, dashboard summary) do what they say.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const loadTs = require('./load-ts.cjs');
const { validateHireManifest } = loadTs('src/shared/hire.ts');

const ROOT = path.resolve(__dirname, '..');
const OFFICE = path.join(ROOT, 'offices/e82-studios');
const FLOOR = path.join(OFFICE, 'floor');
const CATALOG = fs.readFileSync(path.join(ROOT, 'src/shared/modelCatalog.json'), 'utf8');
const lib = () => import(pathToFileURL(path.join(FLOOR, 'bin/lib.mjs')).href);

const readHires = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith('.hire.json')).sort()
  .map((f) => ({ file: f, raw: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
const active = readHires(path.join(OFFICE, 'hires'));
const later = readHires(path.join(OFFICE, 'hires/later'));

test('the office stays within the five-agent house maximum (Michael plus four hires)', () => {
  assert.equal(active.length, 4);
});

for (const { file, raw } of [...active, ...later]) {
  test(`${file} passes the app's hire validator with no consent-tier tools`, () => {
    const result = validateHireManifest(raw);
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.deepEqual(result.consentRequired ?? [], []);
  });

  test(`${file} is token-lean: catalog model, short goal, turn limit and cap`, () => {
    assert.equal(raw.provider, 'claude');
    assert.ok(CATALOG.includes(`"${raw.model}"`), `${raw.model} missing from modelCatalog.json`);
    assert.ok(!/opus/.test(raw.model), 'no desk defaults to the most expensive model');
    // The goal rides in every session's context, so it stays short; shared rules live in CLAUDE.md.
    assert.ok(raw.goal.length <= 1000, `goal is ${raw.goal.length} chars`);
    assert.ok(raw.goal.includes('CLAUDE.md') && raw.goal.includes('BRIEF.md'));
    const turns = Number(raw.commandFlags[raw.commandFlags.indexOf('--max-turns') + 1]);
    assert.ok(turns > 0 && turns <= 50, `max turns ${turns}`);
    assert.ok(Number.isInteger(raw.tokenCap) && raw.tokenCap > 0 && raw.tokenCap <= 1_500_000);
  });
}

test('every hire has its own avatar and Michael stays the built-in coordinator', () => {
  const chars = [...active, ...later].map((h) => h.raw.character);
  assert.equal(new Set(chars).size, chars.length);
  assert.ok(!chars.includes('michael'));
});

test('the floor CLAUDE.md carries the house rules once for every desk', () => {
  const md = fs.readFileSync(path.join(FLOOR, 'CLAUDE.md'), 'utf8');
  for (const phrase of ['You draft, a person sends', 'Never make one up', 'India first', 'NO list', 'tokens']) {
    assert.ok(md.includes(phrase), `CLAUDE.md is missing "${phrase}"`);
  }
});

test('the seeded board is valid: known keys, assignees, dependencies and asks', () => {
  const { tasks } = JSON.parse(fs.readFileSync(path.join(FLOOR, 'hive/tasks.json'), 'utf8'));
  const ids = new Set(tasks.map((t) => t.id));
  const agents = new Set(['god', ...active.map((h) => h.raw.name.toLowerCase())]);
  assert.equal(ids.size, tasks.length);
  for (const t of tasks) {
    assert.match(t.id, /^E82-\d+$/);
    assert.ok(['todo', 'doing', 'blocked', 'done'].includes(t.status), t.id);
    if (t.assignee) assert.ok(agents.has(t.assignee), `${t.id} assignee ${t.assignee}`);
    for (const d of t.dependsOn) assert.ok(ids.has(d), `${t.id} depends on unknown ${d}`);
    if (t.status === 'blocked' && !t.dependsOn.length) assert.ok(t.humanQA?.[0]?.q, `${t.id} is blocked with no ask`);
  }
  const memory = fs.readFileSync(path.join(FLOOR, 'hive/agents/god/memory.md'), 'utf8');
  assert.ok(memory.includes('## Standing brief'));
});

const STYLE = '```banned-everywhere\nleverage\nsolutions\n```\n```banned-in-outreach\nAI\nautomate\n```\n## Length\n| Output | Length |\n|---|---|\n| Cold message | Under 60 words |\n';

test('checkDraft flags banned words, outreach words, long openers and unsourced numbers', async () => {
  const { checkDraft, fencedList, kindFor } = await lib();
  const banned = fencedList(STYLE, 'banned-everywhere');
  const outreachBanned = fencedList(STYLE, 'banned-in-outreach');
  assert.deepEqual(outreachBanned, ['AI', 'automate']);
  assert.equal(kindFor('drafts/outreach/acme.md'), 'outreach');
  assert.equal(kindFor('drafts/sales/acme/sow.md'), 'general');

  const bad = '## Processes\nThey lose 30% of leads. [est: none]\nMore ₹40,000 a month.\n\n## Opener\nWe automate it with AI solutions.\n';
  const r = checkDraft(bad, { banned, outreachBanned, kind: 'outreach' });
  const rules = r.issues.map((i) => `${i.rule}:${i.detail.split(':')[0]}`);
  assert.equal(r.ok, false);
  assert.ok(rules.includes('banned-word:solutions'));
  assert.ok(rules.includes('outreach-word:AI'));
  assert.ok(rules.includes('outreach-word:automate'));
  assert.equal(r.issues.filter((i) => i.rule === 'unsourced-number').length, 1, 'tagged line passes, untagged fails');

  const good = '## Processes\nCalls after 7pm go to voicemail.\n\n## Opener\nSaw your three branches close the phones at seven. Who calls back the evening enquiries?\n';
  assert.deepEqual(checkDraft(good, { banned, outreachBanned, kind: 'outreach' }).issues, []);
  // "AI" is matched as a word, case-sensitively: "said" and "aim" never trip it.
  assert.ok(checkDraft('## Opener\nShe said our aim is plain.\n', { outreachBanned, kind: 'outreach' }).ok);
  const long = '## Opener\n' + 'word '.repeat(61);
  assert.equal(checkDraft(long, { kind: 'outreach' }).issues[0].rule, 'too-long');
});

test('buildBrief keeps open decisions, drops decided ones, and lists the words', async () => {
  const { buildBrief, openDecisions } = await lib();
  const context = '## Open decisions\n| # | Decision | Options | Blocking |\n|---|---|---|---|\n| 1 | **Niche** | A or B | Outreach |\n| 8 | ~~Track~~ | **Decided** | — |\n\n## Decisions log\n- **9 Oct:** new price.\n- ~~**8 Oct:** old price.~~\n';
  const quarter = '## The one thing\n**Book calls.**\n\n## Market\nIndia.\n\n## YES this quarter\n- Audit\n\n## NO this quarter\n- New tools\n';
  assert.deepEqual(openDecisions(context).map((d) => d.n), [1]);
  const brief = buildBrief({ quarter, context, style: STYLE, generatedOn: '2026-10-10' });
  assert.match(brief, /#1 Niche/);
  assert.doesNotMatch(brief, /#8|old price/);
  assert.match(brief, /9 Oct: new price/);
  assert.match(brief, /Never in client text: leverage, solutions/);
  assert.match(brief, /Cold message: Under 60 words/);
});

test('the brief built from the real operating files stays about one page', async (t) => {
  const ops = path.join(ROOT, '..', 'n8n-e82Agents', 'operating');
  if (!fs.existsSync(ops)) return t.skip('n8n-e82Agents is not cloned next to this repo');
  const { buildBrief } = await lib();
  const read = (f) => fs.readFileSync(path.join(ops, f), 'utf8');
  const brief = buildBrief({ quarter: read('quarter.md'), context: read('operating-context.md'), style: read('style-rules.md'), generatedOn: 'x' });
  const words = brief.split(/\s+/).length;
  assert.ok(words > 200 && words < 900, `${words} words`);
});

test('summarise reads the floor: agents with live tokens, board columns, draft verdicts', async () => {
  const { summarise } = await lib();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e82-floor-'));
  const w = (rel, body) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
  w('hive/registry.json', JSON.stringify({ agents: { god: { name: 'Michael', isGod: true }, phyllis: { name: 'Phyllis' }, old: { name: 'Old', archived: true } } }));
  w('hive/fleet.json', JSON.stringify({ agents: [{ id: 'phyllis', tokens: 5000, usd: 0.25, inboxBacklog: 2, lastTool: 'WebFetch' }] }));
  w('hive/tasks.json', JSON.stringify({ tasks: [{ id: 'E82-1', title: 'a', status: 'doing', assignee: 'phyllis' }, { id: 'E82-2', title: 'b', status: 'blocked', humanQA: [{ q: 'pick?' }] }] }));
  w('drafts/outreach/a.md', 'x'); w('reviews/outreach/a.md', 'Verdict: PASS\n');
  w('drafts/outreach/b.md', 'x'); w('reviews/outreach/b.md', 'Verdict: NEEDS WORK\n');
  w('drafts/outreach/c.md', 'x'); w('approved/outreach/d.md', 'x');
  const s = summarise(dir, { phyllis: 400000 });
  assert.deepEqual(s.agents.map((a) => a.id), ['god', 'phyllis']);
  assert.equal(s.agents[1].tokens, 5000);
  assert.equal(s.agents[1].inbox, 2);
  assert.equal(s.agents[1].cap, 400000);
  assert.equal(s.tasks.doing[0].id, 'E82-1');
  assert.equal(s.tasks.blocked[0].ask, 'pick?');
  assert.deepEqual(s.ready.map((d) => d.path), ['outreach/a.md']);
  assert.deepEqual(s.needsWork.map((d) => d.path), ['outreach/b.md']);
  assert.deepEqual(s.waiting.map((d) => d.path), ['outreach/c.md']);
  assert.deepEqual(s.approved, ['outreach/d.md']);
  assert.equal(s.totals.usd, 0.25);
  fs.rmSync(dir, { recursive: true, force: true });
});
