---
id: air-gapped-sensor-threat-model
title: Threat modelling an always-on camera
parent: One-way data flow
order: 23
status: not_started
review: false
prereqs: []
notes: []
updated: '2026-09-21'
---
# Threat modelling an always-on camera

## Why it exists
An always-on camera in your bedroom or living room is the highest-stakes
sensor most people ever install, and the whole unusual architecture of this
project exists to answer one question: what happens when part of this system
is compromised? Threat modelling is how you decide which controls are load
bearing, and it has to happen BEFORE the design, because it is what tells
you the diode is worth the inconvenience.

## Assets, in order
1. The raw video stream - the thing that can never be allowed to leave.
2. The derived pose/landmark stream - much less sensitive but still a
   behavioural record of when you are home, asleep, or alone.
3. The derived intent/text stream - what you deliberately emit.
4. The fact of the system's existence and its timing metadata.

Note the gradient: the architecture is a deliberate funnel that narrows 1 to
3 before anything touches a network.

## Adversaries worth modelling
- **Remote network attacker.** Compromises anything reachable from the LAN or
  internet. Against this adversary the diode is decisive: the camera device
  is not reachable, full stop, so there is no remote path to the raw video.
- **Compromised dependency.** A malicious or backdoored package in the vision
  stack on the HIGH side. The diode still constrains it: it can only emit
  through the narrow verified schema at a bounded rate. This is the case the
  rate limit and the verifier exist for.
- **Compromised LOW side.** The bridge is on the network and is the most
  likely thing to fall. The diode means this adversary gains a view of the
  text stream and nothing else - no pivot to the camera, no raw video, no
  interactive access to the HIGH side.
- **Physical access.** Defeats everything; in scope only to the extent that
  you decide whether to encrypt at rest on the HIGH side.
- **You, later.** The most realistic adversary. Future-you adds a debug
  stream, enables Wi-Fi "temporarily", or runs the vision code on the network
  box "just to test". Controls that survive this are structural (no radio on
  the board, no return wire), not procedural.

## Trust boundaries to draw explicitly
Camera/HIGH | diode | bridge/LOW | LAN | any cloud. Each bar is a boundary,
and for each you should be able to state what crosses it, in what direction,
in what format, and what enforces that. If any boundary's enforcement is "the
code does not do that", it is a policy boundary, not a technical one, and it
should be labelled as such in the design rather than quietly counted as
security.

## Privacy considerations beyond security
Consent for other people in the room (housemates, guests) is a real
requirement, not an afterthought, and in some jurisdictions a legal one -
especially with audio, which is regulated far more strictly than video in
many places. Design affordances: a physical, visible recording indicator
wired to the camera power rather than to software; a hardware kill switch on
the camera's power; a documented, honest statement of what is retained and
for how long. The architecture makes a strong claim here that is unusually
easy to explain to a housemate - "the camera is not on the network and
physically cannot be" - which is worth a great deal socially.

## Self-test
- For each of the five adversaries, state exactly what the diode does and
  does not stop.
- Which of your boundaries are technical and which are merely policy?
- What does someone who fully owns the LOW side actually get?
