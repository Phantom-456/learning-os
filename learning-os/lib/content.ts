import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  CONCEPTS_DIR,
  PROJECTS_DIR,
  NOTES_DIR,
  ensureDirs,
} from './paths';
import type { Concept, Project, Milestone, VideoRef } from './types';

// ---------------------------------------------------------------------------
// The Markdown files are the source of truth. This module is the only place
// that reads/writes them; db.ts builds a query index by calling the getters here.
// ---------------------------------------------------------------------------

export const today = (): string => new Date().toISOString().slice(0, 10);

function writeMd(file: string, data: Record<string, unknown>, body: string): void {
  ensureDirs();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, matter.stringify(body ?? '', data), 'utf8');
}

function normalizeVideos(videos: unknown, legacy?: unknown): VideoRef[] {
  const out: VideoRef[] = [];
  if (Array.isArray(videos)) {
    for (const v of videos) {
      if (typeof v === 'string') out.push({ url: v, kind: 'short' });
      else if (v && typeof v === 'object' && 'url' in v) {
        const o = v as Record<string, unknown>;
        out.push({ url: String(o.url), kind: (o.kind as VideoRef['kind']) ?? 'short', label: o.label as string | undefined });
      }
    }
  }
  if (typeof legacy === 'string' && legacy.trim()) out.push({ url: legacy, kind: 'short' });
  return out;
}

// ---- Concepts -------------------------------------------------------------

export function conceptFile(id: string): string {
  return path.join(CONCEPTS_DIR, `${id}.md`);
}

export function listConceptIds(): string[] {
  if (!fs.existsSync(CONCEPTS_DIR)) return [];
  return fs.readdirSync(CONCEPTS_DIR).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
}

const KNOWN_CONCEPT_KEYS = new Set([
  'id', 'title', 'parent', 'order', 'status', 'review', 'prereqs',
  'videos', 'my_video', 'links', 'template_done', 'updated', 'deleted',
]);

function extractExtra(data: Record<string, unknown>, knownKeys: Set<string>): Record<string, unknown> | undefined {
  const extra: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (!knownKeys.has(key)) extra[key] = data[key];
  }
  return Object.keys(extra).length ? extra : undefined;
}

function normalizeConcept(id: string, data: Record<string, unknown>, body: string): Concept {
  return {
    id: (data.id as string) ?? id,
    title: (data.title as string) ?? id,
    parent: (data.parent as string) ?? 'Uncategorized',
    order: Number(data.order ?? 0),
    status: (data.status as Concept['status']) ?? 'not_started',
    review: Boolean(data.review ?? false),
    prereqs: (data.prereqs as string[]) ?? [],
    videos: normalizeVideos(data.videos, data.my_video),
    links: (data.links as Concept['links']) ?? [],
    template_done: (data.template_done as string[]) ?? [],
    updated: (data.updated as string) ?? today(),
    deleted: Boolean(data.deleted ?? false),
    extra: extractExtra(data, KNOWN_CONCEPT_KEYS),
    body,
  };
}

export function getConcept(id: string): Concept | null {
  const file = conceptFile(id);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  return normalizeConcept(id, data, content);
}

export function getAllConcepts(includeDeleted = false): Concept[] {
  return listConceptIds()
    .map(getConcept)
    .filter((c): c is Concept => !!c && (includeDeleted || !c.deleted));
}

function conceptFrontmatter(c: Concept): Record<string, unknown> {
  const fm: Record<string, unknown> = {
    ...c.extra,
    id: c.id,
    title: c.title,
    parent: c.parent,
    order: c.order,
    status: c.status,
    review: c.review,
    prereqs: c.prereqs,
    videos: c.videos,
    links: c.links,
    template_done: c.template_done,
    updated: c.updated,
  };
  if (c.deleted) fm.deleted = true;
  return fm;
}

export function saveConcept(c: Concept): Concept {
  c.updated = today();
  writeMd(conceptFile(c.id), conceptFrontmatter(c), c.body ?? '');
  return c;
}

export function createConcept(input: Partial<Concept> & { id: string; title: string; parent: string }): Concept {
  const existing = getAllConcepts(true).filter((c) => c.parent === input.parent);
  const order = input.order ?? (existing.length ? Math.max(...existing.map((c) => c.order)) + 1 : nextGlobalOrder());
  const c: Concept = {
    id: input.id,
    title: input.title,
    parent: input.parent,
    order,
    status: input.status ?? 'not_started',
    review: input.review ?? false,
    prereqs: input.prereqs ?? [],
    videos: input.videos ?? [],
    links: input.links ?? [],
    template_done: input.template_done ?? [],
    updated: today(),
    body: input.body ?? '',
  };
  return saveConcept(c);
}

function nextGlobalOrder(): number {
  const all = getAllConcepts(true);
  return all.length ? Math.max(...all.map((c) => c.order)) + 1 : 0;
}

export function softDeleteConcept(id: string): Concept | null {
  const c = getConcept(id);
  if (!c) return null;
  c.deleted = true;
  return saveConcept(c);
}

export function restoreConcept(id: string): Concept | null {
  const c = getConcept(id);
  if (!c) return null;
  c.deleted = false;
  return saveConcept(c);
}

/** Reorder concepts within a parent header by an explicit ordered id list. */
export function reorderConcepts(parent: string, orderedIds: string[]): void {
  const base = Math.min(...getAllConcepts(true).filter((c) => c.parent === parent).map((c) => c.order), 0);
  orderedIds.forEach((id, i) => {
    const c = getConcept(id);
    if (c && c.parent === parent) {
      c.order = base + i;
      saveConcept(c);
    }
  });
}

// ---- Projects -------------------------------------------------------------

export function projectFile(id: string): string {
  return path.join(PROJECTS_DIR, `${id}.md`);
}

export function listProjectIds(): string[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
}

function normalizeMilestone(m: Record<string, unknown>, i: number): Milestone {
  return {
    id: (m.id as string) ?? `milestone-${i}`,
    title: (m.title as string) ?? `Milestone ${i}`,
    order: Number(m.order ?? i),
    concepts: (m.concepts as string[]) ?? [],
    app_notes: m.app_notes as string | undefined,
    build: (m.build as string) ?? '',
    done_test: m.done_test as string | undefined,
    videos: normalizeVideos(m.videos, m.video),
    status: (m.status as Milestone['status']) ?? 'not_started',
  };
}

const KNOWN_PROJECT_KEYS = new Set([
  'id', 'title', 'robot', 'status', 'definition_of_done', 'toolchain',
  'milestones', 'updated', 'deleted',
]);

function normalizeProject(id: string, data: Record<string, unknown>, body: string): Project {
  const rawMs = Array.isArray(data.milestones) ? (data.milestones as Record<string, unknown>[]) : [];
  return {
    id: (data.id as string) ?? id,
    title: (data.title as string) ?? id,
    robot: (data.robot as string) ?? '',
    status: (data.status as string) ?? 'in_progress',
    definition_of_done: (data.definition_of_done as string) ?? '',
    toolchain: data.toolchain as string | undefined,
    milestones: rawMs.map(normalizeMilestone).sort((a, b) => a.order - b.order),
    updated: (data.updated as string) ?? today(),
    deleted: Boolean(data.deleted ?? false),
    extra: extractExtra(data, KNOWN_PROJECT_KEYS),
    body,
  };
}

export function getProject(id: string): Project | null {
  const file = projectFile(id);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  return normalizeProject(id, data, content);
}

export function getAllProjects(includeDeleted = false): Project[] {
  return listProjectIds()
    .map(getProject)
    .filter((p): p is Project => !!p && (includeDeleted || !p.deleted));
}

function projectFrontmatter(p: Project): Record<string, unknown> {
  const fm: Record<string, unknown> = {
    ...p.extra,
    id: p.id,
    title: p.title,
    robot: p.robot,
    status: p.status,
    definition_of_done: p.definition_of_done,
    toolchain: p.toolchain,
    milestones: p.milestones
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((m) => ({
        id: m.id,
        title: m.title,
        order: m.order,
        concepts: m.concepts,
        app_notes: m.app_notes,
        build: m.build,
        done_test: m.done_test,
        videos: m.videos,
        status: m.status,
      })),
    updated: p.updated,
  };
  if (p.deleted) fm.deleted = true;
  return fm;
}

export function saveProject(p: Project): Project {
  p.updated = today();
  writeMd(projectFile(p.id), projectFrontmatter(p), p.body ?? '');
  return p;
}

export function createProject(input: Partial<Project> & { id: string; title: string }): Project {
  const p: Project = {
    id: input.id,
    title: input.title,
    robot: input.robot ?? '',
    status: input.status ?? 'in_progress',
    definition_of_done: input.definition_of_done ?? '',
    toolchain: input.toolchain,
    milestones: input.milestones ?? [],
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

export function restoreProject(id: string): Project | null {
  const p = getProject(id);
  if (!p) return null;
  p.deleted = false;
  return saveProject(p);
}

// ---- Notes ----------------------------------------------------------------

export function noteFile(relPath: string): string {
  // relPath is like "notes/diffdrive/m0-environment.md" or "diffdrive/m0-environment.md"
  const clean = relPath.replace(/^notes\//, '');
  return path.join(NOTES_DIR, clean);
}

export function getNote(relPath: string): string {
  const file = noteFile(relPath);
  if (!fs.existsSync(file)) return '';
  const { content } = matter(fs.readFileSync(file, 'utf8'));
  return content;
}

export function saveNote(relPath: string, body: string): void {
  const file = noteFile(relPath);
  writeMd(file, { updated: today() }, body);
}
