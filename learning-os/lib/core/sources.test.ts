import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-sources-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('sources', () => {
  it('tags multiple concepts from one source', async () => {
    const { createSource, sourcesForConcept } = await import('./sources');
    createSource({
      id: 'kalman-video',
      type: 'video',
      title: 'Kalman filters explained',
      url: 'https://example.com/kalman',
      concepts: ['kalman-filter', 'ekf'],
    });
    expect(sourcesForConcept('kalman-filter').map((s) => s.id)).toEqual(['kalman-video']);
    expect(sourcesForConcept('ekf').map((s) => s.id)).toEqual(['kalman-video']);
    expect(sourcesForConcept('unrelated')).toEqual([]);
  });

  it('archives rather than deletes', async () => {
    const { createSource, archiveSource, getAllSources } = await import('./sources');
    createSource({ id: 's1', type: 'link', title: 'X', url: 'https://x', concepts: [] });
    archiveSource('s1');
    expect(getAllSources()).toHaveLength(0);
    expect(getAllSources(true)).toHaveLength(1);
  });
});
