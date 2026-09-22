---
id: edge-pose-gesture-assistant
title: 'Air-gapped edge pose, gesture and voice assistant'
status: in_progress
metadata:
  high_side: network-incapable vision/audio device (no radio preferred)
  low_side: 'network-capable bridge, outbound-only egress'
  link: 'optocoupled UART data diode, HIGH.TX -> LOW.RX only'
  first_milestone: cp-idle-ping-milestone
  drafted_from: web research (no matching Template existed)
checkpoints:
  - id: cp-live-pose-pipeline
    title: 'M1a - Live room feed to pose landmarks, on the network-incapable device'
    depends_on: []
    courses: []
    concepts:
      - edge-camera-capture-pipeline
      - pose-landmark-estimation
      - edge-model-runtimes-quantization
      - loop-timing
      - sampling-aliasing
    status: not_started
    build: >-
      Pick the HIGH-side board (prefer one with NO radio; if the board has
      Wi-Fi/BT, document that as a policy control, not a gap). Bring up camera
      capture at the model's native input size, then run MediaPipe Pose
      Landmarker in LIVE_STREAM mode over the live feed. Instrument
      capture-to-decision latency with a capture-time timestamp. Quantise and
      compare against the float baseline on frames from YOUR room. Hard rule
      from day one: no debug MJPEG server, no shared tmpfs with any other
      process.
    done_test: >-
      Sustains >=15 FPS with p95 capture-to-decision latency under 200 ms on the
      target board, with a measured landmark-jitter noise floor recorded, and a
      delegation report showing no accidental accelerator/CPU ping-ponging.
  - id: cp-idle-state-detection
    title: M1b - ACTIVE / IDLE / ABSENT state machine from the pose stream
    depends_on:
      - cp-live-pose-pipeline
    courses: []
    concepts:
      - temporal-activity-segmentation
      - idle-state-hysteresis
      - noise-uncertainty
    status: not_started
    build: >-
      Define a torso-normalised motion-energy feature so distance to camera does
      not matter. Build the three-state machine with two thresholds
      (T_low/T_high hysteresis), a dwell time, and a refractory period. Record
      several hours of your own real room footage with a rough activity log, and
      sweep the three parameters OFFLINE against that recording. Start with the
      hand-built statistic; escalate to a windowed classifier only if
      measurement shows the threshold cannot separate reading from idle.
    done_test: >-
      On a held-out recording of your own room, fewer than 1 false idle
      transition per hour, detection delay within the configured dwell time, and
      ZERO idle declarations while the room is empty (the ABSENT state is doing
      its job).
  - id: cp-oneway-text-link
    title: M1c - Physically one-way text link between the two devices
    depends_on: []
    courses: []
    concepts:
      - unidirectional-data-diode-architecture
      - optocoupler-uart-diode-hardware
      - unidirectional-protocol-design-no-ack
      - air-gapped-sensor-threat-model
    status: not_started
    build: >-
      Write the threat model FIRST - it is what justifies the inconvenience.
      Then build the link: start with HIGH.TX -> LOW.RX and no return wire to
      get the protocol working, then replace it with an optocoupled stage so the
      one-wayness is a property of a component on a schematic rather than of an
      omitted wire. Deliberately choose a low baud rate. On top of it, implement
      COBS framing + CRC + monotonic sequence numbers + blind N-times repetition
      with receiver-side dedup by sequence, plus a fixed-cadence heartbeat.
      Every record is an idempotent fact, never an imperative.
    done_test: >-
      Records cross reliably with loss detectable via sequence gaps; AND the
      negative tests pass: a scope on the HIGH-side RX pin shows a flat line
      while LOW transmits continuously, and an ARP + full port scan + mDNS sweep
      of the LAN cannot see the HIGH device at all.
  - id: cp-idle-ping-milestone
    title: >-
      M1 (FIRST MEANINGFUL CHECKPOINT) - Idle detected, task-list ping delivered
      on the LAN
    depends_on:
      - cp-idle-state-detection
      - cp-oneway-text-link
    courses: []
    concepts:
      - outbound-only-network-egress
      - task-state-and-notification-policy
      - intent-schema-design
    status: not_started
    build: >-
      Join the two legs. HIGH side emits a bounded, schema-conforming idle
      record across the diode. LOW side runs the verifier (reject anything
      off-schema or over length), owns the task list, applies the notification
      policy module (refractory period, quiet hours, suppression,
      never-ping-on-ABSENT), ranks a maximum of ~3 tasks, and PUSHES the
      notification. Lock the bridge down: no listening sockets, default-deny
      inbound AND outbound with a destination allowlist, no SSH in steady state.
    done_test: >-
      End to end in the real room: go idle, receive a ping listing the right few
      tasks, within the dwell time. "ss -tulpn" on the bridge prints nothing.
      Over a week of real use, pings per day and the fraction acted upon are
      both logged, and quiet hours were never violated.
  - id: cp-gesture-vocabulary
    title: 'A small dynamic gesture vocabulary, spotted in continuous video'
    depends_on:
      - cp-live-pose-pipeline
    courses: []
    concepts:
      - dynamic-gesture-recognition
      - pose-landmark-estimation
    status: not_started
    build: >-
      Choose 3-6 gestures you would actually use. Collect your own data FROM THE
      DEPLOYED camera position, across distances, angles, lighting, clothing and
      speeds, with far more background/none data than gesture data, and a
      held-out set recorded on a different day. Normalise landmarks (re-centre,
      scale by a body-intrinsic length, add velocities). Start with DTW template
      matching; escalate to a small sequence classifier only if measured
      accuracy demands it. Add the rejection path: none-class + confidence
      threshold + multi-window dwell + refractory period.
    done_test: >-
      >90% accuracy on the different-day held-out set, AND under 1 spurious
      gesture firing per hour during an hour of ordinary, non-gesturing
      activity.
  - id: cp-onboard-voice
    title: 'Wake word plus on-device transcription, audio never leaving the device'
    depends_on: []
    courses: []
    concepts:
      - wake-word-detection
      - audio-vad-segmentation
      - on-device-asr
      - edge-model-runtimes-quantization
      - sampling-aliasing
    status: not_started
    build: >-
      Build the chain: mic -> ring buffer with pre-roll -> VAD -> wake-word
      model -> on trigger, hand the pre-rolled buffer to whisper.cpp in
      utterance mode. Gate ASR behind VAD specifically to avoid
      silence-hallucinated transcripts. Measure the wake word on hours of YOUR
      room audio including the TV. Then measure the audio stack and the vision
      stack RUNNING TOGETHER and set the contention policy (drop vision FPS
      during transcription).
    done_test: >-
      Under 1 false wake per hour on real room audio with the TV on,
      wake-to-transcript under 2 s for a short command, and the vision pipeline
      still meets its own frame budget with the audio stack running
      concurrently.
  - id: cp-multimodal-fusion
    title: Fuse gesture and utterance into a single typed intent
    depends_on:
      - cp-gesture-vocabulary
      - cp-onboard-voice
    courses: []
    concepts:
      - multimodal-intent-fusion
      - intent-schema-design
      - sensor-fusion
    status: not_started
    build: >-
      Late fusion over a shared, capture-timestamped event buffer. Timestamp at
      CAPTURE, not at recogniser completion. Parse the utterance into an intent
      with typed slots; fill deictic/unbound slots from gesture evidence inside
      the matching window. Write down and TEST the three cases - agreement,
      complementarity, conflict - with an explicit conflict policy (speech wins
      the verb, gesture wins spatial reference). Attach a confidence and an
      abstention path that does nothing below threshold.
    done_test: >-
      A deictic command ("put that there" / "remind me about this") resolves
      correctly on a scripted set of trials; conflicting inputs follow the
      stated policy in a unit test; and low-confidence cases abstain rather than
      acting.
  - id: cp-intent-over-diode
    title: >-
      Ship fused intents across the gap, and operate a link you cannot
      interrogate
    depends_on:
      - cp-multimodal-fusion
      - cp-idle-ping-milestone
    courses: []
    concepts:
      - intent-schema-design
      - unidirectional-protocol-design-no-ack
      - one-way-observability
      - offline-device-provisioning
    status: not_started
    build: >-
      Extend the schema to carry fused intents alongside idle events, as a
      versioned, length-bounded, closed-vocabulary record; enforce it in the
      verifier as a real machine-readable artefact (JSON Schema or a strict
      fixed-field regex). Add a health record type on a fixed cadence carrying
      FPS, latency percentiles, dropped frames, sequence high-water mark,
      temperature and - critically - the running image hash. Move the HIGH
      device to reproducible images with A/B partitions and automatic fallback,
      and fit an RTC. Then practise a full sneakernet update and a rollback.
    done_test: >-
      A LOW-side dashboard reports the HIGH device health and image hash with no
      back channel; a deliberately broken image is flashed and the device
      automatically falls back to the good slot unattended; a new schema field
      is added and deployed receiver-first without breaking the older sender.
  - id: cp-verify-the-gap
    title: >-
      Prove the gap: dated evidence that no return path and no raw media egress
      exist
    depends_on:
      - cp-intent-over-diode
    courses: []
    concepts:
      - air-gap-verification-testing
      - air-gapped-sensor-threat-model
      - outbound-only-network-egress
    status: not_started
    build: >-
      Turn the negative tests into a dated, repeatable checklist run after every
      hardware change, every re-image, and on a calendar cadence. Four
      artefacts: a wiring photograph, a scope capture of the HIGH-side RX pin
      under continuous LOW-side transmission, a LAN port/ARP/mDNS scan output,
      and a long traffic capture from the bridge. Enumerate and account for
      EVERY interface on the HIGH board including USB gadget mode and JTAG/SWD.
      Compute measured bits-per-hour across the link against your stated bound.
      Write the honest residual-risk statement (timing/covert channels) and add
      fixed-cadence padded transmission if you decide that risk matters.
    done_test: >-
      All four artefacts exist, dated, alongside the design; the security claim
      is written down as a NARROW tested statement ("no inbound path, no LAN
      presence, outbound conforms to schema X at <= N bits/hour") rather than a
      broad assertion; and each control in the design is explicitly labelled
      hardware, configuration, or policy.
notes: []
updated: '2026-09-21'
---
# Air-gapped edge pose, gesture and voice assistant

## The brief
Train an edge model to understand pose and gestures, combine them with voice
input to understand intent. First meaningful checkpoint: from a live feed of
the room, detect when the user is idle and ping them with a notification of
everything they need to do. The device connects to the local network for
communication, but ONLY inference output - text - traverses that channel.

## The constraint that shapes everything
The camera feed is network-gapped. Video goes to a **network-incapable**
device for processing; the text output is sent to a **separate** network
connector over an **outbound-only** link. There is no network path back to the
camera. This is a two-device split with a physically unidirectional channel
between them, not a firewall rule on one box - and it is the hard, novel part
of this project. Roughly half the syllabus below exists to teach it: diode
architecture and hardware (cp-oneway-text-link), protocol design with no back
channel, operating and updating a device you cannot reach
(cp-intent-over-diode), and proving the gap holds (cp-verify-the-gap).

## Shape of the graph
Three independent roots - vision (cp-live-pose-pipeline), the one-way link
(cp-oneway-text-link) and audio (cp-onboard-voice) - because they genuinely
can be built in parallel by different weeks of study. The vision and link legs
join at **M1 (cp-idle-ping-milestone)**, which is the brief's stated first
meaningful checkpoint. Gesture work branches off the pose pipeline (not off
M1, because it does not need the notification path), joins audio at fusion,
and the whole thing converges on shipping fused intents across the gap and
then proving the gap.

## Conventions used here
- HIGH side = the camera / network-incapable device. LOW side = the bridge /
  network-capable device. Data flows HIGH -> LOW only.
- Every "done_test" is a measurement, not a vibe. Several are NEGATIVE tests
  (proving an absence), because that is what a security property requires.
- Controls are labelled hardware / configuration / policy throughout. "The
  code does not do that" is a policy control and is never counted as a gap.

## Deliberately deferred
Multi-person handling, any cloud component, and learned (rather than
rule-based) fusion. Also deferred: any attempt to make the residual covert
timing channel go away - it is documented and rate-limited, not eliminated.
