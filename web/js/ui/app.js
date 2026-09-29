/**
 * Main application bootstrap.
 */

import { loadI18n, applyI18n, t, getLang } from './i18n.js';
import { initPractice } from './practice-ui.js';
import { initCheck } from './check-ui.js';

let reviewDirty = false;

export function setReviewDirty(v) {
  reviewDirty = v;
}

/**
 * @param {string} lang
 */
async function switchLang(lang) {
  await loadI18n(lang);
  applyI18n();
  document.querySelectorAll('.lang-switch button').forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.lang === lang ? 'true' : 'false');
  });
  const frNotice = document.getElementById('fr-notice');
  if (frNotice) {
    frNotice.hidden = lang !== 'fr';
  }
}

/**
 * Show view section by hash.
 */
function route() {
  const hash = location.hash.slice(1) || 'home';
  document.querySelectorAll('[data-view]').forEach((el) => {
    el.classList.toggle('hidden', el.dataset.view !== hash);
  });
  document.querySelectorAll('nav a[data-nav]').forEach((a) => {
    a.setAttribute('aria-current', a.dataset.nav === hash ? 'page' : 'false');
  });
}

async function init() {
  const lang = 'en';
  await loadI18n(lang);
  applyI18n();

  document.querySelectorAll('.lang-switch button').forEach((btn) => {
    btn.addEventListener('click', () => switchLang(btn.dataset.lang));
  });

  window.addEventListener('hashchange', route);
  route();

  await initPractice();
  initCheck();

  window.addEventListener('beforeunload', (e) => {
    if (reviewDirty) {
      e.preventDefault();
      e.returnValue = t('check.unsaved');
    }
  });
}

init().catch(console.error);

export { getLang };
