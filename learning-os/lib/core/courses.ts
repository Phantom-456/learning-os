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
    concepts: c.concepts,
    subcourses: c.subcourses,
    notes: c.notes,
    updated: c.updated,
  };
  if (c.provider) fm.provider = c.provider;
  if (c.url) fm.url = c.url;
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
