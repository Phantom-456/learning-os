---
id: source-hairgap-cea
type: link
title: cea-sec/hairgap - tools to transfer data over a unidirectional network link
url: 'https://github.com/cea-sec/hairgap'
concepts:
  - unidirectional-protocol-design-no-ack
added: '2026-09-21'
notes: []
---
A second, independent take on one-way transfer (from CEA), with a sender
(hairgaps) / receiver (hairgapr) split and error correction, aimed at high
bandwidth. Useful as a contrast with lidi - notice the shared shape both
converge on, and the telltale operational detail that a static ARP entry for
the receiver must be configured because no ARP reply can ever come back. CAVEAT:
the repository was archived in October 2023 and was self-described as alpha, so
treat it as a design reference to read, not a dependency to adopt.
