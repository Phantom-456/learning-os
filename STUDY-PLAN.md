# Robotics & Control Science — Study Plan (v2)

> **Mission.** Learn control science and robotics deeply by designing and building **one
> robot from absolute zero, in simulation**, and teaching each piece as you go. The website
> (v2) is a personal learning OS that tracks the syllabus, your notes/links, and turns what
> you understood into Shorts (intuition) and long videos (milestones).
>
> **You already decided:** build the math from a lower base · ~6–10 hrs/week · applied /
> build-first · one robot from nothing · Isaac Sim (Windows) + ROS 2 via WSL2/RoboStack ·
> import viz/SLAM libraries but also reimplement the core math yourself · a separate,
> fully-automated daily-news Shorts stream on the side.
>
> Last updated: 2026-09-14 · Simio (v1) is frozen; nothing here touches it.

---

## 1. How the loop works (per concept)

```
Study a concept  ->  Write YOUR version (notes + links + a worked example / sim)
   ->  Mark "understood"  [GATE: only allowed once your own explanation exists]
   ->  App generates a hook + a rough Short/video structure from your notes
   ->  You record & publish  ->  Concept logged (coverage memory)  ->  Review later
```

Two teaching outputs, from the same notes:
- **Short (~30–60s)** for a *single concept* — the intuition / the "aha".
- **Long video (~6–12 min)** for a *milestone* — a cluster of concepts that together let
  you *do* something on the robot (e.g. "derive, tune and simulate a PID heading controller").

The **"understood" gate is the whole point**: if you can't explain it in your own words with
a worked example, it isn't learned yet. That gate is also what protects the channel — your
own explanation is the "significant original value" YouTube's 2026 rules require.

---

## 2. The per-topic thoroughness template (so every topic is teachable)

This is the answer to *"how do I study this so I'm completely thorough with all facets?"*
Run **every** concept through these 12 slots. When slots 1–8 and 11 exist **in your own
words**, the topic is "understood" and you already have everything a full video needs.

| # | Slot | What you produce |
|---|------|------------------|
| 1 | **Why it exists** | One sentence: the problem this solves. |
| 2 | **Intuition** | The physical/visual picture; the "aha". |
| 3 | **Formal definition** | The precise statement + the math. |
| 4 | **Derivation** | Re-derive it yourself from what you already know. |
| 5 | **Assumptions & failure modes** | When does it break? What must be true? |
| 6 | **Worked example (by hand)** | Real numbers, done on paper. |
| 7 | **Implementation** | Code it / simulate it (from scratch where it teaches). |
| 8 | **On YOUR robot** | Where this shows up in the robot you're building. |
| 9 | **Connections** | Prereqs it needs + what it unlocks next. |
| 10 | **Misconceptions & gotchas** | The traps; what people get wrong. |
| 11 | **Self-test** | 3–5 questions or a mini-challenge you can pass. |
| 12 | **Hooks** | The surprising/counterintuitive bits → Short seeds. |

Slots 10 and 12 are where the *best* content lives — the gotcha and the counterintuitive
result are the most shareable 45 seconds you'll make.

---

## 3. Notes -> hook -> structure (what the app generates for you)

Your notes will be dry. That's fine — dryness is honest understanding. The app turns them
into content scaffolding; you keep the substance, it supplies the *packaging*.

**Hook patterns** (the app offers 2–3 per concept, drawn from slots 10/12):
- The counterintuitive fact — *"Adding a delay to your controller can make it more stable."*
- The common mistake — *"Almost everyone tunes PID in the wrong order."*
- The failure demo — *"Watch what happens the instant I remove the integral term."*
- The payoff tease — *"By the end of this, this robot drives a perfect circle on its own."*

**Short structure (30–60s):** hook (0–3s) -> the one idea, shown in sim -> the turn/"aha" ->
one-line takeaway -> soft CTA ("full build in the pinned video").

**Milestone video structure (6–12 min):** cold-open the *result* you'll reach -> the problem
-> intuition -> the honest math (kept tight) -> build & simulate it live -> it works (demo)
-> recap + what it unlocks -> next.

*Worked example — concept "Integral action / steady-state error":*
Hook: *"Your robot keeps stopping just short of the target — forever. Here's the one term
that fixes it."* Short: show the P-only controller settling with a permanent offset (sim) ->
add the I term -> offset crawls to zero -> takeaway: "integral action eats steady-state
error." Milestone video (PID): the same, plus derivation, wind-up as the gotcha, and tuning.

---

## 4. The through-line: one robot, from nothing

**Recommended spine:** a **differential-drive mobile robot you author from scratch**, which
**grows into a mobile manipulator** (add a 2–3 DOF arm) as the capstone.

Why this robot: it spans the widest control-science arc on a single platform —
kinematics -> PID -> state-space/LQR -> state estimation (Kalman) -> SLAM & mapping (which
you specifically want) -> path/motion planning -> MPC -> manipulation. It is feasible to
author by hand, and each stage is a visible, filmable result.

**"From nothing" means:** you write the robot description yourself — geometry, links, joint
frames, inertias, wheels, sensors, actuator models — as your own URDF/USD. **No downloaded
robot packs** (no TurtleBot/Franka), no borrowed control stacks. You *may* import libraries
for visualization and SLAM/mapping, **and** you reimplement the core math yourself so the
library becomes your ground-truth oracle to check your code against.

> Swappable: if you'd rather center it on a **manipulator arm** (richest for classical +
> modern control) or a **quadruped** (deepest, hardest — MPC/balance/contact), say so and I
> re-map the milestones. ~80% of the syllabus is robot-agnostic; only the applied thread moves.

---

## 5. Toolchain (Module 0 gets this working)

- **Isaac Sim 5.1** on **Windows** (GPU-native), authoring robots in **USD** (links + joints
  form an *articulation* the physics engine controls as one system).
- **ROS 2 Jazzy** in **WSL2 (Ubuntu 24.04)** via **RoboStack** (conda/pixi — prebuilt, no
  source compile). RoboStack can also run ROS 2 natively on Windows if you prefer one OS.
- **Isaac Sim <-> ROS 2 bridge:** enable `isaacsim.ros2.bridge`; for WSL2 set Fast DDS to UDP
  (`FASTRTPS_DEFAULT_PROFILES_FILE`) and forward ports. Note: `isaacsim_bringup` isn't
  supported inside WSL2 — drive sim from the Windows side, run your ROS 2 nodes in WSL2.
- **Your own code:** Python (control loops, estimators, planners) + NumPy/SciPy; optionally
  C++ later for the tight loops.

*Sources: Isaac Sim + ROS 2 Jazzy on WSL2 bridge writeups and NVIDIA docs; RoboStack ROS 2
Jazzy (conda/pixi). Links collected at the bottom.*

---

## 6. The syllabus (modules -> milestones)

Each module lists its **core topics**, the **milestone** (-> one long video), **example
Shorts**, and **what you build on the robot**. Every topic still runs through the §2 template.

### Module 0 — Environment + math foundations
- **Topics:** Isaac Sim/USD basics; ROS 2 Jazzy + bridge; **math from the base**: vectors &
  matrices, eigenvalues, complex numbers, derivatives/ODEs, the Laplace transform — each
  scoped to *exactly* what control needs, taught just-in-time.
- **Milestone video:** "I built my simulator and my robot's empty body from scratch."
- **Shorts:** what an eigenvalue *really* is; why engineers love Laplace; what a USD
  articulation is.
- **Build:** author the robot's chassis + wheels (your own USD/URDF); spin it in sim.

### Module 1 — Modeling & kinematics (from scratch)
- **Topics:** rigid-body frames, transforms, differential-drive kinematics (forward/inverse),
  odometry; what a "model" is.
- **Milestone:** "Making my robot move — and predicting where it'll be."
- **Shorts:** why a diff-drive robot can't strafe; dead-reckoning drift in 30s.
- **Build:** wheel/velocity commands; odometry from wheel speeds.

### Module 2 — Dynamics & state-space
- **Topics:** ODE models, linearization, state-space form (A,B,C,D), transfer functions,
  poles/eigenvalues.
- **Milestone:** "The equation that describes *any* system — and my robot."
- **Shorts:** poles = personality of a system; stable vs unstable in one plot.
- **Build:** a state-space model of the robot's heading/velocity.

### Module 3 — Classical control (first closed loop)
- **Topics:** feedback, P/I/D, steady-state error, stability margins, tuning, integrator
  wind-up.
- **Milestone:** "Derive, tune and simulate a PID that drives a perfect heading."
- **Shorts:** integral action kills offset; the wind-up trap; tune P-I-D in the right order.
- **Build:** closed-loop heading + velocity control; robot drives a target path.

### Module 4 — Modern control (state-space design)
- **Topics:** controllability/observability, pole placement, **LQR**, observers, LQG.
- **Milestone:** "LQR: letting the math pick the best controller for me."
- **Shorts:** what 'optimal' actually means; observers = estimating what you can't measure.
- **Build:** an LQR controller for the robot; compare vs your hand-tuned PID.

### Module 5 — State estimation
- **Topics:** noise & uncertainty, Bayes filter, **Kalman filter**, EKF; sensor fusion.
- **Milestone:** "I wrote a Kalman filter from scratch — and checked it against the library."
- **Shorts:** why your sensors lie; fusing two bad sensors into one good estimate.
- **Build:** your own KF/EKF fusing wheel odometry + IMU; validate against a library filter.

### Module 6 — Digital / discrete control
- **Topics:** sampling, aliasing, z-transform, discretizing your controllers, loop timing.
- **Milestone:** "Turning continuous math into code that runs every 10 ms."
- **Shorts:** why sample rate can wreck a controller; continuous vs discrete in one demo.
- **Build:** discretize your PID/LQR; run them as real ROS 2 nodes at fixed rate.

### Module 7 — Nonlinear & robust control
- **Topics:** nonlinearity, **Lyapunov stability**, feedback linearization, sliding mode,
  robustness to model error.
- **Milestone:** "Proving my robot won't fall over — with Lyapunov."
- **Shorts:** stability as an energy that only goes down; when linear control quietly fails.
- **Build:** a nonlinear trajectory-tracking controller; stress it with model mismatch.

### Module 8 — Optimal & predictive control
- **Topics:** trajectory optimization, **Model Predictive Control (MPC)**, constraints.
- **Milestone:** "MPC: my robot plans a few seconds into the future, every step."
- **Shorts:** MPC in one sentence; how constraints keep a robot safe.
- **Build:** an MPC path-follower that respects speed/turn limits.

### Module 9 — Perception, SLAM & mapping
- **Topics:** lidar/depth basics, occupancy grids, scan matching, SLAM (front/back end),
  loop closure.
- **Milestone:** "My robot builds a map of a world it's never seen."
- **Shorts:** what SLAM actually solves; loop closure = the 'wait, I've been here' moment.
- **Build:** import a SLAM stack to get a map, **then** reimplement scan-matching/occupancy
  yourself and compare.

### Module 10 — Autonomy & planning
- **Topics:** global path planning (A*/RRT), local planning, the estimate->plan->control loop.
- **Milestone:** "Full autonomy: pick a goal, it maps, plans and drives there."
- **Shorts:** A* vs RRT in 40s; why robots plan twice (global + local).
- **Build:** planner feeding your controller + estimator into one autonomous run.

### Module 11 — Capstone: mobile manipulator
- **Topics:** manipulator kinematics/dynamics, computed-torque control, whole-body coordination.
- **Milestone:** "I added an arm — now it drives *and* manipulates, all my own code."
- **Shorts:** why arms are 'just' more control; the moment base + arm move as one.
- **Build:** author a 2–3 DOF arm onto the base; control both; a full end-to-end demo.

---

## 7. Pacing (~6–10 hrs/week)

- Rough weekly split: **~50% study, ~25% implement/simulate, ~25% notes + record.**
- One concept cluster per ~week; **a milestone (long video) every ~3–4 weeks**; a handful of
  Shorts in between from individual concepts.
- Honest timeline: **core control (M0–M8) ≈ 8–11 months** at this pace; SLAM + autonomy +
  capstone extend it toward ~15–18 months. Depth over speed — the robot is done when *you* are.
- The streak/dashboard in the app exists to protect consistency, which matters far more than
  intensity.

---

## 8. The automated side stream (kept out of the way)

A **separate, fully-automated faceless Shorts channel: daily robotics/AI news & updates.**
This is the *only* automated part. It reuses Simio's pipeline (topic -> script -> voice ->
export -> approval -> upload) and runs on its own queue so it **never competes with studying**.
It's a small, low-effort experiment — not the profitable side fund. Your real side fund can
live in a different project entirely; this exists because news Shorts are cheap to automate
and keep a publishing habit warm.

---

## 9. What version 2 (the app) will do — preview, not building yet

- **Syllabus tree** with status per concept (`not started -> studying -> understood ->
  taught`) — this file, made interactive.
- **Per-concept workspace:** the §2 template as a checklist, your notes (markdown), links,
  attachments, worked examples.
- **"Understood" gate** enforced (your explanation must exist).
- **Content pipeline:** generate hook options + a rough Short/video structure from your notes;
  Short queue (concepts) and Video queue (milestones); approve -> publish.
- **Review:** spaced-repetition surface for old concepts.
- **Dashboard:** % of syllabus done, streak, Shorts/videos shipped, what's next.
- **Coverage memory:** what you've studied & taught (so nothing is silently repeated).
- **News auto-stream:** the §8 automated channel, isolated.

---

## Open decision before I lock the syllabus
The one thing still worth your call: **the robot.** My recommendation is the
diff-drive-mobile-robot -> mobile-manipulator spine above (best control-science coverage +
gives you the SLAM you want). Confirm that, or swap to a manipulator arm or a quadruped, and
I'll re-map the milestones.

---

### Sources (toolchain)
- Isaac Sim 5.1 on Windows + ROS 2 Jazzy on WSL2 bridge: https://medium.com/@weikeshih/isaac-sim-5-1-0-on-windows-ros2-jazzy-on-wsl2-ubuntu-ea8c4d7b404c
- Isaac Sim + ROS 2 Jazzy (WSL2) setup & workarounds: https://github.com/AydinLT00/IsaacSim_ROS2_HelloWorld
- Isaac Sim ROS 2 install (other platforms) docs: https://docs.isaacsim.omniverse.nvidia.com/6.0.0/installation/install_ros_other_platforms.html
- RoboStack ROS 2 Jazzy (conda/pixi): https://github.com/RoboStack/ros-jazzy · https://robostack.github.io/GettingStarted.html
- Isaac Sim robot setup / articulation tutorials: https://docs.isaacsim.omniverse.nvidia.com/6.0.0/robot_setup_tutorials/tutorial_import_assemble_manipulator.html
