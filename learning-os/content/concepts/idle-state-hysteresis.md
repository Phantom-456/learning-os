---
id: idle-state-hysteresis
title: Idle-state detection with hysteresis and dwell time
parent: Edge vision
order: 14
status: not_started
review: false
prereqs:
  - temporal-activity-segmentation
notes: []
updated: '2026-09-21'
---
# Idle-state detection with hysteresis and dwell time

## Why it exists
The first meaningful checkpoint of this project is "notice I am idle and ping
me". A naive implementation - threshold the motion signal, fire when it goes
low - produces a system that is actively unpleasant to live with: it pings
you every time you pause to think, then pings again ten seconds later. The
gap between "the classifier is right" and "the product is tolerable" is
almost entirely this concept.

## Hysteresis (Schmitt-trigger logic)
Use TWO thresholds, not one. Enter the idle state when smoothed motion falls
below T_low; leave it only when motion rises above T_high, with T_high >
T_low. The dead band between them absorbs noise around the boundary, and the
state can no longer chatter on a signal hovering at a single threshold. This
is the same trick as a Schmitt trigger in electronics and as deadband in
controller design - the transferable idea is that a stateful decision needs
an asymmetric boundary.

## Dwell time (debounce)
Hysteresis stops chatter; it does not encode "idle" meaning "idle FOR A
WHILE". Require the below-threshold condition to hold continuously for a
dwell period T_dwell before declaring idle. Three parameters - T_low, T_high,
T_dwell - and each maps onto something you can state in plain language:
how still counts as still, how much movement counts as back, and how long
before we believe it.

## Refractory period and notification policy
Even a correct idle detection should not notify unboundedly. Add a refractory
period after each ping, and a policy for what happens if you are idle for an
hour (one ping? escalating? none until state changes?). These are product
decisions but they belong in the detector's state machine, not scattered
through the notification code, because they are what make the false-positive
rate survivable.

## The distinction that actually matters
"No motion" is not "idle". Reading, watching, and thinking are low-motion and
NOT idle; an empty chair is zero-motion and not idle either, it is absent.
At minimum the state machine needs three states - ACTIVE, IDLE, ABSENT -
because pinging an empty room is the most common and most annoying failure of
naive builds. Person-presence from the pose detector distinguishes absent
from idle for free.

## How to tune it honestly
Record several hours of your own real room footage with a rough ground-truth
log of what you were doing. Sweep the three parameters offline against that
recording and look at false pings per hour and detection delay. Tuning live,
by vibes, is how you end up with a system you eventually mute.

## Self-test
- Write the state machine for ACTIVE / IDLE / ABSENT with all transitions.
- What does each of T_low, T_high, T_dwell control, in plain language?
- What is your false-ping-per-hour rate on recorded footage? If you cannot
  answer numerically, you have not tuned it.
