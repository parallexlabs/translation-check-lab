/**
 * Digit normalization for multilingual number comparison.
 * Eastern Arabic (٠-٩) and Persian (۰-۹) digits map to Western 0-9.
 */

const EASTERN_ARABIC = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';

/**
 * @param {string} text
 * @returns {string}
 */
export function toWesternDigits(text) {
  let out = '';
  for (const ch of text) {
    const ea = EASTERN_ARABIC.indexOf(ch);
    if (ea >= 0) {
      out += String(ea);
      continue;
    }
    const pe = PERSIAN.indexOf(ch);
    if (pe >= 0) {
      out += String(pe);
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * Extract digit-only sequence from a phone or numeric string.
 * @param {string} text
 * @returns {string}
 */
export function phoneDigitsOnly(text) {
  return toWesternDigits(text).replace(/\D/g, '');
}

/**
 * Compare phone numbers digit by digit after normalization.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function phoneNumbersMatch(a, b) {
  const da = phoneDigitsOnly(a);
  const db = phoneDigitsOnly(b);
  if (!da || !db) return false;
  if (da.length !== db.length) return false;
  for (let i = 0; i < da.length; i += 1) {
    if (da[i] !== db[i]) return false;
  }
  return true;
}

/**
 * Normalize a number token for comparison.
 * Treats European decimal commas (2,5) like dots (2.5) and strips thousands commas (1,500).
 * @param {string} n
 * @returns {string}
 */
export function normNumberToken(n) {
  let s = toWesternDigits(n).replace(/\s/g, '').toLowerCase();
  const decimalComma = s.match(/^(\d+),(\d{1,2})$/);
  if (decimalComma) {
    s = `${decimalComma[1]}.${decimalComma[2]}`;
  } else {
    s = s.replace(/,/g, '');
  }
  return s.replace(/\.0+$/, '');
}

/**
 * @param {string[]} a
 * @param {string[]} b
 * @returns {string[]}
 */
export function missingNumbers(a, b) {
  const bn = b.map(normNumberToken);
  return a.filter((x) => !bn.includes(normNumberToken(x)));
}
