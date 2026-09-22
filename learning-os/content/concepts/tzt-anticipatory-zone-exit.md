---
id: tzt-anticipatory-zone-exit
title: Anticipatory zone-exit detection (the GTA mission-boundary warning)
parent: Anticipatory alerting
order: 50
status: not_started
review: false
prereqs:
  - tzt-zone-polygon-occupancy
  - tzt-time-to-boundary-prediction
  - tzt-task-state-machine
notes: []
updated: '2026-09-21'
---
# Anticipatory zone-exit detection (the GTA mission-boundary warning)

## Why it exists
This is the concept that carries the brief's most distinctive requirement, and
the one most likely to be quietly replaced by something easier. The requirement
is **not** "tell me when I leave the kitchen with the stove on". It is "tell me
while I am *about to*", with enough lead time that I can turn around — the
"leaving mission area" warning from GTA, which fires with a countdown *before*
failure, not a notification after it.

The difference is structural, not a matter of tuning. Reactive exit detection is
a classification of the present state: `inside(p_t, Z)`. Anticipatory exit
detection is a **prediction about a future state**: `P(exit(Z) within τ | history)`.
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
   when the predicted time-to-crossing falls below a threshold `τ`. This is
   exactly the mechanism described in predictive-geofencing work: predict a
   future position from speed and heading (optionally refined by a history of
   past positions and by map structure), and raise an alert when the predicted
   position crosses the boundary or the time-to-crossing drops below a
   client-specified threshold. Constant lead time regardless of speed — a
   significant improvement over buffer zones. This is your target for v1, and
   the velocity estimate comes free from the tracker's Kalman filter
   (`tzt-time-to-boundary-prediction`).
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
- These trade off along a curve parameterised by `τ`; produce the curve and
  pick a point consciously, per zone.

## Watch for
- Silently degrading to reactive exit detection because it is easier to build and
  scores better on any accuracy-shaped metric. This is *the* failure mode for
  this concept: check that your alert timestamps precede your crossing
  timestamps, on real data, and if they do not, the feature does not exist.
- Extrapolating in pixel space (see `tzt-ground-plane-homography`).
- Zero-velocity intent (standing at the door). Dead reckoning predicts no
  crossing, ever. Add a proximity-plus-orientation fallback.
- Occlusion right at the doorway — the worst possible place to lose the track,
  and the most likely. Treat track loss near a boundary as at-risk, not as safe.
