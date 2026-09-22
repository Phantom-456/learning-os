---
id: source-opening-vocabulary-egocentric
type: paper
title: >-
  Opening the Vocabulary of Egocentric Actions (Chatterjee, Sener, Ma, Yao —
  NeurIPS 2023)
url: 'https://arxiv.org/abs/2308.11488'
concepts:
  - tzt-open-vocab-action-recognition
  - tzt-video-representation-clip
added: '2026-09-21'
notes: []
---
The paper behind the verb/object decoupling recommendation. Proposes open-vocabulary action recognition with an object-agnostic verb encoder plus a prompt-based object encoder over CLIP representations, and shows it generalises to novel interacting objects far better than closed-set baselines on EPIC-KITCHENS-100 and Assembly101. Directly applicable: your tag names are effectively (verb, object) pairs and object novelty — an unfamiliar pan — is much more common in a real home than verb novelty.
