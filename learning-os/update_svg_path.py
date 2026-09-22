import re

with open('components/RoadmapView.tsx', 'r') as f:
    content = f.read()

new_svg = """          <div style={{ position: 'relative', width: '300px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* SVG Background Path */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
              <path 
                d={`M 150 40 ` + orderedCheckpoints.map((_, i) => {
                  const y = 40 + (i * 120);
                  const x = i % 2 === 0 ? 90 : 210;
                  return `L ${x} ${y}`;
                }).join(' ')} 
                fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinejoin="round" 
                style={{ opacity: 0.4 }}
              />
            </svg>

            {/* Nodes */}
            {orderedCheckpoints.map((c, i) => {
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
              
              // Arcade zigzag pattern (90px or 210px means offset is -60 or +60 from center 150)
              const xOffset = i % 2 === 0 ? -60 : 60;

              return (
                <div key={c.id} style={{
                  position: 'relative', zIndex: 1, 
                  transform: `translateX(${xOffset}px)`,
                  marginBottom: i === orderedCheckpoints.length - 1 ? '40px' : '56px',
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
          </div>"""

# Replace the inner map container
content = re.sub(
    r'<svg style={{ position: \'absolute\'.*?}\)}', 
    new_svg, 
    content, 
    flags=re.DOTALL
)

with open('components/RoadmapView.tsx', 'w') as f:
    f.write(content)
