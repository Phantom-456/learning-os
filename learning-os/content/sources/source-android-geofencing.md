---
id: source-android-geofencing
type: article
title: Create and monitor geofences — Android developer documentation
url: 'https://developer.android.com/develop/sensors-and-location/location/geofencing'
concepts:
  - tzt-zone-polygon-occupancy
  - tzt-anticipatory-zone-exit
added: '2026-09-21'
notes: []
---
The best free writeup of the engineering realities of zone monitoring, from a team that shipped it at scale. Documents ENTER/EXIT/DWELL transitions, loitering delay, notification responsiveness, and — most usefully — explains *why* raw ENTER/EXIT is unusable for notifications and why DWELL with a delay exists. Transfers directly to camera-based zones: the dwell/debounce design in tzt-zone-polygon-occupancy is this idea reimplemented on the floor plane.
