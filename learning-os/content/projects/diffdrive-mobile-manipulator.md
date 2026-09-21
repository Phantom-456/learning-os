---
id: diffdrive-mobile-manipulator
title: Diff-drive → mobile manipulator
status: in_progress
metadata:
  robot: differential_drive+arm
  toolchain: >-
    Isaac Sim 5.1 (Windows) + ROS 2 Jazzy (WSL2 / RoboStack); own URDF/USD, no
    robot packs
  definition_of_done: robot runs end-to-end in sim AND every milestone has a published video
checkpoints:
  - id: m0-environment
    title: Simulator + empty robot body (from scratch)
    depends_on: []
    courses: []
    concepts:
      - isaac-sim-usd-basics
      - ros2-bridge-setup
      - usd-articulation
      - vectors-matrices
      - eigenvalues
      - complex-numbers
      - derivatives-odes
      - laplace-transform
    status: not_started
    build: >-
      Isaac Sim 5.1 (Win) + ROS 2 Jazzy (WSL2/RoboStack); own USD
      chassis+wheels+caster as one articulation.
    done_test: >-
      From WSL2, /clock streams sim time AND the own-authored body is
      physics-stable for >= 60 s.
  - id: m1-kinematics
    title: Make it move + predict where it'll be
    depends_on:
      - m0-environment
    courses: []
    concepts:
      - rigid-body-frames
      - transforms
      - diff-drive-kinematics
      - odometry
      - what-is-a-model
    status: not_started
    build: >-
      Wheel velocity actuators; (v,w)->wheel speeds node + odometry node
      publishing /odom.
    done_test: >-
      2x2 m open-loop square -> odom within 10 cm / 5 deg of the corner; show
      drift vs ground truth.
  - id: m2-state-space
    title: A model of the robot (dynamics & state-space)
    depends_on:
      - m1-kinematics
    courses: []
    concepts:
      - ode-models
      - linearization
      - state-space-form
      - transfer-functions
      - poles-eigenvalues
    status: not_started
    build: >-
      Derive heading/velocity ODE; linearize to (A,B,C,D); simulate step
      response alongside sim.
    done_test: >-
      Linear model step response matches sim within ~10%; explain behaviour via
      pole locations.
  - id: m3-pid
    title: First closed loop (classical PID)
    depends_on:
      - m2-state-space
    courses: []
    concepts:
      - feedback
      - pid
      - steady-state-error
      - stability-margins
      - tuning
      - integrator-windup
    status: not_started
    build: >-
      PID heading controller as a ROS 2 node (P->I->D); velocity control; robot
      follows a path.
    done_test: >-
      Heading steady-state error < 1 deg, no sustained oscillation; removing I
      re-introduces offset.
  - id: m4-lqr
    title: Let the math pick the controller (LQR)
    depends_on:
      - m3-pid
    courses: []
    concepts:
      - controllability-observability
      - pole-placement
      - lqr
      - observers
      - lqg
    status: not_started
    build: >-
      Check controllability; implement pole placement + LQR (solve Riccati
      yourself, verify vs SciPy).
    done_test: >-
      LQR stabilizes AND beats M3 PID on settling OR effort; hand gain ~=
      library lqr().
  - id: m5-kalman
    title: Estimate what you can't measure (Kalman)
    depends_on:
      - m4-lqr
    courses: []
    concepts:
      - noise-uncertainty
      - bayes-filter
      - kalman-filter
      - ekf
      - sensor-fusion
    status: not_started
    build: >-
      Add noisy IMU to the USD robot; KF/EKF from scratch fusing odometry + IMU;
      validate vs library.
    done_test: >-
      Fused RMS pose error < raw odometry alone; from-scratch filter tracks
      library filter within tol.
  - id: m6-discrete
    title: Continuous math -> code that runs every 10 ms
    depends_on:
      - m5-kalman
    courses: []
    concepts:
      - sampling-aliasing
      - z-transform
      - discretization
      - loop-timing
    status: not_started
    build: >-
      Discretize PID + LQR + estimator; run as fixed-rate ROS 2 nodes (e.g. 100
      Hz) with real timing.
    done_test: >-
      Discretized controllers hold M3/M4 performance at rate; degrade on purpose
      when rate is lowered.
  - id: m7-nonlinear
    title: Prove it won't fall over (nonlinear & robust)
    depends_on:
      - m6-discrete
    courses: []
    concepts:
      - nonlinearity
      - lyapunov-stability
      - feedback-linearization
      - sliding-mode
      - robustness
    status: not_started
    build: >-
      Lyapunov-based nonlinear trajectory-tracking controller; stress with model
      mismatch.
    done_test: >-
      Tracks curved ref under injected wheel-radius mismatch that visibly breaks
      linear control.
  - id: m8-mpc
    title: Plan a few seconds ahead (MPC)
    depends_on:
      - m7-nonlinear
    courses: []
    concepts:
      - trajectory-optimization
      - mpc
      - constraints
    status: not_started
    build: >-
      MPC path-follower respecting speed/turn limits (solve finite-horizon QP
      each step; verify vs solver).
    done_test: >-
      Follows path WITHOUT violating speed/turn constraints where PID
      overshoots; slows before tight turn.
  - id: m9-slam
    title: Build a map of an unseen world (SLAM)
    depends_on:
      - m8-mpc
    courses: []
    concepts:
      - lidar-depth-basics
      - occupancy-grids
      - scan-matching
      - slam
      - loop-closure
    status: not_started
    build: >-
      Add lidar/depth to USD robot; import SLAM as oracle, then reimplement
      occupancy + scan-matching.
    done_test: >-
      Own map recognizably correct; loop closure measurably reduces drift; ~=
      library SLAM map.
  - id: m10-autonomy
    title: Full autonomy (planning + estimate->plan->control)
    depends_on:
      - m9-slam
    courses: []
    concepts:
      - global-planning
      - local-planning
      - estimate-plan-control
    status: not_started
    build: >-
      Global planner (A*/RRT) over your map + local planner;
      estimator->planner->controller in one run.
    done_test: >-
      Given a goal pose, robot plans and drives there, stops within tol, no
      collision, all own loop.
  - id: m11-capstone
    title: 'Capstone: mobile manipulator (add an arm)'
    depends_on:
      - m10-autonomy
    courses: []
    concepts:
      - manipulator-kinematics
      - manipulator-dynamics
      - computed-torque
      - whole-body-coordination
    status: not_started
    build: >-
      Author 2–3 DOF arm onto the base (own USD); kinematics + computed-torque;
      coordinate base + arm.
    done_test: >-
      Robot drives to a target THEN arm reaches a commanded EE pose within tol,
      coordinated, end-to-end.
notes:
  - id: note-m0-environment
    date: '2026-09-14'
    text: |-
      [Simulator + empty robot body (from scratch)]
      # Simulator + empty robot body (from scratch) — application notes

      _Robot-specific notes, in your own words._
  - id: note-m1-kinematics
    date: '2026-09-14'
    text: |-
      [Make it move + predict where it'll be]
      # Make it move + predict where it'll be — application notes

      _Robot-specific notes, in your own words._
  - id: note-m2-state-space
    date: '2026-09-14'
    text: |-
      [A model of the robot (dynamics & state-space)]
      # A model of the robot (dynamics & state-space) — application notes

      _Robot-specific notes, in your own words._
  - id: note-m3-pid
    date: '2026-09-14'
    text: |-
      [First closed loop (classical PID)]
      # First closed loop (classical PID) — application notes

      _Robot-specific notes, in your own words._
  - id: note-m4-lqr
    date: '2026-09-14'
    text: |-
      [Let the math pick the controller (LQR)]
      # Let the math pick the controller (LQR) — application notes

      _Robot-specific notes, in your own words._
  - id: note-m5-kalman
    date: '2026-09-14'
    text: |-
      [Estimate what you can't measure (Kalman)]
      # Estimate what you can't measure (Kalman) — application notes

      _Robot-specific notes, in your own words._
  - id: note-m6-discrete
    date: '2026-09-14'
    text: |-
      [Continuous math -> code that runs every 10 ms]
      # Continuous math -> code that runs every 10 ms — application notes

      _Robot-specific notes, in your own words._
  - id: note-m7-nonlinear
    date: '2026-09-14'
    text: |-
      [Prove it won't fall over (nonlinear & robust)]
      # Prove it won't fall over (nonlinear & robust) — application notes

      _Robot-specific notes, in your own words._
  - id: note-m8-mpc
    date: '2026-09-14'
    text: |-
      [Plan a few seconds ahead (MPC)]
      # Plan a few seconds ahead (MPC) — application notes

      _Robot-specific notes, in your own words._
  - id: note-m9-slam
    date: '2026-09-14'
    text: |-
      [Build a map of an unseen world (SLAM)]
      # Build a map of an unseen world (SLAM) — application notes

      _Robot-specific notes, in your own words._
  - id: note-m10-autonomy
    date: '2026-09-14'
    text: |-
      [Full autonomy (planning + estimate->plan->control)]
      # Full autonomy (planning + estimate->plan->control) — application notes

      _Robot-specific notes, in your own words._
  - id: note-m11-capstone
    date: '2026-09-14'
    text: |-
      [Capstone: mobile manipulator (add an arm)]
      # Capstone: mobile manipulator (add an arm) — application notes

      _Robot-specific notes, in your own words._
updated: '2026-09-14'
---
# Diff-drive → mobile manipulator

The first robot: authored from zero in simulation. Each milestone references shared concepts and adds the sim build + its video. See ROADMAP-diffdrive.md.
