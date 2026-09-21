import { NextResponse } from 'next/server';
import { conceptGroups, rebuildIndex } from '@/lib/db';
import { createConcept, getConcept } from '@/lib/content';

export const dynamic = 'force-dynamic';

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET() {
  return NextResponse.json({ groups: conceptGroups() });
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
