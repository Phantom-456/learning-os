import { notFound } from 'next/navigation';
import { getConcept, getAllConcepts } from '@/lib/core/concepts';
import { sourcesForConcept } from '@/lib/core/sources';
import ConceptDetail from '@/components/ConceptDetail';

export const dynamic = 'force-dynamic';

export default async function ConceptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const concept = getConcept(id);
  if (!concept) notFound();
  const parents = Array.from(new Set(getAllConcepts(true).map((c) => c.parent)));
  const sources = sourcesForConcept(id);
  return <ConceptDetail concept={concept} parents={parents} sources={sources} />;
}
