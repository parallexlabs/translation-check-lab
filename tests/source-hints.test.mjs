import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSourceHints } from '../web/js/core/source-hints.js';

describe('source hints', () => {
  it('flags long sentences', () => {
    const words = Array(30).fill('word').join(' ');
    const hints = analyzeSourceHints(words + '.');
    assert.ok(hints.some((h) => h.type === 'long_sentence'));
  });

  it('flags sector acronyms', () => {
    const hints = analyzeSourceHints('NFI kits at the WASH point for IDPs.');
    assert.ok(hints.some((h) => h.type === 'acronym'));
  });

  it('flags passive voice', () => {
    const hints = analyzeSourceHints('Distribution is scheduled for Monday.');
    assert.ok(hints.some((h) => h.type === 'passive'));
  });
});
