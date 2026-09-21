import path from 'node:path';
import fs from 'node:fs';

// The Markdown files under CONTENT_DIR are the source of truth.
// YTS_CONTENT_DIR lets the launcher point the app at an external content folder if desired.
export const APP_ROOT = process.cwd();
export const CONTENT_DIR = process.env.YTS_CONTENT_DIR
  ? path.resolve(process.env.YTS_CONTENT_DIR)
  : path.join(APP_ROOT, 'content');

export const CONCEPTS_DIR = path.join(CONTENT_DIR, 'concepts');
export const PROJECTS_DIR = path.join(CONTENT_DIR, 'projects');
export const NOTES_DIR = path.join(CONTENT_DIR, 'notes');
export const TRASH_DIR = path.join(CONTENT_DIR, '.trash');

export function ensureDirs(): void {
  for (const d of [CONTENT_DIR, CONCEPTS_DIR, PROJECTS_DIR, NOTES_DIR, TRASH_DIR]) {
    fs.mkdirSync(d, { recursive: true });
  }
}
