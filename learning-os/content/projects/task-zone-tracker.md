---
id: task-zone-tracker
title: >-
  Task Zone Tracker — visual open/close task tags with anticipatory zone-exit
  warnings
status: in_progress
metadata:
  domain: computer vision / assistive prospective memory
  framing: 'tasks as markup tags: every opened task must be closed'
  hardware: >-
    one or more fixed indoor cameras + an always-on edge device + optional smart
    plug / door contact sensors
  key_constraint: >-
    open-vocabulary task recognition, explicit per-instance open/close state
    machine, and PREDICTIVE (pre-exit) zone warnings — not post-hoc "you forgot"
    alerts
checkpoints:
  - id: cp-tag-model
    title: Formalise the task-tag model and event schema
    depends_on: []
    courses: []
    concepts:
      - tzt-task-tag-model
      - tzt-task-state-machine
      - tzt-tag-wellformedness-monitor
      - tzt-event-stream-design
    status: not_started
    build: >-
      No camera. Write the tag schema (JSON Schema/TS types) for 3 real tasks
      from your own life, implement the per-instance statechart as a pure
      reduce(state,event), implement 4 well-formedness monitors (bounded
      response, zone-coupled safety, matched-close, no-duplicate-open), and
      drive it all from a hand-written synthetic event trace with a replay
      harness.
    done_test: >-
      A ~50-event synthetic trace including a dropped close, an out-of-order
      close, a duplicate open and a zone exit produces exactly the verdicts and
      state transitions you predicted on paper beforehand. Tests run in CI in
      under a second.
  - id: cp-capture
    title: Always-on capture rig and privacy baseline
    depends_on: []
    courses: []
    concepts:
      - tzt-video-capture-pipeline
      - tzt-on-device-privacy
    status: not_started
    build: >-
      Mount one fixed camera covering a real task zone. Build the capture
      service: bounded queue with oldest-drop, hardware decode, ring buffer for
      backward clip lookup, two sampling rates, explicit source_unavailable
      events. Implement frame TTL deletion, zone masking at the decoder, and a
      physical/visible off switch.
    done_test: >-
      Runs unattended for 48 hours: steady memory, capture-time timestamps
      correct, a deliberate camera unplug produces source_unavailable events and
      recovers, and no frame older than the TTL exists on disk.
  - id: cp-track
    title: Detect and track people and task objects
    depends_on:
      - cp-capture
    courses: []
    concepts:
      - tzt-object-detection-tracking
      - kalman-filter
      - noise-uncertainty
    status: not_started
    build: >-
      Tracking-by-detection over the live stream: detector + constant-velocity
      Kalman per track + IoU/Hungarian association + tentative/confirmed/lost
      lifecycle. Emit person and object observation events with track ids and
      foot points into the event log.
    done_test: >-
      On 30 minutes of your own annotated footage: few ID switches through the
      doorway and the fridge occlusion, and track loss inside a zone is emitted
      as unknown rather than as an exit.
  - id: cp-zones
    title: Ground-plane zone map with stable occupancy
    depends_on:
      - cp-track
    courses: []
    concepts:
      - tzt-ground-plane-homography
      - tzt-zone-polygon-occupancy
      - transforms
      - sensor-fusion
    status: not_started
    build: >-
      Calibrate a ground-plane homography from four tape-measured floor points
      into a floor-plan frame in metres. Author nested zones (stove / kitchen /
      home) as polygons in that frame. Implement occupancy with hysteresis
      bands, dwell delay and debounced exit. Add at least one non-visual sensor
      (smart plug or door contact) and fuse it.
    done_test: >-
      Held-out floor points map within ~15 cm of tape-measure truth inside the
      task zones. Standing on a zone boundary for two minutes produces at most
      one occupancy transition, not dozens.
  - id: cp-recognition
    title: Open-vocabulary task recognition with a "none of the above" path
    depends_on:
      - cp-capture
    courses: []
    concepts:
      - tzt-video-representation-clip
      - tzt-open-vocab-action-recognition
      - tzt-few-shot-task-enrollment
    status: not_started
    build: >-
      Clip encoder into a joint image-text space. Zero-shot scoring against
      candidate task prompts plus explicit background/negative prompts for
      open-set rejection. Prototype-based few-shot enrollment for your ~8 real
      tasks, with negatives auto-mined from no-open-tag periods. Calibrate
      scores on held-out personal footage. Add embedding-space canonicalisation
      of task names.
    done_test: >-
      On a day of your own footage, your 8 enrolled tasks are recognised at
      usable accuracy AND the false-positive rate on idle footage is measured
      per hour (not per clip) and is low. Feeding it a task it has never seen
      yields "unknown", not a confident wrong label.
  - id: cp-boundaries
    title: Online start and end detection (the open and close signals)
    depends_on:
      - cp-recognition
      - cp-track
    courses: []
    concepts:
      - tzt-temporal-action-segmentation
      - tzt-online-action-start-detection
      - tzt-completion-evidence-state-change
    status: not_started
    build: >-
      Build offline segmentation on recorded video first to get an accuracy
      ceiling and a clean boundary dataset; then port to a strictly causal
      online version with no lookahead in post-processing. Implement per-task
      close predicates over multiple evidence sources (object state change,
      smart-plug power drop, zone-departure-with-object, sustained absence, user
      confirmation), with retrospective boundary correction in the log.
    done_test: >-
      Median opened_at and closed_at boundary error reported separately in
      seconds on your annotated set. A deliberate audit confirms zero lookahead
      in the online path. Open, close and at-risk use three distinct, documented
      operating points.
  - id: cp-runtime
    title: 'Tag runtime: noisy detections to well-formed tags'
    depends_on:
      - cp-tag-model
      - cp-boundaries
      - cp-zones
    courses: []
    concepts:
      - tzt-detection-to-event-debouncing
      - tzt-task-state-machine
      - tzt-tag-wellformedness-monitor
      - bayes-filter
    status: not_started
    build: >-
      Wire real perception events into the statechart from cp-tag-model.
      Implement two-threshold hysteresis, k-of-n persistence, calibrated
      log-odds evidence accumulation with decay, cooldowns, and timeouts emitted
      as events. Persist instances and rebuild by replay after restart.
    done_test: >-
      Replay a recorded day offline and sweep all thresholds in minutes. The
      system produces a well-formed tag document: no duplicate opens, no
      unmatched closes, and every open eventually reaches CLOSED or ABANDONED.
      Killing and restarting the process loses no open tags.
  - id: cp-anticipate
    title: Anticipatory zone-exit warning
    depends_on:
      - cp-runtime
    courses: []
    concepts:
      - tzt-time-to-boundary-prediction
      - tzt-anticipatory-zone-exit
      - tzt-alert-policy-thresholds
      - kalman-filter
    status: not_started
    build: >-
      Implement all three mechanisms in order: inset buffer polygon, then
      Kalman-based time-to-boundary with Monte-Carlo P(exit within tau), armed
      only while a tag bound to that zone is open. Reversible AT_RISK with a
      1-3s notification confirmation window. Escalation ladder over nested
      zones. Zero-velocity proximity/orientation fallback and risk inflation on
      track loss near a boundary.
    done_test: >-
      On real crossings: alert timestamps PRECEDE crossing timestamps, with a
      reported median and 10th-percentile lead time. False-alarm rate per
      open-task-hour and miss rate are both reported, and the tau trade-off
      curve is plotted and a point chosen consciously per zone. Ablating to
      reactive exit detection visibly destroys lead time.
  - id: cp-eval
    title: Personal evaluation harness and honest numbers
    depends_on:
      - cp-runtime
      - cp-anticipate
    courses: []
    concepts:
      - tzt-personal-dataset-annotation
      - tzt-evaluation-metrics-tagging
    status: not_started
    build: >-
      Annotate a few full unedited days as intervals (start, end, zone,
      actually-forgotten) plus zone-crossing timestamps, including deliberate
      hard cases. Build a one-command offline evaluation over the event log
      producing the full metric table. Put the well-formedness property tests in
      CI.
    done_test: >-
      One command prints instance precision/recall, boundary error, false-open
      per idle hour, false-close rate, hang rate, lead time distribution,
      false-alarm per open-task-hour and miss rate — on a held-out set of days
      never used for tuning.
  - id: cp-deploy
    title: Live on-device deployment and the human loop
    depends_on:
      - cp-eval
    courses: []
    concepts:
      - tzt-realtime-edge-deployment
      - tzt-alert-delivery-ux
    status: not_started
    build: >-
      Move the stack to the always-on device: quantise with a calibration set
      from your own footage, re-run the full evaluation post-quantisation,
      trigger the expensive recogniser instead of polling it. Build alert
      delivery: ambient low-latency channel for AT_RISK, phone for OVERDUE,
      one-tap done/not-a-task/snooze feeding user_correction events, and an
      always-available glanceable list of open tags.
    done_test: >-
      Runs a week unattended within thermal budget with no latency creep.
      Post-quantisation metrics are within tolerance of the pre-quantisation
      table. Dismissal rate and forgotten-task rate are being tracked, and at
      least one real forgotten task was caught by an anticipatory warning rather
      than a post-hoc one.
notes: []
updated: '2026-09-21'
---
# Task Zone Tracker

A syllabus for building a system that watches what you are doing, opens a "tag"
when a task starts, keeps it open until it sees the task close, and warns you
*before* you walk out of the task's physical zone with it still open.

## The three things this syllabus is specifically built around

1. **Tasks as markup tags.** A task is a span, not an event: it is opened, it
   carries attributes (most importantly a bound zone), and it must be closed.
   The formalism is taken seriously — including where it breaks (real tasks
   interleave rather than nest, so the open set is an id-keyed map, not a stack;
   tags are inferred probabilistically rather than parsed; the element vocabulary
   is open) — because each break is a concrete design decision.
2. **Open vocabulary, with a "none of the above" path.** The tasks are not a
   fixed class list. A closed-set classifier would confidently mislabel every
   novel activity, and a confidently wrong tag is worse than no tag for a memory
   aid. Zero-shot for the tail, open-set rejection for the 95% of the day that is
   nothing, few-shot enrollment for the handful of tasks that actually matter.
3. **Anticipatory zone exit, not reactive.** `P(exit(Z) within τ | history)`,
   not `inside(p_t, Z)`. Different inputs (velocity and heading), different
   output (a time-to-event), different metrics (lead time and false alarms per
   open-task-hour, never accuracy). The AT_RISK state is reversible so that
   turning back cancels the warning silently, which is what makes an early,
   aggressive threshold affordable.

## Shape of the graph

Two independent roots — `cp-tag-model` (pure software, no camera, fully
testable on synthetic traces) and `cp-capture` (the rig) — so the hardest
modelling work is not blocked on hardware and vice versa. Perception then
branches into a spatial line (track → zones) and a semantic line (recognition →
boundaries), which converge at `cp-runtime` where noisy detections become
well-formed tags. `cp-anticipate` builds on that, and `cp-eval` then
`cp-deploy` close it out.

Deliberately, `cp-tag-model` comes first and needs no perception at all: the
state machine, the monitors and the replay harness are buildable and testable in
a day, and they define the target the perception stack is built to hit.
