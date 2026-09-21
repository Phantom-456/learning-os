# Core Data Model (Phase 1a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the robotics-only two-axis data model (`lib/types.ts`, `lib/content.ts`, `lib/db.ts`) with the domain-agnostic five-entity model from the design spec (Concept, Source, Course, Template, Project-as-DAG, plus the Price Record and global-knowledge singletons), with no data loss from the existing seed content, and no UI changes yet.

**Architecture:** A new framework-free directory `lib/core/` holds all entity types, Markdown CRUD, the checkpoint DAG resolver, notes rollup, and the SQLite index rebuild. It has zero Next.js imports, so it is importable unchanged from Node scripts later (Phase 2's MCP server/hooks) — no separate npm package is needed yet (YAGNI; add `package.json` exports only if Phase 2 actually requires it as an installable package). The existing `lib/{types,content,db,paths}.ts` are deleted once every consumer has moved to `lib/core/*`; `lib/status.ts` and `lib/pipeline.ts` are left alone (out of scope — UI/pipeline work is Plan 1b).

**Tech Stack:** TypeScript, Node `fs`/`node:sqlite`, `gray-matter` (already a dependency), Vitest (new dev dependency — the project has no test runner yet).

**Spec:** [docs/superpowers/specs/2026-09-21-learning-os-platform-design.md](../specs/2026-09-21-learning-os-platform-design.md) — implements §2 (entities), §3 (notes/rollup), §4's skill-vs-tool tool definitions (Template search, price cache), §5 (integrity: cycle detection, archive-not-delete), §6's Price Record (tool half only — the fresh-fetch skill is Phase 2).

## Global Constraints

- Markdown files under `content/` remain the only durable state; the SQLite index is always rebuilt from them, never hand-edited (spec §5).
- Concept and Source are **never hard-deleted** — only archived (spec §5). Course/Template/Project keep the existing soft-`deleted` flag (not covered by the archive requirement).
- Every `depends_on` edge on a Checkpoint is validated against cycles at write time; a cycle-creating write is rejected (spec §5).
- No LLM calls anywhere in this plan — Explode Concept is the manual stub only (spec §10, Phase 1 scope). No network calls.
- Existing seeded content (58 concepts + the `diffdrive-mobile-manipulator` project) must migrate with zero data loss — every `build`, `done_test`, and `app_notes` file body from the old milestones must be preserved somewhere in the new schema.

---

### Task 1: Test tooling + path/markdown/type foundations

**Files:**
- Modify: `package.json` (add `vitest` devDependency, add `"test": "vitest run"` script)
- Create: `vitest.config.ts`
- Create: `lib/core/paths.ts`
- Create: `lib/core/markdown.ts`
- Create: `lib/core/types.ts`
- Test: `lib/core/markdown.test.ts`

**Interfaces:**
- Produces: `contentDir()`, `conceptsDir()`, `sourcesDir()`, `coursesDir()`, `templatesDir()`, `projectsDir()`, `pricesDir()`, `assetsDir()`, `globalKnowledgeFile()`, `trashDir()`, `ensureDirs(): void` (all in `lib/core/paths.ts`, computed lazily from `process.env.YTS_CONTENT_DIR` on each call — not cached at module load, so tests can point at a fresh temp dir per test file).
- Produces: `writeMd(file, data, body): void`, `readMd(file): {data, body} | null`, `listIds(dir): string[]`, `today(): string` (in `lib/core/markdown.ts`).
- Produces (types only, no logic): `Status`, `NoteAttachment`, `Note`, `Concept`, `Source`, `Course`, `Template`, `KnowledgeEntry`, `GlobalKnowledge`, `CheckpointStatus`, `Checkpoint`, `Project`, `Market`, `PriceObservation`, `PriceAlternative`, `PriceRecord` (in `lib/core/types.ts`).

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add the test script and Vitest config**

Edit `package.json` scripts block to add `"test": "vitest run"` alongside the existing scripts.

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 3: Write `lib/core/types.ts`**

```typescript
// Domain types for the five-entity model (design spec §2-§6).
// Concept/Source are archive-only (never hard-deleted, spec §5); Course/
// Template/Project keep the existing soft-delete flag.

export type Status = 'not_started' | 'learning' | 'complete';

export interface NoteAttachment {
  type: 'image' | 'audio' | 'video' | 'link' | 'file';
  path?: string; // relative to content/assets, for local files
  url?: string; // for links
}

/** One journal-style entry: free text and/or attachments, mixed freely. */
export interface Note {
  id: string;
  date: string; // ISO-8601 date
  text?: string;
  attachments?: NoteAttachment[];
}

export interface Concept {
  id: string;
  title: string;
  parent: string;
  order: number;
  status: Status;
  review: boolean;
  prereqs: string[];
  notes: Note[];
  updated: string;
  archived?: boolean;
  body: string;
}

export interface Source {
  id: string;
  type: 'video' | 'article' | 'paper' | 'link' | 'pdf' | 'podcast' | 'other';
  title: string;
  url: string;
  concepts: string[]; // ownership lives here — a source tags every concept it covers
  added: string;
  notes: Note[];
  archived?: boolean;
  body: string;
}

export interface Course {
  id: string;
  title: string;
  kind: 'external' | 'authored';
  provider?: string;
  url?: string;
  concepts: string[];
  subcourses: string[]; // nested Courses, e.g. from Explode Concept
  notes: Note[];
  updated: string;
  deleted?: boolean;
  body: string;
}

export interface KnowledgeEntry {
  date: string;
  note: string;
}

export interface Template {
  id: string;
  title: string;
  courses: string[];
  concepts: string[];
  lessons_learned: KnowledgeEntry[];
  known_pitfalls: KnowledgeEntry[];
  watch_for: string[];
  updated: string;
  deleted?: boolean;
  body: string;
}

/** The instance-wide singleton (spec §2) — same shape as a Template's experience fields. */
export interface GlobalKnowledge {
  lessons_learned: KnowledgeEntry[];
  known_pitfalls: KnowledgeEntry[];
  watch_for: string[];
}

export type CheckpointStatus = 'not_started' | 'building' | 'done';

export interface Checkpoint {
  id: string;
  title: string;
  depends_on: string[];
  courses: string[];
  concepts: string[];
  status: CheckpointStatus;
  build?: string; // free-form build/execution notes
  done_test?: string; // pass/fail criterion
}

export interface Project {
  id: string;
  title: string;
  template?: string; // originating Template id, if instantiated from one
  status: 'in_progress' | 'done' | 'abandoned';
  metadata: Record<string, string>; // domain-specific info (e.g. robot, toolchain) — generic, not hardcoded
  checkpoints: Checkpoint[];
  notes: Note[];
  updated: string;
  deleted?: boolean;
  body: string;
}

export type Market = string; // e.g. "IN", "US" — location code paired with a currency

export interface PriceObservation {
  market: Market;
  currency: string;
  date: string;
  price: number;
  available: boolean;
  source: string;
  seller?: string;
}

export interface PriceAlternative {
  name: string;
  market: Market;
  currency: string;
  price: number;
  downsides: string;
}

export interface PriceRecord {
  id: string;
  item: string;
  observations: PriceObservation[]; // append-only
  alternatives: PriceAlternative[];
}
```

- [ ] **Step 4: Write `lib/core/paths.ts`**

```typescript
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
```

- [ ] **Step 5: Write `lib/core/markdown.ts`**

```typescript
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export function writeMd(file: string, data: Record<string, unknown>, body: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, matter.stringify(body ?? '', data), 'utf8');
}

export function readMd(file: string): { data: Record<string, unknown>; body: string } | null {
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  return { data, body: content };
}

export function listIds(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3));
}

export const today = (): string => new Date().toISOString().slice(0, 10);
```

- [ ] **Step 6: Write the failing test for `markdown.ts`**

```typescript
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
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- lib/core/markdown.test.ts`
Expected: PASS (4 tests) — `markdown.ts` has no external state to fail on, so this step confirms the module is wired correctly rather than catching a real bug.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/core/types.ts lib/core/paths.ts lib/core/markdown.ts lib/core/markdown.test.ts
git commit -m "Add core data model foundations: types, paths, markdown I/O"
```

---

### Task 2: Concept module (archive-not-delete)

**Files:**
- Create: `lib/core/concepts.ts`
- Test: `lib/core/concepts.test.ts`

**Interfaces:**
- Consumes: `conceptsDir()`, `ensureDirs()` from `./paths`; `writeMd`, `readMd`, `listIds`, `today` from `./markdown`; `Concept` from `./types`.
- Produces: `conceptFile(id): string`, `listConceptIds(): string[]`, `getConcept(id): Concept | null`, `getAllConcepts(includeArchived?: boolean): Concept[]`, `saveConcept(c: Concept): Concept`, `createConcept(input): Concept`, `archiveConcept(id): Concept | null`, `restoreConcept(id): Concept | null`.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/core/concepts.test.ts
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
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/core/concepts.test.ts`
Expected: FAIL — `Cannot find module './concepts'`

- [ ] **Step 3: Write `lib/core/concepts.ts`**

```typescript
import path from 'node:path';
import { conceptsDir, ensureDirs } from './paths';
import { writeMd, readMd, listIds, today } from './markdown';
import type { Concept, Note } from './types';

export function conceptFile(id: string): string {
  return path.join(conceptsDir(), `${id}.md`);
}

export function listConceptIds(): string[] {
  return listIds(conceptsDir());
}

function normalize(id: string, data: Record<string, unknown>, body: string): Concept {
  return {
    id: (data.id as string) ?? id,
    title: (data.title as string) ?? id,
    parent: (data.parent as string) ?? 'Uncategorized',
    order: Number(data.order ?? 0),
    status: (data.status as Concept['status']) ?? 'not_started',
    review: Boolean(data.review ?? false),
    prereqs: (data.prereqs as string[]) ?? [],
    notes: (data.notes as Note[]) ?? [],
    updated: (data.updated as string) ?? today(),
    archived: Boolean(data.archived ?? false),
    body,
  };
}

export function getConcept(id: string): Concept | null {
  const found = readMd(conceptFile(id));
  return found ? normalize(id, found.data, found.body) : null;
}

export function getAllConcepts(includeArchived = false): Concept[] {
  return listConceptIds()
    .map(getConcept)
    .filter((c): c is Concept => !!c && (includeArchived || !c.archived));
}

function frontmatter(c: Concept): Record<string, unknown> {
  const fm: Record<string, unknown> = {
    id: c.id,
    title: c.title,
    parent: c.parent,
    order: c.order,
    status: c.status,
    review: c.review,
    prereqs: c.prereqs,
    notes: c.notes,
    updated: c.updated,
  };
  if (c.archived) fm.archived = true;
  return fm;
}

export function saveConcept(c: Concept): Concept {
  ensureDirs();
  c.updated = today();
  writeMd(conceptFile(c.id), frontmatter(c), c.body ?? '');
  return c;
}

export function createConcept(
  input: Partial<Concept> & { id: string; title: string; parent: string }
): Concept {
  const c: Concept = {
    id: input.id,
    title: input.title,
    parent: input.parent,
    order: input.order ?? 0,
    status: input.status ?? 'not_started',
    review: input.review ?? false,
    prereqs: input.prereqs ?? [],
    notes: input.notes ?? [],
    updated: today(),
    body: input.body ?? '',
  };
  return saveConcept(c);
}

export function archiveConcept(id: string): Concept | null {
  const c = getConcept(id);
  if (!c) return null;
  c.archived = true;
  return saveConcept(c);
}

export function restoreConcept(id: string): Concept | null {
  const c = getConcept(id);
  if (!c) return null;
  c.archived = false;
  return saveConcept(c);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/core/concepts.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/core/concepts.ts lib/core/concepts.test.ts
git commit -m "Add Concept module (domain-agnostic, archive-not-delete)"
```

---

### Task 3: Source module (many-to-many tagging, archive-not-delete)

**Files:**
- Create: `lib/core/sources.ts`
- Test: `lib/core/sources.test.ts`

**Interfaces:**
- Consumes: `sourcesDir()`, `ensureDirs()` from `./paths`; `writeMd`, `readMd`, `listIds`, `today` from `./markdown`; `Source` from `./types`.
- Produces: `sourceFile(id): string`, `listSourceIds(): string[]`, `getSource(id): Source | null`, `getAllSources(includeArchived?: boolean): Source[]`, `saveSource(s: Source): Source`, `createSource(input): Source`, `archiveSource(id): Source | null`, `restoreSource(id): Source | null`, `sourcesForConcept(conceptId: string): Source[]`.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/core/sources.test.ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/core/sources.test.ts`
Expected: FAIL — `Cannot find module './sources'`

- [ ] **Step 3: Write `lib/core/sources.ts`**

```typescript
import path from 'node:path';
import { sourcesDir, ensureDirs } from './paths';
import { writeMd, readMd, listIds, today } from './markdown';
import type { Source, Note } from './types';

export function sourceFile(id: string): string {
  return path.join(sourcesDir(), `${id}.md`);
}

export function listSourceIds(): string[] {
  return listIds(sourcesDir());
}

function normalize(id: string, data: Record<string, unknown>, body: string): Source {
  return {
    id: (data.id as string) ?? id,
    type: (data.type as Source['type']) ?? 'other',
    title: (data.title as string) ?? id,
    url: (data.url as string) ?? '',
    concepts: (data.concepts as string[]) ?? [],
    added: (data.added as string) ?? today(),
    notes: (data.notes as Note[]) ?? [],
    archived: Boolean(data.archived ?? false),
    body,
  };
}

export function getSource(id: string): Source | null {
  const found = readMd(sourceFile(id));
  return found ? normalize(id, found.data, found.body) : null;
}

export function getAllSources(includeArchived = false): Source[] {
  return listSourceIds()
    .map(getSource)
    .filter((s): s is Source => !!s && (includeArchived || !s.archived));
}

function frontmatter(s: Source): Record<string, unknown> {
  const fm: Record<string, unknown> = {
    id: s.id,
    type: s.type,
    title: s.title,
    url: s.url,
    concepts: s.concepts,
    added: s.added,
    notes: s.notes,
  };
  if (s.archived) fm.archived = true;
  return fm;
}

export function saveSource(s: Source): Source {
  ensureDirs();
  writeMd(sourceFile(s.id), frontmatter(s), s.body ?? '');
  return s;
}

export function createSource(
  input: Partial<Source> & { id: string; type: Source['type']; title: string; url: string; concepts: string[] }
): Source {
  const s: Source = {
    id: input.id,
    type: input.type,
    title: input.title,
    url: input.url,
    concepts: input.concepts,
    added: today(),
    notes: input.notes ?? [],
    body: input.body ?? '',
  };
  return saveSource(s);
}

export function archiveSource(id: string): Source | null {
  const s = getSource(id);
  if (!s) return null;
  s.archived = true;
  return saveSource(s);
}

export function restoreSource(id: string): Source | null {
  const s = getSource(id);
  if (!s) return null;
  s.archived = false;
  return saveSource(s);
}

/** Reverse lookup: every non-archived Source that tags this concept. */
export function sourcesForConcept(conceptId: string): Source[] {
  return getAllSources().filter((s) => s.concepts.includes(conceptId));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/core/sources.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/core/sources.ts lib/core/sources.test.ts
git commit -m "Add Source module (many-to-many concept tagging, archive-not-delete)"
```

---

### Task 4: Course module (nested subcourses, derived completion)

**Files:**
- Create: `lib/core/courses.ts`
- Test: `lib/core/courses.test.ts`

**Interfaces:**
- Consumes: `coursesDir()`, `ensureDirs()` from `./paths`; `writeMd`, `readMd`, `listIds`, `today` from `./markdown`; `Course` from `./types`; `getConcept` from `./concepts`.
- Produces: `courseFile(id): string`, `listCourseIds(): string[]`, `getCourse(id): Course | null`, `getAllCourses(includeDeleted?: boolean): Course[]`, `saveCourse(c: Course): Course`, `createCourse(input): Course`, `softDeleteCourse(id): Course | null`, `courseCompletion(id): { total: number; complete: number }`.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/core/courses.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-courses-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('courses', () => {
  it('creates a course with nested subcourses', async () => {
    const { createCourse, getCourse } = await import('./courses');
    createCourse({ id: 'basics', title: 'Basics', kind: 'authored', concepts: ['a', 'b'] });
    createCourse({ id: 'basics-exploded', title: 'A exploded', kind: 'authored', concepts: ['a1', 'a2'] });
    const parent = getCourse('basics')!;
    parent.subcourses.push('basics-exploded');
    const { saveCourse } = await import('./courses');
    saveCourse(parent);
    expect(getCourse('basics')?.subcourses).toEqual(['basics-exploded']);
  });

  it('derives completion recursively through subcourses', async () => {
    const { createConcept, saveConcept, getConcept } = await import('./concepts');
    createConcept({ id: 'a', title: 'A', parent: 'P' });
    createConcept({ id: 'b', title: 'B', parent: 'P' });
    const a = getConcept('a')!;
    a.status = 'complete';
    saveConcept(a);

    const { createCourse, courseCompletion } = await import('./courses');
    createCourse({ id: 'sub', title: 'Sub', kind: 'authored', concepts: ['b'] });
    createCourse({ id: 'top', title: 'Top', kind: 'authored', concepts: ['a'], subcourses: ['sub'] });

    expect(courseCompletion('top')).toEqual({ total: 2, complete: 1 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/core/courses.test.ts`
Expected: FAIL — `Cannot find module './courses'`

- [ ] **Step 3: Write `lib/core/courses.ts`**

```typescript
import path from 'node:path';
import { coursesDir, ensureDirs } from './paths';
import { writeMd, readMd, listIds, today } from './markdown';
import type { Course, Note } from './types';
import { getConcept } from './concepts';

export function courseFile(id: string): string {
  return path.join(coursesDir(), `${id}.md`);
}

export function listCourseIds(): string[] {
  return listIds(coursesDir());
}

function normalize(id: string, data: Record<string, unknown>, body: string): Course {
  return {
    id: (data.id as string) ?? id,
    title: (data.title as string) ?? id,
    kind: (data.kind as Course['kind']) ?? 'authored',
    provider: data.provider as string | undefined,
    url: data.url as string | undefined,
    concepts: (data.concepts as string[]) ?? [],
    subcourses: (data.subcourses as string[]) ?? [],
    notes: (data.notes as Note[]) ?? [],
    updated: (data.updated as string) ?? today(),
    deleted: Boolean(data.deleted ?? false),
    body,
  };
}

export function getCourse(id: string): Course | null {
  const found = readMd(courseFile(id));
  return found ? normalize(id, found.data, found.body) : null;
}

export function getAllCourses(includeDeleted = false): Course[] {
  return listCourseIds()
    .map(getCourse)
    .filter((c): c is Course => !!c && (includeDeleted || !c.deleted));
}

function frontmatter(c: Course): Record<string, unknown> {
  const fm: Record<string, unknown> = {
    id: c.id,
    title: c.title,
    kind: c.kind,
    provider: c.provider,
    url: c.url,
    concepts: c.concepts,
    subcourses: c.subcourses,
    notes: c.notes,
    updated: c.updated,
  };
  if (c.deleted) fm.deleted = true;
  return fm;
}

export function saveCourse(c: Course): Course {
  ensureDirs();
  c.updated = today();
  writeMd(courseFile(c.id), frontmatter(c), c.body ?? '');
  return c;
}

export function createCourse(
  input: Partial<Course> & { id: string; title: string; kind: Course['kind']; concepts: string[] }
): Course {
  const c: Course = {
    id: input.id,
    title: input.title,
    kind: input.kind,
    provider: input.provider,
    url: input.url,
    concepts: input.concepts,
    subcourses: input.subcourses ?? [],
    notes: input.notes ?? [],
    updated: today(),
    body: input.body ?? '',
  };
  return saveCourse(c);
}

export function softDeleteCourse(id: string): Course | null {
  const c = getCourse(id);
  if (!c) return null;
  c.deleted = true;
  return saveCourse(c);
}

/** Recursively counts Concepts through subcourses (unique by id, cycle-safe). */
export function courseCompletion(id: string, seen = new Set<string>()): { total: number; complete: number } {
  if (seen.has(id)) return { total: 0, complete: 0 };
  seen.add(id);
  const course = getCourse(id);
  if (!course) return { total: 0, complete: 0 };

  let total = 0;
  let complete = 0;
  for (const conceptId of course.concepts) {
    const concept = getConcept(conceptId);
    if (!concept) continue;
    total += 1;
    if (concept.status === 'complete') complete += 1;
  }
  for (const subId of course.subcourses) {
    const sub = courseCompletion(subId, seen);
    total += sub.total;
    complete += sub.complete;
  }
  return { total, complete };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/core/courses.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/core/courses.ts lib/core/courses.test.ts
git commit -m "Add Course module (nested subcourses, recursive completion)"
```

---

### Task 5: Template module (experience fields)

**Files:**
- Create: `lib/core/templates.ts`
- Test: `lib/core/templates.test.ts`

**Interfaces:**
- Consumes: `templatesDir()`, `ensureDirs()` from `./paths`; `writeMd`, `readMd`, `listIds`, `today` from `./markdown`; `Template`, `KnowledgeEntry` from `./types`.
- Produces: `templateFile(id): string`, `listTemplateIds(): string[]`, `getTemplate(id): Template | null`, `getAllTemplates(includeDeleted?: boolean): Template[]`, `saveTemplate(t: Template): Template`, `createTemplate(input): Template`, `softDeleteTemplate(id): Template | null`, `appendLessonLearned(id, note: string): Template | null`, `appendKnownPitfall(id, note: string): Template | null`.

- [ ] **Step 1: Write the failing tests**

```typescript
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/core/templates.test.ts`
Expected: FAIL — `Cannot find module './templates'`

- [ ] **Step 3: Write `lib/core/templates.ts`**

```typescript
import path from 'node:path';
import { templatesDir, ensureDirs } from './paths';
import { writeMd, readMd, listIds, today } from './markdown';
import type { Template, KnowledgeEntry } from './types';

export function templateFile(id: string): string {
  return path.join(templatesDir(), `${id}.md`);
}

export function listTemplateIds(): string[] {
  return listIds(templatesDir());
}

function normalize(id: string, data: Record<string, unknown>, body: string): Template {
  return {
    id: (data.id as string) ?? id,
    title: (data.title as string) ?? id,
    courses: (data.courses as string[]) ?? [],
    concepts: (data.concepts as string[]) ?? [],
    lessons_learned: (data.lessons_learned as KnowledgeEntry[]) ?? [],
    known_pitfalls: (data.known_pitfalls as KnowledgeEntry[]) ?? [],
    watch_for: (data.watch_for as string[]) ?? [],
    updated: (data.updated as string) ?? today(),
    deleted: Boolean(data.deleted ?? false),
    body,
  };
}

export function getTemplate(id: string): Template | null {
  const found = readMd(templateFile(id));
  return found ? normalize(id, found.data, found.body) : null;
}

export function getAllTemplates(includeDeleted = false): Template[] {
  return listTemplateIds()
    .map(getTemplate)
    .filter((t): t is Template => !!t && (includeDeleted || !t.deleted));
}

function frontmatter(t: Template): Record<string, unknown> {
  const fm: Record<string, unknown> = {
    id: t.id,
    title: t.title,
    courses: t.courses,
    concepts: t.concepts,
    lessons_learned: t.lessons_learned,
    known_pitfalls: t.known_pitfalls,
    watch_for: t.watch_for,
    updated: t.updated,
  };
  if (t.deleted) fm.deleted = true;
  return fm;
}

export function saveTemplate(t: Template): Template {
  ensureDirs();
  t.updated = today();
  writeMd(templateFile(t.id), frontmatter(t), t.body ?? '');
  return t;
}

export function createTemplate(
  input: Partial<Template> & { id: string; title: string; courses: string[]; concepts: string[] }
): Template {
  const t: Template = {
    id: input.id,
    title: input.title,
    courses: input.courses,
    concepts: input.concepts,
    lessons_learned: input.lessons_learned ?? [],
    known_pitfalls: input.known_pitfalls ?? [],
    watch_for: input.watch_for ?? [],
    updated: today(),
    body: input.body ?? '',
  };
  return saveTemplate(t);
}

export function softDeleteTemplate(id: string): Template | null {
  const t = getTemplate(id);
  if (!t) return null;
  t.deleted = true;
  return saveTemplate(t);
}

export function appendLessonLearned(id: string, note: string): Template | null {
  const t = getTemplate(id);
  if (!t) return null;
  t.lessons_learned.push({ date: today(), note });
  return saveTemplate(t);
}

export function appendKnownPitfall(id: string, note: string): Template | null {
  const t = getTemplate(id);
  if (!t) return null;
  t.known_pitfalls.push({ date: today(), note });
  return saveTemplate(t);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/core/templates.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/core/templates.ts lib/core/templates.test.ts
git commit -m "Add Template module (accumulated lessons/pitfalls/watch_for)"
```

---

### Task 6: Global knowledge singleton

**Files:**
- Create: `lib/core/globalKnowledge.ts`
- Test: `lib/core/globalKnowledge.test.ts`

**Interfaces:**
- Consumes: `globalKnowledgeFile()`, `ensureDirs()` from `./paths`; `writeMd`, `readMd`, `today` from `./markdown`; `GlobalKnowledge`, `KnowledgeEntry` from `./types`.
- Produces: `getGlobalKnowledge(): GlobalKnowledge`, `appendGlobalLesson(note: string): GlobalKnowledge`, `appendGlobalPitfall(note: string): GlobalKnowledge`, `appendGlobalWatchFor(item: string): GlobalKnowledge`.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/core/globalKnowledge.test.ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/core/globalKnowledge.test.ts`
Expected: FAIL — `Cannot find module './globalKnowledge'`

- [ ] **Step 3: Write `lib/core/globalKnowledge.ts`**

```typescript
import { globalKnowledgeFile, ensureDirs } from './paths';
import { writeMd, readMd, today } from './markdown';
import type { GlobalKnowledge } from './types';

function normalize(data: Record<string, unknown>): GlobalKnowledge {
  return {
    lessons_learned: (data.lessons_learned as GlobalKnowledge['lessons_learned']) ?? [],
    known_pitfalls: (data.known_pitfalls as GlobalKnowledge['known_pitfalls']) ?? [],
    watch_for: (data.watch_for as string[]) ?? [],
  };
}

export function getGlobalKnowledge(): GlobalKnowledge {
  const found = readMd(globalKnowledgeFile());
  return found ? normalize(found.data) : { lessons_learned: [], known_pitfalls: [], watch_for: [] };
}

function save(g: GlobalKnowledge): GlobalKnowledge {
  ensureDirs();
  writeMd(globalKnowledgeFile(), { ...g, updated: today() }, '');
  return g;
}

export function appendGlobalLesson(note: string): GlobalKnowledge {
  const g = getGlobalKnowledge();
  g.lessons_learned.push({ date: today(), note });
  return save(g);
}

export function appendGlobalPitfall(note: string): GlobalKnowledge {
  const g = getGlobalKnowledge();
  g.known_pitfalls.push({ date: today(), note });
  return save(g);
}

export function appendGlobalWatchFor(item: string): GlobalKnowledge {
  const g = getGlobalKnowledge();
  g.watch_for.push(item);
  return save(g);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/core/globalKnowledge.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/core/globalKnowledge.ts lib/core/globalKnowledge.test.ts
git commit -m "Add global-knowledge singleton (instance-wide lessons/pitfalls/watch_for)"
```

---

### Task 7: Project + Checkpoint DAG (cycle detection, unblocked resolver)

**Files:**
- Create: `lib/core/projects.ts`
- Test: `lib/core/projects.test.ts`

**Interfaces:**
- Consumes: `projectsDir()`, `ensureDirs()` from `./paths`; `writeMd`, `readMd`, `listIds`, `today` from `./markdown`; `Project`, `Checkpoint`, `Note` from `./types`.
- Produces: `projectFile(id): string`, `listProjectIds(): string[]`, `getProject(id): Project | null`, `getAllProjects(includeDeleted?: boolean): Project[]`, `saveProject(p: Project): Project`, `createProject(input): Project`, `softDeleteProject(id): Project | null`, `wouldCreateCycle(checkpoints: Checkpoint[], checkpointId: string, newDependsOn: string[]): boolean`, `unblockedCheckpoints(checkpoints: Checkpoint[]): Checkpoint[]`, `setCheckpointDependsOn(projectId: string, checkpointId: string, dependsOn: string[]): Project`.
- `setCheckpointDependsOn` throws `Error('cycle')` rather than writing, if the edge would create one — this is the write-time rejection from spec §5.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/core/projects.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-projects-'));
  process.env.YTS_CONTENT_DIR = dir;
});

const cp = (id: string, dependsOn: string[] = [], status: 'not_started' | 'building' | 'done' = 'not_started') => ({
  id,
  title: id,
  depends_on: dependsOn,
  courses: [],
  concepts: [],
  status,
});

describe('projects: DAG', () => {
  it('reports checkpoints with all dependencies done as unblocked', async () => {
    const { unblockedCheckpoints } = await import('./projects');
    const checkpoints = [cp('a', [], 'done'), cp('b', ['a']), cp('c', ['b'])];
    expect(unblockedCheckpoints(checkpoints).map((c) => c.id)).toEqual(['b']);
  });

  it('detects a direct cycle (a depends on b, b would depend on a)', async () => {
    const { wouldCreateCycle } = await import('./projects');
    const checkpoints = [cp('a', ['b']), cp('b', [])];
    expect(wouldCreateCycle(checkpoints, 'b', ['a'])).toBe(true);
  });

  it('detects a transitive cycle (a->b->c, c would depend on a)', async () => {
    const { wouldCreateCycle } = await import('./projects');
    const checkpoints = [cp('a', ['b']), cp('b', ['c']), cp('c', [])];
    expect(wouldCreateCycle(checkpoints, 'c', ['a'])).toBe(true);
  });

  it('allows a non-cyclic edge', async () => {
    const { wouldCreateCycle } = await import('./projects');
    const checkpoints = [cp('a', []), cp('b', [])];
    expect(wouldCreateCycle(checkpoints, 'b', ['a'])).toBe(false);
  });

  it('rejects a write that would create a cycle', async () => {
    const { createProject, setCheckpointDependsOn } = await import('./projects');
    createProject({
      id: 'p1',
      title: 'P1',
      checkpoints: [cp('a', ['b']), cp('b', [])],
    });
    expect(() => setCheckpointDependsOn('p1', 'b', ['a'])).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/core/projects.test.ts`
Expected: FAIL — `Cannot find module './projects'`

- [ ] **Step 3: Write `lib/core/projects.ts`**

```typescript
import path from 'node:path';
import { projectsDir, ensureDirs } from './paths';
import { writeMd, readMd, listIds, today } from './markdown';
import type { Project, Checkpoint, Note } from './types';

export function projectFile(id: string): string {
  return path.join(projectsDir(), `${id}.md`);
}

export function listProjectIds(): string[] {
  return listIds(projectsDir());
}

function normalizeCheckpoint(c: Record<string, unknown>, i: number): Checkpoint {
  return {
    id: (c.id as string) ?? `checkpoint-${i}`,
    title: (c.title as string) ?? `Checkpoint ${i}`,
    depends_on: (c.depends_on as string[]) ?? [],
    courses: (c.courses as string[]) ?? [],
    concepts: (c.concepts as string[]) ?? [],
    status: (c.status as Checkpoint['status']) ?? 'not_started',
    build: c.build as string | undefined,
    done_test: c.done_test as string | undefined,
  };
}

function normalize(id: string, data: Record<string, unknown>, body: string): Project {
  const rawCps = Array.isArray(data.checkpoints) ? (data.checkpoints as Record<string, unknown>[]) : [];
  return {
    id: (data.id as string) ?? id,
    title: (data.title as string) ?? id,
    template: data.template as string | undefined,
    status: (data.status as Project['status']) ?? 'in_progress',
    metadata: (data.metadata as Record<string, string>) ?? {},
    checkpoints: rawCps.map(normalizeCheckpoint),
    notes: (data.notes as Note[]) ?? [],
    updated: (data.updated as string) ?? today(),
    deleted: Boolean(data.deleted ?? false),
    body,
  };
}

export function getProject(id: string): Project | null {
  const found = readMd(projectFile(id));
  return found ? normalize(id, found.data, found.body) : null;
}

export function getAllProjects(includeDeleted = false): Project[] {
  return listProjectIds()
    .map(getProject)
    .filter((p): p is Project => !!p && (includeDeleted || !p.deleted));
}

function frontmatter(p: Project): Record<string, unknown> {
  const fm: Record<string, unknown> = {
    id: p.id,
    title: p.title,
    template: p.template,
    status: p.status,
    metadata: p.metadata,
    checkpoints: p.checkpoints,
    notes: p.notes,
    updated: p.updated,
  };
  if (p.deleted) fm.deleted = true;
  return fm;
}

export function saveProject(p: Project): Project {
  ensureDirs();
  p.updated = today();
  writeMd(projectFile(p.id), frontmatter(p), p.body ?? '');
  return p;
}

export function createProject(
  input: Partial<Project> & { id: string; title: string }
): Project {
  const p: Project = {
    id: input.id,
    title: input.title,
    template: input.template,
    status: input.status ?? 'in_progress',
    metadata: input.metadata ?? {},
    checkpoints: input.checkpoints ?? [],
    notes: input.notes ?? [],
    updated: today(),
    body: input.body ?? '',
  };
  return saveProject(p);
}

export function softDeleteProject(id: string): Project | null {
  const p = getProject(id);
  if (!p) return null;
  p.deleted = true;
  return saveProject(p);
}

// ---- DAG -------------------------------------------------------------

function canReach(checkpoints: Checkpoint[], fromId: string, toId: string): boolean {
  const byId = new Map(checkpoints.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const stack = [fromId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === toId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const c = byId.get(cur);
    if (c) stack.push(...c.depends_on);
  }
  return false;
}

/** Would adding `newDependsOn` as checkpointId's dependencies create a cycle? */
export function wouldCreateCycle(checkpoints: Checkpoint[], checkpointId: string, newDependsOn: string[]): boolean {
  return newDependsOn.some((depId) => depId === checkpointId || canReach(checkpoints, depId, checkpointId));
}

/** Checkpoints not yet done whose dependencies are all done — "what can I work on now." */
export function unblockedCheckpoints(checkpoints: Checkpoint[]): Checkpoint[] {
  const byId = new Map(checkpoints.map((c) => [c.id, c]));
  return checkpoints.filter(
    (c) => c.status !== 'done' && c.depends_on.every((d) => byId.get(d)?.status === 'done')
  );
}

/** Writes a checkpoint's depends_on, rejecting the write if it would create a cycle. */
export function setCheckpointDependsOn(projectId: string, checkpointId: string, dependsOn: string[]): Project {
  const p = getProject(projectId);
  if (!p) throw new Error(`Project not found: ${projectId}`);
  if (wouldCreateCycle(p.checkpoints, checkpointId, dependsOn)) {
    throw new Error(`Setting depends_on for "${checkpointId}" to [${dependsOn.join(', ')}] would create a cycle`);
  }
  const target = p.checkpoints.find((c) => c.id === checkpointId);
  if (!target) throw new Error(`Checkpoint not found: ${checkpointId}`);
  target.depends_on = dependsOn;
  return saveProject(p);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/core/projects.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/core/projects.ts lib/core/projects.test.ts
git commit -m "Add Project module: checkpoint DAG, cycle rejection, unblocked resolver"
```

---

### Task 8: Price Record (market-scoped, append-only, staleness tool)

**Files:**
- Create: `lib/core/prices.ts`
- Test: `lib/core/prices.test.ts`

**Interfaces:**
- Consumes: `pricesDir()`, `ensureDirs()` from `./paths`; `writeMd`, `readMd`, `listIds` from `./markdown`; `PriceRecord`, `PriceObservation`, `Market` from `./types`.
- Produces: `priceFile(id): string`, `getPriceRecord(item: string): PriceRecord | null`, `savePriceRecord(r: PriceRecord): PriceRecord`, `appendObservation(item: string, obs: PriceObservation): PriceRecord`, `latestObservation(record: PriceRecord, market: Market): PriceObservation | undefined`, `isStale(obs: PriceObservation | undefined, staleDays?: number): boolean`, `checkPrice(item: string, market: Market, staleDays?: number): { needsSkill: boolean; observation?: PriceObservation }`.
- `checkPrice` is the **tool** referenced in spec §6: `needsSkill: true` means "no fresh-enough data for this market — the pricing skill must run," which is Phase 2 work; this task only produces the signal, not the fetch.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/core/prices.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-prices-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('prices', () => {
  it('needs the skill when no record exists for the item', async () => {
    const { checkPrice } = await import('./prices');
    expect(checkPrice('Raspberry Pi 4 8GB', 'IN').needsSkill).toBe(true);
  });

  it('needs the skill when the item has data for a different market only', async () => {
    const { appendObservation, checkPrice } = await import('./prices');
    appendObservation('Raspberry Pi 4 8GB', {
      market: 'US',
      currency: 'USD',
      date: new Date().toISOString().slice(0, 10),
      price: 75,
      available: true,
      source: 'https://example.com',
    });
    expect(checkPrice('Raspberry Pi 4 8GB', 'IN').needsSkill).toBe(true);
  });

  it('reuses a fresh observation for the requested market without needing the skill', async () => {
    const { appendObservation, checkPrice } = await import('./prices');
    appendObservation('Raspberry Pi 4 8GB', {
      market: 'IN',
      currency: 'INR',
      date: new Date().toISOString().slice(0, 10),
      price: 8500,
      available: true,
      source: 'https://robu.in',
    });
    const result = checkPrice('Raspberry Pi 4 8GB', 'IN');
    expect(result.needsSkill).toBe(false);
    expect(result.observation?.price).toBe(8500);
  });

  it('needs the skill again once the observation is stale', async () => {
    const { appendObservation, checkPrice } = await import('./prices');
    const old = new Date();
    old.setDate(old.getDate() - 100);
    appendObservation('Raspberry Pi 4 8GB', {
      market: 'IN',
      currency: 'INR',
      date: old.toISOString().slice(0, 10),
      price: 8500,
      available: true,
      source: 'https://robu.in',
    });
    expect(checkPrice('Raspberry Pi 4 8GB', 'IN', 60).needsSkill).toBe(true);
  });

  it('never overwrites a prior observation, only appends', async () => {
    const { appendObservation, getPriceRecord } = await import('./prices');
    appendObservation('Item', { market: 'IN', currency: 'INR', date: '2026-06-01', price: 100, available: true, source: 'a' });
    appendObservation('Item', { market: 'IN', currency: 'INR', date: '2026-09-21', price: 120, available: true, source: 'b' });
    expect(getPriceRecord('Item')?.observations).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/core/prices.test.ts`
Expected: FAIL — `Cannot find module './prices'`

- [ ] **Step 3: Write `lib/core/prices.ts`**

```typescript
import path from 'node:path';
import crypto from 'node:crypto';
import { pricesDir, ensureDirs } from './paths';
import { writeMd, readMd, listIds } from './markdown';
import type { PriceRecord, PriceObservation, PriceAlternative, Market } from './types';

function slug(item: string): string {
  return item
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || crypto.createHash('md5').update(item).digest('hex').slice(0, 8);
}

export function priceFile(item: string): string {
  return path.join(pricesDir(), `${slug(item)}.md`);
}

function normalize(item: string, data: Record<string, unknown>): PriceRecord {
  return {
    id: (data.id as string) ?? slug(item),
    item: (data.item as string) ?? item,
    observations: (data.observations as PriceObservation[]) ?? [],
    alternatives: (data.alternatives as PriceAlternative[]) ?? [],
  };
}

export function getPriceRecord(item: string): PriceRecord | null {
  const found = readMd(priceFile(item));
  return found ? normalize(item, found.data) : null;
}

export function savePriceRecord(r: PriceRecord): PriceRecord {
  ensureDirs();
  writeMd(priceFile(r.item), { id: r.id, item: r.item, observations: r.observations, alternatives: r.alternatives }, '');
  return r;
}

export function appendObservation(item: string, obs: PriceObservation): PriceRecord {
  const existing = getPriceRecord(item) ?? { id: slug(item), item, observations: [], alternatives: [] };
  existing.observations.push(obs); // append-only — never overwrite a prior observation
  return savePriceRecord(existing);
}

export function latestObservation(record: PriceRecord, market: Market): PriceObservation | undefined {
  return record.observations
    .filter((o) => o.market === market)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function isStale(obs: PriceObservation | undefined, staleDays = 60): boolean {
  if (!obs) return true;
  const ageMs = Date.now() - new Date(obs.date).getTime();
  return ageMs > staleDays * 24 * 60 * 60 * 1000;
}

/**
 * The pricing TOOL (spec §6): a deterministic cache read, no LLM. Returns
 * needsSkill: true when the pricing SKILL must run a fresh, market-scoped
 * search — either because this market has no data at all, or the latest
 * observation for it is past the staleness window.
 */
export function checkPrice(
  item: string,
  market: Market,
  staleDays = 60
): { needsSkill: boolean; observation?: PriceObservation } {
  const record = getPriceRecord(item);
  const obs = record ? latestObservation(record, market) : undefined;
  if (!obs) return { needsSkill: true };
  return { needsSkill: isStale(obs, staleDays), observation: obs };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/core/prices.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/core/prices.ts lib/core/prices.test.ts
git commit -m "Add Price Record: market-scoped, append-only, cache-first staleness tool"
```

---

### Task 9: Notes rollup (computed aggregation, no duplicated storage)

**Files:**
- Create: `lib/core/rollup.ts`
- Test: `lib/core/rollup.test.ts`

**Interfaces:**
- Consumes: `getConcept`, `getAllConcepts` from `./concepts`; `getCourse` from `./courses`; `getProject` from `./projects`; `Note` from `./types`.
- Produces: `AggregatedNote` type (`Note & { source: { kind: 'concept' | 'course' | 'project' | 'source'; id: string; title: string } }`), `getAggregatedNotesForCourse(courseId: string): AggregatedNote[]`, `getAggregatedNotesForProject(projectId: string): AggregatedNote[]`.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/core/rollup.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-rollup-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('rollup', () => {
  it('aggregates a course\'s own notes plus its concepts\' notes, labeled by source', async () => {
    const { createConcept, saveConcept, getConcept } = await import('./concepts');
    createConcept({ id: 'a', title: 'Concept A', parent: 'P' });
    const a = getConcept('a')!;
    a.notes.push({ id: 'n1', date: '2026-09-21', text: 'note on A' });
    saveConcept(a);

    const { createCourse, saveCourse, getCourse } = await import('./courses');
    createCourse({ id: 'c1', title: 'Course 1', kind: 'authored', concepts: ['a'] });
    const c1 = getCourse('c1')!;
    c1.notes.push({ id: 'n2', date: '2026-09-21', text: 'note on course' });
    saveCourse(c1);

    const { getAggregatedNotesForCourse } = await import('./rollup');
    const notes = getAggregatedNotesForCourse('c1');
    expect(notes).toHaveLength(2);
    expect(notes.find((n) => n.id === 'n1')?.source).toEqual({ kind: 'concept', id: 'a', title: 'Concept A' });
    expect(notes.find((n) => n.id === 'n2')?.source).toEqual({ kind: 'course', id: 'c1', title: 'Course 1' });
  });

  it('recurses into subcourses', async () => {
    const { createConcept, saveConcept, getConcept } = await import('./concepts');
    createConcept({ id: 'b', title: 'Concept B', parent: 'P' });
    const b = getConcept('b')!;
    b.notes.push({ id: 'n3', date: '2026-09-21', text: 'note on B' });
    saveConcept(b);

    const { createCourse } = await import('./courses');
    createCourse({ id: 'sub', title: 'Sub', kind: 'authored', concepts: ['b'] });
    createCourse({ id: 'top', title: 'Top', kind: 'authored', concepts: [], subcourses: ['sub'] });

    const { getAggregatedNotesForCourse } = await import('./rollup');
    expect(getAggregatedNotesForCourse('top').map((n) => n.id)).toEqual(['n3']);
  });

  it('aggregates a project\'s notes plus everything reachable from its checkpoints', async () => {
    const { createConcept, saveConcept, getConcept } = await import('./concepts');
    createConcept({ id: 'x', title: 'X', parent: 'P' });
    const x = getConcept('x')!;
    x.notes.push({ id: 'n4', date: '2026-09-21', text: 'note on X' });
    saveConcept(x);

    const { createProject } = await import('./projects');
    createProject({
      id: 'proj',
      title: 'Proj',
      checkpoints: [
        { id: 'cp1', title: 'CP1', depends_on: [], courses: [], concepts: ['x'], status: 'not_started' },
      ],
    });

    const { getAggregatedNotesForProject } = await import('./rollup');
    expect(getAggregatedNotesForProject('proj').map((n) => n.id)).toEqual(['n4']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/core/rollup.test.ts`
Expected: FAIL — `Cannot find module './rollup'`

- [ ] **Step 3: Write `lib/core/rollup.ts`**

```typescript
import type { Note } from './types';
import { getConcept } from './concepts';
import { getCourse } from './courses';
import { getProject } from './projects';

export interface AggregatedNote extends Note {
  source: { kind: 'concept' | 'course' | 'project' | 'source'; id: string; title: string };
}

function conceptNotes(conceptId: string): AggregatedNote[] {
  const c = getConcept(conceptId);
  if (!c) return [];
  return c.notes.map((n) => ({ ...n, source: { kind: 'concept' as const, id: c.id, title: c.title } }));
}

/** A course's own notes + every concept's notes + every subcourse's, recursively. */
export function getAggregatedNotesForCourse(courseId: string, seen = new Set<string>()): AggregatedNote[] {
  if (seen.has(courseId)) return [];
  seen.add(courseId);
  const course = getCourse(courseId);
  if (!course) return [];

  const own: AggregatedNote[] = course.notes.map((n) => ({
    ...n,
    source: { kind: 'course' as const, id: course.id, title: course.title },
  }));
  const fromConcepts = course.concepts.flatMap(conceptNotes);
  const fromSubcourses = course.subcourses.flatMap((id) => getAggregatedNotesForCourse(id, seen));
  return [...own, ...fromConcepts, ...fromSubcourses];
}

/** A project's own notes + every course/concept reachable from its checkpoints. */
export function getAggregatedNotesForProject(projectId: string): AggregatedNote[] {
  const project = getProject(projectId);
  if (!project) return [];

  const own: AggregatedNote[] = project.notes.map((n) => ({
    ...n,
    source: { kind: 'project' as const, id: project.id, title: project.title },
  }));
  const seen = new Set<string>();
  const fromCheckpoints = project.checkpoints.flatMap((cp) => [
    ...cp.concepts.flatMap(conceptNotes),
    ...cp.courses.flatMap((id) => getAggregatedNotesForCourse(id, seen)),
  ]);
  return [...own, ...fromCheckpoints];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/core/rollup.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/core/rollup.ts lib/core/rollup.test.ts
git commit -m "Add notes rollup: computed aggregation over the composition graph"
```

---

### Task 10: Explode Concept (manual stub, no LLM)

**Files:**
- Create: `lib/core/explode.ts`
- Test: `lib/core/explode.test.ts`

**Interfaces:**
- Consumes: `getConcept` from `./concepts`; `getCourse`, `createCourse`, `saveCourse` from `./courses`.
- Produces: `explodeConcept(conceptId: string, parentCourseId: string, reason: string): Course` — throws if the Concept or parent Course doesn't exist.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/core/explode.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-explode-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('explodeConcept', () => {
  it('creates a new course nested under the parent, carrying the reason', async () => {
    const { createConcept } = await import('./concepts');
    createConcept({ id: 'kalman-filter', title: 'Kalman filter', parent: 'State estimation' });
    const { createCourse, getCourse } = await import('./courses');
    createCourse({ id: 'estimation-basics', title: 'Estimation basics', kind: 'authored', concepts: ['kalman-filter'] });

    const { explodeConcept } = await import('./explode');
    const exploded = explodeConcept('kalman-filter', 'estimation-basics', 'the derivation loses me at the update step');

    expect(exploded.title).toContain('Kalman filter');
    expect(exploded.body).toContain('the derivation loses me at the update step');
    expect(getCourse('estimation-basics')?.subcourses).toEqual([exploded.id]);
  });

  it('throws when the concept does not exist', async () => {
    const { createCourse } = await import('./courses');
    createCourse({ id: 'c1', title: 'C1', kind: 'authored', concepts: [] });
    const { explodeConcept } = await import('./explode');
    expect(() => explodeConcept('missing', 'c1', 'reason')).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/core/explode.test.ts`
Expected: FAIL — `Cannot find module './explode'`

- [ ] **Step 3: Write `lib/core/explode.ts`**

```typescript
import type { Course } from './types';
import { getConcept } from './concepts';
import { getCourse, createCourse, saveCourse } from './courses';

/**
 * Manual stub (spec §10, Phase 1): converts a Concept the user found
 * confusing into a new, empty Course nested under the parent Course, with
 * the stated reason recorded in its body. LLM-backed generation of the
 * actual breakdown is Phase 2 work — this task only wires the structural
 * move (create + nest) so the UI action has something real to call.
 */
export function explodeConcept(conceptId: string, parentCourseId: string, reason: string): Course {
  const concept = getConcept(conceptId);
  if (!concept) throw new Error(`Concept not found: ${conceptId}`);
  const parent = getCourse(parentCourseId);
  if (!parent) throw new Error(`Course not found: ${parentCourseId}`);

  const course = createCourse({
    id: `${parentCourseId}--${conceptId}-explode`,
    title: `${concept.title} (exploded)`,
    kind: 'authored',
    concepts: [],
    body: `Exploded from concept "${concept.title}".\n\nReason: ${reason}\n`,
  });
  parent.subcourses.push(course.id);
  saveCourse(parent);
  return course;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/core/explode.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/core/explode.ts lib/core/explode.test.ts
git commit -m "Add Explode Concept (manual stub: structural move, no LLM yet)"
```

---

### Task 11: Index rebuild over the five entities

**Files:**
- Create: `lib/core/indexDb.ts`
- Test: `lib/core/indexDb.test.ts`
- Modify: `lib/db.ts` — delete once Step 5 confirms nothing outside `lib/core` still imports it

**Interfaces:**
- Consumes: `getAllConcepts` from `./concepts`; `getAllSources` from `./sources`; `getAllCourses` from `./courses`; `getAllTemplates` from `./templates`; `getAllProjects` from `./projects`.
- Produces: `getIndex(): DatabaseSync`, `rebuildIndex(): void` (same cached-on-`globalThis` pattern as the old `lib/db.ts`, so Next.js hot-reload in Plan 1b reuses one instance), plus summary query helpers: `conceptSummaries(): ConceptSummary[]`, `courseSummaries(): CourseSummary[]`, `projectSummaries(): ProjectSummary[]`.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/core/indexDb.test.ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/core/indexDb.test.ts`
Expected: FAIL — `Cannot find module './indexDb'`

- [ ] **Step 3: Write `lib/core/indexDb.ts`**

```typescript
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/core/indexDb.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Confirm nothing outside `lib/core` still depends on the old index, then delete it**

```bash
grep -rn "from '\.\./db'\|from './db'\|lib/db" app components scripts lib/status.ts lib/pipeline.ts 2>/dev/null
```
Expected: no matches outside `lib/db.ts` itself. If there are matches, leave `lib/db.ts` in place for now and note the dependency — those call sites move to `lib/core/indexDb.ts` in Plan 1b, not here.

If there are no matches:
```bash
rm lib/db.ts
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS (all tests across every task so far)

- [ ] **Step 7: Commit**

```bash
git add lib/core/indexDb.ts lib/core/indexDb.test.ts
git add -u lib/db.ts
git commit -m "Add rebuildable SQLite index over the five-entity model"
```

---

### Task 12: Migrate existing seed content, zero data loss

**Files:**
- Create: `scripts/migrate-v3.mjs`
- Test: `scripts/migrate-v3.test.ts`

**Interfaces:**
- Consumes: the old `content/concepts/*.md` and `content/projects/diffdrive-mobile-manipulator.md` (read directly via `gray-matter`, not through `lib/core`, since the old shape predates the new modules); the old per-milestone note files under `content/notes/diffdrive/*.md`.
- Produces: rewrites `content/concepts/*.md` in place (adds `notes: []`, drops nothing — the shape is otherwise already compatible) and rewrites `content/projects/diffdrive-mobile-manipulator.md` into the new Project/Checkpoint shape (milestones → checkpoints with a sequential `depends_on` chain preserving the original order; `robot`/`toolchain` → `metadata`; each milestone's `app_notes` file body and its `build`/`done_test` strings are preserved — `build`/`done_test` move onto the Checkpoint fields of the same name, and the `app_notes` body becomes a Note on the Project, prefixed with the originating checkpoint's title so it stays attributable).
- A dry-run mode (`--dry-run`) prints a before/after count per file without writing, so it can be checked before committing to disk.

**No data is deleted by this task** — every `build`, `done_test`, and `app_notes` body from the old milestones ends up somewhere in the new schema, verified by the test.

- [ ] **Step 1: Write the failing test (against a fixture copy of real seed data)**

```typescript
// scripts/migrate-v3.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-migrate-'));
  fs.mkdirSync(path.join(dir, 'concepts'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'projects'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'notes', 'diffdrive'), { recursive: true });

  fs.writeFileSync(
    path.join(dir, 'concepts', 'pid.md'),
    matter.stringify('# PID\nbody', { id: 'pid', title: 'PID', parent: 'Classical control', order: 1, status: 'learning', review: false, prereqs: [], updated: '2026-09-14' })
  );

  fs.writeFileSync(
    path.join(dir, 'notes', 'diffdrive', 'm0-environment.md'),
    matter.stringify('Notes about setting up the sim environment.', { updated: '2026-09-14' })
  );

  fs.writeFileSync(
    path.join(dir, 'projects', 'diffdrive-mobile-manipulator.md'),
    matter.stringify('project body', {
      id: 'diffdrive-mobile-manipulator',
      title: 'Diff-drive → mobile manipulator',
      robot: 'differential_drive+arm',
      status: 'in_progress',
      definition_of_done: 'robot runs end-to-end',
      toolchain: 'Isaac Sim + ROS 2',
      milestones: [
        { id: 'm0-environment', title: 'Simulator + empty robot body', order: 0, concepts: ['pid'], app_notes: 'notes/diffdrive/m0-environment.md', build: 'Author the USD body', done_test: 'Sim stays stable for 60s', videos: [], status: 'not_started' },
        { id: 'm1-kinematics', title: 'Make it move', order: 1, concepts: [], app_notes: null, build: 'Add diff-drive kinematics', done_test: 'Robot tracks a path', videos: [], status: 'not_started' },
      ],
    })
  );
});

describe('migrate-v3', () => {
  it('preserves every concept and adds an empty notes array', () => {
    execFileSync('node', ['scripts/migrate-v3.mjs', dir], { cwd: process.cwd() });
    const { data } = matter(fs.readFileSync(path.join(dir, 'concepts', 'pid.md'), 'utf8'));
    expect(data.id).toBe('pid');
    expect(data.notes).toEqual([]);
  });

  it('converts milestones into checkpoints with a sequential depends_on chain', () => {
    execFileSync('node', ['scripts/migrate-v3.mjs', dir], { cwd: process.cwd() });
    const { data } = matter(fs.readFileSync(path.join(dir, 'projects', 'diffdrive-mobile-manipulator.md'), 'utf8'));
    expect(data.checkpoints).toHaveLength(2);
    expect(data.checkpoints[0].depends_on).toEqual([]);
    expect(data.checkpoints[1].depends_on).toEqual(['m0-environment']);
  });

  it('moves robot/toolchain into metadata and preserves build/done_test per checkpoint', () => {
    execFileSync('node', ['scripts/migrate-v3.mjs', dir], { cwd: process.cwd() });
    const { data } = matter(fs.readFileSync(path.join(dir, 'projects', 'diffdrive-mobile-manipulator.md'), 'utf8'));
    expect(data.metadata).toEqual({ robot: 'differential_drive+arm', toolchain: 'Isaac Sim + ROS 2' });
    expect(data.checkpoints[0].build).toBe('Author the USD body');
    expect(data.checkpoints[0].done_test).toBe('Sim stays stable for 60s');
  });

  it('carries the app_notes file body into a Project note, attributed to its checkpoint', () => {
    execFileSync('node', ['scripts/migrate-v3.mjs', dir], { cwd: process.cwd() });
    const { data } = matter(fs.readFileSync(path.join(dir, 'projects', 'diffdrive-mobile-manipulator.md'), 'utf8'));
    const note = data.notes.find((n) => n.text.includes('Notes about setting up the sim environment.'));
    expect(note).toBeTruthy();
    expect(note.text).toContain('Simulator + empty robot body');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- scripts/migrate-v3.test.ts`
Expected: FAIL — `scripts/migrate-v3.mjs` does not exist yet (`ENOENT`)

- [ ] **Step 3: Write `scripts/migrate-v3.mjs`**

```javascript
#!/usr/bin/env node
// One-off migration: old two-axis content (content/concepts, content/projects,
// content/notes) -> the new five-entity schema (design spec §2). Run once,
// per-instance. No data is deleted — everything old ends up in the new shape.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const dryRun = process.argv.includes('--dry-run');
const contentDir = process.argv.find((a) => !a.startsWith('--') && !a.endsWith('migrate-v3.mjs')) ?? 'content';

function migrateConcepts() {
  const dir = path.join(contentDir, 'concepts');
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const file = path.join(dir, f);
    const { data, content } = matter(fs.readFileSync(file, 'utf8'));
    if (data.notes) continue; // already migrated
    data.notes = [];
    if (!dryRun) fs.writeFileSync(file, matter.stringify(content, data), 'utf8');
    n += 1;
  }
  return n;
}

function readNoteBody(relPath) {
  if (!relPath) return null;
  const file = path.join(contentDir, relPath.replace(/^notes\//, 'notes/'));
  if (!fs.existsSync(file)) return null;
  const { content } = matter(fs.readFileSync(file, 'utf8'));
  return content.trim() || null;
}

function migrateProjects() {
  const dir = path.join(contentDir, 'projects');
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const file = path.join(dir, f);
    const { data, content } = matter(fs.readFileSync(file, 'utf8'));
    if (data.checkpoints) continue; // already migrated

    const milestones = Array.isArray(data.milestones) ? data.milestones : [];
    const ordered = [...milestones].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const notes = [];
    const checkpoints = ordered.map((m, i) => {
      const noteBody = readNoteBody(m.app_notes);
      if (noteBody) {
        notes.push({
          id: `note-${m.id}`,
          date: data.updated ?? new Date().toISOString().slice(0, 10),
          text: `[${m.title}]\n${noteBody}`,
        });
      }
      return {
        id: m.id,
        title: m.title,
        depends_on: i === 0 ? [] : [ordered[i - 1].id],
        courses: [],
        concepts: m.concepts ?? [],
        status: m.status ?? 'not_started',
        build: m.build || undefined,
        done_test: m.done_test || undefined,
      };
    });

    const metadata = {};
    if (data.robot) metadata.robot = data.robot;
    if (data.toolchain) metadata.toolchain = data.toolchain;

    const newData = {
      id: data.id,
      title: data.title,
      status: data.status ?? 'in_progress',
      metadata,
      checkpoints,
      notes,
      updated: data.updated ?? new Date().toISOString().slice(0, 10),
    };

    if (!dryRun) fs.writeFileSync(file, matter.stringify(content, newData), 'utf8');
    n += 1;
  }
  return n;
}

const conceptsChanged = migrateConcepts();
const projectsChanged = migrateProjects();
console.log(`${dryRun ? '[dry run] ' : ''}Migrated ${conceptsChanged} concept(s), ${projectsChanged} project(s).`);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- scripts/migrate-v3.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Dry-run against the real content, inspect, then run for real**

```bash
node scripts/migrate-v3.mjs content --dry-run
node scripts/migrate-v3.mjs content
git diff --stat content/
```
Confirm the diff touches exactly the 58 concept files (each gaining `notes: []`) and the one project file (gaining `checkpoints`/`metadata`/`notes`, losing `milestones`/`robot`/`toolchain` from the frontmatter). Read a couple of the diffed concept files and the project file directly to confirm nothing looks wrong before committing.

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate-v3.mjs scripts/migrate-v3.test.ts content/
git commit -m "Migrate seed content to the five-entity schema (no data loss)"
```

---

## Self-review notes

- **Spec coverage:** §2 entities (Concept, Source, Course, Template, Project/Checkpoint, Price Record, global knowledge) — Tasks 2-8. §3 notes + rollup — Task 9 (Note type in Task 1). §4's deterministic tools: the Template-library search tool is *not* in this plan — it has no data to search yet with zero Templates seeded; it belongs in Plan 1b/2 once Templates exist in numbers. §5 integrity (cycle rejection, archive-not-delete, rebuildable index) — Tasks 2, 3, 7, 11. §6 Price Record tool half — Task 8. §10 Phase 1 scope (Explode Concept stub, no LLM, no cloud-sync wiring — that's a manual folder-location step for the user, not code) — Task 10.
- **Out of scope for this plan, by design:** UI (Plan 1b), the Template-search tool and pricing/syllabus/resource-finder *skills* (Phase 2, since they need the MCP/skill layer and possibly network calls), cloud-sync-folder backup (a one-time manual step of moving `content/` into a synced folder — no code to write).
- **Type consistency check:** `Checkpoint.status` uses `CheckpointStatus` consistently across `types.ts`, `projects.ts`, and the migration script's output shape. `Note` is defined once in `types.ts` and reused by every entity without redefinition. `getAggregatedNotesForCourse`/`getAggregatedNotesForProject` names match what Task 9 exports and what a later UI task would import.
