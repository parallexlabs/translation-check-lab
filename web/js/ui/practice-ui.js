/**
 * Practice mode UI.
 */

import { scorePracticeItem } from '../core/practice.js';
import { t } from './i18n.js';

/** @type {Array} */
let items = [];
let currentIndex = 0;

const ERROR_KEYS = [
  { cat: 'numbers', key: 'practice.error.numbers' },
  { cat: 'times', key: 'practice.error.times' },
  { cat: 'contact', key: 'practice.error.contact' },
  { cat: 'negation', key: 'practice.error.negation' },
  { cat: 'modality', key: 'practice.error.modality' },
  { cat: 'names', key: 'practice.error.names' },
  { cat: 'instructions', key: 'practice.error.instructions' },
  { cat: 'untranslated', key: 'practice.error.untranslated' },
  { cat: 'length', key: 'practice.error.length' },
];

/**
 * @returns {string[]}
 */
function getSelectedErrors() {
  const boxes = document.querySelectorAll('#practice-errors input[type="checkbox"]:checked');
  return [...boxes].map((b) => b.value);
}

function renderItem() {
  const item = items[currentIndex];
  if (!item) return;
  const counter = document.getElementById('practice-counter');
  if (counter) {
    counter.textContent = `${t('practice.item')} ${currentIndex + 1} ${t('practice.of')} ${items.length}`;
  }
  const src = document.getElementById('practice-source');
  const trans = document.getElementById('practice-translation');
  const backBlock = document.getElementById('practice-back-block');
  const backEl = document.getElementById('practice-back');
  if (src) src.textContent = item.source;
  if (trans) trans.textContent = item.translation;
  if (item.backTranslation) {
    backBlock?.classList.remove('hidden');
    if (backEl) backEl.textContent = item.backTranslation;
  } else {
    backBlock?.classList.add('hidden');
    if (backEl) backEl.textContent = '';
  }

  const errBox = document.getElementById('practice-errors');
  if (errBox) {
    errBox.replaceChildren(
      ...ERROR_KEYS.map(({ cat, key }) => {
        const li = document.createElement('li');
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = 'perror';
        input.value = cat;
        input.id = `perror-${cat}`;
        label.append(input, ` ${t(key)}`);
        li.append(label);
        return li;
      }),
      (() => {
        const li = document.createElement('li');
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = 'perror';
        input.value = 'none';
        input.id = 'perror-none';
        label.append(input, ` ${t('practice.error.none')}`);
        li.append(label);
        return li;
      })(),
    );
  }

  document.getElementById('practice-answer')?.classList.add('hidden');
}

function showAnswer() {
  const item = items[currentIndex];
  const selected = getSelectedErrors().filter((e) => e !== 'none');
  const noneChecked = document.getElementById('perror-none')?.checked;
  const safeVal = document.querySelector('#practice-safe input:checked')?.value === 'yes';
  const answer = {
    selectedErrors: noneChecked && selected.length === 0 ? [] : selected,
    safeToSend: safeVal,
  };
  const score = scorePracticeItem(item, answer);
  const panel = document.getElementById('practice-answer');
  if (!panel) return;

  const safetyClass = score.safetyCorrect ? 'correct' : 'incorrect';
  const errorClass = score.errorScore >= 0.99 ? 'correct' : 'incorrect';

  const safeLabel = item.safeToSend ? t('practice.safe.yes') : t('practice.safe.no');
  panel.replaceChildren();
  const heading = document.createElement('h3');
  heading.textContent = t('practice.answerKey');
  panel.append(heading);

  const safeP = document.createElement('p');
  safeP.className = safetyClass;
  safeP.textContent = `${t('practice.safe')}: ${safeLabel}. ${score.safetyCorrect ? t('practice.correct') : t('practice.incorrect')}`;
  panel.append(safeP);

  const errP = document.createElement('p');
  errP.className = errorClass;
  errP.textContent = `${t('practice.errors')}: ${score.errorScore >= 0.99 ? t('practice.correct') : t('practice.incorrect')}${score.missed.length ? ` (missed: ${score.missed.join(', ')})` : ''}${score.falsePos.length ? ` (extra: ${score.falsePos.join(', ')})` : ''}`;
  panel.append(errP);

  const explain = document.createElement('p');
  explain.textContent = item.explanation;
  panel.append(explain);

  const synthetic = document.createElement('p');
  const em = document.createElement('em');
  em.textContent = t('practice.synthetic');
  synthetic.append(em);
  panel.append(synthetic);

  panel.classList.remove('hidden');
  panel.setAttribute('aria-live', 'polite');
}

export async function initPractice() {
  try {
    const res = await fetch('data/practice.json');
    const data = await res.json();
    items = data.items;
  } catch {
    const el = document.getElementById('practice-panel');
    if (el) {
      el.replaceChildren();
      const p = document.createElement('p');
      p.className = 'error-state';
      p.textContent = t('error.load');
      el.append(p);
    }
    return;
  }

  document.getElementById('practice-prev')?.addEventListener('click', () => {
    if (currentIndex > 0) { currentIndex--; renderItem(); }
  });
  document.getElementById('practice-next')?.addEventListener('click', () => {
    if (currentIndex < items.length - 1) { currentIndex++; renderItem(); }
  });
  document.getElementById('practice-submit')?.addEventListener('click', showAnswer);

  renderItem();
}
