'use strict';

// The E82 Studios office pack (offices/e82-studios/): every hire must pass the
// app's own import validator, and every goal must carry E82's house rules.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const loadTs = require('./load-ts.cjs');
const { validateHireManifest } = loadTs('src/shared/hire.ts');

const ROOT = path.resolve(__dirname, '..');
const OFFICE = path.join(ROOT, 'offices/e82-studios');
const HIRES = path.join(OFFICE, 'hires');
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/shared/modelCatalog.json'), 'utf8'));

const files = fs.readdirSync(HIRES).filter((f) => f.endsWith('.hire.json')).sort();
const hires = files.map((f) => ({ file: f, raw: JSON.parse(fs.readFileSync(path.join(HIRES, f), 'utf8')) }));

test('the office stays within the five-agent house maximum (Michael plus four hires)', () => {
  assert.equal(files.length, 4);
});

for (const { file, raw } of hires) {
  test(`${file} passes the app's hire validator with nothing dropped`, () => {
    const result = validateHireManifest(raw);
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.deepEqual(result.consentRequired ?? [], [], 'no write or secret MCP servers');
  });

  test(`${file} names a Claude model the app's catalog knows`, () => {
    assert.equal(raw.provider, 'claude');
    assert.ok(JSON.stringify(CATALOG).includes(`"${raw.model}"`), `${raw.model} missing from modelCatalog.json`);
  });

  test(`${file} carries E82's house rules in its goal`, () => {
    for (const phrase of ['you draft, a person sends', 'never from you', 'style-rules.md', 'India first', 'NO list']) {
      assert.ok(raw.goal.includes(phrase), `goal is missing "${phrase}"`);
    }
  });

  test(`${file} sets a token cap`, () => {
    assert.ok(Number.isInteger(raw.tokenCap) && raw.tokenCap > 0);
  });
}

test('every hire has a different character, so the floor shows distinct avatars', () => {
  const chars = hires.map((h) => h.raw.character);
  assert.equal(new Set(chars).size, chars.length);
  assert.ok(!chars.includes('michael'), 'Michael is the built-in coordinator');
});

test('the README lists every hire file and the brief exists', () => {
  const readme = fs.readFileSync(path.join(OFFICE, 'README.md'), 'utf8');
  for (const { raw } of hires) assert.ok(readme.includes(`**${raw.name}**`), `${raw.name} missing from README`);
  assert.ok(fs.existsSync(path.join(OFFICE, 'michael-brief.md')));
});
