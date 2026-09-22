---
id: tzt-temporal-action-segmentation
title: 'Temporal action segmentation: finding the boundaries of an activity'
parent: Activity recognition
order: 33
status: not_started
review: false
prereqs:
  - tzt-video-representation-clip
notes: []
updated: '2026-09-21'
---
# Temporal action segmentation: finding the boundaries of an activity

## Why it exists
Classification answers "what is happening". This project needs "when did it
start" and "when did it end" — which is precisely the temporal action
segmentation / localisation task: given an untrimmed video, label every frame and
thereby recover the start and end boundaries of each action segment. The mapping
to the tag model is exact and worth stating plainly: **a segment's start
boundary is the opening tag; its end boundary is the closing tag.** Every result
in this literature about boundary precision is a result about how accurately your
system can open and close tags.

## What to learn
- **The task setup.** Frame-wise labels over long, untrimmed video; standard
  benchmarks are cooking-heavy (50 Salads, Breakfast, GTEA) and egocentric
  assembly (Assembly101) — which is fortunate, because cooking is the brief's own
  example.
- **The dominant failure: over-segmentation.** Frame-wise models flicker,
  chopping one long action into many short ones. Every architectural trick in
  this area (multi-stage refinement, smoothing losses, boundary-aware decoding)
  exists to fight it. For you, over-segmentation means one pot of rice producing
  six open/close pairs — the same problem the state machine's hysteresis attacks
  from the other side. Fight it at both layers.
- **Decoupling boundary detection from frame labelling.** A productive
  architecture: one head predicts "is this frame a boundary", another predicts
  "what action is this frame", and they are combined. This is directly useful
  because your two heads map onto two different downstream consumers — the
  boundary head drives tag open/close events, the label head drives the tag name.
- **Metrics.** Frame accuracy is a bad headline metric (a model that predicts the
  majority class through a long action scores well while missing every boundary).
  Use segmental edit distance and segmental F1 at IoU thresholds — and for this
  project, add boundary-localisation error in seconds, because `opened_at`
  accuracy determines whether "expected duration" logic works at all.

## Offline vs online
Almost all of this literature is **offline**: the model sees the whole video,
including the future, before labelling. You cannot. Study the offline methods to
understand the problem structure and to build your evaluation harness against
recorded video — then port the constraint-aware version
(`tzt-online-action-start-detection`). Building offline first is the right
order: it gives you an upper bound on achievable accuracy and a clean dataset,
before the causality constraint makes everything harder.

## Watch for
- Reporting frame accuracy and believing it.
- Assuming benchmark segment lengths resemble yours. Benchmark actions run
  seconds; "rice is cooking" runs twenty minutes, mostly with nobody in frame.
  That regime — very long, sparsely-observed segments — is barely represented in
  the literature and is your actual problem.
