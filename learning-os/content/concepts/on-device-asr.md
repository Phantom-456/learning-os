---
id: on-device-asr
title: On-device speech recognition
parent: On-device audio
order: 41
status: not_started
review: false
prereqs:
  - wake-word-detection
  - edge-model-runtimes-quantization
notes: []
updated: '2026-09-21'
---
# On-device speech recognition

## Why it exists
The voice half of "combine pose and voice to understand what I mean" requires
turning a short utterance into text, and the architecture requires doing it
where the audio already is - on the network-incapable device. Cloud ASR is
not merely discouraged here, it is structurally impossible: that device has
no network. So the constraint is real and it shapes the model choice.

## What actually runs on a small board
whisper.cpp is the practical answer: a C/C++ port of OpenAI's Whisper with no
Python or GPU dependency, MIT-licensed, that explicitly supports Raspberry Pi
and ships a streaming tool that samples audio continuously and transcribes as
it goes. Model size is the main dial - tiny and base are the realistic tiers
on Pi-class hardware; small and above are for accelerated targets. Quantised
weights (the same int8/fp16 tradeoffs as the vision models) are what make the
larger tiers reachable, so this concept leans directly on the quantization
concept.

Expect roughly: tiny-class models transcribing a few seconds of audio in a
comparable few seconds on a Pi 5, improving substantially with fewer threads
contending against the vision pipeline. Measure on your own hardware with
your own utterances; published numbers vary wildly with build flags (NEON,
thread count) and audio length.

## Streaming vs utterance-at-a-time
Two modes with different engineering. Utterance mode - triggered by the wake
word, capture until VAD says silence, transcribe the whole clip - is simpler,
more accurate (the model sees full context), and entirely adequate for
command-style interaction. True streaming re-transcribes a sliding window and
must cope with hypotheses changing as more audio arrives. For a
gesture-plus-voice assistant, utterance mode is the right default; adopt
streaming only if you need partial results to feel responsive.

## Accuracy in the real room
Word error rate on clean benchmark audio has almost nothing to do with WER on
far-field audio in a room with a fan and a TV. The dominant variables are
microphone and placement (a cheap array beats a good single mic at 3 m),
reverberation, and whether you are facing the device. Whisper-family models
also hallucinate fluent text on silence or noise - so gate transcription
behind VAD, and treat a transcript produced from a near-silent buffer as
suspect. That failure mode matters more here than usual, because a
hallucinated command becomes a fused intent.

## Budgeting against the vision pipeline
The vision loop and the ASR contend for the same few cores. Decide the policy
deliberately: usually, drop the vision frame rate during transcription rather
than letting both degrade, since an utterance is short and the pose stream
tolerates a brief gap. Pin threads and measure the combined worst case, not
each in isolation.

## Self-test
- Why is cloud ASR not an option here, structurally?
- Which whisper model tier meets your latency target on your hardware, measured?
- What is the silence-hallucination failure and how do you gate it?
