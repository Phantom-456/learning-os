---
id: temporal-activity-segmentation
title: Temporal activity segmentation
parent: Edge vision
order: 13
status: not_started
review: false
prereqs:
  - pose-landmark-estimation
  - noise-uncertainty
notes: []
updated: '2026-09-21'
---
# Temporal activity segmentation

## Why it exists
A pose estimate answers "what shape is this body in, now". Almost every
question you actually want answered - am I idle, did I just wave, have I been
at this desk for two hours - is about a SPAN of time, not an instant.
Temporal action segmentation is the problem of taking a long, untrimmed
sequence and labelling each frame with an activity class, including the start
and end boundaries of each segment. Idle detection is the simplest useful
instance of it: a two-class segmentation over an open-ended stream.

## The three levels of approach
1. **Hand-built motion statistics.** Compute a per-frame motion energy from
   landmark deltas (torso-normalised, so distance to camera does not matter),
   smooth it over a window, threshold it. Cheap, transparent, debuggable, and
   genuinely sufficient for idle/active. Start here.
2. **Sliding-window classifier.** Features over a window (joint velocities,
   variance, dwell in a posture cluster) into a small classifier. Handles
   "reading" vs "asleep" vs "away" - the distinctions a single threshold
   cannot make.
3. **Sequence models.** Temporal convolutional networks (MS-TCN and
   descendants) or transformers over the skeleton sequence, trained for
   frame-wise labels. This is where the research literature lives; it is also
   where you need labelled data you do not have yet.

The honest engineering order is 1 -> 2 -> 3, escalating only when you have
measured that the simpler thing fails.

## Online vs offline
Most of the published segmentation literature is OFFLINE: the model sees the
whole clip, including the future, and is scored on how well it recovers
boundaries. Your system is ONLINE - it must decide with only the past, and
its latency is part of the product. Numbers from offline papers are not
achievable causally. When reading the literature, check whether the method is
causal before adopting it.

## Boundaries are the hard part
Frame-wise accuracy is a misleading metric: a model that labels 95% of frames
correctly but flickers at every boundary is useless for triggering an action.
This is why the field reports segmental metrics (segmental edit distance,
segmental F1 at IoU thresholds) alongside frame accuracy. For your purposes
the equivalent question is: how many spurious idle->active transitions does
this produce per hour?

## Failure modes
- Over-segmentation (rapid label flicker) from per-frame decisions with no
  temporal smoothing - the reason hysteresis is a separate concept.
- Class imbalance: "idle" dominates the timeline, so a model can score well by
  never predicting anything else.
- Camera-motion or lighting change reads as body motion if your features are
  not pose-based.

## Self-test
- Why is frame-wise accuracy a bad single metric for segmentation?
- Which of the methods you have read about are causal/online?
- Define a motion-energy feature that is invariant to distance from camera.
