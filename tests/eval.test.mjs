import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EVAL_DIR = join(ROOT, 'eval');
const RESULTS_PATH = join(EVAL_DIR, 'results.json');

describe('eval script', () => {
  it('pattern-only run preserves existing model section', () => {
    mkdirSync(EVAL_DIR, { recursive: true });
    const backup = existsSync(RESULTS_PATH) ? readFileSync(RESULTS_PATH, 'utf8') : null;
    const stubModel = {
      'en-fr': {
        modelForward: 'Xenova/opus-mt-en-fr',
        modelBack: 'Xenova/opus-mt-fr-en',
        preserved: 15,
        n: 30,
        distinctScenarios: 30,
        rate: 0.5,
      },
    };
    writeFileSync(RESULTS_PATH, JSON.stringify({
      date: '2026-09-29',
      mode: 'pattern+model',
      practice: { uniqueItems: 17, overall: { precision: 0.5, recall: 1, n: 15, uniqueItems: 17 }, byCategory: {} },
      model: stubModel,
    }, null, 2));

    execFileSync(process.execPath, [join(ROOT, 'scripts/eval.mjs')], { cwd: ROOT, stdio: 'pipe' });

    const out = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));
    assert.equal(out.mode, 'pattern-only');
    assert.deepEqual(out.model, stubModel);

    if (backup) {
      writeFileSync(RESULTS_PATH, backup);
    }
  });
});
