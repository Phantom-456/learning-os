import re

with open('components/RoadmapView.tsx', 'r') as f:
    content = f.read()

# I will find the exact start of the original panel block and replace the whole tail.
# The side panel starts right after `</div>` of the map column.

split_marker = "{/* Quest Details Side Panel */}"
if split_marker in content:
    idx = content.find(split_marker)
    content = content[:idx]
else:
    print("Cannot find split marker")
    exit(1)

tail = """        {/* Quest Details Side Panel */}
        {sel !== null && cp && (
          <div style={{ 
            width: '450px', flexShrink: 0, 
            backgroundImage: 'var(--bg-parchment)', 
            backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'var(--panel)',
            border: '2px solid var(--accent)', 
            borderRadius: '16px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
            position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '20px',
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
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', marginBottom: '8px' }}>Select the quests you must complete before starting this one.</div>
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
        )}
      </div>
    </>
  );
}
"""

with open('components/RoadmapView.tsx', 'w') as f:
    f.write(content + tail)
