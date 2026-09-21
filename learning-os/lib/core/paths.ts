import path from 'node:path';
import fs from 'node:fs';

// Paths are computed lazily (not cached module-level consts) so tests can
// point YTS_CONTENT_DIR at a fresh temp directory per test file.

export function appRoot(): string {
  return process.cwd();
}

export function contentDir(): string {
  return process.env.YTS_CONTENT_DIR
    ? path.resolve(process.env.YTS_CONTENT_DIR)
    : path.join(appRoot(), 'content');
}

export const conceptsDir = () => path.join(contentDir(), 'concepts');
export const sourcesDir = () => path.join(contentDir(), 'sources');
export const coursesDir = () => path.join(contentDir(), 'courses');
export const templatesDir = () => path.join(contentDir(), 'templates');
export const projectsDir = () => path.join(contentDir(), 'projects');
export const pricesDir = () => path.join(contentDir(), 'prices');
export const assetsDir = () => path.join(contentDir(), 'assets');
export const notesDir = () => path.join(contentDir(), 'notes'); // legacy per-milestone note files, read during migration only
export const globalKnowledgeFile = () => path.join(contentDir(), 'global-knowledge.md');
export const trashDir = () => path.join(contentDir(), '.trash');

export function ensureDirs(): void {
  for (const d of [
    contentDir(),
    conceptsDir(),
    sourcesDir(),
    coursesDir(),
    templatesDir(),
    projectsDir(),
    pricesDir(),
    assetsDir(),
    trashDir(),
  ]) {
    fs.mkdirSync(d, { recursive: true });
  }
}
