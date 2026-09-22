import re

with open('components/RoadmapView.tsx', 'r') as f:
    content = f.read()

# Change dagre graph layout to LR and increase spacing for game map feel
content = content.replace("function getLayoutedElements(nodes: any[], edges: any[], direction = 'TB') {", "function getLayoutedElements(nodes: any[], edges: any[], direction = 'LR') {")
content = content.replace("const nodeWidth = 220;", "const nodeWidth = 250;")
content = content.replace("const nodeHeight = 80;", "const nodeHeight = 150;")

# Change the logic in useMemo to compute isStart and set edge styles
new_use_memo = """
  const { initialNodes, initialEdges } = useMemo(() => {
    let nodes: any[] = [];
    let edges: any[] = [];
    
    p.checkpoints.forEach((cp, i) => {
      const isStartNode = cp.depends_on.length === 0;
      const cpDone = cp.status === 'done';
      const unblocked = isUnblocked(p.checkpoints, cp);
      
      // Checkpoint Node
      nodes.push({
        id: `cp-${cp.id}`,
        type: 'checkpoint',
        data: { title: cp.title, status: cp.status, unblocked, index: i, isStart: isStartNode },
        position: { x: 0, y: 0 }
      });

      // Depends_on edges (other cp -> this cp)
      cp.depends_on.forEach(depId => {
        const depCp = p.checkpoints.find(x => x.id === depId);
        const depDone = depCp?.status === 'done';
        
        let strokeColor = 'var(--border-2)';
        let strokeWidth = 2;
        let animated = false;
        
        if (depDone && cpDone) {
          strokeColor = 'var(--accent)';
          strokeWidth = 3;
        } else if (depDone && !cpDone) {
          strokeColor = 'var(--amber)';
          strokeWidth = 3;
          animated = true; // active path going forward
        }
        
        edges.push({
          id: `e-dep-${depId}-${cp.id}`,
          source: `cp-${depId}`,
          target: `cp-${cp.id}`,
          type: 'smoothstep',
          animated: animated,
          style: { stroke: strokeColor, strokeWidth },
          markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor }
        });
      });

      // Concepts
      cp.concepts.forEach(cid => {
        const cinfo = cmap.get(cid);
        if (cinfo) {
          const nid = `con-${cp.id}-${cid}`;
          nodes.push({
            id: nid,
            type: 'concept',
            data: { title: cinfo.title, status: cinfo.status },
            position: { x: 0, y: 0 }
          });
          edges.push({
            id: `e-con-${cp.id}-${cid}`,
            source: `cp-${cp.id}`,
            target: nid,
            type: 'default',
            style: { stroke: 'var(--border-2)', strokeDasharray: '4 4' }
          });
        }
      });

      // Courses
      cp.courses.forEach(cid => {
        const cinfo = courseMap.get(cid);
        if (cinfo) {
          const nid = `crs-${cp.id}-${cid}`;
          nodes.push({
            id: nid,
            type: 'course',
            data: { title: cinfo.title },
            position: { x: 0, y: 0 }
          });
          edges.push({
            id: `e-crs-${cp.id}-${cid}`,
            source: `cp-${cp.id}`,
            target: nid,
            type: 'default',
            style: { stroke: 'var(--border-2)', strokeDasharray: '4 4' }
          });
        }
      });
    });

    const layoutedNodes = getLayoutedElements(nodes, edges);
    return { initialNodes: layoutedNodes, initialEdges: edges };
  }, [p.checkpoints, cmap, courseMap]);
"""

content = re.sub(r'  const { initialNodes, initialEdges } = useMemo\(\(\) => \{.*?(?=  const onNodeClick =)', new_use_memo, content, flags=re.DOTALL)

with open('components/RoadmapView.tsx', 'w') as f:
    f.write(content)
