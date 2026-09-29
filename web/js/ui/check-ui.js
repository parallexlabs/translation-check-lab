/**
 * Check my own text UI.
 */

import { runMeaningChecks, skipsTranslationInstructionCheck } from '../core/meaning-checks.js';
import { countSms, appendUcs2Highlights, suggestPlainQuotes } from '../core/gsm.js';
import { analyzeSourceHints } from '../core/source-hints.js';
import {
  getModelPair, pairsFromLang, isRtl, MODEL_PAIRS, formatBenchmark, prepareModelInput,
} from '../core/models.js';
import { createReviewRecord, reviewToMarkdown, isReviewComplete, REQUIRED_CHECKS } from '../core/review-record.js';
import { MAX_PATTERN_INPUT } from '../core/limits.js';
import { translationFlowMode } from '../core/translation-flow.js';
import { t } from './i18n.js';
import { setReviewDirty } from './app.js';

const MODEL_TIMEOUT_MS = 60_000;

/** @type {Worker | null} */
let worker = null;

/** @type {{ resolve: (value?: unknown) => void, reject: (reason?: unknown) => void } | null} */
let pendingTranslation = null;

/** @type {ReturnType<typeof setTimeout> | null} */
let modelTimeoutId = null;

/** @type {ReturnType<typeof setInterval> | null} */
let modelStallCheckId = null;

function getSourceLang() {
  return document.getElementById('source-lang')?.value || 'en';
}

function getTargetLang() {
  return document.getElementById('target-lang')?.value || 'fr';
}

function updateTargetOptions() {
  const src = getSourceLang();
  const sel = document.getElementById('target-lang');
  if (!sel) return;
  sel.replaceChildren(...pairsFromLang(src).map((p) => {
    const opt = document.createElement('option');
    opt.value = p.targetLang;
    opt.textContent = p.targetLang;
    return opt;
  }));
  updateModelInfo();
  updateArabicInstructionNote();
}

function updateModelInfo() {
  const pair = getModelPair(getSourceLang(), getTargetLang());
  const sizeEl = document.getElementById('model-size');
  const benchEl = document.getElementById('model-benchmark');
  const warnEl = document.getElementById('model-quality-warning');
  if (!pair) return;
  if (sizeEl) sizeEl.textContent = `~${pair.downloadMb} MB (quantized q8, revision ${pair.revision.slice(0, 8)})`;
  if (benchEl) {
    benchEl.replaceChildren();
    benchEl.append(`${formatBenchmark(pair)}. `);
    const link = document.createElement('a');
    link.href = pair.benchmark.cardUrl;
    link.rel = 'noopener';
    link.textContent = 'Model card';
    benchEl.append(link);
  }
  if (warnEl) {
    if (pair.qualityWarning) {
      warnEl.classList.remove('hidden');
      warnEl.textContent = pair.qualityWarningText ?? t('check.qualityWarning');
    } else {
      warnEl.classList.add('hidden');
      warnEl.textContent = '';
    }
  }
}

function updateArabicInstructionNote() {
  const noteEl = document.getElementById('ar-instruction-note');
  if (!noteEl) return;
  if (skipsTranslationInstructionCheck(getTargetLang())) {
    noteEl.hidden = false;
    noteEl.textContent = t('check.arInstructionNote');
  } else {
    noteEl.hidden = true;
    noteEl.textContent = '';
  }
}

function renderPairList() {
  const list = document.getElementById('pair-quality-list');
  if (!list) return;
  list.replaceChildren(...MODEL_PAIRS.map((p) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = `${p.sourceLang} → ${p.targetLang}`;
    li.append(strong, `: ${p.benchmark.testset}: BLEU ${p.benchmark.bleu}, chrF ${p.benchmark.chrf} (`);
    const link = document.createElement('a');
    link.href = p.benchmark.cardUrl;
    link.rel = 'noopener';
    link.textContent = 'model card';
    li.append(link, ')');
    if (p.qualityWarning) {
      const warn = document.createElement('p');
      warn.className = 'warning-inline';
      warn.textContent = p.qualityWarningText ?? t('check.qualityWarning');
      li.append(warn);
    }
    return li;
  }));
}

/**
 * @param {import('../core/meaning-checks.js').MeaningFlag[]} flags
 */
function renderFlags(flags) {
  const list = document.getElementById('flags-list');
  const live = document.getElementById('results-live');
  if (!list) return;
  list.replaceChildren();
  if (flags.length === 0) {
    const li = document.createElement('li');
    li.textContent = t('check.noFlags');
    list.append(li);
  } else {
    for (const f of flags) {
      const li = document.createElement('li');
      li.className = 'flag-item';
      li.dataset.category = f.category;
      const badge = document.createElement('span');
      badge.className = 'flag-badge';
      badge.textContent = t(`flag.${f.category}`);
      const detail = document.createElement('span');
      detail.textContent = f.detail;
      li.append(badge, detail);
      list.append(li);
    }
  }
  if (live) {
    if (flags.length === 0) {
      live.textContent = t('check.noFlags');
    } else {
      live.textContent = t('check.flagsSummary').replace('{count}', String(flags.length));
    }
  }
}

function renderSms(text, containerId, label) {
  const c = countSms(text);
  const el = document.getElementById(containerId);
  if (!el) return;
  const encLabel = c.encoding === 'gsm7' ? t('check.smsGsm7') : t('check.smsUcs2');
  el.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = label;
  el.append(title);
  const enc = document.createElement('p');
  enc.className = 'sms-stat';
  enc.textContent = `${t('check.smsEncoding')}: ${encLabel}`;
  el.append(enc);
  const stat = document.createElement('p');
  stat.className = 'sms-stat';
  stat.textContent = `${c.length} ${t('check.smsChars')}, ${c.segments} ${t('check.smsSegments')}`;
  el.append(stat);

  if (c.encoding === 'ucs2' && text) {
    const intro = document.createElement('p');
    intro.textContent = t('check.smsForcesUcs2');
    el.append(intro);
    const highlight = document.createElement('p');
    highlight.className = 'sms-highlight';
    appendUcs2Highlights(highlight, text);
    el.append(highlight);
    const quote = suggestPlainQuotes(text);
    if (quote.hasTypographic) {
      const suggestion = document.createElement('p');
      suggestion.className = 'sms-suggestion';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-secondary btn-small';
      btn.dataset.suggestQuotes = containerId;
      btn.textContent = t('check.replaceQuotes');
      suggestion.append(btn, ` ${t('check.replaceQuotesHint')}`);
      el.append(suggestion);
    }
  }

  el.querySelector('[data-suggest-quotes]')?.addEventListener('click', () => {
    const fieldId = containerId === 'sms-source' ? 'source-text' : 'translation-text';
    const field = document.getElementById(fieldId);
    if (!field) return;
    const suggestion = suggestPlainQuotes(field.value);
    if (suggestion.hasTypographic && confirm(t('check.replaceQuotesConfirm'))) {
      field.value = suggestion.suggestion;
      runChecks();
    }
  });
}

/**
 * @param {{ detail: string }[]} hints
 */
function renderHints(hints) {
  const el = document.getElementById('hints-list');
  if (!el) return;
  el.replaceChildren();
  if (!hints.length) {
    const li = document.createElement('li');
    li.textContent = t('check.hintsNone');
    el.append(li);
    return;
  }
  for (const h of hints) {
    const li = document.createElement('li');
    li.textContent = h.detail;
    el.append(li);
  }
}

/**
 * @param {string} text
 * @param {string} labelKey
 */
function renderBackTranslation(text, labelKey) {
  const backEl = document.getElementById('back-translation');
  const labelEl = document.getElementById('back-translation-label');
  if (labelEl) labelEl.textContent = t(labelKey);
  if (!backEl) return;
  const capped = text.length > MAX_PATTERN_INPUT ? text.slice(0, MAX_PATTERN_INPUT) : text;
  backEl.replaceChildren();
  backEl.append(document.createTextNode(capped));
}

function runChecks() {
  const sourceField = document.getElementById('source-text');
  const translationField = document.getElementById('translation-text');
  let source = sourceField?.value || '';
  let translation = translationField?.value || '';
  if (source.length > MAX_PATTERN_INPUT) {
    source = source.slice(0, MAX_PATTERN_INPUT);
    if (sourceField) sourceField.value = source;
  }
  if (translation.length > MAX_PATTERN_INPUT) {
    translation = translation.slice(0, MAX_PATTERN_INPUT);
    if (translationField) translationField.value = translation;
  }
  const back = document.getElementById('back-translation')?.textContent || '';
  const srcLang = getSourceLang();
  const tgtLang = getTargetLang();

  const flags = runMeaningChecks(source, translation, back, { sourceLang: srcLang, targetLang: tgtLang });
  renderFlags(flags);
  renderSms(source, 'sms-source', t('check.smsSource'));
  renderSms(translation, 'sms-translation', t('check.smsTranslation'));
  renderHints(analyzeSourceHints(source));
  updateArabicInstructionNote();

  const transEl = document.getElementById('translation-display');
  if (transEl && translation) {
    transEl.dir = isRtl(tgtLang) ? 'rtl' : 'ltr';
    transEl.lang = tgtLang;
  }
  updateCopyButton();
}

function clearModelTimers() {
  if (modelTimeoutId) {
    clearTimeout(modelTimeoutId);
    modelTimeoutId = null;
  }
  if (modelStallCheckId) {
    clearInterval(modelStallCheckId);
    modelStallCheckId = null;
  }
}

function setModelButtonsEnabled(enabled) {
  const loadBtn = document.getElementById('load-model');
  const cancelBtn = document.getElementById('cancel-model');
  if (loadBtn) loadBtn.disabled = !enabled;
  if (cancelBtn) cancelBtn.disabled = !enabled;
}

function handleModelTimeout(statusEl, progressEl, workerRef) {
  clearModelTimers();
  if (workerRef) {
    workerRef.terminate();
    worker = null;
  }
  pendingTranslation = null;
  if (statusEl) statusEl.textContent = t('check.modelTimeout');
  if (progressEl) progressEl.classList.add('hidden');
  setModelButtonsEnabled(true);
  runChecks();
}

function resetModelUi() {
  const statusEl = document.getElementById('model-status');
  const progressEl = document.getElementById('model-progress');
  clearModelTimers();
  if (statusEl) statusEl.textContent = t('check.modelCancelled');
  if (progressEl) progressEl.classList.add('hidden');
  setModelButtonsEnabled(true);
}

function cancelLiveTranslation() {
  if (pendingTranslation) {
    pendingTranslation.reject(new Error('cancelled'));
    pendingTranslation = null;
  }
  if (worker) {
    worker.terminate();
    worker = null;
  }
  resetModelUi();
}

function ensureWorker() {
  if (!worker) {
    worker = new Worker('js/workers/translate-worker.js', { type: 'module' });
  }
  return worker;
}

function startModelStallWatch(startTime, statusEl, progressEl, activeWorker) {
  clearModelTimers();
  let lastProgress = startTime;
  modelStallCheckId = setInterval(() => {
    if (Date.now() - lastProgress >= MODEL_TIMEOUT_MS) {
      handleModelTimeout(statusEl, progressEl, activeWorker);
    }
  }, 1000);
  modelTimeoutId = setTimeout(() => {
    handleModelTimeout(statusEl, progressEl, activeWorker);
  }, MODEL_TIMEOUT_MS);
  return () => {
    lastProgress = Date.now();
  };
}

async function runLiveTranslation() {
  const source = document.getElementById('source-text')?.value || '';
  if (!source.trim()) return;
  if (source.length > MAX_PATTERN_INPUT) return;
  const srcLang = getSourceLang();
  const tgtLang = getTargetLang();
  const pair = getModelPair(srcLang, tgtLang);
  if (!pair) return;

  cancelLiveTranslation();

  const statusEl = document.getElementById('model-status');
  const progressEl = document.getElementById('model-progress');
  const progressFill = document.getElementById('model-progress-fill');
  const transInput = document.getElementById('translation-text');
  const existingTranslation = transInput?.value || '';
  const flowMode = translationFlowMode(existingTranslation);

  if (statusEl) statusEl.textContent = t('check.modelLoading');
  if (progressEl) progressEl.classList.remove('hidden');
  setModelButtonsEnabled(false);

  const activeWorker = ensureWorker();
  const touchProgress = startModelStallWatch(Date.now(), statusEl, progressEl, activeWorker);

  return new Promise((resolve, reject) => {
    pendingTranslation = { resolve, reject };
    const backPair = getModelPair(tgtLang, srcLang);
    if (!backPair) {
      pendingTranslation = null;
      clearModelTimers();
      setModelButtonsEnabled(true);
      resolve();
      return;
    }

    const finishSuccess = (backText, labelKey) => {
      renderBackTranslation(backText, labelKey);
      if (statusEl) statusEl.textContent = t('check.modelReady');
      if (progressEl) progressEl.classList.add('hidden');
      clearModelTimers();
      setModelButtonsEnabled(true);
      pendingTranslation = null;
      runChecks();
      resolve();
    };

    const handler = (e) => {
      const { type, percent, translation } = e.data;
      if (type === 'progress') {
        touchProgress();
        if (progressFill) progressFill.value = percent || 0;
      }
      if (type === 'result') {
        touchProgress();
        if (flowMode === 'translate_and_back' && e.data.modelId === pair.id) {
          if (transInput) transInput.value = translation;
          const backInput = prepareModelInput(translation, backPair);
          activeWorker.postMessage({
            type: 'translate',
            modelId: backPair.id,
            text: backInput,
            sourceLang: tgtLang,
            targetLang: srcLang,
          });
        } else if (flowMode === 'back_only' || e.data.modelId === backPair.id) {
          activeWorker.removeEventListener('message', handler);
          const labelKey = flowMode === 'back_only'
            ? 'check.backTranslationUser'
            : 'check.backTranslation';
          finishSuccess(translation, labelKey);
        }
      }
      if (type === 'error') {
        if (statusEl) statusEl.textContent = t('check.modelFailed');
        if (progressEl) progressEl.classList.add('hidden');
        clearModelTimers();
        setModelButtonsEnabled(true);
        activeWorker.removeEventListener('message', handler);
        pendingTranslation = null;
        runChecks();
        resolve();
      }
      if (type === 'cancelled') {
        activeWorker.removeEventListener('message', handler);
        pendingTranslation = null;
        resetModelUi();
        reject(new Error('cancelled'));
      }
    };

    activeWorker.addEventListener('message', handler);

    if (flowMode === 'back_only') {
      const backInput = prepareModelInput(existingTranslation, backPair);
      activeWorker.postMessage({
        type: 'translate',
        modelId: backPair.id,
        text: backInput,
        sourceLang: tgtLang,
        targetLang: srcLang,
      });
    } else {
      const forwardInput = prepareModelInput(source, pair);
      activeWorker.postMessage({
        type: 'translate',
        modelId: pair.id,
        text: forwardInput,
        sourceLang: srcLang,
        targetLang: tgtLang,
      });
    }
  }).catch(() => {
    /* cancel is expected */
  });
}

function buildRecord() {
  const checks = [...document.querySelectorAll('.review-check:checked')].map((c) => c.value);
  const decision = document.querySelector('#review-decision input:checked')?.value || 'do_not_send';
  const community = document.querySelector('#community-status input:checked')?.value || null;
  const pretest = document.querySelector('#pretest-status input:checked')?.value || null;
  return createReviewRecord({
    languageCompetence: document.getElementById('language-competence')?.value || '',
    dialectCompetence: document.getElementById('dialect-competence')?.value || '',
    communityStatus: community,
    checksCompleted: checks,
    pretestedWithCommunity: pretest,
    decision,
    editedText: document.getElementById('edited-text')?.value || '',
    sourceText: document.getElementById('source-text')?.value || '',
    translationText: document.getElementById('translation-text')?.value || '',
  });
}

function updateCopyButton() {
  const btn = document.getElementById('copy-final-text');
  const hint = document.getElementById('copy-final-hint');
  if (!btn) return;
  const record = buildRecord();
  const complete = isReviewComplete(record);
  btn.disabled = !complete;
  if (hint) {
    hint.textContent = complete ? t('check.copyReady') : t('check.copyLocked');
  }
}

function initReview() {
  const list = document.getElementById('review-checks');
  if (list) {
    list.replaceChildren(...REQUIRED_CHECKS.map((c) => {
      const li = document.createElement('li');
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = c;
      input.className = 'review-check';
      label.append(input, ` ${t(`check.check.${c}`)}`);
      li.append(label);
      return li;
    }));
  }

  document.getElementById('export-md')?.addEventListener('click', () => {
    const record = buildRecord();
    const md = reviewToMarkdown(record);
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'translation-review.md';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('print-record')?.addEventListener('click', () => {
    window.print();
  });

  document.getElementById('copy-final-text')?.addEventListener('click', async () => {
    const record = buildRecord();
    if (!isReviewComplete(record)) return;
    const text = record.decision === 'approve_edits' ? record.editedText : record.translationText;
    try {
      await navigator.clipboard.writeText(text);
      const status = document.getElementById('copy-final-status');
      if (status) status.textContent = t('check.copyDone');
    } catch {
      const status = document.getElementById('copy-final-status');
      if (status) status.textContent = t('check.copyFailed');
    }
  });

  document.querySelectorAll('#review-form input, #review-form textarea, #review-form select').forEach((el) => {
    el.addEventListener('change', () => {
      setReviewDirty(true);
      updateCopyButton();
    });
    el.addEventListener('input', () => {
      setReviewDirty(true);
      updateCopyButton();
    });
  });

  updateCopyButton();
}

export function initCheck() {
  const srcSel = document.getElementById('source-lang');
  if (srcSel) {
    const langs = [...new Set(MODEL_PAIRS.map((p) => p.sourceLang))];
    srcSel.replaceChildren(...langs.map((l) => {
      const opt = document.createElement('option');
      opt.value = l;
      opt.textContent = l;
      return opt;
    }));
    srcSel.addEventListener('change', updateTargetOptions);
    updateTargetOptions();
  }

  const sourceField = document.getElementById('source-text');
  const translationField = document.getElementById('translation-text');
  if (sourceField) sourceField.maxLength = MAX_PATTERN_INPUT;
  if (translationField) translationField.maxLength = MAX_PATTERN_INPUT;

  renderPairList();
  document.getElementById('target-lang')?.addEventListener('change', () => {
    updateModelInfo();
    updateArabicInstructionNote();
  });
  document.getElementById('run-checks')?.addEventListener('click', runChecks);
  document.getElementById('load-model')?.addEventListener('click', runLiveTranslation);
  document.getElementById('cancel-model')?.addEventListener('click', cancelLiveTranslation);

  initReview();
}

export { translationFlowMode };
