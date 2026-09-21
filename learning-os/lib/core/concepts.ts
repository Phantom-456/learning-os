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

const KNOWN_CONCEPT_KEYS = new Set([
  'id', 'title', 'parent', 'order', 'status', 'review', 'prereqs',
  'notes', 'updated', 'archived',
]);

function extractExtra(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const extra: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (!KNOWN_CONCEPT_KEYS.has(key)) extra[key] = data[key];
  }
  return Object.keys(extra).length ? extra : undefined;
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
    extra: extractExtra(data),
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
    ...c.extra,
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
