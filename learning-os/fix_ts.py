with open('components/RoadmapView.tsx', 'r') as f:
    content = f.read()

content = content.replace("Math.max(0, ...Array.from(tiers.values()), 0)", "Math.max(0, ...(Array.from(tiers.values()) as number[]), 0)")

with open('components/RoadmapView.tsx', 'w') as f:
    f.write(content)
