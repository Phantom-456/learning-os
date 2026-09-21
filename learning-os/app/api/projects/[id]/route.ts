import { NextResponse } from 'next/server';
import { getProject, saveProject, softDeleteProject } from '@/lib/content';
import { rebuildIndex } from '@/lib/db';
import type { Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const p = getProject(id);
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ project: p });
}

const EDITABLE: (keyof Project)[] = [
  'title', 'robot', 'status', 'definition_of_done', 'toolchain', 'body', 'milestones', 'deleted',
];

// PATCH accepts any editable field, including the full `milestones` array —
// so add / remove / reorder / edit / set-status / attach-video are all one call.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const p = getProject(id);
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const patch = await req.json();
  for (const k of EDITABLE) {
    if (k in patch) (p as unknown as Record<string, unknown>)[k] = patch[k];
  }
  // keep milestone order stable if provided out of order
  if (Array.isArray(p.milestones)) {
    p.milestones = p.milestones.map((m, i) => ({ ...m, order: i }));
  }
  saveProject(p);
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
