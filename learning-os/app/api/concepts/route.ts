import { NextResponse } from 'next/server';
import { conceptSummaries, rebuildIndex } from '@/lib/core/indexDb';
import { createConcept, getConcept } from '@/lib/core/concepts';

export const dynamic = 'force-dynamic';

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET() {
  const summaries = conceptSummaries();
  const groups: { parent: string; concepts: typeof summaries; complete: number; total: number }[] = [];
  for (const c of summaries) {
    let g = groups.find((x) => x.parent === c.parent);
    if (!g) { g = { parent: c.parent, concepts: [], complete: 0, total: 0 }; groups.push(g); }
    g.concepts.push(c);
    g.total += 1;
    if (c.status === 'complete') g.complete += 1;
  }
  return NextResponse.json({ groups });
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b.title || !b.parent) {
    return NextResponse.json({ error: 'title and parent are required' }, { status: 400 });
  }
  const id: string = b.id ? slug(b.id) : slug(b.title);
  if (!id) return NextResponse.json({ error: 'could not derive id' }, { status: 400 });
  if (getConcept(id)) return NextResponse.json({ error: `concept "${id}" already exists` }, { status: 409 });
  const c = createConcept({ id, title: b.title, parent: b.parent, order: b.order });
  rebuildIndex();
  return NextResponse.json({ concept: c });
}
