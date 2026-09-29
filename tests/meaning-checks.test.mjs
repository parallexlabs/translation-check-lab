import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  runMeaningChecks,
  roundTripPreserved,
  extractCriticalTokens,
  countNegations,
  COGNATES_EN_FR,
  ACTION_VERBS_EN,
  skipsTranslationInstructionCheck,
} from '../web/js/core/meaning-checks.js';
import { evalDeterministicChecks } from '../web/js/core/practice.js';
import { readFileSync } from 'node:fs';

const practice = JSON.parse(readFileSync(new URL('../web/data/practice.json', import.meta.url), 'utf8'));

describe('meaning checks', () => {
  it('flags missing phone number', () => {
    const src = 'Call 1-800-555-0199 for help.';
    const trans = 'Appelez pour de l\'aide.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'en', targetLang: 'fr' });
    assert.ok(flags.some((f) => f.category === 'contact'));
  });

  it('flags negation loss', () => {
    const src = 'Do not use Road B.';
    const trans = 'Utilisez la route B.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'en', targetLang: 'fr' });
    assert.ok(flags.some((f) => f.category === 'negation'));
  });

  it('flags ambiguous numeric slash date in source', () => {
    const src = 'Distribution on 03/04 at 9:00.';
    const trans = 'Distribution le 3 avril à 9 h.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'en', targetLang: 'fr' });
    assert.ok(flags.some((f) => f.category === 'times' && f.detail.includes('Ambiguous')));
  });

  it('flags ambiguous dash and dot dates in source', () => {
    for (const src of ['Distribution on 04-04.', 'Distribution on 04.04.']) {
      const flags = runMeaningChecks(src, 'Distribution.', '', { sourceLang: 'en', targetLang: 'fr' });
      assert.ok(flags.some((f) => f.category === 'times' && f.detail.includes('Ambiguous')), src);
    }
  });

  it('flags number change in currency amount', () => {
    const src = 'Cash assistance: 250 USD per household.';
    const trans = 'Aide en espèces : 25 USD par ménage.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'en', targetLang: 'fr' });
    assert.ok(flags.some((f) => f.category === 'numbers'));
  });

  it('does not false-flag minutes as untranslated en-fr', () => {
    const src = 'Boil tap water for 10 minutes before drinking.';
    const trans = 'Faites bouillir l\'eau du robinet pendant 10 minutes avant de boire.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'en', targetLang: 'fr' });
    assert.equal(flags.some((f) => f.category === 'untranslated' && f.value === 'minutes'), false);
    assert.ok(COGNATES_EN_FR.has('minutes'));
  });

  it('does not false-flag Well 12 when back-translation lowercases Well', () => {
    const src = 'Do not drink water from Well 12.';
    const trans = 'Ne buvez pas l\'eau du puits 12.';
    const back = 'Do not drink water from the well 12.';
    const flags = runMeaningChecks(src, trans, back, { sourceLang: 'en', targetLang: 'fr' });
    assert.equal(flags.some((f) => f.category === 'names' && f.value === 'Well'), false);
  });

  it('flags missing boil instruction in back-translation', () => {
    const src = 'Do not drink water from Well 12. Boil tap water for 10 minutes. Food distribution on 03/04 at 14:00 at Site 7. Call 0800-77-88-90 for help.';
    const trans = 'Ne buvez pas l\'eau du puits 12. Eau du robinet pendant 10 minutes. Distribution alimentaire le 03/04 à 14 h au site 7. Composez le 0800-77-88-90 pour de l\'aide.';
    const back = 'Do not drink water from the well 12. Tap water for 10 minutes. Food distribution on 03/04 to 14:00 at site 7. Call 0800-77-88-90 for help.';
    const flags = runMeaningChecks(src, trans, back, { sourceLang: 'en', targetLang: 'fr' });
    assert.ok(flags.some((f) => f.category === 'instructions' && f.detail.includes("'boil'") && f.detail.includes('back-translation')));
  });

  it('lists required English and French action verbs in core code', () => {
    assert.ok(ACTION_VERBS_EN.includes('boil'));
    assert.ok(ACTION_VERBS_EN.includes('call'));
  });

  it('does not treat L\'eau est disponible as French negation', () => {
    assert.equal(countNegations("L'eau est disponible.", 'fr'), 0);
  });

  it('counts French ne ... pas negation', () => {
    assert.ok(countNegations('Ne buvez pas.', 'fr') >= 1);
    assert.ok(countNegations('N\'utilisez pas la route B.', 'fr') >= 1);
  });

  it('extractCriticalTokens captures negation count', () => {
    const t = extractCriticalTokens('Do not go. Never return.', 'en');
    assert.ok(t.negationCount >= 2);
  });

  it('roundTripPreserved fails when number lost', () => {
    const src = 'Boil water for 3 minutes.';
    const back = 'Boil water for five minutes.';
    assert.equal(roundTripPreserved(src, back, 'en'), false);
  });

  it('roundTripPreserved passes when preserved', () => {
    const src = 'Call 0800-77-88-99 before 15:00.';
    const back = 'Call 0800-77-88-99 before 15:00.';
    assert.equal(roundTripPreserved(src, back, 'en'), true);
  });

  it('matches Eastern Arabic digits in phone numbers', () => {
    const src = 'Call 0800-77-88-99 for help.';
    const trans = 'اتصل على ٠٨٠٠-٧٧-٨٨-٩٩ للمساعدة.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'en', targetLang: 'ar' });
    assert.equal(flags.some((f) => f.category === 'contact'), false);
  });

  it('flags phone when Eastern Arabic digits differ', () => {
    const src = 'Call 0800-77-88-99 for help.';
    const trans = 'اتصل على ٠٨٠٠-٧٧-٨٨-٩٠ للمساعدة.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'en', targetLang: 'ar' });
    assert.ok(flags.some((f) => f.category === 'contact'));
  });

  it('practice answer key numbers category has non-zero recall', () => {
    const det = evalDeterministicChecks(practice.items, runMeaningChecks);
    assert.ok(det.byCategory.numbers.n >= 1);
    assert.ok(det.byCategory.numbers.recall > 0);
    assert.ok(det.byCategory.numbers.precision > 0);
  });

  it('does not false-flag Spanish instruction verbs en-es', () => {
    const src = 'Boil water before drinking.';
    const trans = 'Hierva el agua antes de beberla.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'en', targetLang: 'es' });
    assert.equal(flags.some((f) => f.category === 'instructions'), false);
  });

  it('does not false-flag Arabic translation-side instruction verbs en-ar', () => {
    const src = 'Boil water before drinking.';
    const trans = 'اغلوا الماء قبل الشرب.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'en', targetLang: 'ar' });
    assert.equal(flags.some((f) => f.category === 'instructions' && f.compare === 'source_vs_translation'), false);
    assert.equal(skipsTranslationInstructionCheck('ar'), true);
  });

  it('flags missing French imperatives fr-en', () => {
    const src = 'Évacuez maintenant. Allez au point de rassemblement.';
    const trans = 'Stay home now.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'fr', targetLang: 'en' });
    const instructionFlags = flags.filter((f) => f.category === 'instructions');
    assert.ok(instructionFlags.some((f) => f.value === 'evacuate'));
    assert.ok(instructionFlags.some((f) => f.value === 'go'));
  });

  it('does not flag French imperatives as proper names', () => {
    const src = 'Évacuez maintenant. Allez au point de rassemblement.';
    const trans = 'Stay home now.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'fr', targetLang: 'en' });
    assert.equal(flags.some((f) => f.category === 'names' && f.value === 'Allez'), false);
  });

  it('does not false-flag decimal litres en-fr', () => {
    const src = 'Take 2.5 litres of water per person.';
    const trans = 'Prenez 2,5 litres d\'eau par personne.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'en', targetLang: 'fr' });
    assert.equal(flags.length, 0);
  });

  it('does not false-flag equivalent morning times en-fr', () => {
    const src = 'Distribution starts at 9:00 a.m. on Monday.';
    const trans = 'La distribution commence à 9 h lundi.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'en', targetLang: 'fr' });
    assert.equal(flags.some((f) => f.category === 'times'), false);
  });

  it('still flags different morning times en-fr', () => {
    const src = 'Distribution starts at 9:00 a.m. on Monday.';
    const trans = 'La distribution commence à 10 h lundi.';
    const flags = runMeaningChecks(src, trans, '', { sourceLang: 'en', targetLang: 'fr' });
    assert.ok(flags.some((f) => f.category === 'times'));
  });

  it('roundTripPreserved uses back-translation language verb forms', () => {
    const src = 'Évacuez maintenant. Allez au point de rassemblement.';
    const back = 'Évacuez immédiatement. Allez au point de rassemblement.';
    assert.equal(roundTripPreserved(src, back, 'fr', 'fr'), true);
    const badBack = 'Stay home now.';
    assert.equal(roundTripPreserved(src, badBack, 'fr', 'en'), false);
  });
});
