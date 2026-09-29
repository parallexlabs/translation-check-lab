import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createReviewRecord, reviewToMarkdown, isReviewComplete } from '../web/js/core/review-record.js';

describe('review record', () => {
  it('creates record with defaults', () => {
    const r = createReviewRecord();
    assert.equal(r.decision, 'do_not_send');
    assert.ok(r.timestamp);
  });

  it('is incomplete without required fields', () => {
    assert.equal(isReviewComplete(createReviewRecord()), false);
  });

  it('is complete when all fields filled', () => {
    const r = createReviewRecord({
      languageCompetence: 'Fluent in French and English',
      dialectCompetence: 'Canadian French',
      communityStatus: 'checked_with_community',
      checksCompleted: ['source', 'numbers', 'negation', 'contact', 'sms', 'bilingual'],
      pretestedWithCommunity: 'no',
      decision: 'approve',
    });
    assert.equal(isReviewComplete(r), true);
  });

  it('requires edited text for approve_edits', () => {
    const r = createReviewRecord({
      languageCompetence: 'Fluent',
      dialectCompetence: 'MSA',
      communityStatus: 'neither',
      checksCompleted: ['source', 'numbers', 'negation', 'contact', 'sms', 'bilingual'],
      pretestedWithCommunity: 'not_applicable',
      decision: 'approve_edits',
      editedText: '',
    });
    assert.equal(isReviewComplete(r), false);
  });

  it('exports markdown with disclaimer', () => {
    const md = reviewToMarkdown(createReviewRecord({
      languageCompetence: 'Bilingual comms',
      dialectCompetence: 'West African French',
      communityStatus: 'from_community',
      pretestedWithCommunity: 'yes',
      decision: 'approve',
      sourceText: 'Test source',
      translationText: 'Test trans',
      checksCompleted: ['Numbers verified'],
    }));
    assert.match(md, /Bilingual comms/);
    assert.match(md, /not an approval by the software/);
    assert.match(md, /Test source/);
  });
});
