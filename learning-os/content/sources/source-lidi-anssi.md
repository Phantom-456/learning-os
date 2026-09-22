---
id: source-lidi-anssi
type: link
title: >-
  ANSSI-FR/lidi - transfer a TCP/Unix stream or files over a unidirectional link
  with FEC
url: 'https://github.com/ANSSI-FR/lidi'
concepts:
  - unidirectional-protocol-design-no-ack
  - unidirectional-data-diode-architecture
added: '2026-09-21'
notes: []
---
Production-grade one-way transfer software from ANSSI, the French national
cybersecurity agency. Rust, LGPL-3.0, uses RaptorQ fountain coding for forward
error correction. This is the best single artefact for understanding
no-back-channel protocol design, because the whole codebase is organised around
the constraint: no ACKs, so reliability comes from FEC and redundancy rather
than retransmission. Read the README and the encoding/decoding split even if
you never run it - your own framing, sequencing and redundancy scheme is a
miniature of this. Verified live.
