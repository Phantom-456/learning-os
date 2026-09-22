---
id: source-monitor-runtime-assurance
type: paper
title: >-
  Monitor-Based Runtime Assurance for Temporal Logic Specifications (Abate,
  Feron, Coogan)
url: 'https://arxiv.org/abs/1908.03284'
concepts:
  - tzt-tag-wellformedness-monitor
added: '2026-09-21'
notes: []
---
Free arXiv paper showing the concrete architecture of an FSM monitor that watches a running system, evaluates whether the current trajectory is a bad prefix of an LTL safety property, and raises a fault flag before the bad state is reached. That "detect the bad prefix early and act" structure is the same mechanism the anticipatory zone-exit warning needs, so this is the bridge between the tag-monitor concept and the early-warning concept rather than a detour into formal methods.
