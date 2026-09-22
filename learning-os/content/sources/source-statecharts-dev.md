---
id: source-statecharts-dev
type: link
title: Statecharts — a visual formalism for complex systems (statecharts.dev)
url: 'https://statecharts.dev/'
concepts:
  - tzt-task-state-machine
  - tzt-task-tag-model
added: '2026-09-21'
notes: []
---
Free, no-login site that teaches plain state machines first, then statecharts (hierarchy, orthogonal/parallel regions, guards, entry/exit actions) and why they exist — state explosion. Directly relevant: the per-instance task lifecycle needs parallel regions (a spatial presence region and a temporal progress region over the same instance), which is exactly the problem Harel statecharts were invented for. Read this before writing the lifecycle as a flat enum.
