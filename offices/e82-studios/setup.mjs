#!/usr/bin/env node
// Sets up (or updates) the E82 office floor folder. Safe to re-run:
//  - clones the two E82 repos if they are missing (never pulls or resets them);
//  - always refreshes bin/ (code) and office.json (token caps from the hires);
//  - writes CLAUDE.md, the seeded board, tasks and Michael's memory ONLY if absent,
//    so it never overwrites work the office has done;
//  - rebuilds BRIEF.md from the operating files.
// Usage: node offices/e82-studios/setup.mjs [floorDir]   (default ~/E82)
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const template = join(here, 'floor');
const arg = process.argv[2];
const floor = resolve(arg ? arg.replace(/^~(?=$|[\\/])/, homedir()) : join(homedir(), 'E82'));
const REPOS = {
  'n8n-e82Agents': 'https://github.com/praveenkumar322/n8n-e82Agents.git',
  'AI-Studio---E82-Studios': 'https://github.com/praveenkumar322/AI-Studio---E82-Studios.git'
};

mkdirSync(floor, { recursive: true });
for (const [dir, url] of Object.entries(REPOS)) {
  if (existsSync(join(floor, dir))) { console.log(`ok     ${dir} (already cloned)`); continue; }
  console.log(`clone  ${dir}`);
  execFileSync('git', ['clone', url, join(floor, dir)], { stdio: 'inherit' });
}

function files(dir) {
  return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));
}
for (const src of files(template)) {
  const rel = relative(template, src);
  const dest = join(floor, rel);
  const isCode = rel.startsWith('bin');
  if (existsSync(dest) && !isCode) { console.log(`keep   ${rel}`); continue; }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`${isCode ? 'update' : 'write '} ${rel}`);
}

// Token caps per agent id (the hive id is the lower-cased name) for the dashboard.
const caps = {};
const hireDirs = [join(here, 'hires'), join(here, 'hires', 'later')];
for (const d of hireDirs) for (const f of readdirSync(d).filter((n) => n.endsWith('.hire.json'))) {
  const m = JSON.parse(readFileSync(join(d, f), 'utf8'));
  caps[m.name.toLowerCase()] = m.tokenCap;
}
writeFileSync(join(floor, 'office.json'), JSON.stringify({ caps }, null, 2) + '\n');
console.log('update office.json');

execFileSync(process.execPath, [join(floor, 'bin', 'build-brief.mjs'), floor], { stdio: 'inherit' });

console.log(`
Floor ready at ${floor}
Next:
  1. Munder Difflin: File > New Floor > pick ${floor}
  2. Add agent > import hire... for each file in ${join(here, 'hires')}
  3. Tell Michael: "Start the week: work the board."
  4. Watch it: node ${join(floor, 'bin', 'dashboard.mjs')}  (then open http://127.0.0.1:4782)`);
