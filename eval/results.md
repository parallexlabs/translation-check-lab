# Evaluation results (2026-09-29)

Mode: pattern-only

## Deterministic checks on practice set

n=15 seeded errors across 17 practice items. False positives on error-free items count in precision.

Overall precision: 0.469 (denominator: TP+FP across categories)
Overall recall: 1.000 (denominator: TP+FN across categories)

Category     | n | Precision | Recall | TP | FP | FN
numbers      | 1 | 1.000     | 1.000  | 1  | 0  | 0 
times        | 2 | 0.286     | 1.000  | 2  | 5  | 0 
contact      | 2 | 1.000     | 1.000  | 2  | 0  | 0 
negation     | 4 | 0.800     | 1.000  | 4  | 1  | 0 
modality     | 3 | 1.000     | 1.000  | 3  | 0  | 0 
names        | 2 | 0.200     | 1.000  | 2  | 8  | 0 
untranslated | 0 | 0.000     | 1.000  | 0  | 2  | 0 
length       | 0 | 1.000     | 1.000  | 0  | 0  | 0 
instructions | 1 | 0.500     | 1.000  | 1  | 1  | 0 

## Model round-trip preservation

Preserved means the numbers, times, contacts, negation count and action verbs of the source all survive the round trip; a preserved round trip is a weak signal, not proof.

Transformers.js 4.3.0, ONNX threads 20

| Pair | n | Distinct scenarios | Model forward | Model back | Preserved | Rate |
|------|---|-------------------|---------------|------------|-----------|------|
| en-fr | 30 | 30 | Xenova/opus-mt-en-fr | Xenova/opus-mt-fr-en | 18/30 | 60.0% |
| fr-en | 30 | 30 | Xenova/opus-mt-fr-en | Xenova/opus-mt-en-fr | 20/30 | 66.7% |
| en-es | 30 | 30 | Xenova/opus-mt-en-es | Xenova/opus-mt-es-en | 17/30 | 56.7% |
| en-ar | 30 | 30 | Xenova/opus-mt-en-ar | Xenova/opus-mt-ar-en | 7/30 | 23.3% |
