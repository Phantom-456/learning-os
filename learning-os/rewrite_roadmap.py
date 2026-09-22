content = """'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, addEdge, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import type { Project, Checkpoint, Note } from '@/lib/core/types';
import { nodeTypes } from './MapNodes';

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

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 220;
const nodeHeight = 80;

function getLayoutedElements(nodes: any[], edges: any[], direction = 'TB') {
  dagreGraph.setGraph({ rankdir: direction });
  
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  dagre.layout(dagreGraph);
  
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = direction === 'TB' ? 'top' : 'left';
    node.sourcePosition = direction === 'TB' ? 'bottom' : 'right';
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return node;
  });
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
    update([...p.checkpoints, cp]); 
    setSel(p.checkpoints.length);
  }
  function delCheckpoint(i: number) {
    if (!confirm(`Remove checkpoint "${p.checkpoints[i].title}"?`)) return;
    const removedId = p.checkpoints[i].id;
    const survivors = p.checkpoints
      .filter((_, j) => j !== i)
      .map((c) => ({ ...c, depends_on: c.depends_on.filter((d) => d !== removedId) }));
    update(survivors);
    setSel(null);
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

  // Build graph elements
  const { initialNodes, initialEdges } = useMemo(() => {
    let nodes: any[] = [];
    let edges: any[] = [];
    
    p.checkpoints.forEach((cp, i) => {
      // Checkpoint Node
      nodes.push({
        id: `cp-${cp.id}`,
        type: 'checkpoint',
        data: { title: cp.title, status: cp.status, unblocked: isUnblocked(p.checkpoints, cp), index: i },
        position: { x: 0, y: 0 }
      });

      // Depends_on edges (other cp -> this cp)
      cp.depends_on.forEach(depId => {
        edges.push({
          id: `e-dep-${depId}-${cp.id}`,
          source: `cp-${depId}`,
          target: `cp-${cp.id}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'var(--muted)', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--muted)' }
        });
      });

      // Concepts
      cp.concepts.forEach(cid => {
        const cinfo = cmap.get(cid);
        if (cinfo) {
          const nid = `con-${cp.id}-${cid}`;
          nodes.push({
            id: nid,
            type: 'concept',
            data: { title: cinfo.title, status: cinfo.status },
            position: { x: 0, y: 0 }
          });
          edges.push({
            id: `e-con-${cp.id}-${cid}`,
            source: `cp-${cp.id}`,
            target: nid,
            type: 'default',
            style: { stroke: 'var(--border-2)', strokeDasharray: '4 4' }
          });
        }
      });

      // Courses
      cp.courses.forEach(cid => {
        const cinfo = courseMap.get(cid);
        if (cinfo) {
          const nid = `crs-${cp.id}-${cid}`;
          nodes.push({
            id: nid,
            type: 'course',
            data: { title: cinfo.title },
            position: { x: 0, y: 0 }
          });
          edges.push({
            id: `e-crs-${cp.id}-${cid}`,
            source: `cp-${cp.id}`,
            target: nid,
            type: 'default',
            style: { stroke: 'var(--border-2)', strokeDasharray: '4 4' }
          });
        }
      });
    });

    const layoutedNodes = getLayoutedElements(nodes, edges);
    return { initialNodes: layoutedNodes, initialEdges: edges };
  }, [p.checkpoints, cmap, courseMap]);

  const onNodeClick = useCallback((_, node: any) => {
    if (node.type === 'checkpoint') {
      setSel(node.data.index);
    }
  }, []);

  const cp = sel !== null ? p.checkpoints[sel] : null;
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

      <div style={{ display: 'flex', gap: '20px', height: '600px', width: '100%', marginBottom: '30px' }}>
        {/* Mind Map Canvas */}
        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', overflow: 'hidden' }}>
          <ReactFlow 
            nodes={initialNodes} 
            edges={initialEdges} 
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-left"
          >
            <Background color="var(--border-2)" gap={20} />
            <Controls />
          </ReactFlow>
        </div>

        {/* Side Panel Inspector */}
        {sel !== null && cp && (
          <div style={{ width: '380px', overflowY: 'auto', padding: '16px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '18px' }}>Edit Checkpoint</h3>
              <button className="btn ghost sm" onClick={() => setSel(null)}>✕</button>
            </div>
            
            <div className="field">
              <label>Title</label>
              <input type="text" value={cp.title} onChange={(e) => editCp(sel, { title: e.target.value })} />
            </div>

            <div className="row" style={{ marginBottom: '16px' }}>
              <button className="statusbtn" onClick={() => cycleStatus(sel)}>
                <span className="sd" style={{ background: CP_COLOR[cp.status] }} />{cp.status.replace('_', ' ')}
              </button>
              <span className="spacer" />
              <button className="btn ghost sm danger" onClick={() => delCheckpoint(sel)}>Delete</button>
            </div>

            <div className="tl-label">Depends on</div>
            <div className="tl-concepts">
              {p.checkpoints.filter((_, j) => j !== sel).map((other) => (
                <label key={other.id} className="ctag" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={cp.depends_on.includes(other.id)} onChange={() => toggleDependsOn(sel, other.id)} style={{ width: 'auto' }} />
                  {other.title}
                </label>
              ))}
            </div>

            <div className="tl-label">Referenced concepts</div>
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
            <select value="" onChange={(e) => { addConceptRef(sel, e.target.value); }} style={{ marginTop: 8 }}>
              <option value="" disabled>＋ reference a concept…</option>
              {concepts.filter((c) => !cp.concepts.includes(c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            <div className="tl-label">Referenced courses</div>
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
              <select value="" onChange={(e) => { addCourseRef(sel, e.target.value); }} style={{ marginTop: 8 }}>
                <option value="" disabled>＋ reference a course…</option>
                {courses.filter((c) => !cp.courses.includes(c.id)).map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}

            <div className="tl-label">Build step</div>
            <textarea style={{ minHeight: 70 }} value={cp.build ?? ''} onChange={(e) => editCp(sel, { build: e.target.value })} />

            <div className="tl-label">Done test (pass/fail)</div>
            <textarea style={{ minHeight: 60 }} value={cp.done_test ?? ''} onChange={(e) => editCp(sel, { done_test: e.target.value })} />
          </div>
        )}
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
"""
with open("components/RoadmapView.tsx", "w") as f:
    f.write(content)
