// lib/core/templates.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-templates-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('templates', () => {
  it('creates a template with empty experience fields by default', async () => {
    const { createTemplate, getTemplate } = await import('./templates');
    createTemplate({ id: 'diffdrive-template', title: 'Diff-drive robot', courses: [], concepts: [] });
    const t = getTemplate('diffdrive-template');
    expect(t?.lessons_learned).toEqual([]);
    expect(t?.watch_for).toEqual([]);
  });

  it('appends lessons learned without overwriting prior entries', async () => {
    const { createTemplate, appendLessonLearned, getTemplate } = await import('./templates');
    createTemplate({ id: 't1', title: 'T', courses: [], concepts: [] });
    appendLessonLearned('t1', 'Order the caster wheel early, it always ships slow.');
    appendLessonLearned('t1', 'Isaac Sim units are meters, not cm.');
    expect(getTemplate('t1')?.lessons_learned).toHaveLength(2);
  });
});
