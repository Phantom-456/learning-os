---
id: one-way-observability
title: Observability and versioning without a back channel
parent: One-way data flow
order: 24
status: not_started
review: false
prereqs:
  - unidirectional-protocol-design-no-ack
notes: []
updated: '2026-09-21'
---
# Observability and versioning without a back channel

## Why it exists
Once the diode works, an under-appreciated problem appears: you cannot debug
the HIGH side the way you debug anything else. No SSH, no remote logs, no
metrics scrape, no "curl the health endpoint", no pulling a config down, no
pushing an update. Everything you would normally learn by ASKING, you must
instead arrange for the system to VOLUNTEER - through the same narrow channel
that carries the product data, or not at all. Teams routinely build a correct
diode and then quietly drill a hole through it because operating it became
unbearable. Designing the observability up front is what prevents that.

## Telemetry as a first-class payload
Reserve a record type for health, emitted on a fixed cadence alongside the
intent records: uptime, frames per second, model latency percentiles, dropped
frame count, sequence-number high-water mark, temperature, free disk, config
hash, software version. The LOW side turns this into your dashboard. Keep it
inside the same bounded-length, verified schema - a telemetry record that can
carry arbitrary strings is exactly the loophole the verifier exists to
prevent.

The single most valuable field is the CONFIG HASH: it is how you answer "what
is actually running over there" without being able to ask.

## Local-first logging
The HIGH side should keep rich local logs on its own storage (rotated, size
capped - filling the disk is a self-inflicted outage) and emit only summaries.
When something needs deep debugging, you retrieve those logs the same way you
deploy: physically. Accept this cost explicitly rather than designing around
it.

## Deployment is sneakernet
There is no path INTO the HIGH side by construction, so updates arrive on
removable media or by re-imaging. Consequences you must design for: the two
sides WILL run different versions for periods of time; an update can brick
the device with no remote recovery; you cannot roll back remotely. Practical
answers are an A/B image scheme with automatic fallback on failed boot, a
signed-image check, and a version field in every emitted record so the LOW
side can tell you what it is talking to.

Resist the temptation to build an "update channel" back through the diode.
The moment a reverse path exists for updates, the security property is gone
and the entire architecture was pointless.

## Blind schema evolution
Because you cannot negotiate, both sides must be independently forward- and
backward-compatible by construction:
- Every record carries an explicit schema version.
- Receivers ignore unknown fields rather than erroring.
- Fields are added, never repurposed; semantics of an existing field never
  change silently.
- The receiver is deployed before the sender that uses a new field, since the
  receiver (network side) is the one you can actually update easily.

That last rule is the ordering discipline that makes blind upgrades safe, and
it falls straight out of which side is reachable.

## Self-test
- List the fields in your health record and say what question each answers.
- How do you determine which software version the HIGH side is running?
- What is your recovery plan for a failed update with no remote access?
- State the deploy ordering rule for a new field, and why it is that way.
