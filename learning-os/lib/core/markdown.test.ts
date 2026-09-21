// lib/core/markdown.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeMd, readMd, listIds } from './markdown';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-'));
});

describe('markdown', () => {
  it('round-trips frontmatter and body', () => {
    const file = path.join(dir, 'a.md');
    writeMd(file, { id: 'a', n: 1 }, '# Hello');
    const result = readMd(file);
    expect(result?.data).toMatchObject({ id: 'a', n: 1 });
    expect(result?.body.trim()).toBe('# Hello');
  });

  it('returns null for a missing file', () => {
    expect(readMd(path.join(dir, 'missing.md'))).toBeNull();
  });

  it('lists ids from .md filenames in a directory', () => {
    writeMd(path.join(dir, 'sub', 'x.md'), {}, '');
    writeMd(path.join(dir, 'sub', 'y.md'), {}, '');
    expect(listIds(path.join(dir, 'sub')).sort()).toEqual(['x', 'y']);
  });

  it('returns an empty list for a directory that does not exist', () => {
    expect(listIds(path.join(dir, 'nope'))).toEqual([]);
  });
});
