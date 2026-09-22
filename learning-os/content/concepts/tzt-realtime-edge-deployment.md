---
id: tzt-realtime-edge-deployment
title: Real-time edge deployment of the perception stack
parent: Evaluation & deployment
order: 62
status: not_started
review: false
prereqs:
  - tzt-on-device-privacy
  - tzt-open-vocab-action-recognition
notes: []
updated: '2026-09-21'
---
# Real-time edge deployment of the perception stack

## Why it exists
The privacy decision (`tzt-on-device-privacy`) commits you to local inference,
and always-on means a device running 24/7 in your home, quietly, within a power
and thermal budget. This is the checkpoint where a prototype that worked on a
laptop with a GPU either becomes a thing that lives on your counter, or does not.

## What to work through
- **Pick the device against the model, not before.** A small SBC with an NPU, a
  Jetson-class module, or a Mac mini all have very different ceilings. Measure
  your candidate model's actual throughput on the candidate device before
  committing; published FPS numbers are almost always for different input sizes
  and batch settings than yours.
- **The two-rate budget** from `tzt-video-capture-pipeline` is what makes this
  feasible: a small detector at 10-30 FPS plus an expensive recogniser at
  0.5-1 Hz, not one big model at frame rate.
- **Quantisation and export.** INT8 post-training quantisation with a calibration
  set drawn from *your own footage* typically costs little accuracy and buys 2-4x.
  Export through ONNX/TensorRT/Core ML as appropriate. Re-run your evaluation
  after quantisation — do not assume the drop is negligible, especially for the
  open-set rejection threshold, which shifts.
- **Triggering, not polling.** Run the expensive recogniser only when cheap
  signals justify it: motion in a task zone, a person present, an object of
  interest detected. Most of the day, nothing should run. This is the single
  biggest efficiency win available and it also reduces false opens.
- **Thermals and duty cycle.** Sustained load throttles; benchmark for an hour,
  not thirty seconds. Throttling shows up as increasing latency, which shows up
  as late alerts, which is a correctness failure.
- **Operational robustness.** Auto-restart, watchdog, log rotation, graceful
  behaviour on camera loss, and a health signal the user can see. A monitoring
  system that dies silently is worse than none, because the user has stopped
  compensating themselves.

## Watch for
- Leaving the recogniser running continuously "for now". It will define your
  power and thermal envelope and you will design around a false constraint.
- Skipping post-quantisation re-evaluation.
- No visible health indicator.
