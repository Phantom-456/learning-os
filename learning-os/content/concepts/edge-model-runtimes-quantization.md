---
id: edge-model-runtimes-quantization
title: Edge model runtimes and quantization
parent: Edge vision
order: 12
status: not_started
review: false
prereqs: []
notes: []
updated: '2026-09-21'
---
# Edge model runtimes and quantization

## Why it exists
A model that trains in PyTorch on a GPU does not run at 30 FPS on a 5-watt
board. Getting there means converting the graph into a runtime built for the
target (LiteRT/TFLite, ONNX Runtime, or a vendor stack such as Hailo or Edge
TPU) and reducing numeric precision so the arithmetic maps onto integer
hardware. This is the concept that decides whether this whole project is a
real-time assistant or a slideshow.

## The runtime layer
A runtime is three things: a serialised graph format, a set of kernels
compiled for the target ISA, and a delegate/execution-provider mechanism for
handing subgraphs to an accelerator (XNNPACK on ARM CPU, GPU, NNAPI, Edge
TPU, Hailo). The critical, non-obvious failure mode is partial delegation: if
one operator in the middle of your graph is unsupported, the runtime splits
the graph and bounces tensors between accelerator and CPU, and the result can
be SLOWER than pure CPU. Always dump the delegation report rather than
trusting that "it ran on the NPU".

## Quantization, concretely
Post-training quantization has several distinct schemes and they are not
interchangeable:
- **Dynamic range**: weights stored int8, activations quantised on the fly.
  ~4x smaller, easy, no calibration data, modest speedup.
- **Float16**: weights to IEEE fp16. ~2x smaller, lossless-ish, only a win on
  hardware with real fp16 paths.
- **Full integer**: weights AND activations int8, requires a representative
  dataset to calibrate activation ranges. This is the one that unlocks
  integer-only accelerators and microcontrollers, and the one that can
  actually hurt accuracy.
- **Integer with float fallback**: as above but unsupported ops stay float.
- **16x8**: int16 activations, int8 weights - better accuracy, less support.

Quantization-aware training exists for when post-training int8 loses too much;
reach for it only after measuring that it does.

## The calibration trap
"Representative dataset" means representative of YOUR deployment, not of the
original training set. Calibrating a pose model on bright stock photos and
deploying it in a dim room clips activation ranges and produces landmark
errors that look like model failure rather than a quantisation artefact.
Calibrate on a few hundred frames captured from the actual camera, in the
actual room, across the actual lighting conditions.

## How to evaluate
Never accept a quantised model on latency alone. Build a small held-out set
from your own footage, and compare float vs quantised on the metric you
actually care about downstream (landmark error in torso-normalised units,
or end-task idle-classification accuracy) - not on a generic benchmark.

## Self-test
- Name the four main post-training quantization schemes and what each costs.
- What is partial delegation and how do you detect it?
- Why must the calibration set come from your own camera?
