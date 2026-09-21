import { conceptSummaries } from '@/lib/core/indexDb';
import ConceptView, { type ParentGroup } from '@/components/ConceptView';

export const dynamic = 'force-dynamic';

export default function ConceptsPage() {
  const summaries = conceptSummaries();
  const groups: ParentGroup[] = [];
  for (const c of summaries) {
    let g = groups.find((x) => x.parent === c.parent);
    if (!g) { g = { parent: c.parent, concepts: [], complete: 0, total: 0 }; groups.push(g); }
    g.concepts.push(c);
    g.total += 1;
    if (c.status === 'complete') g.complete += 1;
  }
  return (
    <>
      <div className="page-head">
        <h1>Concepts</h1>
        <p>Shared theory, grouped by area in learning order. Master once — it goes green in every project that references it.</p>
      </div>
      <ConceptView groups={groups} />
    </>
  );
}
