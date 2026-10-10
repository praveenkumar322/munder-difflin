#!/usr/bin/env node
// Mechanical draft checks (banned words, opener length, numbers with no source).
// Dwight runs this first and only judges what code cannot. Zero tokens.
// Usage: node bin/check-draft.mjs drafts/outreach/acme.md [more files...]
// Exit code 0 when every file passes, 1 otherwise.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDraft, fencedList, kindFor } from './lib.mjs';

const floor = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const style = readFileSync(join(floor, 'n8n-e82Agents', 'operating', 'style-rules.md'), 'utf8');
const banned = fencedList(style, 'banned-everywhere');
const outreachBanned = fencedList(style, 'banned-in-outreach');
const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node bin/check-draft.mjs <draft.md>...'); process.exit(2); }
let failed = 0;
for (const f of files) {
  const r = checkDraft(readFileSync(f, 'utf8'), { banned, outreachBanned, kind: kindFor(f) });
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${f}`);
  for (const i of r.issues) console.log(`  - ${i.rule}: ${i.detail}`);
  if (!r.ok) failed++;
}
process.exit(failed ? 1 : 0);
