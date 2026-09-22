---
id: tzt-event-stream-design
title: Append-only event stream design for task tracking
parent: Task tag model
order: 4
status: not_started
review: false
prereqs:
  - tzt-task-tag-model
notes: []
updated: '2026-09-21'
---
# Append-only event stream design for task tracking

## Why it exists
Everything upstream (perception) is noisy and everything downstream (state
machines, monitors, alerts) is stateful. The interface between them should be a
single, boring, append-only event log. This gives you the one property you need
most while building a perception system you don't yet trust: **replayability**.
You record a day of raw events once, then iterate on thresholds, state machines
and alert policy a hundred times against that recording, offline, in seconds,
without re-running the model or re-living the day.

## Event shape
Two families, deliberately separated:

- **Observation events** — what perception saw. Low-level, high-volume,
  never edited. `{ts, kind: 'observation', source: 'cam0', type:
  'action_hypothesis' | 'person_pose' | 'object_state', label, confidence,
  bbox/zone, track_id}`.
- **Domain events** — what the runtime decided. `{ts, kind: 'domain', type:
  'tag_opened' | 'tag_closed' | 'tag_at_risk' | 'tag_abandoned' | 'alert_sent' |
  'user_dismissed', instance_id, ...}`.

Domain events are a *pure function* of the observation stream plus config. Keep
that invariant and your whole system is a replayable pipeline; break it (by
letting the runtime mutate state from somewhere not in the log) and debugging
becomes archaeology.

## The properties that matter
- **Monotonic ids and explicit timestamps.** Two clocks exist: capture time and
  processing time. Log both. Ordering and windowing must use capture time; alert
  latency measurement needs processing time.
- **Out-of-order and late arrivals are normal**, especially with an edge device
  that buffers during a Wi-Fi drop. Decide a watermark/grace window and make the
  behaviour on late events explicit (re-run the affected window, or drop with a
  logged counter — either is fine, silence is not).
- **Idempotency.** A retried batch must not open a task twice. Deduplicate on
  `(source, capture_ts, type, track_id)`.
- **Compaction, not deletion.** Raw frames are expensive and sensitive; events
  are cheap. Retain the event log far longer than the video (see
  `tzt-on-device-privacy`) — that is what lets you keep improving the system
  without keeping footage of your kitchen.
- **User corrections are events too.** "No, I wasn't cooking" / "yes, that's
  done" append `user_correction` events rather than mutating history. This log
  is then your labelled dataset, for free, from real usage — the cheapest path
  to few-shot enrollment (`tzt-few-shot-task-enrollment`).

## Watch for
- Storing only the derived tag state and not the observations; you lose the
  ability to re-tune and every threshold change becomes a fresh multi-day
  experiment.
- Using wall-clock `now()` inside the state machine instead of an event
  timestamp — replay then produces different results than live, and you can no
  longer trust your offline tuning.
