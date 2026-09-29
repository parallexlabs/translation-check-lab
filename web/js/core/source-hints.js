/**
 * Plain-language hints for source messages before translation.
 */

import { JARGON_ACRONYMS } from './meaning-checks.js';

/** @typedef {'long_sentence'|'acronym'|'passive'|'vague'} HintType */

/**
 * @typedef {object} SourceHint
 * @property {HintType} type
 * @property {string} detail
 * @property {string} [excerpt]
 */

const PASSIVE_RE = /\b(?:is|are|was|were|been|being)\s+\w+ed\b|\b(?:est|sont|été|était|étaient)\s+\w+é(?:e|es|s)?\b/gi;
const VAGUE_RE = /\b(as soon as possible|when possible|if needed|appropriate|relevant parties|stakeholders|etc\.?|soon|later)\b|\b(dès que possible|si nécessaire|les parties concernées)\b/gi;

/**
 * Split into sentences (simple heuristic).
 * @param {string} text
 * @returns {string[]}
 */
function sentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

/**
 * @param {string} source
 * @returns {SourceHint[]}
 */
export function analyzeSourceHints(source) {
  const hints = [];
  const sents = sentences(source);

  for (const sent of sents) {
    const words = sent.split(/\s+/).length;
    if (words > 25) {
      hints.push({
        type: 'long_sentence',
        detail: `Long sentence (${words} words): shorter sentences translate more reliably`,
        excerpt: sent.slice(0, 80) + (sent.length > 80 ? '…' : ''),
      });
    }
  }

  const acronyms = source.match(JARGON_ACRONYMS) || [];
  const unique = [...new Set(acronyms)];
  for (const ac of unique) {
    hints.push({
      type: 'acronym',
      detail: `Sector acronym "${ac}": spell out on first use or add a plain-language gloss`,
      excerpt: ac,
    });
  }

  if (PASSIVE_RE.test(source)) {
    hints.push({
      type: 'passive',
      detail: 'Passive voice: active instructions ("Go to…", "Bring…") are clearer in translation',
    });
  }

  const vague = source.match(VAGUE_RE);
  if (vague) {
    hints.push({
      type: 'vague',
      detail: `Vague wording ("${vague[0]}"): be specific about time, place and action`,
      excerpt: vague[0],
    });
  }

  return hints;
}
