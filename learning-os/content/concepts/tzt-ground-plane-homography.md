---
id: tzt-ground-plane-homography
title: 'Ground-plane homography: image pixels to floor coordinates'
parent: Spatial perception
order: 21
status: not_started
review: false
prereqs:
  - tzt-object-detection-tracking
  - transforms
notes: []
updated: '2026-09-21'
---
# Ground-plane homography: image pixels to floor coordinates

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
a 3x3 matrix `H` acting on homogeneous coordinates, with 8 degrees of freedom.
Given four point correspondences between image and floor plan (no three
collinear), you can solve for `H`; with more than four, solve least-squares and
gain robustness.

Crucially, `H` is only valid *for points on that plane*. This is why you map a
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
3. Click the same four points in a frame; solve for `H`.
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
  visible / box bottom clipped by frame edge) and emit `unknown` rather than a
  confidently wrong floor position.
- One camera gives you one plane. Multi-room coverage means multiple cameras,
  each with its own `H` into a *shared* floor-plan frame — which is the point of
  defining the floor-plan frame explicitly in step 2.

## Watch for
- Calibrating once and never checking. Homography drift is silent.
- Mixing up units. Pick metres, write it in the type name, never look back.
