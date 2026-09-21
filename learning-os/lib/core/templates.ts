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
