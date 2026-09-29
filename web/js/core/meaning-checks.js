/**
 * Deterministic meaning-risk checks comparing source, translation, and back-translation.
 * Back-translation is a warning signal only, never proof of correctness.
 */

import { toWesternDigits, normNumberToken, missingNumbers, phoneDigitsOnly, phoneNumbersMatch } from './digits.js';

/** @typedef {'numbers'|'times'|'contact'|'negation'|'modality'|'names'|'untranslated'|'length'|'instructions'} CheckCategory */

/**
 * @typedef {object} MeaningFlag
 * @property {CheckCategory} category
 * @property {string} id
 * @property {'source_vs_translation'|'source_vs_back'|'translation_only'} compare
 * @property {string} detail
 * @property {string} [value]
 */

export const ACTION_VERBS_EN = [
  'boil', 'drink', 'bring', 'call', 'go', 'avoid', 'evacuate', 'register', 'wash', 'use',
  'stay', 'leave', 'wait', 'report', 'collect',
];

export const ACTION_VERBS_FR = [
  'faire bouillir', 'faites bouillir', 'bouillir', 'boire', 'buvez', 'apporter', 'apportez',
  'amener', 'amenez', 'appeler', 'appelez', 'composer', 'composez', 'aller', 'allez',
  'éviter', 'eviter', 'évitez', 'evitez', 'évacuer', 'evacuer', 'évacuez', 'evacuez',
  "s'inscrire", 'inscrire', 'inscrivez', 'laver', 'lavez', 'utiliser', 'utilisez',
  'rester', 'restez', 'quitter', 'quittez', 'partir', 'partez', 'attendre', 'attendez',
  'signaler', 'signalez', 'rapporter', 'rapportez', 'récupérer', 'recuperer', 'récupérez',
  'recuperer', 'recueillir', 'recueillez', 'collecter', 'collectez', 'rendez-vous',
];

/** English action verb to acceptable forms in English, French, Spanish translation, or back-translation. */
export const ACTION_VERB_FORMS = {
  boil: {
    en: ['boil', 'boiling'],
    fr: ['bouillir', 'bouillie', 'faites bouillir', 'faire bouillir'],
    es: ['hervir', 'hierva', 'hiervan', 'hierve'],
  },
  drink: {
    en: ['drink', 'drinking'],
    fr: ['boire', 'buvez', 'buvons'],
    es: ['beber', 'beba', 'beban', 'bebe'],
  },
  bring: {
    en: ['bring', 'bringing'],
    fr: ['apporter', 'apportez', 'amener', 'amenez'],
    es: ['traer', 'traiga', 'traigan', 'trae'],
  },
  call: {
    en: ['call', 'calling'],
    fr: ['appeler', 'appelez', 'composer', 'composez'],
    es: ['llamar', 'llame', 'llamen', 'llama'],
  },
  go: {
    en: ['go', 'going'],
    fr: ['aller', 'allez', 'rendez-vous'],
    es: ['ir', 'vaya', 'vayan', 've'],
  },
  avoid: {
    en: ['avoid', 'avoiding'],
    fr: ['éviter', 'eviter', 'évitez', 'evitez'],
    es: ['evitar', 'evite', 'eviten', 'evita'],
  },
  evacuate: {
    en: ['evacuate', 'evacuating'],
    fr: ['évacuer', 'evacuer', 'évacuez', 'evacuez'],
    es: ['evacuar', 'evacue', 'evacuen', 'evacua'],
  },
  register: {
    en: ['register', 'registering'],
    fr: ['inscrire', 'inscrivez', "s'inscrire"],
    es: ['registrar', 'registre', 'registren', 'registra', 'inscribir', 'inscríbase'],
  },
  wash: {
    en: ['wash', 'washing'],
    fr: ['laver', 'lavez', 'lavage'],
    es: ['lavar', 'lave', 'laven', 'lava'],
  },
  use: {
    en: ['use', 'using'],
    fr: ['utiliser', 'utilisez', 'employer', 'employez'],
    es: ['usar', 'use', 'usen', 'usa'],
  },
  stay: {
    en: ['stay', 'staying'],
    fr: ['rester', 'restez'],
    es: ['quedarse', 'quédese', 'quédense', 'queda', 'permanecer', 'permanezca'],
  },
  leave: {
    en: ['leave', 'leaving'],
    fr: ['quitter', 'quittez', 'partir', 'partez'],
    es: ['salir', 'salga', 'salgan', 'sal', 'irse', 'vaya'],
  },
  wait: {
    en: ['wait', 'waiting'],
    fr: ['attendre', 'attendez'],
    es: ['esperar', 'espere', 'esperen', 'espera'],
  },
  report: {
    en: ['report', 'reporting'],
    fr: ['signaler', 'signalez', 'rapporter', 'rapportez'],
    es: ['reportar', 'reporte', 'reporten', 'reporta', 'informar', 'informe'],
  },
  collect: {
    en: ['collect', 'collecting'],
    fr: ['récupérer', 'recuperer', 'récupérez', 'recueillir', 'recueillez', 'collecter', 'collectez'],
    es: ['recoger', 'recoja', 'recojan', 'recoge'],
  },
};

/** All known action-verb surface forms (lowercase) for proper-name exclusion. */
export const ACTION_VERB_FORM_SET = new Set(
  Object.values(ACTION_VERB_FORMS).flatMap((forms) =>
    [...forms.en, ...forms.fr, ...forms.es].map((f) => f.toLowerCase()),
  ),
);

/** Words valid in both English and French that should not trigger untranslated flags. */
export const COGNATES_EN_FR = new Set([
  'minutes', 'minute', 'distribution', 'vaccination', 'assistance', 'shelter', 'protection',
  'confidential', 'municipal', 'centre', 'center', 'entrance', 'april', 'avril', 'road', 'route',
  'sms', 'covid', 'health', 'families', 'households', 'registered', 'registration', 'contact',
  'information', 'service', 'services', 'mobile', 'internet', 'radio', 'television', 'video',
  'hospital', 'clinic', 'doctor', 'patient', 'normal', 'possible', 'important', 'urgent',
  'direct', 'local', 'national', 'international', 'social', 'total', 'final', 'original',
  'litre', 'litres', 'liter', 'liters', 'kilometre', 'kilometres', 'kilometer', 'kilometers',
  'kilogramme', 'kilogrammes', 'kilogram', 'kilograms',
]);

const EN_NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};

const FR_NUMBER_WORDS = {
  zéro: 0, zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6,
  sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14,
  quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40, cinquante: 50,
  soixante: 60, cent: 100, mille: 1000,
};

const WB = String.raw`(?<![\p{L}\p{N}])`;
const WE = String.raw`(?![\p{L}\p{N}])`;

/**
 * @param {string} inside
 * @param {string} [flags]
 * @returns {RegExp}
 */
function wordBoundaryRegex(inside, flags = 'iu') {
  return new RegExp(`${WB}${inside}${WE}`, flags);
}

/**
 * @param {string} s
 * @returns {string}
 */
function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const NEGATION_EN = new RegExp(`${WB}(?:not|no|never|none|nothing|nobody|nowhere|cannot|can't|won't|don't|doesn't|didn't|shouldn't|mustn't)${WE}`, 'giu');

const NEGATION_FR_STANDALONE = new RegExp(`${WB}(?:pas|jamais|aucun|aucune|nulle part|non)${WE}`, 'giu');
const NEGATION_FR_NE_PAS = new RegExp(`${WB}ne\\s+\\w+(?:\\s+\\w+){0,4}\\s+pas${WE}`, 'giu');
const NEGATION_FR_N_PAS = new RegExp(`${WB}n'\\w+(?:\\s+\\w+){0,3}\\s+pas${WE}`, 'giu');
const NEGATION_FR_PERSONNE_NE = new RegExp(`${WB}personne\\s+ne${WE}`, 'giu');
const NEGATION_FR_RIEN_NE = new RegExp(`${WB}rien\\s+ne${WE}`, 'giu');
const NEGATION_FR_NE_PERSONNE = new RegExp(`${WB}ne\\s+\\w+(?:\\s+\\w+){0,4}\\s+personne${WE}`, 'giu');
const NEGATION_FR_NE_RIEN = new RegExp(`${WB}ne\\s+\\w+(?:\\s+\\w+){0,4}\\s+rien${WE}`, 'giu');
const NEGATION_FR_N_PERSONNE = new RegExp(`${WB}n'\\w+(?:\\s+\\w+){0,3}\\s+personne${WE}`, 'giu');
const NEGATION_FR_N_RIEN = new RegExp(`${WB}n'\\w+(?:\\s+\\w+){0,3}\\s+rien${WE}`, 'giu');

const NEGATION_ES = new RegExp(`${WB}(?:no|nunca|jamás|ningún|ninguna|nada|nadie)${WE}`, 'giu');
const NEGATION_AR = new RegExp(`${WB}(?:لا|ليس|لم|لن|غير)${WE}`, 'gu');

const MODALITY_EN = new RegExp(`${WB}(?:must|should|may|can|shall|will|need to|have to)${WE}`, 'giu');
const MODALITY_FR = new RegExp(`${WB}(?:doit|doivent|devrait|devons|devez|peut|peuvent|peux|faut|obligatoire)${WE}`, 'giu');
const MODALITY_ES = new RegExp(`${WB}(?:debe|deben|debería|puede|pueden)${WE}`, 'giu');

const URL_RE = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
const PHONE_RE = /(?:\+?[\d٠-٩۰-۹][\d٠-٩۰-۹\s().-]{6,}[\d٠-٩۰-۹]|\b[\d٠-٩۰-۹]{3,4}[-.\s]?[\d٠-٩۰-۹]{3,4}[-.\s]?[\d٠-٩۰-۹]{3,4}\b|\b[\d٠-٩۰-۹]{5,}\b)/g;
const SHORT_CODE_RE = new RegExp(`${WB}(?:\\*[\\d٠-٩۰-۹]{3,5}#?|[#][\\d٠-٩۰-۹]{3,5}|[\\d٠-٩۰-۹]{3,5}[#*])${WE}`, 'g');
const CURRENCY_AMOUNT_RE = new RegExp(`${WB}[\\d٠-٩۰-۹]+(?:[.,][\\d٠-٩۰-۹]+)?\\s*(?:USD|EUR|GBP|CAD|USD|usd)${WE}`, 'giu');

const TIME_12_RE = new RegExp(`${WB}\\d{1,2}:\\d{2}\\s*(?:a\\.?m\\.?|p\\.?m\\.?)${WE}`, 'giu');
const TIME_24_RE = new RegExp(`${WB}(?:[01]?\\d|2[0-3]):[0-5]\\d${WE}`, 'gu');
const FR_TIME_RE = new RegExp(`${WB}\\d{1,2}\\s*h(?:\\s*\\d{1,2})?${WE}`, 'giu');
const FR_TIME_COMPACT_RE = new RegExp(`${WB}\\d{1,2}h\\d{2}${WE}`, 'giu');
const DATE_SLASH_DASH_RE = new RegExp(`${WB}\\d{1,2}[/-]\\d{1,2}(?:[/-]\\d{2,4})?${WE}`, 'gu');
const DATE_DOT_RE = new RegExp(`${WB}(?:\\d{2}\\.\\d{2}(?:\\.\\d{2,4})?|\\d{1,2}\\.\\d{1,2}\\.\\d{2,4})${WE}`, 'gu');
const DATE_WORD_RE = new RegExp(`${WB}\\d{1,2}\\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|janv(?:ier)?|févr(?:ier)?|fevr(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|août|aout|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|déc(?:embre)?|dec(?:embre)?)${WE}`, 'giu');

const PERCENT_RE = new RegExp(`${WB}[\\d٠-٩۰-۹]+(?:[.,][\\d٠-٩۰-۹]+)?\\s*%|\\d+(?:[.,]\\d+)?\\s*percent${WE}`, 'giu');
const QUANTITY_RE = new RegExp(`${WB}[\\d٠-٩۰-۹]+(?:[.,][\\d٠-٩۰-۹]+)?\\s*(?:kg|g|lb|lbs|km|m|mi|miles|litres?|liters?|ml|hours?|hrs?|heures?|days?|jours?|weeks?|semaines?|months?|mois)${WE}`, 'giu');
const DIGIT_RE = new RegExp(`${WB}[\\d٠-٩۰-۹]+(?:[.,][\\d٠-٩۰-۹]+)?${WE}`, 'gu');

const IDENTIFIER_RE = new RegExp(`${WB}(?:Well|Puits|Site|Hall|Clinic|Clinique|Road|Route|Centre|Center|School|École|Ecole|Entrance|Entrée|Entree|Stadium|Stade|Gymnasium|Gymnase|Refuge|Shelter)\\s+(\\d+|[A-Za-zÀ-ÿ])${WE}`, 'giu');

/** @type {Record<string, string[]>} */
const IDENTIFIER_SYNONYMS = {
  well: ['well', 'puits'],
  puits: ['well', 'puits'],
  site: ['site'],
  hall: ['hall'],
  clinic: ['clinic', 'clinique'],
  clinique: ['clinic', 'clinique'],
  road: ['road', 'route'],
  route: ['road', 'route'],
  centre: ['centre', 'center'],
  center: ['centre', 'center'],
  school: ['school', 'école', 'ecole'],
  école: ['school', 'école', 'ecole'],
  ecole: ['school', 'école', 'ecole'],
  entrance: ['entrance', 'entrée', 'entree'],
  entrée: ['entrance', 'entrée', 'entree'],
  entree: ['entrance', 'entrée', 'entree'],
  stadium: ['stadium', 'stade'],
  stade: ['stadium', 'stade'],
  gymnasium: ['gymnasium', 'gymnase'],
  gymnase: ['gymnasium', 'gymnase'],
  refuge: ['refuge', 'shelter'],
  shelter: ['refuge', 'shelter'],
};

const JARGON_ACRONYMS = /\b(NFI|WASH|IDP|MEAL|MHPSS|CBPF|CVA|GBV|DRR|DRM|DRC|UNHCR|UNICEF|WHO|MSF|IRC|NGO|SMS|OTP|PIN)\b/g;

const PROPER_NOUN_SKIP = new Set([
  'The', 'A', 'An', 'If', 'Do', 'Go', 'At', 'On', 'In', 'To', 'For', 'All', 'You', 'Your', 'We',
  'Road', 'Centre', 'Center', 'Entrance', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
  'Saturday', 'Sunday', 'Free', 'Call', 'Food', 'Cash', 'Shelter', 'Vaccination', 'Distribution',
  'Municipal', 'East', 'May', 'April', 'June', 'July', 'Well', 'Site', 'Hall', 'Clinic', 'School',
  'Stadium', 'Gymnasium', 'Refuge', 'Entrée', 'Entree', 'Puits', 'Stade', 'Gymnase', 'École', 'Ecole',
]);

/**
 * @param {string} text
 * @param {Record<string, number>} wordMap
 * @returns {number[]}
 */
function extractNumberWords(text, wordMap) {
  const lower = text.toLowerCase();
  const found = [];
  for (const [word] of Object.entries(wordMap)) {
    if (wordBoundaryRegex(escRe(word)).test(lower)) found.push(wordMap[word]);
  }
  return found;
}

/**
 * @param {string} text
 * @returns {string}
 */
function normText(text) {
  return toWesternDigits(text);
}

/**
 * @param {string} text
 * @param {RegExp} re
 * @returns {string[]}
 */
function extractTokens(text, re) {
  const normalized = normText(text);
  const copy = new RegExp(re.source, re.flags);
  return [...normalized.matchAll(copy)].map((m) => m[0]);
}

/**
 * @param {string} token
 * @returns {string|null}
 */
function normalizeTimeToken(token) {
  const t = token.trim().toLowerCase().replace(/\s+/g, ' ').replace(/h(\d)/, 'h $1');
  let m = t.match(/^(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?$/);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3];
    if (ampm?.startsWith('p') && h < 12) h += 12;
    if (ampm?.startsWith('a') && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    return `${String(parseInt(m[1], 10)).padStart(2, '0')}:${String(parseInt(m[2], 10)).padStart(2, '0')}`;
  }
  m = t.match(/^(\d{1,2})\s*h(?:\s*(\d{1,2}))?$/);
  if (m) {
    const h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  m = t.replace(/\s/g, '').match(/^(\d{1,2})h(\d{2})$/);
  if (m) {
    return `${String(parseInt(m[1], 10)).padStart(2, '0')}:${String(parseInt(m[2], 10)).padStart(2, '0')}`;
  }
  return null;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractNormalizedTimes(text) {
  const patterns = [TIME_12_RE, TIME_24_RE, FR_TIME_RE, FR_TIME_COMPACT_RE];
  const out = [];
  for (const re of patterns) {
    for (const token of extractTokens(text, re)) {
      const norm = normalizeTimeToken(token);
      if (norm) out.push(norm);
    }
  }
  return out;
}

/**
 * Mask regions handled by other checks so bare digits are not double-counted.
 * @param {string} text
 * @returns {string}
 */
function maskProtectedNumberRegions(text) {
  let masked = normText(text);
  const patterns = [
    TIME_12_RE, TIME_24_RE, FR_TIME_RE, FR_TIME_COMPACT_RE, PHONE_RE, SHORT_CODE_RE, URL_RE,
    DATE_SLASH_DASH_RE, DATE_DOT_RE, DATE_WORD_RE, PERCENT_RE, QUANTITY_RE, CURRENCY_AMOUNT_RE,
  ];
  for (const re of patterns) {
    masked = masked.replace(new RegExp(re.source, re.flags), (match) => ' '.repeat(match.length));
  }
  return masked;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractCurrencyAmounts(text) {
  return extractTokens(text, CURRENCY_AMOUNT_RE).map((token) => {
    const numMatch = token.match(/[\d٠-٩۰-۹]+(?:[.,][\d٠-٩۰-۹]+)?/);
    return numMatch ? numMatch[0] : token;
  });
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractBareNumbers(text) {
  return extractTokens(maskProtectedNumberRegions(text), DIGIT_RE);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractQuantityNumbers(text) {
  const nums = [];
  const re = new RegExp(QUANTITY_RE.source, QUANTITY_RE.flags);
  for (const m of normText(text).matchAll(re)) {
    const numMatch = m[0].match(/[\d٠-٩۰-۹]+(?:[.,][\d٠-٩۰-۹]+)?/);
    if (numMatch) nums.push(numMatch[0]);
  }
  return nums;
}

/**
 * @param {string} text
 * @param {'en'|'fr'|'es'|'ar'} lang
 * @returns {number}
 */
export function countNegations(text, lang = 'en') {
  let count = 0;
  if (lang === 'en') {
    count += (text.match(NEGATION_EN) ?? []).length;
  }
  if (lang === 'fr') {
    let remaining = text;
    const patterns = [
      NEGATION_FR_NE_PAS, NEGATION_FR_N_PAS, NEGATION_FR_PERSONNE_NE, NEGATION_FR_RIEN_NE,
      NEGATION_FR_NE_PERSONNE, NEGATION_FR_NE_RIEN, NEGATION_FR_N_PERSONNE, NEGATION_FR_N_RIEN,
    ];
    for (const re of patterns) {
      const matches = [...remaining.matchAll(new RegExp(re.source, re.flags))];
      count += matches.length;
      for (const m of matches) remaining = remaining.replace(m[0], ' '.repeat(m[0].length));
    }
    count += (remaining.match(NEGATION_FR_STANDALONE) ?? []).length;
  }
  if (lang === 'es') {
    count += (text.match(NEGATION_ES) ?? []).length;
  }
  if (lang === 'ar') {
    count += (text.match(NEGATION_AR) ?? []).length;
  }
  return count;
}

/**
 * @param {string} text
 * @param {'en'|'fr'|'es'|'ar'} lang
 * @returns {string[]}
 */
function extractModalities(text, lang) {
  const patterns = [];
  if (lang === 'en') patterns.push(MODALITY_EN);
  if (lang === 'fr') patterns.push(MODALITY_FR);
  if (lang === 'es') patterns.push(MODALITY_ES);
  const out = [];
  for (const re of patterns) {
    out.push(...extractTokens(text, re));
  }
  return [...new Set(out.map((s) => s.toLowerCase()))];
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractProperNouns(text) {
  const matches = text.match(/\p{Lu}\p{L}+(?:\s+\p{Lu}\p{L}+)*/gu) || [];
  return matches.filter((m) => {
    if (PROPER_NOUN_SKIP.has(m)) return false;
    if (ACTION_VERBS_EN.includes(m.toLowerCase())) return false;
    if (ACTION_VERB_FORM_SET.has(m.toLowerCase())) return false;
    if (!m.includes(' ') && /^[A-ZÀ-ÿ]/.test(m) && text.indexOf(m) === text.search(new RegExp(`(?:^|[.!?]\\s*)${escRe(m)}`))) {
      return false;
    }
    return true;
  });
}

/**
 * @param {string} name
 * @param {string} translation
 * @returns {boolean}
 */
function properNamePreserved(name, translation) {
  const parts = name.split(/\s+/).filter(Boolean);
  const lowerTrans = translation.toLowerCase();
  return parts.every((part) => lowerTrans.includes(part.toLowerCase()));
}

/**
 * @param {string} text
 * @param {string} verb
 * @returns {boolean}
 */
function isNegatedActionVerb(text, verb) {
  const re = wordBoundaryRegex(`(?:do not|don't|doesn't|didn't|never|not to)\\s+${escRe(verb)}`, 'iu');
  if (re.test(text)) return true;
  const frRe = wordBoundaryRegex(`n'(?:\\w+'\\s+)?${escRe(verb)}`, 'iu');
  return frRe.test(text);
}

/**
 * @param {string} text
 * @returns {{ noun: string, id: string, key: string }[]}
 */
function extractIdentifiers(text) {
  const re = new RegExp(IDENTIFIER_RE.source, IDENTIFIER_RE.flags);
  const out = [];
  for (const m of text.matchAll(re)) {
    const noun = m[0].replace(/\s+\S+$/, '').trim();
    const id = m[1];
    out.push({ noun, id, key: `${noun.toLowerCase()} ${id.toLowerCase()}` });
  }
  return out;
}

/**
 * @param {string} haystack
 * @param {{ noun: string, id: string }} target
 * @returns {boolean}
 */
function identifierPresent(haystack, target) {
  const nouns = IDENTIFIER_SYNONYMS[target.noun.toLowerCase()] ?? [target.noun.toLowerCase()];
  for (const noun of nouns) {
    const re = wordBoundaryRegex(`${escRe(noun)}\\s+${escRe(target.id)}`, 'iu');
    if (re.test(haystack)) return true;
  }
  return false;
}

/**
 * @param {string} text
 * @param {string[]} forms
 * @param {string} [lang]
 * @returns {boolean}
 */
function textHasVerbForms(text, forms, lang) {
  const lower = text.toLowerCase();
  return forms.some((form) => {
    if (wordBoundaryRegex(escRe(form), 'iu').test(lower)) return true;
    if (lang === 'es') {
      const cliticRe = new RegExp(`${WB}${escRe(form)}(?:lo|la|los|las|me|te|se|le|les)?${WE}`, 'iu');
      if (cliticRe.test(lower)) return true;
    }
    return false;
  });
}

/**
 * @param {string} verb
 * @param {string} lang
 * @returns {string[]}
 */
function verbFormsForLang(verb, lang) {
  const forms = ACTION_VERB_FORMS[verb];
  if (!forms) return [];
  if (lang === 'fr') return forms.fr;
  if (lang === 'es') return forms.es;
  return forms.en;
}

/**
 * @param {string} source
 * @param {'en'|'fr'} lang
 * @returns {string[]}
 */
function extractSourceActionVerbs(source, lang) {
  const lower = source.toLowerCase();
  const found = [];
  if (lang === 'en') {
    for (const verb of ACTION_VERBS_EN) {
      const re = wordBoundaryRegex(`${escRe(verb)}(?:s|ed|ing)?`, 'iu');
      if (re.test(lower)) found.push(verb);
    }
  } else {
    for (const phrase of ACTION_VERBS_FR) {
      if (wordBoundaryRegex(escRe(phrase), 'iu').test(lower)) {
        const mapped = Object.entries(ACTION_VERB_FORMS).find(([, forms]) =>
          forms.fr.some((f) => f.toLowerCase() === phrase.toLowerCase()),
        );
        if (mapped) found.push(mapped[0]);
      }
    }
    for (const verb of ACTION_VERBS_EN) {
      const re = wordBoundaryRegex(`${escRe(verb)}(?:s|ed|ing)?`, 'iu');
      if (re.test(lower) && !found.includes(verb)) found.push(verb);
    }
  }
  return [...new Set(found)];
}

/**
 * @param {string} source
 * @param {string} translation
 * @param {string} sourceLang
 * @param {string} targetLang
 * @returns {string[]}
 */
function findUntranslated(source, translation, sourceLang, targetLang) {
  if (sourceLang === targetLang) return [];
  const words = source.match(/\b[A-Za-zÀ-ÿ]{5,}\b/g) || [];
  const lowerTrans = translation.toLowerCase();
  return words.filter((w) => {
    const lw = w.toLowerCase();
    if (COGNATES_EN_FR.has(lw)) return false;
    if (JARGON_ACRONYMS.test(w)) return false;
    return wordBoundaryRegex(escRe(lw), 'iu').test(lowerTrans);
  });
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractAmbiguousDates(text) {
  const normalized = normText(text);
  const phoneSpans = [...normalized.matchAll(PHONE_RE)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length]);
  const inPhone = (start, len) => phoneSpans.some(([a, b]) => start >= a && start + len <= b);
  const patterns = [
    new RegExp(`${WB}\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?${WE}`, 'gu'),
    new RegExp(`${WB}\\d{1,2}-\\d{1,2}(?:-\\d{2,4})?${WE}`, 'gu'),
    new RegExp(`${WB}(?:\\d{2}\\.\\d{2}(?:\\.\\d{2,4})?|\\d{1,2}\\.\\d{1,2}\\.\\d{2,4})${WE}`, 'gu'),
  ];
  const out = [];
  for (const re of patterns) {
    for (const m of normalized.matchAll(re)) {
      const start = m.index ?? 0;
      if (!inPhone(start, m[0].length)) out.push(m[0]);
    }
  }
  return out;
}

/**
 * @param {string} targetLang
 * @returns {boolean}
 */
export function skipsTranslationInstructionCheck(targetLang) {
  return targetLang === 'ar';
}

/**
 * @param {string} source
 * @param {string} translation
 * @param {string} backTranslation
 * @param {{ sourceLang: string, targetLang: string }} opts
 * @returns {MeaningFlag[]}
 */
export function runMeaningChecks(source, translation, backTranslation, opts = { sourceLang: 'en', targetLang: 'fr' }) {
  const flags = [];
  const { sourceLang, targetLang } = opts;
  let id = 0;
  const nextId = (cat) => `${cat}-${++id}`;

  const srcBare = extractBareNumbers(source);
  const transBare = extractBareNumbers(translation);
  const srcQtyNums = extractQuantityNumbers(source);
  const transQtyNums = extractQuantityNumbers(translation);
  const srcCurrency = extractCurrencyAmounts(source);
  const transCurrency = extractCurrencyAmounts(translation);
  const srcPct = extractTokens(source, PERCENT_RE);
  const transPct = extractTokens(translation, PERCENT_RE);

  for (const v of missingNumbers(srcBare, transBare)) {
    flags.push({
      category: 'numbers',
      id: nextId('numbers'),
      compare: 'source_vs_translation',
      detail: `Number "${v}" in source is missing or changed in translation`,
      value: v,
    });
  }

  for (const v of missingNumbers(srcQtyNums, transQtyNums)) {
    flags.push({
      category: 'numbers',
      id: nextId('numbers'),
      compare: 'source_vs_translation',
      detail: `Quantity number "${v}" changed or missing in translation`,
      value: v,
    });
  }
  for (const v of missingNumbers(srcCurrency, transCurrency)) {
    flags.push({
      category: 'numbers',
      id: nextId('numbers'),
      compare: 'source_vs_translation',
      detail: `Amount "${v}" changed or missing in translation`,
      value: v,
    });
  }
  for (const v of missingNumbers(srcPct, transPct)) {
    flags.push({
      category: 'numbers',
      id: nextId('numbers'),
      compare: 'source_vs_translation',
      detail: `Percentage "${v}" changed or missing in translation`,
      value: v,
    });
  }

  const enWords = extractNumberWords(source, EN_NUMBER_WORDS);
  if (enWords.length && !transBare.length && !extractNumberWords(translation, FR_NUMBER_WORDS).length) {
    flags.push({
      category: 'numbers',
      id: nextId('numbers'),
      compare: 'source_vs_translation',
      detail: 'Number words in source may not be reflected in translation',
    });
  }

  const srcTimes = extractNormalizedTimes(source);
  const transTimes = extractNormalizedTimes(translation);
  for (const v of srcTimes) {
    if (!transTimes.includes(v)) {
      flags.push({
        category: 'times',
        id: nextId('times'),
        compare: 'source_vs_translation',
        detail: `Time "${v}" missing or changed in translation`,
        value: v,
      });
    }
  }

  const datePatterns = [DATE_SLASH_DASH_RE, DATE_DOT_RE];
  for (const re of datePatterns) {
    const srcD = extractTokens(source, re);
    const transD = extractTokens(translation, re);
    for (const v of missingNumbers(srcD, transD)) {
      flags.push({
        category: 'times',
        id: nextId('times'),
        compare: 'source_vs_translation',
        detail: `Date "${v}" missing or changed in translation`,
        value: v,
      });
    }
  }

  const srcWordDates = extractTokens(source, DATE_WORD_RE);
  const transWordDates = extractTokens(translation, DATE_WORD_RE);
  for (const v of srcWordDates) {
    const day = v.match(/^\d{1,2}/)?.[0];
    if (!day) continue;
    const found = transWordDates.some((t) => t.startsWith(`${day} `));
    if (!found) {
      flags.push({
        category: 'times',
        id: nextId('times'),
        compare: 'source_vs_translation',
        detail: `Time or date "${v}" missing or changed in translation`,
        value: v,
      });
    }
  }
  for (const d of extractAmbiguousDates(source)) {
    flags.push({
      category: 'times',
      id: nextId('times'),
      compare: 'translation_only',
      detail: `Ambiguous numeric date "${d}" in source: write the month name (e.g. "4 April" or "4 avril")`,
      value: d,
    });
  }

  for (const re of [URL_RE, PHONE_RE, SHORT_CODE_RE]) {
    const srcC = extractTokens(source, re);
    const transC = extractTokens(translation, re);
    for (const v of srcC) {
      const found = transC.some((t) => {
        if (re === PHONE_RE || re === SHORT_CODE_RE) return phoneNumbersMatch(v, t);
        return t.replace(/\s/g, '') === v.replace(/\s/g, '');
      });
      if (!found) {
        flags.push({
          category: 'contact',
          id: nextId('contact'),
          compare: 'source_vs_translation',
          detail: `Phone, code or URL "${v}" not preserved exactly in translation`,
          value: v,
        });
      }
    }
  }

  const srcNeg = countNegations(source, sourceLang);
  const transNeg = countNegations(translation, targetLang);
  const backNeg = countNegations(backTranslation, sourceLang);
  if (srcNeg > transNeg) {
    flags.push({
      category: 'negation',
      id: nextId('negation'),
      compare: 'source_vs_translation',
      detail: 'Negation in source may be weakened or lost in translation',
    });
  }
  if (transNeg > srcNeg) {
    flags.push({
      category: 'negation',
      id: nextId('negation'),
      compare: 'source_vs_translation',
      detail: 'Negation added in translation that was not in source',
    });
  }
  if (backTranslation && srcNeg > backNeg) {
    flags.push({
      category: 'negation',
      id: nextId('negation'),
      compare: 'source_vs_back',
      detail: 'Back-translation is a warning signal only, not proof. Negation may look restored while the target-language message is still wrong.',
    });
  }

  const srcMod = extractModalities(source, sourceLang);
  const transMod = extractModalities(translation, targetLang);
  const MUST_LIKE = wordBoundaryRegex('(?:must|have to|need to|doit|doivent|obligatoire|debe|deben)', 'iu');
  const MAY_LIKE = wordBoundaryRegex('(?:may|can|peut|might|pourrait)', 'iu');
  const URGENCY_RE = wordBoundaryRegex('(?:immediately|now|right away|tout de suite|immédiatement|immediat|maintenant|go there|allez-y)', 'iu');
  const srcMust = MUST_LIKE.test(source);
  const srcMay = MAY_LIKE.test(source);
  const transMust = MUST_LIKE.test(translation);
  const transMay = MAY_LIKE.test(translation);
  if ((srcMust && transMay && !transMust)
    || (srcMay && transMust && !transMay)
    || (URGENCY_RE.test(translation) && !URGENCY_RE.test(source))) {
    flags.push({
      category: 'modality',
      id: nextId('modality'),
      compare: 'source_vs_translation',
      detail: 'Instruction strength may have changed (must/should/may or doit/devrait/peut)',
      value: `${srcMod.join(', ')} → ${transMod.join(', ')}`,
    });
  }

  const srcNames = extractProperNouns(source);
  for (const name of srcNames) {
    const inTrans = properNamePreserved(name, translation);
    if (!inTrans && name.length > 2) {
      flags.push({
        category: 'names',
        id: nextId('names'),
        compare: 'source_vs_translation',
        detail: `Place or proper name "${name}" missing or possibly translated literally`,
        value: name,
      });
    }
  }

  for (const ident of extractIdentifiers(source)) {
    if (!identifierPresent(translation, ident)) {
      flags.push({
        category: 'names',
        id: nextId('names'),
        compare: 'source_vs_translation',
        detail: `Identifier "${ident.noun} ${ident.id}" missing or changed in translation`,
        value: `${ident.noun} ${ident.id}`,
      });
    }
    if (backTranslation && !identifierPresent(backTranslation, ident)) {
      flags.push({
        category: 'names',
        id: nextId('names'),
        compare: 'source_vs_back',
        detail: `Identifier "${ident.noun} ${ident.id}" missing or changed in back-translation`,
        value: `${ident.noun} ${ident.id}`,
      });
    }
  }

  const actionVerbs = extractSourceActionVerbs(source, sourceLang);
  const skipTransInstructions = skipsTranslationInstructionCheck(targetLang);
  for (const verb of actionVerbs) {
    if (isNegatedActionVerb(source, verb)) continue;
    const transForms = skipTransInstructions ? [] : verbFormsForLang(verb, targetLang);
    const backForms = verbFormsForLang(verb, sourceLang);
    if (translation && transForms.length && !textHasVerbForms(translation, transForms, targetLang)) {
      flags.push({
        category: 'instructions',
        id: nextId('instructions'),
        compare: 'source_vs_translation',
        detail: `The instruction '${verb}' is missing from the translation`,
        value: verb,
      });
    }
    if (backTranslation && backForms.length && !textHasVerbForms(backTranslation, backForms, sourceLang)) {
      flags.push({
        category: 'instructions',
        id: nextId('instructions'),
        compare: 'source_vs_back',
        detail: `The instruction '${verb}' is missing from the back-translation`,
        value: verb,
      });
    }
  }

  const untrans = findUntranslated(source, translation, sourceLang, targetLang);
  for (const w of untrans.slice(0, 2)) {
    flags.push({
      category: 'untranslated',
      id: nextId('untranslated'),
      compare: 'source_vs_translation',
      detail: `Source word "${w}" may be left untranslated`,
      value: w,
    });
  }

  if (source.length > 10 && translation.length > 10) {
    const ratio = translation.length / source.length;
    if (ratio < 0.5 || ratio > 2.0) {
      flags.push({
        category: 'length',
        id: nextId('length'),
        compare: 'source_vs_translation',
        detail: `Unusual length change (ratio ${ratio.toFixed(2)}): review for missing or added content`,
      });
    }
  }

  return flags;
}

/**
 * @param {string} text
 * @param {string} lang
 * @returns {{ numbers: string[], times: string[], contacts: string[], negationCount: number }}
 */
export function extractCriticalTokens(text, lang = 'en') {
  return {
    numbers: [...new Set([...extractBareNumbers(text), ...extractQuantityNumbers(text), ...extractTokens(text, PERCENT_RE)])],
    times: [...new Set([
      ...extractNormalizedTimes(text),
      ...extractTokens(text, DATE_SLASH_DASH_RE),
      ...extractTokens(text, DATE_DOT_RE),
    ])],
    contacts: [...new Set([...extractTokens(text, PHONE_RE), ...extractTokens(text, URL_RE)])],
    negationCount: countNegations(text, lang),
  };
}

/**
 * @param {string} source
 * @param {string} back
 * @param {string} sourceLang
 * @param {string} [backLang]
 * @returns {boolean}
 */
export function roundTripPreserved(source, back, sourceLang, backLang = sourceLang) {
  const s = extractCriticalTokens(source, sourceLang);
  const b = extractCriticalTokens(back, backLang);
  if (s.negationCount !== b.negationCount) return false;
  for (const n of s.numbers) {
    if (!b.numbers.some((x) => normNumberToken(x) === normNumberToken(n))) return false;
  }
  for (const t of s.times) {
    const normT = normalizeTimeToken(t) ?? normNumberToken(t);
    if (!b.times.some((x) => {
      const normX = normalizeTimeToken(x) ?? normNumberToken(x);
      return normX === normT;
    })) return false;
  }
  for (const c of s.contacts) {
    const isPhone = phoneDigitsOnly(c).length >= 5;
    if (isPhone) {
      if (!b.contacts.some((x) => phoneNumbersMatch(x, c))) return false;
    } else if (!b.contacts.some((x) => x.replace(/\s/g, '') === c.replace(/\s/g, ''))) {
      return false;
    }
  }
  for (const verb of extractSourceActionVerbs(source, sourceLang)) {
    const forms = verbFormsForLang(verb, backLang);
    if (forms.length && !textHasVerbForms(back, forms, backLang)) return false;
  }
  return true;
}

export { JARGON_ACRONYMS, normNumberToken };
