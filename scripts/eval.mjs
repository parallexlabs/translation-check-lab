#!/usr/bin/env node
/**
 * Evaluation: deterministic checks on practice set; optional model round-trip eval.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { availableParallelism } from 'node:os';
import { execSync } from 'node:child_process';
import { runMeaningChecks, roundTripPreserved } from '../web/js/core/meaning-checks.js';
import { evalDeterministicChecks } from '../web/js/core/practice.js';
import { MODEL_PAIRS, TRANSFORMERS_VERSION, prepareModelInput } from '../web/js/core/models.js';
import { getEvalMessages, evalSourceLangForPair } from '../eval/messages.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../eval');
const PARTIAL_DIR = join(OUT_DIR, 'partial');
const RESULTS_PATH = join(OUT_DIR, 'results.json');
const withModel = process.argv.includes('--with-model');
const forceModel = process.argv.includes('--force-model');

/** Forward pairs with a real source message pool in eval/messages.js. */
const EVAL_FORWARD_PAIRS = new Set(['en-fr', 'fr-en', 'en-es', 'en-ar']);

function perfCores() {
  try {
    const n = Number(execSync('sysctl -n hw.perflevel0.physicalcpu', { encoding: 'utf8' }).trim());
    if (n > 0) return n;
  } catch { /* not macOS */ }
  return availableParallelism();
}

const PERF_CORES = perfCores();

const practice = JSON.parse(readFileSync(join(__dirname, '../web/data/practice.json'), 'utf8'));

const COUNT_BY_PAIR = {
  'en-fr': 30,
  'fr-en': 30,
  'en-es': 30,
  'en-ar': 30,
};

function estimateTokens(text) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function maxNewFor(text) {
  return Math.min(128, estimateTokens(text) * 2 + 10);
}

function formatTable(byCategory) {
  const rows = [['Category', 'n', 'Precision', 'Recall', 'TP', 'FP', 'FN']];
  for (const [cat, s] of Object.entries(byCategory)) {
    rows.push([cat, String(s.n), s.precision.toFixed(3), s.recall.toFixed(3), String(s.tp), String(s.fp), String(s.fn)]);
  }
  const widths = rows[0].map((_, ci) => Math.max(...rows.map((r) => r[ci].length)));
  return rows.map((r) => r.map((c, i) => c.padEnd(widths[i])).join(' | ')).join('\n');
}

async function translateBatch(pipe, texts, pair) {
  const inputs = texts.map((t) => prepareModelInput(t, pair));
  const maxNew = Math.max(...inputs.map(maxNewFor));
  const out = await pipe(inputs, { max_new_tokens: maxNew });
  return out.map((r) => r.translation_text ?? '');
}

/** @type {Map<string, unknown>} */
const pipelineCache = new Map();

async function getPipeline(createPipeline, modelId, revision) {
  if (pipelineCache.has(modelId)) return pipelineCache.get(modelId);
  const pipe = await createPipeline('translation', modelId, {
    dtype: 'q8',
    revision,
  });
  pipelineCache.set(modelId, pipe);
  return pipe;
}

async function runModelEval() {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowLocalModels = true;
  env.cacheDir = join(__dirname, '../.eval-cache');
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = PERF_CORES;
  }

  const results = {};
  mkdirSync(PARTIAL_DIR, { recursive: true });

  const uniquePairs = [];
  const seen = new Set();
  for (const forward of MODEL_PAIRS) {
    const pairKey = `${forward.sourceLang}-${forward.targetLang}`;
    if (!EVAL_FORWARD_PAIRS.has(pairKey) || seen.has(pairKey)) continue;
    seen.add(pairKey);
    uniquePairs.push(forward);
  }

  for (const forward of uniquePairs) {
    const pairKey = `${forward.sourceLang}-${forward.targetLang}`;
    const back = MODEL_PAIRS.find((p) => p.sourceLang === forward.targetLang && p.targetLang === forward.sourceLang);
    if (!back) continue;

    const partialPath = join(PARTIAL_DIR, `${pairKey}.json`);
    if (!forceModel && existsSync(partialPath)) {
      results[pairKey] = JSON.parse(readFileSync(partialPath, 'utf8'));
      console.log(`[${pairKey}] Skipping (partial exists): ${results[pairKey].preserved}/${results[pairKey].n}`);
      continue;
    }

    const n = COUNT_BY_PAIR[pairKey] ?? 30;
    const sourceLang = evalSourceLangForPair(pairKey);
    const messages = getEvalMessages(sourceLang, n);
    let preserved = 0;

    try {
      console.log(`\n[${pairKey}] Loading ${forward.id} (revision ${forward.revision.slice(0, 8)})…`);
      const pipeFwd = await getPipeline(pipeline, forward.id, forward.revision);
      console.log(`[${pairKey}] Loading ${back.id}…`);
      const pipeBack = await getPipeline(pipeline, back.id, back.revision);
      const batchSize = 16;
      console.log(`[${pairKey}] Evaluating n=${messages.length}, distinct scenarios=${messages.length}, model=${forward.id} (threads=${PERF_CORES})…`);
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const translated = await translateBatch(pipeFwd, batch, forward);
        const backTexts = await translateBatch(pipeBack, translated, back);
        for (let j = 0; j < batch.length; j += 1) {
          if (roundTripPreserved(batch[j], backTexts[j], sourceLang, sourceLang)) preserved += 1;
        }
        console.log(`  [${pairKey}] ${Math.min(i + batchSize, messages.length)}/${messages.length} (${preserved} preserved so far)`);
      }

      results[pairKey] = {
        modelForward: forward.id,
        modelBack: back.id,
        revisionForward: forward.revision,
        revisionBack: back.revision,
        transformersVersion: TRANSFORMERS_VERSION,
        preserved,
        n: messages.length,
        distinctScenarios: messages.length,
        rate: preserved / messages.length,
      };
      writeFileSync(partialPath, JSON.stringify(results[pairKey], null, 2));
      console.log(`[${pairKey}] Done: ${preserved}/${messages.length} preserved (${(results[pairKey].rate * 100).toFixed(1)}%)`);
    } catch (err) {
      results[pairKey] = {
        error: String(err.message || err),
        n: messages.length,
        distinctScenarios: messages.length,
        modelForward: forward.id,
        modelBack: back.id,
      };
      writeFileSync(partialPath, JSON.stringify(results[pairKey], null, 2));
      console.error(`[${pairKey}] ERROR:`, err.message || err);
    }
  }
  return results;
}

function loadExistingModelResults() {
  if (!existsSync(RESULTS_PATH)) return null;
  try {
    const prev = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));
    return prev.model ?? null;
  } catch {
    return null;
  }
}

function buildResultsMarkdown(output) {
  let md = `# Evaluation results (${output.date})\n\n`;
  md += `Mode: ${output.mode}\n\n`;
  md += `## Deterministic checks on practice set\n\n`;
  md += `n=${output.practice.overall.n} seeded errors across ${output.practice.uniqueItems} practice items. `;
  md += `False positives on error-free items count in precision.\n\n`;
  md += `Overall precision: ${output.practice.overall.precision.toFixed(3)} (denominator: TP+FP across categories)\n`;
  md += `Overall recall: ${output.practice.overall.recall.toFixed(3)} (denominator: TP+FN across categories)\n\n`;
  md += formatTable(output.practice.byCategory) + '\n';

  if (output.model) {
    md += `\n## Model round-trip preservation\n\n`;
    md += `Preserved means the numbers, times, contacts, negation count and action verbs of the source all survive the round trip; a preserved round trip is a weak signal, not proof.\n\n`;
    md += `Transformers.js ${TRANSFORMERS_VERSION}, ONNX threads ${PERF_CORES}\n\n`;
    md += '| Pair | n | Distinct scenarios | Model forward | Model back | Preserved | Rate |\n';
    md += '|------|---|-------------------|---------------|------------|-----------|------|\n';
    for (const [pair, r] of Object.entries(output.model)) {
      if (r.error) {
        md += `| ${pair} | ${r.n} | ${r.distinctScenarios} | ${r.modelForward} | ${r.modelBack} | ERROR | ${r.error} |\n`;
      } else {
        md += `| ${pair} | ${r.n} | ${r.distinctScenarios} | ${r.modelForward} | ${r.modelBack} | ${r.preserved}/${r.n} | ${(r.rate * 100).toFixed(1)}% |\n`;
      }
    }
  }
  return md;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const det = evalDeterministicChecks(practice.items, runMeaningChecks);
  const existingModel = loadExistingModelResults();

  const output = {
    date: new Date().toISOString().slice(0, 10),
    mode: withModel ? 'pattern+model' : 'pattern-only',
    practice: {
      uniqueItems: det.overall.uniqueItems,
      overall: det.overall,
      byCategory: det.byCategory,
    },
    model: null,
  };

  if (withModel) {
    console.log(`Running model evaluation (threads=${PERF_CORES})…`);
    output.model = await runModelEval();
  } else if (existingModel) {
    output.model = existingModel;
  }

  writeFileSync(RESULTS_PATH, JSON.stringify(output, null, 2));

  const md = buildResultsMarkdown(output);
  writeFileSync(join(OUT_DIR, 'results.md'), md);
  console.log('\n' + md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
