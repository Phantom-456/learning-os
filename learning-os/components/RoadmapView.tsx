'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
  return levels;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const [lines, setLines] = useState<{id: string, x1: number, y1: number, x2: number, y2: number}[]>([]);

  useEffect(() => {
    function drawLines() {
      if (!containerRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      const newLines = [];
      for (const cp of p.checkpoints) {
        const el1 = nodeRefs.current.get(cp.id);
        if (!el1) continue;
        const rect1 = el1.getBoundingClientRect();
        const y1 = rect1.top - cRect.top + rect1.height / 2;
        const x1 = rect1.left - cRect.left + rect1.width / 2;
        
        for (const depId of cp.depends_on) {
          const el2 = nodeRefs.current.get(depId);
          if (!el2) continue;
          const rect2 = el2.getBoundingClientRect();
          const y2 = rect2.top - cRect.top + rect2.height / 2;
          const x2 = rect2.left - cRect.left + rect2.width / 2;
          
          newLines.push({ id: `${cp.id}-${depId}`, x1, y1, x2, y2 });
        }
      }
      setLines(newLines);
    }
    
    // Draw immediately and on resize
    const timer = setTimeout(drawLines, 50); // slight delay to ensure DOM is settled
    window.addEventListener('resize', drawLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', drawLines);
    }
  }, [p.checkpoints]);


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

  const tiers = useMemo(() => computeTiers(p.checkpoints), [p.checkpoints]);

  const tiersArray = useMemo(() => {
    const maxTier = Math.max(0, ...(Array.from(tiers.values()) as number[]), 0);
    const arr = Array.from({ length: maxTier + 1 }, () => [] as Checkpoint[]);
    p.checkpoints.forEach(cp => {
      arr[tiers.get(cp.id) ?? 0].push(cp);
    });
    return arr;
  }, [p.checkpoints, tiers]);


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
        <div ref={containerRef} style={{ 
          flex: 1, position: 'relative', background: 'var(--bg)', borderRadius: 'var(--radius)', 
          border: '1px solid var(--border)', padding: '60px 0', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '80px'
        }}>
          {/* SVG Background Path */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {lines.map(line => {
              // Draw a smooth bezier curve for the branches
              const midY = (line.y1 + line.y2) / 2;
              const d = `M ${line.x1} ${line.y1} C ${line.x1} ${midY}, ${line.x2} ${midY}, ${line.x2} ${line.y2}`;
              return (
                <path 
                  key={line.id} d={d}
                  fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" 
                  style={{ opacity: 0.5 }}
                />
              );
            })}
          </svg>

          {/* Tiers */}
          {tiersArray.map((tierNodes, tIdx) => (
            <div key={tIdx} style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '60px', width: '100%', zIndex: 1
            }}>
              {tierNodes.map((c) => {
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

                return (
                  <div key={c.id} ref={(el) => { if (el) nodeRefs.current.set(c.id, el); else nodeRefs.current.delete(c.id); }} style={{
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
                      background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px',
                      maxWidth: '140px'
                    }}>
                      {c.title}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Quest Details Side Panel */}
        {sel !== null && cp && (
                    <div className="quest-panel-overlay" style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px'
          }}>
            <div className="quest-panel" style={{ 
              width: '100%', maxWidth: '800px',
              backgroundImage: 'var(--bg-parchment)', 
              backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'var(--panel)',
              border: '2px solid var(--accent)', 
              borderRadius: '16px', padding: '40px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
              display: 'flex', flexDirection: 'column', gap: '24px',
              maxHeight: '90vh', overflowY: 'auto'
            }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: '12px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Quest Details</div>
                <input 
                  type="text" 
                  value={cp.title} 
                  onChange={(e) => editCp(sel, { title: e.target.value })}
                  style={{ 
                    fontSize: '24px', fontFamily: 'var(--serif)', background: 'transparent', 
                    border: 'none', color: 'var(--text)', borderBottom: '1px dashed var(--accent)', 
                    padding: '4px 0', width: '90%', outline: 'none', textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                  }} 
                />
              </div>
              <button className="btn ghost sm" style={{ color: 'var(--accent)' }} onClick={() => setSel(null)}>✕</button>
            </div>

            <div className="row">
              <button className="statusbtn" onClick={() => cycleStatus(sel)} style={{ fontSize: '14px', padding: '6px 12px', border: '1px solid var(--accent)' }}>
                <span className="sd" style={{ background: CP_COLOR[cp.status], boxShadow: `0 0 10px ${CP_COLOR[cp.status]}` }} />
                {cp.status.replace('_', ' ').toUpperCase()}
              </button>
              <span className="spacer" />
              <button className="btn ghost sm danger" onClick={() => delCheckpoint(sel)}>Abandon Quest</button>
            </div>

            {/* Step 1: Prerequisites */}
            <div className="quest-step">
              <div className="step-header"><span className="step-num">1</span> <span className="step-title">Unlock Requirements</span></div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', marginBottom: '8px' }}>Select the quests that MUST be completed before this quest unlocks.</div>
              <div className="tl-concepts" style={{ marginTop: '10px' }}>
                {p.checkpoints.filter((_, j) => j !== sel).map((other) => {
                  const isDep = cp.depends_on.includes(other.id);
                  return (
                    <label key={other.id} className="ctag" style={{ cursor: 'pointer', opacity: isDep ? 1 : 0.6, border: isDep ? '1px solid var(--accent)' : '1px solid var(--border-2)', background: isDep ? 'rgba(255,225,53,0.1)' : 'transparent' }}>
                      <input type="checkbox" checked={isDep} onChange={() => toggleDependsOn(sel, other.id)} style={{ display: 'none' }} />
                      {other.title}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Skill Tree */}
            <div className="quest-step">
              <div className="step-header"><span className="step-num">2</span> <span className="step-title">Required Lore & Skills</span></div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', marginBottom: '8px' }}>Attach concepts and courses needed for this quest.</div>
              
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="tl-concepts">
                  {cp.concepts.map((cid) => {
                    const ci = cmap.get(cid);
                    const st = ci?.status ?? 'not_started';
                    return (
                      <span key={cid} className="ctag" style={{ border: '1px solid var(--border-2)' }}>
                        <span className="cd" style={{ background: C_COLOR[st], boxShadow: `0 0 8px ${C_COLOR[st]}` }} />
                        <Link href={`/concepts/${cid}`}>{ci?.title ?? cid}</Link>
                        <button className="btn ghost sm" style={{ padding: '0 4px', color: 'var(--muted)' }} onClick={() => removeConceptRef(sel, cid)}>✕</button>
                      </span>
                    );
                  })}
                </div>
                <select value="" onChange={(e) => { addConceptRef(sel, e.target.value); }} className="quest-select">
                  <option value="" disabled>＋ Acquire Concept...</option>
                  {concepts.filter((c) => !cp.concepts.includes(c.id)).map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>

                <div className="tl-concepts">
                  {cp.courses.map((courseId) => {
                    const co = courses.find((x) => x.id === courseId);
                    return <span key={courseId} className="ctag" style={{ border: '1px solid var(--border-2)' }}>
                      {co?.title ?? courseId}
                      <button className="btn ghost sm" style={{ padding: '0 4px', color: 'var(--muted)' }} onClick={() => removeCourseRef(sel, courseId)}>✕</button>
                    </span>;
                  })}
                </div>
                {courses.length > 0 && (
                  <select value="" onChange={(e) => { addCourseRef(sel, e.target.value); }} className="quest-select">
                    <option value="" disabled>＋ Acquire Course...</option>
                    {courses.filter((c) => !cp.courses.includes(c.id)).map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Step 3: Main Quest */}
            <div className="quest-step">
              <div className="step-header"><span className="step-num">3</span> <span className="step-title">The Mission</span></div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Describe the action step or what needs to be built.</div>
              <textarea 
                className="quest-textarea" 
                placeholder="What must be done..."
                value={cp.build ?? ''} 
                onChange={(e) => editCp(sel, { build: e.target.value })} 
              />
            </div>

            {/* Step 4: Victory */}
            <div className="quest-step">
              <div className="step-header"><span className="step-num">4</span> <span className="step-title">Victory Condition</span></div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>How do you know you have completed this level?</div>
              <textarea 
                className="quest-textarea" 
                placeholder="Success criteria..."
                value={cp.done_test ?? ''} 
                onChange={(e) => editCp(sel, { done_test: e.target.value })} 
              />
            </div>
          </div>
          </div>
        )}
      </div>
    </>
  );
}
