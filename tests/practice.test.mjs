import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scorePracticeItem, evalDeterministicChecks, evalPracticeByCategory } from '../web/js/core/practice.js';
import { runMeaningChecks } from '../web/js/core/meaning-checks.js';

const practice = JSON.parse(readFileSync(new URL('../web/data/practice.json', import.meta.url), 'utf8'));

describe('practice data', () => {
  it('has at least 12 items', () => {
    assert.ok(practice.items.length >= 12);
  });

  it('has at least 6 en-fr and 6 fr-en', () => {
    const enFr = practice.items.filter((i) => i.direction === 'en-fr').length;
    const frEn = practice.items.filter((i) => i.direction === 'fr-en').length;
    assert.ok(enFr >= 6);
    assert.ok(frEn >= 6);
  });

  it('all items marked illustrative', () => {
    assert.ok(practice.items.every((i) => i.illustrative === true));
  });
});

describe('practice scoring', () => {
  it('scores perfect answer on item with no errors', () => {
    const item = practice.items.find((i) => i.id === 'p02');
    const score = scorePracticeItem(item, { selectedErrors: [], safeToSend: true });
    assert.equal(score.safetyCorrect, true);
    assert.equal(score.errorScore, 1);
  });
});

describe('deterministic eval on practice', () => {
  it('runs without crash', () => {
    const result = evalDeterministicChecks(practice.items, runMeaningChecks);
    assert.ok(result.overall.uniqueItems >= 12);
  });
});

describe('evalPracticeByCategory', () => {
  it('computes stats from answers map', () => {
    const answers = new Map([
      ['p01', { selectedErrors: ['negation'], safeToSend: false }],
      ['p06', { selectedErrors: ['negation'], safeToSend: false }],
    ]);
    const stats = evalPracticeByCategory(practice.items, answers);
    assert.ok(stats.negation.tp >= 1);
  });
});
