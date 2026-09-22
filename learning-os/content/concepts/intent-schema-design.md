---
id: intent-schema-design
title: Intent schema design for a one-way channel
parent: Multimodal intent
order: 52
status: not_started
review: false
prereqs:
  - multimodal-intent-fusion
  - unidirectional-protocol-design-no-ack
notes: []
updated: '2026-09-21'
---
# Intent schema design for a one-way channel

## Why it exists
This is where the two halves of the project meet. The fusion stage produces a
meaning; the diode will only carry a narrow, bounded, verifiable record. The
schema is simultaneously the API between the two devices, the security
verifier's ruleset, and the thing that must evolve without negotiation. Get
it right and everything downstream is easy; get it wrong and you will want a
back channel, which you cannot have.

## The shape
A typed intent with named slots, plus envelope fields the transport requires:

  { v: 1, seq: 9142, ts: "2026-09-21T14:02:11Z", kind: "intent",
    intent: "remind", slots: { subject: "...", when: "..." },
    conf: 0.86, evidence: { gesture: "point", asr_conf: 0.9 } }

Every field earns its place. "v" because you cannot negotiate versions.
"seq" because it is the only way the receiver detects loss. "ts" taken at
CAPTURE so the receiver can reason about ordering and staleness. "conf" so
the receiver can apply its own policy rather than trusting a boolean.
"evidence" sparingly, for debugging a link you cannot interrogate.

## Constraints the diode imposes
- **Bounded length.** A hard maximum per record, enforced by the verifier.
  This is what stops the channel being repurposed to carry bulk data, so the
  bound is a security control, not a performance tweak. Free-text slots need
  an explicit length cap for the same reason.
- **Closed vocabularies.** "intent" should be an enum, not an arbitrary
  string. An enum is checkable by a dumb verifier; a free string is not.
- **No nesting depth / no arbitrary structure.** Flat and boring parses
  safely. Deeply nested, arbitrary-shaped payloads are hard to verify and
  easy to smuggle through.
- **Idempotence.** Records are facts with ids, never imperatives, so a
  duplicate delivery (from blind repetition) is a no-op.
- **Bounded rate.** Records per minute is capped, and the cap is measured.

## Versioning with no negotiation
Add fields, never repurpose them. Receivers ignore unknown fields. Deploy the
receiver (network side, easy to update) before the sender (camera side,
sneakernet only) that emits a new field. Keep a written changelog of the
schema with the design documents, because the schema IS the contract and
there is no runtime way to discover it.

## Writing it down in a checkable form
Express the schema as an actual machine-readable definition - a JSON Schema,
a protobuf/flatbuffer definition, or a strict regex for a fixed-field line
format - and have the verifier enforce that exact artefact. A schema that
lives only in a document drifts from the code within weeks. For a very narrow
channel, a fixed-field line format validated by one regex is a defensible
choice specifically because it is small enough to review in full.

## Self-test
- Justify every field in your envelope. Delete one that cannot be justified.
- What is your maximum record length and how is it enforced?
- Walk through adding a new slot: what deploys first, and why?
