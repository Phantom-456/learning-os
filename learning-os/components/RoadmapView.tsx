'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Project, Milestone, VideoRef } from '@/lib/types';

type ConceptIx = { id: string; title: string; status: string; review: boolean };

const M_STATUS = ['not_started', 'building', 'done'] as const;
const M_COLOR: Record<string, string> = { not_started: '#8b8b9e', building: '#e08a3c', done: '#43c59e' };
const C_COLOR: Record<string, string> = { not_started: '#8b8b9e', learning: '#e0b341', complete: '#43c59e' };

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

export default function RoadmapView({ project, concepts }: { project: Project; concepts: ConceptIx[] }) {
  const router = useRouter();
  const [p, setP] = useState<Project>(project);
  const [sel, setSel] = useState(0);
  const cmap = new Map(concepts.map((c) => [c.id, c]));

  async function persist(next: Project) {
    setP(next);
    await api(`/api/projects/${p.id}`, 'PATCH', { milestones: next.milestones });
    router.refresh();
  }
  function update(ms: Milestone[]) { persist({ ...p, milestones: ms }); }

  function editM(i: number, patch: Partial<Milestone>) {
    update(p.milestones.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  }
  function cycleStatus(i: number) {
    const cur = p.milestones[i].status;
    const next = M_STATUS[(M_STATUS.indexOf(cur) + 1) % M_STATUS.length];
    editM(i, { status: next });
  }
  function move(i: number, dir: number) {
    const j = i + dir; if (j < 0 || j >= p.milestones.length) return;
    const ms = p.milestones.slice();
    [ms[i], ms[j]] = [ms[j], ms[i]];
    setSel(j); update(ms);
  }
  function addMilestone() {
    const title = prompt('New milestone title:'); if (!title) return;
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `m-${p.milestones.length}`;
    const m: Milestone = { id, title, order: p.milestones.length, concepts: [], build: '', done_test: '', videos: [], status: 'not_started' };
    update([...p.milestones, m]); setSel(p.milestones.length);
  }
  function delMilestone(i: number) {
    if (!confirm(`Remove milestone "${p.milestones[i].title}"?`)) return;
    update(p.milestones.filter((_, j) => j !== i)); setSel(0);
  }
  function addConceptRef(i: number, cid: string) {
    if (!cid || p.milestones[i].concepts.includes(cid)) return;
    editM(i, { concepts: [...p.milestones[i].concepts, cid] });
  }
  function removeConceptRef(i: number, cid: string) {
    editM(i, { concepts: p.milestones[i].concepts.filter((x) => x !== cid) });
  }
  function addVideo(i: number) {
    const url = prompt('Video URL:'); if (!url) return;
    const kind = confirm('LONG video? OK = long, Cancel = short') ? 'long' : 'short';
    editM(i, { videos: [...p.milestones[i].videos, { url, kind } as VideoRef] });
  }
  function removeVideo(i: number, k: number) {
    editM(i, { videos: p.milestones[i].videos.filter((_, j) => j !== k) });
  }

  const m = p.milestones[sel];

  return (
    <>
      <Link href="/projects" className="backlink">← All projects</Link>
      <div className="page-head" style={{ marginBottom: 10 }}>
        <h1 style={{ fontSize: 26 }}>{p.title}</h1>
        <p className="muted">{p.robot} · {p.milestones.filter((x) => x.status === 'done').length}/{p.milestones.length} milestones done</p>
      </div>
      <p className="muted" style={{ marginTop: -6, marginBottom: 6 }}><strong>Done when:</strong> {p.definition_of_done}</p>
      {p.toolchain && <p className="muted" style={{ fontSize: 13 }}>{p.toolchain}</p>}

      <div className="toolbar"><button className="btn solid" onClick={addMilestone}>＋ Add milestone</button></div>

      <div className="roadmap">
        {/* Left: phases accordion */}
        <div className="phases">
          {p.milestones.map((mm, i) => (
            <div key={mm.id} className={`phase ${i === sel ? 'active' : ''}`} onClick={() => setSel(i)}>
              <div className="pn">Phase {i}</div>
              <div className="pt">{mm.title}</div>
              <div className="pmeta">
                <span style={{ color: M_COLOR[mm.status] }}>● {mm.status.replace('_', ' ')}</span>
                {' · '}{mm.concepts.length} concepts{mm.videos.length ? ` · ${mm.videos.length} vid` : ''}
              </div>
            </div>
          ))}
        </div>

        {/* Right: numbered timeline; selected item is fully editable */}
        <div className="timeline">
          {p.milestones.map((mm, i) => (
            <div className="tl-item" key={mm.id}>
              <span className="tl-dot" style={{ background: M_COLOR[mm.status] }} />
              <div className="tl-num">Milestone {i}</div>
              <div className="tl-title" style={{ cursor: 'pointer' }} onClick={() => setSel(i)}>{mm.title}</div>

              {i === sel && m && (
                <div className="tl-block">
                  <div className="row">
                    <button className="statusbtn" onClick={() => cycleStatus(i)}>
                      <span className="sd" style={{ background: M_COLOR[mm.status] }} />{mm.status.replace('_', ' ')}
                    </button>
                    <button className="btn ghost sm" onClick={() => move(i, -1)}>↑</button>
                    <button className="btn ghost sm" onClick={() => move(i, 1)}>↓</button>
                    <span className="spacer" />
                    <button className="btn ghost sm danger" onClick={() => delMilestone(i)}>Delete</button>
                  </div>

                  <div className="tl-label">Title</div>
                  <input type="text" value={m.title} onChange={(e) => setP({ ...p, milestones: p.milestones.map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} onBlur={() => update(p.milestones)} />

                  <div className="tl-label">Referenced concepts (green = mastered)</div>
                  <div className="tl-concepts">
                    {m.concepts.map((cid) => {
                      const ci = cmap.get(cid);
                      const st = ci?.status ?? 'not_started';
                      return (
                        <span key={cid} className="ctag">
                          <span className="cd" style={{ background: C_COLOR[st] }} />
                          <Link href={`/concepts/${cid}`}>{ci?.title ?? cid}</Link>
                          {st === 'complete' && ' ✓'}
                          {ci?.review && <span className="badge review" style={{ marginLeft: 4 }}>review</span>}
                          <button className="btn ghost sm" style={{ padding: '0 4px' }} onClick={() => removeConceptRef(i, cid)}>✕</button>
                        </span>
                      );
                    })}
                  </div>
                  <select defaultValue="" onChange={(e) => { addConceptRef(i, e.target.value); e.target.value = ''; }} style={{ marginTop: 8 }}>
                    <option value="" disabled>＋ reference a concept…</option>
                    {concepts.filter((c) => !m.concepts.includes(c.id)).map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>

                  <div className="tl-label">Robot build step</div>
                  <textarea style={{ minHeight: 70 }} value={m.build} onChange={(e) => setP({ ...p, milestones: p.milestones.map((x, j) => j === i ? { ...x, build: e.target.value } : x) })} onBlur={() => update(p.milestones)} />

                  <div className="tl-label">Done test (pass/fail)</div>
                  <textarea style={{ minHeight: 60 }} value={m.done_test ?? ''} onChange={(e) => setP({ ...p, milestones: p.milestones.map((x, j) => j === i ? { ...x, done_test: e.target.value } : x) })} onBlur={() => update(p.milestones)} />

                  <div className="tl-label">Videos</div>
                  {m.videos.map((v, k) => (
                    <div className="row" key={k} style={{ marginBottom: 5 }}>
                      <span className="badge vid">{v.kind}</span>
                      <a href={v.url} target="_blank" rel="noreferrer" className="pill" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.url}</a>
                      <button className="btn ghost sm danger" onClick={() => removeVideo(i, k)}>✕</button>
                    </div>
                  ))}
                  <button className="btn sm" onClick={() => addVideo(i)}>＋ Add video</button>
                  {m.app_notes && <div className="tl-label">App notes: <code>{m.app_notes}</code></div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
