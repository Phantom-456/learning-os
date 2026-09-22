---
id: source-supervision-polygonzone
type: link
title: PolygonZone — Roboflow supervision documentation
url: 'https://supervision.roboflow.com/latest/detection/tools/polygon_zone/'
concepts:
  - tzt-zone-polygon-occupancy
added: '2026-09-21'
notes: []
---
Free open-source API docs for defining a polygon zone over a video frame and triggering on detections inside it, with a configurable anchor point (bottom-centre, centre, etc.) and live counts. The anchor parameter is the practical detail worth reading for: choosing the foot point rather than the box centre is what makes the zone test agree with the ground-plane homography, and getting it wrong shifts every boundary by half a body height.
