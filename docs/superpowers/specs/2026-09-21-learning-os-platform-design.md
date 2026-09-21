# Learning OS — Platform Design

> Generalizes the existing robotics-only learning app (see `ARCHITECTURE.md`,
> `PROGRESS.md`) into a domain-agnostic Learning OS: given any project you don't
> yet have the knowledge for, it builds a syllabus, finds tools and free study
> material, compares marketplace prices, and keeps topic-scoped memory —
> across a Next.js dashboard and a Claude Code layer that share one core.
>
> Status: approved design, not yet implemented. Last updated: 2026-09-21.

---

## 1. High-level architecture

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│   Next.js App (dashboard)   │     │  Claude Code Layer (Phase 2)  │
│   - views, CRUD UI          │     │  - skills (syllabus, pricing, │
│   - checkpoint/DAG viz      │     │    free-material finder,      │
└──────────────┬───────────────┘     │    explode-concept)           │
               │  imports            │  - MCP server (tool exposure) │
               ▼                     │  - hooks (memory inject,      │
┌─────────────────────────────────────────────────┐  auto-checkpoint) │
│         @learning-os/core (shared TS package)     │◄──────┘imports
│  - entity models: Template, Course, Concept,      │
│    Project (DAG of checkpoints), Source           │
│  - CRUD + validation (incl. DAG cycle rejection)  │
│  - DAG resolver ("what's unblocked now")          │
│  - topic-memory lookup (question → entity context)│
│  - notes rollup (composition-graph aggregation)   │
│  - index rebuild (files → local DB)               │
└──────────────────────┬────────────────────────────┘
                        ▼
        ┌───────────────────────────────┐
        │ content/ (Markdown, source of  │
        │ truth) + local SQLite index    │
        │ (rebuildable, git-ignored)     │
        └───────────────┬────────────────┘
                        ▼ (lives inside)
              synced cloud-storage folder
              (iCloud Drive / Dropbox / etc.)
```

**Core decisions:**
- One shared, framework-free TypeScript package (`@learning-os/core`) holds all
  entity models, validation, and business logic. The Next.js app and the
  Claude Code layer (skills/MCP/hooks) both import it directly — no HTTP hop
  between them, no duplicated logic.
- Only `content/` (Markdown files) is durable state. The SQLite index is
  always rebuildable from the files, so backup is just "keep `content/`
  inside a synced folder" — nothing else needs special handling.
- No DB-engine migration is planned; "migration" here means moving to a new
  device or into the cloud, which the file-is-truth model already supports.

---

## 2. Entity model

Five entities, each stored as Markdown (frontmatter = structured fields, body
= free-form prose), indexed by the core package.

### Concept
Atomic, mastered-once unit. Domain-agnostic — no robotics-specific fields.
```yaml
id: kalman-filter
title: Kalman filter
status: not_started | learning | complete
review: false
prereqs: [gaussians, bayes-filter]
notes: [...]        # see §3
```
Lifecycle unchanged from the current app: `not_started → learning → complete`,
plus a `review` flag settable independently.

### Source
A study-material reference (video, article, paper, link, etc.). One Source
can cover multiple Concepts — it tags all of them, rather than each Concept
separately listing its sources.
```yaml
id: source-<slug>
type: video | article | paper | link | pdf | podcast | other
url: ...
title: ...
concepts: [kalman-filter, ekf, bayes-filter]   # ownership lives here
added: 2026-09-21
archived: false
notes: [...]
```
The core package derives the reverse view (Concept → its Sources) for
display; the tag list is only ever edited in one place. Sources are never
hard-deleted, only archived (see §5).

### Course
An ordered bundle of Concepts **and/or** nested Courses.
```yaml
id: course-<slug>
kind: external | authored
provider: youtube | coursera | ...   # only for kind: external
url: ...                             # only for kind: external
concepts: [concept-id, ...]
subcourses: [course-id, ...]         # a Course exploded out of one of this course's concepts
notes: [...]
```
A Course's completion % is derived from the status of its Concepts and
(recursively) its subcourses' Concepts.

### Template
The reusable "how to build a project like this" unit. References Courses
(as "the basics") and standalone Concepts, and accumulates experience across
every Project instantiated from it.
```yaml
id: template-<slug>
title: ...
courses: [course-id, ...]
concepts: [concept-id, ...]
lessons_learned: [{date, note}]
known_pitfalls: [{date, note}]
watch_for: [string]
```

### Project
Instantiated from a Template (or authored from scratch). Its roadmap is a
**dependency graph (DAG) of checkpoint builds**, not a flat ordered list.
```yaml
id: project-<slug>
title: ...
template: template-<slug>   # optional — may be authored standalone
status: in_progress | done | abandoned
checkpoints:
  - id: first-closed-loop
    title: First closed loop
    depends_on: [checkpoint-id, ...]
    courses: [course-id, ...]
    concepts: [concept-id, ...]
    status: not_started | building | done
notes: [...]
```
"What can I work on now" = every checkpoint whose `depends_on` entries are
all `done`. A `depends_on` edge that would create a cycle is rejected at
write time (§5).

### Global knowledge (singleton)
One record, instance-wide, structurally identical to a Template's experience
fields but not scoped to any single Template:
```yaml
# content/global-knowledge.md
lessons_learned: [{date, note}]
known_pitfalls: [{date, note}]
watch_for: [string]
```
Consulted alongside a Template's own fields whenever a Project is created or
a checkpoint fails.

**Relationships:** `Template --composes--> Course --composes--> Concept`,
`Course --nests--> Course` (via explosion, §4), `Source --tags--> Concept`,
`Project --instantiated_from--> Template`,
`Project.checkpoint --references--> Course | Concept`.

---

## 3. Notes (cross-cutting)

Attachable to Concept, Course, Project, and Source alike. One journal-style
entry can mix text and attachments freely — like a phone notes app, not a
typed list of single-purpose rows:
```yaml
notes:
  - id: n1
    date: 2026-09-21
    text: "realized the wind-up term..."      # optional
    attachments:                               # optional, 0+, mixed freely
      - {type: image, path: assets/n2.png}
      - {type: audio, path: assets/n3.m4a}
      - {type: link,  url: "https://..."}
```

**Rollup is computed, never stored twice.** A Course's notes view = its own
notes + each referenced Concept's notes (and each subcourse's, recursively),
labeled by source entity. A Project's notes view = its own + every
Course/Concept reachable from its checkpoints, recursively. One
`getAggregatedNotes(entityId)` function in the core package walks the
composition graph at query time.

**Token-consumption principle (applies everywhere context is assembled, not
just Notes):** never inject a full rollup by default. Injected context leads
with summaries, statuses, and IDs; full note bodies or full rollups are
fetched on demand via a tool call only when actually needed. This principle
governs §4's memory hook and the Template-search skill below.

---

## 4. Agent-side context assembly

### Memory-inject hook (gated, not blanket)
A cheap pre-check (keyword/title match against known Concept/Course/
Project/Template names — no LLM call) decides whether the current message
references an existing entity at all. Only on a match does it load context,
and even then it loads summaries + links first, not full note bodies — the
common case (a question unrelated to tracked entities) costs zero injected
tokens.

### Template-library search skill
A "librarian" decision: below a size threshold (e.g. ~15-20 templates), list
them all directly — cheap, no separate call needed. Above it, run a
filtered/full-text query against the index and return only top matches —
the whole library is never dumped into context once it's grown.

### Auto-checkpoint hook
Fires when a checkpoint's dependencies all become `done`, surfacing the
newly-unblocked checkpoints — "what can I work on now" stays visible without
being asked.

### Explode Concept (new action)
Every Concept has an "Explode Concept" action. Triggering it opens a prompt
for *why* the concept is hard to understand. The flow:
1. Takes the Concept's own content + the stated reason for confusion.
2. Passes both to the same LLM generation path used for syllabus drafting,
   producing a new Course that breaks the concept into finer-grained
   sub-concepts, targeted at that specific confusion.
3. Nests the new Course under the parent Course's `subcourses` — the
   structure grows a level deeper exactly where the user got stuck. The
   original Concept stays intact as the canonical record.

### Independent, steerable skill reruns
Every generation skill (syllabus draft, resource-finder, pricing, explode-
concept) accepts an optional free-text steering prompt and can be re-run
standalone against an existing entity — not only at creation time. E.g.
"refine this project's syllabus, weight it more toward simulation" re-invokes
the skill with the instruction appended to its base prompt, targeting that
entity rather than regenerating everything.

---

## 5. Data integrity & error handling

- Markdown files are the only durable state; the SQLite index is a cache.
  Any corruption or mismatch is fixed by a `rebuild-index` core function,
  never by hand-editing the DB.
- Write path: validate (core — e.g. `depends_on` must reference existing
  checkpoint IDs, no cycles) → write `.md` file → update index. If the file
  write fails, the index update never runs, so the DB can never drift ahead
  of the files.
- Checkpoint DAG cycle detection is mandatory at write time — the one
  integrity rule enforced hard, since a silent cycle would deadlock "what
  can I work on now."
- **Concept and Source content is never hard-deleted, only archived.** This
  is also the conflict-resolution mechanism: if cloud sync produces two
  versions of a Concept/Source (edited on two devices while offline), both
  are kept — the older is archived, not overwritten — so a conflict is
  reconciled by hand from the archive instead of silently losing content.
  `rebuild-index` tolerates and flags unexpected files (e.g. a provider's
  own "conflicted copy" filename) rather than crashing.

---

## 6. Providers

Three categories, all in scope (per user confirmation), routed through
skills rather than hard-coded into the core package:
- **LLM providers** — model choice per task (syllabus drafting, explosion,
  pricing summarization). Multi-provider routing (Ollama, OpenRouter) is
  explicitly deferred to Phase 3 — Phase 1/2 use a single fixed provider.
- **Content/knowledge providers** — YouTube, arXiv, MOOCs (Coursera/edX/
  freeCodeCamp), official docs — searched by the resource-finder skill.
- **Commerce/marketplace providers** — retailers/marketplaces scoped to the
  user's location, searched by the pricing skill.

### Pricing skill (detail)
For a checkpoint and for the whole project, returns: a rough total price to
complete it, links to every source/listing it priced from, and — where a
paid tool has a free alternative or workaround — that alternative listed
alongside with its downsides noted (e.g. "free tier caps exports at
10/day").

---

## 7. Data flow (example: starting a new project)

1. User: "start a new project — build a line-following robot" (in-app button
   or Claude Code skill; both call the same core function).
2. Core runs the Template-search logic (§4) → finds/suggests the closest
   Template, surfaces its `lessons_learned`/`known_pitfalls`/`watch_for`
   plus any matching entries from global knowledge.
3. **Syllabus skill** takes the Template's Courses/Concepts as a base, calls
   an LLM (with web search) to fill gaps specific to this project, drafts
   the checkpoint DAG.
4. **Resource-finder skill** looks up free study material per new Concept
   and creates draft Source entries, pre-tagged.
5. **Pricing skill** looks up any hardware/tool the syllabus calls for,
   attaches results (with links and free alternatives) to the relevant
   checkpoint as a note.
6. Core writes the new Project + Checkpoints + Courses + Concepts + Sources
   to `content/*.md`, rebuilds the local index.
7. User completes a checkpoint → the DAG resolver recomputes what's newly
   unblocked → the auto-checkpoint hook surfaces it.
8. On project completion or abandonment, the user is prompted to append a
   `lessons_learned`/`known_pitfalls` entry back onto the originating
   Template.

---

## 8. UI design direction

Two references, applied to different areas — both dark-first, consistent
with the app's existing locked direction:
- **[HTB Academy](https://academy.hackthebox.com/app/dashboard)** for
  resource-consolidation and course-listing views: dark navy background,
  high-contrast bordered cards, bold condensed headers, chip-style stat rows
  (module count, badges, price), gradient accent art on featured cards.
- **[learn2hack.today](https://learn2hack.today)** for anything AI-facing
  (syllabus/skill-generation screens specifically): near-black background,
  neon-magenta/cyan glow accents, thin-bordered dark panels, pill-shaped
  stage badges.

Split: **learning-content views → HTB style, AI-generation views →
learn2hack style.**

---

## 9. Testing

- **Core package:** unit tests per entity (CRUD, validation, DAG cycle
  rejection, DAG resolution correctness, notes rollup aggregation, index
  rebuild round-trips arbitrary Markdown → DB → Markdown without data loss).
- **App:** existing manual verification pattern continues (build + click
  through); add integration tests for the new DAG/checkpoint views.
- **Claude Code layer (Phase 2):** tested by hand initially — this is
  explicitly a "testing and comfort" phase, so formal coverage waits until
  the skills/hooks stabilize.

---

## 10. Phased implementation

- **Phase 1 — generalize the current build.** Strip robotics-specific
  fields out of the data model; implement the five-entity model (§2), notes
  + rollup (§3), the checkpoint DAG with cycle detection (§5), the
  Explode-Concept UI action (button + modal, manual "create a course here"
  stub — no LLM yet), and cloud-sync-folder backup. Single fixed LLM
  provider if any generation is needed at this stage.
- **Phase 2 — Claude Code layer.** Build the skills (syllabus draft,
  resource-finder, pricing, explode-concept generation), the MCP server
  exposing them, and the hooks (memory-inject, auto-checkpoint) — all
  importing `@learning-os/core` directly. Wire steerable reruns (§4). This
  is a "testing and comfort" phase: adjust or simplify entities as real
  usage reveals friction.
- **Phase 3 — multi-LLM routing.** Add Ollama and OpenRouter support so
  each skill can pick "the perfect LLM fit for the task" instead of a single
  fixed provider.
