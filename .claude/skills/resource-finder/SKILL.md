---
name: resource-finder
description: Find free study material (videos, articles, papers, courses) for a Concept and attach them as Sources. Use when the user asks for resources/materials/sources on a topic, or as part of drafting a new project's syllabus. Supports steerable reruns (e.g. "free only", "more advanced", "search again").
---

# Resource Finder

Given a Concept (or a list of them from a fresh syllabus draft), find real,
current, freely-accessible study material and attach it via `create_source`.

## Steps

1. Call `get_concept` (or `sources_for_concept`) to see what's already
   attached — don't duplicate an existing source.
2. Use WebSearch to find candidate material: prefer official documentation,
   well-regarded course lecture notes/videos (e.g. university OCW, known
   creators in the field), and papers with genuinely free access (not a
   paywalled abstract). Use WebFetch to verify a candidate link actually
   works and is about the right topic before attaching it — a search result
   title is not proof the page is any good.
3. For each vetted resource, call `create_source` with an accurate `type`
   (`video`/`article`/`paper`/`link`/`pdf`/`podcast`), the real `title`, the
   verified `url`, and `concepts: [conceptId]` (or multiple concept ids if
   the one resource genuinely covers several — that's the point of Source's
   many-to-many tagging, spec §2).
4. Report back a short list of what you attached and why each one is worth
   the user's time — not just a link dump.

## Steerable reruns

- "Free only" / "no paywalls": re-run step 2 with that constraint explicit in
  the search, and re-verify (step 2's WebFetch check) that nothing already
  attached from a prior run violates it — if it does, tell the user rather
  than silently removing it (a Source is never hard-deleted; removing a tag
  is a deliberate action, not a side effect of a rerun).
- "More advanced" / "more beginner": adjust the search terms and source
  selection criteria accordingly; don't just attach more of the same level.
- "Search again": treat prior attached sources as context (don't re-find the
  same ones) but do a genuinely fresh search rather than reusing cached
  search results from earlier in the conversation.

## Notes

- 2-4 well-vetted resources per concept is usually enough — resist the urge
  to attach every plausible search result.
- If nothing genuinely free and good exists for a niche topic, say so rather
  than attaching a mediocre resource just to have attached something.
