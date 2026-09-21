import { NextResponse } from 'next/server';
import { projectSummaries, rebuildIndex } from '@/lib/core/indexDb';
import { createProject, getProject } from '@/lib/core/projects';

export const dynamic = 'force-dynamic';

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET() {
  return NextResponse.json({ projects: projectSummaries() });
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b.title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  const id: string = b.id ? slug(b.id) : slug(b.title);
  if (!id) return NextResponse.json({ error: 'could not derive id' }, { status: 400 });
  if (getProject(id)) return NextResponse.json({ error: `project "${id}" already exists` }, { status: 409 });
  const p = createProject({ id, title: b.title, metadata: b.metadata ?? {} });
  rebuildIndex();
  return NextResponse.json({ project: p });
}
