/**
 * GSM 03.38 SMS character counting (ETSI TS 123 038 / 3GPP TS 23.038).
 * Character sets from Table 1 (default alphabet) and extension table.
 * @see https://www.etsi.org/deliver/etsi_ts/123000_123099/123038/17.00.00_60/ts_123038v170000p.pdf
 * @see https://www.3gpp.org/ftp/Specs/archive/23_series/23.038/
 */

/** @type {ReadonlySet<string>} GSM 7-bit default alphabet (Table 1) */
export const GSM7_BASIC = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
);

/** @type {ReadonlySet<string>} GSM 7-bit extension table (escape + char, counts as 2 septets) */
export const GSM7_EXTENDED = new Set('^{}\\[~]|€');

/** Typographic quotes and apostrophes that force UCS-2 (not in GSM 03.38). */
export const TYPOGRAPHIC_QUOTES = new Set([
  '\u2018', '\u2019', '\u201a', '\u201b', '\u201c', '\u201d', '\u201e', '\u201f',
  '\u00ab', '\u00bb', '\u2039', '\u203a', '\u02bc', '\u02bb', '\u0060',
]);

const GSM_SINGLE = 160;
const GSM_MULTI = 153;
const UCS2_SINGLE = 70;
const UCS2_MULTI = 67;

/**
 * @typedef {object} SmsCount
 * @property {'gsm7'|'ucs2'} encoding
 * @property {number} length Units counted (septets for GSM-7, code units for UCS-2)
 * @property {number} segments
 * @property {number} charsPerSegment
 * @property {string[]} nonGsmChars Characters forcing UCS-2
 * @property {{ char: string, index: number, reason: string }[]} highlights
 */

/**
 * @param {string} ch
 * @returns {string|null}
 */
function ucs2Reason(ch) {
  if (TYPOGRAPHIC_QUOTES.has(ch)) return 'typographic quote or apostrophe';
  if (GSM7_BASIC.has(ch) || GSM7_EXTENDED.has(ch)) return null;
  return 'outside GSM 03.38 basic and extension sets';
}

/**
 * Count effective GSM-7 length (extension chars count double).
 * @param {string} text
 * @returns {{ septets: number, nonGsm: string[], highlights: { char: string, index: number, reason: string }[] }}
 */
export function gsm7Length(text) {
  let septets = 0;
  const nonGsm = [];
  const highlights = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (GSM7_BASIC.has(ch)) {
      septets += 1;
    } else if (GSM7_EXTENDED.has(ch)) {
      septets += 2;
    } else {
      nonGsm.push(ch);
      const reason = ucs2Reason(ch);
      if (reason) highlights.push({ char: ch, index: i, reason });
    }
  }
  return { septets, nonGsm, highlights };
}

/**
 * @param {number} length
 * @param {number} single
 * @param {number} multi
 * @returns {number}
 */
function segmentCount(length, single, multi) {
  if (length === 0) return 0;
  if (length <= single) return 1;
  return Math.ceil(length / multi);
}

/**
 * Count SMS segments for a message.
 * @param {string} text
 * @returns {SmsCount}
 */
export function countSms(text) {
  const { septets, nonGsm, highlights } = gsm7Length(text);
  if (nonGsm.length === 0) {
    const segments = segmentCount(septets, GSM_SINGLE, GSM_MULTI);
    const charsPerSegment = segments <= 1 ? GSM_SINGLE : GSM_MULTI;
    return {
      encoding: 'gsm7',
      length: septets,
      segments,
      charsPerSegment,
      nonGsmChars: [],
      highlights: [],
    };
  }
  const length = text.length;
  const segments = segmentCount(length, UCS2_SINGLE, UCS2_MULTI);
  const charsPerSegment = segments <= 1 ? UCS2_SINGLE : UCS2_MULTI;
  const unique = [...new Set(nonGsm)];
  return {
    encoding: 'ucs2',
    length,
    segments,
    charsPerSegment,
    nonGsmChars: unique,
    highlights,
  };
}

/**
 * Whether a character forces UCS-2 encoding.
 * @param {string} ch
 * @returns {boolean}
 */
export function forcesUcs2(ch) {
  return !GSM7_BASIC.has(ch) && !GSM7_EXTENDED.has(ch);
}

/**
 * Build HTML with UCS-2 forcing characters highlighted.
 * @param {string} text
 * @returns {string}
 */
export function highlightUcs2Chars(text) {
  if (!text) return '';
  const { highlights } = gsm7Length(text);
  if (!highlights.length) return escapeHtml(text);
  const set = new Set(highlights.map((h) => h.index));
  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (set.has(i)) {
      const reason = highlights.find((h) => h.index === i)?.reason ?? 'non-GSM';
      out += `<mark class="ucs2-char" title="${escapeAttr(reason)}">${escapeHtml(ch)}</mark>`;
    } else {
      out += escapeHtml(ch);
    }
  }
  return out;
}

/**
 * Append text with UCS-2 forcing characters wrapped in mark elements.
 * @param {HTMLElement} container
 * @param {string} text
 */
export function appendUcs2Highlights(container, text) {
  container.replaceChildren();
  if (!text) return;
  const { highlights } = gsm7Length(text);
  if (!highlights.length) {
    container.append(document.createTextNode(text));
    return;
  }
  const set = new Set(highlights.map((h) => h.index));
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (set.has(i)) {
      const mark = document.createElement('mark');
      mark.className = 'ucs2-char';
      const reason = highlights.find((h) => h.index === i)?.reason ?? 'non-GSM';
      mark.title = reason;
      mark.textContent = ch;
      container.append(mark);
    } else {
      container.append(document.createTextNode(ch));
    }
  }
}

/**
 * Suggest replacing typographic quotes with plain ASCII quotes.
 * @param {string} text
 * @returns {{ hasTypographic: boolean, suggestion: string, chars: string[] }}
 */
export function suggestPlainQuotes(text) {
  const chars = [...new Set([...text].filter((c) => TYPOGRAPHIC_QUOTES.has(c)))];
  if (!chars.length) {
    return { hasTypographic: false, suggestion: text, chars: [] };
  }
  let suggestion = text;
  for (const ch of chars) {
    if (ch === '\u2018' || ch === '\u2019' || ch === '\u201a' || ch === '\u201b' || ch === '\u02bc' || ch === '\u0060') {
      suggestion = suggestion.split(ch).join("'");
    } else {
      suggestion = suggestion.split(ch).join('"');
    }
  }
  return { hasTypographic: true, suggestion, chars };
}

/**
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * @param {string} s
 * @returns {string}
 */
function escapeAttr(s) {
  return s.replace(/"/g, '&quot;');
}
