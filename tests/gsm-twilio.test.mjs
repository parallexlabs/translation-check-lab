import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { countSms } from '../web/js/core/gsm.js';

/**
 * Cross-check against Twilio message-segment-calculator (MIT, TwilioDevEd).
 * @see https://github.com/TwilioDevEd/message-segment-calculator
 */
describe('GSM cross-check with Twilio segment calculator', () => {
  let SegmentedMessage;

  it('imports sms-segments-calculator', async () => {
    const mod = await import('sms-segments-calculator');
    SegmentedMessage = mod.SegmentedMessage;
    assert.ok(SegmentedMessage);
  });

  const vectors = [
    { text: 'Hello world', label: 'plain ASCII' },
    { text: 'A'.repeat(161), label: 'long GSM-7' },
    { text: "Café ouvert", label: 'GSM French accents' },
    { text: "l\u2019eau", label: 'typographic apostrophe' },
    { text: 'Entrée fermée à l\'hôpital', label: 'French circumflex' },
    { text: 'مرحبا', label: 'Arabic script' },
    { text: 'ê'.repeat(71), label: 'long UCS-2' },
  ];

  for (const { text, label } of vectors) {
    it(`matches Twilio segments for ${label}`, async () => {
      const mod = await import('sms-segments-calculator');
      const twilio = new mod.SegmentedMessage(text);
      const ours = countSms(text);
      const twilioEncoding = twilio.encodingName === 'GSM-7' ? 'gsm7' : 'ucs2';
      assert.equal(ours.encoding, twilioEncoding, `encoding mismatch for "${label}"`);
      assert.equal(ours.segments, twilio.segmentsCount, `segment count mismatch for "${label}"`);
    });
  }
});
