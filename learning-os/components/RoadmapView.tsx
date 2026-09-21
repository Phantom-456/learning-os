'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Project, Checkpoint, Note } from '@/lib/core/types';

type ConceptIx = { id: string; title: string; status: string; review: boolean };
type CourseIx = { id: string; title: string };

const CP_STATUS = ['not_started', 'building', 'done'] as const;
const CP_COLOR: Record<string, string> = { not_started: '#8b8b9e', building: '#e08a3c', done: '#43c59e' };
const C_COLOR: Record<string, string> = { not_started: '#8b8b9e', learning: '#e0b341', complete: '#43c59e' };

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

// Reimplemented inline (not imported from lib/core/projects, which is server-only):
// a checkpoint is unblocked when it isn't done and every dependency is done.
function isUnblocked(checkpoints: Checkpoint[], cp: Checkpoint): boolean {
  if (cp.status === 'done') return false;
  const byId = new Map(checkpoints.map((c) => [c.id, c]));
  return cp.depends_on.every((d) => byId.get(d)?.status === 'done');
}

export default function RoadmapView({ project, concepts, courses }: { project: Project; concepts: ConceptIx[]; courses: CourseIx[] }) {
  const router = useRouter();
  const [p, setP] = useState<Project>(project);
  const [sel, setSel] = useState(0);
  const [err, setErr] = useState('');
  const cmap = new Map(concepts.map((c) => [c.id, c]));

  async function persist(next: Project) {
    setP(next); setErr('');
    try {
      await api(`/api/projects/${p.id}`, 'PATCH', { checkpoints: next.checkpoints });
      router.refresh();
    } catch (e) { setErr((e as Error).message); }
  }
  function update(cps: Checkpoint[]) { persist({ ...p, checkpoints: cps }); }

  function editCp(i: number, patch: Partial<Checkpoint>) {
    update(p.checkpoints.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }
  function cycleStatus(i: number) {
    const cur = p.checkpoints[i].status;
    const next = CP_STATUS[(CP_STATUS.indexOf(cur) + 1) % CP_STATUS.length];
    editCp(i, { status: next });
  }
  function addCheckpoint() {
    const title = prompt('New checkpoint title:'); if (!title) return;
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cp-${p.checkpoints.length}`;
    const cp: Checkpoint = { id, title, depends_on: [], courses: [], concepts: [], status: 'not_started' };
    update([...p.checkpoints, cp]); setSel(p.checkpoints.length);
  }
  function delCheckpoint(i: number) {
    if (!confirm(`Remove checkpoint "${p.checkpoints[i].title}"?`)) return;
    update(p.checkpoints.filter((_, j) => j !== i)); setSel(0);
  }
  function toggleDependsOn(i: number, depId: string) {
    const cp = p.checkpoints[i];
    const has = cp.depends_on.includes(depId);
    editCp(i, { depends_on: has ? cp.depends_on.filter((d) => d !== depId) : [...cp.depends_on, depId] });
  }
  function addConceptRef(i: number, cid: string) {
    if (!cid || p.checkpoints[i].concepts.includes(cid)) return;
    editCp(i, { concepts: [...p.checkpoints[i].concepts, cid] });
  }
  function removeConceptRef(i: number, cid: string) {
    editCp(i, { concepts: p.checkpoints[i].concepts.filter((x) => x !== cid) });
  }
  function addCourseRef(i: number, courseId: string) {
    if (!courseId || p.checkpoints[i].courses.includes(courseId)) return;
    editCp(i, { courses: [...p.checkpoints[i].courses, courseId] });
  }
  async function addProjectNote() {
    const text = prompt('Note text:'); if (!text) return;
    const note: Note = { id: `n-${Date.now()}`, date: new Date().toISOString().slice(0, 10), text };
    await persist({ ...p, notes: [...p.notes, note] });
  }

  const cp = p.checkpoints[sel];
  const done = p.checkpoints.filter((x) => x.status === 'done').length;

  return (
    <>
      <Link href="/projects" className="backlink">← All projects</Link>
      <div className="page-head" style={{ marginBottom: 10 }}>
        <h1 style={{ fontSize: 26 }}>{p.title}</h1>
        <p className="muted">{done}/{p.checkpoints.length} checkpoints done</p>
      </div>
      {p.metadata && Object.keys(p.metadata).length > 0 && (
        <p className="muted" style={{ marginTop: -6, marginBottom: 6, fontSize: 13 }}>
          {Object.entries(p.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')}
        </p>
      )}
      {err && <p className="muted" style={{ color: 'var(--red)' }}>{err}</p>}

      <div className="toolbar"><button className="btn solid" onClick={addCheckpoint}>＋ Add checkpoint</button></div>

      <div className="roadmap">
        <div className="phases">
          {p.checkpoints.map((c, i) => {
            const unblocked = isUnblocked(p.checkpoints, c);
            return (
              <div key={c.id} className={`phase ${i === sel ? 'active' : ''}`} onClick={() => setSel(i)}>
                <div className="pn">{unblocked ? '● Unblocked' : c.status === 'done' ? 'Done' : 'Blocked'}</div>
                <div className="pt">{c.title}</div>
                <div className="pmeta">
                  <span style={{ color: CP_COLOR[c.status] }}>● {c.status.replace('_', ' ')}</span>
                  {' · '}{c.concepts.length} concepts
                </div>
              </div>
            );
          })}
        </div>

        <div className="timeline">
          {p.checkpoints.map((c, i) => (
            <div className="tl-item" key={c.id}>
              <span className="tl-dot" style={{ background: CP_COLOR[c.status] }} />
              <div className="tl-title" style={{ cursor: 'pointer' }} onClick={() => setSel(i)}>{c.title}</div>

              {i === sel && cp && (
                <div className="tl-block">
                  <div className="row">
                    <button className="statusbtn" onClick={() => cycleStatus(i)}>
                      <span className="sd" style={{ background: CP_COLOR[cp.status] }} />{cp.status.replace('_', ' ')}
                    </button>
                    <span className="spacer" />
                    <button className="btn ghost sm danger" onClick={() => delCheckpoint(i)}>Delete</button>
                  </div>

                  <div className="tl-label">Depends on</div>
                  <div className="tl-concepts">
                    {p.checkpoints.filter((_, j) => j !== i).map((other) => (
                      <label key={other.id} className="ctag" style={{ cursor: 'pointer' }}>
                        <input type="checkbox" checked={cp.depends_on.includes(other.id)} onChange={() => toggleDependsOn(i, other.id)} style={{ width: 'auto' }} />
                        {other.title}
                      </label>
                    ))}
                  </div>

                  <div className="tl-label">Referenced concepts (green = mastered)</div>
                  <div className="tl-concepts">
                    {cp.concepts.map((cid) => {
                      const ci = cmap.get(cid);
                      const st = ci?.status ?? 'not_started';
                      return (
                        <span key={cid} className="ctag">
                          <span className="cd" style={{ background: C_COLOR[st] }} />
                          <Link href={`/concepts/${cid}`}>{ci?.title ?? cid}</Link>
                          {st === 'complete' && ' ✓'}
                          <button className="btn ghost sm" style={{ padding: '0 4px' }} onClick={() => removeConceptRef(i, cid)}>✕</button>
                        </span>
                      );
                    })}
                  </div>
                  <select defaultValue="" onChange={(e) => { addConceptRef(i, e.target.value); e.target.value = ''; }} style={{ marginTop: 8 }}>
                    <option value="" disabled>＋ reference a concept…</option>
                    {concepts.filter((c) => !cp.concepts.includes(c.id)).map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>

                  <div className="tl-label">Referenced courses</div>
                  <div className="tl-concepts">
                    {cp.courses.map((courseId) => {
                      const co = courses.find((x) => x.id === courseId);
                      return <span key={courseId} className="ctag">{co?.title ?? courseId}</span>;
                    })}
                  </div>
                  {courses.length > 0 && (
                    <select defaultValue="" onChange={(e) => { addCourseRef(i, e.target.value); e.target.value = ''; }} style={{ marginTop: 8 }}>
                      <option value="" disabled>＋ reference a course…</option>
                      {courses.filter((c) => !cp.courses.includes(c.id)).map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  )}

                  <div className="tl-label">Build step</div>
                  <textarea style={{ minHeight: 70 }} value={cp.build ?? ''} onChange={(e) => setP({ ...p, checkpoints: p.checkpoints.map((x, j) => j === i ? { ...x, build: e.target.value } : x) })} onBlur={() => update(p.checkpoints)} />

                  <div className="tl-label">Done test (pass/fail)</div>
                  <textarea style={{ minHeight: 60 }} value={cp.done_test ?? ''} onChange={(e) => setP({ ...p, checkpoints: p.checkpoints.map((x, j) => j === i ? { ...x, done_test: e.target.value } : x) })} onBlur={() => update(p.checkpoints)} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">Project notes</div>
      <div className="cardlist">
        {p.notes.map((n) => (
          <div key={n.id} className="card">
            <span className="chip" style={{ background: 'var(--accent)' }} />
            <div className="body"><div className="desc" style={{ whiteSpace: 'pre-wrap' }}>{n.text}</div></div>
          </div>
        ))}
        {p.notes.length === 0 && <div className="empty">No notes yet.</div>}
      </div>
      <div className="toolbar"><button className="btn sm" onClick={addProjectNote}>＋ Add note</button></div>
    </>
  );
}
