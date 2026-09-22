---
id: edge-camera-capture-pipeline
title: Edge camera capture pipeline
parent: Edge vision
order: 10
status: not_started
review: false
prereqs:
  - sampling-aliasing
notes: []
updated: '2026-09-21'
---
# Edge camera capture pipeline

## Why it exists
Before any model runs, frames have to get from a sensor into memory at a
predictable rate, in a predictable format, without the capture stage itself
eating the compute budget. On a small edge board this stage is where most
naive projects lose their frame rate, and in THIS project it is also a
security surface: the capture pipeline is the only place raw pixels ever
exist, and it must be physically confined to the network-incapable device.

## The shape of the pipeline
A live-video pipeline on a Linux SBC is a chain of buffers, not a loop that
"reads a picture":

  sensor -> CSI/USB transport -> kernel driver (V4L2) -> DMA buffers
         -> userspace (libcamera / picamera2 / OpenCV VideoCapture)
         -> colour convert + resize -> model input tensor

Each arrow can copy, and each copy costs. The three decisions that dominate
throughput are (1) the negotiated pixel format (asking for RGB when the
sensor emits YUV420 forces a CPU conversion every frame), (2) the requested
resolution (ask the ISP for the model's input size instead of capturing
1080p and downscaling in Python), and (3) buffer count and whether you
handle frames zero-copy or memcpy them.

## Latency vs. throughput
These are different numbers and beginners conflate them. A pipeline can run
30 FPS and still deliver frames 400 ms old if it has a deep buffer queue and
the consumer is slower than the producer. For an assistant that reacts to
you, end-to-end latency is what matters, so you want a SHALLOW queue and a
drop-oldest policy: when inference falls behind, discard stale frames rather
than building a backlog. Measure with a timestamp stamped at capture and
compared at the point of decision, not with an FPS counter.

## Assumptions and failure modes
- Auto-exposure and auto-white-balance drift when a room's lighting changes,
  and pose models degrade badly under heavy motion blur from long exposures.
  Cap exposure time even at the cost of gain/noise.
- Rolling-shutter skew distorts fast limb motion; it shows up as a systematic
  bias in landmark positions, not as obvious visual garbage.
- The sensor's real frame rate is a function of exposure; requesting 30 FPS
  in a dim room silently gives you 15.
- IR-cut / night modes change the colour statistics the model was trained on.

## In THIS project
This concept lives entirely on the offline device. A design rule falls out of
it: the frame buffers must never be written to any path that a network
process can read - no shared tmpfs with the bridge process, no debug MJPEG
server "just for development". The moment a debug stream exists, the air gap
is a documentation claim rather than a property of the system.

## Self-test
- What pixel format does your sensor natively emit, and how many conversions
  happen between it and your model's input tensor?
- Under load, does your pipeline drop frames or queue them? Prove it.
- What is your p95 capture-to-decision latency, measured, not estimated?
