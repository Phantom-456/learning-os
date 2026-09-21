import { NextResponse } from 'next/server';
import { getConcept, saveConcept } from '@/lib/core/concepts';
import { rebuildIndex } from '@/lib/core/indexDb';
import { applyStatus, setReview, nextStatus } from '@/lib/core/status';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// POST { action: 'advance' } | { action: 'set', status } | { action: 'review', review }
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  let c = getConcept(id);
  if (!c) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const b = await req.json();

  if (b.action === 'advance') {
    c = applyStatus(c, nextStatus(c.status));
  } else if (b.action === 'set' && b.status) {
    c = applyStatus(c, b.status);
  } else if (b.action === 'review') {
    c = setReview(c, Boolean(b.review));
  } else {
    return NextResponse.json({ error: 'bad action' }, { status: 400 });
  }

  saveConcept(c);
  rebuildIndex();
  return NextResponse.json({ concept: c });
}
