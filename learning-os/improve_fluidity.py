import re

with open('app/globals.css', 'r') as f:
    css = f.read()

fluidity_css = """
/* Fluidity & Animations */
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}

.quest-panel {
  animation: slideInRight 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

/* Gamified Custom Scrollbar */
::-webkit-scrollbar {
  width: 10px;
}
::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
}
::-webkit-scrollbar-thumb {
  background: var(--accent);
  border-radius: 8px;
  border: 2px solid rgba(0,0,0,0.5);
}
::-webkit-scrollbar-thumb:hover {
  background: #ffea70;
}
"""

if "/* Fluidity & Animations */" not in css:
    css += "\n" + fluidity_css
    with open('app/globals.css', 'w') as f:
        f.write(css)

with open('components/RoadmapView.tsx', 'r') as f:
    roadmap = f.read()

# Add className="quest-panel" to the side panel
roadmap = roadmap.replace("width: '450px', flexShrink: 0,", "width: '450px', flexShrink: 0,\n            className: 'quest-panel',")
# wait, it's a style object in JSX, I should just insert className="quest-panel"
roadmap = re.sub(r'(<div style=\{\{\s*width: \'450px\')', r'<div className="quest-panel" style={{ width: \'450px\'', roadmap)

with open('components/RoadmapView.tsx', 'w') as f:
    f.write(roadmap)

