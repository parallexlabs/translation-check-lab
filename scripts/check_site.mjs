#!/usr/bin/env node
/**
 * Serve web/ under /translation-check-lab/ and crawl for broken links and absolute paths.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, '../web');
const BASE_PATH = '/translation-check-lab';
const PORT = 8765;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

function handler(req, res) {
  let path = req.url.split('?')[0];
  if (!path.startsWith(BASE_PATH)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  let rel = path.slice(BASE_PATH.length) || '/index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const filePath = join(WEB_ROOT, rel);
  if (!filePath.startsWith(WEB_ROOT) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const body = readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
  res.end(body);
}

function extractRefs(html, currentFile) {
  const refs = [];
  const hrefRe = /(?:href|src)=["']([^"']+)["']/g;
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    refs.push({ type: 'ref', value: m[1], file: currentFile });
  }
  return refs;
}

function resolveRef(ref, fromFile) {
  if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('mailto:') || ref.startsWith('#')) {
    return null;
  }
  if (ref.startsWith('/')) {
    return { error: 'root-absolute', ref, fromFile };
  }
  const dir = dirname(fromFile);
  const target = resolve(dir, ref.split('#')[0]);
  return { target, fromFile, ref };
}

async function crawl() {
  const errors = [];
  const visited = new Set();
  const queue = ['index.html', 'facilitator.html'];

  while (queue.length) {
    const rel = queue.shift();
    if (visited.has(rel)) continue;
    visited.add(rel);
    const full = join(WEB_ROOT, rel);
    if (!existsSync(full)) {
      errors.push(`Missing file: ${rel}`);
      continue;
    }
    const content = readFileSync(full, 'utf8');
    if (content.match(/src=["']\/[^"']+["']/) || content.match(/href=["']\/[^"']+["']/)) {
      errors.push(`Root-absolute path in ${rel}`);
    }
    if (extname(rel) === '.html' || extname(rel) === '.js') {
      for (const { value } of extractRefs(content, full)) {
        const r = resolveRef(value, full);
        if (!r) continue;
        if (r.error) {
          errors.push(`${r.error}: ${r.ref} in ${r.fromFile}`);
          continue;
        }
        if (!r.target.startsWith(WEB_ROOT)) {
          errors.push(`Path escapes web root: ${value} from ${rel}`);
          continue;
        }
        if (!existsSync(r.target)) {
          errors.push(`Broken link: ${value} in ${rel}`);
          continue;
        }
        if (r.target.endsWith('.html') || statSync(r.target).isDirectory()) {
          queue.push(r.target.slice(WEB_ROOT.length + 1));
        }
      }
    }
  }

  const facilitator = 'facilitator.html';
  if (!visited.has(facilitator)) {
    const fpath = join(WEB_ROOT, facilitator);
    if (existsSync(fpath)) {
      const content = readFileSync(fpath, 'utf8');
      for (const { value } of extractRefs(content, fpath)) {
        const r = resolveRef(value, fpath);
        if (r?.error) errors.push(`${r.error}: ${r.ref}`);
        if (r?.target && !existsSync(r.target)) errors.push(`Broken: ${value} in facilitator.html`);
      }
    }
  }

  return errors;
}

const server = createServer(handler);
server.listen(PORT, async () => {
  const errors = await crawl();
  server.close();
  if (errors.length) {
    console.error('check:site FAILED');
    errors.forEach((e) => console.error(' -', e));
    process.exit(1);
  }
  console.log(`check:site OK (${WEB_ROOT} under ${BASE_PATH})`);
});
