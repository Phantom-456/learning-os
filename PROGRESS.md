# Version 2 — Progress & Resume Rules

> **READ THIS FIRST in any new conversation about version 2.** It exists so no progress is lost
> between chats. If you are Claude resuming this project, follow the rules below before doing
> anything else.
>
> Last updated: 2026-09-14.

## How to resume (rules for a new conversation)
1. **Read, in order:** `STUDY-PLAN.md`, `ARCHITECTURE.md`, **this file**, and any `ROADMAP-*.md`.
   Then continue from "NEXT" below.
2. **version 1 (Simio) is FROZEN.** Never edit it. This project is version 2 only.
3. The **Locked decisions** below are settled — build on them, don't re-litigate them.
4. When you finish a piece of work, **append a dated line to the Changelog** at the bottom so the
   next session stays current. This file is the single source of "where we are".
5. Content is **Markdown files** (source of truth); a **SQLite index** mirrors them. Concepts are
   **shared and referenced, never copied**.

## Where we are (state)
- ✅ Strategy + syllabus — `STUDY-PLAN.md`
- ✅ App architecture (two-axis model) — `ARCHITECTURE.md`
- ✅ This continuity system (+ a persistent memory note that points new sessions here)
- ✅ **Roadmap** — `ROADMAP-diffdrive.md` (12 ordered milestones M0–M11; each with referenced
  concept ids, a pass/fail done test, the Isaac Sim / ROS 2 build step, and video slots).
- ✅ **App scaffolded, built, and verified end-to-end** — `version 2/learning-os/` (Next.js 15 +
  `node:sqlite` index over the `.md` files). Two views (Concept, Project/Roadmap), full CRUD +
  reorder + soft-delete, status/review model, flexible videos, pluggable content pipeline
  (offline by default), **dark-first** UI, and a **one-click macOS launcher** (`.app` + `.command`).
- ✅ **Seeded** from STUDY-PLAN (58 concepts in 12 parent headers) + ROADMAP (diff-drive project,
  12 milestones), structure-only bodies (empty §2 template).
- ⏭ **NEXT:** start studying Milestone 0 (fill concept notes → statuses go green → attach videos).
  Optional app polish: light-mode toggle, drag-reorder, spaced-repetition review surface, an LLM
  provider for the pipeline when API keys arrive, a "show deleted / undo" panel.

## The app (how to run it)
- Location: `version 2/learning-os/`. One-click: double-click `launcher/Learning OS.app` (or
  `launcher/run.command`). Manual: `npm install && npm run seed && npm run dev`. Runs at
  `http://localhost:3210` (launcher) / `:3000` (dev).
- Source of truth = `content/{concepts,projects,notes}/*.md`. The SQLite index is in-memory and
  rebuilt from the files on every write (`npm run seed --force` re-seeds; deleting `content/` +
  re-seeding is safe).

## Locked decisions (do not re-open)
- **Purpose:** a personal robotics + control-science **learning OS**; teach-as-you-learn; build
  **one robot from zero in simulation**. Studying is the priority; money is a slow bonus that can
  live in a different project.
- **Two axes:** **Concepts** (shared `.md`, mastered once, green everywhere) × **Projects**
  (robots with editable roadmaps that *reference* concepts). Two views: Concept view, Project view.
- **First project:** differential-drive mobile robot → grows into a **mobile manipulator**. More
  robots can be added; ~80% of concepts are shared/reused.
- **Learning toolchain:** Isaac Sim 5.1 (Windows) + ROS 2 Jazzy (WSL2 / RoboStack). Author your own
  URDF/USD (no downloaded robot packs); reimplement core math, then check against libraries.
- **Cadence:** ~6–10 hrs/week; applied / build-first; math built from a lower base.
- **Concept status:** `not_started → learning → complete` (green tick), plus a **`review`** flag
  (set by a quiz or manually) → clear back to `complete` or leave as "needs another review".
- **Videos are flexible:** any node (concept or milestone) can carry one or more videos, each
  `short` or `long`, decided per video (concept→Short / milestone→long are defaults only).
- **Editability:** everything (concepts, headers, projects, roadmaps) is add/edit/remove/reorder,
  with **soft-delete / undo**.
- **Dark mode:** the whole site supports a **site-wide dark theme (dark-first)**. This resolves the
  earlier light-vs-dark reference mismatch — the dashboards get a dark treatment too; a light
  toggle can be added later.
- **One-click launcher:** version 2 ships with a **double-clickable macOS launcher** (a `.app`
  bundle, with a `.command` fallback) that starts the local server (running `npm install` on first
  run), waits until it's up, and opens the site in the browser — then stops the server on quit.
  Goal: open the whole thing with a single click, no terminal.
- **Definition of done (project):** the robot runs end-to-end **and** every milestone has a
  published video. The ordered milestone videos *are* the "build this robot from scratch" course.
- **Side stream:** a separate, fully-automated **daily robotics/AI news Shorts** channel (reuses
  Simio's pipeline), isolated so it never competes with studying. Not the profit fund.

## Design direction (transcribed from reference UIs, so it survives into new chats)
**Whole site: dark-first** (per the "dark mode for the whole site" request). The light reference
below is a *layout* reference — re-skin it in the dark palette.

**Concept & Project dashboards — card list** (layout from the "Events" reference):
- Rounded cards, generous spacing, a bold serif title.
- Each row: a **colored chip on the left** (status/category color — used as a dark-friendly accent:
  lavender / pink / red / green), the title, a muted one-line description, and a **right-aligned
  action** ("＋ Open / Add") that becomes a **solid high-contrast button** on the active/hovered row.

**Roadmap view — two columns** (from the "Roadmap" reference, already dark):
- **Left:** a vertical **accordion of Phases** (= modules) — "Phase N" label + title + a ＋ expander;
  the active phase highlighted.
- **Right:** a **numbered vertical timeline** with a colored dot per phase (orange / yellow / blue /
  green) and bulleted milestones under each number.

## Changelog
- **2026-09-14 (later)** — Wrote `ROADMAP-diffdrive.md` (12 milestones M0–M11, approved:
  keep all 12, make lists/roadmaps editable rather than pre-splitting). Built the version 2 app in
  `version 2/learning-os/`: Next.js 15 + `node:sqlite` in-memory index over the Markdown files
  (files = source of truth, index rebuilt on every write). Concept view (card list grouped by
  parent header, status ticks + review flag) and Project/Roadmap view (two-column: phase accordion
  + numbered timeline; milestones reference shared concepts and show their green status). Full
  add/edit/remove/reorder + soft-delete; flexible videos (short/long, any node); content pipeline
  with a pluggable provider (offline `LocalProvider` by default, no keys needed). Dark-first UI.
  One-click macOS launcher (`.app` + `run.command`) that installs/seeds/builds on first run, starts
  the server, waits, opens the browser, stops on quit, and never double-starts. Seeded 58 concepts
  + the diff-drive project (12 milestones), structure-only. `npm run build` green; verified
  end-to-end (pages 200, index reads seed, status mutation writes back to the `.md` file, launcher
  reuse-guard confirmed). Next: study Milestone 0.
- **2026-09-14** — Froze Simio (v1). Pivoted to version 2 (robotics learning OS). Wrote
  `STUDY-PLAN.md`, `ARCHITECTURE.md`, and this file. Locked the two-axis model, the flexible-video
  rule, the status/review model, the UI direction, and **dark mode site-wide** (resolving the theme
  mismatch, dark-first). Added a persistent memory note pointing new sessions here. **Next:** the
  concrete diff-drive → mobile-manipulator roadmap.
