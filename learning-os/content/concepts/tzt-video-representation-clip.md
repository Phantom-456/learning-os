---
id: tzt-video-representation-clip
title: Video representations and vision-language embeddings
parent: Activity recognition
order: 30
status: not_started
review: false
prereqs:
  - tzt-video-capture-pipeline
notes: []
updated: '2026-09-21'
---
# Video representations and vision-language embeddings

## Why it exists
Before you can recognise an open-ended set of tasks, you need a representation
of a few seconds of video that (a) captures motion, not just appearance, and
(b) lives in a space shared with *language*, because that is what makes an open
vocabulary possible at all.

## What to learn
- **Why images are not enough.** A single frame of "hand near pan" cannot
  distinguish putting food in from taking it out — and those are the open and
  the close of the same tag. Temporal modelling is not optional for this project;
  it is the difference between the two events you care most about.
- **Clip encoders.** The practical family: a frozen image backbone applied
  per-frame plus temporal aggregation (mean-pool, transformer over frame tokens),
  versus native video transformers. For an on-device build, per-frame features +
  lightweight temporal head is usually the right trade.
- **Joint image-text embedding (CLIP-style).** An image encoder and a text
  encoder trained so that matched pairs are close. The consequence that matters:
  you can classify into *any* set of categories by writing them as text prompts
  at inference time, with no retraining. This is the mechanism behind every
  open-vocabulary method you will use downstream.
- **Video-language models** extend this to clips and to generative
  description. They are the most flexible option and the most expensive; know
  where they sit, and know the privacy constraint (`tzt-on-device-privacy`)
  that likely keeps the big ones out of your loop.
- **Verb/noun decomposition.** Egocentric action work has converged on treating
  an action as (verb, object) rather than one atomic label, and recognising each
  with a different mechanism — an object-agnostic verb encoder plus a
  prompt-based object encoder generalises to unseen objects far better than a
  single joint classifier. This decomposition is directly useful here: your tag
  *name* is essentially a (verb, object) pair, and object novelty ("a pan I've
  never seen") is much more common than verb novelty.

## Watch for
- Benchmarking on trimmed, curated clips and expecting the numbers to survive
  contact with an untrimmed, mostly-boring home video stream where >95% of frames
  contain no task transition at all.
- Assuming embedding similarity is calibrated. CLIP-style scores are relative,
  not probabilities; you must calibrate before using them as confidence in a
  state-machine guard.
