'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Concept, VideoRef } from '@/lib/types';

const TEMPLATE = [
  'Why it exists', 'Intuition', 'Formal definition', 'Derivation',
  'Assumptions & failure modes', 'Worked example (by hand)', 'Implementation',
  'On YOUR robot', 'Connections', 'Misconceptions & gotchas', 'Self-test', 'Hooks',
];
const STATUS_COLOR: Record<string, string> = { not_started: '#8b8b9e', learning: '#e0b341', complete: '#43c59e' };

async function api(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

export default function ConceptDetail({ concept, parents }: { concept: Concept; parents: string[] }) {
  const router = useRouter();
  const [c, setC] = useState<Concept>(concept);
  const [saving, setSaving] = useState(false);
  const [hooks, setHooks] = useState<{ hooks: string[]; structure: string[] } | null>(null);
  const [msg, setMsg] = useState<string>('');

  function set<K extends keyof Concept>(k: K, v: Concept[K]) { setC({ ...c, [k]: v }); }

  async function save() {
    setSaving(true); setMsg('');
    try {
      await api(`/api/concepts/${c.id}`, 'PATCH', {
        title: c.title, parent: c.parent, body: c.body, videos: c.videos,
        prereqs: c.prereqs, links: c.links, template_done: c.template_done,
      });
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

  function toggleSlot(slot: string) {
    const has = c.template_done.includes(slot);
    set('template_done', has ? c.template_done.filter((s) => s !== slot) : [...c.template_done, slot]);
  }

  function addVideo() {
    const url = prompt('Video URL (paste the YouTube link):');
    if (!url) return;
    const kind = confirm('Is this a LONG video? OK = long, Cancel = short') ? 'long' : 'short';
    set('videos', [...c.videos, { url, kind } as VideoRef]);
  }
  function removeVideo(i: number) { set('videos', c.videos.filter((_, j) => j !== i)); }

  async function makeReadable() {
    setMsg('Organizing into the §2 template…');
    const r = await api('/api/pipeline', 'POST', { action: 'make-readable', notes: c.body, title: c.title });
    if (confirm('Replace the note body with the organized template? (your raw text is kept inside it)')) {
      set('body', r.readable); setMsg('Body organized — remember to Save.');
    } else setMsg('');
  }
  async function genHooks(kind: 'short' | 'long') {
    const r = await api('/api/pipeline', 'POST', { action: 'hooks', readable: c.body, title: c.title, kind });
    setHooks({ hooks: r.hooks, structure: r.structure });
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
          <button key={s} className={`statusbtn`} style={{ borderColor: c.status === s ? STATUS_COLOR[s] : undefined }} onClick={() => setStatus(s)}>
            <span className="sd" style={{ background: STATUS_COLOR[s] }} />
            {s.replace('_', ' ')}{c.status === s ? ' ✓' : ''}
          </button>
        ))}
        <button className="btn ghost" onClick={() => setReview(!c.review)}>{c.review ? 'Clear review flag' : 'Flag for review'}</button>
        <span className="spacer" />
        <button className="btn solid" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      {msg && <p className="muted" style={{ marginTop: -8 }}>{msg}</p>}

      <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div style={{ flex: '1 1 520px', minWidth: 320 }}>
          <div className="field">
            <label>Notes (Markdown — your own words)</label>
            <textarea value={c.body} onChange={(e) => set('body', e.target.value)} />
          </div>
          <div className="toolbar">
            <button className="btn" onClick={makeReadable}>✨ Make readable</button>
            <button className="btn" onClick={() => genHooks('short')}>Hooks · Short</button>
            <button className="btn" onClick={() => genHooks('long')}>Structure · Long</button>
          </div>
          {hooks && (
            <div className="hookbox">
              <strong>Hook options</strong>
              <ul>{hooks.hooks.map((h, i) => <li key={i}>{h}</li>)}</ul>
              <strong>Rough structure</strong>
              <ol>{hooks.structure.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
          )}
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

          <div className="field">
            <label>Videos</label>
            {c.videos.map((v, i) => (
              <div className="row" key={i} style={{ marginBottom: 6 }}>
                <span className="badge vid">{v.kind}</span>
                <a href={v.url} target="_blank" rel="noreferrer" className="pill" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.url}</a>
                <button className="btn ghost sm danger" onClick={() => removeVideo(i)}>✕</button>
              </div>
            ))}
            <button className="btn sm" onClick={addVideo}>＋ Add video</button>
          </div>

          <div className="field">
            <label>§2 template — completed slots</label>
            {TEMPLATE.map((slot) => (
              <label key={slot} style={{ display: 'flex', gap: 8, textTransform: 'none', letterSpacing: 0, color: 'var(--text)', fontSize: 13, marginBottom: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={c.template_done.includes(slot)} onChange={() => toggleSlot(slot)} style={{ width: 'auto' }} />
                {slot}
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
