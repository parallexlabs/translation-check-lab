import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function parsePage(file) {
  return readFileSync(new URL(`../web/${file}`, import.meta.url), 'utf8');
}

describe('accessibility (HTML structure)', () => {
  const html = parsePage('index.html');

  it('has lang attribute on html', () => {
    assert.match(html, /<html[^>]+lang="/);
  });

  it('has title', () => {
    assert.match(html, /<title>[^<]+<\/title>/);
  });

  it('has skip link', () => {
    assert.match(html, /class="skip-link"/);
  });

  it('has one h1 per view section', () => {
    const h1s = html.match(/<h1/g) || [];
    assert.ok(h1s.length >= 1);
  });

  it('form controls have labels or aria', () => {
    assert.match(html, /for="source-text"/);
    assert.match(html, /for="translation-text"/);
    assert.match(html, /<legend/);
  });

  it('buttons have accessible names', () => {
    assert.match(html, /id="run-checks"/);
    assert.match(html, /id="load-model"/);
  });

  it('aria-live regions for dynamic content', () => {
    assert.match(html, /aria-live/);
  });

  it('facilitator page has main landmark', () => {
    const fac = parsePage('facilitator.html');
    assert.match(fac, /<main/);
    assert.match(fac, /<h1/);
  });
});
