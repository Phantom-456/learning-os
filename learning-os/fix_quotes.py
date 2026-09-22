with open('components/RoadmapView.tsx', 'r') as f:
    content = f.read()

content = content.replace("style={{ width: \\'450px\\', flexShrink: 0,", "style={{ width: '450px', flexShrink: 0,")
content = content.replace("className: 'quest-panel', \n", "")

with open('components/RoadmapView.tsx', 'w') as f:
    f.write(content)
