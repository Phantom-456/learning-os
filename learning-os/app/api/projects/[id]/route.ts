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
