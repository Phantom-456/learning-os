---
id: source-supervision-detect-annotate
type: article
title: Detect and annotate — Roboflow supervision documentation
url: 'https://supervision.roboflow.com/latest/how_to/detect_and_annotate/'
concepts:
  - tzt-object-detection-tracking
added: '2026-09-21'
notes: []
---
Free docs for the glue library most of this perception stack will use: running a detector, converting results to a common Detections type, tracking, and annotating frames. Model-agnostic, which matters because you will swap detectors at least twice; writing against this abstraction rather than one vendor API saves rework at the deployment checkpoint.
