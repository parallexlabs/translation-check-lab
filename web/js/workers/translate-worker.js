/**
 * Web Worker for on-device OPUS-MT translation via Transformers.js.
 */

import { MODEL_PAIRS, TRANSFORMERS_CDN, prepareModelInput } from '../core/models.js';
import { MAX_TRANSLATION_INPUT } from '../core/limits.js';

export { MAX_TRANSLATION_INPUT } from '../core/limits.js';

/** @type {import('@huggingface/transformers').Pipeline | null} */
let pipeline = null;
let currentModelId = null;
let cancelled = false;

/**
 * @param {string} modelId
 * @returns {{ revision?: string, targetLangToken?: string }|undefined}
 */
function pairMeta(modelId) {
  return MODEL_PAIRS.find((p) => p.id === modelId);
}

/**
 * Rough token estimate for max_new_tokens cap.
 * @param {string} text
 * @returns {number}
 */
function estimateInputTokens(text) {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * @param {object} e
 */
self.onmessage = async (e) => {
  const { type, modelId, text } = e.data;

  if (type === 'cancel') {
    cancelled = true;
    pipeline = null;
    currentModelId = null;
    self.postMessage({ type: 'cancelled' });
    return;
  }

  if (type === 'translate') {
    cancelled = false;
    if (!text || text.length > MAX_TRANSLATION_INPUT) {
      self.postMessage({ type: 'error', message: `Input exceeds ${MAX_TRANSLATION_INPUT} characters.` });
      return;
    }
    const meta = pairMeta(modelId);
    const inputText = meta ? prepareModelInput(text, meta) : text;
    const maxNew = Math.min(256, estimateInputTokens(inputText) * 2 + 10);

    try {
      if (!pipeline || currentModelId !== modelId) {
        self.postMessage({ type: 'progress', status: 'loading', percent: 0 });
        const { pipeline: createPipeline, env } = await import(/* webpackIgnore: true */ TRANSFORMERS_CDN);
        env.allowLocalModels = false;
        env.backends.onnx.wasm.proxy = false;
        pipeline = await createPipeline('translation', modelId, {
          dtype: 'q8',
          revision: meta?.revision,
          device: 'wasm',
          progress_callback: (info) => {
            if (cancelled) return;
            if (info.status === 'progress' && info.progress) {
              self.postMessage({ type: 'progress', status: 'downloading', percent: Math.round(info.progress) });
            }
          },
        });
        currentModelId = modelId;
      }
      if (cancelled) {
        self.postMessage({ type: 'cancelled' });
        return;
      }
      self.postMessage({ type: 'progress', status: 'translating', percent: 100 });
      const out = await pipeline(inputText, { max_new_tokens: maxNew });
      const translation = out[0]?.translation_text ?? '';
      if (cancelled) {
        self.postMessage({ type: 'cancelled' });
        return;
      }
      self.postMessage({ type: 'result', translation, modelId });
    } catch (err) {
      if (!cancelled) {
        self.postMessage({ type: 'error', message: String(err?.message || err || 'Model load failed') });
      }
    }
  }
};
