---
id: tzt-evaluation-metrics-tagging
title: Evaluating a task-tagging system end to end
parent: Evaluation & deployment
order: 61
status: not_started
review: false
prereqs:
  - tzt-personal-dataset-annotation
  - tzt-tag-wellformedness-monitor
notes: []
updated: '2026-09-21'
---
# Evaluating a task-tagging system end to end

## Why it exists
The components have standard metrics (mAP, segmental F1, IDF1) and none of them
answer the product question: *did it stop me forgetting things, without driving
me mad?* You need a small set of system-level metrics defined in terms of the tag
model, and they should be the numbers you look at when deciding whether a change
was an improvement.

## The metric set
**Tag correctness**
- **Instance-level precision/recall** over task instances, matched to ground
  truth by temporal IoU (≥0.5 is a reasonable default) *and* matching zone.
- **Boundary error**: median absolute error in seconds for `opened_at` and
  `closed_at`, reported separately — they have different causes and different
  costs.
- **False-open rate per idle hour**: phantom tasks. The metric that governs
  whether the system is liveable.
- **False-close rate**: tasks silently closed while still running. The most
  dangerous single failure, because it removes the task from the system's memory
  exactly as the user's memory also failed. Should be driven near zero even at
  significant cost to other metrics.
- **Hang rate**: tasks that ended in ABANDONED rather than CLOSED. Distinguish
  "user finished it and we missed the close" from "user genuinely forgot" —
  only the second is a success for the product.

**Anticipatory warning quality**
- **Lead time** distribution (median and 10th percentile) on true crossings.
- **False alarm rate per open-task-hour.**
- **Miss rate**: crossings with an open tag and no prior warning.

**Outcome**
- **Forgotten-task rate**: instances where the user genuinely forgot, with and
  without the system armed. This is the only metric that measures the actual
  goal. It needs an A/B over days and it is worth the effort.
- **Dismissal rate over time**: the trust erosion indicator.

## How to run it
- Everything runs offline against the recorded event stream
(`tzt-event-stream-design`). One command, one table, minutes not days.
- **Ablate honestly.** Turn off the anticipatory logic and use plain exit
  detection; if lead time does not change, the feature is not real.
- **Report the curve, not a point.** Every threshold in this system trades two
  costs; a single number hides the trade you actually made.
- **Regression-test the monitor properties** from
  `tzt-tag-wellformedness-monitor` on synthetic traces in CI. They are fast,
  deterministic, and catch the state-machine bugs that video evaluation is too
  coarse to see.

## Watch for
- Averaging across tasks and zones, which hides that the stove — the one that
  matters — is the worst-performing case.
- Optimising frame-level metrics because they are easy to compute and move
  smoothly. They do not correlate well with instance-level correctness here.
