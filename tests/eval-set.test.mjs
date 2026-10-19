import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEvalMessages, countDistinctScenarios } from '../eval/messages.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('round-trip evaluation set', () => {
  it('README names the set the evaluation uses, and the stored distinct counts are measured', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
    const start = readme.indexOf('\n## Evaluation\n');
    assert.ok(start >= 0, 'README has an Evaluation section');
    const next = readme.indexOf('\n## ', start + 1);
    const section = readme.slice(start, next === -1 ? undefined : next);
    assert.match(section, /eval\/messages\.js/, 'the Evaluation section names eval/messages.js');
    assert.doesNotMatch(section, /Tatoeba/, 'the round-trip set is not Tatoeba');

    assert.equal(countDistinctScenarios(['Boil water.', 'boil  WATER', 'Go to Site 9.']), 2);
    const results = JSON.parse(readFileSync(join(ROOT, 'eval', 'results.json'), 'utf8'));
    for (const [pair, r] of Object.entries(results.model || {})) {
      const lang = pair === 'fr-en' ? 'fr' : 'en';
      assert.equal(r.distinctScenarios, countDistinctScenarios(getEvalMessages(lang, r.n)), pair);
      assert.equal(r.distinctScenarios, r.n, `${pair}: every message is a distinct scenario`);
    }
  });
});
