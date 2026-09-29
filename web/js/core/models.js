/**
 * Verified OPUS-MT model metadata for Transformers.js.
 * Upstream: Helsinki-NLP (Apache-2.0). ONNX conversion: Xenova.
 */

/** @typedef {{ testset: string, bleu: number, chrf: number, cardUrl: string }} Benchmark */

/** @typedef {{ id: string, revision: string, upstream: string, licence: string, licenceUrl: string, licenceVerified: string, downloadMb: number, sourceLang: string, targetLang: string, rtl: boolean, benchmark: Benchmark, qualityWarning: boolean, qualityWarningText?: string, targetLangToken?: string }} ModelPair */

/** @type {ModelPair[]} */
export const MODEL_PAIRS = [
  {
    id: 'Xenova/opus-mt-en-fr',
    revision: '28726206f80896b90035bd99cccd5cc1e151f916',
    upstream: 'Helsinki-NLP/opus-mt-en-fr',
    licence: 'Apache-2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenceVerified: '2026-09-29',
    downloadMb: 102.5,
    sourceLang: 'en',
    targetLang: 'fr',
    rtl: false,
    benchmark: {
      testset: 'Tatoeba.en.fr',
      bleu: 50.5,
      chrf: 0.672,
      cardUrl: 'https://huggingface.co/Helsinki-NLP/opus-mt-en-fr#benchmarks',
    },
    qualityWarning: false,
  },
  {
    id: 'Xenova/opus-mt-fr-en',
    revision: '6b166a182780e118c997879d0ad5be4b53671644',
    upstream: 'Helsinki-NLP/opus-mt-fr-en',
    licence: 'Apache-2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenceVerified: '2026-09-29',
    downloadMb: 102.5,
    sourceLang: 'fr',
    targetLang: 'en',
    rtl: false,
    benchmark: {
      testset: 'Tatoeba.fr.en',
      bleu: 57.5,
      chrf: 0.720,
      cardUrl: 'https://huggingface.co/Helsinki-NLP/opus-mt-fr-en#benchmarks',
    },
    qualityWarning: false,
  },
  {
    id: 'Xenova/opus-mt-en-es',
    revision: '4b002a4c7edd54a7ced58877258b87f7efd3f892',
    upstream: 'Helsinki-NLP/opus-mt-en-es',
    licence: 'Apache-2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenceVerified: '2026-09-29',
    downloadMb: 107.9,
    sourceLang: 'en',
    targetLang: 'es',
    rtl: false,
    benchmark: {
      testset: 'Tatoeba-test.eng.spa',
      bleu: 54.9,
      chrf: 0.721,
      cardUrl: 'https://huggingface.co/Helsinki-NLP/opus-mt-en-es#benchmarks',
    },
    qualityWarning: false,
  },
  {
    id: 'Xenova/opus-mt-es-en',
    revision: 'eadfd7c658a9d8929ac3b8e996b68a68e2c7d480',
    upstream: 'Helsinki-NLP/opus-mt-es-en',
    licence: 'Apache-2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenceVerified: '2026-09-29',
    downloadMb: 107.9,
    sourceLang: 'es',
    targetLang: 'en',
    rtl: false,
    benchmark: {
      testset: 'Tatoeba-test.spa.eng',
      bleu: 59.6,
      chrf: 0.739,
      cardUrl: 'https://huggingface.co/Helsinki-NLP/opus-mt-es-en#benchmarks',
    },
    qualityWarning: false,
  },
  {
    id: 'Xenova/opus-mt-en-ar',
    revision: '034a684356c19021a187cda4d7f823298b913921',
    upstream: 'Helsinki-NLP/opus-mt-en-ar',
    licence: 'Apache-2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenceVerified: '2026-09-29',
    downloadMb: 105.7,
    sourceLang: 'en',
    targetLang: 'ar',
    rtl: true,
    benchmark: {
      testset: 'Tatoeba-test.eng.ara',
      bleu: 14.0,
      chrf: 0.437,
      cardUrl: 'https://huggingface.co/Helsinki-NLP/opus-mt-en-ar#benchmarks',
    },
    qualityWarning: true,
    qualityWarningText: 'Published Tatoeba BLEU 14.0 and chrF 0.437 are far below English to French (BLEU 50.5, chrF 0.672). This multi-dialect Arabic model needs a >>ara<< target token. Do not rely on it for operational messages without expert human review.',
    targetLangToken: '>>ara<<',
  },
  {
    id: 'Xenova/opus-mt-ar-en',
    revision: '09c7556866400dcc53562ba8d7035119e7d9a2c1',
    upstream: 'Helsinki-NLP/opus-mt-ar-en',
    licence: 'Apache-2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenceVerified: '2026-09-29',
    downloadMb: 105.7,
    sourceLang: 'ar',
    targetLang: 'en',
    rtl: true,
    benchmark: {
      testset: 'Tatoeba.ar.en',
      bleu: 49.4,
      chrf: 0.661,
      cardUrl: 'https://huggingface.co/Helsinki-NLP/opus-mt-ar-en#benchmarks',
    },
    qualityWarning: false,
  },
];

export const TRANSFORMERS_VERSION = '4.3.0';

export const TRANSFORMERS_CDN = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}`;

/**
 * @param {string} sourceLang
 * @param {string} targetLang
 * @returns {ModelPair|undefined}
 */
export function getModelPair(sourceLang, targetLang) {
  return MODEL_PAIRS.find((m) => m.sourceLang === sourceLang && m.targetLang === targetLang);
}

/**
 * @param {string} lang
 * @returns {ModelPair[]}
 */
export function pairsFromLang(lang) {
  return MODEL_PAIRS.filter((m) => m.sourceLang === lang);
}

/**
 * @param {string} lang
 * @returns {boolean}
 */
export function isRtl(lang) {
  return lang === 'ar';
}

/**
 * Prepare text for translation, adding target language token if required.
 * @param {string} text
 * @param {ModelPair} pair
 * @returns {string}
 */
export function prepareModelInput(text, pair) {
  if (pair.targetLangToken && !text.trimStart().startsWith(pair.targetLangToken)) {
    return `${pair.targetLangToken} ${text}`;
  }
  return text;
}

/**
 * Format benchmark line for display.
 * @param {ModelPair} pair
 * @returns {string}
 */
export function formatBenchmark(pair) {
  const b = pair.benchmark;
  return `${b.testset}: BLEU ${b.bleu}, chrF ${b.chrf}`;
}
