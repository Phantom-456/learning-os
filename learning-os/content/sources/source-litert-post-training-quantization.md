---
id: source-litert-post-training-quantization
type: article
title: Post-training quantization (Google AI Edge / LiteRT)
url: 'https://developers.google.com/edge/litert/models/post_training_quantization'
concepts:
  - edge-model-runtimes-quantization
added: '2026-09-21'
notes: []
---
The reference for the quantization decision tree, and the reason to read
the primary doc rather than a blog post: it lays out the schemes side by side -
dynamic range, full integer (with float fallback, and integer-only for
microcontrollers and Edge TPU), float16, and experimental 16x8 - with the
representative-dataset requirement stated explicitly for the integer paths.
That calibration requirement is the part most people skip and the part that
determines whether your quantised pose model degrades in your actual room.
Verified live (last updated May 2026).
