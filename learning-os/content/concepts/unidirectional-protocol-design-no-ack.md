---
id: unidirectional-protocol-design-no-ack
title: Protocol design over a link with no back channel
parent: One-way data flow
order: 22
status: not_started
review: false
prereqs:
  - unidirectional-data-diode-architecture
notes: []
updated: '2026-09-21'
---
# Protocol design over a link with no back channel

## Why it exists
Every protocol you have ever used assumes a reply. TCP's reliability is
built from ACKs; serial flow control depends on the receiver saying "stop";
request/response is the default shape of nearly all software. Put a diode in
the middle and ALL of that is gone at once. This concept is the software half
of the air gap, and it is where builds that got the hardware right still end
up losing data silently.

## What you lose, precisely
- No acknowledgements, so no retransmission and no way to know a message
  landed.
- No flow control, so a fast sender overruns a slow receiver with no
  back-pressure - the receiver simply drops bytes.
- No handshake, so no session establishment, no negotiated parameters, no
  "are you there".
- No error signalling, so a corrupt frame is indistinguishable from silence
  unless you built detection into the frame itself.
- No TCP, no TLS, no HTTP, no MQTT, no anything that expects a round trip.

## The replacement toolkit
**Framing.** You need self-delimiting frames because you cannot ask for a
resync. Either length-prefixed frames or a byte-stuffed delimiter scheme
(COBS is the standard answer for serial: it guarantees a zero byte appears
only as the frame delimiter, so a receiver joining mid-stream resynchronises
at the next zero, deterministically). Newline-delimited JSON is the lazy
version and is fine only if you guarantee no newline can appear inside a
record.

**Integrity.** A CRC over each frame, checked on arrival. Without it you
cannot distinguish a good record from a corrupted one, and corruption is
what an unacknowledged link gives you instead of an error.

**Sequence numbers.** A monotonically increasing counter per frame. This is
the only way the receiver can detect LOSS - the sender's counter jumping from
41 to 43 tells you record 42 died. You still cannot recover it; you can log
the hole, which is the difference between a link with known loss and a link
that silently lies.

**Redundancy instead of retransmission.** Since you cannot retransmit on
demand, you pre-emptively add redundancy. Two workable strategies:
(a) blind repetition - send each record N times, receiver deduplicates by
sequence number; trivially simple and perfectly adequate for small, rare
messages like ours; (b) forward error correction - erasure codes (RaptorQ and
similar fountain codes) let a receiver reconstruct the original from any
sufficiently large subset of encoded packets. This is what production diode
software does: ANSSI's Lidi transfers streams and files across a
unidirectional link using RaptorQ FEC, and CEA's hairgap does the same for
high-bandwidth one-way transfer. Reading either one shows you the whole
problem shape in concrete form.

**Heartbeats.** The receiver cannot ask "are you alive", so the sender must
assert it on a fixed cadence. A record every T seconds whether or not there
is news lets the LOW side detect a dead HIGH side, and (usefully) makes the
traffic timing carry no information about your activity.

**Idempotence.** Because you may send the same record several times and
cannot coordinate, every message must be safe to apply more than once.
Design records as facts with ids ("idle_since=14:02:11, seq=91"), not as
imperatives ("send a ping"), so a duplicate is a no-op rather than a second
notification.

## Choosing the payload schema
The schema is also a security control (see the verifier idea in the
architecture concept). Prefer fixed-shape, bounded-length, human-readable
records with an explicit version field. A bound on record length and rate is
what prevents the channel from being repurposed to carry bulk data, and a
version field is essential because you cannot negotiate - the two sides are
upgraded independently and must interoperate blind. Rule of thumb: a receiver
must ignore unknown fields and never crash on them, because it may be older
than the sender and has no way to say so.

## Self-test
- Name five guarantees you lose and the mechanism that replaces each.
- Why does COBS framing let a mid-stream listener resynchronise?
- Why must every record be idempotent here, when it need not be over TCP?
- How would you detect a dead sender with no back channel?
