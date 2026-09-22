---
id: task-state-and-notification-policy
title: Task state and notification policy
parent: Edge systems
order: 31
status: not_started
review: false
prereqs: []
notes: []
updated: '2026-09-21'
---
# Task state and notification policy

## Why it exists
"Ping me with everything I need to do" is the user-facing half of the first
milestone, and it is a genuine design problem rather than glue code. The
detector supplies a trigger; this concept supplies the answer to "and then
what, exactly", which determines whether the system earns its place or gets
muted in week two.

## Where the task list lives
It must live on the LOW/bridge side, because it needs to be updated from your
phone or laptop and the camera side is unreachable by construction. This is a
clean consequence of the architecture: the HIGH side knows WHEN to notify and
knows nothing about WHAT the tasks are; the LOW side owns the content. That
separation is a feature - it means the sensitive device holds no personal
data beyond the video it never emits.

Options range from a plain Markdown or JSON file the bridge reads, to a local
Todoist/CalDAV/Home Assistant integration. A local file keeps the bridge's
egress allowlist empty of third parties; an external service does not.

## Selection, not dumping
"Everything I need to do" as a literal dump of 40 items is noise. The useful
shape is a small ranked selection: due or overdue first, then time-boxed
items that fit the window you have apparently just freed up, capped at three
or so. The ranking inputs you have are due date, estimated duration, priority,
and time of day - and, later, the fused-intent channel can add "what you said
you were about to do".

## Notification policy as explicit state
Make these rules explicit and testable, not emergent:
- Refractory period: minimum interval between pings.
- Quiet hours: no pings in a configured window, full stop.
- Escalation: what happens on continued idleness - nothing, usually.
- Suppression: recognise dismissal and back off for that item.
- Absent handling: ABSENT is not IDLE and must never notify.

Each of these is a line in the policy module with a test. The reason to
centralise them is that the failure you are defending against - a system that
is 90% right and still annoying - comes from these rules being scattered.

## Measuring whether it is any good
The engineering metric is pings per day and the fraction you act on within
some window. Log every ping with the state that produced it and your reaction.
Without that log you cannot tell a detector problem from a policy problem,
and you will tune the wrong one.

## Self-test
- Why does the task list live on the network side and not with the camera?
- Write your ranking function. What are its inputs?
- State every rule that can suppress a ping.
