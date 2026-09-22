---
id: source-odas
type: paper
title: 'Online Detection of Action Start in Untrimmed, Streaming Videos (Shou et al.)'
url: 'https://arxiv.org/abs/1802.06822'
concepts:
  - tzt-online-action-start-detection
added: '2026-09-21'
notes: []
---
The paper that defines the ODAS task — detect the start of an action in streaming untrimmed video with high accuracy and low latency — and is explicitly motivated by early alerting, the same use case as this project. Its core insight is that the hard discrimination is start-vs-background, not start-vs-other-action, since frames just before and just after a start look nearly identical; it attacks this with hard negative generation and by modelling temporal consistency around the start point.
