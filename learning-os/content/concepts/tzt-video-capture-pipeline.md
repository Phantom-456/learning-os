---
id: tzt-video-capture-pipeline
title: 'Continuous video capture pipeline (frames, buffering, backpressure)'
parent: Perception infrastructure
order: 10
status: not_started
review: false
prereqs: []
notes: []
updated: '2026-09-21'
---
# Continuous video capture pipeline (frames, buffering, backpressure)

## Why it exists
This system is always-on, which makes it a streaming-systems problem before it
is a machine-learning problem. Almost everyone building a "camera watches me"
project underestimates this and discovers three weeks in that their detector
runs at 4 FPS, the queue has grown to 40 GB, and every alert is 90 seconds late.

## What you actually need to get right
- **Decouple capture from inference** with a bounded queue and an explicit
  **drop policy**. Capture at the sensor's native rate; run inference at whatever
  rate it sustains; when the queue is full, drop *oldest* frames, not newest —
  for this application a fresh frame is always worth more than a stale one, and
  latency is a correctness property (an alert after you leave the house is
  worthless).
- **Two sampling rates.** Zone/presence tracking needs a fast loop (10-30 FPS,
  cheap detector). Open-vocabulary action recognition needs a slow loop
  (a clip every 1-2 s, expensive model). Running one model at one rate is the
  default mistake; it makes zone tracking jittery *and* recognition expensive.
- **Clip buffering.** Action recognisers consume clips (8-32 frames spanning
  1-4 s), not frames. Keep a rolling ring buffer so that when something
  interesting is detected you can also look *backwards* — the start of a task is
  usually already in the past by the time anything is confident about it. This
  backwards look is what lets you timestamp `opened_at` correctly rather than
  at detection time.
- **Hardware decode/encode** (VAAPI/NVDEC/Apple VideoToolbox) or you will burn
  the entire CPU budget on H.264 before any model runs.
- **Failure is routine.** Camera disconnects, exposure changes at dusk, someone
  unplugs it. Emit explicit `source_unavailable` events into the log — a gap in
  observations must be distinguishable from "nothing happened", or your monitor
  will report a task closed when it simply went blind.

## Watch for
- Unbounded queues (memory blow-up, then latency, then irrelevance).
- Timestamping frames at inference time rather than capture time.
- Treating night/low-light as an edge case; it is roughly half of the hours this
  system is supposed to cover.
