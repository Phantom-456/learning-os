# Test case 2 — builder report

**Brief:** a system that visually understands what the user is doing, opens a
"tag" per task, tracks it to completion, and warns *before* the user leaves the
task's physical zone with the tag still open.

**Skill followed:** `learning-os/.claude/skills/syllabus-draft/SKILL.md`, plus
`resource-finder/SKILL.md` for the hard concepts.

**Calling mechanism:** the MCP server was not connected to this session, so the
same `lib/core/*` functions the MCP tools wrap were called directly from
`/Users/avishi/Workspace/learning-os/learning-os/scripts/tzt-seed.ts`, run with
`npx tsx`. The script is idempotent (skips ids that already exist) and left in
place so it can be re-read or re-run. A throwaway verification script was run
from `/tmp` and is not part of the repo.

---

## 1. Template check (skill step 1)

`content/templates/` **did not exist** and `content/global-knowledge.md` did not
exist. The library is empty, so there was no Template to seed from and no global
knowledge to merge. Proceeded to step 3 (web research). No concurrently-created
Template/Project from another agent was present at the time of the check; the
only pre-existing Project was `diffdrive-mobile-manipulator`, unrelated.

## 2. Project created

- **id:** `task-zone-tracker`
- **file:** `/Users/avishi/Workspace/learning-os/learning-os/content/projects/task-zone-tracker.md`
- **title:** Task Zone Tracker — visual open/close task tags with anticipatory zone-exit warnings
- **status:** `in_progress`, no `template`
- **metadata:** domain, framing, hardware, key_constraint
- 10 checkpoints, each with a `build` note and a `done_test` pass/fail criterion.

### Checkpoint DAG

```
cp-tag-model ──────────────────────────────┐
(no deps, no camera)                       │
                                           ▼
cp-capture ──┬─► cp-track ─► cp-zones ───► cp-runtime ─► cp-anticipate ─┐
(no deps)    │        │                     ▲    │                     │
             │        └──────┐              │    └──────────► cp-eval ◄┘
             └─► cp-recognition ─► cp-boundaries                │
                                                                ▼
                                                            cp-deploy
```

| checkpoint | depends_on |
|---|---|
| `cp-tag-model` | — |
| `cp-capture` | — |
| `cp-track` | `cp-capture` |
| `cp-zones` | `cp-track` |
| `cp-recognition` | `cp-capture` |
| `cp-boundaries` | `cp-recognition`, `cp-track` |
| `cp-runtime` | `cp-tag-model`, `cp-boundaries`, `cp-zones` |
| `cp-anticipate` | `cp-runtime` |
| `cp-eval` | `cp-runtime`, `cp-anticipate` |
| `cp-deploy` | `cp-eval` |

It is a real DAG, not a chain: two independent roots, a spatial branch and a
semantic branch that converge at `cp-runtime`, and one diamond
(`cp-runtime → {cp-anticipate, cp-eval}`, `cp-anticipate → cp-eval`). Edges were
added only where the dependency is genuine — e.g. `cp-recognition` depends on
`cp-capture` but *not* on `cp-track`, because recognising what someone is doing
does not require persistent track identity; `cp-boundaries` depends on both
because close-detection needs object identity. `unblockedCheckpoints()` correctly
returns `[cp-tag-model, cp-capture]`. `saveProject`'s cycle check passed.

The deliberate design choice worth flagging: `cp-tag-model` is a root that needs
**no camera at all** — the statechart, the monitors and the replay harness are
built and tested against synthetic event traces first, so the hard modelling work
is unblocked from hardware and the perception stack is later built to hit a
target that already exists.

## 3. Concepts created (23 new, `tzt-` prefixed)

All have substantive bodies (roughly 2,500–5,400 characters each, with "why it
exists", mechanism, implementation detail, and a "watch for" section) — no stubs.

**Task tag model** — `tzt-task-tag-model`, `tzt-task-state-machine`,
`tzt-tag-wellformedness-monitor`, `tzt-event-stream-design`

**Perception infrastructure** — `tzt-video-capture-pipeline`, `tzt-on-device-privacy`

**Spatial perception** — `tzt-object-detection-tracking`,
`tzt-ground-plane-homography`, `tzt-zone-polygon-occupancy`

**Activity recognition** — `tzt-video-representation-clip`,
`tzt-open-vocab-action-recognition`, `tzt-few-shot-task-enrollment`,
`tzt-temporal-action-segmentation`, `tzt-online-action-start-detection`,
`tzt-completion-evidence-state-change`

**Tag runtime** — `tzt-detection-to-event-debouncing`

**Anticipatory alerting** — `tzt-anticipatory-zone-exit`,
`tzt-time-to-boundary-prediction`, `tzt-alert-policy-thresholds`

**Evaluation & deployment** — `tzt-personal-dataset-annotation`,
`tzt-evaluation-metrics-tagging`, `tzt-realtime-edge-deployment`,
`tzt-alert-delivery-ux`

**Reused existing concepts** (per skill step 5, searched before creating):
`kalman-filter`, `bayes-filter`, `noise-uncertainty`, `sensor-fusion`,
`transforms`. These already existed from the robotics project and are genuinely
domain-agnostic; no duplicates were created for them. No `tzt-` id collides with
anything pre-existing.

### How the two hard/novel requirements are addressed specifically

**(a) The open/close tag state machine.** Four concepts carry it.
`tzt-task-tag-model` takes the HTML framing seriously as a formalism (opening
tag, attributes, closing tag, open-element list, well-formedness, void elements)
and then spends most of its length on the five places it *breaks* — real tasks
interleave rather than nest, so the open set must be an id-keyed map and not a
stack; tags are probabilistic rather than parsed; the element vocabulary is open
so task names need canonicalisation; closes must be *matched* to an instance, not
just typed; and documents end but days do not.
`tzt-task-state-machine` gives the actual per-instance statechart
(PROVISIONAL → OPEN → {AT_RISK, OVERDUE, CLOSING} → CLOSED/ABANDONED) as an ASCII
diagram, argues each state's existence, and notes that AT_RISK (spatial) and
OVERDUE (temporal) must be *parallel regions*, not mutually exclusive states.
`tzt-tag-wellformedness-monitor` frames the whole thing as runtime verification
and makes the key move explicit: "every open tag is eventually closed" is a
liveness property and is therefore *unmonitorable*, so it must be converted into
four bounded safety properties (given in temporal-logic form) before the system
can ever alert.

**(b) Anticipatory zone exit.** `tzt-anticipatory-zone-exit` opens by stating
the distinction structurally — reactive is `inside(p_t, Z)`, anticipatory is
`P(exit(Z) within τ | history)`, with different inputs, outputs, metrics and
failure modes — then gives three mechanisms in build order (inset buffer polygon;
Kalman dead-reckoned time-to-boundary; learned intent), the arming rule (only
while a bound tag is open), the reversibility argument (warn early *internally*,
hold the notification for a confirmation window, cancel silently on return), and
an evaluation section that explicitly forbids accuracy in favour of lead-time
distribution, false alarms per open-task-hour and miss rate. Its "watch for"
names the exact failure mode this test was probing: *silently degrading to
reactive exit detection because it scores better on any accuracy-shaped metric* —
with the check being "do your alert timestamps precede your crossing timestamps
on real data". `tzt-time-to-boundary-prediction` supplies the estimator
(constant-velocity Kalman on the floor plane, ray/polygon intersection,
Monte-Carlo `P(exit within τ)`), and `tzt-alert-policy-thresholds` the
interruption budget.

## 4. Sources created (16, all verified live with WebFetch)

Every URL below was fetched and the content confirmed to be on-topic and freely
readable before attaching. Each Source body says why it is worth the time, not
just what it is.

**Task state machine / tag model / monitor** (the hard concept #1)
- `source-statecharts-dev` — statecharts.dev (link)
- `source-stately-state-machines` — Stately/XState docs (article)
- `source-runtime-verification-wikipedia` — Runtime verification, Wikipedia (article)
- `source-monitor-runtime-assurance` — arXiv 1908.03284, Abate/Feron/Coogan (paper)

**Zone / proximity / anticipatory** (the hard concept #2)
- `source-android-geofencing` — Android geofencing docs, ENTER/EXIT/DWELL + loitering delay (article)
- `source-supervision-polygonzone` — Roboflow supervision PolygonZone (link)
- `source-ultralytics-region-counting` — Ultralytics region counting (article)
- `source-predictive-geofence-patent` — US8531293B2 "Predictive geofence crossing" (link)
- `source-elementary-kalman` — arXiv 1710.04055 (paper)

**Recognition / segmentation**
- `source-opening-vocabulary-egocentric` — arXiv 2308.11488, NeurIPS 2023 (paper)
- `source-onlinetas` — arXiv 2411.01122, NeurIPS 2024 (paper)
- `source-odas` — arXiv 1802.06822 (paper)
- `source-egocentric-vision-survey` — arXiv 2503.15275 (paper)
- `source-ego4d` — ego4d-data.org (link)
- `source-supervision-detect-annotate` — Roboflow supervision (article)

**Rejected for lack of verification** (per the "don't fabricate" rule): the
OpenCV homography tutorial (`docs.opencv.org/4.x/d9/dab/tutorial_homography.html`)
and the LearnOpenCV homography article both returned **HTTP 403** to WebFetch, and
the Eshel & Moses CVPR'08 multi-camera homography PDF and the NeurIPS PDF of the
open-vocabulary paper came back as unparseable binary. None were attached. That
leaves `tzt-ground-plane-homography` with **no attached Sources** — an honest gap,
not an oversight. (The open-vocabulary paper was recovered via its arXiv abstract
page, which did verify.)

---

## 5. Honest notes on the skill, the tools, and what I improvised

These are the points where the system was underspecified or where I went past
what it supports. Offered as evaluation signal.

**Skill / process gaps**

1. **Step 1 assumes `list_templates` exists and returns something sane on an
   empty library.** There was no `content/templates/` directory at all. The
   underlying `getAllTemplates()` handles this (it lists an empty dir), but a
   fresh install's "there is nothing yet" path is never described by the skill,
   and `get_global_knowledge` (step 2) has the same issue. Minor, but it is the
   first thing every new user hits.

2. **The skill never mentions Sources.** `syllabus-draft` produces Concepts and a
   Project and stops. `resource-finder` is a separate skill whose description says
   it can run "as part of drafting a new project's syllabus", but `syllabus-draft`
   contains no step that invokes it. I only ran resource-finder because this
   brief told me to. **Recommendation:** add an explicit step 6.5 to
   `syllabus-draft` ("for the 2-3 hardest concepts, run resource-finder"), or the
   two skills will drift apart in practice and most drafted syllabi will ship with
   zero attached material.

3. **Nothing tells you how to pick concept `parent` values.** `createConcept`
   *requires* `parent` (it is in the required-fields type), but neither the skill
   nor the spec's §2 Concept schema mentions it — §2 lists only
   id/title/status/review/prereqs/notes. I invented seven parent categories
   ("Task tag model", "Perception infrastructure", "Spatial perception",
   "Activity recognition", "Tag runtime", "Anticipatory alerting",
   "Evaluation & deployment"). They are consistent within this project but there
   is no cross-project convention, no vocabulary, and no guidance on whether
   `parent` is a display grouping or something more. Same for `order` — I used
   sparse decades per group, arbitrarily.

4. **No guidance on how substantive a concept `body` should be.** The skill says
   "create new ones via `create_concept`" and stops. The existing robotics
   concepts in the library are *templates* — they contain a "run this concept
   through the §2 template (STUDY-PLAN.md)" instruction and empty slots, i.e. the
   body is a prompt for the learner to fill in. My bodies are the opposite: fully
   written explanatory content. **These are two different content conventions
   living in the same directory**, and nothing in the skill or spec says which is
   intended. I went with substantive prose because this brief asked for it, but a
   reviewer should know the library is now inconsistent, and that this is a real
   unresolved design question rather than my deviation.

5. **`Checkpoint.build` and `Checkpoint.done_test` are not in the spec.** They
   exist in `lib/core/types.ts` (`build?: string`, `done_test?: string`) but §2's
   Project schema does not list them and the skill never mentions them. I used
   both heavily — they are where the "what do I actually do" and "how do I know
   it worked" content lives, and without them a checkpoint is just a title and a
   concept list. Worth promoting into the spec and into the skill's step 4.

6. **Step 7 ("present the drafted checkpoint list to the user") is impossible for
   a subagent.** I have no user channel; the parent agent relays. Not a defect,
   but the skill is written assuming an interactive session and says nothing about
   how a non-interactive invocation should terminate.

7. **No Courses were created.** `Checkpoint.courses` exists and the Template
   entity is built around Courses, but the skill's step 5 only talks about
   Concepts, and nothing in the brief needed a course bundle. Every checkpoint has
   `courses: []`. If Courses are meant to be the normal unit of bundling, the
   syllabus-draft skill does not currently produce them — a noticeable hole
   relative to the spec's entity model.

8. **No Template was created from this Project.** The skill's Notes say to feed
   lessons back into a Template *if you drew from one*, but says nothing about
   creating a Template when you did not. So this project's structure — which is
   exactly the sort of reusable "how to build a perception system with a state
   machine on top" blueprint the Template entity exists for — is not captured
   anywhere reusable. The library will stay empty forever if syllabus-draft never
   writes back.

**Tool / data-layer notes**

9. `createConcept`'s `prereqs` are not validated against existing concept ids.
   I wired concept-level prereqs (e.g. `tzt-ground-plane-homography` requires
   `transforms`) and verified by hand that every referenced id exists, but nothing
   would have stopped me writing a typo. `saveProject` *does* validate the
   checkpoint DAG for cycles (it threw nothing here), and checkpoint→concept
   references are likewise unvalidated — I added both checks manually in the seed
   script.

10. The cycle check in `saveProject` is correct but its error message names only
    the offending checkpoint, not the cycle. Fine at 10 checkpoints; annoying at 30.

11. `createSource` has no URL liveness check, by design — verification is the
    skill's job (resource-finder step 2), and it worked, but it means an agent
    that skips the WebFetch step produces indistinguishable-looking output. There
    is no field recording *that* a URL was verified or when. Given that
    resource-finder's whole value proposition is "currently-live and free", a
    `verified: <date>` field on Source seems like it should exist.

**Content self-criticism**

12. The `tzt-` prefix is defensive against the stated collision risk, but it makes
    genuinely reusable concepts (`tzt-object-detection-tracking`,
    `tzt-video-capture-pipeline`, `tzt-ground-plane-homography`) look
    project-specific. A future project that needs "object tracking" will probably
    create a duplicate rather than reuse a `tzt-`-prefixed one. The prefix
    convention and the reuse goal in skill step 5 are in tension, and the skill
    gives no naming guidance at all.

13. I did **not** find prior art for the specific combination this brief asks for
    (open-vocabulary task detection + explicit open/close instance state machine +
    predictive indoor zone-exit warning). The four literatures are each real and
    well-populated, and each source above is genuinely on-topic for its concept,
    but the *integration* — especially the runtime-verification framing of task
    completion, and coupling the anticipatory geofence to an open tag's bound zone
    — is synthesis from adjacent fields rather than something I found published.
    That synthesis is my own judgement and should be read as such; it is the part
    of the syllabus most likely to be wrong in its details.
