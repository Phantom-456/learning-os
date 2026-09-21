---
id: diffdrive-mobile-manipulator
title: Diff-drive → mobile manipulator
robot: differential_drive+arm
status: in_progress
definition_of_done: robot runs end-to-end in sim AND every milestone has a published video
toolchain: >-
  Isaac Sim 5.1 (Windows) + ROS 2 Jazzy (WSL2 / RoboStack); own URDF/USD, no
  robot packs
milestones:
  - id: m0-environment
    title: Simulator + empty robot body (from scratch)
    order: 0
    concepts:
      - isaac-sim-usd-basics
      - ros2-bridge-setup
      - usd-articulation
      - vectors-matrices
      - eigenvalues
      - complex-numbers
      - derivatives-odes
      - laplace-transform
    app_notes: notes/diffdrive/m0-environment.md
    build: >-
      Isaac Sim 5.1 (Win) + ROS 2 Jazzy (WSL2/RoboStack); own USD
      chassis+wheels+caster as one articulation.
    done_test: >-
      From WSL2, /clock streams sim time AND the own-authored body is
      physics-stable for >= 60 s.
    videos: []
    status: not_started
  - id: m1-kinematics
    title: Make it move + predict where it'll be
    order: 1
    concepts:
      - rigid-body-frames
      - transforms
      - diff-drive-kinematics
      - odometry
      - what-is-a-model
    app_notes: notes/diffdrive/m1-kinematics.md
    build: >-
      Wheel velocity actuators; (v,w)->wheel speeds node + odometry node
      publishing /odom.
    done_test: >-
      2x2 m open-loop square -> odom within 10 cm / 5 deg of the corner; show
      drift vs ground truth.
    videos: []
    status: not_started
  - id: m2-state-space
    title: A model of the robot (dynamics & state-space)
    order: 2
    concepts:
      - ode-models
      - linearization
      - state-space-form
      - transfer-functions
      - poles-eigenvalues
    app_notes: notes/diffdrive/m2-state-space.md
    build: >-
      Derive heading/velocity ODE; linearize to (A,B,C,D); simulate step
      response alongside sim.
    done_test: >-
      Linear model step response matches sim within ~10%; explain behaviour via
      pole locations.
    videos: []
    status: not_started
  - id: m3-pid
    title: First closed loop (classical PID)
    order: 3
    concepts:
      - feedback
      - pid
      - steady-state-error
      - stability-margins
      - tuning
      - integrator-windup
    app_notes: notes/diffdrive/m3-pid.md
    build: >-
      PID heading controller as a ROS 2 node (P->I->D); velocity control; robot
      follows a path.
    done_test: >-
      Heading steady-state error < 1 deg, no sustained oscillation; removing I
      re-introduces offset.
    videos: []
    status: not_started
  - id: m4-lqr
    title: Let the math pick the controller (LQR)
    order: 4
    concepts:
      - controllability-observability
      - pole-placement
      - lqr
      - observers
      - lqg
    app_notes: notes/diffdrive/m4-lqr.md
    build: >-
      Check controllability; implement pole placement + LQR (solve Riccati
      yourself, verify vs SciPy).
    done_test: >-
      LQR stabilizes AND beats M3 PID on settling OR effort; hand gain ~=
      library lqr().
    videos: []
    status: not_started
  - id: m5-kalman
    title: Estimate what you can't measure (Kalman)
    order: 5
    concepts:
      - noise-uncertainty
      - bayes-filter
      - kalman-filter
      - ekf
      - sensor-fusion
    app_notes: notes/diffdrive/m5-kalman.md
    build: >-
      Add noisy IMU to the USD robot; KF/EKF from scratch fusing odometry + IMU;
      validate vs library.
    done_test: >-
      Fused RMS pose error < raw odometry alone; from-scratch filter tracks
      library filter within tol.
    videos: []
    status: not_started
  - id: m6-discrete
    title: Continuous math -> code that runs every 10 ms
    order: 6
    concepts:
      - sampling-aliasing
      - z-transform
      - discretization
      - loop-timing
    app_notes: notes/diffdrive/m6-discrete.md
    build: >-
      Discretize PID + LQR + estimator; run as fixed-rate ROS 2 nodes (e.g. 100
      Hz) with real timing.
    done_test: >-
      Discretized controllers hold M3/M4 performance at rate; degrade on purpose
      when rate is lowered.
    videos: []
    status: not_started
  - id: m7-nonlinear
    title: Prove it won't fall over (nonlinear & robust)
    order: 7
    concepts:
      - nonlinearity
      - lyapunov-stability
      - feedback-linearization
      - sliding-mode
      - robustness
    app_notes: notes/diffdrive/m7-nonlinear.md
    build: >-
      Lyapunov-based nonlinear trajectory-tracking controller; stress with model
      mismatch.
    done_test: >-
      Tracks curved ref under injected wheel-radius mismatch that visibly breaks
      linear control.
    videos: []
    status: not_started
  - id: m8-mpc
    title: Plan a few seconds ahead (MPC)
    order: 8
    concepts:
      - trajectory-optimization
      - mpc
      - constraints
    app_notes: notes/diffdrive/m8-mpc.md
    build: >-
      MPC path-follower respecting speed/turn limits (solve finite-horizon QP
      each step; verify vs solver).
    done_test: >-
      Follows path WITHOUT violating speed/turn constraints where PID
      overshoots; slows before tight turn.
    videos: []
    status: not_started
  - id: m9-slam
    title: Build a map of an unseen world (SLAM)
    order: 9
    concepts:
      - lidar-depth-basics
      - occupancy-grids
      - scan-matching
      - slam
      - loop-closure
    app_notes: notes/diffdrive/m9-slam.md
    build: >-
      Add lidar/depth to USD robot; import SLAM as oracle, then reimplement
      occupancy + scan-matching.
    done_test: >-
      Own map recognizably correct; loop closure measurably reduces drift; ~=
      library SLAM map.
    videos: []
    status: not_started
  - id: m10-autonomy
    title: Full autonomy (planning + estimate->plan->control)
    order: 10
    concepts:
      - global-planning
      - local-planning
      - estimate-plan-control
    app_notes: notes/diffdrive/m10-autonomy.md
    build: >-
      Global planner (A*/RRT) over your map + local planner;
      estimator->planner->controller in one run.
    done_test: >-
      Given a goal pose, robot plans and drives there, stops within tol, no
      collision, all own loop.
    videos: []
    status: not_started
  - id: m11-capstone
    title: 'Capstone: mobile manipulator (add an arm)'
    order: 11
    concepts:
      - manipulator-kinematics
      - manipulator-dynamics
      - computed-torque
      - whole-body-coordination
    app_notes: notes/diffdrive/m11-capstone.md
    build: >-
      Author 2–3 DOF arm onto the base (own USD); kinematics + computed-torque;
      coordinate base + arm.
    done_test: >-
      Robot drives to a target THEN arm reaches a commanded EE pose within tol,
      coordinated, end-to-end.
    videos: []
    status: not_started
updated: '2026-09-14'
---
# Diff-drive → mobile manipulator

The first robot: authored from zero in simulation. Each milestone references shared concepts and adds the sim build + its video. See ROADMAP-diffdrive.md.
