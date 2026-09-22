---
id: pose-landmark-estimation
title: Pose landmark estimation
parent: Edge vision
order: 11
status: not_started
review: false
prereqs:
  - edge-camera-capture-pipeline
notes: []
updated: '2026-09-21'
---
# Pose landmark estimation

## Why it exists
Working directly on pixels is expensive and brittle: a classifier trained on
raw frames of your room learns your sofa, your lighting and your clothes.
Pose estimation collapses a frame into a small vector of body keypoints
(MediaPipe Pose Landmarker emits 33 landmarks, each with x/y/z plus a
visibility/presence score, in both normalised-image and metric world
coordinates). Every downstream stage - idle detection, gesture recognition -
then operates on a ~100-number representation instead of a ~150k-pixel one.
That is what makes the rest of this project fit on an edge device at all.

## How the detector is structured
Modern real-time pose stacks are two-stage and tracking-aware: a person
detector localises a bounding box, a landmark model regresses keypoints
inside that crop, and on subsequent frames the previous landmarks seed the
crop so the detector can be skipped. This is why running the model in
LIVE_STREAM mode is much faster than calling the IMAGE-mode API per frame -
IMAGE mode redetects every time and throws away the temporal prior. The
practical knobs are min_pose_detection_confidence (when to accept a new
person), min_pose_presence_confidence, and min_tracking_confidence (when to
give up on the track and re-detect).

## Coordinate frames - the thing people get wrong
Normalised landmarks are in image space: they change when you walk toward the
camera even if your posture is identical. World landmarks are roughly metric
and hip-centred, so they are far better features for "what is this body
doing". For anything you want to be viewpoint- and distance-robust, use world
landmarks, or normalise image landmarks by torso length and re-centre on the
hip midpoint yourself. Skipping this step is the single most common reason a
gesture classifier works at your desk and fails across the room.

## Assumptions and failure modes
- Occlusion (desk, blanket, side-on posture) produces confidently wrong
  landmarks, not missing ones. The visibility score is the signal to check,
  and it is noisy.
- Single-person models pick one person arbitrarily when two are in frame.
- Seated and reclined postures are under-represented in training data
  relative to standing - directly relevant when the whole point is detecting
  you sitting still.
- Landmark jitter at rest is on the order of a few pixels; any downstream
  motion metric must be thresholded above that noise floor.

## Connections
Prereqs: edge camera capture pipeline. Unlocks: temporal activity
segmentation, dynamic gesture recognition. Pairs with edge model runtimes and
quantisation (how fast it actually runs) and loop timing (whether you can
sustain the rate).

## Self-test
- Explain when the person detector re-runs and why that matters for latency.
- Why do world landmarks generalise better across camera distance?
- Measure your landmark jitter with a person holding still - what is the
  numerical noise floor you must threshold above?
