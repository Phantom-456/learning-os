---
id: source-openwakeword
type: link
title: dscripka/openWakeWord - open-source wake word detection framework
url: 'https://github.com/dscripka/openWakeWord'
concepts:
  - wake-word-detection
added: '2026-09-21'
notes: []
---
The reference implementation of the frozen-embedding-plus-small-head
design: it builds on a pre-trained speech embedding model as a frozen feature
extractor and trains tiny classification heads, which is why a single Raspberry
Pi 3 core can run 15-20 wake-word models simultaneously in real time, and why
custom wake words can be trained from purely synthetic speech. Code is Apache
2.0; NOTE the pre-trained models are CC-BY-NC-SA 4.0, so check the licence
before any non-personal use. The README also points at microWakeWord for
tighter microcontroller budgets. Verified live.
