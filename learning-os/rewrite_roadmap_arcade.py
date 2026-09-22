import re

content = """'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Shield, Lock, Star } from 'lucide-react';
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

function isUnblocked(checkpoints: Checkpoint[], cp: Checkpoint): boolean {
  if (cp.status === 'done') return false;
  const byId = new Map(checkpoints.map((c) => [c.id, c]));
  return cp.depends_on.every((d) => byId.get(d)?.status === 'done');
}

// Compute topological tiers
function computeTiers(checkpoints: Checkpoint[]) {
  const levels = new Map<string, number>();
  const byId = new Map(checkpoints.map((c) => [c.id, c]));
  
  function getDepth(id: string, visited = new Set<string>()): number {
    if (levels.has(id)) return levels.get(id)!;
    if (visited.has(id)) return 0; // cycle fallback
    visited.add(id);
    
    const cp = byId.get(id);
    if (!cp || !cp.depends_on || cp.depends_on.length === 0) {
      levels.set(id, 0);
      return 0;
    }
    
    let maxDep = 0;
    for (const dep of cp.depends_on) {
      maxDep = Math.max(maxDep, getDepth(dep, visited));
    }
    
    const depth = maxDep + 1;
    levels.set(id, depth);
    return depth;
  }
  
  checkpoints.forEach(cp => getDepth(cp.id));
  
  const tiers: Checkpoint[][] = [];
  checkpoints.forEach(cp => {
    const d = levels.get(cp.id) || 0;
    if (!tiers[d]) tiers[d] = [];
    tiers[d].push(cp);
  });
  
  // Flatten into a single ordered path
  const ordered: Checkpoint[] = [];
  for (let i = 0; i < tiers.length; i++) {
    if (tiers[i]) ordered.push(...tiers[i]);
  }
  
  return ordered;
}

export default function RoadmapView({ project, concepts, courses }: { project: Project; concepts: ConceptIx[]; courses: CourseIx[] }) {
  const router = useRouter();
  const [p, setP] = useState<Project>(project);
  const [sel, setSel] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const cmap = new Map(concepts.map((c) => [c.id, c]));
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  async function persist(next: Project) {
    const prev = p;
    setP(next); setErr('');
    try {
      await api(`/api/projects/${p.id}`, 'PATCH', { checkpoints: next.checkpoints, notes: next.notes });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setP(prev);
    }
  }
  function update(cps: Checkpoint[]) { persist({ ...p, checkpoints: cps }); }

  function editCp(idx: number, patch: Partial<Checkpoint>) {
    update(p.checkpoints.map((c, j) => (j === idx ? { ...c, ...patch } : c)));
  }
  function cycleStatus(idx: number) {
    const cur = p.checkpoints[idx].status;
    const next = CP_STATUS[(CP_STATUS.indexOf(cur) + 1) % CP_STATUS.length];
    editCp(idx, { status: next });
  }
  function addCheckpoint() {
    const title = prompt('New checkpoint title:'); if (!title) return;
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cp-${p.checkpoints.length}`;
    const cp: Checkpoint = { id, title, depends_on: [], courses: [], concepts: [], status: 'not_started' };
    update([...p.checkpoints, cp]); 
    setSel(p.checkpoints.length);
  }
  function delCheckpoint(idx: number) {
    if (!confirm(`Remove checkpoint "${p.checkpoints[idx].title}"?`)) return;
    const removedId = p.checkpoints[idx].id;
    const survivors = p.checkpoints
      .filter((_, j) => j !== idx)
      .map((c) => ({ ...c, depends_on: c.depends_on.filter((d) => d !== removedId) }));
    update(survivors);
    setSel(null);
  }
  function toggleDependsOn(idx: number, depId: string) {
    const cp = p.checkpoints[idx];
    const has = cp.depends_on.includes(depId);
    editCp(idx, { depends_on: has ? cp.depends_on.filter((d) => d !== depId) : [...cp.depends_on, depId] });
  }
  function addConceptRef(idx: number, cid: string) {
    if (!cid || p.checkpoints[idx].concepts.includes(cid)) return;
    editCp(idx, { concepts: [...p.checkpoints[idx].concepts, cid] });
  }
  function removeConceptRef(idx: number, cid: string) {
    editCp(idx, { concepts: p.checkpoints[idx].concepts.filter((x) => x !== cid) });
  }
  function addCourseRef(idx: number, courseId: string) {
    if (!courseId || p.checkpoints[idx].courses.includes(courseId)) return;
    editCp(idx, { courses: [...p.checkpoints[idx].courses, courseId] });
  }
  function removeCourseRef(idx: number, cid: string) {
    editCp(idx, { courses: p.checkpoints[idx].courses.filter((x) => x !== cid) });
  }
  async function addProjectNote() {
    const text = prompt('Note text:'); if (!text) return;
    const note: Note = { id: `n-${Date.now()}`, date: new Date().toISOString().slice(0, 10), text };
    await persist({ ...p, notes: [...p.notes, note] });
  }

  const cp = sel !== null ? p.checkpoints[sel] : null;
  const doneCount = p.checkpoints.filter((x) => x.status === 'done').length;

  const orderedCheckpoints = useMemo(() => computeTiers(p.checkpoints), [p.checkpoints]);

  return (
    <>
      <Link href="/projects" className="backlink">← All projects</Link>
      <div className="page-head" style={{ marginBottom: 10 }}>
        <h1 style={{ fontSize: 26 }}>{p.title}</h1>
        <p className="muted">{doneCount}/{p.checkpoints.length} checkpoints done</p>
      </div>
      {err && <p className="muted" style={{ color: 'var(--red)' }}>{err}</p>}

      <div className="toolbar"><button className="btn solid" onClick={addCheckpoint}>＋ Add checkpoint</button></div>

      <div style={{ display: 'flex', gap: '40px', minHeight: '600px', width: '100%', marginBottom: '40px', alignItems: 'flex-start' }}>
        
        {/* Arcade Map Column */}
        <div style={{ 
          flex: 1, position: 'relative', background: 'var(--bg)', borderRadius: 'var(--radius)', 
          border: '1px solid var(--border)', padding: '40px 0', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          {/* SVG Background Path */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            <path 
              d={`M 50% 40 ` + orderedCheckpoints.map((_, i) => {
                const y = 40 + (i * 120);
                const xOffset = i % 2 === 0 ? '-60px' : '+60px';
                return `L calc(50% ${xOffset}) ${y}`;
              }).join(' ')} 
              fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinejoin="round" 
              style={{ opacity: 0.3 }}
            />
          </svg>

          {/* Nodes */}
          {orderedCheckpoints.map((c, i) => {
            const originalIndex = p.checkpoints.findIndex(x => x.id === c.id);
            const isDone = c.status === 'done';
            const isBuilding = c.status === 'building';
            const unblocked = isUnblocked(p.checkpoints, c);
            const isLocked = !isDone && !isBuilding && !unblocked;
            const isStart = c.depends_on.length === 0;

            const size = 64;
            const bgColor = isDone ? 'var(--panel-2)' : isBuilding ? 'var(--panel)' : unblocked ? 'var(--panel)' : 'rgba(0,0,0,0.6)';
            const borderColor = isDone ? 'var(--accent)' : isBuilding ? 'var(--amber)' : unblocked ? 'var(--text)' : 'var(--border-2)';
            const glow = isBuilding || (unblocked && !isDone) ? '0 0 20px var(--amber)' : isDone ? '0 0 15px var(--accent)' : 'none';
            const pulseClass = (isBuilding || (unblocked && !isDone)) ? 'pulse-glow' : '';
            
            // Arcade zigzag pattern
            const xOffset = i % 2 === 0 ? -60 : 60;

            return (
              <div key={c.id} style={{
                position: 'relative', zIndex: 1, 
                transform: `translateX(${xOffset}px)`,
                marginBottom: i === orderedCheckpoints.length - 1 ? 0 : '56px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: 'pointer', filter: isLocked ? 'grayscale(0.8) opacity(0.6)' : 'none'
              }} onClick={() => setSel(originalIndex)}>
                
                <div className={pulseClass} style={{
                  width: `${size}px`, height: `${size}px`, borderRadius: '50%',
                  background: bgColor, border: `3px solid ${borderColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: glow, transition: 'all 0.2s',
                  transform: sel === originalIndex ? 'scale(1.15)' : 'scale(1)'
                }}>
                  {isStart ? <Star size={30} color={isDone ? 'var(--accent)' : 'var(--text)'} /> : 
                   isDone ? <ShieldCheck size={30} color="var(--accent)" /> : 
                   isLocked ? <Lock size={26} color="var(--muted-2)" /> : 
                   <Shield size={30} color="var(--text)" />}
                </div>

                <div style={{
                  marginTop: '10px', fontFamily: 'var(--serif)', fontSize: '14px', 
                  fontWeight: 'bold', color: isDone ? 'var(--accent)' : 'var(--text)', 
                  textAlign: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px'
                }}>
                  {c.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Editing Side Panel */}
        {sel !== null && cp && (
          <div style={{ 
            width: '400px', flexShrink: 0, background: 'var(--panel)', border: '1px solid var(--border)', 
            borderRadius: 'var(--radius)', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            position: 'sticky', top: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '20px', color: 'var(--accent)' }}>Level Details</h3>
              <button className="btn ghost sm" onClick={() => setSel(null)}>✕</button>
            </div>
            
            <div className="field">
              <label>Quest Name</label>
              <input type="text" value={cp.title} onChange={(e) => editCp(sel, { title: e.target.value })} />
            </div>

            <div className="row" style={{ marginBottom: '24px' }}>
              <button className="statusbtn" onClick={() => cycleStatus(sel)}>
                <span className="sd" style={{ background: CP_COLOR[cp.status] }} />{cp.status.replace('_', ' ')}
              </button>
              <span className="spacer" />
              <button className="btn ghost sm danger" onClick={() => delCheckpoint(sel)}>Delete Level</button>
            </div>

            <div className="tl-label">Prerequisite Levels</div>
            <div className="tl-concepts" style={{ marginBottom: '20px' }}>
              {p.checkpoints.filter((_, j) => j !== sel).map((other) => (
                <label key={other.id} className="ctag" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={cp.depends_on.includes(other.id)} onChange={() => toggleDependsOn(sel, other.id)} style={{ width: 'auto' }} />
                  {other.title}
                </label>
              ))}
            </div>

            <div className="tl-label">Attached Concepts (Skill Tree)</div>
            <div className="tl-concepts">
              {cp.concepts.map((cid) => {
                const ci = cmap.get(cid);
                const st = ci?.status ?? 'not_started';
                return (
                  <span key={cid} className="ctag">
                    <span className="cd" style={{ background: C_COLOR[st] }} />
                    <Link href={`/concepts/${cid}`}>{ci?.title ?? cid}</Link>
                    {st === 'complete' && ' ✓'}
                    <button className="btn ghost sm" style={{ padding: '0 4px' }} onClick={() => removeConceptRef(sel, cid)}>✕</button>
                  </span>
                );
              })}
            </div>
            <select value="" onChange={(e) => { addConceptRef(sel, e.target.value); }} style={{ marginTop: 8, marginBottom: '20px' }}>
              <option value="" disabled>＋ Link a concept…</option>
              {concepts.filter((c) => !cp.concepts.includes(c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            <div className="tl-label">Attached Courses</div>
            <div className="tl-concepts">
              {cp.courses.map((courseId) => {
                const co = courses.find((x) => x.id === courseId);
                return <span key={courseId} className="ctag">
                  {co?.title ?? courseId}
                  <button className="btn ghost sm" style={{ padding: '0 4px', marginLeft: 4 }} onClick={() => removeCourseRef(sel, courseId)}>✕</button>
                </span>;
              })}
            </div>
            {courses.length > 0 && (
              <select value="" onChange={(e) => { addCourseRef(sel, e.target.value); }} style={{ marginTop: 8, marginBottom: '20px' }}>
                <option value="" disabled>＋ Link a course…</option>
                {courses.filter((c) => !cp.courses.includes(c.id)).map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}

            <div className="tl-label">Build / Action Step</div>
            <textarea style={{ minHeight: 70, marginBottom: '20px' }} value={cp.build ?? ''} onChange={(e) => editCp(sel, { build: e.target.value })} />

            <div className="tl-label">Success Criteria (Pass/Fail)</div>
            <textarea style={{ minHeight: 60 }} value={cp.done_test ?? ''} onChange={(e) => editCp(sel, { done_test: e.target.value })} />
          </div>
        )}
      </div>
    </>
  );
}
"""
with open("components/RoadmapView.tsx", "w") as f:
    f.write(content)
