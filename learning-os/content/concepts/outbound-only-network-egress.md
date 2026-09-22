---
id: outbound-only-network-egress
title: Outbound-only egress on the bridge device
parent: Edge systems
order: 30
status: not_started
review: false
prereqs:
  - unidirectional-data-diode-architecture
notes: []
updated: '2026-09-21'
---
# Outbound-only egress on the bridge device

## Why it exists
The brief asks for the network side to be an "outbound-only connection". The
diode makes the camera unreachable; this concept makes the bridge itself a
poor target, so that the weakest node in the system is still not an easy
foothold on your LAN. It is a software/policy control rather than a physical
one, and should be labelled as such - but within its class it is worth doing
properly.

## What "outbound-only" actually means
It does not mean UDP-with-no-reply; almost all useful transports need return
packets at the IP layer. It means: the bridge initiates every connection,
accepts none, and listens on nothing. Concretely:
- No listening sockets at all. Verify with "ss -tulpn"; the correct output is
  empty, and "empty" is a testable assertion you can automate.
- Default-deny inbound at the host firewall (nftables/ufw), permitting only
  ESTABLISHED/RELATED return traffic for connections the bridge itself opened.
- Default-deny OUTBOUND too, with an allowlist of the specific destinations
  it needs. This is the half people skip, and it is the half that limits the
  damage when the bridge is compromised.
- No SSH daemon in the steady state (administer it physically or from a
  separate management path), no mDNS/SSDP advertisement, no discovery
  responder.

## The push/pull asymmetry
Because nothing may connect IN, everything is a PUSH from the bridge: it
posts notifications to a service, publishes to a broker, or writes to a
store - and it never exposes an API that your phone polls. If you want a
dashboard, the bridge pushes state somewhere else and the dashboard reads
from there. Designing this way removes an entire class of "expose it to the
internet" mistakes.

## Delivering the ping
Practical local-first options: publish to an MQTT broker elsewhere on the LAN
(Home Assistant's notify pipeline picks it up), push to a self-hosted ntfy or
Gotify server, or send a platform push notification. All are outbound
initiations from the bridge. Prefer one that stays on your LAN, for the same
reason the rest of the design exists - and note that whichever you choose now
sees the text stream, so it inherits the sensitivity of that data.

## Minimising the bridge
The bridge's job is small on purpose: read framed records from the serial
port, validate them against the schema (the verifier), and push. Keep it that
way. A minimal read-only root filesystem, no compilers, one service, and a
narrow allowlist makes the compromise case genuinely uninteresting - which is
the actual goal, since this is the node that will eventually be attacked.

## Self-test
- What does "ss -tulpn" print on your bridge? Should be nothing.
- Which destinations are on your egress allowlist and why each?
- If the bridge is fully compromised, enumerate what the attacker gets.
