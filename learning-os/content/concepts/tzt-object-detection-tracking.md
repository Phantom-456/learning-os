---
id: tzt-object-detection-tracking
title: Object detection and multi-object tracking for persistent identity
parent: Spatial perception
order: 20
status: not_started
review: false
prereqs:
  - tzt-video-capture-pipeline
notes: []
updated: '2026-09-21'
---
# Object detection and multi-object tracking for persistent identity

## Why it exists
Two different things in this system need *persistent identity across frames*,
and neither works with per-frame detection alone:

1. **The subject.** The anticipatory zone warning is about a trajectory — where
   is the person going. A trajectory requires that the person in frame 100 is
   known to be the same person as in frame 99. Per-frame detection gives you a
   box; tracking gives you a `track_id` and therefore a velocity.
2. **The task-bearing object.** Matching a close event to the right open
   instance (two pans on the stove) needs object identity, not just object class.

## What to learn
- **Detection**: a modern single-stage detector is fine; you are detecting
  `person` plus a handful of household object classes. Resolution and
  calibrated confidence matter more than architecture.
- **Tracking-by-detection**: the dominant, and for this project entirely
  sufficient, paradigm. Detect per frame, associate across frames via IoU +
  motion prediction, maintain tracks with birth/death logic. The classic
  SORT/ByteTrack family uses a **constant-velocity Kalman filter per track** to
  predict where each box will be in the next frame, then Hungarian-matches
  detections to predictions. Learn this properly: the very same per-track
  velocity estimate is what `tzt-time-to-boundary-prediction` reuses to
  answer "when will this person cross the zone boundary" — you get the
  anticipatory signal essentially for free once tracking is correct.
- **Track lifecycle**: `tentative -> confirmed -> lost -> deleted`, with a
  max-age before deletion. Note the structural echo of the task state machine —
  tentative/confirmed is the same hysteresis idea at a different layer.
- **ID switches and occlusion**: the dominant failure mode indoors (doorways,
  furniture, someone crouching). An ID switch mid-task will, if you are careless,
  look like "the person left the zone" and fire a false alert. Bound the damage
  by treating a track death inside a zone as `unknown`, not as `exited`.

## Reuse note
`kalman-filter`, `bayes-filter` and `noise-uncertainty` in this library
already cover the estimation theory; this concept is about applying it to
image-plane boxes and about association, which is the part those concepts do not
cover.

## Watch for
- Evaluating the detector alone and assuming tracking will be fine. Track-level
  metrics (IDF1, ID switches) are what predict system behaviour here, not mAP.
- Using the *centre* of the person's box as their floor position; use the bottom
  edge / foot point, because that is what the ground-plane homography maps
  correctly (`tzt-ground-plane-homography`).
