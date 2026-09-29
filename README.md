# Translation Check Lab

Translation Check Lab is a bilingual (English and French) practice lab and human-review training environment for Session 2 (verified work by role) of the [Humanitarian AI Training Kit](https://parallexlabs.github.io/humanitarian-ai-training-kit/). It helps people check short humanitarian broadcast SMS messages and their translations before sending. It is a practice lab, not a translation service, and it never approves a message. The software never shows a green "safe", "verified" or "approved" badge.

SMS is not confidential. Use this lab only for broadcast messages to groups, never for messages about an individual person.

## Try it

**Live:** https://parallexlabs.github.io/translation-check-lab/

## How it works

```
Source message + translation (browser only)
    |
    v
[Meaning-risk checks] ---- numbers, times, contact, negation, modality, names
    |
    +-- [SMS reality check] ---- GSM 03.38 vs UCS-2, highlighted non-GSM characters
    |
    +-- [Optional OPUS-MT] ---- on-device translate and back-translate (~103 MB per pair)
    |       Back-translation is a warning signal only, not proof
    |
    v
[Human review record] ---- competence, community connection, checks, decision, date
    |
    v
Copy final text (locked until review record is complete)
```

## Published model quality

Benchmark scores are quoted exactly from each upstream OPUS-MT model card. See [MODELS.md](MODELS.md) for pinned revisions and download sizes.

| Pair | Tatoeba test set | BLEU | chrF |
|------|------------------|------|------|
| en → fr | Tatoeba.en.fr | 50.5 | 0.672 |
| fr → en | Tatoeba.fr.en | 57.5 | 0.720 |
| en → es | Tatoeba-test.eng.spa | 54.9 | 0.721 |
| es → en | Tatoeba-test.spa.eng | 59.6 | 0.739 |
| en → ar | Tatoeba-test.eng.ara | 14.0 | 0.437 |
| ar → en | Tatoeba.ar.en | 49.4 | 0.661 |

English to Arabic (BLEU 14.0) is far weaker than English to French (BLEU 50.5). The en → ar model requires a `>>ara<<` target token and shows a strong warning in the interface.

## Privacy

**Not sent to a remote server:** text you type, check results, review records and placeholder mappings. No analytics, cookies, trackers or external fonts. User text lives only in browser memory and is cleared when you close the tab.

**Does leave the browser or device:** copying final text writes to your operating system clipboard. Optional Transformers.js library from `https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/`; optional model weights from `huggingface.co` and `cdn-lfs.hf.co` when you press Download and translate (Hugging Face sees the download request, not your text). Text is processed locally by this application; when you choose model download, your browser retrieves model files from those third-party hosts. Text is not sent to those hosts by this application.

**Content Security Policy:** GitHub Pages serves a meta-tag CSP only (no server headers). `script-src` and `worker-src` allow only this site's scripts plus the exact Transformers.js 4.3.0 path on jsDelivr. `connect-src` allows jsDelivr, huggingface.co and cdn-lfs.hf.co for model downloads. Residual risk: a compromised jsDelivr or Hugging Face CDN could serve malicious code or weights until the pin is updated.

## Limitations

OPUS-MT quality varies by language and domain. French differs across Canada, Europe and West and Central Africa. Arabic ranges from Modern Standard Arabic to local varieties the model may not match. Back-translation can hide real errors (see practice item p15). Automated checks catch only specific surface changes. Pattern checks are intentionally conservative and produce false positives; they are prompts for human review, not accuracy measurements. Tatoeba test sentences are short, general-domain sentences, not humanitarian or medical text, so published benchmark scores do not transfer to emergency messages. A completed review record is not an approval by the software.

Guidance: [CLEAR Global language and communication services](https://clearglobal.org/language-and-communication-services/); [How to work with interpreters and translators (PDF)](https://clearglobal.org/wp-content/uploads/2023/01/How-to-work-with-interpreters-and-translators_EN.pdf).

## Evaluation

Run on 2026-09-29 against 17 synthetic practice items.

**Pattern-only** (`npm run eval`):

| Metric | Value |
|--------|-------|
| Overall precision | 0.469 |
| Overall recall | 1.000 |
| Seeded errors (n) | 15 across 17 practice items |

False positives on error-free items count in precision. Full table in `eval/results.json`.

Per category (n = answer-key items): numbers 1/1 precision and recall (n=1); contact 2/2 recall; negation 4/4 recall; instructions 1/1 recall; times and names still produce false positives on clean items.

**Pattern + model** (`npm run eval:model`, 2026-09-29):

Preserved means the numbers, times, contacts, negation count and action verbs of the source all survive the round trip; a preserved round trip is a weak signal, not proof.

| Pair | n | Distinct scenarios | Model forward | Model back | Preserved | Rate |
|------|---|-------------------|---------------|------------|-----------|------|
| en-fr | 30 | 30 | Xenova/opus-mt-en-fr | Xenova/opus-mt-fr-en | 18/30 | 60.0% |
| fr-en | 30 | 30 | Xenova/opus-mt-fr-en | Xenova/opus-mt-en-fr | 20/30 | 66.7% |
| en-es | 30 | 30 | Xenova/opus-mt-en-es | Xenova/opus-mt-es-en | 17/30 | 56.7% |
| en-ar | 30 | 30 | Xenova/opus-mt-en-ar | Xenova/opus-mt-ar-en | 7/30 | 23.3% |

Round-trip evaluation runs forward only for pairs with a real source pool (en-fr, fr-en, en-es, en-ar). The es-en and ar-en models are used only as the back leg of en-es and en-ar round trips. Tatoeba test sentences are short, general-domain sentences, not humanitarian or medical text, so these scores do not transfer to emergency messages. Partial results are saved to `eval/partial/` as each pair finishes. GSM segment counts are cross-checked against Twilio's [message-segment-calculator](https://github.com/TwilioDevEd/message-segment-calculator) (MIT).

## Using it in a training session

See [web/facilitator.html](web/facilitator.html) for a 20 to 30 minute remote activity plan. Pair with kit Session 2 and the [evacuation SMS case study](https://parallexlabs.github.io/humanitarian-ai-training-kit/en/case-studies/01-evacuation-sms-translation.html).

## Languages

English and French interface (`web/i18n/`). Live translation pairs: en↔fr, en↔es, en↔ar. French prepared with machine assistance; not yet reviewed by a professional translator.

## Related ParalleX work

- [Humanitarian AI Training Kit](https://parallexlabs.github.io/humanitarian-ai-training-kit/)
- [Before You Paste](https://parallexlabs.github.io/before-you-paste/)
- [Source Check Lab](https://parallexlabs.github.io/source-check-lab/)
- [Humanitarian AI Risk Screen](https://github.com/parallexlabs/humanitarian-ai-risk-screen)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Run `npm ci`, `npm run lint`, `npm test`, `npm run eval`, `npx playwright install chromium`, `npm run test:browser` and `npm run check:site` before submitting changes. `npm run test:model` also runs the browser test that downloads a pinned OPUS-MT model. `npm run check:links` checks external URLs locally (not in CI).

## Licence

- **Code:** Apache-2.0 ([LICENSE](LICENSE)), Copyright 2026 ParalleX Labs Inc.
- **Practice content and written materials:** CC BY 4.0 ([LICENSE-CONTENT](LICENSE-CONTENT))

## Citation

See [CITATION.cff](CITATION.cff).

## Open by design

**We build in the open.** ParalleX Labs Inc. publishes its tools, methods and learning materials under open licences, so public-interest teams can use them, check how they work and adapt them freely. Open work is easier to trust, because anyone can see exactly how a result is produced.

**Our own work, and only ours.** Everything in this repository was created by ParalleX Labs Inc. from public guidance and synthetic examples. It contains no client data, no client projects, and no one else's confidential information or intellectual property.
