---
id: source-ncsc-safely-exporting-data
type: article
title: 'Design Pattern: Safely Exporting Data (NCSC)'
url: 'https://www.ncsc.gov.uk/guidance/design-pattern-safely-exporting-data'
concepts:
  - unidirectional-data-diode-architecture
  - air-gapped-sensor-threat-model
added: '2026-09-21'
notes: []
---
The UK National Cyber Security Centre's design pattern for moving data out
of a sensitive domain. Read it for the *architecture-level* argument: it puts
flow control (explicitly, "you can use data diodes to ensure one-way
communication") alongside sanitisation, schema verification, authorisation and
signing, rather than treating one-wayness as the whole control. That layering
is exactly what this project's verifier concept borrows. Verified live
(reviewed 2019, modified April 2026); its "also see" section points at newer
NCSC cross-domain architecture material worth following once you have the
basic pattern.
