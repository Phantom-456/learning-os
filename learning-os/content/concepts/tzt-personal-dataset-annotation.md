---
id: tzt-personal-dataset-annotation
title: Building and annotating a personal evaluation dataset
parent: Evaluation & deployment
order: 60
status: not_started
review: false
prereqs:
  - tzt-event-stream-design
  - tzt-on-device-privacy
notes: []
updated: '2026-09-21'
---
# Building and annotating a personal evaluation dataset

## Why it exists
Public benchmarks will not tell you whether this works in your kitchen. Their
camera angles, lighting, action durations and class sets are all different, and
critically none of them contain the thing that dominates your data: hours of
nothing happening. You need a small, honest, personal evaluation set, and you
need it early — before tuning, not after, or every decision you make is guided by
vibes.

## What to collect
- **A handful of full days**, unedited, including the boring parts. The ratio of
  idle time to task time is a *property of your data* that determines false-alarm
  rates, and any curated set destroys it.
- **Deliberate hard cases**: two tasks interleaved; a task you walk away from and
  return to; a task completed off-camera; low light; a guest in the frame; the
  camera bumped.
- **Ground truth as intervals**, matching the tag model: for each task instance,
  true start time, true end time, bound zone, and whether it was actually
  forgotten. Interval annotation is the only format that lets you compute
  boundary error and lead time.
- **Zone crossing ground truth**: timestamps when the subject actually crossed
  each boundary. Needed for lead-time measurement and easy to get by stepping
  through frames at crossings.

## Practicalities
- Annotating video is slow (realistically 3-10x real time). Keep the set small
  and reuse it ruthlessly. Two well-annotated days beats twenty unlabelled.
- **Bootstrap with the system itself.** Run the current pipeline, then correct
  its output rather than labelling from scratch. Corrections are also training
  data (`tzt-few-shot-task-enrollment`) and feed back through the same
  `user_correction` events.
- **Hold out properly.** Tune thresholds on one set of days, report on another.
  It is extremely easy, with a dataset this small, to tune yourself into a number
  that means nothing.
- **Storage and privacy.** This footage is the most sensitive artefact in the
  project. Encrypted at rest, local only, with an explicit delete date — and the
  event log retained after the video is gone, which is usually enough to re-check
  most regressions.

## Watch for
- Recording only while performing tasks for the camera. Performed tasks look
  different from real ones, and the absence of idle footage hides your worst
  failure mode.
- Annotating starts but not ends. Ends are harder, less obvious, and more
  important here.
