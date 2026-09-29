import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL_PAIRS, getModelPair, pairsFromLang, isRtl, prepareModelInput, formatBenchmark,
} from '../web/js/core/models.js';

describe('models', () => {
  it('has six verified pairs', () => {
    assert.equal(MODEL_PAIRS.length, 6);
  });

  it('each pair has revision and benchmark', () => {
    for (const p of MODEL_PAIRS) {
      assert.ok(p.revision.length >= 12);
      assert.ok(p.benchmark.bleu > 0);
      assert.ok(p.benchmark.cardUrl.startsWith('https://'));
      assert.ok(p.licenceVerified);
    }
  });

  it('en-ar has quality warning and target token', () => {
    const p = getModelPair('en', 'ar');
    assert.ok(p?.qualityWarning);
    assert.equal(p?.targetLangToken, '>>ara<<');
    assert.equal(p?.benchmark.bleu, 14.0);
  });

  it('prepareModelInput adds >>ara<< token', () => {
    const p = getModelPair('en', 'ar');
    assert.ok(p);
    assert.equal(prepareModelInput('Hello', p), '>>ara<< Hello');
    assert.equal(prepareModelInput('>>ara<< Hello', p), '>>ara<< Hello');
  });

  it('getModelPair finds en-fr', () => {
    const p = getModelPair('en', 'fr');
    assert.equal(p?.id, 'Xenova/opus-mt-en-fr');
    assert.equal(p?.benchmark.testset, 'Tatoeba.en.fr');
  });

  it('pairsFromLang returns targets', () => {
    assert.ok(pairsFromLang('en').length >= 3);
  });

  it('isRtl for Arabic', () => {
    assert.equal(isRtl('ar'), true);
    assert.equal(isRtl('fr'), false);
  });

  it('formatBenchmark quotes scores', () => {
    const p = getModelPair('en', 'fr');
    assert.ok(p);
    const s = formatBenchmark(p);
    assert.match(s, /BLEU 50.5/);
    assert.match(s, /chrF 0.672/);
  });
});
