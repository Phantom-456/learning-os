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

  it('preserves old-layer `videos`/`links`/`template_done` keys through a saveConcept round trip', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const matter = (await import('gray-matter')).default;
    const { getConcept, saveConcept } = await import('./concepts');

    const file = path.join(dir, 'concepts', 'pid.md');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      matter.stringify('# PID\nbody', {
        id: 'pid',
        title: 'PID',
        parent: 'Classical control',
        order: 1,
        status: 'learning',
        review: false,
        prereqs: [],
        notes: [],
        updated: '2026-09-14',
        videos: [{ url: 'https://example.com/v', kind: 'short' }],
        links: [{ label: 'doc', url: 'https://example.com' }],
        template_done: ['definition', 'intuition'],
      })
    );

    const c = getConcept('pid');
    expect(c?.extra?.videos).toEqual([{ url: 'https://example.com/v', kind: 'short' }]);
    expect(c?.extra?.template_done).toEqual(['definition', 'intuition']);

    // Simulate a status toggle through the new layer's saveConcept.
    if (c) {
      c.status = 'complete';
      saveConcept(c);
    }

    const { data } = matter(fs.readFileSync(file, 'utf8'));
    expect(data.status).toBe('complete');
    expect(data.videos).toEqual([{ url: 'https://example.com/v', kind: 'short' }]);
    expect(data.links).toEqual([{ label: 'doc', url: 'https://example.com' }]);
    expect(data.template_done).toEqual(['definition', 'intuition']);
  });
});
