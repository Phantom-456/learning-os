import { NextResponse } from 'next/server';
import { getCourse, createCourse } from '@/lib/core/courses';
import { getConcept } from '@/lib/core/concepts';
import { explodeConcept } from '@/lib/core/explode';
import { rebuildIndex } from '@/lib/core/indexDb';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// POST { reason: string, parentCourseId?: string, newParentCourseTitle?: string }
// Exactly one of parentCourseId (use an existing course) or newParentCourseTitle
// (create one, seeded with this concept as a member) must be given.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const b = await req.json();
  if (!b.reason) return NextResponse.json({ error: 'reason is required' }, { status: 400 });
  if (!getConcept(id)) return NextResponse.json({ error: `Concept not found: ${id}` }, { status: 404 });

  let parentCourseId: string | undefined = b.parentCourseId;
  if (!parentCourseId) {
    if (!b.newParentCourseTitle) {
      return NextResponse.json({ error: 'parentCourseId or newParentCourseTitle is required' }, { status: 400 });
    }
    const newId = slug(b.newParentCourseTitle);
    if (getCourse(newId)) {
      return NextResponse.json({ error: `course "${newId}" already exists` }, { status: 409 });
    }
    createCourse({ id: newId, title: b.newParentCourseTitle, kind: 'authored', concepts: [id] });
    parentCourseId = newId;
  }

  try {
    const course = explodeConcept(id, parentCourseId, b.reason);
    rebuildIndex();
    return NextResponse.json({ course });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
