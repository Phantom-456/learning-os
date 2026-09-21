'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/core/status';

export interface ConceptSummary {
  id: string; title: string; parent: string; order: number; status: 'not_started' | 'learning' | 'complete'; review: boolean;
}
export interface ParentGroup {
  parent: string; concepts: ConceptSummary[]; complete: number; total: number;
}

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

export default function ConceptView({ groups }: { groups: ParentGroup[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try { await fn(); router.refresh(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(null); }
  }

  function cycleStatus(c: ConceptSummary) {
    run(`s-${c.id}`, () => api(`/api/concepts/${c.id}/status`, 'POST', { action: 'advance' }));
  }
  function toggleReview(c: ConceptSummary) {
    run(`r-${c.id}`, () => api(`/api/concepts/${c.id}/status`, 'POST', { action: 'review', review: !c.review }));
  }
  function del(c: ConceptSummary) {
    if (!confirm(`Archive "${c.title}"? It is recoverable (never hard-deleted).`)) return;
    run(`d-${c.id}`, () => api(`/api/concepts/${c.id}`, 'DELETE'));
  }
  async function move(list: ConceptSummary[], idx: number, dir: number) {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[idx], b = list[j];
    run(`m-${a.id}`, async () => {
      await api(`/api/concepts/${a.id}`, 'PATCH', { order: b.order });
      await api(`/api/concepts/${b.id}`, 'PATCH', { order: a.order });
    });
  }
  function addConcept(parent: string) {
    const title = prompt(`New concept under "${parent}":`);
    if (!title) return;
    run('add', () => api('/api/concepts', 'POST', { title, parent }));
  }
  function addArea() {
    const parent = prompt('New area (parent header) name:');
    if (!parent) return;
    const title = prompt(`First concept in "${parent}":`);
    if (!title) return;
    run('area', () => api('/api/concepts', 'POST', { title, parent }));
  }

  return (
    <>
      <div className="toolbar">
        <button className="btn" onClick={addArea} disabled={busy === 'area'}>＋ Add area</button>
        <span className="spacer" />
        <span className="muted">{groups.reduce((n, g) => n + g.complete, 0)} / {groups.reduce((n, g) => n + g.total, 0)} complete</span>
      </div>

      {groups.map((g) => (
        <section key={g.parent}>
          <div className="section-title">
            {g.parent}
            <span className="meter">{g.complete}/{g.total}</span>
            <span className="spacer" style={{ flex: 1 }} />
            <button className="btn ghost sm" onClick={() => addConcept(g.parent)}>＋ concept</button>
          </div>
          <div className="cardlist">
            {g.concepts.map((c, i) => (
              <div key={c.id} className="card">
                <span className="chip" style={{ background: STATUS_COLOR[c.status] }} />
                <div className="body">
                  <Link href={`/concepts/${c.id}`} className="title">{c.title}</Link>
                  <div className="meta">
                    <span className="muted" style={{ fontSize: 12 }}>{STATUS_LABEL[c.status]}</span>
                    {c.review && <span className="badge review">review</span>}
                  </div>
                </div>
                <div className="right">
                  <button className="btn ghost sm" title="Move up" onClick={() => move(g.concepts, i, -1)}>↑</button>
                  <button className="btn ghost sm" title="Move down" onClick={() => move(g.concepts, i, 1)}>↓</button>
                  <button className="btn ghost sm" onClick={() => toggleReview(c)}>{c.review ? 'clear review' : 'review'}</button>
                  <button className="statusbtn" onClick={() => cycleStatus(c)} disabled={busy === `s-${c.id}`}>
                    <span className="sd" style={{ background: STATUS_COLOR[c.status] }} />
                    {c.status === 'complete' ? '✓ complete' : c.status === 'learning' ? 'mark complete' : 'start'}
                  </button>
                  <button className="btn ghost sm danger" onClick={() => del(c)}>✕</button>
                </div>
              </div>
            ))}
            {g.concepts.length === 0 && <div className="empty">No concepts here yet.</div>}
          </div>
        </section>
      ))}
    </>
  );
}
