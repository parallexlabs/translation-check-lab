import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  countSms, gsm7Length, forcesUcs2, GSM7_BASIC, highlightUcs2Chars, suggestPlainQuotes, TYPOGRAPHIC_QUOTES,
} from '../web/js/core/gsm.js';

describe('GSM 03.38 SMS counting', () => {
  it('counts plain ASCII as GSM-7 single segment', () => {
    const text = 'Hello world';
    const r = countSms(text);
    assert.equal(r.encoding, 'gsm7');
    assert.equal(r.segments, 1);
    assert.equal(r.length, text.length);
  });

  it('uses 153 septets per segment for long GSM-7', () => {
    const text = 'A'.repeat(161);
    const r = countSms(text);
    assert.equal(r.encoding, 'gsm7');
    assert.equal(r.segments, 2);
  });

  it('forces UCS-2 for French circumflex letters', () => {
    const text = 'Entrée fermée à l\'hôpital';
    const r = countSms(text);
    assert.equal(r.encoding, 'ucs2');
    assert.ok(r.nonGsmChars.some((c) => ['ê', 'ô'].includes(c)));
  });

  it('allows GSM French accents in basic set', () => {
    assert.ok(GSM7_BASIC.has('é'));
    assert.ok(GSM7_BASIC.has('à'));
    const text = 'Café ouvert';
    const r = countSms(text);
    assert.equal(r.encoding, 'gsm7');
  });

  it('counts extension characters as 2 septets', () => {
    const { septets } = gsm7Length('{}');
    assert.equal(septets, 4);
  });

  it('forces UCS-2 for Arabic script', () => {
    const text = 'مرحبا';
    const r = countSms(text);
    assert.equal(r.encoding, 'ucs2');
    assert.equal(r.segments, 1);
    assert.equal(r.length, text.length);
  });

  it('UCS-2 multipart uses 67 chars per segment', () => {
    const text = 'ê'.repeat(71);
    const r = countSms(text);
    assert.equal(r.encoding, 'ucs2');
    assert.equal(r.segments, 2);
  });

  it('forcesUcs2 detects non-GSM chars', () => {
    assert.equal(forcesUcs2('â'), true);
    assert.equal(forcesUcs2('a'), false);
  });

  it('empty string has zero segments', () => {
    const r = countSms('');
    assert.equal(r.segments, 0);
  });

  it('forces UCS-2 for typographic apostrophe in French', () => {
    const text = 'l\u2019eau';
    const r = countSms(text);
    assert.equal(r.encoding, 'ucs2');
    assert.ok(TYPOGRAPHIC_QUOTES.has('\u2019'));
  });

  it('highlightUcs2Chars marks non-GSM characters', () => {
    const html = highlightUcs2Chars('l\u2019eau');
    assert.match(html, /<mark class="ucs2-char"/);
  });

  it('suggestPlainQuotes offers ASCII replacement', () => {
    const s = suggestPlainQuotes('l\u2019eau');
    assert.equal(s.hasTypographic, true);
    assert.equal(s.suggestion, "l'eau");
  });
});
