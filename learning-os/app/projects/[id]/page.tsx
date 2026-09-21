import { notFound } from 'next/navigation';
import { getProject } from '@/lib/core/projects';
import { getAllConcepts } from '@/lib/core/concepts';
import { getAllCourses } from '@/lib/core/courses';
import RoadmapView from '@/components/RoadmapView';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  const concepts = getAllConcepts().map((c) => ({ id: c.id, title: c.title, status: c.status, review: c.review }));
  const courses = getAllCourses().map((c) => ({ id: c.id, title: c.title }));
  return <RoadmapView project={project} concepts={concepts} courses={courses} />;
}
