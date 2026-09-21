import { notFound } from 'next/navigation';
import { getProject, getAllConcepts } from '@/lib/content';
import RoadmapView from '@/components/RoadmapView';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  const concepts = getAllConcepts().map((c) => ({ id: c.id, title: c.title, status: c.status, review: c.review }));
  return <RoadmapView project={project} concepts={concepts} />;
}
