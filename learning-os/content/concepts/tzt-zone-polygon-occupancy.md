---
id: tzt-zone-polygon-occupancy
title: 'Zone definition and occupancy: polygons, dwell and hysteresis'
parent: Spatial perception
order: 22
status: not_started
review: false
prereqs:
  - tzt-ground-plane-homography
notes: []
updated: '2026-09-21'
---
# Zone definition and occupancy: polygons, dwell and hysteresis

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
- Zones are **named and typed**: `stove`, `kitchen`, `home`. Note they are
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
   Require the subject to remain inside for `T_dwell` before the zone is
   considered occupied. This is the exact mechanism mobile geofencing APIs expose
   as a DWELL transition with a loitering delay, and it exists for the same
   reason: raw ENTER/EXIT events are far too noisy to drive notifications.
3. **Debounced exit.** Symmetrically, require sustained absence before declaring
   an exit — a person momentarily occluded by the fridge has not left the
   kitchen.

Note the deliberate asymmetry you will want: *confirmed* exit should be slow and
certain (it is used for state transitions), while *predicted* exit should be fast
and reversible (it drives the early warning — see
`tzt-anticipatory-zone-exit`). Conflating them forces one threshold to do two
incompatible jobs.

## Hybrid sensing
Camera-only zone tracking has blind spots and dark rooms. Cheap complements are
worth designing for from the start, because they are far more reliable for
specific high-value facts: a smart plug or current clamp knows the hob is on; a
door contact sensor knows the front door opened; a BLE beacon or phone Wi-Fi
association knows roughly which room the user is in. Fusing a low-rate, highly
reliable signal with a high-rate, noisy one is the classic sensor-fusion setup
(`sensor-fusion`), and for the "did they leave the house" boundary a door
sensor beats any vision model you will train.

## Watch for
- Defining zones in pixels (they break the moment the camera moves or a second
  camera is added).
- One global dwell time. The stove needs seconds; "left the house" needs none.
- Forgetting the `unknown` occupancy state during camera outage.
