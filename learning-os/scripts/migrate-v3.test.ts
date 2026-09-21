// scripts/migrate-v3.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-migrate-'));
  fs.mkdirSync(path.join(dir, 'concepts'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'projects'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'notes', 'diffdrive'), { recursive: true });

  fs.writeFileSync(
    path.join(dir, 'concepts', 'pid.md'),
    matter.stringify('# PID\nbody', { id: 'pid', title: 'PID', parent: 'Classical control', order: 1, status: 'learning', review: false, prereqs: [], updated: '2026-09-14' })
  );

  fs.writeFileSync(
    path.join(dir, 'notes', 'diffdrive', 'm0-environment.md'),
    matter.stringify('Notes about setting up the sim environment.', { updated: '2026-09-14' })
  );

  fs.writeFileSync(
    path.join(dir, 'projects', 'diffdrive-mobile-manipulator.md'),
    matter.stringify('project body', {
      id: 'diffdrive-mobile-manipulator',
      title: 'Diff-drive → mobile manipulator',
      robot: 'differential_drive+arm',
      status: 'in_progress',
      definition_of_done: 'robot runs end-to-end',
      toolchain: 'Isaac Sim + ROS 2',
      milestones: [
        { id: 'm0-environment', title: 'Simulator + empty robot body', order: 0, concepts: ['pid'], app_notes: 'notes/diffdrive/m0-environment.md', build: 'Author the USD body', done_test: 'Sim stays stable for 60s', videos: [], status: 'not_started' },
        { id: 'm1-kinematics', title: 'Make it move', order: 1, concepts: [], app_notes: null, build: 'Add diff-drive kinematics', done_test: 'Robot tracks a path', videos: [], status: 'not_started' },
      ],
    })
  );
});

describe('migrate-v3', () => {
  it('preserves every concept and adds an empty notes array', () => {
    execFileSync('node', ['scripts/migrate-v3.mjs', dir], { cwd: process.cwd() });
    const { data } = matter(fs.readFileSync(path.join(dir, 'concepts', 'pid.md'), 'utf8'));
    expect(data.id).toBe('pid');
    expect(data.notes).toEqual([]);
  });

  it('converts milestones into checkpoints with a sequential depends_on chain', () => {
    execFileSync('node', ['scripts/migrate-v3.mjs', dir], { cwd: process.cwd() });
    const { data } = matter(fs.readFileSync(path.join(dir, 'projects', 'diffdrive-mobile-manipulator.md'), 'utf8'));
    expect(data.checkpoints).toHaveLength(2);
    expect(data.checkpoints[0].depends_on).toEqual([]);
    expect(data.checkpoints[1].depends_on).toEqual(['m0-environment']);
  });

  it('moves robot/toolchain/definition_of_done into metadata and preserves build/done_test per checkpoint', () => {
    execFileSync('node', ['scripts/migrate-v3.mjs', dir], { cwd: process.cwd() });
    const { data } = matter(fs.readFileSync(path.join(dir, 'projects', 'diffdrive-mobile-manipulator.md'), 'utf8'));
    expect(data.metadata).toEqual({
      robot: 'differential_drive+arm',
      toolchain: 'Isaac Sim + ROS 2',
      definition_of_done: 'robot runs end-to-end',
    });
    expect(data.checkpoints[0].build).toBe('Author the USD body');
    expect(data.checkpoints[0].done_test).toBe('Sim stays stable for 60s');
  });

  it('carries the app_notes file body into a Project note, attributed to its checkpoint', () => {
    execFileSync('node', ['scripts/migrate-v3.mjs', dir], { cwd: process.cwd() });
    const { data } = matter(fs.readFileSync(path.join(dir, 'projects', 'diffdrive-mobile-manipulator.md'), 'utf8'));
    const note = data.notes.find((n) => n.text.includes('Notes about setting up the sim environment.'));
    expect(note).toBeTruthy();
    expect(note.text).toContain('Simulator + empty robot body');
  });
});
