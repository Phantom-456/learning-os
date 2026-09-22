'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Concept, Note, Source } from '@/lib/core/types';
import { STATUS_COLOR } from '@/lib/core/status';

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

export default function ConceptDetail({ concept, parents, sources }: { concept: Concept; parents: string[]; sources: Source[] }) {
  const router = useRouter();
  const [c, setC] = useState<Concept>(concept);
  const [srcs, setSrcs] = useState<Source[]>(sources);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [explodeOpen, setExplodeOpen] = useState(false);

  function set<K extends keyof Concept>(k: K, v: Concept[K]) { setC({ ...c, [k]: v }); }

  async function save() {
    setSaving(true); setMsg('');
    try {
      await api(`/api/concepts/${c.id}`, 'PATCH', { title: c.title, parent: c.parent, body: c.body, prereqs: c.prereqs, goal: c.goal, success_condition: c.success_condition, failure_condition: c.failure_condition });
      setMsg('Saved.'); router.refresh();
    } catch (e) { setMsg((e as Error).message); }
    finally { setSaving(false); }
  }

  async function setStatus(status: Concept['status']) {
    const r = await api(`/api/concepts/${c.id}/status`, 'POST', { action: 'set', status });
    setC({ ...c, ...r.concept }); router.refresh();
  }
  async function setReview(review: boolean) {
    const r = await api(`/api/concepts/${c.id}/status`, 'POST', { action: 'review', review });
    setC({ ...c, ...r.concept }); router.refresh();
  }

  async function addNote() {
    const text = prompt('Note text:');
    if (!text) return;
    const url = prompt('Attach a link? (leave blank to skip)');
    const note: Note = { id: `n-${Date.now()}`, date: new Date().toISOString().slice(0, 10), text, attachments: url ? [{ type: 'link', url }] : undefined };
    const notes = [...c.notes, note];
    await api(`/api/concepts/${c.id}`, 'PATCH', { notes });
    setC({ ...c, notes }); router.refresh();
  }
  async function removeNote(id: string) {
    const notes = c.notes.filter((n) => n.id !== id);
    await api(`/api/concepts/${c.id}`, 'PATCH', { notes });
    setC({ ...c, notes }); router.refresh();
  }

  async function addSource() {
    const title = prompt('Source title:');
    if (!title) return;
    const url = prompt('Source URL:');
    if (!url) return;
    const r = await api('/api/sources', 'POST', { title, url, type: 'link', concepts: [c.id] });
    setSrcs([...srcs, r.source]);
  }
  async function unlinkSource(s: Source) {
    const concepts = s.concepts.filter((cid) => cid !== c.id);
    await api(`/api/sources/${s.id}`, 'PATCH', { concepts });
    setSrcs(srcs.filter((x) => x.id !== s.id));
  }

  async function explode(reason: string, newParentCourseTitle: string) {
    try {
      await api(`/api/concepts/${c.id}/explode`, 'POST', { reason, newParentCourseTitle });
      setExplodeOpen(false);
      setMsg('Exploded into a new course.');
      router.refresh();
    } catch (e) { alert((e as Error).message); }
  }

  return (
    <>
      <Link href="/concepts" className="backlink">← All concepts</Link>
      <div className="page-head" style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 26 }}>{c.title}</h1>
        <p className="muted">{c.parent} · <code>{c.id}</code></p>
      </div>

      <div className="toolbar">
        {(['not_started', 'learning', 'complete'] as const).map((s) => (
          <button key={s} className="statusbtn" style={{ borderColor: c.status === s ? STATUS_COLOR[s] : undefined }} onClick={() => setStatus(s)}>
            <span className="sd" style={{ background: STATUS_COLOR[s] }} />
            {s.replace('_', ' ')}{c.status === s ? ' ✓' : ''}
          </button>
        ))}
        <button className="btn ghost" onClick={() => setReview(!c.review)}>{c.review ? 'Clear review flag' : 'Flag for review'}</button>
        <span className="spacer" />
        <button className="btn ghost" onClick={() => setExplodeOpen(true)}>💥 Explode Concept</button>
        <button className="btn solid" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      {msg && <p className="muted" style={{ marginTop: -8 }}>{msg}</p>}

      <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div style={{ flex: '1 1 520px', minWidth: 320 }}>
          <div className="field">
            <label>Notes (Markdown — your own words)</label>
            <textarea value={c.body} onChange={(e) => set('body', e.target.value)} />
          </div>

          <div className="section-title" style={{ marginTop: 0 }}>Notes dump</div>
          <div className="cardlist">
            {c.notes.map((n) => (
              <div key={n.id} className="card" style={{ alignItems: 'flex-start' }}>
                <span className="chip" style={{ background: 'var(--accent)' }} />
                <div className="body">
                  <div className="desc markdown-body" style={{ whiteSpace: 'normal', lineHeight: '1.6' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{n.text || ''}</ReactMarkdown>
                  </div>
                  {n.attachments?.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer" className="pill" style={{ marginTop: 6, display: 'inline-block' }}>{a.url}</a>
                  ))}
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{n.date}</div>
                </div>
                <button className="btn ghost sm danger" onClick={() => removeNote(n.id)}>✕</button>
              </div>
            ))}
            {c.notes.length === 0 && <div className="empty">No notes yet.</div>}
          </div>
          <div className="toolbar"><button className="btn sm" onClick={addNote}>＋ Add note</button></div>

          <div className="section-title">Sources</div>
          <div className="cardlist">
            {srcs.map((s) => (
              <div key={s.id} className="card">
                <span className="chip" style={{ background: 'var(--blue)' }} />
                <div className="body">
                  <a href={s.url} target="_blank" rel="noreferrer" className="title">{s.title}</a>
                  <div className="desc">{s.type}</div>
                </div>
                <button className="btn ghost sm danger" onClick={() => unlinkSource(s)}>✕</button>
              </div>
            ))}
            {srcs.length === 0 && <div className="empty">No sources yet.</div>}
          </div>
          <div className="toolbar">
            <button className="btn sm" onClick={addSource}>＋ Add source</button>
            <button className="btn solid" style={{ background: 'var(--accent)', color: '#000', border: 'none', boxShadow: '0 0 10px var(--accent)' }} onClick={() => alert('Source Skill Runner Triggered! (Placeholder)')}>⚡ Run Source Search</button>
          </div>
        </div>

        <div style={{ flex: '1 1 300px', minWidth: 260 }}>
          <div className="field">
            <label>Area (parent header)</label>
            <input list="parents" type="text" value={c.parent} onChange={(e) => set('parent', e.target.value)} />
            <datalist id="parents">{parents.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div className="field">
            <label>Title</label>
            <input type="text" value={c.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          
          <div className="quest-step" style={{ marginTop: '20px' }}>
             <div className="step-title" style={{ fontSize: '18px' }}>Concept Objectives</div>
             <div className="field" style={{ marginTop: '12px' }}>
                <label style={{ color: 'var(--accent)' }}>Goal</label>
                <textarea className="quest-textarea" value={c.goal} onChange={(e) => set('goal', e.target.value)} placeholder="What do you want to learn here?" />
             </div>
             <div className="field">
                <label style={{ color: 'var(--green)' }}>Success Condition</label>
                <textarea className="quest-textarea" value={c.success_condition} onChange={(e) => set('success_condition', e.target.value)} placeholder="How do you know you've mastered it?" />
             </div>
             <div className="field">
                <label style={{ color: 'var(--red)' }}>Failure Condition</label>
                <textarea className="quest-textarea" value={c.failure_condition} onChange={(e) => set('failure_condition', e.target.value)} placeholder="What indicates you haven't grasped it yet?" />
             </div>
          </div>
        </div>
      </div>

      {explodeOpen && <ExplodeModal onClose={() => setExplodeOpen(false)} onSubmit={explode} />}
    </>
  );
}

function ExplodeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string, newParentCourseTitle: string) => void }) {
  const [reason, setReason] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  return (
    <div className="explode-overlay" onClick={onClose}>
      <div className="explode-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Explode Concept</h2>
        <p className="hint">Break this concept into a finer-grained course, targeted at what's confusing you.</p>
        <div className="field">
          <label>Why is this hard to understand?</label>
          <textarea style={{ minHeight: 90 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. the derivation loses me at the update step" />
        </div>
        <div className="field">
          <label>New course name (nests under it)</label>
          <input type="text" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="e.g. Kalman filter, broken down" />
        </div>
        <div className="toolbar">
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn solid" disabled={!reason || !courseTitle} onClick={() => onSubmit(reason, courseTitle)}>Explode</button>
        </div>
      </div>
    </div>
  );
}
