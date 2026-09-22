---
id: unidirectional-data-diode-architecture
title: Unidirectional data-diode architecture
parent: One-way data flow
order: 20
status: not_started
review: false
prereqs: []
notes: []
updated: '2026-09-21'
---
# Unidirectional data-diode architecture

## Why it exists
The usual way to keep a camera private is a software promise: a firewall
rule, an egress allowlist, a privacy policy, a config flag. All of those are
policy enforced by software that can be misconfigured, updated, or
compromised. A data diode replaces the promise with a physical property.
Information can traverse the link in exactly one direction because the
hardware on the return path does not exist - not "is disabled", does not
exist. No software bug and no remote attacker can create a channel through a
wire that was never run.

This is the core architectural idea of the project: the device that sees the
room has no network interface at all, and the only thing leaving it is a
narrow stream of text over a physically one-way link into a separate,
network-capable device that can never talk back.

## The canonical topology
Three components, and the naming matters because it is how the security
argument is stated:

  HIGH side (the camera / offline device)
      -> the TX-only side of the diode
      -> [ physically one-way medium: optical, optocoupled serial, TX-only
           fibre pair, a light/photodiode gap ]
      -> the RX-only side of the diode
      -> LOW side (the bridge / network device) -> LAN

In the classic defence use, "high" means the more sensitive classification
and the diode prevents leakage OUT of it. In this project the polarity is a
little different and worth being precise about: the camera side is sensitive
(it holds raw video) and the network side is untrusted (it touches the LAN).
The diode is doing BOTH jobs at once - it stops raw video reaching the
network, and it stops the network reaching the camera. That is exactly why
"camera device with a firewall" is not an equivalent design.

## What a diode does and does not give you
It gives you: no command-and-control channel into the camera device, no
remote exfiltration of anything the camera device holds beyond what it
deliberately emits, no interactive protocol into the sensitive side, and an
argument that survives compromise of the LOW-side software.

It does NOT give you: confidentiality of what you do send (the LOW side sees
every byte, so the FILTERING of what crosses is a separate control from the
one-wayness), integrity guarantees (no ACKs means no retransmission - see
the protocol concept), or protection against a compromised HIGH side
deciding to encode video into the text channel. Flow control is one layer;
national-guidance patterns for cross-domain transfer (NCSC's import/export
patterns, NSA's cross-domain guidance) consistently pair it with content
verification, schema enforcement and logging on the receiving side.

## The "verifier" idea
Mature designs put a small, dumb, auditable component next to the diode whose
only job is to check that what is crossing conforms to an extremely narrow
schema, and to drop anything else. Narrow-and-boring beats clever: a
verifier that accepts only a fixed-length line matching one regex is one you
can actually reason about. In this project the verifier enforces "this is a
short structured intent record, not a base64 blob", which is what stops the
channel from being quietly repurposed as a video pipe.

## Covert channels - the honest caveat
A one-way channel of N bits per second is a covert channel of up to N bits
per second, and timing of the messages carries information too. A
sufficiently compromised HIGH side could dribble low-resolution imagery
across a text link over hours. Mitigations are rate limiting, fixed-rate
padded transmission (send a record every T seconds whether or not there is
news, so the timing carries nothing), and the narrow verifier above. State
this residual risk explicitly rather than claiming the gap is absolute - the
claim you can defend is "no inbound path, and outbound is constrained to a
verified narrow schema at a bounded rate".

## Self-test
- Draw the HIGH/LOW topology and name what physically prevents reverse flow.
- Explain why a firewall rule on a single device is not equivalent.
- Name three things a diode does NOT protect against.
- What does the verifier add that the one-wayness does not?
