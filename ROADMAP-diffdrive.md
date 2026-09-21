# Roadmap — Differential-drive → Mobile Manipulator

> The **first project** on the Project axis. An explicit, ordered list of milestones that build
> **one robot from absolute zero in simulation**, each milestone *referencing* shared concepts
> (never copying them), each with a **pass/fail done test**, a **sim build step**, and a **video slot**.
>
> Companion to `ARCHITECTURE.md` (data model) and `STUDY-PLAN.md` (syllabus + §2 study method).
> This file is the **Project view** source for `projects/diffdrive-mobile-manipulator.md`.
> Last updated: 2026-09-14.

---

## Project header

```yaml
id: diffdrive-mobile-manipulator
title: "Diff-drive → mobile manipulator"
robot: differential_drive+arm
status: in_progress
definition_of_done: "robot runs end-to-end in sim AND every milestone has a published video"
toolchain: "Isaac Sim 5.1 (Windows) + ROS 2 Jazzy (WSL2 / RoboStack); own URDF/USD, no robot packs"
```

**Ground rules for every milestone**
- **Author your own description** — geometry, links, joint frames, inertias, wheels, sensors,
  actuator models — as your own URDF/USD. **No downloaded robot packs** (no TurtleBot/Franka).
- **Reimplement the core math yourself**; you *may* import a library only as a **ground-truth
  oracle** to check your code against (SLAM/viz especially).
- A milestone is `done` only when: its referenced concepts are `complete`, the **done test passes
  in sim**, and the **video is published**. (`not_started → building → done`.)
- **Video slots are flexible.** Default is one **long** milestone video; example **short** concept
  clips are listed but any node can carry one or more videos, each `short` or `long`.

**Concept-ID legend** (these become `concepts/<id>.md`; the roadmap references them):
grouped by parent header exactly as the Concept view will show them.

---

## Milestone 0 — Simulator + empty robot body (from scratch)
- **References concepts:** `isaac-sim-usd-basics`, `ros2-bridge-setup`, `usd-articulation`,
  `vectors-matrices`, `eigenvalues`, `complex-numbers`, `derivatives-odes`, `laplace-transform`
  *(math taught just-in-time, scoped to exactly what control needs later)*
- **Robot build step:** Install Isaac Sim 5.1 on Windows + ROS 2 Jazzy in WSL2 (RoboStack); enable
  `isaacsim.ros2.bridge` (Fast DDS → UDP for WSL2). Author the robot's **chassis + two drive wheels
  + a caster** as your own USD, wired as a single **articulation**. Spin it up empty in sim.
- **Done test (pass/fail):** From WSL2, `ros2 topic echo /clock` streams sim time **and** the robot
  body appears and is physics-stable (does not fall through the floor or jitter) for ≥ 60 s.
- **Video slot:** *long* — "I built my simulator and my robot's empty body from scratch."
  *Shorts:* what an eigenvalue really is · why engineers love Laplace · what a USD articulation is.
- **App notes:** `notes/diffdrive/m0-environment.md`

## Milestone 1 — Make it move + predict where it'll be (kinematics & odometry)
- **References concepts:** `rigid-body-frames`, `transforms`, `diff-drive-kinematics`, `odometry`,
  `what-is-a-model`
- **Robot build step:** Add wheel velocity actuators. Write a ROS 2 node that maps `(v, ω)` →
  left/right wheel speeds (inverse kinematics) and a second node that integrates wheel speeds →
  pose `(x, y, θ)` (odometry), publishing `/odom`.
- **Done test (pass/fail):** Command a **2 m × 2 m square** open-loop; the odometry-estimated final
  pose is within **10 cm / 5°** of the commanded corner **and** you can state (and show) the
  dead-reckoning drift vs. ground-truth pose from sim.
- **Video slot:** *long* — "Making my robot move — and predicting where it'll be."
  *Shorts:* why a diff-drive robot can't strafe · dead-reckoning drift in 30 s.
- **App notes:** `notes/diffdrive/m1-kinematics.md`

## Milestone 2 — A model of the robot (dynamics & state-space)
- **References concepts:** `ode-models`, `linearization`, `state-space-form`, `transfer-functions`,
  `poles-eigenvalues`
- **Robot build step:** Derive an ODE for heading/velocity dynamics; linearize to `(A,B,C,D)`.
  Implement the state-space model in Python and simulate its step response **alongside** the Isaac
  Sim robot's response to the same input.
- **Done test (pass/fail):** Your linear model's step response matches the sim robot's response to
  within **~10%** over the linear regime, and you can point to the **pole locations** that explain
  the observed behaviour (stable / speed of response).
- **Video slot:** *long* — "The equation that describes *any* system — and my robot."
  *Shorts:* poles = the personality of a system · stable vs unstable in one plot.
- **App notes:** `notes/diffdrive/m2-state-space.md`

## Milestone 3 — First closed loop (classical PID)  ◀ the payoff milestone
- **References concepts:** `feedback`, `pid`, `steady-state-error`, `stability-margins`, `tuning`,
  `integrator-windup`
- **Robot build step:** Write a **PID heading controller** as a ROS 2 node (P then I then D, tuned
  in that order); add velocity control. Robot drives a target heading / follows a path in Isaac Sim.
- **Done test (pass/fail):** Robot reaches a commanded heading with **steady-state error < 1°** and
  **no sustained oscillation**; removing the I-term visibly reintroduces a permanent offset (you can
  demo the difference on command).
- **Video slot:** *long* — "Derive, tune and simulate a PID that drives a perfect heading."
  *Shorts:* integral action kills offset · the wind-up trap · tune P-I-D in the right order.
- **App notes:** `notes/diffdrive/m3-pid.md`

## Milestone 4 — Let the math pick the controller (modern control / LQR)
- **References concepts:** `controllability-observability`, `pole-placement`, `lqr`, `observers`,
  `lqg`
- **Robot build step:** Check controllability of your `(A,B)`; implement **pole placement** and an
  **LQR** controller (solve the Riccati / weight Q,R yourself, then verify against SciPy). Run it on
  the robot and compare vs. the hand-tuned PID from M3.
- **Done test (pass/fail):** LQR controller stabilizes to the setpoint **and** beats the M3 PID on at
  least one measured metric (settling time **or** control effort) on the same maneuver; your
  hand-solved gain matches the library's `lqr()` to within numerical tolerance.
- **Video slot:** *long* — "LQR: letting the math pick the best controller for me."
  *Shorts:* what 'optimal' actually means · observers = estimating what you can't measure.
- **App notes:** `notes/diffdrive/m4-lqr.md`

## Milestone 5 — Estimate what you can't measure (state estimation / Kalman)
- **References concepts:** `noise-uncertainty`, `bayes-filter`, `kalman-filter`, `ekf`,
  `sensor-fusion`
- **Robot build step:** Add a (noisy) **IMU** to the USD robot. Implement a **KF/EKF from scratch**
  fusing wheel odometry + IMU into a pose estimate; validate against a library filter as the oracle.
- **Done test (pass/fail):** Under injected sensor noise, the fused estimate's RMS pose error is
  **lower than raw odometry alone** over a fixed trajectory, and your from-scratch filter tracks the
  library filter's estimate within tolerance.
- **Video slot:** *long* — "I wrote a Kalman filter from scratch — and checked it against the library."
  *Shorts:* why your sensors lie · fusing two bad sensors into one good estimate.
- **App notes:** `notes/diffdrive/m5-kalman.md`

## Milestone 6 — Continuous math → code that runs every 10 ms (digital control)
- **References concepts:** `sampling-aliasing`, `z-transform`, `discretization`, `loop-timing`
- **Robot build step:** Discretize your PID **and** LQR (and the estimator); run them as fixed-rate
  ROS 2 nodes (e.g. 100 Hz) with real timing. Show a controller degrading when the sample rate drops.
- **Done test (pass/fail):** The discretized controllers hold the M3/M4 performance at the target
  rate, **and** you can demonstrate instability/degradation when the rate is deliberately lowered
  (linking the failure to sampling).
- **Video slot:** *long* — "Turning continuous math into code that runs every 10 ms."
  *Shorts:* why sample rate can wreck a controller · continuous vs discrete in one demo.
- **App notes:** `notes/diffdrive/m6-discrete.md`

## Milestone 7 — Prove it won't fall over (nonlinear & robust control)
- **References concepts:** `nonlinearity`, `lyapunov-stability`, `feedback-linearization`,
  `sliding-mode`, `robustness`
- **Robot build step:** Implement a **nonlinear trajectory-tracking controller** (e.g. a Lyapunov-
  based unicycle tracking law); stress it with model mismatch / disturbance.
- **Done test (pass/fail):** Robot tracks a curved reference trajectory with bounded error under an
  injected parameter mismatch (e.g. wrong wheel radius) that visibly breaks the plain linear
  controller; you can state the Lyapunov function whose value only decreases.
- **Video slot:** *long* — "Proving my robot won't fall over — with Lyapunov."
  *Shorts:* stability as an energy that only goes down · when linear control quietly fails.
- **App notes:** `notes/diffdrive/m7-nonlinear.md`

## Milestone 8 — Plan a few seconds ahead (optimal & predictive / MPC)
- **References concepts:** `trajectory-optimization`, `mpc`, `constraints`
- **Robot build step:** Implement an **MPC path-follower** that respects speed/turn-rate limits
  (solve the finite-horizon QP each step; verify against a solver library).
- **Done test (pass/fail):** Robot follows a path **without violating** the speed/turn constraints
  where the M3 PID would overshoot or saturate; MPC visibly slows before a tight turn.
- **Video slot:** *long* — "MPC: my robot plans a few seconds into the future, every step."
  *Shorts:* MPC in one sentence · how constraints keep a robot safe.
- **App notes:** `notes/diffdrive/m8-mpc.md`

## Milestone 9 — Build a map of an unseen world (perception, SLAM & mapping)
- **References concepts:** `lidar-depth-basics`, `occupancy-grids`, `scan-matching`, `slam`,
  `loop-closure`
- **Robot build step:** Add a **lidar/depth sensor** to the USD robot. First import a SLAM stack to
  get a map (oracle), **then reimplement** occupancy-grid mapping + scan-matching yourself and compare.
- **Done test (pass/fail):** Driving a loop in an unseen sim world, your from-scratch map is
  recognizably correct (walls where walls are) and a **loop closure** measurably reduces accumulated
  drift; your map overlaps the library SLAM map within tolerance.
- **Video slot:** *long* — "My robot builds a map of a world it's never seen."
  *Shorts:* what SLAM actually solves · loop closure = the 'wait, I've been here' moment.
- **App notes:** `notes/diffdrive/m9-slam.md`

## Milestone 10 — Full autonomy (planning + the estimate→plan→control loop)
- **References concepts:** `global-planning`, `local-planning`, `estimate-plan-control`
- **Robot build step:** Implement **global planning** (A*/RRT) over your map + a **local planner**;
  wire estimator → planner → controller into one autonomous run.
- **Done test (pass/fail):** Given a goal pose in a mapped-on-the-fly world, the robot **plans and
  drives to it** and stops within tolerance **without collision**, using only your own estimate →
  plan → control loop.
- **Video slot:** *long* — "Full autonomy: pick a goal, it maps, plans and drives there."
  *Shorts:* A* vs RRT in 40 s · why robots plan twice (global + local).
- **App notes:** `notes/diffdrive/m10-autonomy.md`

## Milestone 11 — Capstone: mobile manipulator (add an arm)
- **References concepts:** `manipulator-kinematics`, `manipulator-dynamics`, `computed-torque`,
  `whole-body-coordination`
- **Robot build step:** Author a **2–3 DOF arm** onto the base (your own USD). Implement arm
  kinematics + **computed-torque control**; coordinate base + arm (whole-body). Full end-to-end demo.
- **Done test (pass/fail):** The robot **drives to a target, then the arm reaches a commanded
  end-effector pose** within tolerance, base and arm coordinated — all your own code, end-to-end in
  one continuous run.
- **Video slot:** *long* — "I added an arm — now it drives *and* manipulates, all my own code."
  *Shorts:* why arms are 'just' more control · the moment base + arm move as one.
- **App notes:** `notes/diffdrive/m11-capstone.md`

---

## Milestone → module → concept map (quick reference)

| # | Milestone | Module | Referenced concept IDs |
|---|-----------|--------|------------------------|
| 0 | Simulator + empty body | M0 | isaac-sim-usd-basics, ros2-bridge-setup, usd-articulation, vectors-matrices, eigenvalues, complex-numbers, derivatives-odes, laplace-transform |
| 1 | Move + odometry | M1 | rigid-body-frames, transforms, diff-drive-kinematics, odometry, what-is-a-model |
| 2 | State-space model | M2 | ode-models, linearization, state-space-form, transfer-functions, poles-eigenvalues |
| 3 | First closed loop (PID) | M3 | feedback, pid, steady-state-error, stability-margins, tuning, integrator-windup |
| 4 | LQR | M4 | controllability-observability, pole-placement, lqr, observers, lqg |
| 5 | Kalman estimation | M5 | noise-uncertainty, bayes-filter, kalman-filter, ekf, sensor-fusion |
| 6 | Digital control | M6 | sampling-aliasing, z-transform, discretization, loop-timing |
| 7 | Nonlinear & robust | M7 | nonlinearity, lyapunov-stability, feedback-linearization, sliding-mode, robustness |
| 8 | MPC | M8 | trajectory-optimization, mpc, constraints |
| 9 | SLAM & mapping | M9 | lidar-depth-basics, occupancy-grids, scan-matching, slam, loop-closure |
| 10 | Autonomy & planning | M10 | global-planning, local-planning, estimate-plan-control |
| 11 | Capstone: manipulator | M11 | manipulator-kinematics, manipulator-dynamics, computed-torque, whole-body-coordination |

**Concept parent headers (Concept-view grouping):** Environment & math foundations · Modeling &
kinematics · Dynamics & state-space · Classical control · Modern control · State estimation ·
Digital control · Nonlinear & robust control · Optimal & predictive control · Perception, SLAM &
mapping · Autonomy & planning · Manipulation.

---

## Notes on ordering & reuse
- Milestones are **strictly ordered**: each depends on the robot/code state the previous one leaves.
- Concepts are **shared**: when a later robot (project 2+) references `pid` or `kalman-filter`, it
  shows **green** immediately — no re-study. ~80% of these concepts are robot-agnostic.
- The robot is **one continuously-growing artifact** — M0's body is still the body in M11, now with
  sensors, estimators, planners and an arm bolted on. Nothing is thrown away.
