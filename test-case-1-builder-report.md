# Test case 1 — builder report

**Task:** draft a syllabus for the "edge pose/gesture + voice assistant with a
network-gapped camera" brief, following `.claude/skills/syllabus-draft/SKILL.md`
and `.claude/skills/resource-finder/SKILL.md`.

**Date:** 2026-09-21
**Content root written to:** `/Users/avishi/Workspace/learning-os/learning-os/content`
**Mechanism:** a one-off `npx tsx` script importing `lib/core/{concepts,sources,projects,templates}`
directly (the `learning-os` MCP server was not reachable from this session, so the
same functions the MCP tools wrap were called directly). Script kept out of the
repo, in the session scratchpad:
`/private/tmp/claude-501/-Users-avishi-Workspace-learning-os/fd351c2e-8845-4bd4-9e94-6f3e90ace38d/scratchpad/seed-edge-assistant.ts`

---

## 1. What was created

### Project (1)

`edge-pose-gesture-assistant` — "Air-gapped edge pose, gesture and voice assistant"
→ `content/projects/edge-pose-gesture-assistant.md`, 9 checkpoints, `status: in_progress`.

`metadata` records the two-device split explicitly (`high_side`, `low_side`,
`link`, `first_milestone`, `drafted_from`).

### Checkpoint DAG (9)

```
cp-live-pose-pipeline        <- []                     (root: vision)
cp-oneway-text-link          <- []                     (root: the one-way link)
cp-onboard-voice             <- []                     (root: audio)

cp-idle-state-detection      <- [cp-live-pose-pipeline]
cp-gesture-vocabulary        <- [cp-live-pose-pipeline]

cp-idle-ping-milestone       <- [cp-idle-state-detection, cp-oneway-text-link]   ** M1 **
cp-multimodal-fusion         <- [cp-gesture-vocabulary, cp-onboard-voice]
cp-intent-over-diode         <- [cp-multimodal-fusion, cp-idle-ping-milestone]
cp-verify-the-gap            <- [cp-intent-over-diode]
```

Three independent roots, two joins, one tail. Edges were only added where the
dependency is real: gesture recognition hangs off the pose pipeline and *not*
off M1 (it does not need the notification path); the audio stack hangs off
nothing at all (it shares the `edge-model-runtimes-quantization` concept with
the vision leg rather than a checkpoint edge, which is the honest modelling —
concept reuse, not a fake ordering constraint).

`saveProject`'s cycle check accepted the graph on the first write; no cycle
rejections occurred.

**M1 = `cp-idle-ping-milestone`** is the brief's stated first meaningful
checkpoint (idle detection from a live feed → notification of pending tasks).
It is at index 3, not index 0, because it genuinely has three prerequisite legs
(M1a pose pipeline, M1b idle state machine, M1c the one-way link). Those three
are prefixed `M1a/M1b/M1c` in their titles and M1 is titled
"M1 (FIRST MEANINGFUL CHECKPOINT)" so the milestone is unambiguous. Everything
before M1 is strictly the minimal spine for M1 — nothing optional was front-loaded.

### Concepts (20 new, 4 reused)

New, in `content/concepts/`:

| parent | ids |
|---|---|
| Edge vision | `edge-camera-capture-pipeline`, `pose-landmark-estimation`, `edge-model-runtimes-quantization`, `temporal-activity-segmentation`, `idle-state-hysteresis` |
| One-way data flow | `unidirectional-data-diode-architecture`, `optocoupler-uart-diode-hardware`, `unidirectional-protocol-design-no-ack`, `air-gapped-sensor-threat-model`, `one-way-observability`, `air-gap-verification-testing` |
| On-device audio | `wake-word-detection`, `on-device-asr`, `audio-vad-segmentation` |
| Multimodal intent | `dynamic-gesture-recognition`, `multimodal-intent-fusion`, `intent-schema-design` |
| Edge systems | `outbound-only-network-egress`, `task-state-and-notification-policy`, `offline-device-provisioning` |

Reused existing ids rather than creating duplicates (skill step 5):
`loop-timing`, `sampling-aliasing`, `noise-uncertainty`, `sensor-fusion` — all
referenced from checkpoints and/or `prereqs`. They are pre-existing stubs from
the robotics project; I did **not** overwrite their bodies.

Every concept body is real prose (~50–90 lines each), not a template stub: why
it exists, the mechanism, failure modes, how it lands in *this* project, and a
self-test. All `prereqs` resolve to existing concept files (verified
programmatically — `unresolved prereq ids: []`).

**Six of the twenty concepts exist specifically to teach the network-gapped
constraint**, which is roughly half the intellectual weight of the syllabus:

- `unidirectional-data-diode-architecture` — HIGH/LOW topology; why the polarity
  here is doing *two* jobs at once (video can't get out, network can't get in);
  the narrow-verifier idea; and an explicit covert-channel caveat rather than a
  claim that the gap is absolute.
- `optocoupler-uart-diode-hardware` — the TX-wire-omitted build vs. the
  optocoupled build and why the latter is a better *reviewable artefact*;
  optocoupler switching speed as the real baud ceiling; the UART inversion bug;
  and a set of **negative tests** (scope on the HIGH RX pin, interface
  enumeration) — including the point that most homebrew air gaps actually fail
  because the vision Pi still has onboard Wi-Fi.
- `unidirectional-protocol-design-no-ack` — the five guarantees you lose and what
  replaces each: COBS framing, CRC, sequence numbers for *loss detection* (not
  recovery), blind repetition or FEC instead of retransmission, heartbeats for
  liveness, and mandatory idempotence.
- `one-way-observability` — the part that is genuinely under-taught: you cannot
  SSH in, scrape metrics, or push updates, so health must be *volunteered* through
  the same narrow channel; config-hash telemetry; sneakernet deploys; and blind
  schema evolution with a receiver-first deploy ordering rule.
- `air-gapped-sensor-threat-model` — five adversaries including "you, later", and
  the hardware/configuration/policy labelling discipline.
- `air-gap-verification-testing` — turning the claim into four dated artefacts,
  and being precise about what you have *not* proved.

### Sources (11, all verified live with WebFetch)

| id | type | attached to |
|---|---|---|
| `source-ncsc-safely-exporting-data` | article | diode architecture, threat model |
| `source-lidi-anssi` | link | no-ack protocol, diode architecture |
| `source-hackaday-sd-card-data-diode` | link | optocoupler/UART hardware |
| `source-electronics-tutorials-optocoupler` | article | optocoupler/UART hardware |
| `source-hairgap-cea` | link | no-ack protocol |
| `source-mediapipe-pose-landmarker-python` | article | pose landmark estimation |
| `source-mediapipe-samples-pose-raspberry-pi` | link | pose estimation, capture pipeline |
| `source-litert-post-training-quantization` | article | runtimes & quantization |
| `source-whisper-cpp` | link | on-device ASR |
| `source-openwakeword` | link | wake-word detection |
| `source-multimodal-fusion-hmi-survey` | paper | multimodal intent fusion |

Diode concepts get 5 sources across them; the edge-inference concepts get 3.
Each `body` says *why it is worth the time*, per resource-finder step 4, not just
a link. Caveats recorded in the source bodies rather than hidden:

- **hairgap** is archived (Oct 2023) and self-described as alpha — attached as a
  design reference to read, explicitly flagged as not-a-dependency.
- **openWakeWord**'s code is Apache-2.0 but its *pre-trained models* are
  CC-BY-NC-SA 4.0 — flagged.
- Both Google AI Edge URLs 301-redirect from `ai.google.dev` to
  `developers.google.com`; the final (working) URLs are what got stored.

**Not attached, deliberately:** I could not find a working official Raspberry Pi
UART configuration page. Three candidate URLs
(`.../computers/configuration.html`, its `#configuring-uarts` anchor, and
`.../computers/raspberry-pi.html`) were fetched and none contained the
PL011/mini-UART/`/dev/serial0` material. Rather than attach a forum thread as if
it were documentation, I left `optocoupler-uart-diode-hardware` with its two
verified sources and am flagging the gap here.

---

## 2. Honest notes on the skills and tooling

This is the section that's meant to be useful signal. Nothing below is a
blocker; all of it is something I had to decide without the skill telling me.

### 2a. Things the syllabus-draft skill does not say

1. **"First checkpoint" vs "first milestone" is ambiguous in a DAG.** The brief
   named a first *meaningful* checkpoint, but in a dependency graph that
   milestone necessarily has prerequisites, so it cannot be `checkpoints[0]`
   unless you collapse the prerequisites into it (which makes one enormous
   checkpoint) or lie about the edges. I improvised a convention — `M1a/M1b/M1c`
   prefixes on the legs and `M1 (FIRST MEANINGFUL CHECKPOINT)` on the join — and
   recorded `first_milestone` in project `metadata`. The skill should probably
   say whether checkpoint array order is meant to be topological, presentation
   order, or meaningless, because right now all three readings are defensible and
   nothing in `lib/core` enforces or uses the ordering.

2. **Step 7 ("present the drafted checkpoint list to the user before considering
   this done") is not executable by a subagent.** I wrote the records first and
   am reporting after, which inverts the skill's intent. A syllabus draft that
   runs headless has no review gate. Worth deciding whether the skill should have
   a "draft to a scratch file, then commit on approval" mode.

3. **No guidance on concept *granularity*.** The skill caps checkpoints (5–15,
   "prefer fewer") but says nothing about concepts. I landed on 20 new ones at a
   grain where each is one focused study session; nothing told me whether that is
   right, and a different agent could plausibly have produced 8 or 60 for the same
   brief. Since concepts are the atomic mastery unit, this seems like the more
   important number to constrain.

4. **No guidance on body content or length.** `Concept.body` is free-form and the
   skill never says what belongs in it. The 58 pre-existing concepts all follow a
   rigid 12-slot template from `STUDY-PLAN.md` §2 (Why it exists / Intuition /
   Formal definition / Derivation / … / Hooks) with `_TODO_` placeholders — i.e.
   the existing convention is "create the scaffold empty, fill it while studying".
   The task brief here asked for substantive bodies, so **I deliberately broke
   that house convention** and wrote prose in a looser structure. That is a real
   inconsistency now sitting in the content directory: 58 concepts in the template
   shape, 20 in mine. Someone needs to decide which is correct — and the skill is
   silent on it, which is how the divergence happened.

5. **Step 1 assumes a non-empty library gracefully but step 3's fallback is thin.**
   "Use WebSearch/WebFetch to research what a reasonable curriculum looks like"
   works fine for well-trodden domains, but for this brief the critical half of the
   syllabus (unidirectional transfer between embedded devices) has *no* curriculum
   — there are no courses, no lecture series, no standard prerequisite chain. It
   exists as vendor product pages, national-agency guidance, two open-source
   implementations and hobbyist build logs. I had to synthesise a teaching order
   from primary sources rather than find one. The skill's framing ("established
   courses, standard prerequisite chains") quietly assumes a taught field, and a
   less careful agent hitting that wall would very plausibly retreat to the
   generic "learn computer vision + IoT" syllabus that this test is designed to
   catch. Worth an explicit note in the skill: *when no curriculum exists, say so
   and build from primary sources, do not substitute the nearest well-taught
   neighbour.*

6. **The skill never says to create a Template afterwards.** Its "Notes" section
   talks about feeding lessons back into a template you drew *from*, but this run
   started with an empty library and left it empty. Nothing tells the agent to
   harvest a new Template out of a freshly-drafted project, so the library can
   never bootstrap itself. I did not create one (out of scope for the instruction
   I was given), but it looks like a missing loop.

### 2b. Things the resource-finder skill does not say

7. **No guidance for "the good resource is not free / does not exist".** The skill
   says say-so rather than attach mediocrity, which I followed for the Pi UART doc.
   But it has no notion of *partial* problems — archived repos, NC-licensed
   models, redirected URLs — so I invented the convention of recording the caveat
   in the Source `body`. That works, but it's invisible to any tooling; a
   `caveat`/`verified_on` field on Source would be the structured version.

8. **"Verify with WebFetch" is weaker than it sounds.** WebFetch summarises via a
   small model, so "verified live" here means *the URL resolved and the summary
   matched the topic*. It is not proof the content is good. For `source-hairgap-cea`
   the fetch is what surfaced the archived-in-2023 status, so it does earn its
   keep — but the skill should be clear that this is a liveness+topicality check,
   not a quality check.

### 2c. Data-layer / tooling friction

9. **`Concept.parent` is a required free-text string with no vocabulary.** I
   invented five parents (`Edge vision`, `One-way data flow`, `On-device audio`,
   `Multimodal intent`, `Edge systems`). The existing content uses a different,
   also-invented set (`Digital control`, `State estimation`, …). Nothing
   validates, dedupes, or lists these, so the taxonomy will drift per-project.

10. **`Concept.order` likewise** — a required number with no documented scope (is
    it global? within-parent?). I used within-parent decades (10s/20s/…) matching
    the checkpoint grouping; the existing content appears to use a single global
    sequence. Two incompatible conventions now coexist.

11. **No `create_course` was used at all.** Every checkpoint has `courses: []`.
    Nothing in the brief or the skill made it clear when a Course is warranted
    over a bare set of Concepts, and I could not justify one. If Courses are meant
    to be the normal unit of a syllabus, this draft under-uses the entity; if
    they're for external MOOCs only, that should be stated.

12. **`getConcept`/`getSource`/`getProject` guard rails were mine, not the API's.**
    `createConcept` silently overwrites an existing file of the same id (it's just
    `saveConcept`). I added existence checks in the script so a re-run is
    idempotent, but the MCP `create_*` tools presumably have the same overwrite
    behaviour, which is a foot-gun for exactly this "draft, then redo with
    steering" workflow the skill describes.

13. **`sources/` and `templates/` did not exist** before this run; `ensureDirs()`
    created them on first write. Fine, but it means `list_templates` on a fresh
    install returns `[]` from a missing directory rather than an empty one — worth
    confirming the MCP tool handles that the same way `listTemplateIds()` does
    (it did, returning `[]`).

14. **Backticks in concept bodies.** Purely a self-inflicted scripting note, but
    relevant if the MCP path ever generates bodies: prose containing shell
    snippets in backticks breaks a TS template literal. Via MCP tool args this
    wouldn't arise; it's an artefact of the direct-call workaround.

### 2d. What I would flag as weakest in my own output

- The **audio leg is shallower than the vision and diode legs** (3 concepts). It
  is genuinely the most well-trodden part of the brief, but a reviewer may
  reasonably think intent parsing deserves its own concept rather than living
  inside `multimodal-intent-fusion`.
- **`cp-verify-the-gap` is last**, which is arguably wrong: verification should be
  continuous from `cp-oneway-text-link` onward. I put the *practice* of negative
  testing into M1c's `done_test` and the *discipline* of dated regression evidence
  into the final checkpoint, but a case could be made for hoisting it earlier.
- I did not attempt any **hardware-selection or price** work (the `prices` entity
  exists in `lib/core`), because neither skill mentions it and the brief did not
  ask.
