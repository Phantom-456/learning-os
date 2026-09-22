with open('components/RoadmapView.tsx', 'r') as f:
    content = f.read()

# Remove the incorrectly placed tiersArray at the top
import re
content = re.sub(r'  const tiersArray = useMemo.*?}, \[p.checkpoints, tiers\]\);\n\n', '', content, flags=re.DOTALL)

# Replace the mangled orderedCheckpoints with tiers and tiersArray
replacement = """  const tiers = useMemo(() => computeTiers(p.checkpoints), [p.checkpoints]);

  const tiersArray = useMemo(() => {
    const maxTier = Math.max(0, ...(Array.from(tiers.values()) as number[]), 0);
    const arr = Array.from({ length: maxTier + 1 }, () => [] as Checkpoint[]);
    p.checkpoints.forEach(cp => {
      arr[tiers.get(cp.id) ?? 0].push(cp);
    });
    return arr;
  }, [p.checkpoints, tiers]);
"""

content = content.replace("  const orderedCheckpoints = useMemo(() => computeTiers(p.checkpoints), [p.checkpoints]);", replacement)

with open('components/RoadmapView.tsx', 'w') as f:
    f.write(content)
