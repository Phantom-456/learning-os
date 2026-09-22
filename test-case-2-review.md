# Independent review — `task-zone-tracker` syllabus

**Reviewer stance:** detached evaluator. I did not read the builder's self-report. Everything below is from the raw content files plus live source fetches.

**Score: 5 / 5**

One-sentence justification: the checkpoint DAG is genuinely branched rather than a disguised line, every project-specific concept file is substantive and non-generic, and the two hardest parts of the brief — the per-instance open/close state machine and the *anticipatory* (pre-exit) zone warning — are each given a dedicated concept with a concrete, buildable implementation recipe, a falsifiable done-test, and a live, on-topic free source; the real defects (five empty prerequisite stubs, no named model checkpoint for recognition) degrade the middle of the roadmap but do not block a learner from reaching the first meaningful checkpoint unaided.

---

## 1. What I actually read

**Project file (in full)**
- `/Users/avishi/Workspace/learning-os/learning-os/content/projects/task-zone-tracker.md`

**Concept files read in full**
`tzt-task-tag-model`, `tzt-task-state-machine`, `tzt-tag-wellformedness-monitor`, `tzt-event-stream-design`, `tzt-video-capture-pipeline`, `tzt-ground-plane-homography`, `tzt-zone-polygon-occupancy`, `tzt-video-representation-clip`, `tzt-open-vocab-action-recognition`, `tzt-few-shot-task-enrollment`, `tzt-completion-evidence-state-change`, `tzt-detection-to-event-debouncing`, `tzt-time-to-boundary-prediction`, `tzt-anticipatory-zone-exit`, `tzt-alert-policy-thresholds`, `tzt-evaluation-metrics-tagging`, `tzt-realtime-edge-deployment`.

**Concept files inspected for substance (headers + TODO scan)**
All 23 `tzt-*` concepts: zero contain `_TODO_` placeholders.
Reused library concepts `kalman-filter`, `bayes-filter`, `sensor-fusion`, `noise-uncertainty`, `transforms`: **all five are pure template stubs — 12 `_TODO_` markers each, no body content.**

**Source files read**
All 15 sources tagging a `tzt-*` concept.

**Sources actually fetched and verified live (6 of 15):**

| URL | Verdict |
|---|---|
| `https://patents.google.com/patent/US8531293B2/en` | Real, live. Title *"Predictive geofence crossing"*, granted 2013. Confirms dead-reckoning from speed/heading, predicted future position, and alert when predicted time-to-crossing drops below a set threshold. Exactly what the concept claims. |
| `https://arxiv.org/abs/1802.06822` | Real, live. *Online Detection of Action Start in Untrimmed, Streaming Videos*, ECCV'18, motivated by early alerting. Matches the source note. |
| `https://developer.android.com/develop/sensors-and-location/location/geofencing` | Real, live. Documents `GEOFENCE_TRANSITION_ENTER/EXIT/DWELL`, `setLoiteringDelay`, `setNotificationResponsiveness`, and explicitly recommends DWELL over ENTER to reduce alert spam — precisely the claim made in `tzt-zone-polygon-occupancy`. |
| `https://supervision.roboflow.com/latest/detection/tools/polygon_zone/` | Real, live. Documents `PolygonZone` with `triggering_anchors`, default `Position.BOTTOM_CENTER`, and `require_all_anchors`. The anchor-point detail the source note singles out is genuinely there. |
| `https://arxiv.org/abs/1908.03284` | Real, live. Abate/Feron/Coogan, *Monitor-Based Runtime Assurance for Temporal Logic Specifications*. FSM monitor searching for **bad prefixes** of an LTL safety property and raising a fault flag before the bad state — the exact bridge the source note claims to the anticipatory warning. |
| `https://statecharts.dev/` | Real, live, free, no login. Covers parallel/orthogonal states, guards, entry/exit actions. |

Six for six: real, live, freely accessible, and the attached prose accurately describes the content rather than plausibly guessing at it. The source notes are not padding — e.g. the Android geofencing note's claim about *why* DWELL exists is verifiably the documentation's own stated rationale.

---

## 2. Is the checkpoint DAG real?

Real, and non-trivially so. Edges:

```
cp-tag-model (root, no hardware) ─────────────┐
cp-capture (root, the rig) ──┬── cp-track ── cp-zones ──┤
                             └── cp-recognition ── cp-boundaries ──┤
                                                     cp-runtime ◄──┘
                                                         │
                                                    cp-anticipate
                                                         │
                                        cp-eval ◄── (runtime + anticipate)
                                                         │
                                                     cp-deploy
```

This is a genuine diamond, not a line:
- **Two independent roots.** `cp-tag-model` has `depends_on: []` and explicitly requires no camera — the hardest modelling work is deliberately unblocked from hardware procurement.
- **`cp-recognition` depends on `cp-capture` only, not on `cp-track`.** That is a correct prerequisite judgement: clip-level action recognition needs frames, not tracks. A fake DAG would have chained it to `cp-track`.
- **A real convergence.** `cp-runtime` genuinely requires all three of `cp-tag-model` (the statechart), `cp-boundaries` (open/close signals) and `cp-zones` (the zone binding) — you cannot build it with any one missing.
- `cp-eval` fanning in from both `cp-runtime` and `cp-anticipate` is correct: the metric table covers both tag correctness and lead time.

Each checkpoint carries a `build` and a **falsifiable** `done_test` with numbers, not vibes ("Held-out floor points map within ~15 cm of tape-measure truth"; "alert timestamps PRECEDE crossing timestamps, with a reported median and 10th-percentile lead time"; "Killing and restarting the process loses no open tags").

---

## 3. The two hard requirements

### (a) Open/close task-instance state machine — **concretely addressed**

`tzt-task-state-machine` (104 lines) is not an abstract restatement. It gives:

- An **ASCII statechart** with named states: `PROVISIONAL → OPEN → {AT_RISK, CLOSING, OVERDUE} → {CLOSED, ABANDONED}`, with the triggering condition on each edge (`confidence > θ_open`, `close-evidence > θ_close`, evidence decay, timeout policy).
- A justification for why each state earns its place — `PROVISIONAL` absorbs recogniser flicker, `CLOSING` mirrors it on the close side so an occlusion cannot close a running task, `CLOSED ≠ ABANDONED` because abandoned-rate is the headline quality metric.
- A specific, non-obvious design call: `AT_RISK` (spatial) and `OVERDUE` (temporal) can hold **simultaneously**, so they belong in **two parallel Harel regions** (`presence` and `progress`), not one flattened enum. This is the kind of thing that only appears if someone actually thought about the machine.
- A concrete implementation shape: `reduce(state, event) -> state`, pure, with time delivered as a `TICK` event, guards as data rather than if-statements, side effects in `onEntry(AT_RISK)`, snooze as a timed state, persist-and-replay for restart survival.

`tzt-task-tag-model` supplies the data model and — importantly — is precise about **where the HTML analogy breaks**: real tasks interleave, so the open set is an **ID-keyed map, not a LIFO stack** ("implementing the open-element list as an actual stack is the first bug you will write"); tags are inferred probabilistically; the vocabulary is open so names need canonicalisation; closes must be **matched to an instance** by zone + tracked object identity, not by tag name.

`tzt-tag-wellformedness-monitor` adds the layer above, with the single sharpest insight in the whole syllabus: "every open tag is eventually closed" is a **liveness** property and therefore *unmonitorable*, so it must be converted into bounded **safety** surrogates. It then writes out four of them in temporal logic (`G(open(t) -> F[0,D_t] close(t))`, zone-coupled safety, matched-close in past-time LTL, no-duplicate-open) and tells you to hand-compile each into a 2–4 state automaton rather than pulling in an LTL toolchain. Verdicts must be three-valued (`true`/`false`/`unknown`) so a camera outage never renders as "ok".

A learner with ordinary technical background could build all of this in a weekend from this text alone, with no camera and no LLM.

### (b) Anticipatory zone-exit prediction — **concretely addressed**

`tzt-anticipatory-zone-exit` opens by naming the trap: the requirement is structurally `P(exit(Z) within τ | history)`, **not** `inside(p_t, Z)` — different inputs (velocity and heading), different output (time-to-event), different metrics (lead time, false alarms per open-task-hour — "do not measure accuracy"), different failure mode. It then gives a **three-rung ladder**, ordered by build effort:

1. Inset buffer polygon (trivial baseline, weakness named: lead time scales with walking speed).
2. **Dead-reckoning time-to-boundary** — the v1 target.
3. Learned intent / trajectory prediction over the user's own logged trajectories — explicitly deferred until 1 and 2 are instrumented.

`tzt-time-to-boundary-prediction` is the quantitative core and is genuinely implementable: state `x = [px, py, vx, vy]` in **floor-plan metres**, linear Kalman filter for a smoothed velocity (with the reason raw frame differencing fails — "almost pure noise at 30 FPS"), propagate without measurements, **closed-form ray-segment intersection per polygon edge, minimum positive root**, then either a conservative CI-based `τ̂` or a few-hundred-sample **Monte-Carlo estimate of `P(exit within τ)`** — recommending (b) because it is "barely more expensive and directly gives you the quantity the alert policy wants". Prediction horizon pinned at 2–6 s with the reason (constant velocity is wrong indoors). Three named failure modes with fixes: process-noise tuning, zero-velocity people at the door (handle with a separate proximity/orientation rule, **not** by corrupting the motion model), and occlusion gaps (coasting *toward* a boundary must **raise** alert probability — asymmetric treatment of uncertainty).

The coupling back to (a) is explicit and is the design's best idea: the monitor is **armed only while a tag bound to that zone is open**, and `AT_RISK` is **reversible** — fire the internal transition early but hold the user-facing notification for a 1–3 s confirmation window and cancel it if the person turns back. That "warn early internally, notify slightly later" split is what makes an aggressive threshold affordable, and it is stated as such in three separate files consistently.

Most tellingly, `cp-anticipate`'s done-test and `tzt-evaluation-metrics-tagging` both demand an **ablation**: "Ablating to reactive exit detection visibly destroys lead time" / "if lead time does not change, the feature is not real." The syllabus anticipates its own most likely failure mode (silently degrading to reactive detection because it scores better on anything accuracy-shaped) and builds a test that catches it.

---

## 4. Walking it as the learner — where you'd get stuck

**Day 1–2 (cp-tag-model):** Completely unblocked. Read `tzt-task-tag-model`, write the JSON Schema for three of my own tasks. Read `statecharts.dev` and the XState docs (both verified live), implement `reduce(state, event)`. Hand-compile the four monitors from `tzt-tag-wellformedness-monitor`. Write the 50-event synthetic trace. Every artefact and its acceptance criterion is spelled out. **No stuck point.**

**Week 1 (cp-capture):** `tzt-video-capture-pipeline` names the drop policy (oldest-first), the two sampling rates with numbers (10–30 FPS / 0.5–1 Hz), the ring buffer for backward `opened_at` correction, and hardware decode APIs by name (VAAPI/NVDEC/VideoToolbox). No source attached, but nothing here is obscure. **No stuck point.**

**Week 2 (cp-track):** `tzt-object-detection-tracking` plus two runnable-code sources (Ultralytics region counting, supervision detect-and-annotate). **First friction:** the checkpoint lists `kalman-filter` and `noise-uncertainty` as concepts, and **both files are empty `_TODO_` templates**. Recoverable — `source-elementary-kalman` (arXiv 1710.04055) is attached to `kalman-filter`, and `tzt-time-to-boundary-prediction` restates the constant-velocity formulation concretely. Annoying, not fatal.

**Week 3 (cp-zones):** `tzt-ground-plane-homography` gives a 4-step tape-measure procedure with a held-out validation step and a numeric pass bar. **No source attached**, and the concept never names `cv2.findHomography` / `cv2.getPerspectiveTransform` — but "solve for a 3×3 homography from four correspondences" is a one-search step. `transforms` and `sensor-fusion` are both empty stubs with no sources. **Mild friction.**

**Week 4+ (cp-recognition): this is the closest thing to a genuine "now what?".** `tzt-video-representation-clip` and `tzt-open-vocab-action-recognition` describe the architecture well (joint image-text space, explicit background/negative prompts for open-set rejection, prompt ensembles, verb/object decoupling, calibration before using scores as guards) — but **no concrete model, checkpoint, or library is ever named**. There is no "start with `open_clip` ViT-B/32" or equivalent. The two attached sources are a survey (arXiv 2503.15275) and a NeurIPS paper (arXiv 2308.11488) — orientation, not a runnable starting point. `tzt-few-shot-task-enrollment` has **no source at all**. A learner here has to independently decide what to download. Googleable, but it is the one place the artefact hands you a design and not a starting line.

**cp-runtime onward:** `bayes-filter` is listed and is an empty stub with no source, but `tzt-detection-to-event-debouncing` describes log-odds accumulation with decay concretely enough to implement directly. `cp-anticipate`, `cp-eval`, `cp-deploy` are all well-specified.

**Verdict on stuckness:** no dead ends. One research-y detour (picking a recognition model) and three places where a listed prerequisite concept is an empty template.

---

## 5. Honest defects

1. **Five of the ~28 referenced concepts are empty `_TODO_` templates**: `kalman-filter`, `bayes-filter`, `sensor-fusion`, `noise-uncertainty`, `transforms` (12 `_TODO_` markers each, from a pre-existing robotics library dated 2026-09-14). Only `kalman-filter` has an attached source. The syllabus reuses these by reference and the `tzt-*` concepts partially paper over them, but a learner clicking through hits blank pages.
2. **Source coverage is uneven.** 15 sources cover 14 concepts. Nine project-specific concepts have **no source at all**: `tzt-event-stream-design`, `tzt-video-capture-pipeline`, `tzt-on-device-privacy`, `tzt-ground-plane-homography`, `tzt-few-shot-task-enrollment`, `tzt-detection-to-event-debouncing`, `tzt-alert-policy-thresholds`, `tzt-evaluation-metrics-tagging`, `tzt-realtime-edge-deployment`, `tzt-alert-delivery-ux`.
3. **`courses: []` on every single checkpoint.** No structured course is ever recommended. For a self-directed learner with no LLM, that is a missing affordance — though the free papers/docs largely compensate.
4. **No named models, repos or install paths anywhere.** The syllabus is architecture-complete and artefact-free. Strong on "what to build and why"; thin on "here is the thing to `pip install`".

---

## 6. Three concrete changes (what would have to be true to *hold* this 5 under a stricter reading, and to fix the gaps above)

1. **Fill the five stub concepts, or replace them with `tzt-*` equivalents.** Minimum viable: give `kalman-filter` the constant-velocity predict/update equations, `bayes-filter` the log-odds recursion `ℓ_{t+1} = ℓ_t + log(p(z|H)/p(z|¬H))` with a decay term, and `transforms` the homogeneous-coordinate basics. Alternatively delete them from the checkpoints and fold the needed content into `tzt-time-to-boundary-prediction` and `tzt-detection-to-event-debouncing`, which already half-do it. *Affected files: `concepts/kalman-filter.md`, `bayes-filter.md`, `sensor-fusion.md`, `noise-uncertainty.md`, `transforms.md`.*

2. **Give `cp-recognition` a runnable starting line.** Add one source naming a concrete open-weights image-text or video-text encoder with an install path (e.g. an `open_clip` / `transformers` model card), attached to `tzt-video-representation-clip`, plus a short worked prompt-set example — three task prompts and two background/negative prompts with the actual strings. This is the single place in the artefact where a learner has a design but no first command to type. Also attach at least one source to `tzt-few-shot-task-enrollment` (a prototypical-networks reference would do).

3. **Attach a source to `tzt-ground-plane-homography` and name the function.** The OpenCV `findHomography` tutorial is free and live; the concept's 4-step procedure becomes immediately executable with it. Same treatment for `tzt-event-stream-design` (any append-only event-log / event-sourcing write-up) — it is the concept the whole offline-replay workflow rests on, and it is currently sourceless.

---

## 7. Why 5 rather than 4

The rubric separates 4 from 5 solely on whether the plan "specifically and concretely addresses BOTH the open/close state machine and the anticipatory zone-exit prediction (not generic boilerplate)."

- The open/close machine gets a named-state diagram, a parallel-regions design call, a pure `reduce(state, event)` implementation shape, four temporal-logic well-formedness properties hand-compiled into small automata, and a liveness→bounded-safety conversion that is the correct and non-obvious move. It is buildable and testable on synthetic traces before any camera exists — and that is `cp-tag-model`, the *first* checkpoint.
- The anticipatory warning gets the correct problem statement (`P(exit within τ)` vs `inside(p,Z)`), three ranked mechanisms, a closed-form ray-polygon time-to-boundary estimator with Monte-Carlo uncertainty, an armed-only-while-a-tag-is-open coupling, a reversible `AT_RISK` state with a confirmation window, lead-time/false-alarm-per-open-task-hour metrics instead of accuracy, and a mandatory ablation against reactive detection.

Neither is boilerplate; both are specific enough to implement. The bar for 4 (reach the first meaningful checkpoint unaided, rest of the roadmap credible) is comfortably cleared — `cp-tag-model` needs no hardware, no ML, and no further research. The defects in §5 are real and should be fixed, but they sit in the middle of the roadmap and none of them is a dead end.
