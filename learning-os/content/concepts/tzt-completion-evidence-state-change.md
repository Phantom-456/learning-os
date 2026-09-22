---
id: tzt-completion-evidence-state-change
title: 'Completion evidence: object state change as the closing signal'
parent: Activity recognition
order: 35
status: not_started
review: false
prereqs:
  - tzt-online-action-start-detection
  - tzt-object-detection-tracking
notes: []
updated: '2026-09-21'
---
# Completion evidence: object state change as the closing signal

## Why it exists
Starts are visually dramatic — a person walks up, picks something up, motion
happens. Completions often are not. The pan comes off the hob while you are
looking elsewhere; the washing machine simply stops. If you rely on
"recognise the completion action" alone, tasks will hang open, the system will
nag about things you already finished, and the user will disable it. Close
detection needs its own evidence sources, and this concept is that catalogue.

## Sources of close evidence, roughly in order of reliability
1. **Object state change.** The most robust visual signal, and a recognised
   research task in its own right — egocentric benchmarks define *object state
   change* classification and temporal localisation as first-class problems
   (an object transitions between states as a result of interaction: pan on hob
   vs pan in sink; machine door shut vs open). For your tasks, the close
   condition is very often best written as a state predicate on an object rather
   than as an action: "hob region no longer contains a pan" closes cooking more
   reliably than trying to see the act of removal.
2. **Non-visual sensors.** A smart plug reporting the hob's power draw dropping
   to zero is nearly perfect evidence, available instantly, in the dark, with no
   model. For any task with an electrical signature, this should be the primary
   close signal and vision the fallback. Same for door contacts and washing
   machine vibration.
3. **Zone-departure-with-object.** The person leaves the zone *carrying* the
   task object — often means done, sometimes means moved. Weak on its own,
   useful as corroboration.
4. **Absence of the task's characteristic activity** for a sustained period.
   Weakest. Prone to closing tasks that are merely unattended — which is exactly
   the situation the product exists to handle. Use only with a long timeout and
   never as a sole close.
5. **User confirmation.** Always available, always correct, costs attention.
   Make it one tap from the alert and treat it as the ground truth that trains
   everything else (`tzt-few-shot-task-enrollment`).

## Design guidance
- Write the close condition **per task type, as an explicit predicate over
  evidence sources**, in the tag schema. Do not leave it as "the model will
  figure it out". This is the part of the system most improved by ten minutes of
  thinking per task.
- Require **corroboration** for close: the CLOSING state in the task state
  machine exists to hold a candidate close until a second source agrees or a
  confirmation window elapses.
- Distinguish **closed** from **abandoned** from **unknown**. If the camera was
  blind for the relevant period, the honest answer is unknown, and the honest
  behaviour is to ask.

## Watch for
- Symmetric thresholds for open and close. Close should be markedly harder to
  trigger.
- Using "person left the zone" as a close. It is the *trigger for a warning*, and
  treating it as a completion inverts the entire product.
