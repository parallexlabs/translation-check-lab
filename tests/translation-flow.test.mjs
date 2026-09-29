import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  translationFlowMode,
  shouldPreserveUserTranslation,
} from '../web/js/core/translation-flow.js';

describe('translation flow', () => {
  it('uses translate_and_back when translation field is empty', () => {
    assert.equal(translationFlowMode(''), 'translate_and_back');
    assert.equal(translationFlowMode('   '), 'translate_and_back');
    assert.equal(shouldPreserveUserTranslation(''), false);
  });

  it('uses back_only when user pasted a translation', () => {
    assert.equal(translationFlowMode('Bonjour'), 'back_only');
    assert.equal(shouldPreserveUserTranslation('Bonjour'), true);
  });
});
