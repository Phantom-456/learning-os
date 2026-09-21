import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-courses-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('courses', () => {
  it('creates a course with nested subcourses', async () => {
    const { createCourse, getCourse } = await import('./courses');
    createCourse({ id: 'basics', title: 'Basics', kind: 'authored', concepts: ['a', 'b'] });
    createCourse({ id: 'basics-exploded', title: 'A exploded', kind: 'authored', concepts: ['a1', 'a2'] });
    const parent = getCourse('basics')!;
    parent.subcourses.push('basics-exploded');
    const { saveCourse } = await import('./courses');
    saveCourse(parent);
    expect(getCourse('basics')?.subcourses).toEqual(['basics-exploded']);
  });

  it('derives completion recursively through subcourses', async () => {
    const { createConcept, saveConcept, getConcept } = await import('./concepts');
    createConcept({ id: 'a', title: 'A', parent: 'P' });
    createConcept({ id: 'b', title: 'B', parent: 'P' });
    const a = getConcept('a')!;
    a.status = 'complete';
    saveConcept(a);

    const { createCourse, courseCompletion } = await import('./courses');
    createCourse({ id: 'sub', title: 'Sub', kind: 'authored', concepts: ['b'] });
    createCourse({ id: 'top', title: 'Top', kind: 'authored', concepts: ['a'], subcourses: ['sub'] });

    expect(courseCompletion('top')).toEqual({ total: 2, complete: 1 });
  });
});
