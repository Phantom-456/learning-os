---
id: source-hackaday-sd-card-data-diode
type: link
title: SD Card Data Diode System (Hackaday.io project)
url: 'https://hackaday.io/project/21568-sd-card-data-diode-system'
concepts:
  - optocoupler-uart-diode-hardware
added: '2026-09-21'
notes: []
---
A hobbyist build of exactly the hardware this project needs: two Arduino
Unos passing serial data through an HCPL-7720 optocoupler so the receiving side
physically cannot talk back to an air-gapped machine. Worth reading for the
build logs rather than the result - it walks through the practical problems
(binary data needing preprocessing, framing, PCB layout) that you will hit on
your own UART diode. Note the choice of a *high-speed* digital optocoupler; the
logs make clear why a garden-variety PC817 struggles with UART framing.
Verified live, with logs and a linked GitHub repo.
