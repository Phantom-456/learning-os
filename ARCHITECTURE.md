# Version 2 — Learning OS Architecture (the two-axis model)

> A personal robotics/control-science learning OS. Two axes that cross:
> **Concepts** (theory you master once) and **Projects** (robots you build). A concept is a
> single shared Markdown file; projects *reference* concepts, never copy them. Completing a
> concept once turns it green everywhere.
>
> Companion to `STUDY-PLAN.md`. Last updated: 2026-09-14.

---

## 1. The two axes

```
CONCEPTS  (learned once, shared)            PROJECTS  (robots, add as many as you want)
──────────────────────────────             ──────────────────────────────────────────
Parent header: "Classical control"          Project: "Diff-drive → mobile manipulator"
  • Feedback & PID         ✓ complete          Roadmap (ordered milestones):
  • Steady-state error     ✓ complete            1. Author robot body   → refs [USD/articulation]
  • Integrator wind-up     ⟳ review              2. Kinematics & odometry → refs [frames, diff-drive]
Parent header: "State estimation"              3. First closed loop     → refs [PID, wind-up]  ✓
  • Kalman filter          ✓ complete            4. LQR control           → refs [LQR, observers]
  • EKF                    ○ learning            5. Estimation on robot   → refs [Kalman, EKF]
                                                  ...
```

- A **Concept** is the canonical theory + *your* notes, in one `.md` file. It lives in the
  Concept axis and is referenced by any project that needs it.
- A **Project** is a robot. Its **Roadmap** is an ordered list of milestones; each milestone
  **references** one or more concepts (a "reconnect", not a copy) and adds robot-specific
  application notes, the sim build, and its milestone video.
- Master a concept once → it shows a **green tick** in every roadmap that references it.
  Already complete = skip it (revise only if you want). In `review` = flagged for another pass.

---

## 2. Concept (the shared unit)

One editable Markdown file per concept. Prose lives in the file body; structure/status lives
in YAML frontmatter so both views can query it.

```markdown
---
id: kalman-filter
title: Kalman filter
parent: State estimation        # the parent header it groups under
order: 1                        # position within that header (learning order)
status: complete                # not_started | learning | complete
review: false                   # true when flagged by a quiz or manually
prereqs: [gaussians, bayes-filter, state-space]
my_video: https://youtu.be/...  # "my video, my understanding" (the Short)
links:
  - { label: "Kalman on paper", url: "..." }
template_done: [why, intuition, definition, derivation, worked_example, self_test]
---

# Kalman filter
(your notes, worked example, derivation — free-form; cleaned into readable markdown later)
```

- **Concept view** = parent headers, each expanding to its topics **in learning order**, each
  row showing the status tick + a `review` badge when flagged.
- The §2 template from `STUDY-PLAN.md` is the (optional) checklist behind each concept; you
  capture free-form, then "make readable" organizes the dump into it.

---

## 3. Project (a robot) + its Roadmap

```markdown
---
id: diffdrive-mobile-manipulator
title: Diff-drive → mobile manipulator
robot: differential_drive+arm
status: in_progress
definition_of_done: "robot runs end-to-end AND every milestone has a published video"
---
```

Each **roadmap milestone**:

```markdown
- id: first-closed-loop
  title: First closed loop — heading control
  concepts: [feedback-pid, steady-state-error, integrator-windup]   # references (shared)
  app_notes: notes/diffdrive/first-closed-loop.md   # robot-specific application, your words
  build: "PID heading node in ROS2, robot drives a target path in Isaac Sim"
  video: https://youtu.be/...        # the milestone (long) video
  status: not_started | building | done
```

- A milestone shows each referenced concept with its **current tick** (green if you already
  mastered it elsewhere). If a concept is in `review`, the milestone surfaces that so you know
  to revisit before relying on it.
- **Definition of done (project):** the robot runs end-to-end **and** every milestone has a
  published video. The ordered milestone videos *are* the "build this robot from scratch" course.

---

## 4. Status model & the review loop

**Concept lifecycle:** `not_started → learning → complete`  (complete = green tick ✓).
Overlay flag **`review`** (a quiz result or a manual "mark for review" sets it true). From a
reviewing concept you either clear it back to `complete` or leave it flagged as *needs another
review*. The flag is separate from the lifecycle so a `complete` concept can still be pulled
back for a pass without losing its history.

**Milestone lifecycle:** `not_started → building → done`. `done` requires its concepts
`complete`, the sim build working, and the video published.

**Coverage memory:** `complete`/`taught` is stored on the concept (a fact about *you*), so it
silences that topic across every project at once — nothing is ever repeated.

---

## 5. Editability (everything, with an undo)

Full CRUD + drag-reorder on:
- the **concept list** and its **parent headers** (rename, re-order, move a topic between headers),
- the **project list**,
- each **roadmap** (add/remove/reorder milestones; change which concepts a milestone references).

Deletes are **soft** (recoverable) so a mistake is never fatal. Editing a concept edits the one
shared file — every project that references it sees the update.

---

## 6. Content pipeline (where videos come from)

**Videos are flexible.** A video is just a video — any node (a concept *or* a milestone) can
carry one or more videos, each tagged `short` or `long`, decided per video. "Concept → Short,
milestone → long" are only sensible defaults: a small concept worth a deep dive can get a long
video, and a milestone can be a Short if that's all it warrants.

1. Study a concept → capture free-form notes + links in its `.md`.
2. "Make readable" → cleans the dump into structured markdown (the §2 template).
3. Generate **2–3 hook options** + a **rough Short structure** (concept) or **video structure**
   (milestone) from the readable notes.
4. You record → paste the URL back onto the concept (`my_video`) or milestone (`video`).
5. Status advances; the concept goes green everywhere.

---

## 7. Storage shape (implementation note, not building yet)

- **Source of truth = Markdown files** (portable, editable, yours): `concepts/<id>.md` and
  `notes/<project>/<milestone>.md`.
- **Index = a small DB** (SQLite, as in v1) mirroring frontmatter for fast queries, the two
  views, ordering, references, and status — rebuildable from the files at any time.
- Projects/roadmaps as `projects/<id>.md` (or a manifest). Everything stays human-editable on
  disk; the app is a nice window onto it.

---

## Open confirmations before I draft the concrete roadmap
1. **Status names** above ok (`not_started / learning / complete` + `review` flag)?
2. **Videos attach in two places** — concept → its Short, milestone → its long video. Correct?
3. Next artifact: the **diff-drive → mobile-manipulator roadmap as an explicit milestone list**
   (each with its concept references, its "done" test, and its video slot). Shall I write that?
