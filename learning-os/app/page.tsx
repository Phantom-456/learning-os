import Link from 'next/link';
import { conceptSummaries, projectSummaries } from '@/lib/core/indexDb';

export const dynamic = 'force-dynamic';

export default function Home() {
  const concepts = conceptSummaries();
  const projects = projectSummaries();

  const total = concepts.length;
  const complete = concepts.filter((c) => c.status === 'complete').length;
  const learning = concepts.filter((c) => c.status === 'learning').length;
  const review = concepts.filter((c) => c.review).length;
  const pct = total ? Math.round((complete / total) * 100) : 0;

  const groups: { parent: string; complete: number; total: number }[] = [];
  for (const c of concepts) {
    let g = groups.find((x) => x.parent === c.parent);
    if (!g) { g = { parent: c.parent, complete: 0, total: 0 }; groups.push(g); }
    g.total += 1;
    if (c.status === 'complete') g.complete += 1;
  }

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>One project from zero, one concept at a time. Master a concept once — it goes green everywhere.</p>
      </div>

      <div className="tiles">
        <div className="tile"><div className="n lav">{pct}%</div><div className="l">Syllabus complete</div></div>
        <div className="tile"><div className="n green">{complete}</div><div className="l">Concepts complete</div></div>
        <div className="tile"><div className="n amber">{learning}</div><div className="l">Learning now</div></div>
        <div className="tile"><div className="n">{review}</div><div className="l">Flagged for review</div></div>
        <div className="tile"><div className="n">{projects.length}</div><div className="l">Projects</div></div>
      </div>

      <div className="section-title">Concept progress by area</div>
      <div className="cardlist">
        {groups.map((g) => {
          const gp = g.total ? Math.round((g.complete / g.total) * 100) : 0;
          return (
            <Link key={g.parent} href="/concepts" className="card">
              <span className="chip" style={{ background: 'var(--accent)' }} />
              <div className="body">
                <div className="title">{g.parent}</div>
                <div className="meta" style={{ width: 260, maxWidth: '50vw' }}>
                  <div className="progress" style={{ flex: 1 }}><i style={{ width: `${gp}%` }} /></div>
                </div>
              </div>
              <div className="right"><span className="muted">{g.complete}/{g.total}</span></div>
            </Link>
          );
        })}
      </div>

      <div className="section-title">Projects</div>
      <div className="cardlist">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="card">
            <span className="chip" style={{ background: 'var(--green)' }} />
            <div className="body">
              <div className="title">{p.title}</div>
              <div className="desc">{p.done}/{p.checkpoints} checkpoints done</div>
            </div>
            <div className="right"><span className="btn sm">Open roadmap</span></div>
          </Link>
        ))}
        {projects.length === 0 && <div className="empty">No projects yet.</div>}
      </div>
    </>
  );
}
