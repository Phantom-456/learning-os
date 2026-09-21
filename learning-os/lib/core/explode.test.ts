import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-explode-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('explodeConcept', () => {
  it('creates a new course nested under the parent, carrying the reason', async () => {
    const { createConcept } = await import('./concepts');
    createConcept({ id: 'kalman-filter', title: 'Kalman filter', parent: 'State estimation' });
    const { createCourse, getCourse } = await import('./courses');
    createCourse({ id: 'estimation-basics', title: 'Estimation basics', kind: 'authored', concepts: ['kalman-filter'] });

    const { explodeConcept } = await import('./explode');
    const exploded = explodeConcept('kalman-filter', 'estimation-basics', 'the derivation loses me at the update step');

    expect(exploded.title).toContain('Kalman filter');
    expect(exploded.body).toContain('the derivation loses me at the update step');
    expect(getCourse('estimation-basics')?.subcourses).toEqual([exploded.id]);
  });

  it('throws when the concept does not exist', async () => {
    const { createCourse } = await import('./courses');
    createCourse({ id: 'c1', title: 'C1', kind: 'authored', concepts: [] });
    const { explodeConcept } = await import('./explode');
    expect(() => explodeConcept('missing', 'c1', 'reason')).toThrow();
  });
});
