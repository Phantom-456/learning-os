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
