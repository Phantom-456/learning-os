---
id: source-onlinetas
type: paper
title: >-
  OnlineTAS: An Online Baseline for Temporal Action Segmentation (Zhong, Ding,
  Yao — NeurIPS 2024)
url: 'https://arxiv.org/abs/2411.01122'
concepts:
  - tzt-temporal-action-segmentation
  - tzt-online-action-start-detection
added: '2026-09-21'
notes: []
---
Free arXiv paper establishing a baseline for temporal action segmentation in the online setting, where the model cannot see the future. Introduces an adaptive memory for changing context plus causal post-processing to suppress over-segmentation. Important for this project because over-segmentation is literally "one pot of rice produces six open/close pairs", and because it shows what causal post-processing looks like — the most common accidental lookahead leak in supposedly-online systems.
