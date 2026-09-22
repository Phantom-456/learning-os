# Independent review — `edge-pose-gesture-assistant` syllabus

**Score: 4 / 5**

Reviewer note: I did not open `test-case-1-builder-report.md`. Everything below is
verified from the raw content files and from live fetches of the attached source URLs.

---

## One-line verdict

The air-gap constraint — the genuinely hard part of the brief — is addressed
concretely and well, at the level of specific optocoupler part families, the
inversion bug, COBS/CRC/sequence/blind-repetition, scope-based negative tests and
sneakernet A/B rollback. What holds it back from a 5 is that the plan is *not*
fully self-sufficient: three of the concepts on the critical path to the first
milestone are unfilled TODO templates, over half of the concepts have no attached
reading at all, and the single most load-bearing purchasing decision (a
radio-free board for the HIGH side) is stated as a requirement with no candidate
part named anywhere.

---

## What I actually read

**Project:** `content/projects/edge-pose-gesture-assistant.md` (full, incl. all 9
checkpoints and the prose sections).

**Concepts read in full:** `unidirectional-data-diode-architecture`,
`optocoupler-uart-diode-hardware`, `unidirectional-protocol-design-no-ack`,
`air-gapped-sensor-threat-model`, `air-gap-verification-testing`,
`outbound-only-network-egress`, `idle-state-hysteresis`,
`temporal-activity-segmentation`, `pose-landmark-estimation`, `loop-timing`.

**Concepts read substantially:** `one-way-observability`,
`offline-device-provisioning`, `edge-camera-capture-pipeline`.

**Concepts verified present + non-placeholder (zero `TODO` markers), body headers
sampled:** `edge-model-runtimes-quantization`, `task-state-and-notification-policy`,
`intent-schema-design`, `dynamic-gesture-recognition`, `wake-word-detection`,
`audio-vad-segmentation`, `on-device-asr`, `multimodal-intent-fusion`.

**Concepts confirmed to be pure TODO templates:** `loop-timing`,
`sampling-aliasing`, `noise-uncertainty`, `sensor-fusion` (all four are
pre-existing generic files dated `2026-09-14`, i.e. predating this syllabus,
and every section body is `_TODO — ...`).

**Source URLs fetched and confirmed live + on-topic (4/4):**

| URL | Result |
|---|---|
| `https://hackaday.io/project/21568-sd-card-data-diode-system` | Live. Two Arduino Unos + **HCPL-7720-000E** optocoupler + SD shields, one-way serial transfer. Exactly the build the concept describes — the concept's claim about it is accurate, not hallucinated. |
| `https://github.com/ANSSI-FR/lidi` | Live, 98★, 485 commits, Rust, **RaptorQ FEC** over a unidirectional link. Matches the concept's claim precisely. |
| `https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python` | Live (last updated 2026-08-17). Confirms LIVE_STREAM mode, `result_callback`, 33 landmarks, `min_pose_detection_confidence` / `min_tracking_confidence` — i.e. every specific claim the concept body makes. |
| `https://www.ncsc.gov.uk/guidance/design-pattern-safely-exporting-data` | Live (reviewed 2026-04-08). Covers flow control via data diodes and release control/verification. On-topic for both concepts it tags. |

No fabricated URLs found in the sample. Sources also carry useful annotation prose
(e.g. the MediaPipe source tells you *why* to read it: LIVE_STREAM vs IMAGE mode).

---

## 1. Is the DAG real, or a disguised straight line?

Real. There are **three independent roots** with genuinely empty `depends_on`:
`cp-live-pose-pipeline` (vision), `cp-oneway-text-link` (the diode),
`cp-onboard-voice` (audio). They are independent *because they actually are* —
building an optocoupled UART link requires nothing from MediaPipe.

The join structure is correct and non-trivial:

- `cp-idle-ping-milestone` ← `cp-idle-state-detection` + `cp-oneway-text-link`
- `cp-gesture-vocabulary` ← `cp-live-pose-pipeline` **only** — and the project
  prose explicitly justifies not hanging it off M1 ("it does not need the
  notification path"). That is a real modelling decision, not decoration.
- `cp-multimodal-fusion` ← gesture + voice
- `cp-intent-over-diode` ← fusion + M1
- `cp-verify-the-gap` ← `cp-intent-over-diode`

The brief's "first meaningful checkpoint" is `cp-idle-ping-milestone`, and it is
correctly at depth 2 on the shorter of two legs — reachable without touching
gesture recognition, ASR or fusion at all. That is the right call and it is the
main structural thing the brief asked for.

`done_test` fields are measurements, not vibes: ">=15 FPS with p95
capture-to-decision latency under 200 ms", "fewer than 1 false idle transition per
hour", "`ss -tulpn` on the bridge prints nothing", "a scope on the HIGH-side RX pin
shows a flat line while LOW transmits continuously". Several are *negative* tests,
which is the correct form for a security property.

---

## 2. Concept body quality

Twenty of twenty-four are substantive and specific to *this* project, not generic
domain filler. Representative evidence that they are not swappable boilerplate:

- `pose-landmark-estimation` — names the exact failure mode ("occlusion produces
  confidently wrong landmarks, not missing ones"), explains normalised vs world
  landmark frames, and ends with a self-test that is a *measurement*: "Measure
  your landmark jitter with a person holding still — what is the numerical noise
  floor you must threshold above?" That number is then consumed by
  `temporal-activity-segmentation`'s motion-energy threshold. The concepts
  actually chain.
- `idle-state-hysteresis` — two thresholds + dwell + refractory, and the
  ACTIVE/IDLE/ABSENT three-state insight ("pinging an empty room is the most
  common and most annoying failure of naive builds"). This is the difference
  between a demo and something you would not mute.
- `temporal-activity-segmentation` — explicitly warns that published TAS numbers
  are **offline/non-causal** and unattainable in an online system, and gives an
  escalation ladder (hand statistic → windowed classifier → MS-TCN) with the
  instruction to escalate only on measured failure.
- `edge-camera-capture-pipeline` — separates latency from throughput, prescribes a
  shallow queue with drop-oldest, and tells you to ask the ISP for the model's
  input size rather than downscaling 1080p in Python.

**The four stubs are the exception.** `loop-timing`, `sampling-aliasing`,
`noise-uncertainty` and `sensor-fusion` contain nothing but `_TODO` section
headers. Three of these sit on the M1 critical path (`cp-live-pose-pipeline`
references `loop-timing` and `sampling-aliasing`; `cp-idle-state-detection`
references `noise-uncertainty`).

---

## 3. Does anything actually teach the one-way link? (the weighted question)

Yes — and this is the strongest part of the artifact. Five concepts form a
coherent `parent: One-way data flow` cluster with a real prereq chain
(`unidirectional-data-diode-architecture` → `optocoupler-uart-diode-hardware` →
`air-gap-verification-testing`).

Judged against the standard "would someone who has never built an air-gapped
system come away knowing how to build one":

- **A concrete implementation is given, not an abstract requirement.**
  `optocoupler-uart-diode-hardware` gives the honest minimal build (HIGH.TX →
  LOW.RX, omit the return wire) *and* explains why it is procedurally weak, then
  the optocoupled version with current-limiting resistor on the input and pull-up
  on the output. It names real parts and their trade-off: 4N35/PC817 are
  phototransistor parts with µs–tens-of-µs edges that mangle UART framing above a
  few tens of kbaud, versus HCPL-772x-class logic-gate optos for throughput — and
  then argues for *deliberately* choosing the slow cheap part at 9600–38400 baud,
  because "a channel that physically cannot carry video is easier to defend than
  one that could but promises not to." That is the kind of reasoning a learner
  cannot derive alone.
- **The first-build bugs are pre-empted.** Signal-integrity checklist covers the
  inversion trap (UART idles HIGH; an inverting opto stage gives a permanent break
  condition), 3.3 V vs 5 V level shifting as a bonus, ground-reference loss if you
  tie grounds for convenience, and UART's ±2–3% clock tolerance being eaten by
  slow opto edges.
- **The real-world failure is named.** "Point 4 is where most homebrew air gaps
  actually fail: the serial diode is perfect and the Raspberry Pi doing the vision
  still has onboard Wi-Fi that a single config change re-enables." Paired with the
  discipline of labelling every control as hardware / configuration / policy, and
  refusing to count "disabled in software" as a gap.
- **The software half is covered.** `unidirectional-protocol-design-no-ack`
  enumerates what you lose (ACKs, flow control, handshake, error signalling, all
  of TCP/TLS/HTTP/MQTT) and replaces each: COBS framing with the correct
  justification (zero byte appears only as delimiter, so a mid-stream listener
  resynchronises deterministically), CRC, monotonic sequence numbers for *loss
  detection you cannot recover from*, blind N-repetition with receiver-side dedup
  vs RaptorQ FEC, fixed-cadence heartbeats, and idempotence as records-are-facts
  ("idle_since=14:02:11, seq=91", never "send a ping"). Both production
  references (Lidi, hairgap) are real and I verified Lidi.
- **Operating it is covered, which is where these projects actually die.**
  `one-way-observability` names the exact failure: "Teams routinely build a
  correct diode and then quietly drill a hole through it because operating it
  became unbearable" — and prescribes telemetry-as-payload with the config hash as
  the single most valuable field. `offline-device-provisioning` gives A/B
  partitions with watchdog-marks-good and automatic bootloader fallback, plus the
  offline-build gotcha (vendor wheels/weights into the image; the first offline
  boot that tries to `pip install` is where you find out what you forgot).
- **Intellectual honesty.** Both `unidirectional-data-diode-architecture` and
  `air-gap-verification-testing` refuse the broad claim: a one-way channel of N
  bits/s is a covert channel of up to N bits/s, timing leaks, a compromised HIGH
  side could dribble low-res imagery over hours. The defensible claim is stated in
  its narrow tested form — "no inbound path, and outbound is constrained to a
  verified narrow schema at a bounded rate" — with fixed-rate padded transmission
  as the mitigation. The project's `cp-verify-the-gap` `done_test` enforces exactly
  this wording. This is the correct professional posture and it is rare.
- **The verifier idea** is present and correctly separated from one-wayness: the
  diode stops the network reaching the camera; the schema verifier on the LOW side
  is what stops the channel being repurposed as a video pipe. The project threads
  it through `cp-idle-ping-milestone` and hardens it in `cp-intent-over-diode`
  ("JSON Schema or a strict fixed-field regex").

This is not boilerplate. It is the specific, concrete treatment the rubric's
level-5 clause asks for.

---

## 4. Source coverage — the clearest weakness

Only **10 of 24** referenced concepts have any Source attached. Uncovered:

`loop-timing`, `sampling-aliasing`, `noise-uncertainty`, `sensor-fusion`,
`temporal-activity-segmentation`, `idle-state-hysteresis`,
`outbound-only-network-egress`, `task-state-and-notification-policy`,
`intent-schema-design`, `dynamic-gesture-recognition`, `audio-vad-segmentation`,
`one-way-observability`, `offline-device-provisioning`, `air-gap-verification-testing`.

Two things stand out. First, **the entire idle-detection cluster** —
`temporal-activity-segmentation` and `idle-state-hysteresis`, i.e. the substance
of the brief's first meaningful checkpoint — has zero attached reading. Second,
three of the five air-gap concepts have no source, including
`air-gap-verification-testing`, which is the one that should be pointing at real
scanning/scoping technique. The concept bodies mention MS-TCN, RaptorQ,
rpi-image-gen, ntfy/Gotify, nftables, COBS — none of which is a clickable Source
record.

`content/courses/` and `content/prices/` are both **empty directories**, and every
checkpoint has `courses: []`.

---

## 5. Walking it as the learner (no LLM available)

**Would work.** Day 1, I open `cp-oneway-text-link`, read the threat model
(correctly ordered *first* — it is what justifies the inconvenience), then
`unidirectional-data-diode-architecture`, then the hardware concept. I buy a
PC817, wire HIGH.TX → LOW.RX with no return wire, get COBS+CRC+seq working, then
insert the opto stage. When the link produces a permanent break condition I
recognise the inversion bug from the checklist instead of losing a weekend. I
scope the HIGH-side RX pin. This leg is genuinely followable unaided.

In parallel: MediaPipe Pose Landmarker source is live and tells me to use
LIVE_STREAM + `result_callback`. I measure jitter on a still person, get a number,
build the torso-normalised motion energy above that floor, add T_low/T_high/dwell,
sweep offline against recorded footage. M1 is reachable.

**Where I'd stall:**

1. **Buying the HIGH-side board.** `cp-live-pose-pipeline` says "prefer one with
   NO radio", `air-gap-verification-testing` says prefer hardware with no radio,
   and `optocoupler-uart-diode-hardware` warns the Pi's onboard Wi-Fi is where
   homebrew gaps fail. But **no file in the artifact names a single radio-free SBC
   that can sustain 15 FPS pose inference.** This is the very first irreversible
   decision in the project and the most load-bearing one for the constraint, and
   the plan leaves the learner to guess. `content/prices/` is empty, so there is no
   BOM either. This is the sharpest "now what?".
2. **The four TODO stubs.** Hitting `loop-timing` and `sampling-aliasing` in the
   first checkpoint and finding `_TODO — One sentence: the problem this solves.`
   is a dead end with no attached source to fall back on. Partially rescued
   because `edge-camera-capture-pipeline` independently covers latency vs
   throughput and shallow queues — but `sensor-fusion` under `cp-multimodal-fusion`
   is a stub sitting next to a real `multimodal-intent-fusion`, which reads as an
   oversight.
3. **Milder:** `cp-idle-state-detection` tells me to record hours of footage "with
   a rough activity log" and sweep parameters offline, but nothing describes the
   annotation format or the sweep harness, and there is no source on threshold
   tuning. A diligent learner improvises this; it is friction, not a wall.

---

## Score justification

Not 3: the learner reaches M1 and the air-gap leg is followable unaided, which is
more than "workable with gaps".

Not 2: the air-gap concepts are the *strongest* content in the artifact, not the
weakest, and they have live attached sources (Lidi, NCSC, Hackaday HCPL-7720).

Not 5: the rubric requires *all of 4* plus air-gap specificity. The air-gap half
of that is clearly earned. The "fully independent" half is not — four stubs on the
critical path (`concepts/loop-timing.md`, `sampling-aliasing.md`,
`noise-uncertainty.md`, `sensor-fusion.md`), 14/24 concepts with no reading
attached, and no named radio-free board or BOM for the project's first and most
consequential purchase.

**4.**

---

## Three concrete changes that would earn the 5

1. **Name the hardware.** Add a `hardware` block to the Project (or a
   `high-side-board-selection` Concept prereq'd into `cp-live-pose-pipeline`)
   listing 2–3 specific radio-free SBCs benchmarked for pose inference, with the
   explicit trade-off against a Pi 5 + physically removed antenna, plus the
   optocoupler part number to buy (PC817 for this baud, HCPL-7723 if you later
   need speed), resistor values for the LED input and the LOW-side pull-up, and a
   priced BOM in `content/prices/`. Today the syllabus tells the learner what
   property the board must have but not which board has it — the one decision
   where getting it wrong invalidates the entire constraint.

2. **Fill or unlink the four stubs.** `loop-timing`, `sampling-aliasing` and
   `noise-uncertainty` are cited by the two checkpoints on the path to the first
   milestone; `sensor-fusion` is cited by `cp-multimodal-fusion` alongside the
   fully-written `multimodal-intent-fusion`. Either write them to the standard the
   other twenty concepts set, or drop the references so the learner is not sent to
   an empty file mid-checkpoint.

3. **Attach sources to the idle-detection and gap-verification clusters.** At
   minimum: a causal/online temporal-action-segmentation reference and something
   concrete on Schmitt-trigger/debounce tuning for `temporal-activity-segmentation`
   and `idle-state-hysteresis` (the first milestone's actual subject matter, with
   zero reading today); and for `air-gap-verification-testing`, real references for
   the scanning and scoping technique it prescribes (arp-scan/nmap/mDNS discovery,
   reading a UART line on a scope). `one-way-observability` and
   `offline-device-provisioning` should likewise point at RAUC/Mender/swupdate or
   the Raspberry Pi A/B tryboot mechanism they describe in prose.
