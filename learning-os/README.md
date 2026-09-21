# YTS Learning OS (version 2)

A local, single-user **window onto Markdown files** for learning robotics & control science —
one robot built from zero in simulation, taught as you go. Next.js + a rebuildable `node:sqlite`
index over the files. **The Markdown files are the source of truth**; the database only mirrors
their frontmatter for fast views and is rebuilt from the files on every write.

## One-click launch (macOS)

Double-click **`launcher/Learning OS.app`** (or the **`launcher/run.command`** fallback). On first
run it installs dependencies, builds, then starts the server and opens the
browser. It **won't start a second server** if one is already running, and closing the Terminal
window stops the server. The app runs at <http://localhost:3210>.

## Manual use

```bash
npm install
npm run dev       # or: npm run build && npm run start
```

## The two axes

- **Concepts** (`content/concepts/<id>.md`) — shared theory, grouped by parent header in learning
  order. Lifecycle `not_started → learning → complete`, plus a separate `review` flag. Master a
  concept once and it shows green in **every** project that references it.
- **Projects** (`content/projects/<id>.md`) — a robot + an ordered **roadmap** of milestones. Each
  milestone *references* concept ids (never copies them), adds the sim build step, a pass/fail done
  test, and video slots.

Everything is add / edit / remove / reorder, with soft-delete (a `deleted` flag; recoverable).

## Content pipeline

Capture free-form notes on a concept → **Make readable** organizes them into the §2 template →
**Hooks / Structure** generates 2–3 hook options and a rough Short/long structure → paste the video
URL back onto the concept or milestone. Providers are **pluggable**: with no API key a local,
offline provider is used; an LLM provider can be slotted in behind the same interface later.

## Layout

```
content/            # SOURCE OF TRUTH (Markdown + YAML frontmatter)
  concepts/<id>.md
  projects/<id>.md
  notes/<project>/<milestone>.md
lib/                # content (file CRUD), db (node:sqlite index), status, pipeline, types
app/                # Next.js App Router — pages + /api routes
components/          # ConceptView, ConceptDetail, ProjectList, RoadmapView (client)
launcher/           # macOS .app + run.command
```

To point the app at a different content folder, set `YTS_CONTENT_DIR`.
