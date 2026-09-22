---
id: source-elementary-kalman
type: paper
title: An Elementary Introduction to Kalman Filtering (Pei et al.)
url: 'https://arxiv.org/abs/1710.04055'
concepts:
  - tzt-time-to-boundary-prediction
  - kalman-filter
added: '2026-09-21'
notes: []
---
Free arXiv tutorial that derives Kalman filtering from basic probability and calculus before touching any application, then shows linear state estimation. The right level for this project: you need the constant-velocity model, the predict/update split and covariance propagation, because the tracker gives you a smoothed velocity almost for free and that velocity plus its covariance is exactly what time-to-boundary prediction consumes.
