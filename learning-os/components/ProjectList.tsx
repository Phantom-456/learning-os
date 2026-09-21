'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProjectSummary } from '@/lib/core/indexDb';

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

export default function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function addProject() {
    const title = prompt('New project name:');
    if (!title) return;
    setBusy(true);
    try { await api('/api/projects', 'POST', { title }); router.refresh(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }
  async function del(p: ProjectSummary) {
    if (!confirm(`Archive "${p.title}"? Soft-deleted and recoverable.`)) return;
    try { await api(`/api/projects/${p.id}`, 'DELETE'); router.refresh(); }
    catch (e) { alert((e as Error).message); }
  }

  return (
    <>
      <div className="toolbar">
        <button className="btn solid" onClick={addProject} disabled={busy}>＋ New project</button>
      </div>
      <div className="cardlist">
        {projects.map((p) => {
          const pct = p.checkpoints ? Math.round((p.done / p.checkpoints) * 100) : 0;
          return (
            <div key={p.id} className="card">
              <span className="chip" style={{ background: 'var(--green)' }} />
              <div className="body">
                <Link href={`/projects/${p.id}`} className="title">{p.title}</Link>
                <div className="desc">{p.done}/{p.checkpoints} checkpoints done · {pct}%</div>
              </div>
              <div className="right">
                <Link href={`/projects/${p.id}`} className="btn sm solid">Open roadmap</Link>
                <button className="btn ghost sm danger" onClick={() => del(p)}>✕</button>
              </div>
            </div>
          );
        })}
        {projects.length === 0 && <div className="empty">No projects yet. Create one to start a roadmap.</div>}
      </div>
    </>
  );
}
