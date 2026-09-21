import { DatabaseSync } from 'node:sqlite';
import { getAllConcepts } from './concepts';
import { getAllSources } from './sources';
import { getAllCourses } from './courses';
import { getAllTemplates } from './templates';
import { getAllProjects } from './projects';
import type { Concept, Course, Project } from './types';

// In-memory SQLite mirror of the Markdown files, rebuilt from them on start
// and after every write — never a second source of truth (spec §5). Cached
// on globalThis so Next.js hot-reload (Plan 1b) reuses one instance.

interface ConceptRow {
  id: string; title: string; parent: string; ord: number; status: string; review: number; updated: string;
}
interface CourseRow {
  id: string; title: string; kind: string; concepts: number; subcourses: number; updated: string;
}
interface ProjectRow {
  id: string; title: string; status: string; checkpoints: number; done: number; updated: string;
}

const g = globalThis as unknown as { __lomIndex?: DatabaseSync };

function build(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE concepts (id TEXT PRIMARY KEY, title TEXT, parent TEXT, ord INTEGER, status TEXT, review INTEGER, updated TEXT);
    CREATE TABLE courses (id TEXT PRIMARY KEY, title TEXT, kind TEXT, concepts INTEGER, subcourses INTEGER, updated TEXT);
    CREATE TABLE projects (id TEXT PRIMARY KEY, title TEXT, status TEXT, checkpoints INTEGER, done INTEGER, updated TEXT);
  `);

  const ci = db.prepare(`INSERT INTO concepts VALUES (?,?,?,?,?,?,?)`);
  for (const c of getAllConcepts()) {
    ci.run(c.id, c.title, c.parent, c.order, c.status, c.review ? 1 : 0, c.updated);
  }

  const coi = db.prepare(`INSERT INTO courses VALUES (?,?,?,?,?,?)`);
  for (const c of getAllCourses()) {
    coi.run(c.id, c.title, c.kind, c.concepts.length, c.subcourses.length, c.updated);
  }

  const pi = db.prepare(`INSERT INTO projects VALUES (?,?,?,?,?,?)`);
  for (const p of getAllProjects()) {
    const done = p.checkpoints.filter((cp) => cp.status === 'done').length;
    pi.run(p.id, p.title, p.status, p.checkpoints.length, done, p.updated);
  }

  // Sources and Templates are queried directly (small, no derived aggregates
  // needed yet) — kept out of the SQLite mirror until a view actually needs it.
  void getAllSources;
  void getAllTemplates;

  return db;
}

export function getIndex(): DatabaseSync {
  if (!g.__lomIndex) g.__lomIndex = build();
  return g.__lomIndex;
}

export function rebuildIndex(): void {
  if (g.__lomIndex) {
    try { g.__lomIndex.close(); } catch { /* ignore */ }
  }
  g.__lomIndex = build();
}

export interface ConceptSummary {
  id: string; title: string; parent: string; order: number; status: Concept['status']; review: boolean;
}
export function conceptSummaries(): ConceptSummary[] {
  const rows = getIndex().prepare(`SELECT * FROM concepts ORDER BY ord, title`).all() as unknown as ConceptRow[];
  return rows.map((r) => ({ id: r.id, title: r.title, parent: r.parent, order: r.ord, status: r.status as Concept['status'], review: r.review === 1 }));
}

export interface CourseSummary {
  id: string; title: string; kind: Course['kind']; concepts: number; subcourses: number;
}
export function courseSummaries(): CourseSummary[] {
  const rows = getIndex().prepare(`SELECT * FROM courses ORDER BY title`).all() as unknown as CourseRow[];
  return rows.map((r) => ({ id: r.id, title: r.title, kind: r.kind as Course['kind'], concepts: r.concepts, subcourses: r.subcourses }));
}

export interface ProjectSummary {
  id: string; title: string; status: Project['status']; checkpoints: number; done: number;
}
export function projectSummaries(): ProjectSummary[] {
  const rows = getIndex().prepare(`SELECT * FROM projects ORDER BY title`).all() as unknown as ProjectRow[];
  return rows.map((r) => ({ id: r.id, title: r.title, status: r.status as Project['status'], checkpoints: r.checkpoints, done: r.done }));
}
