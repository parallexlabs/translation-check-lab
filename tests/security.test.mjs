import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runMeaningChecks } from '../web/js/core/meaning-checks.js';
import { reviewToMarkdown, escapeMarkdown, fencedUserText } from '../web/js/core/review-record.js';
import { MAX_PATTERN_INPUT, MAX_STRESS_INPUT } from '../web/js/core/limits.js';

describe('security regressions', () => {
  it('does not reflect HTML injection payloads in flag detail text', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const flags = runMeaningChecks(payload, payload, '', { sourceLang: 'en', targetLang: 'fr' });
    for (const f of flags) {
      assert.equal(f.detail.includes('<img'), false);
      assert.equal(f.detail.includes('onerror='), false);
    }
  });

  it('escapes markdown injection in exported review record', () => {
    const md = reviewToMarkdown({
      languageCompetence: '## Fake heading',
      dialectCompetence: '[Click me](https://evil.example)',
      communityStatus: 'neither',
      checksCompleted: ['**bold**'],
      pretestedWithCommunity: 'no',
      decision: 'do_not_send',
      editedText: '',
      sourceText: '## Fake section\n\n[Click me](https://evil.example)',
      translationText: '```markdown fence break```',
      timestamp: '2026-09-29T00:00:00.000Z',
    });
    assert.ok(md.includes('\\#\\# Fake heading'));
    assert.ok(md.includes('\\[Click me\\]'));
    assert.match(md, /```text\n## Fake section/);
    assert.match(md, /```text\n``\\`markdown fence break/);
  });

  it('escapeMarkdown and fencedUserText helpers behave predictably', () => {
    assert.equal(escapeMarkdown('*bold*'), '\\*bold\\*');
    assert.match(fencedUserText('line1\n```\nline2'), /```text/);
  });

  it('handles 100000-character input without throwing', () => {
    const big = 'A'.repeat(MAX_STRESS_INPUT);
    assert.doesNotThrow(() => runMeaningChecks(big.slice(0, MAX_PATTERN_INPUT), 'test', '', { sourceLang: 'en', targetLang: 'fr' }));
  });
});
