---
id: tzt-online-action-start-detection
title: Online (causal) detection of action start and end
parent: Activity recognition
order: 34
status: not_started
review: false
prereqs:
  - tzt-temporal-action-segmentation
notes: []
updated: '2026-09-21'
---
# Online (causal) detection of action start and end

## Why it exists
An alert that arrives after you have left the house is not an alert. The system
must decide *now*, using only the past — this is the online / streaming setting,
and it is a genuinely harder problem than offline segmentation, not merely the
same problem with a sliding window.

The dedicated formulation is **Online Detection of Action Start (ODAS)**:
identify the start of an action in a streaming, untrimmed video as soon as it
happens, with minimal latency. It was motivated by early-alert applications, and
this project is one.

## The core tension
Accuracy and latency trade off directly. More temporal context after the start
makes the decision easier and the alert later. You must choose a point on that
curve deliberately, per task:

- `open` events are **latency-tolerant**. Being 10 s late to notice cooking
  started costs almost nothing, because the risk window is minutes long. Buy
  accuracy with context here.
- `at_risk` events are **latency-critical**. They must precede the exit.
- `close` events are latency-tolerant but **precision-critical** — a false close
  silently deletes a task from the system, which is the exact failure the
  product exists to prevent. Bias thresholds hard toward not closing.

Writing this asymmetry down and tuning three different operating points is
something almost nobody does, and it is most of the difference between a demo and
something you would rely on.

## Techniques worth knowing
- **Start-vs-background is the hard discrimination**, not start-vs-other-action.
  The frames just before an action start look almost identical to the frames just
  after. ODAS work addresses this with hard negative generation and by explicitly
  modelling the temporal consistency between the frames around the start and the
  frames after it.
- **Adaptive memory / streaming context.** Online segmentation baselines maintain
  a memory bank of past context that adapts as context changes, plus causal
  post-processing to suppress over-segmentation without seeing the future.
- **Retrospective correction.** Because you also keep an event log, you can emit
  a provisional online decision *and* revise the recorded boundary a few seconds
  later when more context arrives. The alert already fired on the provisional
  decision; the log gets the corrected timestamp. This gets you low latency and
  accurate `opened_at` — use it.
- **Causal post-processing only.** Median filters, smoothing and non-maximum
  suppression over a window that includes future frames are the most common
  accidental information leak in "online" evaluations. If your offline numbers
  look great and live behaviour is bad, check this first.

## Watch for
- Evaluating with any lookahead and calling it online.
- One threshold for open, close and at-risk.
- Ignoring the dead time: most of the day has no action. Measure false-start rate
  per *hour of idle footage*, not per benchmark clip, or you will ship something
  that opens four phantom tasks a day.
