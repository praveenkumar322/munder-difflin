#!/usr/bin/env node
// Writes BRIEF.md (one page) from the n8n repo's operating files, so agents read
// one short file instead of five long ones. Code, not a model: zero tokens.
// Usage: node bin/build-brief.mjs [floorDir]   (default: the folder above bin/)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBrief } from './lib.mjs';

const floor = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const ops = join(floor, 'n8n-e82Agents', 'operating');
const read = (f) => readFileSync(join(ops, f), 'utf8');
const brief = buildBrief({
  quarter: read('quarter.md'),
  context: read('operating-context.md'),
  style: read('style-rules.md'),
  generatedOn: new Date().toISOString().slice(0, 10)
});
writeFileSync(join(floor, 'BRIEF.md'), brief, 'utf8');
console.log(`BRIEF.md written (${brief.split(/\s+/).length} words)`);
