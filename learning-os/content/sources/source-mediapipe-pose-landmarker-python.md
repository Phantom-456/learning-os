---
id: source-mediapipe-pose-landmarker-python
type: article
title: Pose landmark detection guide for Python (Google AI Edge)
url: >-
  https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python
concepts:
  - pose-landmark-estimation
added: '2026-09-21'
notes: []
---
The official API guide for the pose landmarker you will actually run. Read
it for the three running modes (IMAGE / VIDEO / LIVE_STREAM - you want
LIVE_STREAM and its result_callback, because IMAGE mode redetects every frame),
and the confidence knobs: min_pose_detection_confidence,
min_pose_presence_confidence, min_tracking_confidence, num_poses, and
output_segmentation_masks. It also documents the normalised-vs-world landmark
outputs, which is the distinction that decides whether your gesture classifier
generalises across the room. Verified live.
