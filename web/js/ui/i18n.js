/**
 * Client-side i18n loader.
 */

let strings = {};
let currentLang = 'en';

/**
 * @param {string} lang
 */
export async function loadI18n(lang) {
  const res = await fetch(`i18n/${lang}.json`);
  if (!res.ok) throw new Error(`i18n load failed: ${lang}`);
  strings = await res.json();
  currentLang = lang;
  document.documentElement.lang = lang;
  return strings;
}

/**
 * @param {string} key
 * @returns {string}
 */
export function t(key) {
  return strings[key] ?? key;
}

/**
 * @returns {string}
 */
export function getLang() {
  return currentLang;
}

/**
 * Apply translations to elements with data-i18n attribute.
 */
export function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.hasAttribute('placeholder')) el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const spec = el.getAttribute('data-i18n-attr');
    if (!spec) return;
    const [attr, key] = spec.split(':');
    el.setAttribute(attr, t(key));
  });
  const title = t('meta.title');
  if (title) document.title = title;
}
