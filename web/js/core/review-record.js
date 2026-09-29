/**
 * Escape Markdown special characters in user-provided text.
 * @param {string} text
 * @returns {string}
 */
export function escapeMarkdown(text) {
  return text.replace(/([\\`*_{}[\]()#+.!|>-])/g, '\\$1');
}

/**
 * Wrap user text in a collision-safe fenced block for Markdown export.
 * @param {string} text
 * @returns {string}
 */
export function fencedUserText(text) {
  const fence = '```text';
  const body = text.replace(/```/g, '``\\`');
  return `${fence}\n${body}\n\`\`\``;
}

/**
 * In-memory human review record (no persistence, no names stored).
 */

/** @typedef {'approve'|'approve_edits'|'do_not_send'} ReviewDecision */

/** @typedef {'from_community'|'checked_with_community'|'neither'} CommunityStatus */

/** @typedef {'yes'|'no'|'not_applicable'} PretestStatus */

/**
 * @typedef {object} ReviewRecord
 * @property {string} languageCompetence Reviewer's language competence (no names)
 * @property {string} dialectCompetence Reviewer's dialect or variety competence
 * @property {CommunityStatus|null} communityStatus
 * @property {string[]} checksCompleted
 * @property {PretestStatus|null} pretestedWithCommunity
 * @property {ReviewDecision} decision
 * @property {string} editedText
 * @property {string} sourceText
 * @property {string} translationText
 * @property {string} timestamp ISO
 */

const REQUIRED_CHECKS = ['source', 'numbers', 'negation', 'contact', 'sms', 'bilingual'];

/**
 * @param {Partial<ReviewRecord>} data
 * @returns {ReviewRecord}
 */
export function createReviewRecord(data = {}) {
  return {
    languageCompetence: data.languageCompetence ?? '',
    dialectCompetence: data.dialectCompetence ?? '',
    communityStatus: data.communityStatus ?? null,
    checksCompleted: data.checksCompleted ?? [],
    pretestedWithCommunity: data.pretestedWithCommunity ?? null,
    decision: data.decision ?? 'do_not_send',
    editedText: data.editedText ?? '',
    sourceText: data.sourceText ?? '',
    translationText: data.translationText ?? '',
    timestamp: data.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Whether the human review record is complete enough to copy final text.
 * @param {ReviewRecord} record
 * @returns {boolean}
 */
export function isReviewComplete(record) {
  if (!record.languageCompetence.trim()) return false;
  if (!record.dialectCompetence.trim()) return false;
  if (!record.communityStatus) return false;
  if (!record.pretestedWithCommunity) return false;
  if (!record.decision) return false;
  if (record.decision === 'approve_edits' && !record.editedText.trim()) return false;
  const done = new Set(record.checksCompleted.map((c) => c.toLowerCase()));
  for (const req of REQUIRED_CHECKS) {
    if (!done.has(req)) return false;
  }
  return true;
}

/**
 * @param {ReviewRecord} record
 * @returns {string}
 */
export function reviewToMarkdown(record) {
  const decisionLabels = {
    approve: 'Approve',
    approve_edits: 'Approve with edits',
    do_not_send: 'Do not send',
  };
  const communityLabels = {
    from_community: 'Reviewer is from the affected community',
    checked_with_community: 'Reviewer has checked with community members',
    neither: 'Neither of the above',
  };
  const pretestLabels = {
    yes: 'Yes, pre-tested with community members',
    no: 'No, not pre-tested',
    not_applicable: 'Not applicable for this message',
  };
  const lines = [
    '# Translation review record',
    '',
    `**Date:** ${record.timestamp}`,
    `**Language competence:** ${escapeMarkdown(record.languageCompetence || '(not specified)')}`,
    `**Dialect or variety competence:** ${escapeMarkdown(record.dialectCompetence || '(not specified)')}`,
    `**Community connection:** ${record.communityStatus ? communityLabels[record.communityStatus] : '(not specified)'}`,
    `**Pre-tested with community:** ${record.pretestedWithCommunity ? pretestLabels[record.pretestedWithCommunity] : '(not specified)'}`,
    `**Decision:** ${decisionLabels[record.decision]}`,
    '',
    '## Checks completed',
    ...record.checksCompleted.map((c) => `- ${escapeMarkdown(c)}`),
    '',
    '## Source',
    '',
    fencedUserText(record.sourceText),
    '',
    '## Translation reviewed',
    '',
    fencedUserText(record.translationText),
    '',
  ];
  if (record.editedText && record.decision === 'approve_edits') {
    lines.push('## Final edited text', '', fencedUserText(record.editedText), '');
  }
  lines.push(
    '---',
    '*Synthetic training record. This record is not an approval by the software. A qualified human must still authorize any operational message.*',
  );
  return lines.join('\n');
}

export { REQUIRED_CHECKS };
