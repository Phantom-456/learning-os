import { NextResponse } from 'next/server';
import { getAllSources, createSource, sourcesForConcept } from '@/lib/core/sources';
import { rebuildIndex } from '@/lib/core/indexDb';

export const dynamic = 'force-dynamic';

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET(req: Request) {
  const conceptId = new URL(req.url).searchParams.get('concept');
  const sources = conceptId ? sourcesForConcept(conceptId) : getAllSources();
  return NextResponse.json({ sources });
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b.title || !b.url) return NextResponse.json({ error: 'title and url are required' }, { status: 400 });
  const id = b.id ? slug(b.id) : slug(`${b.title}-${Date.now()}`);
  const s = createSource({
    id,
    type: b.type ?? 'link',
    title: b.title,
    url: b.url,
    concepts: Array.isArray(b.concepts) ? b.concepts : [],
  });
  rebuildIndex();
  return NextResponse.json({ source: s });
}
