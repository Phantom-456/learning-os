---
id: tzt-task-state-machine
title: Per-instance task state machine (open/close lifecycle)
parent: Task tag model
order: 2
status: not_started
review: false
prereqs:
  - tzt-task-tag-model
notes: []
updated: '2026-09-21'
---
# Per-instance task state machine (open/close lifecycle)

## Why it exists
`tzt-task-tag-model` says a task is an interval with an open and a close.
That is the *data*. This concept is the *behaviour*: the explicit finite state
machine that each live task instance runs, driven by noisy perception events and
by time. Without it you end up with a pile of boolean flags (`isOpen`,
`maybeOpen`, `warnedAlready`, `userDismissed`) whose combinations are
untestable and which will, guaranteed, produce the exact failure you are trying
to prevent: a task that is neither properly open nor properly closed.

## The state machine
A per-instance statechart, not a global one. One machine per live task.

```
                 open-evidence (low conf)
   (nothing) ─────────────────────────────▶ PROVISIONAL
                                              │      │
              open-evidence sustained /       │      │ evidence decays,
              confidence > θ_open             │      │ or contradicted
                                              ▼      ▼
                                            OPEN ──────▶ (discarded)
                                             │ │ │
        subject leaves zone  ┌───────────────┘ │ └──────────────┐ close-evidence
        (predicted or actual)│                 │ expected        │ > θ_close
                             ▼                 │ duration        ▼
                        AT_RISK ───────────────┤ exceeded     CLOSING
                          │  ▲                 │                 │
        subject returns   │  │ predicted exit  ▼                 │ close confirmed
        to zone ──────────┘  │             OVERDUE               ▼
                             │                 │              CLOSED (terminal)
                    user dismisses /           │ timeout policy
                    snooze ────────────────────┴──────────▶ ABANDONED (terminal)
```

The states earn their place as follows:

- **PROVISIONAL** — a single frame said "cooking started". You must not alert on
  this. Provisional absorbs recogniser flicker; it either matures into OPEN on
  sustained evidence or dies silently. This state is the single biggest source
  of perceived system quality: without it the user gets phantom tasks and stops
  trusting the app within a day.
- **OPEN** — the tag is live and is bound to a zone. This is where the zone
  monitor is armed.
- **AT_RISK** — the *anticipatory* state. Entered on a predicted (not actual)
  zone exit; this is the state that fires the "you're about to walk away from
  the stove" reminder. It is deliberately re-entrant/reversible: walking back
  returns you to OPEN without ever notifying, and *that reversibility is what
  makes early warning affordable*. A design that only has "inside" and
  "outside" cannot express AT_RISK and therefore cannot warn early.
- **CLOSING** — close evidence seen but not yet corroborated. Mirrors
  PROVISIONAL on the other end. Prevents an occlusion or a momentary empty stove
  from closing a task that is still running.
- **OVERDUE** — open far past its expected duration with no close evidence.
  Distinct from AT_RISK: AT_RISK is spatial, OVERDUE is temporal. They can hold
  simultaneously, which is why in a real statechart these should be modelled as
  two **parallel regions** (a `presence` region and a `progress` region) over
  the same instance rather than as mutually exclusive states. Harel statecharts'
  orthogonal regions exist precisely for this; flattening them into one enum is
  the state-explosion bug.
- **CLOSED / ABANDONED** — terminal, and *different*. Closed means the task
  finished. Abandoned means the system gave up. Never collapse them: the
  abandoned rate is your headline quality metric.

## Implementation notes that actually bite
- **Make every transition event-driven and pure.** `reduce(state, event) ->
  state` with time itself delivered as a `TICK` event. Then the entire
  lifecycle is testable by replaying a synthetic event list with zero video in
  the loop — you can and should build and test this whole checkpoint before
  touching a camera.
- **Guards, not branches.** Confidence thresholds, dwell requirements and
  cooldowns belong in transition guards so they are visible in the diagram and
  tunable as data, not buried in if-statements.
- **Entry/exit actions own side effects.** Notifications fire from
  `onEntry(AT_RISK)`, not from the perception loop. This keeps "when do we
  decide something" separate from "when do we tell the human", which you will
  want when you start tuning alert aggressiveness.
- **Snooze is a real state, not a boolean.** Model it as a timed transition back
  into the armed state, otherwise snooze leaks and the task is never raised
  again.
- **Persist the machine.** Instances must survive a process restart — the whole
  point is memory that outlives attention. Persist the state plus the event log,
  and rebuild by replay.

## Watch for
- Alerting from OPEN instead of AT_RISK (that is a post-hoc reminder, which the
  brief explicitly rejects).
- Hidden states expressed as extra booleans; if you need a boolean alongside the
  enum, it is probably a parallel region.
- Non-reversible AT_RISK. If returning to the zone cannot silently cancel the
  warning, you must set the threshold so conservatively that the warning is
  always late.
