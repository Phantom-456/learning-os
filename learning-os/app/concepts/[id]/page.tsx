import { notFound } from 'next/navigation';
import { getConcept, getAllConcepts } from '@/lib/content';
import ConceptDetail from '@/components/ConceptDetail';

export const dynamic = 'force-dynamic';

export default async function ConceptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const concept = getConcept(id);
  if (!concept) notFound();
  const parents = Array.from(new Set(getAllConcepts(true).map((c) => c.parent)));
  return <ConceptDetail concept={concept} parents={parents} />;
}
