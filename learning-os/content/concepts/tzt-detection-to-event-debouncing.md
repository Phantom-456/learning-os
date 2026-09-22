---
id: tzt-detection-to-event-debouncing
title: >-
  From noisy detections to discrete events: hysteresis, evidence accumulation,
  timeouts
parent: Tag runtime
order: 40
status: not_started
review: false
prereqs:
  - tzt-task-state-machine
  - tzt-online-action-start-detection
  - bayes-filter
notes: []
updated: '2026-09-21'
---
# From noisy detections to discrete events: hysteresis, evidence accumulation, timeouts

## Why it exists
This is the seam of the whole system: perception emits a continuous stream of
uncertain, flickering hypotheses; the tag runtime needs crisp, rare, trustworthy
events. Everything that makes the product feel reliable or maddening lives in
this translation layer, and almost none of it is machine learning.

## The techniques, and when each applies
- **Two-threshold hysteresis (Schmitt trigger).** Open on `conf > θ_high`
  sustained; only abandon a provisional open on `conf < θ_low`, with
  `θ_low < θ_high`. A single threshold oscillates at exactly the confidence
  level your model spends most of its time at.
- **Temporal persistence / k-of-n voting.** Require k positive clips out of the
  last n. Trivially cheap, enormously effective against single-frame flicker.
  Pick n from the timescale of the task, not a default.
- **Log-odds evidence accumulation.** The principled version: maintain a running
  log-odds for each candidate tag, add the (calibrated) log-likelihood ratio of
  each new observation, decay toward the prior when evidence is absent, and
  trigger at a threshold. This is a recursive Bayes filter over a binary state
  (`bayes-filter`) and it handles the common real case that ten weak
  observations should count for more than one strong one. It also gives you a
  natural notion of *how long* to wait: the threshold is reached when it is
  reached, rather than after a fixed window.
- **Calibration is a prerequisite.** Log-odds accumulation over uncalibrated
  scores (and open-vocabulary similarity scores are badly uncalibrated) produces
  confident nonsense. Fit a temperature or isotonic calibration on held-out data
  from *your* footage first.
- **Cooldowns and refractory periods.** After closing a tag, suppress re-opening
  the same tag type in the same zone for a period; otherwise the tail of the
  activity re-opens it immediately.
- **Timeouts as first-class evidence.** "No close evidence for 3x the expected
  duration" is a real event, emitted by a timer, and it drives OVERDUE. Do not
  implement it as a background sweep that mutates state outside the event
  stream — emit a `TICK`/`timeout` event so replay reproduces it exactly.
- **Asymmetry everywhere.** Open: moderate threshold, latency-tolerant. Close:
  high threshold, corroboration required. At-risk: low threshold, reversible,
  because a false at-risk that silently resolves costs nothing if it never
  reaches the user.

## A useful mental model
The perception stack is a *sensor*; this layer is its *filter and thresholder*;
the state machine is the *controller*. Keeping those three roles in separate
modules is what makes it possible to swap the model later without re-tuning the
entire product.

## Watch for
- Tuning these constants live, one at a time, over days. Build the replay harness
  (`tzt-event-stream-design`) and sweep them offline in minutes.
- Putting debouncing inside the model wrapper where it cannot be replayed or
  swept.
- Forgetting decay: accumulated evidence that never decays will eventually open
  every tag.
