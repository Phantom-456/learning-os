---
name: set-objectives
description: Batch-fill Goal/Success Condition/Failure Condition for every concept flagged via "Fill Concept Objectives". Use when the user asks to run "Set Objectives", or says they've flagged concepts and want objectives filled. Triggered by concepts with needsObjectives set (via the app's button or flag_concept_objectives).
---

# Set Objectives

For every concept flagged as needing its self-assessment objectives filled,
write a genuine Goal, Success Condition, and Failure Condition grounded in
that specific concept's actual content — not generic boilerplate that could
apply to any topic.

## Steps

1. Call `list_concepts_needing_objectives`. This is your work queue. If
   empty, tell the user and stop.
2. For each flagged concept, call `get_concept` to read its `body` and
   `notes` — the objectives must reflect what THIS concept actually covers,
   not a generic template.
3. Draft three fields:
   - **Goal**: one or two sentences, phrased as what the learner is trying
     to understand or be able to do — specific to this concept's actual
     content, not "understand [title]" restated.
   - **Success Condition**: a concrete, checkable statement of what "you've
     got it" looks like — ideally something the learner could self-test
     (e.g. "can derive X from first principles without looking it up," "can
     explain why Y fails under Z condition").
   - **Failure Condition**: the specific, common misunderstanding or gap
     that indicates the learner hasn't grasped it yet — the actual trap
     people fall into with this topic, not a vague "doesn't understand it."
4. If a concept's `body` is still an empty placeholder template (no real
   content to ground objectives in), don't fabricate objectives from the
   title alone — skip it, leave its flag set, and note in your final report
   that it needs real content filled in before objectives can be written
   meaningfully.
5. Call `set_concept_objectives` with the three fields — this also clears
   the flag automatically.
6. After processing the queue, report which concepts got objectives filled
   and which were skipped (and why).

## Steerable reruns

If the user says "redo the objectives for X, they're too generic" or
similar against an already-filled concept, re-run steps 2-5 for that
specific concept with the steering incorporated into your drafting (e.g.
"more specific," "shorter," "focus on the math not the intuition") — you
don't need `flag_concept_objectives` first if the user names the concept
directly, but do flag it first if you're asked to revisit a whole category.

## Notes

- Keep each field to 1-3 sentences — these are meant to be glanced at, not
  read as another essay. If you're writing a paragraph, you're writing the
  Goal for the wrong altitude.
