/**
 * Practice mode scoring against answer key.
 */

/** @typedef {import('./meaning-checks.js').CheckCategory} CheckCategory */

/**
 * @typedef {object} PracticeItem
 * @property {string} id
 * @property {'en-fr'|'fr-en'} direction
 * @property {string} topic
 * @property {string} source
 * @property {string} translation
 * @property {boolean} illustrative
 * @property {boolean} safeToSend
 * @property {CheckCategory[]} errors
 * @property {string} explanation
 */

/**
 * @typedef {object} PracticeAnswer
 * @property {CheckCategory[]} selectedErrors
 * @property {boolean} safeToSend
 */

/**
 * @param {PracticeItem} item
 * @param {PracticeAnswer} answer
 * @returns {{ errorScore: number, safetyCorrect: boolean, missed: CheckCategory[], falsePos: CheckCategory[] }}
 */
export function scorePracticeItem(item, answer) {
  const expected = new Set(item.errors);
  const selected = new Set(answer.selectedErrors);
  const missed = [...expected].filter((e) => !selected.has(e));
  const falsePos = [...selected].filter((e) => !expected.has(e));
  const hits = [...expected].filter((e) => selected.has(e)).length;
  const errorScore = expected.size === 0 && selected.size === 0
    ? 1
    : expected.size === 0
      ? 0
      : hits / expected.size;
  return {
    errorScore,
    safetyCorrect: answer.safeToSend === item.safeToSend,
    missed,
    falsePos,
  };
}

/**
 * Compute precision/recall by error category across practice set.
 * @param {PracticeItem[]} items
 * @param {Map<string, PracticeAnswer>} answers
 * @returns {Record<string, { tp: number, fp: number, fn: number, precision: number, recall: number, n: number }>}
 */
export function evalPracticeByCategory(items, answers) {
  const cats = ['numbers', 'times', 'contact', 'negation', 'modality', 'names', 'untranslated', 'length', 'instructions'];
  const stats = {};
  for (const cat of cats) {
    stats[cat] = { tp: 0, fp: 0, fn: 0, precision: 0, recall: 0, n: 0 };
  }
  for (const item of items) {
    const ans = answers.get(item.id);
    if (!ans) continue;
    for (const cat of cats) {
      const inKey = item.errors.includes(cat);
      const selected = ans.selectedErrors.includes(cat);
      if (inKey) stats[cat].fn += selected ? 0 : 1;
      if (selected && inKey) stats[cat].tp += 1;
      if (selected && !inKey) stats[cat].fp += 1;
      if (inKey) stats[cat].n += 1;
    }
  }
  for (const cat of cats) {
    const s = stats[cat];
    s.precision = s.tp + s.fp > 0 ? s.tp / (s.tp + s.fp) : (s.n === 0 ? 1 : 0);
    s.recall = s.tp + s.fn > 0 ? s.tp / (s.tp + s.fn) : (s.n === 0 ? 1 : 0);
  }
  return stats;
}

/**
 * Run deterministic checks and compare to practice answer key.
 * @param {PracticeItem[]} items
 * @param {typeof import('./meaning-checks.js').runMeaningChecks} runChecks
 * @returns {{ byCategory: Record<string, object>, overall: { precision: number, recall: number, n: number } }}
 */
export function evalDeterministicChecks(items, runChecks) {
  const cats = ['numbers', 'times', 'contact', 'negation', 'modality', 'names', 'untranslated', 'length', 'instructions'];
  const stats = {};
  for (const cat of cats) {
    stats[cat] = { tp: 0, fp: 0, fn: 0 };
  }
  for (const item of items) {
    const [srcLang, tgtLang] = item.direction.split('-');
    const flags = runChecks(item.source, item.translation, '', { sourceLang: srcLang, targetLang: tgtLang });
    const detected = new Set(flags.map((f) => f.category));
    for (const cat of cats) {
      const inKey = item.errors.includes(cat);
      const found = detected.has(cat);
      if (found && inKey) stats[cat].tp += 1;
      if (found && !inKey) stats[cat].fp += 1;
      if (!found && inKey) stats[cat].fn += 1;
    }
  }
  const byCategory = {};
  let totalTp = 0;
  let totalFp = 0;
  let totalFn = 0;
  let totalN = 0;
  for (const cat of cats) {
    const s = stats[cat];
    const n = items.filter((i) => i.errors.includes(cat)).length;
    byCategory[cat] = {
      ...s,
      n,
      precision: s.tp + s.fp > 0 ? s.tp / (s.tp + s.fp) : (n === 0 ? 1 : 0),
      recall: s.tp + s.fn > 0 ? s.tp / (s.tp + s.fn) : (n === 0 ? 1 : 0),
    };
    totalTp += s.tp;
    totalFp += s.fp;
    totalFn += s.fn;
    totalN += n;
  }
  return {
    byCategory,
    overall: {
      precision: totalTp + totalFp > 0 ? totalTp / (totalTp + totalFp) : 1,
      recall: totalTp + totalFn > 0 ? totalTp / (totalTp + totalFn) : 1,
      n: totalN,
      uniqueItems: items.length,
    },
  };
}
