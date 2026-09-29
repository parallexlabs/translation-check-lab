import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareModelInput, getModelPair } from '../../web/js/core/models.js';

const RUN_MODEL_TESTS = process.env.RUN_MODEL_TESTS === '1';

test(
  'en-ar model uses >>ara<< token and produces Arabic output',
  { timeout: 600_000, skip: !RUN_MODEL_TESTS },
  async () => {
    const pair = getModelPair('en', 'ar');
    assert.ok(pair);
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowLocalModels = true;
    env.cacheDir = new URL('../../.eval-cache', import.meta.url).pathname;

    const pipe = await pipeline('translation', pair.id, {
      dtype: 'q8',
      revision: pair.revision,
    });

    const withToken = await pipe(prepareModelInput('Boil tap water for 3 minutes.', pair), { max_new_tokens: 64 });

    const outWith = withToken[0]?.translation_text ?? '';
    assert.ok(outWith.length > 0);
    assert.match(outWith, /[\u0600-\u06FF]/, 'expected Arabic script with >>ara<< token');
  },
);
