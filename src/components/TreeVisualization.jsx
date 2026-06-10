import { useEffect, useState, memo } from 'react';
import * as d3 from 'd3-hierarchy';

const TreeVisualization = memo(({ runResult, startNode }) => {
  const [layout, setLayout] = useState({ nodes: [], links: [] });

  useEffect(() => {
    if (!runResult || !runResult.parentMap || !startNode) {
      setLayout({ nodes: [], links: [] });
      return;
    }

    // 1. Build hierarchical data structure
    const startKey = `${startNode.row},${startNode.col}`;
    const nodeMap = {};
    
    // Initialize map
    runResult.visitedNodesInOrder.forEach(node => {
      const key = `${node.row},${node.col}`;
      nodeMap[key] = { id: key, children: [] };
    });
    // Add start and target nodes if they are in parentMap
    runResult.parentMap.forEach((parent, childKey) => {
      if (!nodeMap[childKey]) nodeMap[childKey] = { id: childKey, children: [] };
      if (parent) {
        const parentKey = `${parent.row},${parent.col}`;
        if (!nodeMap[parentKey]) nodeMap[parentKey] = { id: parentKey, children: [] };
      }
    });

    // Link children
    runResult.parentMap.forEach((parent, childKey) => {
      if (parent) {
        const parentKey = `${parent.row},${parent.col}`;
        nodeMap[parentKey].children.push(nodeMap[childKey]);
      }
    });

    const rootData = nodeMap[startKey];
    if (!rootData) return;

    // 2. Compute D3 Tree Layout
    try {
      const root = d3.hierarchy(rootData);
      
      // We'll dynamically adjust width/height based on node count
      const nodeCount = runResult.visitedNodesInOrder.length;
      const width = Math.max(800, nodeCount * 3);
      const height = Math.max(300, root.height * 40 + 100);

      const treeLayout = d3.tree().size([width, height - 60]);
      treeLayout(root);

      const links = root.links();
      const nodes = root.descendants();

      setLayout({ nodes, links, width, height });
      
      // Reset DOM visibility when new layout mounts
      requestAnimationFrame(() => {
        document.querySelectorAll('.tree-node, .tree-link').forEach(el => {
          el.style.opacity = '0';
          el.style.stroke = 'rgba(255, 255, 255, 0.1)';
        });
        // Reveal start node immediately
        const startEl = document.getElementById(`tree-node-${startKey}`);
        if (startEl) startEl.style.opacity = '1';
      });
    } catch (e) {
      console.error("Tree layout error:", e);
    }
  }, [runResult, startNode]);

  if (!runResult || layout.nodes.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-cyber-mono text-xs p-4 text-center">
        <div className="animate-pulse w-12 h-12 mb-4 border border-slate-700 rounded-full flex items-center justify-center">
           <div className="w-2 h-2 bg-slate-600 rounded-full" />
        </div>
        <span>AWAITING MISSION TELEMETRY...<br/>RUN DISPATCH TO GENERATE SEARCH TREE</span>
      </div>
    );
  }

  // Calculate SVG ViewBox to center the tree
  const viewBox = `0 -30 ${layout.width} ${layout.height}`;

  return (
    <div className="w-full h-full overflow-hidden relative bg-[#030509] rounded-lg shadow-inner border border-cyber-gray-light">
      <div className="absolute top-2 left-3 z-10 text-[10px] font-cyber-header text-neon-cyan/50 tracking-widest">
        ALGORITHMIC BRANCHING VECTOR
      </div>
      
      {/* We use a large SVG that scales to fit the container. No scrolling to keep it sleek. */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox={viewBox} 
        preserveAspectRatio="xMidYMid meet"
        className="pt-6"
      >
        <g>
          {/* Render Links */}
          {layout.links.map((link, i) => {
            const targetId = link.target.data.id;
            return (
              <line
                key={`link-${i}`}
                id={`tree-link-${targetId}`}
                className="tree-link transition-opacity duration-300"
                x1={link.source.x}
                y1={link.source.y}
                x2={link.target.x}
                y2={link.target.y}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1.5"
                opacity="0"
              />
            );
          })}
          
          {/* Render Nodes */}
          {layout.nodes.map((node, i) => {
            const id = node.data.id;
            const isStart = id === `${startNode.row},${startNode.col}`;
            
            return (
              <g 
                key={`node-${i}`} 
                id={`tree-node-${id}`} 
                className="tree-node transition-all duration-300"
                transform={`translate(${node.x},${node.y})`}
                opacity="0"
              >
                <circle 
                  r={isStart ? 6 : 3.5} 
                  fill={isStart ? "#00e5ff" : "#121826"} 
                  stroke={isStart ? "#fff" : "#00e5ff"} 
                  strokeWidth="1.5"
                  className={isStart ? "shadow-[0_0_10px_#00e5ff]" : ""}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
});

export default TreeVisualization;
