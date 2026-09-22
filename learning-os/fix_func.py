import re

with open('components/RoadmapView.tsx', 'r') as f:
    content = f.read()

# I will rewrite computeTiers to just return levels
new_func = """function computeTiers(checkpoints: Checkpoint[]) {
  const levels = new Map<string, number>();
  const byId = new Map(checkpoints.map((c) => [c.id, c]));
  
  function getDepth(id: string, visited = new Set<string>()): number {
    if (levels.has(id)) return levels.get(id)!;
    if (visited.has(id)) return 0; // cycle fallback
    visited.add(id);
    
    const cp = byId.get(id);
    if (!cp || !cp.depends_on || cp.depends_on.length === 0) {
      levels.set(id, 0);
      return 0;
    }
    
    let maxDep = 0;
    for (const dep of cp.depends_on) {
      maxDep = Math.max(maxDep, getDepth(dep, visited));
    }
    
    const depth = maxDep + 1;
    levels.set(id, depth);
    return depth;
  }
  
  checkpoints.forEach(cp => getDepth(cp.id));
  return levels;
}
"""

content = re.sub(r'function computeTiers.*?return ordered;\n\}\n', new_func, content, flags=re.DOTALL)

with open('components/RoadmapView.tsx', 'w') as f:
    f.write(content)
