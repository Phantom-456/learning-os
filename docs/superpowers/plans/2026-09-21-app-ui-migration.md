# App UI Migration (Phase 1b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's entire old data layer and UI (`lib/{types,content,db,paths,status,pipeline}.ts`, old API routes, old components) with new ones built on Phase 1a's `lib/core/` five-entity model — nothing old is kept or adapted, everything is rebuilt fresh against the new schema. Also fixes a currently-live bug: the project page renders an empty roadmap today because the old layer reads a `milestones` key the Phase 1a migration removed.

**Architecture:** Next.js Server Components read `lib/core/*` directly (no client-side imports of anything touching `node:fs`/`node:sqlite` — those stay server-only, same discipline as the old app). Client components (`'use client'`) only ever talk to the new data through `fetch()` calls to new API routes at the same URL shapes the old app used (`/api/concepts`, `/api/projects`, etc.), so the client bundle never pulls in a `lib/core` module that imports `node:*`. Card-list and dark-theme CSS (`app/globals.css`) is reused as-is — it already matches the HTB Academy direction from the design spec (dark navy panels, bordered cards, serif headers). One new CSS block is added for the Explode Concept modal specifically, in the learn2hack.today neon-magenta/cyan style, since that's the one AI-generation-facing surface in this plan.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Vitest (already configured by Phase 1a).

**Spec:** [docs/superpowers/specs/2026-09-21-learning-os-platform-design.md](../specs/2026-09-21-learning-os-platform-design.md) — implements the UI half of §10 Phase 1 (Explode Concept action, §8's card-list/AI-surface theme split) against the entities built in Phase 1a's plan ([docs/superpowers/plans/2026-09-21-core-data-model.md](2026-09-21-core-data-model.md)).

## Global Constraints

- No client component (`'use client'`) may import a `lib/core/*` module that touches `node:fs`/`node:sqlite`/`node:path` — those are server-only. Client components call `fetch()` against API routes instead. Where a client component needs pure logic (e.g. "is this checkpoint unblocked"), that logic is reimplemented inline in the component, not imported from `lib/core/projects.ts`.
- The old layer is discarded outright, not preserved or adapted: `lib/types.ts`, `lib/content.ts`, `lib/db.ts`, `lib/paths.ts`, `lib/status.ts`, `lib/pipeline.ts`, `lib/content.test.ts`, the old `app/api/concepts/*`, `app/api/projects/*`, `app/api/pipeline/*` routes, `scripts/seed.mjs`, and the old `components/{ConceptView,ConceptDetail,ProjectList,RoadmapView}.tsx` are all deleted, not kept as dead code.
- New API routes live at the same URL paths the old ones used (`/api/concepts`, `/api/concepts/[id]`, `/api/concepts/[id]/status`, `/api/projects`, `/api/projects/[id]`) so the routing shape stays familiar; new routes are added at `/api/concepts/[id]/explode`, `/api/sources`, `/api/sources/[id]`.
- `saveProject` (Phase 1a) already validates the full checkpoint set for cycles on every write — the project PATCH route relies on this and does not duplicate cycle validation itself; a cycle-introducing PATCH gets a 400 from the thrown error, not a silent write.
- Concept/Source archive is soft (never hard-deleted, per Phase 1a); "delete" buttons in the UI call the archive endpoints, not a hard-delete.

---

### Task 1: Concept status helpers for the new schema

**Files:**
- Create: `lib/core/status.ts`
- Test: `lib/core/status.test.ts`

**Interfaces:**
- Consumes: `Status`, `Concept` from `./types`.
- Produces: `STATUS_ORDER: Status[]`, `nextStatus(s: Status): Status`, `applyStatus(c: Concept, status: Status): Concept`, `setReview(c: Concept, review: boolean): Concept`, `STATUS_LABEL: Record<Status, string>`, `STATUS_COLOR: Record<Status, string>`.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/core/status.test.ts
import { describe, it, expect } from 'vitest';
import { nextStatus, applyStatus, setReview } from './status';
import type { Concept } from './types';

const baseConcept: Concept = {
  id: 'a', title: 'A', parent: 'P', order: 0, status: 'not_started',
  review: false, prereqs: [], notes: [], updated: '2026-01-01', body: '',
};

describe('status', () => {
  it('advances through the lifecycle and clamps at complete', () => {
    expect(nextStatus('not_started')).toBe('learning');
    expect(nextStatus('learning')).toBe('complete');
    expect(nextStatus('complete')).toBe('complete');
  });

  it('clears a stale review flag when moving off complete', () => {
    const reviewing: Concept = { ...baseConcept, status: 'complete', review: true };
    const reopened = applyStatus(reviewing, 'learning');
    expect(reopened.review).toBe(false);
  });

  it('preserves review when moving to complete', () => {
    const c = applyStatus({ ...baseConcept, review: true }, 'complete');
    expect(c.review).toBe(true);
  });

  it('setReview toggles independently of lifecycle', () => {
    expect(setReview(baseConcept, true).status).toBe('not_started');
    expect(setReview(baseConcept, true).review).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/core/status.test.ts`
Expected: FAIL — `Cannot find module './status'`

- [ ] **Step 3: Write `lib/core/status.ts`**

```typescript
import type { Status, Concept } from './types';

export const STATUS_ORDER: Status[] = ['not_started', 'learning', 'complete'];

export function nextStatus(s: Status): Status {
  const i = STATUS_ORDER.indexOf(s);
  return STATUS_ORDER[Math.min(i + 1, STATUS_ORDER.length - 1)];
}

/**
 * Moving OFF complete implies re-opening the topic, so a stale review flag
 * is cleared. Moving TO complete preserves review (you may have finished it
 * but still want a pass).
 */
export function applyStatus(c: Concept, status: Status): Concept {
  const review = status === 'complete' ? c.review : false;
  return { ...c, status, review };
}

export function setReview(c: Concept, review: boolean): Concept {
  return { ...c, review };
}

export const STATUS_LABEL: Record<Status, string> = {
  not_started: 'Not started',
  learning: 'Learning',
  complete: 'Complete',
};

export const STATUS_COLOR: Record<Status, string> = {
  not_started: '#8b8b9e',
  learning: '#e0b341',
  complete: '#43c59e',
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/core/status.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/core/status.ts lib/core/status.test.ts
git commit -m "Add Concept status helpers for the new schema"
```

---

### Task 2: Concept API routes (list/create, get/patch/archive, status)

**Files:**
- Create: `app/api/concepts/route.ts`
- Create: `app/api/concepts/[id]/route.ts`
- Create: `app/api/concepts/[id]/status/route.ts`

(These paths already exist as old-layer routes — this task overwrites them with new-layer implementations; no separate deletion step needed for these three files.)

**Interfaces:**
- Consumes: `getAllConcepts`, `getConcept`, `createConcept`, `saveConcept`, `archiveConcept` from `@/lib/core/concepts`; `rebuildIndex`, `conceptSummaries` from `@/lib/core/indexDb`; `nextStatus`, `applyStatus`, `setReview` from `@/lib/core/status`; `Concept` from `@/lib/core/types`.
- Produces: HTTP routes at `GET/POST /api/concepts`, `GET/PATCH/DELETE /api/concepts/[id]`, `POST /api/concepts/[id]/status`.

- [ ] **Step 1: Write `app/api/concepts/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { conceptSummaries, rebuildIndex } from '@/lib/core/indexDb';
import { createConcept, getConcept } from '@/lib/core/concepts';

export const dynamic = 'force-dynamic';

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET() {
  const summaries = conceptSummaries();
  const groups: { parent: string; concepts: typeof summaries; complete: number; total: number }[] = [];
  for (const c of summaries) {
    let g = groups.find((x) => x.parent === c.parent);
    if (!g) { g = { parent: c.parent, concepts: [], complete: 0, total: 0 }; groups.push(g); }
    g.concepts.push(c);
    g.total += 1;
    if (c.status === 'complete') g.complete += 1;
  }
  return NextResponse.json({ groups });
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b.title || !b.parent) {
    return NextResponse.json({ error: 'title and parent are required' }, { status: 400 });
  }
  const id: string = b.id ? slug(b.id) : slug(b.title);
  if (!id) return NextResponse.json({ error: 'could not derive id' }, { status: 400 });
  if (getConcept(id)) return NextResponse.json({ error: `concept "${id}" already exists` }, { status: 409 });
  const c = createConcept({ id, title: b.title, parent: b.parent, order: b.order });
  rebuildIndex();
  return NextResponse.json({ concept: c });
}
```

- [ ] **Step 2: Write `app/api/concepts/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getConcept, saveConcept, archiveConcept } from '@/lib/core/concepts';
import { rebuildIndex } from '@/lib/core/indexDb';
import type { Concept } from '@/lib/core/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const c = getConcept(id);
  if (!c) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ concept: c });
}

const EDITABLE: (keyof Concept)[] = ['title', 'parent', 'order', 'body', 'prereqs', 'notes', 'archived'];

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const c = getConcept(id);
  if (!c) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const patch = await req.json();
  for (const k of EDITABLE) {
    if (k in patch) (c as unknown as Record<string, unknown>)[k] = patch[k];
  }
  saveConcept(c);
  rebuildIndex();
  return NextResponse.json({ concept: c });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const c = archiveConcept(id);
  if (!c) return NextResponse.json({ error: 'not found' }, { status: 404 });
  rebuildIndex();
  return NextResponse.json({ concept: c });
}
```

- [ ] **Step 3: Write `app/api/concepts/[id]/status/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getConcept, saveConcept } from '@/lib/core/concepts';
import { rebuildIndex } from '@/lib/core/indexDb';
import { applyStatus, setReview, nextStatus } from '@/lib/core/status';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// POST { action: 'advance' } | { action: 'set', status } | { action: 'review', review }
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  let c = getConcept(id);
  if (!c) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const b = await req.json();

  if (b.action === 'advance') {
    c = applyStatus(c, nextStatus(c.status));
  } else if (b.action === 'set' && b.status) {
    c = applyStatus(c, b.status);
  } else if (b.action === 'review') {
    c = setReview(c, Boolean(b.review));
  } else {
    return NextResponse.json({ error: 'bad action' }, { status: 400 });
  }

  saveConcept(c);
  rebuildIndex();
  return NextResponse.json({ concept: c });
}
```

- [ ] **Step 4: Verify the routes compile**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by these three files.

- [ ] **Step 5: Commit**

```bash
git add app/api/concepts
git commit -m "Rebuild Concept API routes on the new lib/core schema"
```

---

### Task 3: Explode Concept API route

**Files:**
- Create: `app/api/concepts/[id]/explode/route.ts`

**Interfaces:**
- Consumes: `getCourse`, `createCourse` from `@/lib/core/courses`; `explodeConcept` from `@/lib/core/explode`; `rebuildIndex` from `@/lib/core/indexDb`.
- Produces: `POST /api/concepts/[id]/explode`.

- [ ] **Step 1: Write `app/api/concepts/[id]/explode/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getCourse, createCourse } from '@/lib/core/courses';
import { explodeConcept } from '@/lib/core/explode';
import { rebuildIndex } from '@/lib/core/indexDb';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// POST { reason: string, parentCourseId?: string, newParentCourseTitle?: string }
// Exactly one of parentCourseId (use an existing course) or newParentCourseTitle
// (create one, seeded with this concept as a member) must be given.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const b = await req.json();
  if (!b.reason) return NextResponse.json({ error: 'reason is required' }, { status: 400 });

  let parentCourseId: string | undefined = b.parentCourseId;
  if (!parentCourseId) {
    if (!b.newParentCourseTitle) {
      return NextResponse.json({ error: 'parentCourseId or newParentCourseTitle is required' }, { status: 400 });
    }
    const newId = slug(b.newParentCourseTitle);
    if (getCourse(newId)) {
      return NextResponse.json({ error: `course "${newId}" already exists` }, { status: 409 });
    }
    createCourse({ id: newId, title: b.newParentCourseTitle, kind: 'authored', concepts: [id] });
    parentCourseId = newId;
  }

  try {
    const course = explodeConcept(id, parentCourseId, b.reason);
    rebuildIndex();
    return NextResponse.json({ course });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
```

- [ ] **Step 2: Verify the route compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/concepts/\[id\]/explode
git commit -m "Add Explode Concept API route (create-or-reuse parent course)"
```

---

### Task 4: Source API routes

**Files:**
- Create: `app/api/sources/route.ts`
- Create: `app/api/sources/[id]/route.ts`

**Interfaces:**
- Consumes: `getAllSources`, `getSource`, `createSource`, `saveSource`, `sourcesForConcept` from `@/lib/core/sources`; `rebuildIndex` from `@/lib/core/indexDb`; `Source` from `@/lib/core/types`.
- Produces: `GET /api/sources?concept=<id>` (list, optionally filtered), `POST /api/sources` (create), `PATCH /api/sources/[id]` (edit, e.g. to unlink a concept), `DELETE /api/sources/[id]` (archive).

- [ ] **Step 1: Write `app/api/sources/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getAllSources, createSource, sourcesForConcept } from '@/lib/core/sources';
import { rebuildIndex } from '@/lib/core/indexDb';

export const dynamic = 'force-dynamic';

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET(req: Request) {
  const conceptId = new URL(req.url).searchParams.get('concept');
  const sources = conceptId ? sourcesForConcept(conceptId) : getAllSources();
  return NextResponse.json({ sources });
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b.title || !b.url) return NextResponse.json({ error: 'title and url are required' }, { status: 400 });
  const id = b.id ? slug(b.id) : slug(`${b.title}-${Date.now()}`);
  const s = createSource({
    id,
    type: b.type ?? 'link',
    title: b.title,
    url: b.url,
    concepts: Array.isArray(b.concepts) ? b.concepts : [],
  });
  rebuildIndex();
  return NextResponse.json({ source: s });
}
```

- [ ] **Step 2: Write `app/api/sources/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getSource, saveSource, archiveSource } from '@/lib/core/sources';
import { rebuildIndex } from '@/lib/core/indexDb';
import type { Source } from '@/lib/core/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const EDITABLE: (keyof Source)[] = ['title', 'url', 'type', 'concepts', 'notes'];

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const s = getSource(id);
  if (!s) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const patch = await req.json();
  for (const k of EDITABLE) {
    if (k in patch) (s as unknown as Record<string, unknown>)[k] = patch[k];
  }
  saveSource(s);
  rebuildIndex();
  return NextResponse.json({ source: s });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const s = archiveSource(id);
  if (!s) return NextResponse.json({ error: 'not found' }, { status: 404 });
  rebuildIndex();
  return NextResponse.json({ source: s });
}
```

- [ ] **Step 3: Verify the routes compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/sources
git commit -m "Add Source API routes (list/create, patch-to-unlink, archive)"
```

---

### Task 5: Project API routes + reindex

**Files:**
- Create: `app/api/projects/route.ts`
- Create: `app/api/projects/[id]/route.ts`
- Modify: `app/api/reindex/route.ts`

**Interfaces:**
- Consumes: `getAllProjects`, `getProject`, `createProject`, `saveProject`, `softDeleteProject` from `@/lib/core/projects`; `projectSummaries`, `rebuildIndex` from `@/lib/core/indexDb`; `Project` from `@/lib/core/types`.
- Produces: `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/[id]`, `POST /api/reindex`.
- A PATCH that introduces a checkpoint dependency cycle gets a 400 with the thrown error's message — `saveProject`'s existing cycle validation (Phase 1a, Task 7) is the only guard; this route does not re-implement it.

- [ ] **Step 1: Write `app/api/projects/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { projectSummaries, rebuildIndex } from '@/lib/core/indexDb';
import { createProject, getProject } from '@/lib/core/projects';

export const dynamic = 'force-dynamic';

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET() {
  return NextResponse.json({ projects: projectSummaries() });
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b.title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  const id: string = b.id ? slug(b.id) : slug(b.title);
  if (!id) return NextResponse.json({ error: 'could not derive id' }, { status: 400 });
  if (getProject(id)) return NextResponse.json({ error: `project "${id}" already exists` }, { status: 409 });
  const p = createProject({ id, title: b.title, metadata: b.metadata ?? {} });
  rebuildIndex();
  return NextResponse.json({ project: p });
}
```

- [ ] **Step 2: Write `app/api/projects/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { getProject, saveProject, softDeleteProject } from '@/lib/core/projects';
import { rebuildIndex } from '@/lib/core/indexDb';
import type { Project } from '@/lib/core/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const p = getProject(id);
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ project: p });
}

const EDITABLE: (keyof Project)[] = ['title', 'status', 'metadata', 'body', 'checkpoints', 'notes', 'deleted'];

// PATCH accepts any editable field, including the full `checkpoints` array —
// saveProject validates the whole array for dependency cycles before writing.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const p = getProject(id);
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const patch = await req.json();
  for (const k of EDITABLE) {
    if (k in patch) (p as unknown as Record<string, unknown>)[k] = patch[k];
  }
  try {
    saveProject(p);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  rebuildIndex();
  return NextResponse.json({ project: p });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const p = softDeleteProject(id);
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 });
  rebuildIndex();
  return NextResponse.json({ project: p });
}
```

- [ ] **Step 3: Rewrite `app/api/reindex/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { rebuildIndex } from '@/lib/core/indexDb';

export const dynamic = 'force-dynamic';

export async function POST() {
  rebuildIndex();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verify the routes compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/projects app/api/reindex
git commit -m "Rebuild Project API routes on the new lib/core schema"
```

---

### Task 6: Concept list view + page

**Files:**
- Create: `components/ConceptView.tsx`
- Modify: `app/concepts/page.tsx`

**Interfaces:**
- Consumes (server, in the page): nothing from `lib/core` directly beyond what the API route already exposes — the page calls the same-shaped data the old page did, but the grouping now happens inside `GET /api/concepts` (Task 2), so the page can call that route's logic directly via a server-side import, OR (simpler, chosen here) the page imports `conceptSummaries` from `@/lib/core/indexDb` directly and groups client-side-free in the server component, matching the old page's pattern of calling the index directly rather than fetching its own API route.
- Produces: `ConceptView` component (client), rendered by `app/concepts/page.tsx` (server).

- [ ] **Step 1: Write `components/ConceptView.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/core/status';

export interface ConceptSummary {
  id: string; title: string; parent: string; order: number; status: 'not_started' | 'learning' | 'complete'; review: boolean;
}
export interface ParentGroup {
  parent: string; concepts: ConceptSummary[]; complete: number; total: number;
}

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

export default function ConceptView({ groups }: { groups: ParentGroup[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try { await fn(); router.refresh(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(null); }
  }

  function cycleStatus(c: ConceptSummary) {
    run(`s-${c.id}`, () => api(`/api/concepts/${c.id}/status`, 'POST', { action: 'advance' }));
  }
  function toggleReview(c: ConceptSummary) {
    run(`r-${c.id}`, () => api(`/api/concepts/${c.id}/status`, 'POST', { action: 'review', review: !c.review }));
  }
  function del(c: ConceptSummary) {
    if (!confirm(`Archive "${c.title}"? It is recoverable (never hard-deleted).`)) return;
    run(`d-${c.id}`, () => api(`/api/concepts/${c.id}`, 'DELETE'));
  }
  async function move(list: ConceptSummary[], idx: number, dir: number) {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[idx], b = list[j];
    run(`m-${a.id}`, async () => {
      await api(`/api/concepts/${a.id}`, 'PATCH', { order: b.order });
      await api(`/api/concepts/${b.id}`, 'PATCH', { order: a.order });
    });
  }
  function addConcept(parent: string) {
    const title = prompt(`New concept under "${parent}":`);
    if (!title) return;
    run('add', () => api('/api/concepts', 'POST', { title, parent }));
  }
  function addArea() {
    const parent = prompt('New area (parent header) name:');
    if (!parent) return;
    const title = prompt(`First concept in "${parent}":`);
    if (!title) return;
    run('area', () => api('/api/concepts', 'POST', { title, parent }));
  }

  return (
    <>
      <div className="toolbar">
        <button className="btn" onClick={addArea} disabled={busy === 'area'}>＋ Add area</button>
        <span className="spacer" />
        <span className="muted">{groups.reduce((n, g) => n + g.complete, 0)} / {groups.reduce((n, g) => n + g.total, 0)} complete</span>
      </div>

      {groups.map((g) => (
        <section key={g.parent}>
          <div className="section-title">
            {g.parent}
            <span className="meter">{g.complete}/{g.total}</span>
            <span className="spacer" style={{ flex: 1 }} />
            <button className="btn ghost sm" onClick={() => addConcept(g.parent)}>＋ concept</button>
          </div>
          <div className="cardlist">
            {g.concepts.map((c, i) => (
              <div key={c.id} className="card">
                <span className="chip" style={{ background: STATUS_COLOR[c.status] }} />
                <div className="body">
                  <Link href={`/concepts/${c.id}`} className="title">{c.title}</Link>
                  <div className="meta">
                    <span className="muted" style={{ fontSize: 12 }}>{STATUS_LABEL[c.status]}</span>
                    {c.review && <span className="badge review">review</span>}
                  </div>
                </div>
                <div className="right">
                  <button className="btn ghost sm" title="Move up" onClick={() => move(g.concepts, i, -1)}>↑</button>
                  <button className="btn ghost sm" title="Move down" onClick={() => move(g.concepts, i, 1)}>↓</button>
                  <button className="btn ghost sm" onClick={() => toggleReview(c)}>{c.review ? 'clear review' : 'review'}</button>
                  <button className="statusbtn" onClick={() => cycleStatus(c)} disabled={busy === `s-${c.id}`}>
                    <span className="sd" style={{ background: STATUS_COLOR[c.status] }} />
                    {c.status === 'complete' ? '✓ complete' : c.status === 'learning' ? 'mark complete' : 'start'}
                  </button>
                  <button className="btn ghost sm danger" onClick={() => del(c)}>✕</button>
                </div>
              </div>
            ))}
            {g.concepts.length === 0 && <div className="empty">No concepts here yet.</div>}
          </div>
        </section>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Rewrite `app/concepts/page.tsx`**

```typescript
import { conceptSummaries } from '@/lib/core/indexDb';
import ConceptView, { type ParentGroup } from '@/components/ConceptView';

export const dynamic = 'force-dynamic';

export default function ConceptsPage() {
  const summaries = conceptSummaries();
  const groups: ParentGroup[] = [];
  for (const c of summaries) {
    let g = groups.find((x) => x.parent === c.parent);
    if (!g) { g = { parent: c.parent, concepts: [], complete: 0, total: 0 }; groups.push(g); }
    g.concepts.push(c);
    g.total += 1;
    if (c.status === 'complete') g.complete += 1;
  }
  return (
    <>
      <div className="page-head">
        <h1>Concepts</h1>
        <p>Shared theory, grouped by area in learning order. Master once — it goes green in every project that references it.</p>
      </div>
      <ConceptView groups={groups} />
    </>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/ConceptView.tsx app/concepts/page.tsx
git commit -m "Rebuild the Concept list view on the new schema"
```

---

### Task 7: Concept detail view (notes, sources, explode) + page

**Files:**
- Create: `components/ConceptDetail.tsx`
- Modify: `app/concepts/[id]/page.tsx`
- Modify: `app/globals.css` (append the Explode modal's neon styling)

**Interfaces:**
- Consumes (server, in the page): `getConcept` from `@/lib/core/concepts`; `conceptSummaries` from `@/lib/core/indexDb`; `sourcesForConcept` from `@/lib/core/sources`.
- Produces: `ConceptDetail` component (client) with status/review controls, a notes dump (add/view text+link notes), a sources list (add/unlink), and the Explode Concept button + modal.

- [ ] **Step 1: Append the Explode modal CSS to `app/globals.css`**

```css

/* ---- Explode Concept modal (learn2hack.today-styled: the one AI-generation
   surface in this app — near-black panel, neon magenta/cyan glow, distinct
   from the HTB-styled card lists everywhere else) ---- */
.explode-overlay {
  position: fixed; inset: 0; background: rgba(5, 4, 10, 0.75);
  display: flex; align-items: center; justify-content: center; z-index: 50;
}
.explode-modal {
  background: #0a0714; border: 1px solid #b23ce0; border-radius: var(--radius);
  box-shadow: 0 0 0 1px rgba(178, 60, 224, 0.25), 0 0 32px rgba(178, 60, 224, 0.35), 0 0 64px rgba(56, 224, 224, 0.15);
  padding: 24px; width: 440px; max-width: calc(100vw - 32px);
}
.explode-modal h2 {
  font-family: var(--serif); font-size: 19px; margin: 0 0 4px;
  background: linear-gradient(90deg, #e14be0, #38e0e0);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.explode-modal p.hint { color: var(--muted); font-size: 13px; margin: 0 0 16px; }
.explode-modal .field label { color: #d79ee8; }
.explode-modal textarea, .explode-modal input, .explode-modal select {
  background: #120b1f; border-color: #6b2f85;
}
.explode-modal .btn.solid {
  background: linear-gradient(90deg, #b23ce0, #38b8e0); border-color: transparent; color: #0a0714; font-weight: 700;
}
```

- [ ] **Step 2: Write `components/ConceptDetail.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Concept, Note, Source } from '@/lib/core/types';
import { STATUS_COLOR } from '@/lib/core/status';

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

export default function ConceptDetail({ concept, parents, sources }: { concept: Concept; parents: string[]; sources: Source[] }) {
  const router = useRouter();
  const [c, setC] = useState<Concept>(concept);
  const [srcs, setSrcs] = useState<Source[]>(sources);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [explodeOpen, setExplodeOpen] = useState(false);

  function set<K extends keyof Concept>(k: K, v: Concept[K]) { setC({ ...c, [k]: v }); }

  async function save() {
    setSaving(true); setMsg('');
    try {
      await api(`/api/concepts/${c.id}`, 'PATCH', { title: c.title, parent: c.parent, body: c.body, prereqs: c.prereqs });
      setMsg('Saved.'); router.refresh();
    } catch (e) { setMsg((e as Error).message); }
    finally { setSaving(false); }
  }

  async function setStatus(status: Concept['status']) {
    const r = await api(`/api/concepts/${c.id}/status`, 'POST', { action: 'set', status });
    setC({ ...c, ...r.concept }); router.refresh();
  }
  async function setReview(review: boolean) {
    const r = await api(`/api/concepts/${c.id}/status`, 'POST', { action: 'review', review });
    setC({ ...c, ...r.concept }); router.refresh();
  }

  async function addNote() {
    const text = prompt('Note text:');
    if (!text) return;
    const url = prompt('Attach a link? (leave blank to skip)');
    const note: Note = { id: `n-${Date.now()}`, date: new Date().toISOString().slice(0, 10), text, attachments: url ? [{ type: 'link', url }] : undefined };
    const notes = [...c.notes, note];
    await api(`/api/concepts/${c.id}`, 'PATCH', { notes });
    setC({ ...c, notes }); router.refresh();
  }
  async function removeNote(id: string) {
    const notes = c.notes.filter((n) => n.id !== id);
    await api(`/api/concepts/${c.id}`, 'PATCH', { notes });
    setC({ ...c, notes }); router.refresh();
  }

  async function addSource() {
    const title = prompt('Source title:');
    if (!title) return;
    const url = prompt('Source URL:');
    if (!url) return;
    const r = await api('/api/sources', 'POST', { title, url, type: 'link', concepts: [c.id] });
    setSrcs([...srcs, r.source]);
  }
  async function unlinkSource(s: Source) {
    const concepts = s.concepts.filter((cid) => cid !== c.id);
    await api(`/api/sources/${s.id}`, 'PATCH', { concepts });
    setSrcs(srcs.filter((x) => x.id !== s.id));
  }

  async function explode(reason: string, newParentCourseTitle: string) {
    try {
      await api(`/api/concepts/${c.id}/explode`, 'POST', { reason, newParentCourseTitle });
      setExplodeOpen(false);
      setMsg('Exploded into a new course.');
      router.refresh();
    } catch (e) { alert((e as Error).message); }
  }

  return (
    <>
      <Link href="/concepts" className="backlink">← All concepts</Link>
      <div className="page-head" style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 26 }}>{c.title}</h1>
        <p className="muted">{c.parent} · <code>{c.id}</code></p>
      </div>

      <div className="toolbar">
        {(['not_started', 'learning', 'complete'] as const).map((s) => (
          <button key={s} className="statusbtn" style={{ borderColor: c.status === s ? STATUS_COLOR[s] : undefined }} onClick={() => setStatus(s)}>
            <span className="sd" style={{ background: STATUS_COLOR[s] }} />
            {s.replace('_', ' ')}{c.status === s ? ' ✓' : ''}
          </button>
        ))}
        <button className="btn ghost" onClick={() => setReview(!c.review)}>{c.review ? 'Clear review flag' : 'Flag for review'}</button>
        <span className="spacer" />
        <button className="btn ghost" onClick={() => setExplodeOpen(true)}>💥 Explode Concept</button>
        <button className="btn solid" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      {msg && <p className="muted" style={{ marginTop: -8 }}>{msg}</p>}

      <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div style={{ flex: '1 1 520px', minWidth: 320 }}>
          <div className="field">
            <label>Notes (Markdown — your own words)</label>
            <textarea value={c.body} onChange={(e) => set('body', e.target.value)} />
          </div>

          <div className="section-title" style={{ marginTop: 0 }}>Notes dump</div>
          <div className="cardlist">
            {c.notes.map((n) => (
              <div key={n.id} className="card" style={{ alignItems: 'flex-start' }}>
                <span className="chip" style={{ background: 'var(--accent)' }} />
                <div className="body">
                  <div className="desc" style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div>
                  {n.attachments?.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer" className="pill" style={{ marginTop: 6, display: 'inline-block' }}>{a.url}</a>
                  ))}
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{n.date}</div>
                </div>
                <button className="btn ghost sm danger" onClick={() => removeNote(n.id)}>✕</button>
              </div>
            ))}
            {c.notes.length === 0 && <div className="empty">No notes yet.</div>}
          </div>
          <div className="toolbar"><button className="btn sm" onClick={addNote}>＋ Add note</button></div>

          <div className="section-title">Sources</div>
          <div className="cardlist">
            {srcs.map((s) => (
              <div key={s.id} className="card">
                <span className="chip" style={{ background: 'var(--blue)' }} />
                <div className="body">
                  <a href={s.url} target="_blank" rel="noreferrer" className="title">{s.title}</a>
                  <div className="desc">{s.type}</div>
                </div>
                <button className="btn ghost sm danger" onClick={() => unlinkSource(s)}>✕</button>
              </div>
            ))}
            {srcs.length === 0 && <div className="empty">No sources yet.</div>}
          </div>
          <div className="toolbar"><button className="btn sm" onClick={addSource}>＋ Add source</button></div>
        </div>

        <div style={{ flex: '1 1 300px', minWidth: 260 }}>
          <div className="field">
            <label>Area (parent header)</label>
            <input list="parents" type="text" value={c.parent} onChange={(e) => set('parent', e.target.value)} />
            <datalist id="parents">{parents.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div className="field">
            <label>Title</label>
            <input type="text" value={c.title} onChange={(e) => set('title', e.target.value)} />
          </div>
        </div>
      </div>

      {explodeOpen && <ExplodeModal onClose={() => setExplodeOpen(false)} onSubmit={explode} />}
    </>
  );
}

function ExplodeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string, newParentCourseTitle: string) => void }) {
  const [reason, setReason] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  return (
    <div className="explode-overlay" onClick={onClose}>
      <div className="explode-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Explode Concept</h2>
        <p className="hint">Break this concept into a finer-grained course, targeted at what's confusing you.</p>
        <div className="field">
          <label>Why is this hard to understand?</label>
          <textarea style={{ minHeight: 90 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. the derivation loses me at the update step" />
        </div>
        <div className="field">
          <label>New course name (nests under it)</label>
          <input type="text" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="e.g. Kalman filter, broken down" />
        </div>
        <div className="toolbar">
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn solid" disabled={!reason || !courseTitle} onClick={() => onSubmit(reason, courseTitle)}>Explode</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `app/concepts/[id]/page.tsx`**

```typescript
import { notFound } from 'next/navigation';
import { getConcept, getAllConcepts } from '@/lib/core/concepts';
import { sourcesForConcept } from '@/lib/core/sources';
import ConceptDetail from '@/components/ConceptDetail';

export const dynamic = 'force-dynamic';

export default async function ConceptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const concept = getConcept(id);
  if (!concept) notFound();
  const parents = Array.from(new Set(getAllConcepts(true).map((c) => c.parent)));
  const sources = sourcesForConcept(id);
  return <ConceptDetail concept={concept} parents={parents} sources={sources} />;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/ConceptDetail.tsx app/concepts/\[id\]/page.tsx app/globals.css
git commit -m "Rebuild Concept detail view: notes dump, sources, Explode Concept"
```

---

### Task 8: Project list view + page

**Files:**
- Create: `components/ProjectList.tsx`
- Modify: `app/projects/page.tsx`

**Interfaces:**
- Consumes (server, in the page): `projectSummaries` from `@/lib/core/indexDb`.
- Produces: `ProjectList` component (client), rendered by `app/projects/page.tsx` (server).

- [ ] **Step 1: Write `components/ProjectList.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProjectSummary } from '@/lib/core/indexDb';

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

export default function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function addProject() {
    const title = prompt('New project name:');
    if (!title) return;
    setBusy(true);
    try { await api('/api/projects', 'POST', { title }); router.refresh(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }
  async function del(p: ProjectSummary) {
    if (!confirm(`Archive "${p.title}"? Soft-deleted and recoverable.`)) return;
    try { await api(`/api/projects/${p.id}`, 'DELETE'); router.refresh(); }
    catch (e) { alert((e as Error).message); }
  }

  return (
    <>
      <div className="toolbar">
        <button className="btn solid" onClick={addProject} disabled={busy}>＋ New project</button>
      </div>
      <div className="cardlist">
        {projects.map((p) => {
          const pct = p.checkpoints ? Math.round((p.done / p.checkpoints) * 100) : 0;
          return (
            <div key={p.id} className="card">
              <span className="chip" style={{ background: 'var(--green)' }} />
              <div className="body">
                <Link href={`/projects/${p.id}`} className="title">{p.title}</Link>
                <div className="desc">{p.done}/{p.checkpoints} checkpoints done · {pct}%</div>
              </div>
              <div className="right">
                <Link href={`/projects/${p.id}`} className="btn sm solid">Open roadmap</Link>
                <button className="btn ghost sm danger" onClick={() => del(p)}>✕</button>
              </div>
            </div>
          );
        })}
        {projects.length === 0 && <div className="empty">No projects yet. Create one to start a roadmap.</div>}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Rewrite `app/projects/page.tsx`**

```typescript
import { projectSummaries } from '@/lib/core/indexDb';
import ProjectList from '@/components/ProjectList';

export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
  const projects = projectSummaries();
  return (
    <>
      <div className="page-head">
        <h1>Projects</h1>
        <p>Each roadmap is a dependency graph of checkpoints referencing shared concepts — it never copies them.</p>
      </div>
      <ProjectList projects={projects} />
    </>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/ProjectList.tsx app/projects/page.tsx
git commit -m "Rebuild the Project list view on the new schema"
```

---

### Task 9: Project roadmap view (checkpoint DAG) + page

**Files:**
- Create: `components/RoadmapView.tsx`
- Modify: `app/projects/[id]/page.tsx`

**Interfaces:**
- Consumes (server, in the page): `getProject` from `@/lib/core/projects`; `getAllConcepts` from `@/lib/core/concepts`; `getAllCourses` from `@/lib/core/courses`.
- Produces: `RoadmapView` component (client) — does NOT import `@/lib/core/projects` (that module touches `node:fs`/`node:path`, disallowed in client components per Global Constraints); "is this checkpoint unblocked" is reimplemented inline as a small pure function.

- [ ] **Step 1: Write `components/RoadmapView.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Project, Checkpoint, Note } from '@/lib/core/types';

type ConceptIx = { id: string; title: string; status: string; review: boolean };
type CourseIx = { id: string; title: string };

const CP_STATUS = ['not_started', 'building', 'done'] as const;
const CP_COLOR: Record<string, string> = { not_started: '#8b8b9e', building: '#e08a3c', done: '#43c59e' };
const C_COLOR: Record<string, string> = { not_started: '#8b8b9e', learning: '#e0b341', complete: '#43c59e' };

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

// Reimplemented inline (not imported from lib/core/projects, which is server-only):
// a checkpoint is unblocked when it isn't done and every dependency is done.
function isUnblocked(checkpoints: Checkpoint[], cp: Checkpoint): boolean {
  if (cp.status === 'done') return false;
  const byId = new Map(checkpoints.map((c) => [c.id, c]));
  return cp.depends_on.every((d) => byId.get(d)?.status === 'done');
}

export default function RoadmapView({ project, concepts, courses }: { project: Project; concepts: ConceptIx[]; courses: CourseIx[] }) {
  const router = useRouter();
  const [p, setP] = useState<Project>(project);
  const [sel, setSel] = useState(0);
  const [err, setErr] = useState('');
  const cmap = new Map(concepts.map((c) => [c.id, c]));

  async function persist(next: Project) {
    setP(next); setErr('');
    try {
      await api(`/api/projects/${p.id}`, 'PATCH', { checkpoints: next.checkpoints });
      router.refresh();
    } catch (e) { setErr((e as Error).message); }
  }
  function update(cps: Checkpoint[]) { persist({ ...p, checkpoints: cps }); }

  function editCp(i: number, patch: Partial<Checkpoint>) {
    update(p.checkpoints.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }
  function cycleStatus(i: number) {
    const cur = p.checkpoints[i].status;
    const next = CP_STATUS[(CP_STATUS.indexOf(cur) + 1) % CP_STATUS.length];
    editCp(i, { status: next });
  }
  function addCheckpoint() {
    const title = prompt('New checkpoint title:'); if (!title) return;
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cp-${p.checkpoints.length}`;
    const cp: Checkpoint = { id, title, depends_on: [], courses: [], concepts: [], status: 'not_started' };
    update([...p.checkpoints, cp]); setSel(p.checkpoints.length);
  }
  function delCheckpoint(i: number) {
    if (!confirm(`Remove checkpoint "${p.checkpoints[i].title}"?`)) return;
    update(p.checkpoints.filter((_, j) => j !== i)); setSel(0);
  }
  function toggleDependsOn(i: number, depId: string) {
    const cp = p.checkpoints[i];
    const has = cp.depends_on.includes(depId);
    editCp(i, { depends_on: has ? cp.depends_on.filter((d) => d !== depId) : [...cp.depends_on, depId] });
  }
  function addConceptRef(i: number, cid: string) {
    if (!cid || p.checkpoints[i].concepts.includes(cid)) return;
    editCp(i, { concepts: [...p.checkpoints[i].concepts, cid] });
  }
  function removeConceptRef(i: number, cid: string) {
    editCp(i, { concepts: p.checkpoints[i].concepts.filter((x) => x !== cid) });
  }
  function addCourseRef(i: number, courseId: string) {
    if (!courseId || p.checkpoints[i].courses.includes(courseId)) return;
    editCp(i, { courses: [...p.checkpoints[i].courses, courseId] });
  }
  async function addProjectNote() {
    const text = prompt('Note text:'); if (!text) return;
    const note: Note = { id: `n-${Date.now()}`, date: new Date().toISOString().slice(0, 10), text };
    await persist({ ...p, notes: [...p.notes, note] });
  }

  const cp = p.checkpoints[sel];
  const done = p.checkpoints.filter((x) => x.status === 'done').length;

  return (
    <>
      <Link href="/projects" className="backlink">← All projects</Link>
      <div className="page-head" style={{ marginBottom: 10 }}>
        <h1 style={{ fontSize: 26 }}>{p.title}</h1>
        <p className="muted">{done}/{p.checkpoints.length} checkpoints done</p>
      </div>
      {p.metadata && Object.keys(p.metadata).length > 0 && (
        <p className="muted" style={{ marginTop: -6, marginBottom: 6, fontSize: 13 }}>
          {Object.entries(p.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')}
        </p>
      )}
      {err && <p className="muted" style={{ color: 'var(--red)' }}>{err}</p>}

      <div className="toolbar"><button className="btn solid" onClick={addCheckpoint}>＋ Add checkpoint</button></div>

      <div className="roadmap">
        <div className="phases">
          {p.checkpoints.map((c, i) => {
            const unblocked = isUnblocked(p.checkpoints, c);
            return (
              <div key={c.id} className={`phase ${i === sel ? 'active' : ''}`} onClick={() => setSel(i)}>
                <div className="pn">{unblocked ? '● Unblocked' : c.status === 'done' ? 'Done' : 'Blocked'}</div>
                <div className="pt">{c.title}</div>
                <div className="pmeta">
                  <span style={{ color: CP_COLOR[c.status] }}>● {c.status.replace('_', ' ')}</span>
                  {' · '}{c.concepts.length} concepts
                </div>
              </div>
            );
          })}
        </div>

        <div className="timeline">
          {p.checkpoints.map((c, i) => (
            <div className="tl-item" key={c.id}>
              <span className="tl-dot" style={{ background: CP_COLOR[c.status] }} />
              <div className="tl-title" style={{ cursor: 'pointer' }} onClick={() => setSel(i)}>{c.title}</div>

              {i === sel && cp && (
                <div className="tl-block">
                  <div className="row">
                    <button className="statusbtn" onClick={() => cycleStatus(i)}>
                      <span className="sd" style={{ background: CP_COLOR[cp.status] }} />{cp.status.replace('_', ' ')}
                    </button>
                    <span className="spacer" />
                    <button className="btn ghost sm danger" onClick={() => delCheckpoint(i)}>Delete</button>
                  </div>

                  <div className="tl-label">Depends on</div>
                  <div className="tl-concepts">
                    {p.checkpoints.filter((_, j) => j !== i).map((other) => (
                      <label key={other.id} className="ctag" style={{ cursor: 'pointer' }}>
                        <input type="checkbox" checked={cp.depends_on.includes(other.id)} onChange={() => toggleDependsOn(i, other.id)} style={{ width: 'auto' }} />
                        {other.title}
                      </label>
                    ))}
                  </div>

                  <div className="tl-label">Referenced concepts (green = mastered)</div>
                  <div className="tl-concepts">
                    {cp.concepts.map((cid) => {
                      const ci = cmap.get(cid);
                      const st = ci?.status ?? 'not_started';
                      return (
                        <span key={cid} className="ctag">
                          <span className="cd" style={{ background: C_COLOR[st] }} />
                          <Link href={`/concepts/${cid}`}>{ci?.title ?? cid}</Link>
                          {st === 'complete' && ' ✓'}
                          <button className="btn ghost sm" style={{ padding: '0 4px' }} onClick={() => removeConceptRef(i, cid)}>✕</button>
                        </span>
                      );
                    })}
                  </div>
                  <select defaultValue="" onChange={(e) => { addConceptRef(i, e.target.value); e.target.value = ''; }} style={{ marginTop: 8 }}>
                    <option value="" disabled>＋ reference a concept…</option>
                    {concepts.filter((c) => !cp.concepts.includes(c.id)).map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>

                  <div className="tl-label">Referenced courses</div>
                  <div className="tl-concepts">
                    {cp.courses.map((courseId) => {
                      const co = courses.find((x) => x.id === courseId);
                      return <span key={courseId} className="ctag">{co?.title ?? courseId}</span>;
                    })}
                  </div>
                  {courses.length > 0 && (
                    <select defaultValue="" onChange={(e) => { addCourseRef(i, e.target.value); e.target.value = ''; }} style={{ marginTop: 8 }}>
                      <option value="" disabled>＋ reference a course…</option>
                      {courses.filter((c) => !cp.courses.includes(c.id)).map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  )}

                  <div className="tl-label">Build step</div>
                  <textarea style={{ minHeight: 70 }} value={cp.build ?? ''} onChange={(e) => setP({ ...p, checkpoints: p.checkpoints.map((x, j) => j === i ? { ...x, build: e.target.value } : x) })} onBlur={() => update(p.checkpoints)} />

                  <div className="tl-label">Done test (pass/fail)</div>
                  <textarea style={{ minHeight: 60 }} value={cp.done_test ?? ''} onChange={(e) => setP({ ...p, checkpoints: p.checkpoints.map((x, j) => j === i ? { ...x, done_test: e.target.value } : x) })} onBlur={() => update(p.checkpoints)} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">Project notes</div>
      <div className="cardlist">
        {p.notes.map((n) => (
          <div key={n.id} className="card">
            <span className="chip" style={{ background: 'var(--accent)' }} />
            <div className="body"><div className="desc" style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div></div>
          </div>
        ))}
        {p.notes.length === 0 && <div className="empty">No notes yet.</div>}
      </div>
      <div className="toolbar"><button className="btn sm" onClick={addProjectNote}>＋ Add note</button></div>
    </>
  );
}
```

- [ ] **Step 2: Rewrite `app/projects/[id]/page.tsx`**

```typescript
import { notFound } from 'next/navigation';
import { getProject } from '@/lib/core/projects';
import { getAllConcepts } from '@/lib/core/concepts';
import { getAllCourses } from '@/lib/core/courses';
import RoadmapView from '@/components/RoadmapView';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  const concepts = getAllConcepts().map((c) => ({ id: c.id, title: c.title, status: c.status, review: c.review }));
  const courses = getAllCourses().map((c) => ({ id: c.id, title: c.title }));
  return <RoadmapView project={project} concepts={concepts} courses={courses} />;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/RoadmapView.tsx app/projects/\[id\]/page.tsx
git commit -m "Rebuild the Project roadmap view as a checkpoint dependency graph"
```

---

### Task 10: Dashboard page

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `conceptSummaries`, `projectSummaries` from `@/lib/core/indexDb`.

- [ ] **Step 1: Rewrite `app/page.tsx`**

```typescript
import Link from 'next/link';
import { conceptSummaries, projectSummaries } from '@/lib/core/indexDb';

export const dynamic = 'force-dynamic';

export default function Home() {
  const concepts = conceptSummaries();
  const projects = projectSummaries();

  const total = concepts.length;
  const complete = concepts.filter((c) => c.status === 'complete').length;
  const learning = concepts.filter((c) => c.status === 'learning').length;
  const review = concepts.filter((c) => c.review).length;
  const pct = total ? Math.round((complete / total) * 100) : 0;

  const groups: { parent: string; complete: number; total: number }[] = [];
  for (const c of concepts) {
    let g = groups.find((x) => x.parent === c.parent);
    if (!g) { g = { parent: c.parent, complete: 0, total: 0 }; groups.push(g); }
    g.total += 1;
    if (c.status === 'complete') g.complete += 1;
  }

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>One project from zero, one concept at a time. Master a concept once — it goes green everywhere.</p>
      </div>

      <div className="tiles">
        <div className="tile"><div className="n lav">{pct}%</div><div className="l">Syllabus complete</div></div>
        <div className="tile"><div className="n green">{complete}</div><div className="l">Concepts complete</div></div>
        <div className="tile"><div className="n amber">{learning}</div><div className="l">Learning now</div></div>
        <div className="tile"><div className="n">{review}</div><div className="l">Flagged for review</div></div>
        <div className="tile"><div className="n">{projects.length}</div><div className="l">Projects</div></div>
      </div>

      <div className="section-title">Concept progress by area</div>
      <div className="cardlist">
        {groups.map((g) => {
          const gp = g.total ? Math.round((g.complete / g.total) * 100) : 0;
          return (
            <Link key={g.parent} href="/concepts" className="card">
              <span className="chip" style={{ background: 'var(--accent)' }} />
              <div className="body">
                <div className="title">{g.parent}</div>
                <div className="meta" style={{ width: 260, maxWidth: '50vw' }}>
                  <div className="progress" style={{ flex: 1 }}><i style={{ width: `${gp}%` }} /></div>
                </div>
              </div>
              <div className="right"><span className="muted">{g.complete}/{g.total}</span></div>
            </Link>
          );
        })}
      </div>

      <div className="section-title">Projects</div>
      <div className="cardlist">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="card">
            <span className="chip" style={{ background: 'var(--green)' }} />
            <div className="body">
              <div className="title">{p.title}</div>
              <div className="desc">{p.done}/{p.checkpoints} checkpoints done</div>
            </div>
            <div className="right"><span className="btn sm">Open roadmap</span></div>
          </Link>
        ))}
        {projects.length === 0 && <div className="empty">No projects yet.</div>}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "Rebuild the dashboard on the new schema"
```

---

### Task 11: Delete the old layer

**Files:**
- Delete: `lib/types.ts`, `lib/content.ts`, `lib/db.ts`, `lib/paths.ts`, `lib/status.ts`, `lib/pipeline.ts`, `lib/content.test.ts`
- Delete: `app/api/pipeline/` (entire directory)
- Delete: `scripts/seed.mjs`
- Modify: `package.json` (remove the `"seed"` script)
- Modify: `launcher/run.command` (remove the seed line)
- Modify: `README.md` (remove seed references)

**Interfaces:** None — this is pure deletion/cleanup. By this point every consumer of the old layer (components, API routes, pages) has already been replaced in Tasks 2-10.

- [ ] **Step 1: Confirm nothing still references the old layer**

```bash
grep -rln "lib/content\|lib/db'\|lib/paths'\|lib/status'\|lib/pipeline\|@/lib/types" app components lib/core scripts 2>/dev/null
```
Expected: no matches (the grep pattern for `lib/db` and `lib/paths` uses a trailing quote to avoid matching `lib/core/...` paths that happen to contain those substrings — there are none, but the trailing quote keeps the check precise). If anything matches, stop and fix that reference before deleting — do not delete a file something still imports.

- [ ] **Step 2: Delete the old lib files and old pipeline API route**

```bash
rm lib/types.ts lib/content.ts lib/db.ts lib/paths.ts lib/status.ts lib/pipeline.ts lib/content.test.ts
rm -rf app/api/pipeline
```

- [ ] **Step 3: Delete the old seed script and its references**

```bash
rm scripts/seed.mjs
```

Edit `package.json`: remove the `"seed": "node scripts/seed.mjs",` line from `scripts`.

Edit `launcher/run.command`: remove the line `[ -d content/concepts ] || { log "Seeding content from the study plan…"; node scripts/seed.mjs; }` and the `# First run: installs deps, seeds content, builds.` comment's "seeds content," clause (adjust the comment to describe the new first-run behavior: installs deps, builds — content already exists from the Phase 1a migration and isn't reseeded).

Edit `README.md`: remove the `npm run seed` line from its command list and the `scripts/seed.mjs` line from its file-listing section; adjust the "run it installs dependencies, seeds the content, builds" sentence to drop "seeds the content,".

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS (all tests — the old layer had no tests of its own beyond `lib/content.test.ts`, which is deleted in this task, not broken by it)

- [ ] **Step 5: Verify the build is clean**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean, no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Delete the old two-axis data layer, pipeline UI, and seed script"
```

---

### Task 12: Manual end-to-end verification

**Files:** None — this task runs the app and clicks through it; use the run skill or a manual dev server to actually look at each page, not just to check that the build compiles.

**Interfaces:** None.

- [ ] **Step 1: Start the dev server and check each page renders**

Run: `npm run dev` (or use the project's `run` skill if invoked interactively), then in a browser or the built-in browser tool visit:
- `/` — dashboard shows real stats (58 concepts, 1 project, correct percentages)
- `/concepts` — lists all concept groups, status/review/move/archive controls work
- `/concepts/<any-id>` — status controls, notes dump (add a note, confirm it persists after refresh), sources (add a source, confirm it shows), Explode Concept modal opens and — using a scratch/test concept, not one of the real 58 — successfully creates a new course
- `/projects/diffdrive-mobile-manipulator` — **this is the page that was silently broken before this plan** — confirm it now shows all 12 checkpoints with correct titles, the dependency chain (checkpoint 2 depends on checkpoint 1, etc.), build/done_test text intact, and that toggling a checkpoint to `done` correctly changes which checkpoints show as "Unblocked"
- `/projects` — lists the project with a correct checkpoint-done count

- [ ] **Step 2: Confirm the cycle-rejection path surfaces correctly in the UI**

On the roadmap view, attempt to make a checkpoint depend on a checkpoint that (transitively) depends on it. Confirm the UI shows the thrown error message (via the `err` state in `RoadmapView`) rather than silently failing or crashing.

- [ ] **Step 3: Revert any scratch data created during manual testing**

If Step 1's Explode Concept test or any other manual test created scratch concepts/courses/projects, remove them (via the UI's archive/delete controls, or by deleting the corresponding files under `content/` and running `POST /api/reindex`) so `content/` reflects only real data.

- [ ] **Step 4: Final full-suite + build check**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all three clean.

- [ ] **Step 5: Commit** (only if Step 3 left any file changes — e.g. a `.gitignore` tweak; if `content/` is back to its pre-test state, there is nothing to commit)

```bash
git status --short
# if there are changes:
git add -A
git commit -m "Clean up scratch data from manual verification"
```

---

## Self-review notes

- **Spec coverage:** Explode Concept UI action (spec §10 Phase 1, §4) — Task 3 + Task 7. Card-list/AI-surface theme split (spec §8) — reused HTB-matching CSS everywhere except the Explode modal, which gets the learn2hack treatment (Task 7, Step 1). The currently-live project-page bug (empty roadmap from the Phase 1a migration) — fixed by Task 9 + verified by Task 12, Step 1.
- **Out of scope for this plan, by design:** dedicated Course/Template list & detail views, a Source-browsing page independent of a Concept, and Price Record display — no seed data exists for any of these yet, so there's nothing to view; they're natural Plan 1c or Phase 2 work once Templates/Courses/Sources/Prices actually get created (by hand or by Phase 2's skills).
- **Type consistency check:** `ConceptSummary`/`ParentGroup` types in `components/ConceptView.tsx` match what `app/concepts/page.tsx` (Task 6) and `app/api/concepts/route.ts`'s `GET` handler (Task 2) both produce — same field names (`parent`, `complete`, `total`, `concepts`). `ProjectSummary` used in `components/ProjectList.tsx` (Task 8) matches `lib/core/indexDb.ts`'s existing export (Phase 1a) — `checkpoints`/`done`, not the old `milestones`/`done`. `RoadmapView`'s `Checkpoint`/`Note` usage (Task 9) matches `lib/core/types.ts` (Phase 1a) exactly, and its `isUnblocked` reimplementation matches the logic (not the import) of `lib/core/projects.ts`'s `unblockedCheckpoints`, per the Global Constraint against client-side `node:*` imports.
