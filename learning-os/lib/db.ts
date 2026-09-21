import { DatabaseSync } from 'node:sqlite';
import {
  getAllConcepts,
  getAllProjects,
} from './content';
import type { Concept } from './types';

// ---------------------------------------------------------------------------
// SQLite index (ARCHITECTURE.md §7). The index MIRRORS the Markdown frontmatter
// and is rebuilt from the files — it is never a second source of truth. We keep
// it in-memory and rebuild on start + after every write, so it can never drift.
// Cached on globalThis so Next.js hot-reload reuses one instance in dev.
// ---------------------------------------------------------------------------

interface ConceptRow {
  id: string;
  title: string;
  parent: string;
  ord: number;
  status: string;
  review: number;
  deleted: number;
  videos: number;
  prereqs: string;
  updated: string;
}

interface ProjectRow {
  id: string;
  title: string;
  robot: string;
  status: string;
  deleted: number;
  milestones: number;
  done: number;
  updated: string;
}

const g = globalThis as unknown as { __ytsIndex?: DatabaseSync };

function build(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE concepts (
      id TEXT PRIMARY KEY, title TEXT, parent TEXT, ord INTEGER, status TEXT,
      review INTEGER, deleted INTEGER, videos INTEGER, prereqs TEXT, updated TEXT
    );
    CREATE TABLE projects (
      id TEXT PRIMARY KEY, title TEXT, robot TEXT, status TEXT, deleted INTEGER,
      milestones INTEGER, done INTEGER, updated TEXT
    );
  `);

  const ci = db.prepare(
    `INSERT INTO concepts VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  for (const c of getAllConcepts(true)) {
    ci.run(c.id, c.title, c.parent, c.order, c.status, c.review ? 1 : 0, c.deleted ? 1 : 0, c.videos.length, (c.prereqs || []).join(','), c.updated);
  }

  const pi = db.prepare(`INSERT INTO projects VALUES (?,?,?,?,?,?,?,?)`);
  for (const p of getAllProjects(true)) {
    const done = p.milestones.filter((m) => m.status === 'done').length;
    pi.run(p.id, p.title, p.robot, p.status, p.deleted ? 1 : 0, p.milestones.length, done, p.updated);
  }
  return db;
}

export function getIndex(): DatabaseSync {
  if (!g.__ytsIndex) g.__ytsIndex = build();
  return g.__ytsIndex;
}

/** Rebuild the index from the Markdown files. Call after any content write. */
export function rebuildIndex(): void {
  if (g.__ytsIndex) {
    try { g.__ytsIndex.close(); } catch { /* ignore */ }
  }
  g.__ytsIndex = build();
}

// ---- Views (query the index) ---------------------------------------------

export interface ConceptSummary {
  id: string;
  title: string;
  parent: string;
  order: number;
  status: Concept['status'];
  review: boolean;
  videos: number;
}

export interface ParentGroupSummary {
  parent: string;
  concepts: ConceptSummary[];
  complete: number;
  total: number;
}

function rowToSummary(r: ConceptRow): ConceptSummary {
  return {
    id: r.id,
    title: r.title,
    parent: r.parent,
    order: r.ord,
    status: r.status as Concept['status'],
    review: r.review === 1,
    videos: r.videos,
  };
}

/**
 * Concept view: parent headers in learning order, each with its topics in order.
 * We sort globally by `ord` and group contiguous runs of the same parent, which
 * preserves both header order and within-header order from a single monotonic key.
 */
export function conceptGroups(includeDeleted = false): ParentGroupSummary[] {
  const db = getIndex();
  const rows = db
    .prepare(`SELECT * FROM concepts ${includeDeleted ? '' : 'WHERE deleted = 0'} ORDER BY ord, title`)
    .all() as unknown as ConceptRow[];

  const groups: ParentGroupSummary[] = [];
  for (const r of rows) {
    let grp = groups.find((x) => x.parent === r.parent);
    if (!grp) {
      grp = { parent: r.parent, concepts: [], complete: 0, total: 0 };
      groups.push(grp);
    }
    grp.concepts.push(rowToSummary(r));
    grp.total += 1;
    if (r.status === 'complete') grp.complete += 1;
  }
  return groups;
}

export interface ProjectSummary {
  id: string;
  title: string;
  robot: string;
  status: string;
  milestones: number;
  done: number;
}

export function projectSummaries(includeDeleted = false): ProjectSummary[] {
  const db = getIndex();
  const rows = db
    .prepare(`SELECT * FROM projects ${includeDeleted ? '' : 'WHERE deleted = 0'} ORDER BY title`)
    .all() as unknown as ProjectRow[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    robot: r.robot,
    status: r.status,
    milestones: r.milestones,
    done: r.done,
  }));
}

export interface Stats {
  conceptsTotal: number;
  conceptsComplete: number;
  conceptsLearning: number;
  conceptsReview: number;
  projects: number;
  videos: number;
}

export function stats(): Stats {
  const db = getIndex();
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status='complete' THEN 1 ELSE 0 END) AS complete,
         SUM(CASE WHEN status='learning' THEN 1 ELSE 0 END) AS learning,
         SUM(review) AS review,
         SUM(videos) AS videos
       FROM concepts WHERE deleted = 0`
    )
    .get() as Record<string, number>;
  const proj = db.prepare(`SELECT COUNT(*) AS n FROM projects WHERE deleted = 0`).get() as Record<string, number>;
  return {
    conceptsTotal: row.total ?? 0,
    conceptsComplete: row.complete ?? 0,
    conceptsLearning: row.learning ?? 0,
    conceptsReview: row.review ?? 0,
    projects: proj.n ?? 0,
    videos: row.videos ?? 0,
  };
}
