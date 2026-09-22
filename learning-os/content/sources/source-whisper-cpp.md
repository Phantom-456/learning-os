---
id: source-whisper-cpp
type: link
title: ggml-org/whisper.cpp - high-performance inference of OpenAI Whisper
url: 'https://github.com/ggml-org/whisper.cpp'
concepts:
  - on-device-asr
added: '2026-09-21'
notes: []
---
The practical way to run speech recognition on the offline device: a
plain C/C++ Whisper implementation, MIT-licensed, no Python or GPU dependency,
with Raspberry Pi listed as a supported platform. Two examples matter here -
whisper-stream (samples audio every half second and transcribes continuously)
and whisper-command (a minimal voice-command loop). Read the build flags
carefully; thread count and NEON/Accelerate options move latency more than the
model tier does. Verified live.
