---
id: tzt-on-device-privacy
title: On-device processing and privacy architecture for home cameras
parent: Perception infrastructure
order: 11
status: not_started
review: false
prereqs:
  - tzt-video-capture-pipeline
notes: []
updated: '2026-09-21'
---
# On-device processing and privacy architecture for home cameras

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
  `tzt-realtime-edge-deployment` is a first-class checkpoint rather than an
  afterthought. Decide this early because it constrains model choice.
- **Retain derived events, not pixels.** The event log
  (`tzt-event-stream-design`) is small, useful for months, and far less
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
  ones.
