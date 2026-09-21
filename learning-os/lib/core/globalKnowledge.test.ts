import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-global-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('globalKnowledge', () => {
  it('starts empty when no file exists yet', async () => {
    const { getGlobalKnowledge } = await import('./globalKnowledge');
    expect(getGlobalKnowledge()).toEqual({ lessons_learned: [], known_pitfalls: [], watch_for: [] });
  });

  it('accumulates entries across appends', async () => {
    const { appendGlobalLesson, appendGlobalWatchFor, getGlobalKnowledge } = await import('./globalKnowledge');
    appendGlobalLesson('Always check hardware compatibility before ordering.');
    appendGlobalWatchFor('Underestimating shipping time for hardware.');
    const g = getGlobalKnowledge();
    expect(g.lessons_learned).toHaveLength(1);
    expect(g.watch_for).toEqual(['Underestimating shipping time for hardware.']);
  });
});
