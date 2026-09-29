import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const webPath = new URL('../web/', import.meta.url).pathname;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (extname(p) === '.js' || extname(p) === '.html') files.push(p);
  }
  return files;
}

const FORBIDDEN = [
  /localStorage\s*\./,
  /sessionStorage\s*\./,
  /indexedDB/,
  /sendBeacon\s*\(/,
  /new\s+WebSocket\s*\(/,
  /navigator\.clipboard\.read/,
  /fetch\s*\([^)]*,\s*\{[^}]*body\s*:/,
  /XMLHttpRequest/,
];

describe('privacy', () => {
  it('web code does not persist user text or send bodies', () => {
    const files = walk(webPath);
    const violations = [];
    for (const f of files) {
      const content = readFileSync(f, 'utf8');
      for (const re of FORBIDDEN) {
        if (re.test(content)) violations.push(`${f}: ${re}`);
      }
    }
    assert.deepEqual(violations, []);
  });

  it('HTML pages have CSP meta', () => {
    const pages = ['index.html', 'facilitator.html'];
    for (const p of pages) {
      const html = readFileSync(new URL(`../web/${p}`, import.meta.url), 'utf8');
      assert.match(html, /Content-Security-Policy/);
    }
  });
});
