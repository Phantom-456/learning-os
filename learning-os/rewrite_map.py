import re

with open('components/RoadmapView.tsx', 'r') as f:
    content = f.read()

# Fix imports
content = content.replace("import { useState, useMemo } from 'react';", "import { useState, useMemo, useRef, useEffect } from 'react';")

# Add ref and lines state inside RoadmapView
state_injection = """  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const [lines, setLines] = useState<{id: string, x1: number, y1: number, x2: number, y2: number}[]>([]);

  useEffect(() => {
    function drawLines() {
      if (!containerRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      const newLines = [];
      for (const cp of p.checkpoints) {
        const el1 = nodeRefs.current.get(cp.id);
        if (!el1) continue;
        const rect1 = el1.getBoundingClientRect();
        const y1 = rect1.top - cRect.top + rect1.height / 2;
        const x1 = rect1.left - cRect.left + rect1.width / 2;
        
        for (const depId of cp.depends_on) {
          const el2 = nodeRefs.current.get(depId);
          if (!el2) continue;
          const rect2 = el2.getBoundingClientRect();
          const y2 = rect2.top - cRect.top + rect2.height / 2;
          const x2 = rect2.left - cRect.left + rect2.width / 2;
          
          newLines.push({ id: `${cp.id}-${depId}`, x1, y1, x2, y2 });
        }
      }
      setLines(newLines);
    }
    
    // Draw immediately and on resize
    const timer = setTimeout(drawLines, 50); // slight delay to ensure DOM is settled
    window.addEventListener('resize', drawLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', drawLines);
    }
  }, [p.checkpoints]);

  const tiersArray = useMemo(() => {
    const maxTier = Math.max(0, ...Array.from(tiers.values()), 0);
    const arr = Array.from({ length: maxTier + 1 }, () => [] as Checkpoint[]);
    p.checkpoints.forEach(cp => {
      arr[tiers.get(cp.id) ?? 0].push(cp);
    });
    return arr;
  }, [p.checkpoints, tiers]);
"""
content = content.replace("  function update(cps: Checkpoint[]) { persist({ ...p, checkpoints: cps }); }", "  function update(cps: Checkpoint[]) { persist({ ...p, checkpoints: cps }); }\n" + state_injection)

# Now replace the SVG and rendering logic
# From: {/* Arcade Map Column */} down to: {/* Quest Details Side Panel */}

old_start = "{/* Arcade Map Column */}"
old_end = "{/* Quest Details Side Panel */}"
s_idx = content.find(old_start)
e_idx = content.find(old_end)

new_map = """{/* Arcade Map Column */}
        <div ref={containerRef} style={{ 
          flex: 1, position: 'relative', background: 'var(--bg)', borderRadius: 'var(--radius)', 
          border: '1px solid var(--border)', padding: '60px 0', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '80px'
        }}>
          {/* SVG Background Path */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {lines.map(line => {
              // Draw a smooth bezier curve for the branches
              const midY = (line.y1 + line.y2) / 2;
              const d = `M ${line.x1} ${line.y1} C ${line.x1} ${midY}, ${line.x2} ${midY}, ${line.x2} ${line.y2}`;
              return (
                <path 
                  key={line.id} d={d}
                  fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" 
                  style={{ opacity: 0.5 }}
                />
              );
            })}
          </svg>

          {/* Tiers */}
          {tiersArray.map((tierNodes, tIdx) => (
            <div key={tIdx} style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '60px', width: '100%', zIndex: 1
            }}>
              {tierNodes.map((c) => {
                const originalIndex = p.checkpoints.findIndex(x => x.id === c.id);
                const isDone = c.status === 'done';
                const isBuilding = c.status === 'building';
                const unblocked = isUnblocked(p.checkpoints, c);
                const isLocked = !isDone && !isBuilding && !unblocked;
                const isStart = c.depends_on.length === 0;

                const size = 64;
                const bgColor = isDone ? 'var(--panel-2)' : isBuilding ? 'var(--panel)' : unblocked ? 'var(--panel)' : 'rgba(0,0,0,0.6)';
                const borderColor = isDone ? 'var(--accent)' : isBuilding ? 'var(--amber)' : unblocked ? 'var(--text)' : 'var(--border-2)';
                const glow = isBuilding || (unblocked && !isDone) ? '0 0 20px var(--amber)' : isDone ? '0 0 15px var(--accent)' : 'none';
                const pulseClass = (isBuilding || (unblocked && !isDone)) ? 'pulse-glow' : '';

                return (
                  <div key={c.id} ref={(el) => { if (el) nodeRefs.current.set(c.id, el); else nodeRefs.current.delete(c.id); }} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    cursor: 'pointer', filter: isLocked ? 'grayscale(0.8) opacity(0.6)' : 'none'
                  }} onClick={() => setSel(originalIndex)}>
                    
                    <div className={pulseClass} style={{
                      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
                      background: bgColor, border: `3px solid ${borderColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: glow, transition: 'all 0.2s',
                      transform: sel === originalIndex ? 'scale(1.15)' : 'scale(1)'
                    }}>
                      {isStart ? <Star size={30} color={isDone ? 'var(--accent)' : 'var(--text)'} /> : 
                       isDone ? <ShieldCheck size={30} color="var(--accent)" /> : 
                       isLocked ? <Lock size={26} color="var(--muted-2)" /> : 
                       <Shield size={30} color="var(--text)" />}
                    </div>

                    <div style={{
                      marginTop: '10px', fontFamily: 'var(--serif)', fontSize: '14px', 
                      fontWeight: 'bold', color: isDone ? 'var(--accent)' : 'var(--text)', 
                      textAlign: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                      background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px',
                      maxWidth: '140px'
                    }}>
                      {c.title}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        """

content = content[:s_idx] + new_map + content[e_idx:]

with open('components/RoadmapView.tsx', 'w') as f:
    f.write(content)
