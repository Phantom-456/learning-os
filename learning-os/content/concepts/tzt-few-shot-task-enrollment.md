---
id: tzt-few-shot-task-enrollment
title: Few-shot task enrollment from the user's own examples
parent: Activity recognition
order: 32
status: not_started
review: false
prereqs:
  - tzt-open-vocab-action-recognition
notes: []
updated: '2026-09-21'
---
# Few-shot task enrollment from the user's own examples

## Why it exists
The user has maybe eight tasks that account for nearly all their forgetting, and
those eight are highly personal and highly repetitive: *their* stove, *their*
kettle, *their* washing machine, from *one* fixed camera angle. That is the
ideal setting for few-shot learning, and it is where the accuracy needed to make
alerts trustworthy will actually come from. Zero-shot handles the tail;
enrollment handles the cases the product is judged on.

## The mechanics
- **Prototype-based classification.** Embed a handful of clips per task, average
  them into a prototype vector, classify by nearest prototype with a rejection
  radius. No gradient training, runs on-device, a new task is enrolled in
  seconds. This should be your default — the complexity of fine-tuning is rarely
  justified at n=5.
- **Linear probe.** Freeze the encoder, train a small classifier head on the
  enrolled examples. Slightly better than prototypes when you have tens of
  examples per class; still cheap.
- **Negatives matter more than positives.** With five positive clips and no
  negatives, everything looks like the task. Mine negatives automatically from
  the user's own footage: any clip from a period with no open tag is a background
  sample. This is nearly free and is the highest-value data you have.
- **Enrollment UX is part of the algorithm.** The realistic capture path is not
  "record five demonstrations"; it is the correction loop from
  `tzt-event-stream-design` — the user says "no, that wasn't cooking" or "yes,
  that's done", and each correction is a labelled example. Design for this and
  the system improves through use; don't, and it is frozen at install quality.
- **Close examples are scarcer than open examples.** People demonstrate starting
  things; completions are undramatic and under-captured. Deliberately solicit
  close examples, or your `θ_close` will be tuned on almost nothing and tasks
  will hang open.

## Watch for
- Catastrophic drift when the camera moves or the kitchen is rearranged;
  re-enrollment must be a one-minute user action, not a rebuild.
- Class imbalance across enrolled tasks (one task with 40 corrections, six with
  2). Prototype methods are fairly robust to this; linear probes are not.
- Overfitting to time of day / lighting if all examples come from one evening.
