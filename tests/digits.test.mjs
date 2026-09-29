import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toWesternDigits, phoneDigitsOnly, phoneNumbersMatch, normNumberToken } from '../web/js/core/digits.js';

describe('digit normalization', () => {
  it('converts Eastern Arabic digits', () => {
    assert.equal(toWesternDigits('العدد ١٢٣'), 'العدد 123');
  });

  it('converts Persian digits', () => {
    assert.equal(toWesternDigits('شماره ۰۹۱۲'), 'شماره 0912');
  });

  it('compares phone numbers digit by digit', () => {
    assert.equal(phoneNumbersMatch('0800-77-88-99', '٠٨٠٠ ٧٧ ٨٨ ٩٩'), true);
    assert.equal(phoneNumbersMatch('0800-77-88-99', '0800-77-88-90'), false);
  });

  it('phoneDigitsOnly strips formatting', () => {
    assert.equal(phoneDigitsOnly('+1 (800) 555-0199'), '18005550199');
  });

  it('normNumberToken normalizes commas', () => {
    assert.equal(normNumberToken('1,500'), normNumberToken('1500'));
  });

  it('normNumberToken treats European decimal comma like dot', () => {
    assert.equal(normNumberToken('2,5'), normNumberToken('2.5'));
  });
});
