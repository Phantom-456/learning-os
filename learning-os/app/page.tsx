import Link from 'next/link';
import { stats, conceptGroups, projectSummaries } from '@/lib/db';

// File-backed data — always render fresh, never statically cache.
export const dynamic = 'force-dynamic';

export default function Home() {
  const s = stats();
  const groups = conceptGroups();
  const projects = projectSummaries();
  const pct = s.conceptsTotal ? Math.round((s.conceptsComplete / s.conceptsTotal) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>One robot from zero, one concept at a time. Master a concept once — it goes green everywhere.</p>
      </div>

      <div className="tiles">
        <div className="tile"><div className="n lav">{pct}%</div><div className="l">Syllabus complete</div></div>
        <div className="tile"><div className="n green">{s.conceptsComplete}</div><div className="l">Concepts complete</div></div>
        <div className="tile"><div className="n amber">{s.conceptsLearning}</div><div className="l">Learning now</div></div>
        <div className="tile"><div className="n">{s.conceptsReview}</div><div className="l">Flagged for review</div></div>
        <div className="tile"><div className="n">{s.videos}</div><div className="l">Videos attached</div></div>
        <div className="tile"><div className="n">{s.projects}</div><div className="l">Projects</div></div>
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
              <div className="desc">{p.robot} · {p.done}/{p.milestones} milestones done</div>
            </div>
            <div className="right"><span className="btn sm">Open roadmap</span></div>
          </Link>
        ))}
        {projects.length === 0 && <div className="empty">No projects yet.</div>}
      </div>
    </>
  );
}
