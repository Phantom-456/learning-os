import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';

let dir: string;

beforeEach(() => {
  // lib/paths.ts (the old layer) computes CONTENT_DIR as a module-level
  // const from YTS_CONTENT_DIR at import time, so it must be re-imported
  // fresh whenever the env var changes between tests in this file.
  vi.resetModules();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-content-'));
  process.env.YTS_CONTENT_DIR = dir;
  fs.mkdirSync(path.join(dir, 'concepts'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'projects'), { recursive: true });
});

describe('content (old layer) round-trips unknown frontmatter keys', () => {
  it('preserves a new-layer `notes` key on a Concept round-tripped through getConcept/saveConcept', async () => {
    const { getConcept, saveConcept } = await import('./content');
    fs.writeFileSync(
      path.join(dir, 'concepts', 'pid.md'),
      matter.stringify('# PID\nbody', {
        id: 'pid',
        title: 'PID',
        parent: 'Classical control',
        order: 1,
        status: 'learning',
        review: false,
        prereqs: [],
        updated: '2026-09-14',
        notes: [{ id: 'n1', date: '2026-09-14', text: 'carried over from migration' }],
      })
    );

    const c = getConcept('pid');
    expect(c?.extra?.notes).toEqual([{ id: 'n1', date: '2026-09-14', text: 'carried over from migration' }]);

    // Simulate the app UI toggling status through the old layer, e.g. app/api PATCH.
    if (c) {
      c.status = 'complete';
      saveConcept(c);
    }

    const { data } = matter(fs.readFileSync(path.join(dir, 'concepts', 'pid.md'), 'utf8'));
    expect(data.status).toBe('complete');
    expect(data.notes).toEqual([{ id: 'n1', date: '2026-09-14', text: 'carried over from migration' }]);
  });

  it('preserves an unknown `checkpoints`/`metadata`/`notes` set on a Project round-tripped through getProject/saveProject', async () => {
    const { getProject, saveProject } = await import('./content');
    fs.writeFileSync(
      path.join(dir, 'projects', 'diffdrive-mobile-manipulator.md'),
      matter.stringify('project body', {
        id: 'diffdrive-mobile-manipulator',
        title: 'Diff-drive → mobile manipulator',
        robot: 'differential_drive+arm',
        status: 'in_progress',
        definition_of_done: 'robot runs end-to-end',
        toolchain: 'Isaac Sim + ROS 2',
        milestones: [],
        updated: '2026-09-14',
        checkpoints: [{ id: 'm0-environment', title: 'Simulator + empty robot body', depends_on: [], courses: [], concepts: ['pid'], status: 'not_started' }],
        metadata: { robot: 'differential_drive+arm', toolchain: 'Isaac Sim + ROS 2', definition_of_done: 'robot runs end-to-end' },
        notes: [{ id: 'n1', date: '2026-09-14', text: 'migrated note' }],
      })
    );

    const p = getProject('diffdrive-mobile-manipulator');
    expect(p?.extra?.checkpoints).toBeTruthy();
    expect(p?.extra?.metadata).toBeTruthy();
    expect(p?.extra?.notes).toBeTruthy();

    // Simulate app/api/projects/[id]/route.ts PATCH: getProject -> mutate -> saveProject.
    if (p) {
      p.status = 'done';
      saveProject(p);
    }

    const { data } = matter(fs.readFileSync(path.join(dir, 'projects', 'diffdrive-mobile-manipulator.md'), 'utf8'));
    expect(data.status).toBe('done');
    expect(data.checkpoints).toHaveLength(1);
    expect(data.metadata).toEqual({ robot: 'differential_drive+arm', toolchain: 'Isaac Sim + ROS 2', definition_of_done: 'robot runs end-to-end' });
    expect(data.notes).toEqual([{ id: 'n1', date: '2026-09-14', text: 'migrated note' }]);
  });
});
