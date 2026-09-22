---
id: dynamic-gesture-recognition
title: Dynamic gesture recognition from landmark sequences
parent: Multimodal intent
order: 50
status: not_started
review: false
prereqs:
  - pose-landmark-estimation
  - temporal-activity-segmentation
notes: []
updated: '2026-09-21'
---
# Dynamic gesture recognition from landmark sequences

## Why it exists
A static hand shape is a pose; a gesture is a trajectory. Recognising "wave",
"point at the screen", "stop", or "dismiss" means classifying a SEQUENCE of
landmark frames, and - harder - spotting where that sequence starts and ends
inside a continuous stream of ordinary movement. The second half is what
distinguishes a demo from a system you can live with.

## Features before models
The single highest-leverage step is normalising the landmarks so the
classifier learns the gesture and not your position in the room: re-centre on
a stable reference (wrist for hand gestures, hip midpoint for body), scale by
a body-intrinsic length (palm width, torso length), and optionally rotate to a
canonical orientation. Feed velocities as well as positions - a gesture is
defined by motion, and handing the model the derivative saves it from having
to learn differentiation. With good normalisation, a small model on a few
hundred examples per class works; without it, a large model on thousands
still fails across the room.

## Model choices, in escalating order
- **Template matching / DTW** over normalised trajectories. Needs a handful
  of examples per class, is inspectable, and is a completely legitimate
  answer for a five-gesture vocabulary.
- **Small sequence classifier** (1D-CNN, GRU/LSTM, or a compact
  transformer/convolution-mixer) over a fixed window. The standard choice;
  lightweight variants are specifically designed for this budget.
- **Graph convolutional networks** over the skeleton (ST-GCN family),
  exploiting the joint connectivity. Strong results, heavier, and overkill
  for a small custom vocabulary.

Start with the vocabulary you actually need - probably three to six gestures -
and the simplest method that clears your accuracy bar.

## Spotting: the underrated problem
A classifier over a sliding window always outputs SOMETHING, so continuous
operation needs an explicit rejection path. Three standard mechanisms, used
together: a "none/background" class trained on plenty of ordinary movement; a
confidence threshold; and the same dwell/hysteresis machinery from idle
detection, so a gesture must be confidently detected across several
consecutive windows before it fires. Also enforce a refractory period so one
wave is not recognised three times as the window slides over it.

## Collecting your own data
This vocabulary is personal, so you will record it yourself. What matters:
vary distance, angle, lighting, clothing and speed; record from the DEPLOYED
camera position, not a convenient one; record far more background/none data
than gesture data, because that is the real class distribution; and label
boundaries generously but consistently. A few hundred examples per class,
collected with that variety, beats thousands recorded in one sitting at one
distance. Keep a held-out set recorded on a DIFFERENT day - same-session
splits flatter your model badly.

## Self-test
- What normalisation makes your features invariant to distance and position?
- How does your system avoid firing a gesture during ordinary movement?
- Why must the held-out set come from a different recording session?
