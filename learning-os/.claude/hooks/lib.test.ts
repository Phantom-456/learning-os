// .claude/hooks/lib.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-hooks-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('hooks lib', () => {
  it('matches a prompt against known concept titles, case-insensitively, and finds nothing for an unrelated prompt', async () => {
    const { createConcept } = await import('../../lib/core/concepts');
    createConcept({ id: 'kalman-filter', title: 'Kalman filter', parent: 'State estimation' });

    const { matchEntityTitles } = await import('./lib.mjs');
    const hits = matchEntityTitles('can you explain the kalman filter update step to me');
    expect(hits.some((h) => h.id === 'kalman-filter' && h.kind === 'concept')).toBe(true);

    const noHits = matchEntityTitles('what is the weather like today');
    expect(noHits).toHaveLength(0);
  });

  it('summarizes newly-unblocked checkpoints for a project', async () => {
    const { createProject } = await import('../../lib/core/projects');
    createProject({
      id: 'p1', title: 'P1',
      checkpoints: [
        { id: 'a', title: 'A', depends_on: [], courses: [], concepts: [], status: 'done' },
        { id: 'b', title: 'B', depends_on: ['a'], courses: [], concepts: [], status: 'not_started' },
      ],
    });

    const { summarizeUnblocked } = await import('./lib.mjs');
    const summary = summarizeUnblocked('p1');
    expect(summary).toContain('B');
  });
});
