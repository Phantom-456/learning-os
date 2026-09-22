---
name: gather-sources
description: Batch-process every concept flagged as needing sources — find real external study material AND identify/link missing prerequisite concepts. Use when the user asks to run "Gather Sources", or says they've flagged concepts and want sources gathered. Triggered by concepts with a sourceFlag set (via the app's "Run Source Search" button or flag_concept_sources).
---

# Gather Sources

For every concept flagged as needing source attention, do two things: find real
external study material (the resource-finder process), AND identify whether
the concept is missing a foundational prerequisite concept it should be
linked to — "sources" here means both external material and internal
prerequisite links, not just external links.

## Steps

1. Call `list_concepts_needing_sources`. This is your work queue. If it's
   empty, tell the user there's nothing flagged and stop.
2. For each flagged concept, call `get_concept` to read its current body,
   existing `prereqs`, and note the specific `sourceFlag` value
   (`need_sources` / `need_better_sources` / `need_new_sources`) — it tells
   you the starting point:
   - `need_sources`: nothing attached yet, so `sources_for_concept` will
     likely return empty. Do a full resource-finder pass from scratch.
   - `need_better_sources`: something is attached but the user judged it
     weak. Read the existing sources via `sources_for_concept` first — don't
     just pile more on; decide whether to unlink the weak one (via
     `update_source` on it, removing this concept from its `concepts` list)
     once you have a stronger replacement.
   - `need_new_sources`: existing sources are stale/outdated. Same as above
     but the bar is currency, not quality.
3. Run the resource-finder skill's process for this concept: real
   WebSearch/WebFetch, verify links before attaching, `create_source` with
   accurate `type`/`title`/`url`/`concepts`.
4. **Prerequisites are sources too.** Based on the concept's body and the
   material you just found, judge whether the concept assumes foundational
   knowledge that isn't yet captured as a linked prerequisite Concept. If a
   genuine prerequisite is missing:
   - Search first (`list_concepts` or a targeted look) for whether it
     already exists under a different id — reuse it, don't duplicate.
   - If it doesn't exist, create it via `create_concept` with a real,
     substantive body (not a stub — same rule as syllabus-draft).
   - Link it by calling `update_concept` on the ORIGINAL flagged concept,
     adding the prerequisite's id to its `prereqs` array (don't overwrite
     existing prereqs — append).
   - Do not invent a prerequisite that isn't genuinely needed just to have
     something to link — most concepts won't need a new one.
5. Once you've attached what you found (or determined nothing more is
   findable — see Notes below), call `clear_concept_sources_flag` for this
   concept.
6. After processing the whole queue, report to the user: which concepts
   were processed, what was attached to each, which prerequisite concepts
   (if any) were created or linked, and which concepts (if any) you
   couldn't find good material for.

## Steerable reruns

If the user gives extra steering ("free only", "focus on video content",
"skip the ones about X") while invoking this skill, apply it as a filter/
preference across the whole queue processed in step 1-4, same as the
resource-finder skill's own steerable-rerun guidance.

## Notes

- If you genuinely can't find good material for a concept after a real
  search, don't attach something mediocre just to clear the flag — leave
  the flag set, note it in your final report, and move on. A flag staying
  set honestly is better than false completion.
- Don't process the whole queue silently and report only at the end if the
  queue is large (10+) — give the user a brief progress note partway
  through so they're not staring at silence.
