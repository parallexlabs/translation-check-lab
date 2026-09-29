# On-device translation models

Verified 2026-09-29. All models use quantized ONNX weights (q8) via Transformers.js 4.3.0. Each Xenova model is pinned to an exact Hugging Face commit revision.

| Model ID | Revision (checked) | Upstream | Licence | Licence URL | Download q8 (approx.) | Languages | Tatoeba BLEU | Tatoeba chrF | Card |
|----------|-------------------|----------|---------|-------------|----------------------|-----------|--------------|--------------|------|
| Xenova/opus-mt-en-fr | `28726206f808` | Helsinki-NLP/opus-mt-en-fr | Apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | 102.5 MB | en → fr | 50.5 | 0.672 | [card](https://huggingface.co/Helsinki-NLP/opus-mt-en-fr#benchmarks) |
| Xenova/opus-mt-fr-en | `6b166a182780` | Helsinki-NLP/opus-mt-fr-en | Apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | 102.5 MB | fr → en | 57.5 | 0.720 | [card](https://huggingface.co/Helsinki-NLP/opus-mt-fr-en#benchmarks) |
| Xenova/opus-mt-en-es | `4b002a4c7edd` | Helsinki-NLP/opus-mt-en-es | Apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | 107.9 MB | en → es | 54.9 | 0.721 | [card](https://huggingface.co/Helsinki-NLP/opus-mt-en-es#benchmarks) |
| Xenova/opus-mt-es-en | `eadfd7c658a9` | Helsinki-NLP/opus-mt-es-en | Apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | 107.9 MB | es → en | 59.6 | 0.739 | [card](https://huggingface.co/Helsinki-NLP/opus-mt-es-en#benchmarks) |
| Xenova/opus-mt-en-ar | `034a684356c1` | Helsinki-NLP/opus-mt-en-ar | Apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | 105.7 MB | en → ar | 14.0 | 0.437 | [card](https://huggingface.co/Helsinki-NLP/opus-mt-en-ar#benchmarks) |
| Xenova/opus-mt-ar-en | `09c755686640` | Helsinki-NLP/opus-mt-ar-en | Apache-2.0 | https://www.apache.org/licenses/LICENSE-2.0 | 105.7 MB | ar → en | 49.4 | 0.661 | [card](https://huggingface.co/Helsinki-NLP/opus-mt-ar-en#benchmarks) |

Benchmark scores are quoted exactly from each upstream OPUS-MT model card on Hugging Face (Tatoeba test set rows).

## English to Arabic warning

`Helsinki-NLP/opus-mt-en-ar` is a multi-dialect model. The upstream card states that a sentence-initial language token is required in the form `>>ara<<`. The lab prepends this token automatically. Published Tatoeba BLEU 14.0 and chrF 0.437 are far below English to French (BLEU 50.5, chrF 0.672). Treat this pair as training-only without expert human review.

## Verification notes

- Each Xenova model exists on Hugging Face with `transformers.js` and `onnx` tags.
- Upstream Helsinki-NLP models carry Apache-2.0 licence (verified via Hugging Face API, 2026-09-29).
- Quantized ONNX files: `encoder_model_quantized.onnx` and `decoder_model_merged_quantized.onnx`.
- Download sizes measured from local `.eval-cache` after first fetch (~102 to 108 MB per pair).

## Limitations

OPUS-MT quality varies by language pair and domain. These models are suitable for training demonstrations, not operational translation without qualified human review.
