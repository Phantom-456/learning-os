import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-projects-'));
  process.env.YTS_CONTENT_DIR = dir;
});

const cp = (id: string, dependsOn: string[] = [], status: 'not_started' | 'building' | 'done' = 'not_started') => ({
  id,
  title: id,
  depends_on: dependsOn,
  courses: [],
  concepts: [],
  status,
});

describe('projects: DAG', () => {
  it('reports checkpoints with all dependencies done as unblocked', async () => {
    const { unblockedCheckpoints } = await import('./projects');
    const checkpoints = [cp('a', [], 'done'), cp('b', ['a']), cp('c', ['b'])];
    expect(unblockedCheckpoints(checkpoints).map((c) => c.id)).toEqual(['b']);
  });

  it('detects a direct cycle (a depends on b, b would depend on a)', async () => {
    const { wouldCreateCycle } = await import('./projects');
    const checkpoints = [cp('a', ['b']), cp('b', [])];
    expect(wouldCreateCycle(checkpoints, 'b', ['a'])).toBe(true);
  });

  it('detects a transitive cycle (a->b->c, c would depend on a)', async () => {
    const { wouldCreateCycle } = await import('./projects');
    const checkpoints = [cp('a', ['b']), cp('b', ['c']), cp('c', [])];
    expect(wouldCreateCycle(checkpoints, 'c', ['a'])).toBe(true);
  });

  it('allows a non-cyclic edge', async () => {
    const { wouldCreateCycle } = await import('./projects');
    const checkpoints = [cp('a', []), cp('b', [])];
    expect(wouldCreateCycle(checkpoints, 'b', ['a'])).toBe(false);
  });

  it('rejects a write that would create a cycle', async () => {
    const { createProject, setCheckpointDependsOn } = await import('./projects');
    createProject({
      id: 'p1',
      title: 'P1',
      checkpoints: [cp('a', ['b']), cp('b', [])],
    });
    expect(() => setCheckpointDependsOn('p1', 'b', ['a'])).toThrow();
  });

  it('rejects createProject when checkpoints already contain a cycle at construction time', async () => {
    const { createProject } = await import('./projects');
    // a depends on b, b depends on a — cyclic from the start, not built via setCheckpointDependsOn
    expect(() =>
      createProject({
        id: 'p2',
        title: 'P2',
        checkpoints: [cp('a', ['b']), cp('b', ['a'])],
      })
    ).toThrow();
  });

  it('round-trips checkpoints with explicit undefined build/done_test through a successful write', async () => {
    const { createProject, getProject, setCheckpointDependsOn } = await import('./projects');
    createProject({
      id: 'p3',
      title: 'P3',
      checkpoints: [cp('a', []), cp('b', [])],
    });

    // getProject reads back through normalizeCheckpoint, which assigns
    // `build`/`done_test` as explicit own properties (value undefined)
    // since neither was present in the written frontmatter.
    const before = getProject('p3');
    expect(before?.checkpoints.every((c) => 'build' in c && 'done_test' in c)).toBe(true);
    expect(before?.checkpoints.map((c) => c.build)).toEqual([undefined, undefined]);

    // A non-cyclic write on those checkpoints must survive saveProject's
    // frontmatter serialization without the YAML dumper choking on the
    // undefined-valued keys.
    expect(() => setCheckpointDependsOn('p3', 'b', ['a'])).not.toThrow();

    const after = getProject('p3');
    expect(after?.checkpoints.find((c) => c.id === 'b')?.depends_on).toEqual(['a']);
  });
});
