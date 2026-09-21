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
