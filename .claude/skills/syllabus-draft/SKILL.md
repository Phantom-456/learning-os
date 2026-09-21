---
name: syllabus-draft
description: Draft a syllabus (checkpoint DAG) for a new project, starting from the closest matching Template if one exists. Use when the user wants to start a new project/robot/skill area and needs an initial roadmap. Supports steerable reruns to refine an existing project's syllabus.
---

# Syllabus Draft

Given a one-line project goal from the user, produce a first-draft Project
with a checkpoint dependency graph, seeded from the closest Template if one
exists, and from web research if not.

## Steps

1. Call `list_templates`. If any exist, judge which (if any) is close enough
   to the stated goal to use as a starting point. If the library is large
   (see the tool's own description for the size threshold), do a targeted
   read via `get_template` on the 2-3 most promising candidates rather than
   reading all of them.
2. If a close Template exists: call `get_template` on it, read its
   `courses`/`concepts`/`lessons_learned`/`known_pitfalls`/`watch_for`. Call
   `get_global_knowledge` too — merge relevant entries from both into your
   planning, not just the template's own.
3. If no close Template exists: use WebSearch/WebFetch to research what a
   reasonable curriculum for this goal looks like (established courses,
   standard prerequisite chains, what practitioners in the field say is
   foundational vs. advanced). Do not fabricate a syllabus from assumed
   knowledge alone when the domain is unfamiliar — verify against real
   sources.
4. Draft an ordered list of checkpoints (5-15 is typical; use judgment for
   the actual scope) as a dependency graph, not necessarily a straight line —
   only add a `depends_on` edge where the dependency is real (you need X
   before Y makes sense), not just for every checkpoint on the one before it.
5. For each checkpoint, identify the Concepts it needs. Reuse existing
   Concepts by id where they already exist (search by title first — don't
   create a duplicate "PID control" concept if one exists); create new ones
   via `create_concept` only for genuinely new topics.
6. Call `create_project` with the full checkpoint array. If `update_project`
   is rejected for a dependency cycle, you made an edge mistake — fix the
   `depends_on` and retry, don't just remove the checkpoint.
7. Present the drafted checkpoint list to the user before considering this
   done — a syllabus is a starting point they should react to, not a
   finished artifact you silently commit to without their eyes on it.

## Steerable reruns

If the user says "redo this, but weight it more toward X" or "add a
checkpoint for Y" against an EXISTING project, do not call `create_project`
again. Call `get_project`, apply the steering to the existing checkpoint
array (add/reorder/re-scope checkpoints), and call `update_project` with the
revised array.

## Notes

- Prefer fewer, well-scoped checkpoints over many granular ones — a syllabus
  the user has to click through 30 times to review is worse than one with 8
  clear stages, even if the 8-stage one is coarser.
- If you draw from a Template, and the project later completes or is
  abandoned, remind the user (or do it yourself if asked) to call
  `append_lesson_learned`/`append_known_pitfall` on that Template so the next
  syllabus draft starts smarter.
