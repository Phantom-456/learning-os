---
id: source-runtime-verification-wikipedia
type: article
title: Runtime verification (Wikipedia)
url: 'https://en.wikipedia.org/wiki/Runtime_verification'
concepts:
  - tzt-tag-wellformedness-monitor
added: '2026-09-21'
notes: []
---
Compact orientation to the field the well-formedness monitor belongs to: specifications compiled into finite-state monitors, fed an execution trace, producing verdicts. Worth it specifically for the safety-vs-liveness distinction, which is the load-bearing idea here — "every open tag is eventually closed" is liveness and therefore unmonitorable, which is why it must be converted into bounded-time safety properties before the system can ever alert on it.
