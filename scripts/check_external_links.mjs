#!/usr/bin/env node
/**
 * Check external URLs in web/ and README.md return HTTP 200 after redirects.
 * Run locally only; not part of CI.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

/** URLs that are not yet deployed or are CDN roots (not browseable pages). */
const SKIP = new Set([
  'https://parallexlabs.github.io/translation-check-lab/',
  'https://cdn-lfs.hf.co',
  'https://cdn-lfs-us-1.hf.co',
]);

/** @type {Set<string>} */
const urls = new Set();

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (['.html', '.md', '.json'].includes(extname(p))) collect(p);
  }
}

/**
 * @param {string} raw
 * @returns {string}
 */
function cleanUrl(raw) {
  return raw.replace(/[`'".,;)]+$/, '').replace(/^[`'"]+/, '');
}

function collect(filePath) {
  let text = readFileSync(filePath, 'utf8');
  // Skip CSP meta values; those hosts are not browseable pages.
  text = text.replace(/Content-Security-Policy"[^"]*"/g, '');
  const patterns = [
    /href="(https?:\/\/[^"]+)"/g,
    /\]\((https?:\/\/[^)]+)\)/g,
    /(https?:\/\/[^\s"'<>)\]`]+)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const url = cleanUrl(m[1] ?? m[0]);
      if (url && !SKIP.has(url)) urls.add(url);
    }
  }
}

walk(join(ROOT, 'web'));
const readme = join(ROOT, 'README.md');
if (statSync(readme).isFile()) collect(readme);

const failures = [];
let ok = 0;
let skipped = SKIP.size;

for (const url of [...urls].sort()) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (res.status === 200) {
      ok += 1;
      console.log(`OK  ${res.status} ${url}`);
    } else {
      failures.push({ url, status: res.status });
      console.error(`FAIL ${res.status} ${url}`);
    }
  } catch (err) {
    failures.push({ url, status: String(err.message || err) });
    console.error(`FAIL ${url}: ${err.message || err}`);
  }
}

console.log(`\n${ok}/${urls.size} URLs returned 200 (${skipped} skipped)`);
if (failures.length) {
  console.error('\ncheck_external_links FAILED');
  process.exit(1);
}
console.log('check_external_links OK');
