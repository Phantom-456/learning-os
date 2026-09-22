---
id: source-stately-state-machines
type: article
title: State machines and statecharts — Stately/XState docs
url: 'https://stately.ai/docs/state-machines-and-statecharts'
concepts:
  - tzt-task-state-machine
added: '2026-09-21'
notes: []
---
The practical counterpart to statecharts.dev: same concepts (states, events, transitions, final states, parent/atomic/parallel states, self-transitions) but with runnable code and visual examples. Useful because it pins down the implementation shape the tag runtime wants — a pure state+event transition function with guards — which is what makes the whole lifecycle replayable from a synthetic event trace with no video in the loop.
