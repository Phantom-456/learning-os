---
id: source-mediapipe-samples-pose-raspberry-pi
type: link
title: 'mediapipe-samples: pose_landmarker Raspberry Pi example'
url: >-
  https://github.com/google-ai-edge/mediapipe-samples/tree/main/examples/pose_landmarker/raspberry_pi
concepts:
  - pose-landmark-estimation
  - edge-camera-capture-pipeline
added: '2026-09-21'
notes: []
---
Google's own runnable Raspberry Pi example: setup.sh (installs deps and
downloads the .task model), detect.py, requirements.txt. It does real-time pose
detection on frames streamed from a Pi Camera or USB camera, with CLI flags for
the same confidence parameters as the API guide. Use it as the baseline you
measure against before writing your own capture loop - if your hand-rolled
pipeline is slower than this, the problem is your capture stage, not the model.
Verified live (directory and all four files present).
