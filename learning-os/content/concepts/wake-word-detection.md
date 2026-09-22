---
id: wake-word-detection
title: Wake-word detection on the edge
parent: On-device audio
order: 40
status: not_started
review: false
prereqs: []
notes: []
updated: '2026-09-21'
---
# Wake-word detection on the edge

## Why it exists
Running a full speech recogniser continuously on a small board is wasteful,
and continuously streaming everything said in your home into ANY recogniser is
exactly the privacy posture this project is built to avoid. A wake word is the
gate: a very small always-on model that does one cheap binary decision
thousands of times a minute, and only then hands a short audio buffer to the
expensive recogniser.

## How the models are built
The standard modern architecture is not a big audio model. It is a frozen,
general-purpose speech-embedding feature extractor followed by a tiny trained
classification head for each phrase. openWakeWord is the reference open
implementation of this: it builds on Google's pre-trained speech embedding
model as a frozen extractor and trains small heads on top, which is why a
single core of a Raspberry Pi 3 can run 15-20 wake-word models at once. The
same design means custom wake words can be trained from synthetic speech,
with no real recordings needed. (For much tighter microcontroller budgets,
microWakeWord is the smaller relative.)

## The metric that matters
Wake-word quality is a two-sided error problem and a single accuracy number
hides it. Report false accepts per hour (how often it wakes at nothing -
measured on many hours of your real room audio, including the TV) against
false reject rate (how often it misses you). The operating point is chosen by
sliding a threshold along that curve, and the right point depends on the
consequence of a false accept in YOUR system. Here the consequence is small
and local, so lean toward fewer misses.

Things that move the curve in practice: distance and room reverberation, the
TV or music playing, other speakers, your own accent versus the synthetic
training distribution, and microphone quality/placement - which matters more
than the model choice and is the cheapest thing to fix.

## Pipeline placement
mic -> ring buffer -> VAD -> wake-word model -> on trigger, hand the buffer
(including a second or so of PRE-roll, because people start the command before
the word finishes) to the ASR. Keeping a short pre-roll buffer is the detail
that makes the difference between "hey X, turn on the light" working and the
recogniser receiving "urn on the light".

## In THIS project
The wake word runs on the HIGH/offline side with the vision model, sharing a
CPU budget - so measure them together, not separately. And note the privacy
consequence of the architecture: audio, like video, never crosses the diode.
Only the recognised text does, and only inside the same bounded schema. A
microphone is regulated more strictly than a camera in many jurisdictions,
which makes this property worth stating explicitly to anyone else in the room.

## Self-test
- Why a frozen embedding plus a small head, rather than one trained model?
- What is your false-accept-per-hour rate on your own room audio with the TV on?
- Why does the pre-roll buffer exist?
