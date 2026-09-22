---
id: tzt-task-tag-model
title: The task-as-markup-tag model
parent: Task tag model
order: 1
status: not_started
review: false
prereqs: []
notes: []
updated: '2026-09-21'
---
# The task-as-markup-tag model

## Why it exists
The whole project rests on one modelling decision: a real-world task is not an
event, it is a **span**. "I put rice on the stove" is not a point in time; it is
an interval that is *opened* at one moment and must be *closed* at another. The
failure mode being solved — starting something and forgetting it — is exactly
the failure mode of an unclosed tag in markup: the document is still
syntactically "in" the element long after the author moved on.

Borrowing HTML's formalism is not a cute analogy, it is a genuine design
commitment with consequences. An HTML parser gives you, for free, a precise
vocabulary for the things this system has to decide:

- **Opening tag** — a detected start-of-task event that creates a live tag
  instance with an identity, a start timestamp, and attributes.
- **Attributes** — the per-instance state carried while open. The critical one
  here is `zone` (the physical region the task is bound to), plus
  `opened_at`, `expected_duration`, `evidence`, `confidence`.
- **Closing tag** — a detected completion event that must *match* the open
  instance, not merely be an event of the right type.
- **The open-element stack** — the set of currently-unclosed tasks. This is the
  system's entire working memory and the thing the user's brain is failing at.
- **Well-formedness** — the property the system is actually enforcing: every
  opened tag is eventually closed.
- **Void / self-closing elements** — instantaneous tasks that need no close
  ("turned off the light"). Recognising that some detected actions are void
  elements stops the stack filling with garbage.

## The parts that are NOT like HTML, and matter more
Taking the model seriously means being precise about where it breaks, because
every break is a design problem you have to solve explicitly:

1. **Real tasks are not properly nested.** HTML requires strict nesting: you
   cannot open A, open B, close A, close B. Human tasks interleave constantly —
   you start the rice, start a load of laundry, the rice finishes, then the
   laundry finishes. So the correct formalism is **not** a stack; it is a
   **multiset of concurrently open intervals** (closer to overlapping-range
   markup, or to XML's "overlapping hierarchies" problem that TEI solves with
   standoff milestone markup). Implementing the open-element list as an actual
   LIFO stack is the first bug you will write. Use an ID-keyed map of open
   instances instead, and require every close event to carry the instance id it
   closes.
2. **Tags are inferred, not authored.** An HTML parser reads unambiguous
   delimiters. Here the "<" and ">" are probabilistic outputs of a vision model.
   Every open and close is a *hypothesis with a confidence*, which is why the
   tag runtime needs hysteresis, evidence accumulation and a provisional-open
   state (see `tzt-detection-to-event-debouncing`).
3. **The vocabulary is open.** HTML has a fixed element set. Here the tag name
   comes from an open-vocabulary recogniser, so two detections of "boiling
   pasta" and "cooking rice" may or may not be the same element type. You need a
   canonicalisation step (embedding-space clustering, or a user-confirmed
   alias table) or the same task will open twice under two names.
4. **Closing has to be *matched*, not just typed.** If two pans are on the
   stove, a single "pan removed" close event must resolve to *one* instance.
   Matching should be on the instance's zone plus its tracked object identity,
   not on the tag name alone. Otherwise one completion silently closes both
   tags and you lose a task.
5. **Some tags never close on their own.** HTML documents end; days do not. You
   need explicit terminal policies: auto-close on timeout, escalate, or mark
   `abandoned` — and each is a different user-facing behaviour.

## What "done" looks like for this concept
You can write down, on paper, the tag schema for three tasks from your own life
(one with a clear physical zone, one interleaved with another, one instantaneous)
including: what evidence opens it, what evidence closes it, what zone it binds,
what its expected duration is, and what should happen if it is still open after
3x that duration. If you cannot do this without the word "somehow", the
perception work downstream has no target to hit.

## Watch for
- Modelling the open set as a stack (see above).
- Conflating *task type* with *task instance*. "Cooking" is an element name;
  "the cooking that started at 19:04 bound to zone kitchen-stove" is the
  instance. Almost every downstream bug is a confusion of these two.
- Letting the tag schema be implicit in code. Write it as a real schema
  (JSON Schema / TypeScript types) first; the perception stack is then built to
  emit *that*, rather than the schema being reverse-engineered from whatever
  the model happens to output.
