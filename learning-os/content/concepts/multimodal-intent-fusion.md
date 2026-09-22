---
id: multimodal-intent-fusion
title: Multimodal intent fusion (gesture plus speech)
parent: Multimodal intent
order: 51
status: not_started
review: false
prereqs:
  - dynamic-gesture-recognition
  - on-device-asr
  - sensor-fusion
notes: []
updated: '2026-09-21'
---
# Multimodal intent fusion (gesture plus speech)

## Why it exists
"Put THAT over THERE" is unintelligible as text and unintelligible as
gesture, and completely clear as both together. Fusion is what lets the
system resolve deixis - words whose referent is supplied by the body - and,
more prosaically, lets each modality cover the other's errors. The survey
literature on multi-modal human-machine interaction consistently reports
higher task completion and lower error rates for multimodal interfaces over
unimodal ones; the interesting question is not whether to fuse but where.

## Early, late, and hybrid
- **Early (feature-level)** fusion concatenates raw or embedded features from
  both streams and trains one model. Maximum expressiveness, but it needs
  paired training data you do not have, and adding or changing a modality
  means retraining everything.
- **Late (decision-level)** fusion runs a recogniser per modality and combines
  the OUTPUTS - here, a gesture label plus a parsed utterance intent. It is
  the approach most practitioners prefer for interactive systems, precisely
  because each modality and its vocabulary can be updated independently, and
  each recogniser can be tested on its own. Occlusion or noise in one stream
  degrades gracefully rather than corrupting a shared representation.
- **Hybrid** approaches (cross-modal attention between mid-level features,
  e.g. transfer modules between CNN branches) sit between the two and are
  where the research frontier is.

For this project: late fusion. It matches the architecture (two independent
recognisers on one device, one narrow record emitted), it is debuggable, and
it does not require a paired corpus.

## Temporal alignment is the real work
Gesture and speech are not synchronous. People typically begin the gesture
slightly BEFORE the co-referring word, and the two recognisers have very
different latencies - a gesture classifier may fire in 200 ms while ASR
delivers a transcript a second after the utterance ends. Fusion therefore
operates over a shared, timestamped event buffer with a matching WINDOW, not
over "whatever arrived at the same instant". Design decisions to make
explicit: window width (typically a small number of seconds), whether a
gesture may bind to a word that precedes it, and what happens when two
candidate gestures fall in one window.

Timestamp everything at CAPTURE time, not at the moment a recogniser
finishes, or your alignment is measuring your own compute jitter.

## The fusion rules
For a small system, a rule/slot-based combiner beats a learned one and is
inspectable: parse the utterance into an intent with typed slots, then fill
unbound or deictic slots from gesture evidence in the window. Add explicit
handling for the three interesting cases - agreement (raise confidence),
complementarity (each fills different slots; this is the valuable case), and
CONFLICT. Decide conflict policy deliberately: speech usually carries the
propositional content and should win on the verb, while gesture wins on
spatial reference. Whatever you choose, make it a stated rule with a test,
not an accident of which branch ran first.

## Confidence and abstention
Every fused intent should carry a confidence, and there must be a path that
refuses to act - asking for confirmation, or doing nothing - below a
threshold. An assistant that acts on every low-confidence guess is worse than
one that occasionally asks. This matters doubly here because the fused intent
is what crosses the diode and triggers real actions, and there is no channel
to take it back.

## Self-test
- Why late fusion here rather than early? Give two concrete reasons.
- Where in the pipeline are your timestamps taken, and why there?
- State your conflict policy and the test that pins it.
