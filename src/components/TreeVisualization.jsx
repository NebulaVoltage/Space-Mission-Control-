import { useMemo, useState, useCallback, memo } from 'react';
import Tree from 'react-d3-tree';

const TreeVisualization = memo(({ runResult, startNode, isFullscreen = false, isRunning = false }) => {
  const [translate, setTranslate] = useState({ x: 150, y: 20 });

  // Dynamically center the tree horizontal origin inside the SVG container
  const containerRef = useCallback((containerNode) => {
    if (containerNode !== null) {
      const { width } = containerNode.getBoundingClientRect();
      setTranslate({ x: width / 2, y: isFullscreen ? 60 : 30 });
    }
  }, [isFullscreen]);

  // Construct hierarchical node tree from pathfinding visitedNodesInOrder and parentMap
  const treeData = useMemo(() => {
    if (!runResult || !runResult.visitedNodesInOrder || !runResult.parentMap || !startNode) return null;
    
    const { visitedNodesInOrder, parentMap } = runResult;
    const startKey = `${startNode.row},${startNode.col}`;
    const nodeMap = new Map();
    
    // Explicitly add start node as the root of the search tree
    nodeMap.set(startKey, { 
      name: `🚀 START (${startNode.row}, ${startNode.col})`,
      key: startKey,
      children: [] 
    });

    // Initialize all visited nodes in the map
    visitedNodesInOrder.forEach(node => {
      const key = `${node.row},${node.col}`;
      nodeMap.set(key, { 
        name: `(${node.row}, ${node.col})`,
        key: key,
        children: [] 
      });
    });

    const root = nodeMap.get(startKey);
    
    // Wire up parent-child relationships
    visitedNodesInOrder.forEach(node => {
      const key = `${node.row},${node.col}`;
      const parentNode = parentMap.get(key);
      
      if (parentNode) {
        const parentKey = `${parentNode.row},${parentNode.col}`;
        if (nodeMap.has(parentKey)) {
          nodeMap.get(parentKey).children.push(nodeMap.get(key));
        }
      }
    });

    return root || { name: 'Awaiting' };
  }, [runResult, startNode]);

  // Custom node renderer that injects the HTML ID matching what the simulator will animate
  const renderCustomNode = useCallback(({ nodeDatum, toggleNode }) => {
    const isStart = nodeDatum.key === `${startNode.row},${startNode.col}`;
    const radius = isFullscreen ? 7 : 4.5;
    
    return (
      <g className="tree-node-group">
        <circle
          id={`tree-node-${nodeDatum.key}`}
          r={radius}
          fill={isStart ? '#ffaa00' : '#00d2ff'}
          stroke={isStart ? '#ffffff' : 'rgba(0, 210, 255, 0.4)'}
          strokeWidth={1.5}
          onClick={toggleNode}
          style={{
            transition: 'all 0.3s ease',
            opacity: isRunning ? 0.2 : 1, // Dim nodes initially during running animation
            cursor: 'pointer'
          }}
        />
        <text
          fill="#ffffff"
          stroke="none"
          x={isFullscreen ? 12 : 8}
          y={isFullscreen ? 4 : 3}
          className="rd3t-label__title"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: isFullscreen ? '10px' : '7px',
            pointerEvents: 'none',
            opacity: isRunning ? 0.3 : 0.85,
            textShadow: '0 0 4px rgba(0, 0, 0, 0.9)'
          }}
        >
          {nodeDatum.name}
        </text>
      </g>
    );
  }, [startNode, isFullscreen, isRunning]);

  // Custom link renderer to draw diagonals and assign IDs for animation
  const renderCustomLink = useCallback(({ linkData }) => {
    const { source, target } = linkData;
    const x1 = source.x;
    const y1 = source.y;
    const x2 = target.x;
    const y2 = target.y;
    
    // Diagonal Cubic Bezier path
    const pathD = `M${x1},${y1}C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`;
    
    return (
      <path
        id={`tree-link-${target.data.key}`}
        d={pathD}
        fill="none"
        stroke="rgba(0, 210, 255, 0.3)"
        strokeWidth={isFullscreen ? 1.5 : 1}
        style={{
          transition: 'all 0.3s ease',
          opacity: isRunning ? 0.15 : 0.8
        }}
      />
    );
  }, [isFullscreen, isRunning]);

  if (!treeData) {
    return (
      <div className="w-full h-full flex items-center justify-center font-cyber-mono text-slate-500 text-xs tracking-wider">
        [NO TELEMETRY VECTOR DATA]
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: isFullscreen ? '100%' : '260px' }}>
      <Tree 
        data={treeData} 
        orientation="vertical"
        translate={translate}
        zoomable={true}
        collapsible={true}
        initialDepth={isFullscreen ? 100 : 1}
        transitionDuration={400}
        nodeSize={isFullscreen ? { x: 75, y: 90 } : { x: 40, y: 55 }}
        renderCustomNodeElement={renderCustomNode}
        renderCustomLinkElement={renderCustomLink}
      />
    </div>
  );
});

TreeVisualization.displayName = 'TreeVisualization';

export default TreeVisualization;
