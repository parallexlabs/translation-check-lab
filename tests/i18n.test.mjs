import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const en = JSON.parse(readFileSync(new URL('../web/i18n/en.json', import.meta.url), 'utf8'));
const fr = JSON.parse(readFileSync(new URL('../web/i18n/fr.json', import.meta.url), 'utf8'));

describe('i18n', () => {
  it('en and fr have identical keys', () => {
    const enKeys = Object.keys(en).sort();
    const frKeys = Object.keys(fr).sort();
    assert.deepEqual(enKeys, frKeys);
  });

  it('no empty values', () => {
    for (const [k, v] of Object.entries(en)) {
      assert.ok(String(v).trim().length > 0, `empty en key: ${k}`);
    }
    for (const [k, v] of Object.entries(fr)) {
      assert.ok(String(v).trim().length > 0, `empty fr key: ${k}`);
    }
  });
});
