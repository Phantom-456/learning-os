---
id: tzt-open-vocab-action-recognition
title: Open-vocabulary and zero-shot activity recognition
parent: Activity recognition
order: 31
status: not_started
review: false
prereqs:
  - tzt-video-representation-clip
notes: []
updated: '2026-09-21'
---
# Open-vocabulary and zero-shot activity recognition

## Why it exists
The brief's tasks are not a fixed list. "Cooking", "laundry", "charging the
drill", "soaking a pan" — whatever the user happens to start. A closed-set
classifier trained on N categories is structurally wrong for this: it will
confidently assign every novel activity to its nearest known class, which means
the system opens a *wrong* tag rather than admitting it does not know. For a
memory-assistance product, a confidently wrong tag is worse than no tag.

## The three regimes, and what each is for
1. **Zero-shot / open-vocabulary classification.** Score a clip against text
   prompts for candidate task names in a joint embedding space. Cheap, needs no
   data, and is the right default for the *long tail*. Accuracy is mediocre and
   scores are uncalibrated.
2. **Open-set recognition.** The complement, and the part people skip: the
   ability to output "none of the above". This is what stops the system opening
   spurious tags during the 95% of the day that is not a task. Techniques:
   thresholding on max similarity (weak), adding explicit negative/background
   prompts ("a person walking through a kitchen", "an empty room") which works
   surprisingly well, and energy/distance-based rejection.
3. **Few-shot enrollment.** For the handful of tasks that actually matter to
   this user, a few labelled examples beat any zero-shot prompt. See
   `tzt-few-shot-task-enrollment`.

The working architecture for this project is all three: open-vocabulary
proposal, open-set rejection, few-shot refinement on the user's real tasks.

## Specific techniques worth knowing
- **Prompt engineering as a first-class knob.** "a photo of someone cooking" vs
  "a person stirring a pot on a lit stove burner" differ enormously. Prompt
  ensembles (several phrasings averaged) are a reliable, free accuracy gain.
- **Verb/object decoupling** (see `tzt-video-representation-clip`): recognising
  novel *objects* via a prompt-based object encoder while keeping the verb
  encoder object-agnostic generalises substantially better on egocentric
  benchmarks than a single open-vocabulary head.
- **VLM-as-reasoner over structured perception.** A newer and very practical
  pattern: don't ask a VLM to classify the video end-to-end. Use cheap perception
  to extract structured facts (which objects, which hands, which zone, over which
  frames) and have a language model reason over that symbolic trace. It is
  cheaper, far more debuggable, and its output is text you can map onto a tag
  schema.
- **Canonicalisation.** Open vocabulary means the same task can come back under
  different names on different days. Cluster proposed names in embedding space
  and keep a user-confirmable alias table, or you will open two tags for one pot
  of rice (the failure mode called out in `tzt-task-tag-model`).

## Watch for
- No "none of the above" path. This is the single most common and most damaging
  omission.
- Evaluating on the same curated benchmark the method was designed for and
  assuming transfer to your kitchen at your camera angle in your lighting.
- Treating recognition output as the tag. It is *evidence* for a tag; the state
  machine decides.
