---
id: optocoupler-uart-diode-hardware
title: Building a UART data diode (optocoupler / TX-only wiring)
parent: One-way data flow
order: 21
status: not_started
review: false
prereqs:
  - unidirectional-data-diode-architecture
notes: []
updated: '2026-09-21'
---
# Building a UART data diode (optocoupler / TX-only wiring)

## Why it exists
The architecture concept says "a physically one-way link". This concept is
how you actually make one out of parts you can buy, and how to argue that the
thing you built is one-way rather than merely behaving that way today.

## The simplest honest construction
UART is already two independent wires: TX and RX. If you connect HIGH.TX to
LOW.RX and simply DO NOT RUN the second wire, there is no electrical path
from LOW back to HIGH. This is the cheapest data diode in existence and it is
real - the absence of a conductor is a physical property.

Its weakness is not electrical, it is procedural: nothing stops a future
person (or you, debugging at 1am) from adding the wire. The security property
lives in a wiring decision that is invisible in a photograph and absent from
the software. Mitigations are potting the connector, using a 3-pin cable that
physically cannot carry the return line, or moving to the optocoupled version
below where the one-wayness is a property of a COMPONENT rather than of an
omission.

## The optocoupled construction
An optocoupler is an LED and a photodetector sealed in one package with an
insulating barrier between them. Current into the LED emits infrared; the
photodetector on the other side switches. There is no electrical connection
across the package at all - only light, and only in one direction, because
the emitter is on one side and the detector on the other. Isolation ratings
are typically in the kilovolt range.

Wiring: HIGH.TX drives the optocoupler input (through a current-limiting
resistor sized for the device's forward current); the optocoupler output
drives LOW.RX with an appropriate pull-up. LOW has no component capable of
emitting into the HIGH side - the one-wayness is now structural to the part
you chose, and is visible on the schematic, which is a much better artefact
to review than a missing wire. Hobbyist builds of exactly this exist and are
worth reading (the SD-card data-diode project on Hackaday uses two Arduinos
across an HCPL-7720 optocoupler, precisely to stop the receiving side talking
back to an air-gapped machine).

## Speed, and why it bites you
Ordinary phototransistor optocouplers (4N35, PC817) are SLOW - rise/fall
times of microseconds to tens of microseconds, which mangles UART framing
above a few tens of kbaud and gets worse with the pull-up value. This is why
diode builds reach for high-speed digital optocouplers (HCPL-772x class,
logic-gate optos) when they need real throughput. For this project the
required bandwidth is tiny - a few hundred bytes per intent - so a slow,
cheap part at 9600-38400 baud is entirely adequate, and picking the slow part
deliberately is itself a defence: a channel that physically cannot carry
video is easier to defend than one that could but promises not to.

## Signal-integrity checklist
- Ground reference: a plain optocoupler gives you galvanic isolation, so the
  two sides may need separate grounds. If you defeat that by tying grounds
  together for convenience, you have kept the data one-wayness but thrown
  away the isolation.
- Logic levels: 3.3 V vs 5 V on the two sides; the opto conveniently
  decouples these, which is a bonus reason to use one.
- Inversion: many opto configurations invert the signal - a UART idles HIGH,
  and an inverting stage will produce a permanent break condition unless you
  invert back or configure the receiver accordingly. This is the classic
  first-build bug.
- Baud tolerance: UART tolerates roughly +/-2-3% clock mismatch; slow opto
  edges eat into that margin, so drop the baud rate before blaming the code.

## How to verify what you built
The verification is not "data arrived". It is a set of negative tests:
1. Transmit from LOW continuously and confirm HIGH's UART sees nothing, with
   a scope on the HIGH-side RX pin, not just a silent log.
2. Physically inspect / photograph the wiring and keep it with the design.
3. Power down the HIGH side entirely and confirm LOW cannot detect the
   difference other than by absence of data (no back-pressure, no handshake).
4. Confirm no OTHER path exists - no shared USB providing a CDC serial port
   in both directions, no shared power rail carrying data, no Wi-Fi or
   Bluetooth radio present-but-disabled on the HIGH board. "Disabled in
   software" is not air-gapped; prefer a board with no radio, or physically
   remove the antenna and document it.

Point 4 is where most homebrew air gaps actually fail: the serial diode is
perfect and the Raspberry Pi doing the vision still has onboard Wi-Fi that a
single config change re-enables.

## Self-test
- Why is an optocoupled diode a better artefact to review than an omitted wire?
- What is the inversion bug and how does it present?
- List the negative tests that would convince a sceptic the link is one-way.
