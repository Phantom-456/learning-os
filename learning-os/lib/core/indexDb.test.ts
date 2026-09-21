import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-index-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('indexDb', () => {
  it('rebuilds from the Markdown files and reflects a subsequent write', async () => {
    const { createConcept } = await import('./concepts');
    createConcept({ id: 'a', title: 'A', parent: 'P' });

    const { conceptSummaries, rebuildIndex } = await import('./indexDb');
    expect(conceptSummaries().map((c) => c.id)).toEqual(['a']);

    const { createConcept: createConcept2 } = await import('./concepts');
    createConcept2({ id: 'b', title: 'B', parent: 'P' });
    rebuildIndex();
    expect(conceptSummaries().map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('excludes archived concepts and deleted projects by default', async () => {
    const { createConcept, archiveConcept } = await import('./concepts');
    createConcept({ id: 'a', title: 'A', parent: 'P' });
    archiveConcept('a');

    const { createProject, softDeleteProject } = await import('./projects');
    createProject({ id: 'p1', title: 'P1' });
    softDeleteProject('p1');

    const { conceptSummaries, projectSummaries, rebuildIndex } = await import('./indexDb');
    rebuildIndex();
    expect(conceptSummaries()).toHaveLength(0);
    expect(projectSummaries()).toHaveLength(0);
  });
});
