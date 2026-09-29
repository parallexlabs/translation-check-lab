import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const WEB_ROOT = resolve(__dirname, '../../web');
const RUN_MODEL_TESTS = process.env.RUN_MODEL_TESTS === '1';
const BASE_PATH = '/translation-check-lab';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function startServer() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer((req, res) => {
      let urlPath = req.url?.split('?')[0] ?? '/';
      if (!urlPath.startsWith(BASE_PATH)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      let rel = urlPath.slice(BASE_PATH.length);
      if (rel === '' || rel === '/') rel = '/index.html';
      const disk = join(WEB_ROOT, rel);
      if (!existsSync(disk) || statSync(disk).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[extname(disk)] ?? 'application/octet-stream' });
      res.end(readFileSync(disk));
    });
    server.on('error', reject);
    server.listen(0, () => {
      const port = server.address()?.port;
      resolvePromise({ server, port });
    });
  });
}

test('index and facilitator load without console errors', async () => {
  const { chromium } = await import('playwright');
  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}${BASE_PATH}`;

  const browser = await chromium.launch({ headless: true });
  try {
    for (const pagePath of ['/', '/facilitator.html']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(String(err)));
      await page.goto(`${baseUrl}${pagePath === '/' ? '/index.html' : pagePath}`, { waitUntil: 'networkidle' });
      assert.equal(errors.length, 0, `Console errors on ${pagePath}: ${errors.join('; ')}`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});

test('copy final text stays locked until review complete', async () => {
  const { chromium } = await import('playwright');
  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}${BASE_PATH}`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/index.html#check`, { waitUntil: 'networkidle' });
    const copyBtn = page.locator('#copy-final-text');
    await assert.rejects(async () => {
      await copyBtn.click({ timeout: 500 });
    });
    assert.equal(await copyBtn.isDisabled(), true);
  } finally {
    await browser.close();
    server.close();
  }
});

test(
  'OPUS-MT translates one message in Chromium',
  { timeout: 600_000, skip: !RUN_MODEL_TESTS },
  async () => {
    const { chromium } = await import('playwright');
    const { server, port } = await startServer();
    const baseUrl = `http://127.0.0.1:${port}${BASE_PATH}`;

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`${baseUrl}/index.html#check`, { waitUntil: 'networkidle' });

      const result = await page.evaluate(async () => {
        const worker = new Worker('./js/workers/translate-worker.js', { type: 'module' });
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('timeout')), 540000);
          worker.onmessage = (e) => {
            if (e.data.type === 'result') {
              clearTimeout(timer);
              worker.terminate();
              resolve(e.data.translation);
            }
            if (e.data.type === 'error') {
              clearTimeout(timer);
              worker.terminate();
              reject(new Error(e.data.message));
            }
          };
          worker.postMessage({
            type: 'translate',
            modelId: 'Xenova/opus-mt-en-fr',
            text: 'Boil tap water for 3 minutes.',
          });
        });
      });

      assert.ok(result.length > 0, 'expected non-empty translation');
    } finally {
      await browser.close();
      server.close();
    }
  },
);

const WELL_12_MESSAGE = 'Do not drink water from Well 12. Boil tap water for 10 minutes. Food distribution on 03/04 at 14:00 at Site 7. Call 0800-77-88-90 for help.';

test(
  'Well 12 scenario flags missing boil after model back-translation',
  { timeout: 600_000, skip: !RUN_MODEL_TESTS },
  async () => {
    const { chromium } = await import('playwright');
    const { server, port } = await startServer();
    const baseUrl = `http://127.0.0.1:${port}${BASE_PATH}`;

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`${baseUrl}/index.html#check`, { waitUntil: 'networkidle' });
      await page.fill('#source-text', WELL_12_MESSAGE);
      await page.click('#load-model');
      await page.waitForFunction(
        () => (document.getElementById('back-translation')?.textContent || '').length > 20,
        null,
        { timeout: 540000 },
      );
      await page.click('#run-checks');
      const flagText = await page.locator('#flags-list').innerText();
      assert.match(flagText, /boil/i);
      assert.match(flagText, /back-translation/i);
      assert.doesNotMatch(flagText, /Well.*missing.*capital/i);
    } finally {
      await browser.close();
      server.close();
    }
  },
);

test(
  'preserves pasted translation and back-translates user text only',
  { timeout: 600_000, skip: !RUN_MODEL_TESTS },
  async () => {
    const { chromium } = await import('playwright');
    const { server, port } = await startServer();
    const baseUrl = `http://127.0.0.1:${port}${BASE_PATH}`;

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`${baseUrl}/index.html#check`, { waitUntil: 'networkidle' });
      const userTranslation = 'Ne buvez pas l\'eau du puits 12.';
      await page.fill('#source-text', WELL_12_MESSAGE);
      await page.fill('#translation-text', userTranslation);
      await page.click('#load-model');
      await page.waitForFunction(
        () => (document.getElementById('back-translation')?.textContent || '').length > 10,
        null,
        { timeout: 540000 },
      );
      assert.equal(await page.inputValue('#translation-text'), userTranslation);
      const label = await page.locator('#back-translation-label').innerText();
      assert.match(label, /your translation|votre traduction/i);
    } finally {
      await browser.close();
      server.close();
    }
  },
);

test(
  'fills empty translation field after model translate and back',
  { timeout: 600_000, skip: !RUN_MODEL_TESTS },
  async () => {
    const { chromium } = await import('playwright');
    const { server, port } = await startServer();
    const baseUrl = `http://127.0.0.1:${port}${BASE_PATH}`;

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`${baseUrl}/index.html#check`, { waitUntil: 'networkidle' });
      await page.fill('#source-text', 'Boil tap water for 3 minutes.');
      await page.click('#load-model');
      await page.waitForFunction(
        () => (document.getElementById('translation-text')?.value || '').length > 5,
        null,
        { timeout: 540000 },
      );
      await page.waitForFunction(
        () => (document.getElementById('back-translation')?.textContent || '').length > 5,
        null,
        { timeout: 540000 },
      );
      const translation = await page.inputValue('#translation-text');
      assert.ok(translation.length > 0);
      assert.ok((await page.locator('#back-translation').innerText()).length > 0);
    } finally {
      await browser.close();
      server.close();
    }
  },
);
