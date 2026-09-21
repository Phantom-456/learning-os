---
name: explode-concept
description: Break a confusing Concept into a finer-grained nested Course, using the reason the user gave for why it's confusing. Use when the user invokes /explode-concept, asks to "explode" a concept, or says a specific concept is too hard to understand as a single unit. Supports steerable reruns: pass extra instructions to refine a previous explosion.
---

# Explode Concept

Given a Concept id, a parent Course id (or a title for a new one), and a reason
the user found it confusing, produce a finer-grained breakdown as a new nested
Course under the parent — then write that breakdown into real Concept/Course
records via the MCP tools. This is the LLM-generation half of Explode Concept;
the structural nesting (creating the course, linking it under the parent) is
already handled by the `explode_concept` tool — this skill's job is to fill
that course with content.

## Steps

1. Call `get_concept` for the target concept id to read its current title,
   body, and any existing notes.
2. If a `parentCourseId` was given, use it directly. If instead a
   `newParentCourseTitle` was given (no existing course to nest under yet),
   first call `create_course` with that title (`kind: "authored"`,
   `concepts: [conceptId]`), then use its id as `parentCourseId`.
3. Call `explode_concept` with `conceptId`, `parentCourseId`, and the user's
   stated `reason`. This creates the empty nested course
   (`<parentCourseId>--<conceptId>-explode`) and returns it.
4. Using the concept's body/notes and the stated reason, draft 2-5
   sub-concepts that break the original concept into smaller, more digestible
   pieces — each one should target the SPECIFIC confusion in the reason, not
   just restate the original concept in smaller chunks. For a reason like "the
   derivation loses me at the update step," a good breakdown separates
   "why we need an update step at all" from "the algebra of the update step
   itself" from "a fully worked numeric example," rather than three generic
   sub-topics.
5. For each sub-concept, call `create_concept` (id: a slug, title, parent:
   same parent header as the original concept — this keeps it visible in the
   normal Concept view too) with a `body` that actually explains that
   sub-piece in the user's likely level of understanding, not a placeholder.
6. Call `update_course` on the exploded course (from step 3) to set its
   `concepts` field to the list of new sub-concept ids.
7. Tell the user what you created: the course id, its sub-concepts, and a
   one-line summary of how the breakdown addresses their stated confusion.

## Steerable reruns

If the user provides additional steering (e.g. "redo this, but focus more on
the geometric intuition" or "that course was too shallow, add a worked
example"), treat it as an addendum to step 4's drafting instructions for an
EXISTING exploded course rather than starting over: call `get_course` on the
existing exploded course id, read its current sub-concepts, then use
`update_concept`/`create_concept` to revise or add sub-concepts per the new
steering — do not call `explode_concept` again (it would create a second,
differently-named exploded course under the same parent).

## Notes

- This is a "testing and comfort" phase skill (design spec §10) — if the
  generated breakdown quality is off, tell the user directly rather than
  guessing; it's fine to ask one clarifying question about the confusion
  before drafting if the reason given is vague.
- Never fabricate a citation or source for a sub-concept's content unless the
  user's existing notes or the original concept's body actually contains one.
