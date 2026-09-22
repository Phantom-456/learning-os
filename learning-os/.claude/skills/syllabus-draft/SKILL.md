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
   - **Every Concept you create must have a substantive, complete prose
     `body`** — real explanatory content someone could actually learn from,
     not a stub. If you find yourself about to write a placeholder or a
     `_TODO_`-style template slot, stop and actually write the explanation.
     A syllabus with empty concept bodies is not a finished draft.
   - **If a checkpoint depends on an EXISTING Concept whose body is still an
     unfilled placeholder** (mostly `_TODO_`/template markers, no real
     content), do not silently leave it that way. Either fill it in with
     real content as part of this draft (preferred, if it's genuinely
     foundational to this project), or call it out explicitly to the user
     as a prerequisite gap they'll need to fill before that checkpoint is
     truly workable — never present a syllabus whose real dependencies
     point at empty content without saying so.
   - For any concept that's genuinely hard or novel for THIS specific
     project (not generic background) — identify it now; step 5a covers
     resourcing it.
5a. **Attach study resources before presenting the draft — do not skip
    this.** For every concept flagged as hard/novel in the previous step,
    run the resource-finder skill's process (WebSearch/WebFetch for real,
    live, free material; verify before attaching; `create_source` tagging
    the concept). A syllabus with zero attached Sources anywhere is
    incomplete — resourcing is part of drafting a syllabus, not an optional
    follow-up.
5b. If 3 or more of the concepts you just gathered naturally form a taught
    unit that would be reusable across other projects (not just specific to
    this one), bundle them into a Course via `create_course` rather than
    leaving them as loose concepts — that's what Courses are for. Don't
    force it when a handful of standalone concepts is more honest.
6. Call `create_project` with the full checkpoint array. If `update_project`
   is rejected for a dependency cycle, you made an edge mistake — fix the
   `depends_on` and retry, don't just remove the checkpoint.
7. Present the drafted checkpoint list to the user before considering this
   done — a syllabus is a starting point they should react to, not a
   finished artifact you silently commit to without their eyes on it. Note
   in your presentation any prerequisite gaps you flagged in step 5, and
   which concepts (if any) you couldn't find resources for.

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
- If no Template existed for this kind of project (step 3's fallback), and
  the resulting syllabus turns out well, consider creating one via
  `create_template` once the project is underway — that's how the Template
  library grows from zero instead of staying empty forever.
- `parent` on a new Concept should match an existing area header when the
  concept genuinely belongs there (check `list_concepts` groupings first);
  only introduce a new area name when nothing existing fits. Keep area names
  broad and domain-level (e.g. "State estimation"), not project-specific.
