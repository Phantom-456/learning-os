/**
 * One-off seed script for the "task-zone-tracker" syllabus.
 * Calls the same lib/core functions the MCP server wraps.
 * Run: npx tsx scripts/tzt-seed.ts   (from the learning-os app root)
 */
import { createConcept, getConcept } from '../lib/core/concepts';
import { createSource, getSource } from '../lib/core/sources';
import { createProject, getProject } from '../lib/core/projects';
import type { Checkpoint } from '../lib/core/types';

type NewConcept = {
  id: string;
  title: string;
  parent: string;
  order: number;
  prereqs: string[];
  body: string;
};

const concepts: NewConcept[] = [
  // ---------------- Task-tag model ----------------
  {
    id: 'tzt-task-tag-model',
    title: 'The task-as-markup-tag model',
    parent: 'Task tag model',
    order: 1,
    prereqs: [],
    body: `# The task-as-markup-tag model

## Why it exists
The whole project rests on one modelling decision: a real-world task is not an
event, it is a **span**. "I put rice on the stove" is not a point in time; it is
an interval that is *opened* at one moment and must be *closed* at another. The
failure mode being solved — starting something and forgetting it — is exactly
the failure mode of an unclosed tag in markup: the document is still
syntactically "in" the element long after the author moved on.

Borrowing HTML's formalism is not a cute analogy, it is a genuine design
commitment with consequences. An HTML parser gives you, for free, a precise
vocabulary for the things this system has to decide:

- **Opening tag** — a detected start-of-task event that creates a live tag
  instance with an identity, a start timestamp, and attributes.
- **Attributes** — the per-instance state carried while open. The critical one
  here is \`zone\` (the physical region the task is bound to), plus
  \`opened_at\`, \`expected_duration\`, \`evidence\`, \`confidence\`.
- **Closing tag** — a detected completion event that must *match* the open
  instance, not merely be an event of the right type.
- **The open-element stack** — the set of currently-unclosed tasks. This is the
  system's entire working memory and the thing the user's brain is failing at.
- **Well-formedness** — the property the system is actually enforcing: every
  opened tag is eventually closed.
- **Void / self-closing elements** — instantaneous tasks that need no close
  ("turned off the light"). Recognising that some detected actions are void
  elements stops the stack filling with garbage.

## The parts that are NOT like HTML, and matter more
Taking the model seriously means being precise about where it breaks, because
every break is a design problem you have to solve explicitly:

1. **Real tasks are not properly nested.** HTML requires strict nesting: you
   cannot open A, open B, close A, close B. Human tasks interleave constantly —
   you start the rice, start a load of laundry, the rice finishes, then the
   laundry finishes. So the correct formalism is **not** a stack; it is a
   **multiset of concurrently open intervals** (closer to overlapping-range
   markup, or to XML's "overlapping hierarchies" problem that TEI solves with
   standoff milestone markup). Implementing the open-element list as an actual
   LIFO stack is the first bug you will write. Use an ID-keyed map of open
   instances instead, and require every close event to carry the instance id it
   closes.
2. **Tags are inferred, not authored.** An HTML parser reads unambiguous
   delimiters. Here the "<" and ">" are probabilistic outputs of a vision model.
   Every open and close is a *hypothesis with a confidence*, which is why the
   tag runtime needs hysteresis, evidence accumulation and a provisional-open
   state (see \`tzt-detection-to-event-debouncing\`).
3. **The vocabulary is open.** HTML has a fixed element set. Here the tag name
   comes from an open-vocabulary recogniser, so two detections of "boiling
   pasta" and "cooking rice" may or may not be the same element type. You need a
   canonicalisation step (embedding-space clustering, or a user-confirmed
   alias table) or the same task will open twice under two names.
4. **Closing has to be *matched*, not just typed.** If two pans are on the
   stove, a single "pan removed" close event must resolve to *one* instance.
   Matching should be on the instance's zone plus its tracked object identity,
   not on the tag name alone. Otherwise one completion silently closes both
   tags and you lose a task.
5. **Some tags never close on their own.** HTML documents end; days do not. You
   need explicit terminal policies: auto-close on timeout, escalate, or mark
   \`abandoned\` — and each is a different user-facing behaviour.

## What "done" looks like for this concept
You can write down, on paper, the tag schema for three tasks from your own life
(one with a clear physical zone, one interleaved with another, one instantaneous)
including: what evidence opens it, what evidence closes it, what zone it binds,
what its expected duration is, and what should happen if it is still open after
3x that duration. If you cannot do this without the word "somehow", the
perception work downstream has no target to hit.

## Watch for
- Modelling the open set as a stack (see above).
- Conflating *task type* with *task instance*. "Cooking" is an element name;
  "the cooking that started at 19:04 bound to zone kitchen-stove" is the
  instance. Almost every downstream bug is a confusion of these two.
- Letting the tag schema be implicit in code. Write it as a real schema
  (JSON Schema / TypeScript types) first; the perception stack is then built to
  emit *that*, rather than the schema being reverse-engineered from whatever
  the model happens to output.`,
  },
  {
    id: 'tzt-task-state-machine',
    title: 'Per-instance task state machine (open/close lifecycle)',
    parent: 'Task tag model',
    order: 2,
    prereqs: ['tzt-task-tag-model'],
    body: `# Per-instance task state machine (open/close lifecycle)

## Why it exists
\`tzt-task-tag-model\` says a task is an interval with an open and a close.
That is the *data*. This concept is the *behaviour*: the explicit finite state
machine that each live task instance runs, driven by noisy perception events and
by time. Without it you end up with a pile of boolean flags (\`isOpen\`,
\`maybeOpen\`, \`warnedAlready\`, \`userDismissed\`) whose combinations are
untestable and which will, guaranteed, produce the exact failure you are trying
to prevent: a task that is neither properly open nor properly closed.

## The state machine
A per-instance statechart, not a global one. One machine per live task.

\`\`\`
                 open-evidence (low conf)
   (nothing) ─────────────────────────────▶ PROVISIONAL
                                              │      │
              open-evidence sustained /       │      │ evidence decays,
              confidence > θ_open             │      │ or contradicted
                                              ▼      ▼
                                            OPEN ──────▶ (discarded)
                                             │ │ │
        subject leaves zone  ┌───────────────┘ │ └──────────────┐ close-evidence
        (predicted or actual)│                 │ expected        │ > θ_close
                             ▼                 │ duration        ▼
                        AT_RISK ───────────────┤ exceeded     CLOSING
                          │  ▲                 │                 │
        subject returns   │  │ predicted exit  ▼                 │ close confirmed
        to zone ──────────┘  │             OVERDUE               ▼
                             │                 │              CLOSED (terminal)
                    user dismisses /           │ timeout policy
                    snooze ────────────────────┴──────────▶ ABANDONED (terminal)
\`\`\`

The states earn their place as follows:

- **PROVISIONAL** — a single frame said "cooking started". You must not alert on
  this. Provisional absorbs recogniser flicker; it either matures into OPEN on
  sustained evidence or dies silently. This state is the single biggest source
  of perceived system quality: without it the user gets phantom tasks and stops
  trusting the app within a day.
- **OPEN** — the tag is live and is bound to a zone. This is where the zone
  monitor is armed.
- **AT_RISK** — the *anticipatory* state. Entered on a predicted (not actual)
  zone exit; this is the state that fires the "you're about to walk away from
  the stove" reminder. It is deliberately re-entrant/reversible: walking back
  returns you to OPEN without ever notifying, and *that reversibility is what
  makes early warning affordable*. A design that only has "inside" and
  "outside" cannot express AT_RISK and therefore cannot warn early.
- **CLOSING** — close evidence seen but not yet corroborated. Mirrors
  PROVISIONAL on the other end. Prevents an occlusion or a momentary empty stove
  from closing a task that is still running.
- **OVERDUE** — open far past its expected duration with no close evidence.
  Distinct from AT_RISK: AT_RISK is spatial, OVERDUE is temporal. They can hold
  simultaneously, which is why in a real statechart these should be modelled as
  two **parallel regions** (a \`presence\` region and a \`progress\` region) over
  the same instance rather than as mutually exclusive states. Harel statecharts'
  orthogonal regions exist precisely for this; flattening them into one enum is
  the state-explosion bug.
- **CLOSED / ABANDONED** — terminal, and *different*. Closed means the task
  finished. Abandoned means the system gave up. Never collapse them: the
  abandoned rate is your headline quality metric.

## Implementation notes that actually bite
- **Make every transition event-driven and pure.** \`reduce(state, event) ->
  state\` with time itself delivered as a \`TICK\` event. Then the entire
  lifecycle is testable by replaying a synthetic event list with zero video in
  the loop — you can and should build and test this whole checkpoint before
  touching a camera.
- **Guards, not branches.** Confidence thresholds, dwell requirements and
  cooldowns belong in transition guards so they are visible in the diagram and
  tunable as data, not buried in if-statements.
- **Entry/exit actions own side effects.** Notifications fire from
  \`onEntry(AT_RISK)\`, not from the perception loop. This keeps "when do we
  decide something" separate from "when do we tell the human", which you will
  want when you start tuning alert aggressiveness.
- **Snooze is a real state, not a boolean.** Model it as a timed transition back
  into the armed state, otherwise snooze leaks and the task is never raised
  again.
- **Persist the machine.** Instances must survive a process restart — the whole
  point is memory that outlives attention. Persist the state plus the event log,
  and rebuild by replay.

## Watch for
- Alerting from OPEN instead of AT_RISK (that is a post-hoc reminder, which the
  brief explicitly rejects).
- Hidden states expressed as extra booleans; if you need a boolean alongside the
  enum, it is probably a parallel region.
- Non-reversible AT_RISK. If returning to the zone cannot silently cancel the
  warning, you must set the threshold so conservatively that the warning is
  always late.`,
  },
  {
    id: 'tzt-tag-wellformedness-monitor',
    title: 'Well-formedness monitoring (runtime verification over task events)',
    parent: 'Task tag model',
    order: 3,
    prereqs: ['tzt-task-state-machine'],
    body: `# Well-formedness monitoring (runtime verification over task events)

## Why it exists
The per-instance state machine tracks one task. This concept is the layer above:
a monitor over the *whole* event stream that continuously answers "is the
document still well-formed?" — i.e. is every opened task on a trajectory toward
being closed. This is textbook **runtime verification**: you specify properties
in temporal logic, compile them into finite-state monitors, and feed them the
live event trace, getting a verdict as early as the trace allows.

Framing the problem this way is not academic decoration. It buys three concrete
things:
1. Properties are written declaratively, separately from the perception code, so
   you can add a new rule ("the front door must not be opened while a cooking
   tag is open") without touching the vision stack.
2. Monitor synthesis gives you *early* verdicts on bad prefixes — the monitor
   can report a violation is inevitable before the bad thing finishes happening,
   which is structurally the same thing the anticipatory zone warning needs.
3. You get a vocabulary for the distinction that matters here: **safety**
   properties ("something bad never happens" — violated in finite time,
   detectable) versus **liveness** properties ("something good eventually
   happens" — never violated in finite time). "Every open tag is eventually
   closed" is pure liveness, so a monitor can *never* declare it violated. That
   is not a technicality; it is the reason the system must convert liveness into
   bounded safety.

## The key move: liveness → bounded safety
\`G(open(t) -> F close(t))\` is unmonitorable. You cannot ever say "this will
never be closed". So you replace it with time-bounded and space-bounded
surrogates that *are* monitorable:

- **Bounded response:** \`G(open(t) -> F[0, D_t] close(t))\` — closed within the
  task's expected duration budget \`D_t\`. Violation is detectable at \`D_t\`.
- **Zone-coupled safety:** \`G((open(t) & bound(t, z)) -> !exit(z))\` until close.
  "You must not leave the zone with this tag open." A safety property, therefore
  monitorable, therefore alertable — and its *bad prefix* (about to exit) is the
  anticipatory trigger.
- **Matched-close:** \`G(close(t, i) -> O open(t, i))\` — no close without a
  prior matching open of the same instance (past-time LTL). Catches recogniser
  hallucinations.
- **No-duplicate-open:** \`G(open(t, i) -> !O (open(t, i) S !close(t, i)))\` —
  the same instance must not be opened twice while already open. Catches the
  canonicalisation failures described in \`tzt-task-tag-model\`.

Writing these four down explicitly, before writing the runtime, is the single
highest-leverage hour in this project.

## Practical construction
- You do **not** need a full LTL toolchain. Hand-compile each property into a
  small deterministic monitor automaton (typically 2-4 states) and run them in
  parallel over the event stream. Use a library only if the property set grows.
- The event stream is lossy and out-of-order (frames drop, a phone reconnects).
  Real runtime-verification work on lossy/out-of-order streams matters here:
  a monitor should emit a verdict as soon as it is justified and keep that
  verdict correct when a knowledge gap is later filled. Practically: keep
  verdicts three-valued (\`true\` / \`false\` / \`unknown\`) rather than boolean,
  and never let \`unknown\` silently render as \`ok\`.
- Monitors are where you put *cross-task* rules that no single instance can see:
  "at most one high-risk open tag at a time", "do not warn about task B within
  60s of warning about task A" (alert-fatigue guard).

## What "done" looks like
You can replay a hand-written trace of ~50 synthetic events — including a
dropped close, an out-of-order close, a duplicate open, and a zone exit — and
the monitor produces exactly the verdicts you predicted on paper beforehand.

## Watch for
- Trying to monitor unbounded liveness and quietly never firing.
- Two-valued verdicts over a lossy stream (you will report "all good" during a
  camera outage, which is the worst possible lie for this product).
- Putting cross-task policy inside the per-instance machine; it belongs here.`,
  },
  {
    id: 'tzt-event-stream-design',
    title: 'Append-only event stream design for task tracking',
    parent: 'Task tag model',
    order: 4,
    prereqs: ['tzt-task-tag-model'],
    body: `# Append-only event stream design for task tracking

## Why it exists
Everything upstream (perception) is noisy and everything downstream (state
machines, monitors, alerts) is stateful. The interface between them should be a
single, boring, append-only event log. This gives you the one property you need
most while building a perception system you don't yet trust: **replayability**.
You record a day of raw events once, then iterate on thresholds, state machines
and alert policy a hundred times against that recording, offline, in seconds,
without re-running the model or re-living the day.

## Event shape
Two families, deliberately separated:

- **Observation events** — what perception saw. Low-level, high-volume,
  never edited. \`{ts, kind: 'observation', source: 'cam0', type:
  'action_hypothesis' | 'person_pose' | 'object_state', label, confidence,
  bbox/zone, track_id}\`.
- **Domain events** — what the runtime decided. \`{ts, kind: 'domain', type:
  'tag_opened' | 'tag_closed' | 'tag_at_risk' | 'tag_abandoned' | 'alert_sent' |
  'user_dismissed', instance_id, ...}\`.

Domain events are a *pure function* of the observation stream plus config. Keep
that invariant and your whole system is a replayable pipeline; break it (by
letting the runtime mutate state from somewhere not in the log) and debugging
becomes archaeology.

## The properties that matter
- **Monotonic ids and explicit timestamps.** Two clocks exist: capture time and
  processing time. Log both. Ordering and windowing must use capture time; alert
  latency measurement needs processing time.
- **Out-of-order and late arrivals are normal**, especially with an edge device
  that buffers during a Wi-Fi drop. Decide a watermark/grace window and make the
  behaviour on late events explicit (re-run the affected window, or drop with a
  logged counter — either is fine, silence is not).
- **Idempotency.** A retried batch must not open a task twice. Deduplicate on
  \`(source, capture_ts, type, track_id)\`.
- **Compaction, not deletion.** Raw frames are expensive and sensitive; events
  are cheap. Retain the event log far longer than the video (see
  \`tzt-on-device-privacy\`) — that is what lets you keep improving the system
  without keeping footage of your kitchen.
- **User corrections are events too.** "No, I wasn't cooking" / "yes, that's
  done" append \`user_correction\` events rather than mutating history. This log
  is then your labelled dataset, for free, from real usage — the cheapest path
  to few-shot enrollment (\`tzt-few-shot-task-enrollment\`).

## Watch for
- Storing only the derived tag state and not the observations; you lose the
  ability to re-tune and every threshold change becomes a fresh multi-day
  experiment.
- Using wall-clock \`now()\` inside the state machine instead of an event
  timestamp — replay then produces different results than live, and you can no
  longer trust your offline tuning.`,
  },

  // ---------------- Capture & privacy ----------------
  {
    id: 'tzt-video-capture-pipeline',
    title: 'Continuous video capture pipeline (frames, buffering, backpressure)',
    parent: 'Perception infrastructure',
    order: 10,
    prereqs: [],
    body: `# Continuous video capture pipeline (frames, buffering, backpressure)

## Why it exists
This system is always-on, which makes it a streaming-systems problem before it
is a machine-learning problem. Almost everyone building a "camera watches me"
project underestimates this and discovers three weeks in that their detector
runs at 4 FPS, the queue has grown to 40 GB, and every alert is 90 seconds late.

## What you actually need to get right
- **Decouple capture from inference** with a bounded queue and an explicit
  **drop policy**. Capture at the sensor's native rate; run inference at whatever
  rate it sustains; when the queue is full, drop *oldest* frames, not newest —
  for this application a fresh frame is always worth more than a stale one, and
  latency is a correctness property (an alert after you leave the house is
  worthless).
- **Two sampling rates.** Zone/presence tracking needs a fast loop (10-30 FPS,
  cheap detector). Open-vocabulary action recognition needs a slow loop
  (a clip every 1-2 s, expensive model). Running one model at one rate is the
  default mistake; it makes zone tracking jittery *and* recognition expensive.
- **Clip buffering.** Action recognisers consume clips (8-32 frames spanning
  1-4 s), not frames. Keep a rolling ring buffer so that when something
  interesting is detected you can also look *backwards* — the start of a task is
  usually already in the past by the time anything is confident about it. This
  backwards look is what lets you timestamp \`opened_at\` correctly rather than
  at detection time.
- **Hardware decode/encode** (VAAPI/NVDEC/Apple VideoToolbox) or you will burn
  the entire CPU budget on H.264 before any model runs.
- **Failure is routine.** Camera disconnects, exposure changes at dusk, someone
  unplugs it. Emit explicit \`source_unavailable\` events into the log — a gap in
  observations must be distinguishable from "nothing happened", or your monitor
  will report a task closed when it simply went blind.

## Watch for
- Unbounded queues (memory blow-up, then latency, then irrelevance).
- Timestamping frames at inference time rather than capture time.
- Treating night/low-light as an edge case; it is roughly half of the hours this
  system is supposed to cover.`,
  },
  {
    id: 'tzt-on-device-privacy',
    title: 'On-device processing and privacy architecture for home cameras',
    parent: 'Perception infrastructure',
    order: 11,
    prereqs: ['tzt-video-capture-pipeline'],
    body: `# On-device processing and privacy architecture for home cameras

## Why it exists
This system's whole premise is a camera watching you in your kitchen, all day.
The privacy design is not a compliance checkbox appended at the end; it
determines your architecture (what model can run, where, and therefore what the
system can know), and it determines whether you will actually keep it switched
on. A system you turn off during a dinner party is a system that misses tasks.

## The design decisions
- **Default to local inference.** Frames should never leave the device. This
  rules out the largest cloud video-language models and pushes you toward
  quantised on-device models — which is exactly why
  \`tzt-realtime-edge-deployment\` is a first-class checkpoint rather than an
  afterthought. Decide this early because it constrains model choice.
- **Retain derived events, not pixels.** The event log
  (\`tzt-event-stream-design\`) is small, useful for months, and far less
  sensitive. Raw video should have a short, enforced TTL (minutes to hours)
  unless explicitly pinned for debugging. Make the TTL a hard deletion job, not
  a config comment.
- **Redaction at the earliest possible stage.** If a frame must be persisted for
  debugging, blur faces/bodies at write time, not at read time.
- **Zone-scoped capture.** Mask regions of the frame that are outside every
  defined task zone at the decoder, so the model literally cannot see the rest of
  the room. This is both a privacy win and a false-positive win.
- **Visible, physical off.** A hardware indicator and a physical cover. The
  behavioural literature on assistive monitoring for memory support is blunt
  about this: perceived surveillance is the main reason such systems get
  abandoned, and an abandoned system helps nobody.
- **Other people.** Housemates and guests did not opt in. At minimum: a guest
  mode, and a policy on whether non-enrolled people are tracked at all
  (recommended: detected for zone occupancy, never identified, never recorded).

## Watch for
- "I'll add privacy later" — model choice and storage schema both get locked in
  before "later" arrives.
- Sending clips to a cloud VLM "just for the hard cases"; that is the moment the
  privacy story stops being true, and hard cases are most of the interesting
  ones.`,
  },

  // ---------------- Detection / tracking / zones ----------------
  {
    id: 'tzt-object-detection-tracking',
    title: 'Object detection and multi-object tracking for persistent identity',
    parent: 'Spatial perception',
    order: 20,
    prereqs: ['tzt-video-capture-pipeline'],
    body: `# Object detection and multi-object tracking for persistent identity

## Why it exists
Two different things in this system need *persistent identity across frames*,
and neither works with per-frame detection alone:

1. **The subject.** The anticipatory zone warning is about a trajectory — where
   is the person going. A trajectory requires that the person in frame 100 is
   known to be the same person as in frame 99. Per-frame detection gives you a
   box; tracking gives you a \`track_id\` and therefore a velocity.
2. **The task-bearing object.** Matching a close event to the right open
   instance (two pans on the stove) needs object identity, not just object class.

## What to learn
- **Detection**: a modern single-stage detector is fine; you are detecting
  \`person\` plus a handful of household object classes. Resolution and
  calibrated confidence matter more than architecture.
- **Tracking-by-detection**: the dominant, and for this project entirely
  sufficient, paradigm. Detect per frame, associate across frames via IoU +
  motion prediction, maintain tracks with birth/death logic. The classic
  SORT/ByteTrack family uses a **constant-velocity Kalman filter per track** to
  predict where each box will be in the next frame, then Hungarian-matches
  detections to predictions. Learn this properly: the very same per-track
  velocity estimate is what \`tzt-time-to-boundary-prediction\` reuses to
  answer "when will this person cross the zone boundary" — you get the
  anticipatory signal essentially for free once tracking is correct.
- **Track lifecycle**: \`tentative -> confirmed -> lost -> deleted\`, with a
  max-age before deletion. Note the structural echo of the task state machine —
  tentative/confirmed is the same hysteresis idea at a different layer.
- **ID switches and occlusion**: the dominant failure mode indoors (doorways,
  furniture, someone crouching). An ID switch mid-task will, if you are careless,
  look like "the person left the zone" and fire a false alert. Bound the damage
  by treating a track death inside a zone as \`unknown\`, not as \`exited\`.

## Reuse note
\`kalman-filter\`, \`bayes-filter\` and \`noise-uncertainty\` in this library
already cover the estimation theory; this concept is about applying it to
image-plane boxes and about association, which is the part those concepts do not
cover.

## Watch for
- Evaluating the detector alone and assuming tracking will be fine. Track-level
  metrics (IDF1, ID switches) are what predict system behaviour here, not mAP.
- Using the *centre* of the person's box as their floor position; use the bottom
  edge / foot point, because that is what the ground-plane homography maps
  correctly (\`tzt-ground-plane-homography\`).`,
  },
  {
    id: 'tzt-ground-plane-homography',
    title: 'Ground-plane homography: image pixels to floor coordinates',
    parent: 'Spatial perception',
    order: 21,
    prereqs: ['tzt-object-detection-tracking', 'transforms'],
    body: `# Ground-plane homography: image pixels to floor coordinates

## Why it exists
A zone is a physical region of your floor — "within 1.5 m of the stove". A
detection is a rectangle in pixels. Reasoning about *distance to the zone
boundary* and *speed toward it* in pixel space is wrong: pixels compress
non-linearly with depth, so a person walking away at constant speed appears to
slow down, and any "about to exit" threshold tuned near the camera is nonsense
far from it. The anticipatory warning needs metric units, so you need a mapping
from image to floor.

## The core idea
All points on the floor lie on a single plane. The mapping between two views of
a plane — the camera image and the floor as seen from above — is a **homography**,
a 3x3 matrix \`H\` acting on homogeneous coordinates, with 8 degrees of freedom.
Given four point correspondences between image and floor plan (no three
collinear), you can solve for \`H\`; with more than four, solve least-squares and
gain robustness.

Crucially, \`H\` is only valid *for points on that plane*. This is why you map a
person's **foot point** (bottom-centre of the detection box) and not their
centroid: the feet are on the floor, the torso is not, and mapping the torso
introduces an error that grows with distance and height.

## Practical procedure
1. Fix the camera rigidly. Any nudge invalidates the calibration — detect this
   (periodic re-check against static scene features) rather than discovering it
   from a month of bad alerts.
2. Measure four points on the real floor with a tape measure (corners of a
   rug, tile intersections, taped markers). Record their metric coordinates in a
   floor-plan frame you define.
3. Click the same four points in a frame; solve for \`H\`.
4. **Validate with held-out points.** Mark a fifth and sixth point, map them,
   compare to tape-measure ground truth. Report error in centimetres. If it is
   worse than ~15-20 cm in the task zones you care about, re-do it — the
   downstream time-to-boundary estimate inherits this error directly.

## Limits to know before you rely on it
- Lens distortion breaks the planar assumption at the frame edges; undistort
  first using intrinsics, or keep zones away from the edges.
- Seated or partially occluded people have no visible foot point. Recent work on
  calibration-free 3D multi-camera tracking exists precisely because ground-plane
  homography fails in those cases. For a v1, detect the failure (no foot point
  visible / box bottom clipped by frame edge) and emit \`unknown\` rather than a
  confidently wrong floor position.
- One camera gives you one plane. Multi-room coverage means multiple cameras,
  each with its own \`H\` into a *shared* floor-plan frame — which is the point of
  defining the floor-plan frame explicitly in step 2.

## Watch for
- Calibrating once and never checking. Homography drift is silent.
- Mixing up units. Pick metres, write it in the type name, never look back.`,
  },
  {
    id: 'tzt-zone-polygon-occupancy',
    title: 'Zone definition and occupancy: polygons, dwell and hysteresis',
    parent: 'Spatial perception',
    order: 22,
    prereqs: ['tzt-ground-plane-homography'],
    body: `# Zone definition and occupancy: polygons, dwell and hysteresis

## Why it exists
A task tag binds to a zone. This concept is how a zone is represented, and how
"is the subject in it" is answered stably enough to drive alerts. The naive
version — point-in-polygon on the current frame's foot point — is one line of
code and produces an unusable system, because a person standing on the boundary
generates dozens of enter/exit events per minute.

## Representation
- A zone is a **polygon in floor-plan metres**, not a rectangle in pixels. Author
  it once against your floor plan; it is then valid for any camera that has a
  homography into that frame.
- Zones are **named and typed**: \`stove\`, \`kitchen\`, \`home\`. Note they are
  naturally **nested** — leaving the stove area is a different event from leaving
  the kitchen, which is a different event from leaving the house, and the right
  escalation ladder uses all three. Model containment explicitly.
- A zone carries an **anchor choice**: which point of a detection counts as "in"
  (bottom-centre for people on the floor). Practical tooling (e.g. polygon-zone
  utilities in common CV libraries) exposes exactly this parameter, and getting
  it wrong shifts every boundary by half a body height.

## Making occupancy stable
Three mechanisms, all of which you need:
1. **Hysteresis / two thresholds.** Entering requires the foot point to be inside
   the polygon shrunk by a margin; exiting requires it outside the polygon grown
   by a margin. A single boundary oscillates; a band does not.
2. **Dwell / loitering delay.** Do not treat a transient crossing as an entry.
   Require the subject to remain inside for \`T_dwell\` before the zone is
   considered occupied. This is the exact mechanism mobile geofencing APIs expose
   as a DWELL transition with a loitering delay, and it exists for the same
   reason: raw ENTER/EXIT events are far too noisy to drive notifications.
3. **Debounced exit.** Symmetrically, require sustained absence before declaring
   an exit — a person momentarily occluded by the fridge has not left the
   kitchen.

Note the deliberate asymmetry you will want: *confirmed* exit should be slow and
certain (it is used for state transitions), while *predicted* exit should be fast
and reversible (it drives the early warning — see
\`tzt-anticipatory-zone-exit\`). Conflating them forces one threshold to do two
incompatible jobs.

## Hybrid sensing
Camera-only zone tracking has blind spots and dark rooms. Cheap complements are
worth designing for from the start, because they are far more reliable for
specific high-value facts: a smart plug or current clamp knows the hob is on; a
door contact sensor knows the front door opened; a BLE beacon or phone Wi-Fi
association knows roughly which room the user is in. Fusing a low-rate, highly
reliable signal with a high-rate, noisy one is the classic sensor-fusion setup
(\`sensor-fusion\`), and for the "did they leave the house" boundary a door
sensor beats any vision model you will train.

## Watch for
- Defining zones in pixels (they break the moment the camera moves or a second
  camera is added).
- One global dwell time. The stove needs seconds; "left the house" needs none.
- Forgetting the \`unknown\` occupancy state during camera outage.`,
  },

  // ---------------- Recognition ----------------
  {
    id: 'tzt-video-representation-clip',
    title: 'Video representations and vision-language embeddings',
    parent: 'Activity recognition',
    order: 30,
    prereqs: ['tzt-video-capture-pipeline'],
    body: `# Video representations and vision-language embeddings

## Why it exists
Before you can recognise an open-ended set of tasks, you need a representation
of a few seconds of video that (a) captures motion, not just appearance, and
(b) lives in a space shared with *language*, because that is what makes an open
vocabulary possible at all.

## What to learn
- **Why images are not enough.** A single frame of "hand near pan" cannot
  distinguish putting food in from taking it out — and those are the open and
  the close of the same tag. Temporal modelling is not optional for this project;
  it is the difference between the two events you care most about.
- **Clip encoders.** The practical family: a frozen image backbone applied
  per-frame plus temporal aggregation (mean-pool, transformer over frame tokens),
  versus native video transformers. For an on-device build, per-frame features +
  lightweight temporal head is usually the right trade.
- **Joint image-text embedding (CLIP-style).** An image encoder and a text
  encoder trained so that matched pairs are close. The consequence that matters:
  you can classify into *any* set of categories by writing them as text prompts
  at inference time, with no retraining. This is the mechanism behind every
  open-vocabulary method you will use downstream.
- **Video-language models** extend this to clips and to generative
  description. They are the most flexible option and the most expensive; know
  where they sit, and know the privacy constraint (\`tzt-on-device-privacy\`)
  that likely keeps the big ones out of your loop.
- **Verb/noun decomposition.** Egocentric action work has converged on treating
  an action as (verb, object) rather than one atomic label, and recognising each
  with a different mechanism — an object-agnostic verb encoder plus a
  prompt-based object encoder generalises to unseen objects far better than a
  single joint classifier. This decomposition is directly useful here: your tag
  *name* is essentially a (verb, object) pair, and object novelty ("a pan I've
  never seen") is much more common than verb novelty.

## Watch for
- Benchmarking on trimmed, curated clips and expecting the numbers to survive
  contact with an untrimmed, mostly-boring home video stream where >95% of frames
  contain no task transition at all.
- Assuming embedding similarity is calibrated. CLIP-style scores are relative,
  not probabilities; you must calibrate before using them as confidence in a
  state-machine guard.`,
  },
  {
    id: 'tzt-open-vocab-action-recognition',
    title: 'Open-vocabulary and zero-shot activity recognition',
    parent: 'Activity recognition',
    order: 31,
    prereqs: ['tzt-video-representation-clip'],
    body: `# Open-vocabulary and zero-shot activity recognition

## Why it exists
The brief's tasks are not a fixed list. "Cooking", "laundry", "charging the
drill", "soaking a pan" — whatever the user happens to start. A closed-set
classifier trained on N categories is structurally wrong for this: it will
confidently assign every novel activity to its nearest known class, which means
the system opens a *wrong* tag rather than admitting it does not know. For a
memory-assistance product, a confidently wrong tag is worse than no tag.

## The three regimes, and what each is for
1. **Zero-shot / open-vocabulary classification.** Score a clip against text
   prompts for candidate task names in a joint embedding space. Cheap, needs no
   data, and is the right default for the *long tail*. Accuracy is mediocre and
   scores are uncalibrated.
2. **Open-set recognition.** The complement, and the part people skip: the
   ability to output "none of the above". This is what stops the system opening
   spurious tags during the 95% of the day that is not a task. Techniques:
   thresholding on max similarity (weak), adding explicit negative/background
   prompts ("a person walking through a kitchen", "an empty room") which works
   surprisingly well, and energy/distance-based rejection.
3. **Few-shot enrollment.** For the handful of tasks that actually matter to
   this user, a few labelled examples beat any zero-shot prompt. See
   \`tzt-few-shot-task-enrollment\`.

The working architecture for this project is all three: open-vocabulary
proposal, open-set rejection, few-shot refinement on the user's real tasks.

## Specific techniques worth knowing
- **Prompt engineering as a first-class knob.** "a photo of someone cooking" vs
  "a person stirring a pot on a lit stove burner" differ enormously. Prompt
  ensembles (several phrasings averaged) are a reliable, free accuracy gain.
- **Verb/object decoupling** (see \`tzt-video-representation-clip\`): recognising
  novel *objects* via a prompt-based object encoder while keeping the verb
  encoder object-agnostic generalises substantially better on egocentric
  benchmarks than a single open-vocabulary head.
- **VLM-as-reasoner over structured perception.** A newer and very practical
  pattern: don't ask a VLM to classify the video end-to-end. Use cheap perception
  to extract structured facts (which objects, which hands, which zone, over which
  frames) and have a language model reason over that symbolic trace. It is
  cheaper, far more debuggable, and its output is text you can map onto a tag
  schema.
- **Canonicalisation.** Open vocabulary means the same task can come back under
  different names on different days. Cluster proposed names in embedding space
  and keep a user-confirmable alias table, or you will open two tags for one pot
  of rice (the failure mode called out in \`tzt-task-tag-model\`).

## Watch for
- No "none of the above" path. This is the single most common and most damaging
  omission.
- Evaluating on the same curated benchmark the method was designed for and
  assuming transfer to your kitchen at your camera angle in your lighting.
- Treating recognition output as the tag. It is *evidence* for a tag; the state
  machine decides.`,
  },
  {
    id: 'tzt-few-shot-task-enrollment',
    title: 'Few-shot task enrollment from the user\'s own examples',
    parent: 'Activity recognition',
    order: 32,
    prereqs: ['tzt-open-vocab-action-recognition'],
    body: `# Few-shot task enrollment from the user's own examples

## Why it exists
The user has maybe eight tasks that account for nearly all their forgetting, and
those eight are highly personal and highly repetitive: *their* stove, *their*
kettle, *their* washing machine, from *one* fixed camera angle. That is the
ideal setting for few-shot learning, and it is where the accuracy needed to make
alerts trustworthy will actually come from. Zero-shot handles the tail;
enrollment handles the cases the product is judged on.

## The mechanics
- **Prototype-based classification.** Embed a handful of clips per task, average
  them into a prototype vector, classify by nearest prototype with a rejection
  radius. No gradient training, runs on-device, a new task is enrolled in
  seconds. This should be your default — the complexity of fine-tuning is rarely
  justified at n=5.
- **Linear probe.** Freeze the encoder, train a small classifier head on the
  enrolled examples. Slightly better than prototypes when you have tens of
  examples per class; still cheap.
- **Negatives matter more than positives.** With five positive clips and no
  negatives, everything looks like the task. Mine negatives automatically from
  the user's own footage: any clip from a period with no open tag is a background
  sample. This is nearly free and is the highest-value data you have.
- **Enrollment UX is part of the algorithm.** The realistic capture path is not
  "record five demonstrations"; it is the correction loop from
  \`tzt-event-stream-design\` — the user says "no, that wasn't cooking" or "yes,
  that's done", and each correction is a labelled example. Design for this and
  the system improves through use; don't, and it is frozen at install quality.
- **Close examples are scarcer than open examples.** People demonstrate starting
  things; completions are undramatic and under-captured. Deliberately solicit
  close examples, or your \`θ_close\` will be tuned on almost nothing and tasks
  will hang open.

## Watch for
- Catastrophic drift when the camera moves or the kitchen is rearranged;
  re-enrollment must be a one-minute user action, not a rebuild.
- Class imbalance across enrolled tasks (one task with 40 corrections, six with
  2). Prototype methods are fairly robust to this; linear probes are not.
- Overfitting to time of day / lighting if all examples come from one evening.`,
  },

  // ---------------- Temporal segmentation ----------------
  {
    id: 'tzt-temporal-action-segmentation',
    title: 'Temporal action segmentation: finding the boundaries of an activity',
    parent: 'Activity recognition',
    order: 33,
    prereqs: ['tzt-video-representation-clip'],
    body: `# Temporal action segmentation: finding the boundaries of an activity

## Why it exists
Classification answers "what is happening". This project needs "when did it
start" and "when did it end" — which is precisely the temporal action
segmentation / localisation task: given an untrimmed video, label every frame and
thereby recover the start and end boundaries of each action segment. The mapping
to the tag model is exact and worth stating plainly: **a segment's start
boundary is the opening tag; its end boundary is the closing tag.** Every result
in this literature about boundary precision is a result about how accurately your
system can open and close tags.

## What to learn
- **The task setup.** Frame-wise labels over long, untrimmed video; standard
  benchmarks are cooking-heavy (50 Salads, Breakfast, GTEA) and egocentric
  assembly (Assembly101) — which is fortunate, because cooking is the brief's own
  example.
- **The dominant failure: over-segmentation.** Frame-wise models flicker,
  chopping one long action into many short ones. Every architectural trick in
  this area (multi-stage refinement, smoothing losses, boundary-aware decoding)
  exists to fight it. For you, over-segmentation means one pot of rice producing
  six open/close pairs — the same problem the state machine's hysteresis attacks
  from the other side. Fight it at both layers.
- **Decoupling boundary detection from frame labelling.** A productive
  architecture: one head predicts "is this frame a boundary", another predicts
  "what action is this frame", and they are combined. This is directly useful
  because your two heads map onto two different downstream consumers — the
  boundary head drives tag open/close events, the label head drives the tag name.
- **Metrics.** Frame accuracy is a bad headline metric (a model that predicts the
  majority class through a long action scores well while missing every boundary).
  Use segmental edit distance and segmental F1 at IoU thresholds — and for this
  project, add boundary-localisation error in seconds, because \`opened_at\`
  accuracy determines whether "expected duration" logic works at all.

## Offline vs online
Almost all of this literature is **offline**: the model sees the whole video,
including the future, before labelling. You cannot. Study the offline methods to
understand the problem structure and to build your evaluation harness against
recorded video — then port the constraint-aware version
(\`tzt-online-action-start-detection\`). Building offline first is the right
order: it gives you an upper bound on achievable accuracy and a clean dataset,
before the causality constraint makes everything harder.

## Watch for
- Reporting frame accuracy and believing it.
- Assuming benchmark segment lengths resemble yours. Benchmark actions run
  seconds; "rice is cooking" runs twenty minutes, mostly with nobody in frame.
  That regime — very long, sparsely-observed segments — is barely represented in
  the literature and is your actual problem.`,
  },
  {
    id: 'tzt-online-action-start-detection',
    title: 'Online (causal) detection of action start and end',
    parent: 'Activity recognition',
    order: 34,
    prereqs: ['tzt-temporal-action-segmentation'],
    body: `# Online (causal) detection of action start and end

## Why it exists
An alert that arrives after you have left the house is not an alert. The system
must decide *now*, using only the past — this is the online / streaming setting,
and it is a genuinely harder problem than offline segmentation, not merely the
same problem with a sliding window.

The dedicated formulation is **Online Detection of Action Start (ODAS)**:
identify the start of an action in a streaming, untrimmed video as soon as it
happens, with minimal latency. It was motivated by early-alert applications, and
this project is one.

## The core tension
Accuracy and latency trade off directly. More temporal context after the start
makes the decision easier and the alert later. You must choose a point on that
curve deliberately, per task:

- \`open\` events are **latency-tolerant**. Being 10 s late to notice cooking
  started costs almost nothing, because the risk window is minutes long. Buy
  accuracy with context here.
- \`at_risk\` events are **latency-critical**. They must precede the exit.
- \`close\` events are latency-tolerant but **precision-critical** — a false close
  silently deletes a task from the system, which is the exact failure the
  product exists to prevent. Bias thresholds hard toward not closing.

Writing this asymmetry down and tuning three different operating points is
something almost nobody does, and it is most of the difference between a demo and
something you would rely on.

## Techniques worth knowing
- **Start-vs-background is the hard discrimination**, not start-vs-other-action.
  The frames just before an action start look almost identical to the frames just
  after. ODAS work addresses this with hard negative generation and by explicitly
  modelling the temporal consistency between the frames around the start and the
  frames after it.
- **Adaptive memory / streaming context.** Online segmentation baselines maintain
  a memory bank of past context that adapts as context changes, plus causal
  post-processing to suppress over-segmentation without seeing the future.
- **Retrospective correction.** Because you also keep an event log, you can emit
  a provisional online decision *and* revise the recorded boundary a few seconds
  later when more context arrives. The alert already fired on the provisional
  decision; the log gets the corrected timestamp. This gets you low latency and
  accurate \`opened_at\` — use it.
- **Causal post-processing only.** Median filters, smoothing and non-maximum
  suppression over a window that includes future frames are the most common
  accidental information leak in "online" evaluations. If your offline numbers
  look great and live behaviour is bad, check this first.

## Watch for
- Evaluating with any lookahead and calling it online.
- One threshold for open, close and at-risk.
- Ignoring the dead time: most of the day has no action. Measure false-start rate
  per *hour of idle footage*, not per benchmark clip, or you will ship something
  that opens four phantom tasks a day.`,
  },
  {
    id: 'tzt-completion-evidence-state-change',
    title: 'Completion evidence: object state change as the closing signal',
    parent: 'Activity recognition',
    order: 35,
    prereqs: ['tzt-online-action-start-detection', 'tzt-object-detection-tracking'],
    body: `# Completion evidence: object state change as the closing signal

## Why it exists
Starts are visually dramatic — a person walks up, picks something up, motion
happens. Completions often are not. The pan comes off the hob while you are
looking elsewhere; the washing machine simply stops. If you rely on
"recognise the completion action" alone, tasks will hang open, the system will
nag about things you already finished, and the user will disable it. Close
detection needs its own evidence sources, and this concept is that catalogue.

## Sources of close evidence, roughly in order of reliability
1. **Object state change.** The most robust visual signal, and a recognised
   research task in its own right — egocentric benchmarks define *object state
   change* classification and temporal localisation as first-class problems
   (an object transitions between states as a result of interaction: pan on hob
   vs pan in sink; machine door shut vs open). For your tasks, the close
   condition is very often best written as a state predicate on an object rather
   than as an action: "hob region no longer contains a pan" closes cooking more
   reliably than trying to see the act of removal.
2. **Non-visual sensors.** A smart plug reporting the hob's power draw dropping
   to zero is nearly perfect evidence, available instantly, in the dark, with no
   model. For any task with an electrical signature, this should be the primary
   close signal and vision the fallback. Same for door contacts and washing
   machine vibration.
3. **Zone-departure-with-object.** The person leaves the zone *carrying* the
   task object — often means done, sometimes means moved. Weak on its own,
   useful as corroboration.
4. **Absence of the task's characteristic activity** for a sustained period.
   Weakest. Prone to closing tasks that are merely unattended — which is exactly
   the situation the product exists to handle. Use only with a long timeout and
   never as a sole close.
5. **User confirmation.** Always available, always correct, costs attention.
   Make it one tap from the alert and treat it as the ground truth that trains
   everything else (\`tzt-few-shot-task-enrollment\`).

## Design guidance
- Write the close condition **per task type, as an explicit predicate over
  evidence sources**, in the tag schema. Do not leave it as "the model will
  figure it out". This is the part of the system most improved by ten minutes of
  thinking per task.
- Require **corroboration** for close: the CLOSING state in the task state
  machine exists to hold a candidate close until a second source agrees or a
  confirmation window elapses.
- Distinguish **closed** from **abandoned** from **unknown**. If the camera was
  blind for the relevant period, the honest answer is unknown, and the honest
  behaviour is to ask.

## Watch for
- Symmetric thresholds for open and close. Close should be markedly harder to
  trigger.
- Using "person left the zone" as a close. It is the *trigger for a warning*, and
  treating it as a completion inverts the entire product.`,
  },

  // ---------------- Runtime ----------------
  {
    id: 'tzt-detection-to-event-debouncing',
    title: 'From noisy detections to discrete events: hysteresis, evidence accumulation, timeouts',
    parent: 'Tag runtime',
    order: 40,
    prereqs: ['tzt-task-state-machine', 'tzt-online-action-start-detection', 'bayes-filter'],
    body: `# From noisy detections to discrete events: hysteresis, evidence accumulation, timeouts

## Why it exists
This is the seam of the whole system: perception emits a continuous stream of
uncertain, flickering hypotheses; the tag runtime needs crisp, rare, trustworthy
events. Everything that makes the product feel reliable or maddening lives in
this translation layer, and almost none of it is machine learning.

## The techniques, and when each applies
- **Two-threshold hysteresis (Schmitt trigger).** Open on \`conf > θ_high\`
  sustained; only abandon a provisional open on \`conf < θ_low\`, with
  \`θ_low < θ_high\`. A single threshold oscillates at exactly the confidence
  level your model spends most of its time at.
- **Temporal persistence / k-of-n voting.** Require k positive clips out of the
  last n. Trivially cheap, enormously effective against single-frame flicker.
  Pick n from the timescale of the task, not a default.
- **Log-odds evidence accumulation.** The principled version: maintain a running
  log-odds for each candidate tag, add the (calibrated) log-likelihood ratio of
  each new observation, decay toward the prior when evidence is absent, and
  trigger at a threshold. This is a recursive Bayes filter over a binary state
  (\`bayes-filter\`) and it handles the common real case that ten weak
  observations should count for more than one strong one. It also gives you a
  natural notion of *how long* to wait: the threshold is reached when it is
  reached, rather than after a fixed window.
- **Calibration is a prerequisite.** Log-odds accumulation over uncalibrated
  scores (and open-vocabulary similarity scores are badly uncalibrated) produces
  confident nonsense. Fit a temperature or isotonic calibration on held-out data
  from *your* footage first.
- **Cooldowns and refractory periods.** After closing a tag, suppress re-opening
  the same tag type in the same zone for a period; otherwise the tail of the
  activity re-opens it immediately.
- **Timeouts as first-class evidence.** "No close evidence for 3x the expected
  duration" is a real event, emitted by a timer, and it drives OVERDUE. Do not
  implement it as a background sweep that mutates state outside the event
  stream — emit a \`TICK\`/\`timeout\` event so replay reproduces it exactly.
- **Asymmetry everywhere.** Open: moderate threshold, latency-tolerant. Close:
  high threshold, corroboration required. At-risk: low threshold, reversible,
  because a false at-risk that silently resolves costs nothing if it never
  reaches the user.

## A useful mental model
The perception stack is a *sensor*; this layer is its *filter and thresholder*;
the state machine is the *controller*. Keeping those three roles in separate
modules is what makes it possible to swap the model later without re-tuning the
entire product.

## Watch for
- Tuning these constants live, one at a time, over days. Build the replay harness
  (\`tzt-event-stream-design\`) and sweep them offline in minutes.
- Putting debouncing inside the model wrapper where it cannot be replayed or
  swept.
- Forgetting decay: accumulated evidence that never decays will eventually open
  every tag.`,
  },

  // ---------------- Anticipatory alerting ----------------
  {
    id: 'tzt-anticipatory-zone-exit',
    title: 'Anticipatory zone-exit detection (the GTA mission-boundary warning)',
    parent: 'Anticipatory alerting',
    order: 50,
    prereqs: ['tzt-zone-polygon-occupancy', 'tzt-time-to-boundary-prediction', 'tzt-task-state-machine'],
    body: `# Anticipatory zone-exit detection (the GTA mission-boundary warning)

## Why it exists
This is the concept that carries the brief's most distinctive requirement, and
the one most likely to be quietly replaced by something easier. The requirement
is **not** "tell me when I leave the kitchen with the stove on". It is "tell me
while I am *about to*", with enough lead time that I can turn around — the
"leaving mission area" warning from GTA, which fires with a countdown *before*
failure, not a notification after it.

The difference is structural, not a matter of tuning. Reactive exit detection is
a classification of the present state: \`inside(p_t, Z)\`. Anticipatory exit
detection is a **prediction about a future state**: \`P(exit(Z) within τ | history)\`.
Different inputs (you need velocity and heading, not just position), different
output (a time-to-event, not a boolean), different evaluation (lead time and
false-alarm rate, not accuracy), and a different failure mode (too early is
annoying, too late is useless).

## Three mechanisms, increasing in sophistication
1. **Buffer zones (trivial, do this first).** Define an inner "warning" polygon
   inset from the true zone boundary; crossing it is the at-risk trigger. Costs
   nothing, works, and is a real baseline. Its weakness: lead time depends
   entirely on walking speed, so it is too early for someone pottering about and
   too late for someone striding out.
2. **Time-to-boundary via dead reckoning.** Extrapolate the tracked position
   using current velocity, intersect the ray with the zone polygon, and alert
   when the predicted time-to-crossing falls below a threshold \`τ\`. This is
   exactly the mechanism described in predictive-geofencing work: predict a
   future position from speed and heading (optionally refined by a history of
   past positions and by map structure), and raise an alert when the predicted
   position crosses the boundary or the time-to-crossing drops below a
   client-specified threshold. Constant lead time regardless of speed — a
   significant improvement over buffer zones. This is your target for v1, and
   the velocity estimate comes free from the tracker's Kalman filter
   (\`tzt-time-to-boundary-prediction\`).
3. **Learned intent / trajectory prediction.** Indoor movement is highly
   structured: people go to doors, and they go to *specific* doors from specific
   places. Learn, from the user's own logged trajectories, the distribution over
   likely destinations and alert on predicted *intent to exit* rather than
   extrapolated geometry. Handles the case dead reckoning cannot: someone
   standing still by the door, about to leave, with zero velocity. Worth doing
   only after 1 and 2 are instrumented and you have data.

Note the escalation ladder that nested zones give you: crossing the stove-area
warning boundary is a gentle nudge; heading for the kitchen door is firmer;
heading for the front door with a cooking tag open is urgent. One mechanism,
three zones, three tones.

## Coupling to task state
The monitor is **armed only while a tag bound to that zone is open**. That single
line is what makes this tolerable to live with: with no open task there is no
boundary, and no zone-based nagging. And the AT_RISK state must be
**reversible** — turning back silently disarms it. Reversibility is what makes an
aggressive (early) threshold affordable, because most early warnings that turn
out to be wrong never reach the user at all: fire the *internal* transition
early, but hold the *notification* for a short confirmation window and cancel it
if the person turns back. This "warn early internally, notify slightly later"
split is the trick that gets you both lead time and low nuisance.

## Evaluation
Do not measure accuracy. Measure:
- **Lead time distribution** — seconds between alert and actual boundary crossing,
  conditioned on the crossing actually occurring. Report the median and the 10th
  percentile; the tail is what determines whether the warning is useful.
- **False alarm rate per open-task-hour** — alerts where no crossing followed
  within the horizon. This is the nuisance metric and it is the one that gets the
  product uninstalled.
- **Miss rate** — crossings with an open tag and no prior alert. The safety
  metric.
- These trade off along a curve parameterised by \`τ\`; produce the curve and
  pick a point consciously, per zone.

## Watch for
- Silently degrading to reactive exit detection because it is easier to build and
  scores better on any accuracy-shaped metric. This is *the* failure mode for
  this concept: check that your alert timestamps precede your crossing
  timestamps, on real data, and if they do not, the feature does not exist.
- Extrapolating in pixel space (see \`tzt-ground-plane-homography\`).
- Zero-velocity intent (standing at the door). Dead reckoning predicts no
  crossing, ever. Add a proximity-plus-orientation fallback.
- Occlusion right at the doorway — the worst possible place to lose the track,
  and the most likely. Treat track loss near a boundary as at-risk, not as safe.`,
  },
  {
    id: 'tzt-time-to-boundary-prediction',
    title: 'Time-to-boundary prediction from tracked motion',
    parent: 'Anticipatory alerting',
    order: 51,
    prereqs: ['tzt-ground-plane-homography', 'kalman-filter'],
    body: `# Time-to-boundary prediction from tracked motion

## Why it exists
The quantitative core of the anticipatory warning. Given a tracked person on the
floor plane and a zone polygon, produce \`τ̂\` — the estimated seconds until they
cross the boundary — together with an uncertainty on it. The alert policy is then
a threshold on this quantity rather than on raw position.

## The estimator
1. **State.** Track the person in floor-plan metres with a constant-velocity
   model: \`x = [px, py, vx, vy]\`. A linear Kalman filter is the standard and
   entirely adequate tool: the prediction step advances position by velocity
   times dt and grows covariance; the update step folds in the (noisy) measured
   foot position. You get a smoothed velocity estimate, which raw frame-to-frame
   differencing will not give you — differenced positions from a jittery
   detector are almost pure noise at 30 FPS.
2. **Prediction.** Propagate the state forward without measurements (this is
   dead reckoning) and find the first time the predicted position crosses a
   polygon edge. For a constant-velocity model this is a closed-form
   ray-segment intersection per edge; take the minimum positive root.
3. **Uncertainty.** Propagate the covariance too and either (a) compute a
   conservative \`τ̂\` from the optimistic end of the confidence interval, or
   (b) Monte-Carlo sample a few hundred trajectories from the state distribution
   and report the *probability* of crossing within the horizon. (b) is barely
   more expensive and directly gives you the quantity the alert policy wants:
   \`P(exit within τ)\`.
4. **Alert** when that probability exceeds the policy threshold
   (\`tzt-alert-policy-thresholds\`).

## Things that go wrong
- **Constant velocity is wrong indoors.** People turn constantly around furniture.
  Keep the prediction horizon short (2-6 s) — over that span it is a decent
  approximation, and beyond it is fiction. If you need longer horizons, that is
  a signal to move to learned intent prediction, not to trust a longer
  extrapolation.
- **Process noise tuning is the whole game.** Too little and the filter lags
  turns badly, producing confident wrong predictions; too much and the velocity
  estimate is noise and \`τ̂\` jitters wildly. Tune it against recorded walking
  data with known crossing times, offline.
- **Stationary people.** Velocity near zero gives \`τ̂ = ∞\`. Correct, and
  useless for the person standing at the door putting their shoes on. Handle
  with a separate proximity/orientation rule rather than by corrupting the
  motion model.
- **Measurement gaps.** During occlusion the filter coasts on the motion model
  and covariance grows. Coasting *toward* a boundary should raise, not lower,
  the alert probability — inflate risk under uncertainty near boundaries.

## Reuse note
\`kalman-filter\`, \`bayes-filter\` and \`noise-uncertainty\` already in this
library cover the estimator itself; what is specific here is the floor-plane
formulation, the polygon-intersection time-to-event readout, and the deliberately
asymmetric treatment of uncertainty.`,
  },
  {
    id: 'tzt-alert-policy-thresholds',
    title: 'Alert policy: thresholds, escalation and alert fatigue',
    parent: 'Anticipatory alerting',
    order: 52,
    prereqs: ['tzt-anticipatory-zone-exit'],
    body: `# Alert policy: thresholds, escalation and alert fatigue

## Why it exists
The system's only output is interruption, and interruption has a cost that
compounds. A system that is right 90% of the time but interrupts eight times a
day will be muted within a week, at which point its accuracy is irrelevant.
Alert policy is therefore not UX polish downstream of the algorithm; it is the
objective function the algorithm should have been tuned against all along.

## Decide these explicitly
- **The operating point, in the user's units.** Not "we picked a 0.7 threshold"
  but "at most one false alert per day, accepting a 12% miss rate on low-risk
  tasks". Derive the threshold from that budget by reading it off the
  false-alarm-rate-vs-miss-rate curve from \`tzt-anticipatory-zone-exit\`.
- **Per-task risk weighting.** A forgotten stove and a forgotten laundry load are
  not the same event. Let each tag type carry a risk level that scales both the
  alert threshold and the escalation aggressiveness. High-risk tasks should
  tolerate more false alarms; low-risk tasks should be nearly silent.
- **Escalation ladder** over nested zones and time: silent log entry → ambient
  cue (a light, a soft tone) → phone notification → insistent alert. Escalate on
  distance/zone level and on overdue duration, not by repeating the same alert.
- **Confirmation window.** Fire the internal AT_RISK transition early, hold the
  user-facing notification for 1-3 s, cancel if they turn back. Buys lead time
  without buying nuisance.
- **Rate limiting and grouping.** A global cap per hour; group simultaneous
  at-risk tags into one message. Implement as cross-task rules in the
  well-formedness monitor, where the global view lives.
- **Every alert needs a one-tap resolution** ("done" / "not a task" / "snooze
  20m"). Without it, the only available user action is to ignore the alert, which
  trains them to ignore all of them — and you lose the label.
- **Snooze must be a timed state**, not a dismissal, or the task the system
  exists to remember is forgotten by the system too.

## Measure the policy, not just the model
Track alerts-per-day, dismissal rate, action-taken rate, and
tasks-abandoned-without-alert. Dismissal rate climbing over weeks is the early
warning that you are burning trust; it will show up long before the user says
anything.

## Watch for
- Tuning the perception threshold and the alert threshold as one number. They are
  separate decisions with separate costs.
- Optimising a single F1 across all tasks, which averages away the risk
  asymmetry that is the entire point.
- No silent mode. There must be a way to be left alone that does not involve
  uninstalling.`,
  },

  // ---------------- Evaluation & deployment ----------------
  {
    id: 'tzt-personal-dataset-annotation',
    title: 'Building and annotating a personal evaluation dataset',
    parent: 'Evaluation & deployment',
    order: 60,
    prereqs: ['tzt-event-stream-design', 'tzt-on-device-privacy'],
    body: `# Building and annotating a personal evaluation dataset

## Why it exists
Public benchmarks will not tell you whether this works in your kitchen. Their
camera angles, lighting, action durations and class sets are all different, and
critically none of them contain the thing that dominates your data: hours of
nothing happening. You need a small, honest, personal evaluation set, and you
need it early — before tuning, not after, or every decision you make is guided by
vibes.

## What to collect
- **A handful of full days**, unedited, including the boring parts. The ratio of
  idle time to task time is a *property of your data* that determines false-alarm
  rates, and any curated set destroys it.
- **Deliberate hard cases**: two tasks interleaved; a task you walk away from and
  return to; a task completed off-camera; low light; a guest in the frame; the
  camera bumped.
- **Ground truth as intervals**, matching the tag model: for each task instance,
  true start time, true end time, bound zone, and whether it was actually
  forgotten. Interval annotation is the only format that lets you compute
  boundary error and lead time.
- **Zone crossing ground truth**: timestamps when the subject actually crossed
  each boundary. Needed for lead-time measurement and easy to get by stepping
  through frames at crossings.

## Practicalities
- Annotating video is slow (realistically 3-10x real time). Keep the set small
  and reuse it ruthlessly. Two well-annotated days beats twenty unlabelled.
- **Bootstrap with the system itself.** Run the current pipeline, then correct
  its output rather than labelling from scratch. Corrections are also training
  data (\`tzt-few-shot-task-enrollment\`) and feed back through the same
  \`user_correction\` events.
- **Hold out properly.** Tune thresholds on one set of days, report on another.
  It is extremely easy, with a dataset this small, to tune yourself into a number
  that means nothing.
- **Storage and privacy.** This footage is the most sensitive artefact in the
  project. Encrypted at rest, local only, with an explicit delete date — and the
  event log retained after the video is gone, which is usually enough to re-check
  most regressions.

## Watch for
- Recording only while performing tasks for the camera. Performed tasks look
  different from real ones, and the absence of idle footage hides your worst
  failure mode.
- Annotating starts but not ends. Ends are harder, less obvious, and more
  important here.`,
  },
  {
    id: 'tzt-evaluation-metrics-tagging',
    title: 'Evaluating a task-tagging system end to end',
    parent: 'Evaluation & deployment',
    order: 61,
    prereqs: ['tzt-personal-dataset-annotation', 'tzt-tag-wellformedness-monitor'],
    body: `# Evaluating a task-tagging system end to end

## Why it exists
The components have standard metrics (mAP, segmental F1, IDF1) and none of them
answer the product question: *did it stop me forgetting things, without driving
me mad?* You need a small set of system-level metrics defined in terms of the tag
model, and they should be the numbers you look at when deciding whether a change
was an improvement.

## The metric set
**Tag correctness**
- **Instance-level precision/recall** over task instances, matched to ground
  truth by temporal IoU (≥0.5 is a reasonable default) *and* matching zone.
- **Boundary error**: median absolute error in seconds for \`opened_at\` and
  \`closed_at\`, reported separately — they have different causes and different
  costs.
- **False-open rate per idle hour**: phantom tasks. The metric that governs
  whether the system is liveable.
- **False-close rate**: tasks silently closed while still running. The most
  dangerous single failure, because it removes the task from the system's memory
  exactly as the user's memory also failed. Should be driven near zero even at
  significant cost to other metrics.
- **Hang rate**: tasks that ended in ABANDONED rather than CLOSED. Distinguish
  "user finished it and we missed the close" from "user genuinely forgot" —
  only the second is a success for the product.

**Anticipatory warning quality**
- **Lead time** distribution (median and 10th percentile) on true crossings.
- **False alarm rate per open-task-hour.**
- **Miss rate**: crossings with an open tag and no prior warning.

**Outcome**
- **Forgotten-task rate**: instances where the user genuinely forgot, with and
  without the system armed. This is the only metric that measures the actual
  goal. It needs an A/B over days and it is worth the effort.
- **Dismissal rate over time**: the trust erosion indicator.

## How to run it
- Everything runs offline against the recorded event stream
(\`tzt-event-stream-design\`). One command, one table, minutes not days.
- **Ablate honestly.** Turn off the anticipatory logic and use plain exit
  detection; if lead time does not change, the feature is not real.
- **Report the curve, not a point.** Every threshold in this system trades two
  costs; a single number hides the trade you actually made.
- **Regression-test the monitor properties** from
  \`tzt-tag-wellformedness-monitor\` on synthetic traces in CI. They are fast,
  deterministic, and catch the state-machine bugs that video evaluation is too
  coarse to see.

## Watch for
- Averaging across tasks and zones, which hides that the stove — the one that
  matters — is the worst-performing case.
- Optimising frame-level metrics because they are easy to compute and move
  smoothly. They do not correlate well with instance-level correctness here.`,
  },
  {
    id: 'tzt-realtime-edge-deployment',
    title: 'Real-time edge deployment of the perception stack',
    parent: 'Evaluation & deployment',
    order: 62,
    prereqs: ['tzt-on-device-privacy', 'tzt-open-vocab-action-recognition'],
    body: `# Real-time edge deployment of the perception stack

## Why it exists
The privacy decision (\`tzt-on-device-privacy\`) commits you to local inference,
and always-on means a device running 24/7 in your home, quietly, within a power
and thermal budget. This is the checkpoint where a prototype that worked on a
laptop with a GPU either becomes a thing that lives on your counter, or does not.

## What to work through
- **Pick the device against the model, not before.** A small SBC with an NPU, a
  Jetson-class module, or a Mac mini all have very different ceilings. Measure
  your candidate model's actual throughput on the candidate device before
  committing; published FPS numbers are almost always for different input sizes
  and batch settings than yours.
- **The two-rate budget** from \`tzt-video-capture-pipeline\` is what makes this
  feasible: a small detector at 10-30 FPS plus an expensive recogniser at
  0.5-1 Hz, not one big model at frame rate.
- **Quantisation and export.** INT8 post-training quantisation with a calibration
  set drawn from *your own footage* typically costs little accuracy and buys 2-4x.
  Export through ONNX/TensorRT/Core ML as appropriate. Re-run your evaluation
  after quantisation — do not assume the drop is negligible, especially for the
  open-set rejection threshold, which shifts.
- **Triggering, not polling.** Run the expensive recogniser only when cheap
  signals justify it: motion in a task zone, a person present, an object of
  interest detected. Most of the day, nothing should run. This is the single
  biggest efficiency win available and it also reduces false opens.
- **Thermals and duty cycle.** Sustained load throttles; benchmark for an hour,
  not thirty seconds. Throttling shows up as increasing latency, which shows up
  as late alerts, which is a correctness failure.
- **Operational robustness.** Auto-restart, watchdog, log rotation, graceful
  behaviour on camera loss, and a health signal the user can see. A monitoring
  system that dies silently is worse than none, because the user has stopped
  compensating themselves.

## Watch for
- Leaving the recogniser running continuously "for now". It will define your
  power and thermal envelope and you will design around a false constraint.
- Skipping post-quantisation re-evaluation.
- No visible health indicator.`,
  },
  {
    id: 'tzt-alert-delivery-ux',
    title: 'Alert delivery and the human loop',
    parent: 'Evaluation & deployment',
    order: 63,
    prereqs: ['tzt-alert-policy-thresholds'],
    body: `# Alert delivery and the human loop

## Why it exists
The alert is the product. Everything upstream exists to produce a few well-timed
seconds of the user's attention, and how those seconds are spent determines
whether the system works and whether it keeps being used.

## Channel design
- **Match channel latency to alert urgency.** The anticipatory warning has a
  budget of a couple of seconds; a phone notification that the user must unlock
  to see does not fit in it. Ambient, zero-latency channels — a smart bulb
  pulsing, a speaker chirp in the room, a watch tap — are the right medium for
  AT_RISK. Reserve the phone for OVERDUE and post-hoc summaries.
- **Location-aware delivery.** Warn on the device nearest the user. The system
  already knows where they are; use it.
- **Content, in this order**: which task, how long open, which zone, and one
  obvious action. "Rice — 12 min — stove. Done?" A notification that requires
  reading a sentence has already failed at the timescale it operates on.
- **The GTA reference is a design spec, not a joke.** What makes that warning
  work is: it is ambient (on-screen, not modal), it is *directional* (it tells
  you which way is back), it escalates with a visible countdown, and it silently
  disappears the instant you turn around. All four are implementable and all four
  are good ideas here — especially the last: an alert that vanishes when the
  problem resolves is why you can afford to fire early.

## The feedback loop
Every alert is a labelling opportunity and should return a signal: "done",
"not a task", "snooze". These append \`user_correction\` events
(\`tzt-event-stream-design\`), close or reclassify the tag, and become training
examples (\`tzt-few-shot-task-enrollment\`). A system with no return path is
frozen at install quality and will slowly become wrong as the home changes.

## Trust, and the honest-uncertainty rule
The user is relying on this to compensate for a real memory problem, which makes
silent failure the worst outcome. Two rules follow:
- **Surface the open set.** A glanceable list of currently-open tags, always
  available. Much of the value is available without any alert at all — the user
  checking "what's open?" before leaving is the low-tech version of the whole
  product, and it works even when perception is mediocre.
- **Say when you don't know.** Camera down, task unknown-state, ambiguous close:
  say so. Assistive-technology research on memory support is consistent that
  users calibrate their reliance on the system, and a system that is silently
  wrong destroys that calibration in a way a system that admits uncertainty does
  not.

## Watch for
- Modal, blocking alerts — they get dismissed reflexively.
- Alerts with no action, which train the user that alerts are noise.
- A quiet-hours policy that also silences the high-risk stove case.`,
  },
];

const checkpoints: Checkpoint[] = [
  {
    id: 'cp-tag-model',
    title: 'Formalise the task-tag model and event schema',
    depends_on: [],
    courses: [],
    concepts: [
      'tzt-task-tag-model',
      'tzt-task-state-machine',
      'tzt-tag-wellformedness-monitor',
      'tzt-event-stream-design',
    ],
    status: 'not_started',
    build:
      'No camera. Write the tag schema (JSON Schema/TS types) for 3 real tasks from your own life, implement the per-instance statechart as a pure reduce(state,event), implement 4 well-formedness monitors (bounded response, zone-coupled safety, matched-close, no-duplicate-open), and drive it all from a hand-written synthetic event trace with a replay harness.',
    done_test:
      'A ~50-event synthetic trace including a dropped close, an out-of-order close, a duplicate open and a zone exit produces exactly the verdicts and state transitions you predicted on paper beforehand. Tests run in CI in under a second.',
  },
  {
    id: 'cp-capture',
    title: 'Always-on capture rig and privacy baseline',
    depends_on: [],
    courses: [],
    concepts: ['tzt-video-capture-pipeline', 'tzt-on-device-privacy'],
    status: 'not_started',
    build:
      'Mount one fixed camera covering a real task zone. Build the capture service: bounded queue with oldest-drop, hardware decode, ring buffer for backward clip lookup, two sampling rates, explicit source_unavailable events. Implement frame TTL deletion, zone masking at the decoder, and a physical/visible off switch.',
    done_test:
      'Runs unattended for 48 hours: steady memory, capture-time timestamps correct, a deliberate camera unplug produces source_unavailable events and recovers, and no frame older than the TTL exists on disk.',
  },
  {
    id: 'cp-track',
    title: 'Detect and track people and task objects',
    depends_on: ['cp-capture'],
    courses: [],
    concepts: ['tzt-object-detection-tracking', 'kalman-filter', 'noise-uncertainty'],
    status: 'not_started',
    build:
      'Tracking-by-detection over the live stream: detector + constant-velocity Kalman per track + IoU/Hungarian association + tentative/confirmed/lost lifecycle. Emit person and object observation events with track ids and foot points into the event log.',
    done_test:
      'On 30 minutes of your own annotated footage: few ID switches through the doorway and the fridge occlusion, and track loss inside a zone is emitted as unknown rather than as an exit.',
  },
  {
    id: 'cp-zones',
    title: 'Ground-plane zone map with stable occupancy',
    depends_on: ['cp-track'],
    courses: [],
    concepts: ['tzt-ground-plane-homography', 'tzt-zone-polygon-occupancy', 'transforms', 'sensor-fusion'],
    status: 'not_started',
    build:
      'Calibrate a ground-plane homography from four tape-measured floor points into a floor-plan frame in metres. Author nested zones (stove / kitchen / home) as polygons in that frame. Implement occupancy with hysteresis bands, dwell delay and debounced exit. Add at least one non-visual sensor (smart plug or door contact) and fuse it.',
    done_test:
      'Held-out floor points map within ~15 cm of tape-measure truth inside the task zones. Standing on a zone boundary for two minutes produces at most one occupancy transition, not dozens.',
  },
  {
    id: 'cp-recognition',
    title: 'Open-vocabulary task recognition with a "none of the above" path',
    depends_on: ['cp-capture'],
    courses: [],
    concepts: [
      'tzt-video-representation-clip',
      'tzt-open-vocab-action-recognition',
      'tzt-few-shot-task-enrollment',
    ],
    status: 'not_started',
    build:
      'Clip encoder into a joint image-text space. Zero-shot scoring against candidate task prompts plus explicit background/negative prompts for open-set rejection. Prototype-based few-shot enrollment for your ~8 real tasks, with negatives auto-mined from no-open-tag periods. Calibrate scores on held-out personal footage. Add embedding-space canonicalisation of task names.',
    done_test:
      'On a day of your own footage, your 8 enrolled tasks are recognised at usable accuracy AND the false-positive rate on idle footage is measured per hour (not per clip) and is low. Feeding it a task it has never seen yields "unknown", not a confident wrong label.',
  },
  {
    id: 'cp-boundaries',
    title: 'Online start and end detection (the open and close signals)',
    depends_on: ['cp-recognition', 'cp-track'],
    courses: [],
    concepts: [
      'tzt-temporal-action-segmentation',
      'tzt-online-action-start-detection',
      'tzt-completion-evidence-state-change',
    ],
    status: 'not_started',
    build:
      'Build offline segmentation on recorded video first to get an accuracy ceiling and a clean boundary dataset; then port to a strictly causal online version with no lookahead in post-processing. Implement per-task close predicates over multiple evidence sources (object state change, smart-plug power drop, zone-departure-with-object, sustained absence, user confirmation), with retrospective boundary correction in the log.',
    done_test:
      'Median opened_at and closed_at boundary error reported separately in seconds on your annotated set. A deliberate audit confirms zero lookahead in the online path. Open, close and at-risk use three distinct, documented operating points.',
  },
  {
    id: 'cp-runtime',
    title: 'Tag runtime: noisy detections to well-formed tags',
    depends_on: ['cp-tag-model', 'cp-boundaries', 'cp-zones'],
    courses: [],
    concepts: ['tzt-detection-to-event-debouncing', 'tzt-task-state-machine', 'tzt-tag-wellformedness-monitor', 'bayes-filter'],
    status: 'not_started',
    build:
      'Wire real perception events into the statechart from cp-tag-model. Implement two-threshold hysteresis, k-of-n persistence, calibrated log-odds evidence accumulation with decay, cooldowns, and timeouts emitted as events. Persist instances and rebuild by replay after restart.',
    done_test:
      'Replay a recorded day offline and sweep all thresholds in minutes. The system produces a well-formed tag document: no duplicate opens, no unmatched closes, and every open eventually reaches CLOSED or ABANDONED. Killing and restarting the process loses no open tags.',
  },
  {
    id: 'cp-anticipate',
    title: 'Anticipatory zone-exit warning',
    depends_on: ['cp-runtime'],
    courses: [],
    concepts: [
      'tzt-time-to-boundary-prediction',
      'tzt-anticipatory-zone-exit',
      'tzt-alert-policy-thresholds',
      'kalman-filter',
    ],
    status: 'not_started',
    build:
      'Implement all three mechanisms in order: inset buffer polygon, then Kalman-based time-to-boundary with Monte-Carlo P(exit within tau), armed only while a tag bound to that zone is open. Reversible AT_RISK with a 1-3s notification confirmation window. Escalation ladder over nested zones. Zero-velocity proximity/orientation fallback and risk inflation on track loss near a boundary.',
    done_test:
      'On real crossings: alert timestamps PRECEDE crossing timestamps, with a reported median and 10th-percentile lead time. False-alarm rate per open-task-hour and miss rate are both reported, and the tau trade-off curve is plotted and a point chosen consciously per zone. Ablating to reactive exit detection visibly destroys lead time.',
  },
  {
    id: 'cp-eval',
    title: 'Personal evaluation harness and honest numbers',
    depends_on: ['cp-runtime', 'cp-anticipate'],
    courses: [],
    concepts: ['tzt-personal-dataset-annotation', 'tzt-evaluation-metrics-tagging'],
    status: 'not_started',
    build:
      'Annotate a few full unedited days as intervals (start, end, zone, actually-forgotten) plus zone-crossing timestamps, including deliberate hard cases. Build a one-command offline evaluation over the event log producing the full metric table. Put the well-formedness property tests in CI.',
    done_test:
      'One command prints instance precision/recall, boundary error, false-open per idle hour, false-close rate, hang rate, lead time distribution, false-alarm per open-task-hour and miss rate — on a held-out set of days never used for tuning.',
  },
  {
    id: 'cp-deploy',
    title: 'Live on-device deployment and the human loop',
    depends_on: ['cp-eval'],
    courses: [],
    concepts: ['tzt-realtime-edge-deployment', 'tzt-alert-delivery-ux'],
    status: 'not_started',
    build:
      'Move the stack to the always-on device: quantise with a calibration set from your own footage, re-run the full evaluation post-quantisation, trigger the expensive recogniser instead of polling it. Build alert delivery: ambient low-latency channel for AT_RISK, phone for OVERDUE, one-tap done/not-a-task/snooze feeding user_correction events, and an always-available glanceable list of open tags.',
    done_test:
      'Runs a week unattended within thermal budget with no latency creep. Post-quantisation metrics are within tolerance of the pre-quantisation table. Dismissal rate and forgotten-task rate are being tracked, and at least one real forgotten task was caught by an anticipatory warning rather than a post-hoc one.',
  },
];

type NewSource = {
  id: string;
  type: 'video' | 'article' | 'paper' | 'link' | 'pdf' | 'podcast' | 'other';
  title: string;
  url: string;
  concepts: string[];
  body: string;
};

const sources: NewSource[] = [
  // --- task state machine / tag model / well-formedness ---
  {
    id: 'source-statecharts-dev',
    type: 'link',
    title: 'Statecharts — a visual formalism for complex systems (statecharts.dev)',
    url: 'https://statecharts.dev/',
    concepts: ['tzt-task-state-machine', 'tzt-task-tag-model'],
    body:
      'Free, no-login site that teaches plain state machines first, then statecharts (hierarchy, orthogonal/parallel regions, guards, entry/exit actions) and why they exist — state explosion. Directly relevant: the per-instance task lifecycle needs parallel regions (a spatial presence region and a temporal progress region over the same instance), which is exactly the problem Harel statecharts were invented for. Read this before writing the lifecycle as a flat enum.',
  },
  {
    id: 'source-stately-state-machines',
    type: 'article',
    title: 'State machines and statecharts — Stately/XState docs',
    url: 'https://stately.ai/docs/state-machines-and-statecharts',
    concepts: ['tzt-task-state-machine'],
    body:
      'The practical counterpart to statecharts.dev: same concepts (states, events, transitions, final states, parent/atomic/parallel states, self-transitions) but with runnable code and visual examples. Useful because it pins down the implementation shape the tag runtime wants — a pure state+event transition function with guards — which is what makes the whole lifecycle replayable from a synthetic event trace with no video in the loop.',
  },
  {
    id: 'source-runtime-verification-wikipedia',
    type: 'article',
    title: 'Runtime verification (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Runtime_verification',
    concepts: ['tzt-tag-wellformedness-monitor'],
    body:
      'Compact orientation to the field the well-formedness monitor belongs to: specifications compiled into finite-state monitors, fed an execution trace, producing verdicts. Worth it specifically for the safety-vs-liveness distinction, which is the load-bearing idea here — "every open tag is eventually closed" is liveness and therefore unmonitorable, which is why it must be converted into bounded-time safety properties before the system can ever alert on it.',
  },
  {
    id: 'source-monitor-runtime-assurance',
    type: 'paper',
    title: 'Monitor-Based Runtime Assurance for Temporal Logic Specifications (Abate, Feron, Coogan)',
    url: 'https://arxiv.org/abs/1908.03284',
    concepts: ['tzt-tag-wellformedness-monitor'],
    body:
      'Free arXiv paper showing the concrete architecture of an FSM monitor that watches a running system, evaluates whether the current trajectory is a bad prefix of an LTL safety property, and raises a fault flag before the bad state is reached. That "detect the bad prefix early and act" structure is the same mechanism the anticipatory zone-exit warning needs, so this is the bridge between the tag-monitor concept and the early-warning concept rather than a detour into formal methods.',
  },

  // --- zone / proximity / anticipatory ---
  {
    id: 'source-android-geofencing',
    type: 'article',
    title: 'Create and monitor geofences — Android developer documentation',
    url: 'https://developer.android.com/develop/sensors-and-location/location/geofencing',
    concepts: ['tzt-zone-polygon-occupancy', 'tzt-anticipatory-zone-exit'],
    body:
      'The best free writeup of the engineering realities of zone monitoring, from a team that shipped it at scale. Documents ENTER/EXIT/DWELL transitions, loitering delay, notification responsiveness, and — most usefully — explains *why* raw ENTER/EXIT is unusable for notifications and why DWELL with a delay exists. Transfers directly to camera-based zones: the dwell/debounce design in tzt-zone-polygon-occupancy is this idea reimplemented on the floor plane.',
  },
  {
    id: 'source-supervision-polygonzone',
    type: 'link',
    title: 'PolygonZone — Roboflow supervision documentation',
    url: 'https://supervision.roboflow.com/latest/detection/tools/polygon_zone/',
    concepts: ['tzt-zone-polygon-occupancy'],
    body:
      'Free open-source API docs for defining a polygon zone over a video frame and triggering on detections inside it, with a configurable anchor point (bottom-centre, centre, etc.) and live counts. The anchor parameter is the practical detail worth reading for: choosing the foot point rather than the box centre is what makes the zone test agree with the ground-plane homography, and getting it wrong shifts every boundary by half a body height.',
  },
  {
    id: 'source-ultralytics-region-counting',
    type: 'article',
    title: 'Object counting in regions — Ultralytics documentation',
    url: 'https://docs.ultralytics.com/guides/region-counting/',
    concepts: ['tzt-zone-polygon-occupancy', 'tzt-object-detection-tracking'],
    body:
      'Free docs with runnable CLI and Python examples for tracking objects across frames and counting, per frame, which named region each falls into. The fastest path to a working multi-zone occupancy baseline you can point at your own camera in an afternoon — useful as the thing you build first and then replace once the floor-plane homography lets you define zones in metres instead of pixels.',
  },
  {
    id: 'source-predictive-geofence-patent',
    type: 'link',
    title: 'US8531293B2 — Predictive geofence crossing (Google Patents)',
    url: 'https://patents.google.com/patent/US8531293B2/en',
    concepts: ['tzt-anticipatory-zone-exit', 'tzt-time-to-boundary-prediction'],
    body:
      'Freely readable and, unusually, the clearest published description of the exact mechanism the brief asks for: predict a future position by dead reckoning from speed and heading (refined by position history and map structure), compute a time-to-crossing against the boundary, and raise the alert when the predicted position crosses or the time-to-crossing drops below a configured threshold. Read it for the alert-on-predicted-crossing formulation, which is precisely what separates an anticipatory warning from a reactive one. Skim the claims language; the description is readable.',
  },
  {
    id: 'source-elementary-kalman',
    type: 'paper',
    title: 'An Elementary Introduction to Kalman Filtering (Pei et al.)',
    url: 'https://arxiv.org/abs/1710.04055',
    concepts: ['tzt-time-to-boundary-prediction', 'kalman-filter'],
    body:
      'Free arXiv tutorial that derives Kalman filtering from basic probability and calculus before touching any application, then shows linear state estimation. The right level for this project: you need the constant-velocity model, the predict/update split and covariance propagation, because the tracker gives you a smoothed velocity almost for free and that velocity plus its covariance is exactly what time-to-boundary prediction consumes.',
  },

  // --- recognition / segmentation ---
  {
    id: 'source-opening-vocabulary-egocentric',
    type: 'paper',
    title: 'Opening the Vocabulary of Egocentric Actions (Chatterjee, Sener, Ma, Yao — NeurIPS 2023)',
    url: 'https://arxiv.org/abs/2308.11488',
    concepts: ['tzt-open-vocab-action-recognition', 'tzt-video-representation-clip'],
    body:
      'The paper behind the verb/object decoupling recommendation. Proposes open-vocabulary action recognition with an object-agnostic verb encoder plus a prompt-based object encoder over CLIP representations, and shows it generalises to novel interacting objects far better than closed-set baselines on EPIC-KITCHENS-100 and Assembly101. Directly applicable: your tag names are effectively (verb, object) pairs and object novelty — an unfamiliar pan — is much more common in a real home than verb novelty.',
  },
  {
    id: 'source-onlinetas',
    type: 'paper',
    title: 'OnlineTAS: An Online Baseline for Temporal Action Segmentation (Zhong, Ding, Yao — NeurIPS 2024)',
    url: 'https://arxiv.org/abs/2411.01122',
    concepts: ['tzt-temporal-action-segmentation', 'tzt-online-action-start-detection'],
    body:
      'Free arXiv paper establishing a baseline for temporal action segmentation in the online setting, where the model cannot see the future. Introduces an adaptive memory for changing context plus causal post-processing to suppress over-segmentation. Important for this project because over-segmentation is literally "one pot of rice produces six open/close pairs", and because it shows what causal post-processing looks like — the most common accidental lookahead leak in supposedly-online systems.',
  },
  {
    id: 'source-odas',
    type: 'paper',
    title: 'Online Detection of Action Start in Untrimmed, Streaming Videos (Shou et al.)',
    url: 'https://arxiv.org/abs/1802.06822',
    concepts: ['tzt-online-action-start-detection'],
    body:
      'The paper that defines the ODAS task — detect the start of an action in streaming untrimmed video with high accuracy and low latency — and is explicitly motivated by early alerting, the same use case as this project. Its core insight is that the hard discrimination is start-vs-background, not start-vs-other-action, since frames just before and just after a start look nearly identical; it attacks this with hard negative generation and by modelling temporal consistency around the start point.',
  },
  {
    id: 'source-egocentric-vision-survey',
    type: 'paper',
    title: 'Challenges and Trends in Egocentric Vision: A Survey',
    url: 'https://arxiv.org/abs/2503.15275',
    concepts: ['tzt-video-representation-clip', 'tzt-open-vocab-action-recognition'],
    body:
      'Recent free survey (accepted to Machine Intelligence Research) organising egocentric video understanding into subject, object, environment and hybrid understanding, with a review of the available datasets. Use it as the map: it is the efficient way to find which sub-task name corresponds to each piece of this system, and therefore which literature to read next, rather than as something to read end to end.',
  },
  {
    id: 'source-ego4d',
    type: 'link',
    title: 'Ego4D — massive-scale egocentric dataset and benchmark suite',
    url: 'https://ego4d-data.org/',
    concepts: ['tzt-completion-evidence-state-change', 'tzt-personal-dataset-annotation'],
    body:
      '3,670 hours of daily-life egocentric video, free to researchers under a signed licence. Two of its five benchmarks are almost this product stated as research tasks: Hand-Object Interactions includes object state change classification and temporal localisation (the most reliable close signal in tzt-completion-evidence-state-change), and Episodic Memory is explicitly memory augmentation. Also the best reference for how to structure interval annotations for your own personal evaluation set.',
  },
  {
    id: 'source-supervision-detect-annotate',
    type: 'article',
    title: 'Detect and annotate — Roboflow supervision documentation',
    url: 'https://supervision.roboflow.com/latest/how_to/detect_and_annotate/',
    concepts: ['tzt-object-detection-tracking'],
    body:
      'Free docs for the glue library most of this perception stack will use: running a detector, converting results to a common Detections type, tracking, and annotating frames. Model-agnostic, which matters because you will swap detectors at least twice; writing against this abstraction rather than one vendor API saves rework at the deployment checkpoint.',
  },
];

// ---- execute ----------------------------------------------------------
let created = 0;
let skipped = 0;
for (const c of concepts) {
  if (getConcept(c.id)) {
    console.log(`SKIP concept (exists): ${c.id}`);
    skipped++;
    continue;
  }
  createConcept(c);
  console.log(`concept: ${c.id}`);
  created++;
}

for (const s of sources) {
  if (getSource(s.id)) {
    console.log(`SKIP source (exists): ${s.id}`);
    continue;
  }
  createSource(s);
  console.log(`source:  ${s.id}  -> ${s.concepts.join(', ')}`);
}

// Sanity: every concept referenced by a checkpoint must exist.
const missing = new Set<string>();
for (const cp of checkpoints) {
  for (const cid of cp.concepts) if (!getConcept(cid)) missing.add(cid);
}
if (missing.size) {
  throw new Error(`Checkpoints reference non-existent concepts: ${[...missing].join(', ')}`);
}

// Sanity: every depends_on must name a real checkpoint.
const cpIds = new Set(checkpoints.map((c) => c.id));
for (const cp of checkpoints) {
  for (const d of cp.depends_on) {
    if (!cpIds.has(d)) throw new Error(`Checkpoint ${cp.id} depends on unknown ${d}`);
  }
}

const projectId = 'task-zone-tracker';
if (getProject(projectId)) {
  console.log(`SKIP project (exists): ${projectId}`);
} else {
  createProject({
    id: projectId,
    title: 'Task Zone Tracker — visual open/close task tags with anticipatory zone-exit warnings',
    status: 'in_progress',
    metadata: {
      domain: 'computer vision / assistive prospective memory',
      framing: 'tasks as markup tags: every opened task must be closed',
      hardware: 'one or more fixed indoor cameras + an always-on edge device + optional smart plug / door contact sensors',
      key_constraint:
        'open-vocabulary task recognition, explicit per-instance open/close state machine, and PREDICTIVE (pre-exit) zone warnings — not post-hoc "you forgot" alerts',
    },
    checkpoints,
    body: `# Task Zone Tracker

A syllabus for building a system that watches what you are doing, opens a "tag"
when a task starts, keeps it open until it sees the task close, and warns you
*before* you walk out of the task's physical zone with it still open.

## The three things this syllabus is specifically built around

1. **Tasks as markup tags.** A task is a span, not an event: it is opened, it
   carries attributes (most importantly a bound zone), and it must be closed.
   The formalism is taken seriously — including where it breaks (real tasks
   interleave rather than nest, so the open set is an id-keyed map, not a stack;
   tags are inferred probabilistically rather than parsed; the element vocabulary
   is open) — because each break is a concrete design decision.
2. **Open vocabulary, with a "none of the above" path.** The tasks are not a
   fixed class list. A closed-set classifier would confidently mislabel every
   novel activity, and a confidently wrong tag is worse than no tag for a memory
   aid. Zero-shot for the tail, open-set rejection for the 95% of the day that is
   nothing, few-shot enrollment for the handful of tasks that actually matter.
3. **Anticipatory zone exit, not reactive.** \`P(exit(Z) within τ | history)\`,
   not \`inside(p_t, Z)\`. Different inputs (velocity and heading), different
   output (a time-to-event), different metrics (lead time and false alarms per
   open-task-hour, never accuracy). The AT_RISK state is reversible so that
   turning back cancels the warning silently, which is what makes an early,
   aggressive threshold affordable.

## Shape of the graph

Two independent roots — \`cp-tag-model\` (pure software, no camera, fully
testable on synthetic traces) and \`cp-capture\` (the rig) — so the hardest
modelling work is not blocked on hardware and vice versa. Perception then
branches into a spatial line (track → zones) and a semantic line (recognition →
boundaries), which converge at \`cp-runtime\` where noisy detections become
well-formed tags. \`cp-anticipate\` builds on that, and \`cp-eval\` then
\`cp-deploy\` close it out.

Deliberately, \`cp-tag-model\` comes first and needs no perception at all: the
state machine, the monitors and the replay harness are buildable and testable in
a day, and they define the target the perception stack is built to hit.
`,
  });
  console.log(`project: ${projectId} (${checkpoints.length} checkpoints)`);
}

console.log(`\nDone. ${created} concepts created, ${skipped} skipped.`);
