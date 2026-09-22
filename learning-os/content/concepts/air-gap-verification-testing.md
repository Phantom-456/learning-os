---
id: air-gap-verification-testing
title: Verifying the gap holds
parent: One-way data flow
order: 25
status: not_started
review: false
prereqs:
  - optocoupler-uart-diode-hardware
  - air-gapped-sensor-threat-model
notes: []
updated: '2026-09-21'
---
# Verifying the gap holds

## Why it exists
An air gap is a claim, and an unverified claim degrades. This concept is the
discipline of turning "we designed it one-way" into evidence a sceptic would
accept - and of re-establishing that evidence after every change, because the
failure mode is not that the gap was never real, it is that it stopped being
real six months later when someone needed to debug something.

## Negative testing is the whole discipline
Ordinary testing asks "does the thing work". Here the important tests ask
"is the thing that must not happen, absent" - and proving absence needs a
different method than proving presence. Concretely:

**At the wire.** Scope the HIGH-side RX pin while the LOW side transmits
continuously at several baud rates. Expect a flat line. A software read
returning nothing is weaker evidence than a scope trace, because software can
be wrong about which pin it is reading.

**At the device.** Enumerate every interface on the HIGH board and account
for it: Wi-Fi, Bluetooth, Ethernet, USB (a USB gadget/CDC link is
bidirectional and is the classic accidental back channel), GPIO headers,
UART consoles, and JTAG/SWD debug pins, which are a full read/write path into
the processor if exposed. Prefer hardware with no radio at all. Where a radio
exists, "disabled in software" is a configuration, not a gap - record that
honestly in the design as a policy control.

**At the network.** From the LAN, sweep for the HIGH device: ARP scan, full
port scan, mDNS/SSDP discovery, passive capture on the segment. Expect it to
be invisible. Separately, capture ALL traffic from the LOW side for a long
window and confirm it is outbound-only to the intended destination, and that
its volume is consistent with text records - a sudden bandwidth increase is
the signature of a channel being misused.

**At the payload.** Automatically assert that every record crossing conforms
to the schema and the length bound, and alarm on anything else. Compute the
actual bits-per-hour crossing the link and compare it to your stated bound;
this is the quantitative version of "no video is getting out" and is the one
number to put on a dashboard.

**Under power cycling.** Test the gap with each side independently powered
down and brought back. Boot-time behaviour is where bidirectional debug
consoles and DHCP clients wake up before anything configures them off.

## Regression, not a one-off
Write these as a checklist that runs after every hardware change, every
re-image and on a calendar cadence, and keep the results dated alongside the
design. A photograph of the wiring, a scope capture, a port-scan output and a
traffic sample are the four artefacts. If you ever cannot produce them, the
gap is a story rather than a control.

## Knowing what you have NOT proved
Be precise in the claim. You can demonstrate: no inbound path, no device
presence on the network, outbound conformance to a narrow schema, and a
bounded data rate. You cannot demonstrate: that a compromised HIGH side is
not encoding information in message timing or in the low-order content of
legitimate fields. Say so, and mitigate with fixed-cadence padded
transmission if the residual risk matters to you. A defensible security
claim is a narrow one that you tested, not a broad one that you asserted.

## Self-test
- Produce the four artefacts for your current build, dated.
- Which of your controls are hardware, which are configuration, which are
  policy? Be honest about each.
- What is your measured bits-per-hour across the link vs your stated bound?
