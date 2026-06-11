import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { X, Maximize2, ZoomIn, ZoomOut, Compass } from 'lucide-react';
import { TreeLayoutEngine } from './TreeLayoutEngine.js';
import { CellState } from '../../engine/eventTypes.js';

export default function TreePanel({
  snapshot,
  isFullscreen = false,
  onNodeClick,
  onClose,
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  
  const [transform, setTransform] = useState({ x: 0, y: 0, zoom: 1 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const layoutEngine = useMemo(() => new TreeLayoutEngine(), []);

  // Compute layout positions from snapshot treeNodes
  const { nodes, links, bounds } = useMemo(() => {
    const treeNodes = snapshot?.treeNodes || new Map();
    const treeRoot = snapshot?.treeRoot || '';
    
    // Configure layout spacing
    const nodeWidth = isFullscreen ? 85 : 55;
    const levelHeight = isFullscreen ? 90 : 70;
    
    const { nodes: computedNodes, links: computedLinks } = layoutEngine.computeLayout(
      treeNodes,
      treeRoot,
      { nodeWidth, levelHeight }
    );
    
    const computedBounds = layoutEngine.getBounds(computedNodes);
    return { nodes: computedNodes, links: computedLinks, bounds: computedBounds };
  }, [snapshot?.treeNodes, snapshot?.treeRoot, isFullscreen, layoutEngine]);

  // Center tree on layout change or container resize
  const centerTree = useCallback(() => {
    const container = containerRef.current;
    if (!container || nodes.length === 0) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 300;

    // Center root node horizontally at the top
    const rootNode = nodes.find(n => n.depth === 0);
    if (rootNode) {
      setTransform({
        x: width / 2 - rootNode.x,
        y: isFullscreen ? 80 : 35,
        zoom: isFullscreen ? 0.95 : 0.8,
      });
    }
  }, [nodes, isFullscreen]);

  // Trigger centering when nodes first load or when isFullscreen toggles
  useEffect(() => {
    centerTree();
  }, [nodes.length, isFullscreen, centerTree]);

  // SVG Pan/Zoom Event Handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Node Hover Tooltip Helpers
  const handleNodeMouseEnter = (e, node) => {
    setHoveredNode(node);
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top + 15,
    });
  };

  const handleNodeMouseMove = (e) => {
    if (hoveredNode) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top + 15,
      });
    }
  };

  const handleNodeMouseLeave = () => {
    setHoveredNode(null);
  };

  // Helper to resolve cell visual state colors
  const getNodeStyles = (nodeId) => {
    const cellStates = snapshot?.cellStates || new Map();
    const state = cellStates.get(nodeId) || CellState.UNVISITED;

    let fill = 'rgba(22, 26, 35, 0.4)';
    let stroke = 'rgba(79, 124, 255, 0.25)';
    let glow = 'rgba(0, 0, 0, 0)';
    let isCurrent = false;
    let status = 'operational'; // 'operational' (cyan/blue), 'active' (cyan), 'warning' (orange), 'critical' (red)

    switch (state) {
      case CellState.START:
        fill = 'rgba(56, 189, 248, 0.15)';
        stroke = '#38bdf8';
        glow = 'rgba(56, 189, 248, 0.4)';
        status = 'active';
        break;
      case CellState.GOAL:
        fill = 'rgba(79, 124, 255, 0.15)';
        stroke = '#4f7cff';
        glow = 'rgba(79, 124, 255, 0.4)';
        status = 'active';
        break;
      case CellState.CURRENT:
        fill = 'rgba(56, 189, 248, 0.15)';
        stroke = '#38bdf8';
        glow = 'rgba(56, 189, 248, 0.8)';
        isCurrent = true;
        status = 'active';
        break;
      case CellState.FINAL_PATH:
        fill = 'rgba(56, 189, 248, 0.8)';
        stroke = '#ffffff';
        glow = 'rgba(56, 189, 248, 0.6)';
        status = 'active';
        break;
      case CellState.DISCOVERED:
        fill = 'rgba(79, 124, 255, 0.12)';
        stroke = 'rgba(79, 124, 255, 0.45)';
        status = 'operational';
        break;
      case CellState.IN_FRONTIER:
        fill = 'rgba(56, 189, 248, 0.1)';
        stroke = 'rgba(56, 189, 248, 0.5)';
        status = 'active';
        break;
      case CellState.EXPANDED:
        fill = 'rgba(79, 124, 255, 0.05)';
        stroke = 'rgba(79, 124, 255, 0.2)';
        status = 'operational';
        break;
      case CellState.BACKTRACKED:
        fill = 'rgba(255, 93, 115, 0.1)';
        stroke = 'rgba(255, 93, 115, 0.4)';
        glow = 'rgba(255, 93, 115, 0.15)';
        status = 'critical';
        break;
    }

    return { fill, stroke, glow, isCurrent, status };
  };

  const getLinkStyles = (targetId) => {
    const cellStates = snapshot?.cellStates || new Map();
    const targetState = cellStates.get(targetId);
    
    if (targetState === CellState.FINAL_PATH) {
      return { stroke: '#38bdf8', width: 2.2, glow: 'rgba(56, 189, 248, 0.5)' };
    }
    return { stroke: 'rgba(79, 124, 255, 0.15)', width: 1, glow: 'none' };
  };

  if (nodes.length === 0) {
    return (
      <div 
        ref={containerRef}
        className="w-full h-full flex flex-col items-center justify-center font-cyber-mono text-slate-400 gap-3"
        style={{ minHeight: isFullscreen ? '100%' : '280px' }}
      >
        <div className="text-sm tracking-wider opacity-60 animate-pulse">[∿ AWAITING TELEMETRY MATRIX ∿]</div>
        <div className="text-xs opacity-40">Initialize routing vectors to stream search hierarchy</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden glass-card"
      style={{ minHeight: isFullscreen ? '100%' : '280px' }}
    >
      {/* Zoom / Pan Controls Overlay */}
      <div className="absolute bottom-3 right-3 z-10 flex gap-1 select-none glass-card p-1.5 shadow-lg shadow-black/40">
        <button
          onClick={() => setTransform(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 4) }))}
          className="p-1 hover:text-electric-cyan active:scale-90 transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTransform(prev => ({ ...prev, zoom: Math.max(prev.zoom * 0.8, 0.15) }))}
          className="p-1 hover:text-electric-cyan active:scale-90 transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={centerTree}
          className="p-1 hover:text-electric-cyan active:scale-90 transition-all cursor-pointer"
          title="Recenter Camera"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      <svg
        ref={svgRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ minHeight: isFullscreen ? '100%' : '280px' }}
      >
        <g style={{ willChange: 'transform', transform: `translate3d(${transform.x}px, ${transform.y}px, 0px) scale(${transform.zoom})`, transformOrigin: '0 0' }}>
          {/* 1. Curved links (edges) */}
          {links.map((link, idx) => {
            const { source, target } = link;
            const linkStyles = getLinkStyles(target.id);
            
            // Cubic bezier layout
            const cpOffset = isFullscreen ? 35 : 25;
            const pathD = `M${source.x},${source.y}C${source.x},${source.y + cpOffset} ${target.x},${target.y - cpOffset} ${target.x},${target.y}`;

            return (
              <g key={`edge-${idx}`}>
                {linkStyles.glow !== 'none' && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={linkStyles.glow}
                    strokeWidth={linkStyles.width + 3}
                    opacity={0.35}
                  />
                )}
                <path
                  d={pathD}
                  fill="none"
                  stroke={linkStyles.stroke}
                  strokeWidth={linkStyles.width}
                  style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                />
              </g>
            );
          })}

          {/* 2. Nodes */}
          {nodes.map((node) => {
            const nodeStyles = getNodeStyles(node.id);
            const radius = isFullscreen ? (nodeStyles.isCurrent ? 9 : 6.5) : (nodeStyles.isCurrent ? 7.5 : 4.8);

            return (
              <g
                key={`node-${node.id}`}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                onClick={() => onNodeClick && onNodeClick(node.id)}
                onMouseEnter={(e) => handleNodeMouseEnter(e, node)}
                onMouseMove={handleNodeMouseMove}
                onMouseLeave={handleNodeMouseLeave}
              >
                {/* Glowing outer sweep circle */}
                {nodeStyles.glow !== 'rgba(0, 0, 0, 0)' && (
                  <circle
                    r={radius + 3.5}
                    fill="none"
                    stroke={nodeStyles.stroke}
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    className={nodeStyles.isCurrent ? 'animate-spin' : ''}
                    style={{ animationDuration: '6s', opacity: 0.65 }}
                  />
                )}
                {nodeStyles.isCurrent && (
                  <circle
                    r={radius + 7}
                    fill="none"
                    stroke={nodeStyles.stroke}
                    strokeWidth={1}
                    className="animate-ping"
                    style={{ animationDuration: '2.5s', opacity: 0.4 }}
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  r={radius}
                  fill={nodeStyles.fill}
                  stroke={nodeStyles.stroke}
                  strokeWidth={nodeStyles.isCurrent ? 2 : 1.2}
                  style={{ transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                />

                {/* Crosshairs inside circle */}
                <path
                  d={`M -${radius - 1.5} 0 L ${radius - 1.5} 0 M 0 -${radius - 1.5} L 0 ${radius - 1.5}`}
                  stroke={nodeStyles.isCurrent ? '#ffffff' : nodeStyles.stroke}
                  strokeWidth={0.8}
                  opacity={0.7}
                />

                {/* Coordinate text labels (on node, small, only in Fullscreen or when Zoomed in) */}
                {isFullscreen && transform.zoom > 0.6 && (
                  <text
                    y={radius + 11}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.7)"
                    className="font-cyber-mono select-none"
                    style={{ fontSize: '8px' }}
                  >
                    {node.id}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover Information Tooltip */}
      {hoveredNode && (
        <div
          className="absolute z-50 bg-cyber-gray-dark/95 border border-electric-cyan/30 text-slate-200 p-3 rounded-lg font-cyber-mono text-[10px] leading-relaxed shadow-[0_4px_24px_rgba(0,0,0,0.65)] select-none pointer-events-none w-48 backdrop-blur"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="border-b border-cyber-gray-light pb-1 mb-1.5 flex justify-between font-bold text-electric-cyan">
            <span>NODE COORDINATE</span>
            <span>({hoveredNode.id})</span>
          </div>
          <div>Depth level: {hoveredNode.depth}</div>
          {hoveredNode.data.parentId && (
            <div>Parent cell: ({hoveredNode.data.parentId})</div>
          )}
          <div className="border-t border-cyber-gray-light/30 mt-1.5 pt-1.5 flex flex-col gap-0.5 text-slate-400">
            <div>Discovered at step: {hoveredNode.data.discoveryStep}</div>
            {hoveredNode.data.expansionStep !== -1 && (
              <div>Expanded at step: {hoveredNode.data.expansionStep}</div>
            )}
          </div>
          {hoveredNode.data.metadata && Object.keys(hoveredNode.data.metadata).length > 0 && (
            <div className="border-t border-cyber-gray-light/30 mt-1.5 pt-1.5 text-electric-cyan">
              {Object.entries(hoveredNode.data.metadata).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="uppercase text-[9px]">{k}:</span>
                  <span className="font-bold">{typeof v === 'number' ? v.toFixed(1).replace(/\.0$/, '') : String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
