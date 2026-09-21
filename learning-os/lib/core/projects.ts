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
    status: p.status,
    metadata: p.metadata,
    // Strip undefined-valued keys (e.g. an unset Checkpoint.build/done_test
    // surviving a read->normalize->save round trip) so the YAML dumper
    // never chokes on `[object Undefined]`.
    checkpoints: JSON.parse(JSON.stringify(p.checkpoints)),
    notes: p.notes,
    updated: p.updated,
  };
  if (p.template) fm.template = p.template;
  if (p.deleted) fm.deleted = true;
  return fm;
}

export function saveProject(p: Project): Project {
  ensureDirs();
  // Controller ruling: validate the full checkpoint set for cycles before
  // writing, since a Project can be constructed programmatically (e.g. via
  // createProject) rather than exclusively through setCheckpointDependsOn,
  // and the spec's write-time cycle rejection (§5) must hold regardless of
  // how the write was assembled.
  for (const c of p.checkpoints) {
    const rest = p.checkpoints.filter((x) => x.id !== c.id);
    if (wouldCreateCycle(rest, c.id, c.depends_on)) {
      throw new Error(`Checkpoint "${c.id}" has a depends_on that creates a cycle`);
    }
  }
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
