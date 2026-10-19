import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEvalMessages, countDistinctScenarios } from '../eval/messages.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('round-trip evaluation set', () => {
  it('README names the set the evaluation uses; stored model rows are measured and dated', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
    const start = readme.indexOf('\n## Evaluation\n');
    assert.ok(start >= 0, 'README has an Evaluation section');
    const next = readme.indexOf('\n## ', start + 1);
    const section = readme.slice(start, next === -1 ? undefined : next);
    assert.match(section, /eval\/messages\.js/, 'the Evaluation section names eval/messages.js');
    assert.doesNotMatch(section, /Tatoeba/, 'the round-trip set is not Tatoeba');

    assert.equal(countDistinctScenarios(['Boil water.', 'boil  WATER', 'Go to Site 9.']), 2);
    // eval/partial holds one stored row per pair, the rows results.json carries; tests/eval.test.mjs rewrites
    // results.json while it runs, so this test reads the partial files.
    const dir = join(ROOT, 'eval', 'partial');
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    assert.ok(files.length > 0, 'eval/partial holds the stored model rows');
    for (const f of files) {
      const pair = f.replace(/\.json$/, '');
      const r = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const lang = pair === 'fr-en' ? 'fr' : 'en';
      assert.equal(r.distinctScenarios, countDistinctScenarios(getEvalMessages(lang, r.n)), pair);
      assert.equal(r.distinctScenarios, r.n, `${pair}: every message is a distinct scenario`);
      assert.match(String(r.modelRunDate), /^\d{4}-\d{2}-\d{2}$/, `${pair}: the model row carries its run date`);
    }
  });
});
