/**
 * Decide whether live translation should overwrite the translation field.
 * @param {string} translationText
 * @returns {'translate_and_back'|'back_only'}
 */
export function translationFlowMode(translationText) {
  return translationText.trim() ? 'back_only' : 'translate_and_back';
}

/**
 * @param {string} translationText
 * @returns {boolean}
 */
export function shouldPreserveUserTranslation(translationText) {
  return translationFlowMode(translationText) === 'back_only';
}
