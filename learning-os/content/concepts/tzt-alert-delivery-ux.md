---
id: tzt-alert-delivery-ux
title: Alert delivery and the human loop
parent: Evaluation & deployment
order: 63
status: not_started
review: false
prereqs:
  - tzt-alert-policy-thresholds
notes: []
updated: '2026-09-21'
---
# Alert delivery and the human loop

## Why it exists
The alert is the product. Everything upstream exists to produce a few well-timed
seconds of the user's attention, and how those seconds are spent determines
whether the system works and whether it keeps being used.

## Channel design
- **Match channel latency to alert urgency.** The anticipatory warning has a
  budget of a couple of seconds; a phone notification that the user must unlock
  to see does not fit in it. Ambient, zero-latency channels — a smart bulb
  pulsing, a speaker chirp in the room, a watch tap — are the right medium for
  AT_RISK. Reserve the phone for OVERDUE and post-hoc summaries.
- **Location-aware delivery.** Warn on the device nearest the user. The system
  already knows where they are; use it.
- **Content, in this order**: which task, how long open, which zone, and one
  obvious action. "Rice — 12 min — stove. Done?" A notification that requires
  reading a sentence has already failed at the timescale it operates on.
- **The GTA reference is a design spec, not a joke.** What makes that warning
  work is: it is ambient (on-screen, not modal), it is *directional* (it tells
  you which way is back), it escalates with a visible countdown, and it silently
  disappears the instant you turn around. All four are implementable and all four
  are good ideas here — especially the last: an alert that vanishes when the
  problem resolves is why you can afford to fire early.

## The feedback loop
Every alert is a labelling opportunity and should return a signal: "done",
"not a task", "snooze". These append `user_correction` events
(`tzt-event-stream-design`), close or reclassify the tag, and become training
examples (`tzt-few-shot-task-enrollment`). A system with no return path is
frozen at install quality and will slowly become wrong as the home changes.

## Trust, and the honest-uncertainty rule
The user is relying on this to compensate for a real memory problem, which makes
silent failure the worst outcome. Two rules follow:
- **Surface the open set.** A glanceable list of currently-open tags, always
  available. Much of the value is available without any alert at all — the user
  checking "what's open?" before leaving is the low-tech version of the whole
  product, and it works even when perception is mediocre.
- **Say when you don't know.** Camera down, task unknown-state, ambiguous close:
  say so. Assistive-technology research on memory support is consistent that
  users calibrate their reliance on the system, and a system that is silently
  wrong destroys that calibration in a way a system that admits uncertainty does
  not.

## Watch for
- Modal, blocking alerts — they get dismissed reflexively.
- Alerts with no action, which train the user that alerts are noise.
- A quiet-hours policy that also silences the high-risk stove case.
