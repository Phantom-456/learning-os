import { conceptGroups } from '@/lib/db';
import ConceptView from '@/components/ConceptView';

export const dynamic = 'force-dynamic';

export default function ConceptsPage() {
  const groups = conceptGroups();
  const parents = groups.map((g) => g.parent);
  return (
    <>
      <div className="page-head">
        <h1>Concepts</h1>
        <p>Shared theory, grouped by area in learning order. Master once — it goes green in every project that references it.</p>
      </div>
      <ConceptView groups={groups} parents={parents} />
    </>
  );
}
