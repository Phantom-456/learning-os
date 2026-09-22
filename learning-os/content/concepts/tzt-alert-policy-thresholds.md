---
id: tzt-alert-policy-thresholds
title: 'Alert policy: thresholds, escalation and alert fatigue'
parent: Anticipatory alerting
order: 52
status: not_started
review: false
prereqs:
  - tzt-anticipatory-zone-exit
notes: []
updated: '2026-09-21'
---
# Alert policy: thresholds, escalation and alert fatigue

## Why it exists
The system's only output is interruption, and interruption has a cost that
compounds. A system that is right 90% of the time but interrupts eight times a
day will be muted within a week, at which point its accuracy is irrelevant.
Alert policy is therefore not UX polish downstream of the algorithm; it is the
objective function the algorithm should have been tuned against all along.

## Decide these explicitly
- **The operating point, in the user's units.** Not "we picked a 0.7 threshold"
  but "at most one false alert per day, accepting a 12% miss rate on low-risk
  tasks". Derive the threshold from that budget by reading it off the
  false-alarm-rate-vs-miss-rate curve from `tzt-anticipatory-zone-exit`.
- **Per-task risk weighting.** A forgotten stove and a forgotten laundry load are
  not the same event. Let each tag type carry a risk level that scales both the
  alert threshold and the escalation aggressiveness. High-risk tasks should
  tolerate more false alarms; low-risk tasks should be nearly silent.
- **Escalation ladder** over nested zones and time: silent log entry → ambient
  cue (a light, a soft tone) → phone notification → insistent alert. Escalate on
  distance/zone level and on overdue duration, not by repeating the same alert.
- **Confirmation window.** Fire the internal AT_RISK transition early, hold the
  user-facing notification for 1-3 s, cancel if they turn back. Buys lead time
  without buying nuisance.
- **Rate limiting and grouping.** A global cap per hour; group simultaneous
  at-risk tags into one message. Implement as cross-task rules in the
  well-formedness monitor, where the global view lives.
- **Every alert needs a one-tap resolution** ("done" / "not a task" / "snooze
  20m"). Without it, the only available user action is to ignore the alert, which
  trains them to ignore all of them — and you lose the label.
- **Snooze must be a timed state**, not a dismissal, or the task the system
  exists to remember is forgotten by the system too.

## Measure the policy, not just the model
Track alerts-per-day, dismissal rate, action-taken rate, and
tasks-abandoned-without-alert. Dismissal rate climbing over weeks is the early
warning that you are burning trust; it will show up long before the user says
anything.

## Watch for
- Tuning the perception threshold and the alert threshold as one number. They are
  separate decisions with separate costs.
- Optimising a single F1 across all tasks, which averages away the risk
  asymmetry that is the entire point.
- No silent mode. There must be a way to be left alone that does not involve
  uninstalling.
