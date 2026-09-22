---
id: tzt-time-to-boundary-prediction
title: Time-to-boundary prediction from tracked motion
parent: Anticipatory alerting
order: 51
status: not_started
review: false
prereqs:
  - tzt-ground-plane-homography
  - kalman-filter
notes: []
updated: '2026-09-21'
---
# Time-to-boundary prediction from tracked motion

## Why it exists
The quantitative core of the anticipatory warning. Given a tracked person on the
floor plane and a zone polygon, produce `τ̂` — the estimated seconds until they
cross the boundary — together with an uncertainty on it. The alert policy is then
a threshold on this quantity rather than on raw position.

## The estimator
1. **State.** Track the person in floor-plan metres with a constant-velocity
   model: `x = [px, py, vx, vy]`. A linear Kalman filter is the standard and
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
   conservative `τ̂` from the optimistic end of the confidence interval, or
   (b) Monte-Carlo sample a few hundred trajectories from the state distribution
   and report the *probability* of crossing within the horizon. (b) is barely
   more expensive and directly gives you the quantity the alert policy wants:
   `P(exit within τ)`.
4. **Alert** when that probability exceeds the policy threshold
   (`tzt-alert-policy-thresholds`).

## Things that go wrong
- **Constant velocity is wrong indoors.** People turn constantly around furniture.
  Keep the prediction horizon short (2-6 s) — over that span it is a decent
  approximation, and beyond it is fiction. If you need longer horizons, that is
  a signal to move to learned intent prediction, not to trust a longer
  extrapolation.
- **Process noise tuning is the whole game.** Too little and the filter lags
  turns badly, producing confident wrong predictions; too much and the velocity
  estimate is noise and `τ̂` jitters wildly. Tune it against recorded walking
  data with known crossing times, offline.
- **Stationary people.** Velocity near zero gives `τ̂ = ∞`. Correct, and
  useless for the person standing at the door putting their shoes on. Handle
  with a separate proximity/orientation rule rather than by corrupting the
  motion model.
- **Measurement gaps.** During occlusion the filter coasts on the motion model
  and covariance grows. Coasting *toward* a boundary should raise, not lower,
  the alert probability — inflate risk under uncertainty near boundaries.

## Reuse note
`kalman-filter`, `bayes-filter` and `noise-uncertainty` already in this
library cover the estimator itself; what is specific here is the floor-plane
formulation, the polygon-intersection time-to-event readout, and the deliberately
asymmetric treatment of uncertainty.
