#!/usr/bin/env node
// Seed the content/ Markdown files from STUDY-PLAN.md (concepts) and
// ROADMAP-diffdrive.md (the first project). Structure only — bodies are the
// empty §2 template so the "your own words" gate stays honest.
//
// Idempotent: existing files are left untouched unless --force is passed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT = process.env.YTS_CONTENT_DIR ? path.resolve(process.env.YTS_CONTENT_DIR) : path.join(ROOT, 'content');
const CONCEPTS = path.join(CONTENT, 'concepts');
const PROJECTS = path.join(CONTENT, 'projects');
const NOTES = path.join(CONTENT, 'notes');
const FORCE = process.argv.includes('--force');
const today = new Date().toISOString().slice(0, 10);

for (const d of [CONCEPTS, PROJECTS, NOTES, path.join(CONTENT, '.trash')]) {
  fs.mkdirSync(d, { recursive: true });
}

// ---- §2 template body (structure only) -----------------------------------
const TEMPLATE_SLOTS = [
  ['Why it exists', 'One sentence: the problem this solves.'],
  ['Intuition', 'The physical/visual picture; the "aha".'],
  ['Formal definition', 'The precise statement + the math.'],
  ['Derivation', 'Re-derive it yourself from what you already know.'],
  ['Assumptions & failure modes', 'When does it break? What must be true?'],
  ['Worked example (by hand)', 'Real numbers, done on paper.'],
  ['Implementation', 'Code it / simulate it (from scratch where it teaches).'],
  ['On YOUR robot', 'Where this shows up in the robot you are building.'],
  ['Connections', 'Prereqs it needs + what it unlocks next.'],
  ['Misconceptions & gotchas', 'The traps; what people get wrong.'],
  ['Self-test', '3–5 questions or a mini-challenge you can pass.'],
  ['Hooks', 'The surprising/counterintuitive bits → Short seeds.'],
];

function templateBody(title) {
  const slots = TEMPLATE_SLOTS.map(([slot, hint]) => `## ${slot}\n\n_TODO — ${hint}_\n`).join('\n');
  return `# ${title}\n\n> Run this concept through the §2 template (STUDY-PLAN.md). When slots 1–8 and 11\n> exist **in your own words**, the topic is "understood".\n\n${slots}`;
}

// ---- Concepts: 12 parent headers, in learning order ----------------------
// [parentHeader, [ [id, title], ... ] ]
const HEADERS = [
  ['Environment & math foundations', [
    ['isaac-sim-usd-basics', 'Isaac Sim & USD basics'],
    ['ros2-bridge-setup', 'ROS 2 Jazzy + Isaac Sim bridge'],
    ['usd-articulation', 'USD articulations'],
    ['vectors-matrices', 'Vectors & matrices'],
    ['eigenvalues', 'Eigenvalues & eigenvectors'],
    ['complex-numbers', 'Complex numbers'],
    ['derivatives-odes', 'Derivatives & ODEs'],
    ['laplace-transform', 'The Laplace transform'],
  ]],
  ['Modeling & kinematics', [
    ['rigid-body-frames', 'Rigid-body frames'],
    ['transforms', 'Transforms (rotation & translation)'],
    ['diff-drive-kinematics', 'Differential-drive kinematics'],
    ['odometry', 'Odometry / dead reckoning'],
    ['what-is-a-model', "What a 'model' is"],
  ]],
  ['Dynamics & state-space', [
    ['ode-models', 'ODE models of motion'],
    ['linearization', 'Linearization'],
    ['state-space-form', 'State-space form (A,B,C,D)'],
    ['transfer-functions', 'Transfer functions'],
    ['poles-eigenvalues', 'Poles & eigenvalues'],
  ]],
  ['Classical control', [
    ['feedback', 'Feedback'],
    ['pid', 'PID control'],
    ['steady-state-error', 'Steady-state error'],
    ['stability-margins', 'Stability margins'],
    ['tuning', 'Controller tuning'],
    ['integrator-windup', 'Integrator wind-up'],
  ]],
  ['Modern control', [
    ['controllability-observability', 'Controllability & observability'],
    ['pole-placement', 'Pole placement'],
    ['lqr', 'LQR'],
    ['observers', 'Observers'],
    ['lqg', 'LQG'],
  ]],
  ['State estimation', [
    ['noise-uncertainty', 'Noise & uncertainty'],
    ['bayes-filter', 'The Bayes filter'],
    ['kalman-filter', 'Kalman filter'],
    ['ekf', 'Extended Kalman filter (EKF)'],
    ['sensor-fusion', 'Sensor fusion'],
  ]],
  ['Digital control', [
    ['sampling-aliasing', 'Sampling & aliasing'],
    ['z-transform', 'The z-transform'],
    ['discretization', 'Discretizing controllers'],
    ['loop-timing', 'Loop timing'],
  ]],
  ['Nonlinear & robust control', [
    ['nonlinearity', 'Nonlinearity'],
    ['lyapunov-stability', 'Lyapunov stability'],
    ['feedback-linearization', 'Feedback linearization'],
    ['sliding-mode', 'Sliding-mode control'],
    ['robustness', 'Robustness to model error'],
  ]],
  ['Optimal & predictive control', [
    ['trajectory-optimization', 'Trajectory optimization'],
    ['mpc', 'Model Predictive Control (MPC)'],
    ['constraints', 'Constraints'],
  ]],
  ['Perception, SLAM & mapping', [
    ['lidar-depth-basics', 'Lidar & depth basics'],
    ['occupancy-grids', 'Occupancy grids'],
    ['scan-matching', 'Scan matching'],
    ['slam', 'SLAM (front & back end)'],
    ['loop-closure', 'Loop closure'],
  ]],
  ['Autonomy & planning', [
    ['global-planning', 'Global planning (A*/RRT)'],
    ['local-planning', 'Local planning'],
    ['estimate-plan-control', 'The estimate→plan→control loop'],
  ]],
  ['Manipulation', [
    ['manipulator-kinematics', 'Manipulator kinematics'],
    ['manipulator-dynamics', 'Manipulator dynamics'],
    ['computed-torque', 'Computed-torque control'],
    ['whole-body-coordination', 'Whole-body coordination'],
  ]],
];

let order = 0;
let created = 0;
let skipped = 0;

for (const [parent, concepts] of HEADERS) {
  for (const [id, title] of concepts) {
    const file = path.join(CONCEPTS, `${id}.md`);
    order += 1;
    if (fs.existsSync(file) && !FORCE) { skipped += 1; continue; }
    const fm = {
      id,
      title,
      parent,
      order,
      status: 'not_started',
      review: false,
      prereqs: [],
      videos: [],
      links: [],
      template_done: [],
      updated: today,
    };
    fs.writeFileSync(file, matter.stringify(templateBody(title), fm), 'utf8');
    created += 1;
  }
}

// ---- Project: diff-drive → mobile manipulator + its 12 milestones ---------
const MILESTONES = [
  ['m0-environment', 'Simulator + empty robot body (from scratch)',
    ['isaac-sim-usd-basics', 'ros2-bridge-setup', 'usd-articulation', 'vectors-matrices', 'eigenvalues', 'complex-numbers', 'derivatives-odes', 'laplace-transform'],
    'Isaac Sim 5.1 (Win) + ROS 2 Jazzy (WSL2/RoboStack); own USD chassis+wheels+caster as one articulation.',
    'From WSL2, /clock streams sim time AND the own-authored body is physics-stable for >= 60 s.'],
  ['m1-kinematics', "Make it move + predict where it'll be",
    ['rigid-body-frames', 'transforms', 'diff-drive-kinematics', 'odometry', 'what-is-a-model'],
    'Wheel velocity actuators; (v,w)->wheel speeds node + odometry node publishing /odom.',
    '2x2 m open-loop square -> odom within 10 cm / 5 deg of the corner; show drift vs ground truth.'],
  ['m2-state-space', 'A model of the robot (dynamics & state-space)',
    ['ode-models', 'linearization', 'state-space-form', 'transfer-functions', 'poles-eigenvalues'],
    'Derive heading/velocity ODE; linearize to (A,B,C,D); simulate step response alongside sim.',
    'Linear model step response matches sim within ~10%; explain behaviour via pole locations.'],
  ['m3-pid', 'First closed loop (classical PID)',
    ['feedback', 'pid', 'steady-state-error', 'stability-margins', 'tuning', 'integrator-windup'],
    'PID heading controller as a ROS 2 node (P->I->D); velocity control; robot follows a path.',
    'Heading steady-state error < 1 deg, no sustained oscillation; removing I re-introduces offset.'],
  ['m4-lqr', 'Let the math pick the controller (LQR)',
    ['controllability-observability', 'pole-placement', 'lqr', 'observers', 'lqg'],
    'Check controllability; implement pole placement + LQR (solve Riccati yourself, verify vs SciPy).',
    'LQR stabilizes AND beats M3 PID on settling OR effort; hand gain ~= library lqr().'],
  ['m5-kalman', "Estimate what you can't measure (Kalman)",
    ['noise-uncertainty', 'bayes-filter', 'kalman-filter', 'ekf', 'sensor-fusion'],
    'Add noisy IMU to the USD robot; KF/EKF from scratch fusing odometry + IMU; validate vs library.',
    'Fused RMS pose error < raw odometry alone; from-scratch filter tracks library filter within tol.'],
  ['m6-discrete', 'Continuous math -> code that runs every 10 ms',
    ['sampling-aliasing', 'z-transform', 'discretization', 'loop-timing'],
    'Discretize PID + LQR + estimator; run as fixed-rate ROS 2 nodes (e.g. 100 Hz) with real timing.',
    'Discretized controllers hold M3/M4 performance at rate; degrade on purpose when rate is lowered.'],
  ['m7-nonlinear', "Prove it won't fall over (nonlinear & robust)",
    ['nonlinearity', 'lyapunov-stability', 'feedback-linearization', 'sliding-mode', 'robustness'],
    'Lyapunov-based nonlinear trajectory-tracking controller; stress with model mismatch.',
    'Tracks curved ref under injected wheel-radius mismatch that visibly breaks linear control.'],
  ['m8-mpc', 'Plan a few seconds ahead (MPC)',
    ['trajectory-optimization', 'mpc', 'constraints'],
    'MPC path-follower respecting speed/turn limits (solve finite-horizon QP each step; verify vs solver).',
    'Follows path WITHOUT violating speed/turn constraints where PID overshoots; slows before tight turn.'],
  ['m9-slam', 'Build a map of an unseen world (SLAM)',
    ['lidar-depth-basics', 'occupancy-grids', 'scan-matching', 'slam', 'loop-closure'],
    'Add lidar/depth to USD robot; import SLAM as oracle, then reimplement occupancy + scan-matching.',
    'Own map recognizably correct; loop closure measurably reduces drift; ~= library SLAM map.'],
  ['m10-autonomy', 'Full autonomy (planning + estimate->plan->control)',
    ['global-planning', 'local-planning', 'estimate-plan-control'],
    'Global planner (A*/RRT) over your map + local planner; estimator->planner->controller in one run.',
    'Given a goal pose, robot plans and drives there, stops within tol, no collision, all own loop.'],
  ['m11-capstone', 'Capstone: mobile manipulator (add an arm)',
    ['manipulator-kinematics', 'manipulator-dynamics', 'computed-torque', 'whole-body-coordination'],
    'Author 2–3 DOF arm onto the base (own USD); kinematics + computed-torque; coordinate base + arm.',
    'Robot drives to a target THEN arm reaches a commanded EE pose within tol, coordinated, end-to-end.'],
];

const projectId = 'diffdrive-mobile-manipulator';
const projectFile = path.join(PROJECTS, `${projectId}.md`);
const milestones = MILESTONES.map(([id, title, concepts, build, done_test], i) => {
  // Ensure an empty note file exists for each milestone (application notes, your words).
  const notesRel = `diffdrive/${id}.md`;
  const noteFile = path.join(NOTES, notesRel);
  if (!fs.existsSync(noteFile) || FORCE) {
    fs.mkdirSync(path.dirname(noteFile), { recursive: true });
    fs.writeFileSync(noteFile, matter.stringify(`# ${title} — application notes\n\n_Robot-specific notes, in your own words._\n`, { updated: today }), 'utf8');
  }
  return { id, title, order: i, concepts, app_notes: `notes/${notesRel}`, build, done_test, videos: [], status: 'not_started' };
});

if (!fs.existsSync(projectFile) || FORCE) {
  const fm = {
    id: projectId,
    title: 'Diff-drive → mobile manipulator',
    robot: 'differential_drive+arm',
    status: 'in_progress',
    definition_of_done: 'robot runs end-to-end in sim AND every milestone has a published video',
    toolchain: 'Isaac Sim 5.1 (Windows) + ROS 2 Jazzy (WSL2 / RoboStack); own URDF/USD, no robot packs',
    milestones,
    updated: today,
  };
  const body = '# Diff-drive → mobile manipulator\n\nThe first robot: authored from zero in simulation. Each milestone references shared concepts and adds the sim build + its video. See ROADMAP-diffdrive.md.\n';
  fs.writeFileSync(projectFile, matter.stringify(body, fm), 'utf8');
  created += 1;
} else {
  skipped += 1;
}

console.log(`Seed complete: ${created} created, ${skipped} skipped (existing). Concepts: ${order}. Content dir: ${CONTENT}`);
