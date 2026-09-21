// lib/core/rollup.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-rollup-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('rollup', () => {
  it('aggregates a course\'s own notes plus its concepts\' notes, labeled by source', async () => {
    const { createConcept, saveConcept, getConcept } = await import('./concepts');
    createConcept({ id: 'a', title: 'Concept A', parent: 'P' });
    const a = getConcept('a')!;
    a.notes.push({ id: 'n1', date: '2026-09-21', text: 'note on A' });
    saveConcept(a);

    const { createCourse, saveCourse, getCourse } = await import('./courses');
    createCourse({ id: 'c1', title: 'Course 1', kind: 'authored', concepts: ['a'] });
    const c1 = getCourse('c1')!;
    c1.notes.push({ id: 'n2', date: '2026-09-21', text: 'note on course' });
    saveCourse(c1);

    const { getAggregatedNotesForCourse } = await import('./rollup');
    const notes = getAggregatedNotesForCourse('c1');
    expect(notes).toHaveLength(2);
    expect(notes.find((n) => n.id === 'n1')?.source).toEqual({ kind: 'concept', id: 'a', title: 'Concept A' });
    expect(notes.find((n) => n.id === 'n2')?.source).toEqual({ kind: 'course', id: 'c1', title: 'Course 1' });
  });

  it('recurses into subcourses', async () => {
    const { createConcept, saveConcept, getConcept } = await import('./concepts');
    createConcept({ id: 'b', title: 'Concept B', parent: 'P' });
    const b = getConcept('b')!;
    b.notes.push({ id: 'n3', date: '2026-09-21', text: 'note on B' });
    saveConcept(b);

    const { createCourse } = await import('./courses');
    createCourse({ id: 'sub', title: 'Sub', kind: 'authored', concepts: ['b'] });
    createCourse({ id: 'top', title: 'Top', kind: 'authored', concepts: [], subcourses: ['sub'] });

    const { getAggregatedNotesForCourse } = await import('./rollup');
    expect(getAggregatedNotesForCourse('top').map((n) => n.id)).toEqual(['n3']);
  });

  it('aggregates a project\'s notes plus everything reachable from its checkpoints', async () => {
    const { createConcept, saveConcept, getConcept } = await import('./concepts');
    createConcept({ id: 'x', title: 'X', parent: 'P' });
    const x = getConcept('x')!;
    x.notes.push({ id: 'n4', date: '2026-09-21', text: 'note on X' });
    saveConcept(x);

    const { createProject } = await import('./projects');
    createProject({
      id: 'proj',
      title: 'Proj',
      checkpoints: [
        { id: 'cp1', title: 'CP1', depends_on: [], courses: [], concepts: ['x'], status: 'not_started' },
      ],
    });

    const { getAggregatedNotesForProject } = await import('./rollup');
    expect(getAggregatedNotesForProject('proj').map((n) => n.id)).toEqual(['n4']);
  });
});
