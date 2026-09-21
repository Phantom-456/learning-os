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
