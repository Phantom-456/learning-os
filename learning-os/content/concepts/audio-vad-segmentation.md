---
id: audio-vad-segmentation
title: Voice activity detection and utterance segmentation
parent: On-device audio
order: 42
status: not_started
review: false
prereqs:
  - sampling-aliasing
notes: []
updated: '2026-09-21'
---
# Voice activity detection and utterance segmentation

## Why it exists
Between the microphone and the recogniser sits the question "is anyone
speaking, and has the sentence ended". VAD answers it cheaply. It is the
component that stops you transcribing silence (which wastes the CPU budget
and provokes hallucinated text), and the component that decides when to stop
recording - which is directly felt as responsiveness.

## Approaches, cheapest first
Energy-and-zero-crossing thresholds are nearly free and fail in noise.
Statistical VADs (the classic WebRTC VAD) are still very cheap and much more
robust. Small neural VADs (Silero-class) are the current default: a few
milliseconds per chunk, far better in real rooms, still trivially affordable
next to ASR. The cost ordering is so steep that using a neural VAD to avoid
running ASR on silence is a large net win.

## Endpointing is the hard half
Detecting speech is easy; deciding it has ENDED is not. Too short a silence
threshold truncates people mid-thought (especially mid-sentence pauses); too
long and the system feels sluggish. The standard remedies are an asymmetric
design - quick to start recording, slower to stop - plus a maximum utterance
length as a safety valve, plus the same hysteresis idea used for idle
detection, applied to the speech/silence state. It is genuinely the same
concept in a different domain, which is worth noticing.

## The audio basics that bite
- Sample rate and resampling: wake-word and ASR models expect a specific rate
  (16 kHz is near-universal); resampling badly aliases and degrades accuracy
  in ways that look like model failure. This is the sampling-and-aliasing
  concept showing up in anger.
- Frame/chunk size: fixed-size chunks (10-30 ms) are what VADs consume; the
  buffer plumbing must not introduce jitter or the VAD state machine
  misbehaves.
- Gain and AGC: clipping destroys accuracy; too quiet raises the noise floor
  above the speech.
- Ring buffering with pre-roll, shared with the wake word, so the start of the
  utterance is not lost.

## In THIS project
VAD is also a privacy control, not only an optimisation: by gating ASR behind
VAD and the wake word, the amount of audio ever processed as speech is small
and bounded, and none of it - raw or transcribed-but-unrecognised - crosses
the diode. Only a completed, schema-conforming intent does.

## Self-test
- Why is endpointing harder than onset detection?
- What is your maximum utterance length and why that value?
- Where else in this project does the same hysteresis pattern appear?
