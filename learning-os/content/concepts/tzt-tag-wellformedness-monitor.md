---
id: tzt-tag-wellformedness-monitor
title: Well-formedness monitoring (runtime verification over task events)
parent: Task tag model
order: 3
status: not_started
review: false
prereqs:
  - tzt-task-state-machine
notes: []
updated: '2026-09-21'
---
# Well-formedness monitoring (runtime verification over task events)

## Why it exists
The per-instance state machine tracks one task. This concept is the layer above:
a monitor over the *whole* event stream that continuously answers "is the
document still well-formed?" — i.e. is every opened task on a trajectory toward
being closed. This is textbook **runtime verification**: you specify properties
in temporal logic, compile them into finite-state monitors, and feed them the
live event trace, getting a verdict as early as the trace allows.

Framing the problem this way is not academic decoration. It buys three concrete
things:
1. Properties are written declaratively, separately from the perception code, so
   you can add a new rule ("the front door must not be opened while a cooking
   tag is open") without touching the vision stack.
2. Monitor synthesis gives you *early* verdicts on bad prefixes — the monitor
   can report a violation is inevitable before the bad thing finishes happening,
   which is structurally the same thing the anticipatory zone warning needs.
3. You get a vocabulary for the distinction that matters here: **safety**
   properties ("something bad never happens" — violated in finite time,
   detectable) versus **liveness** properties ("something good eventually
   happens" — never violated in finite time). "Every open tag is eventually
   closed" is pure liveness, so a monitor can *never* declare it violated. That
   is not a technicality; it is the reason the system must convert liveness into
   bounded safety.

## The key move: liveness → bounded safety
`G(open(t) -> F close(t))` is unmonitorable. You cannot ever say "this will
never be closed". So you replace it with time-bounded and space-bounded
surrogates that *are* monitorable:

- **Bounded response:** `G(open(t) -> F[0, D_t] close(t))` — closed within the
  task's expected duration budget `D_t`. Violation is detectable at `D_t`.
- **Zone-coupled safety:** `G((open(t) & bound(t, z)) -> !exit(z))` until close.
  "You must not leave the zone with this tag open." A safety property, therefore
  monitorable, therefore alertable — and its *bad prefix* (about to exit) is the
  anticipatory trigger.
- **Matched-close:** `G(close(t, i) -> O open(t, i))` — no close without a
  prior matching open of the same instance (past-time LTL). Catches recogniser
  hallucinations.
- **No-duplicate-open:** `G(open(t, i) -> !O (open(t, i) S !close(t, i)))` —
  the same instance must not be opened twice while already open. Catches the
  canonicalisation failures described in `tzt-task-tag-model`.

Writing these four down explicitly, before writing the runtime, is the single
highest-leverage hour in this project.

## Practical construction
- You do **not** need a full LTL toolchain. Hand-compile each property into a
  small deterministic monitor automaton (typically 2-4 states) and run them in
  parallel over the event stream. Use a library only if the property set grows.
- The event stream is lossy and out-of-order (frames drop, a phone reconnects).
  Real runtime-verification work on lossy/out-of-order streams matters here:
  a monitor should emit a verdict as soon as it is justified and keep that
  verdict correct when a knowledge gap is later filled. Practically: keep
  verdicts three-valued (`true` / `false` / `unknown`) rather than boolean,
  and never let `unknown` silently render as `ok`.
- Monitors are where you put *cross-task* rules that no single instance can see:
  "at most one high-risk open tag at a time", "do not warn about task B within
  60s of warning about task A" (alert-fatigue guard).

## What "done" looks like
You can replay a hand-written trace of ~50 synthetic events — including a
dropped close, an out-of-order close, a duplicate open, and a zone exit — and
the monitor produces exactly the verdicts you predicted on paper beforehand.

## Watch for
- Trying to monitor unbounded liveness and quietly never firing.
- Two-valued verdicts over a lossy stream (you will report "all good" during a
  camera outage, which is the worst possible lie for this product).
- Putting cross-task policy inside the per-instance machine; it belongs here.
