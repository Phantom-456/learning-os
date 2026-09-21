import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-concepts-'));
  process.env.YTS_CONTENT_DIR = dir;
  // Fresh module registry per test file (Vitest default isolation), so a
  // dynamic import after setting the env var picks it up correctly.
});

describe('concepts', () => {
  it('creates and reads back a concept', async () => {
    const { createConcept, getConcept } = await import('./concepts');
    createConcept({ id: 'pid', title: 'PID', parent: 'Classical control' });
    const c = getConcept('pid');
    expect(c?.title).toBe('PID');
    expect(c?.status).toBe('not_started');
    expect(c?.notes).toEqual([]);
  });

  it('archives rather than deletes', async () => {
    const { createConcept, archiveConcept, getConcept, getAllConcepts } = await import('./concepts');
    createConcept({ id: 'pid', title: 'PID', parent: 'Classical control' });
    archiveConcept('pid');
    expect(getConcept('pid')?.archived).toBe(true);
    expect(getAllConcepts()).toHaveLength(0);
    expect(getAllConcepts(true)).toHaveLength(1);
  });

  it('restores an archived concept', async () => {
    const { createConcept, archiveConcept, restoreConcept, getAllConcepts } = await import('./concepts');
    createConcept({ id: 'pid', title: 'PID', parent: 'Classical control' });
    archiveConcept('pid');
    restoreConcept('pid');
    expect(getAllConcepts()).toHaveLength(1);
  });
});
