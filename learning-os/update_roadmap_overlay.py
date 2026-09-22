import re

with open('components/RoadmapView.tsx', 'r') as f:
    content = f.read()

# Replace the side panel layout with a fullscreen modal layout
# Currently:
#          <div className="quest-panel" style={{ width: '450px', flexShrink: 0,
#            backgroundImage: 'var(--bg-parchment)', 
#            backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'var(--panel)',
#            border: '2px solid var(--accent)', 
#            borderRadius: '16px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
#            position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '20px',
#            maxHeight: '90vh', overflowY: 'auto'
#          }}>

new_panel_style = """          <div className="quest-panel-overlay" style={{
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
            }}>"""

content = re.sub(
    r'<div className="quest-panel" style=\{\{\s*width: \'450px\'.*?maxHeight: \'90vh\', overflowY: \'auto\'\n\s*\}\}>',
    new_panel_style,
    content,
    flags=re.DOTALL
)

content = content.replace(
    "            </div>\n          </div>\n        )}",
    "            </div>\n          </div>\n          </div>\n        )}"
)

# Text and label changes for Prerequisites
content = content.replace(
    '<div className="step-title">Unlock Requirements</div>',
    '<div className="step-title">Edit Quest Dependencies</div>'
)
content = content.replace(
    'Select the quests you must complete before starting this one.',
    'Select the quests that MUST be completed before this quest unlocks.'
)

with open('components/RoadmapView.tsx', 'w') as f:
    f.write(content)
