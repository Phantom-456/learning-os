content = """import { Handle, Position } from '@xyflow/react';
import { BookOpen, Flag, LayoutTemplate, Shield, ShieldCheck, MapPin, Star, Lock } from 'lucide-react';

const CP_COLOR: Record<string, string> = { not_started: 'var(--muted-2)', building: 'var(--amber)', done: 'var(--green)' };
const C_COLOR: Record<string, string> = { not_started: 'var(--muted-2)', learning: 'var(--amber)', complete: 'var(--green)' };

export function CheckpointNode({ data }: any) {
  const isDone = data.status === 'done';
  const isBuilding = data.status === 'building';
  const isUnblocked = data.unblocked;
  const isLocked = !isDone && !isBuilding && !isUnblocked;
  const isStart = data.isStart;

  // Game map aesthetics
  const size = isStart ? 70 : 60;
  const bgColor = isDone ? 'var(--panel-2)' : isBuilding ? 'var(--panel)' : isUnblocked ? 'var(--panel)' : 'rgba(0,0,0,0.4)';
  const borderColor = isDone ? 'var(--accent)' : isBuilding ? 'var(--amber)' : isUnblocked ? 'var(--text)' : 'var(--border-2)';
  const glow = isBuilding || (isUnblocked && !isDone) ? '0 0 20px var(--amber)' : isDone ? '0 0 15px var(--accent)' : 'none';
  const pulseClass = (isBuilding || (isUnblocked && !isDone)) ? 'pulse-glow' : '';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px',
      filter: isLocked ? 'grayscale(0.8) opacity(0.6)' : 'none',
    }}>
      <div className={pulseClass} style={{
        width: `${size}px`, height: `${size}px`, borderRadius: '50%',
        background: bgColor, border: `3px solid ${borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: glow,
        position: 'relative', zIndex: 10,
        transition: 'all 0.3s'
      }}>
        <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
        {isStart ? <Star size={28} color={isDone ? 'var(--accent)' : 'var(--text)'} /> : 
         isDone ? <ShieldCheck size={28} color="var(--accent)" /> : 
         isLocked ? <Lock size={24} color="var(--muted-2)" /> : 
         <Shield size={28} color="var(--text)" />}
        <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      </div>
      <div style={{
        marginTop: '8px', fontFamily: 'var(--serif)', fontSize: '13px', 
        fontWeight: 'bold', color: isDone ? 'var(--accent)' : 'var(--text)', 
        textAlign: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)'
      }}>
        {data.title}
      </div>
      {isStart && <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Starting Point</div>}
      {(isBuilding || isUnblocked) && !isDone && !isStart && <div style={{ fontSize: '10px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: 1 }}>You Are Here</div>}
    </div>
  );
}

export function ConceptNode({ data }: any) {
  const st = data.status ?? 'not_started';
  const isDone = st === 'complete';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      background: 'rgba(20,25,20,0.8)', border: `1px solid ${isDone ? 'var(--accent)' : 'var(--border-2)'}`,
      borderRadius: '20px', padding: '4px 10px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
      filter: !isDone ? 'opacity(0.8)' : 'none'
    }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <BookOpen size={14} color={isDone ? 'var(--accent)' : 'var(--muted)'} />
      <span style={{ fontSize: '11px', color: isDone ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--serif)' }}>{data.title}</span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

export function CourseNode({ data }: any) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      background: 'rgba(20,25,20,0.8)', border: '1px solid var(--border-2)',
      borderRadius: '20px', padding: '4px 10px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
    }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <MapPin size={14} color="var(--blue)" />
      <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--serif)' }}>{data.title}</span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

export const nodeTypes = {
  checkpoint: CheckpointNode,
  concept: ConceptNode,
  course: CourseNode
};
"""
with open("components/MapNodes.tsx", "w") as f:
    f.write(content)
