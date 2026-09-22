import re

with open('components/ConceptDetail.tsx', 'r') as f:
    content = f.read()

# Add goal, success_condition, failure_condition to save patch
content = content.replace(
    "await api(`/api/concepts/${c.id}`, 'PATCH', { title: c.title, parent: c.parent, body: c.body, prereqs: c.prereqs });",
    "await api(`/api/concepts/${c.id}`, 'PATCH', { title: c.title, parent: c.parent, body: c.body, prereqs: c.prereqs, goal: c.goal, success_condition: c.success_condition, failure_condition: c.failure_condition });"
)

# Add UI fields in the right column
new_fields = """          <div className="field">
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
          </div>"""

content = content.replace("""          <div className="field">
            <label>Title</label>
            <input type="text" value={c.title} onChange={(e) => set('title', e.target.value)} />
          </div>""", new_fields)

# Change "Notes (Markdown...)" to standard field, but stylize text rendering for .desc
# We can just add CSS classes to globals.css. We don't need react-markdown immediately if we style pre-wrap with proper font.
# And add the "Run Source Search" button

add_source_toolbar = """          </div>
          <div className="toolbar">
            <button className="btn sm" onClick={addSource}>＋ Add source</button>
            <button className="btn solid" style={{ background: 'var(--accent)', color: '#000', border: 'none', boxShadow: '0 0 10px var(--accent)' }} onClick={() => alert('Source Skill Runner Triggered! (Placeholder)')}>⚡ Run Source Search</button>
          </div>"""
content = content.replace('          </div>\n          <div className="toolbar"><button className="btn sm" onClick={addSource}>＋ Add source</button></div>', add_source_toolbar)

with open('components/ConceptDetail.tsx', 'w') as f:
    f.write(content)
