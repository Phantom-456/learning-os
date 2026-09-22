# Agents Guide — Learning OS

This file is for any coding agent working in this repository — not just
Claude Code. It documents the MCP server, the skills, and the hooks this
project ships, in a tool-agnostic way, so any agent that reads this file
can discover and use the same capabilities Claude Code's `.claude/`
directory wires up natively.

> Note: Claude Code specifically also reads `.claude/skills/*/SKILL.md`
> (the full step-by-step instructions for each skill below) and
> `.mcp.json`/`.claude/settings.json` (auto-discovery config) directly —
> this file is the summary/entry point; those are the detailed source.

## MCP server

Start it: `npx tsx mcp/server.ts` (stdio transport). Registered with Claude
Code automatically via `.mcp.json` when this project is opened. It wraps
`lib/core/*` — a plain TypeScript data layer with no framework
dependencies — as a set of deterministic tools (no LLM calls, no network
calls, inside the server itself; see the design spec's skill-vs-tool
principle). Content lives as Markdown files under `content/`.

### Tools by entity

**Concepts** (`mcp/tools/concepts.ts`): `list_concepts`, `get_concept`,
`create_concept`, `update_concept`, `set_concept_status`, `archive_concept`,
`append_concept_note`, `flag_concept_sources`, `list_concepts_needing_sources`,
`clear_concept_sources_flag`, `flag_concept_objectives`,
`list_concepts_needing_objectives`, `set_concept_objectives`.

**Sources** (`mcp/tools/sources.ts`): `list_sources`, `sources_for_concept`,
`create_source`, `update_source`, `archive_source`.

**Courses** (`mcp/tools/courses.ts`): `list_courses`, `get_course`,
`create_course`, `update_course`, `course_completion`, `delete_course`.

**Templates** (`mcp/tools/templates.ts`): `list_templates`, `get_template`,
`create_template`, `append_lesson_learned`, `append_known_pitfall`,
`delete_template`.

**Projects** (`mcp/tools/projects.ts`): `list_projects`, `get_project`,
`create_project`, `update_project`, `unblocked_checkpoints`,
`set_checkpoint_depends_on`, `delete_project`.

**Prices** (`mcp/tools/prices.ts`): `check_price` (deterministic cache read
— never searches itself), `append_price_observation`, `get_price_record`.

**Global knowledge** (`mcp/tools/globalKnowledge.ts`): `get_global_knowledge`,
`append_global_lesson`, `append_global_pitfall`, `append_global_watch_for`.

**Rollup** (`mcp/tools/rollup.ts`): `aggregated_notes_for_course`,
`aggregated_notes_for_project`.

**Explode** (`mcp/tools/explode.ts`): `explode_concept` (structural move
only — see the `explode-concept` skill for the generation half).

## Skills

Skills are instructions for an LLM session to follow, using the MCP tools
above plus web research (WebSearch/WebFetch) — they are not standalone
programs. The full step-by-step process for each lives in
`.claude/skills/<name>/SKILL.md`; summarized here:

- **`explode-concept`** — breaks a confusing Concept into a finer-grained
  nested Course, given the user's stated reason for the confusion.
- **`syllabus-draft`** — drafts a Project's checkpoint dependency graph for
  a new goal, seeded from the closest Template if one exists or from real
  web research if not. Requires every new Concept to have a substantive
  body (never a placeholder) and requires attaching real Sources before the
  draft is considered done.
- **`resource-finder`** — finds and attaches real, free, verified study
  material (Sources) for a Concept.
- **`pricing`** — prices tools/hardware a checkpoint needs, scoped to a
  market, cache-first via `check_price`.
- **`gather-sources`** — batch-processes every concept with a `sourceFlag`
  set: attaches external Sources AND links/creates missing prerequisite
  Concepts (prerequisites count as "sources" in this project's usage).
- **`set-objectives`** — batch-fills Goal/Success Condition/Failure
  Condition for every concept with `needsObjectives` set, grounded in that
  concept's actual content.

## Hooks

Both live in `.claude/hooks/`, run via `npx tsx` (they import TypeScript
source directly, so plain `node` won't work), registered in
`.claude/settings.json`:

- **`memory-inject`** (`UserPromptSubmit`) — deterministic keyword match
  against known Concept/Course/Project/Template titles (via
  `lib/core/indexDb.ts`'s summary index, not a full content scan); if the
  prompt mentions a tracked entity, injects a short summary as context.
  Costs nothing on the common no-match case.
- **`auto-checkpoint`** (`PostToolUse`, matched to checkpoint-mutating
  tools) — after a checkpoint status/dependency change, surfaces any
  newly-unblocked checkpoints.

## Data model

Five entities plus two singletons, all Markdown files under `content/`,
indexed by a rebuildable SQLite mirror (`lib/core/indexDb.ts`) — see the
design spec (`docs/superpowers/specs/2026-09-21-learning-os-platform-design.md`)
for the full schema. In short: Concept (atomic, shared, mastered once),
Source (tags one or more Concepts), Course (bundle of Concepts/subcourses),
Template (reusable project blueprint with accumulated experience), Project
(a checkpoint dependency graph), Price Record (append-only, market-scoped),
Global Knowledge (instance-wide singleton).
