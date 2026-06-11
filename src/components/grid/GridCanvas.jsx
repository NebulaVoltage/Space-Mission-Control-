import { useEffect, useRef, useState, useCallback } from 'react';
import { CameraController } from './CameraController.js';
import { CellState, CellType } from '../../engine/eventTypes.js';

const CELL_SIZE = 28;

export default function GridCanvas({
  grid,
  snapshot,
  startNode,
  goalNode,
  onCellClick,
  onCellDrag,
  onDragStart,
  onDragEnd,
  activeBrush = 'obstacle',
  isInteractive = true,
}) {
  const containerRef = useRef(null);
  const canvasBgRef = useRef(null);
  const canvasFgRef = useRef(null);
  const cameraRef = useRef(null);

  const [hoveredCell, setHoveredCell] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);

  // Grid dimensions
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const worldWidth = cols * CELL_SIZE;
  const worldHeight = rows * CELL_SIZE;

  // Initialize camera controller once
  useEffect(() => {
    if (canvasFgRef.current) {
      cameraRef.current = new CameraController(canvasFgRef.current);
      handleResize();
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set canvas size and fit to screen
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const canvasBg = canvasBgRef.current;
    const canvasFg = canvasFgRef.current;
    const camera = cameraRef.current;

    if (!container || !canvasBg || !canvasFg || !camera) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 450;
    const dpr = window.devicePixelRatio || 1;

    canvasBg.width = width * dpr;
    canvasBg.height = height * dpr;
    canvasBg.style.width = `${width}px`;
    canvasBg.style.height = `${height}px`;

    canvasFg.width = width * dpr;
    canvasFg.height = height * dpr;
    canvasFg.style.width = `${width}px`;
    canvasFg.style.height = `${height}px`;

    camera.fitToScreen(worldWidth, worldHeight, width, height);
    setCurrentZoom(camera.zoom);
    drawAll();
  }, [worldWidth, worldHeight]);

  // Request redraw of both layers
  const drawAll = useCallback(() => {
    drawBackground();
    drawForeground();
  }, [grid, snapshot, startNode, goalNode, hoveredCell]);

  // Redraw both layers when grid, nodes, or simulation state changes
  useEffect(() => {
    drawAll();
  }, [grid, startNode, goalNode, snapshot, drawAll]);

  // Redraw foreground specifically when hovered cell changes
  useEffect(() => {
    drawForeground();
  }, [hoveredCell]);

  // Layer 1 (Base), Layer 2 (Structural Framework), Layer 3 (Panels & Mesh)
  function drawBackground() {
    const canvas = canvasBgRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.scale(dpr, dpr);
    camera.applyTransform(ctx);

    // LAYER 1: Deep Space Background
    ctx.fillStyle = '#03040A';
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    // Layer 1 overlay: Soft volumetric radial lighting illusion (center-weighted)
    const centerGrad = ctx.createRadialGradient(
      worldWidth / 2, worldHeight / 2, 0,
      worldWidth / 2, worldHeight / 2, Math.max(worldWidth, worldHeight) * 0.55
    );
    centerGrad.addColorStop(0, 'rgba(109, 93, 255, 0.03)');
    centerGrad.addColorStop(1, 'rgba(3, 4, 10, 0)');
    ctx.fillStyle = centerGrad;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    // LAYER 2: Structural Framework (Axes Calibration Ticks & Grid Borders)
    ctx.strokeStyle = 'rgba(109, 93, 255, 0.12)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, worldWidth, worldHeight);

    // Column lettering tick marks along top/bottom
    ctx.fillStyle = 'rgba(109, 93, 255, 0.3)';
    ctx.font = '7px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let c = 0; c < cols; c += 5) {
      const cx = c * CELL_SIZE + CELL_SIZE / 2;
      ctx.fillText(`C${String(c).padStart(2, '0')}`, cx, -6);
      ctx.fillText(`C${String(c).padStart(2, '0')}`, cx, worldHeight + 6);
    }

    // Row numbering tick marks along left/right
    ctx.textAlign = 'right';
    for (let r = 0; r < rows; r += 5) {
      const ry = r * CELL_SIZE + CELL_SIZE / 2;
      ctx.fillText(`R${String(r).padStart(2, '0')}`, -6, ry);
      ctx.textAlign = 'left';
      ctx.fillText(`R${String(r).padStart(2, '0')}`, worldWidth + 6, ry);
      ctx.textAlign = 'right';
    }

    // LAYER 3: Concentric Orbital Radar Sweeps
    ctx.strokeStyle = 'rgba(109, 93, 255, 0.04)';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.arc(worldWidth / 2, worldHeight / 2, Math.min(worldWidth, worldHeight) * 0.18, 0, Math.PI * 2);
    ctx.arc(worldWidth / 2, worldHeight / 2, Math.min(worldWidth, worldHeight) * 0.38, 0, Math.PI * 2);
    ctx.arc(worldWidth / 2, worldHeight / 2, Math.min(worldWidth, worldHeight) * 0.58, 0, Math.PI * 2);
    ctx.stroke();

    // Bounding target brackets inside grid corners
    const bkSize = 10;
    ctx.strokeStyle = 'rgba(58, 190, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(0, bkSize); ctx.lineTo(0, 0); ctx.lineTo(bkSize, 0);
    // Top-right
    ctx.moveTo(worldWidth - bkSize, 0); ctx.lineTo(worldWidth, 0); ctx.lineTo(worldWidth, bkSize);
    // Bottom-left
    ctx.moveTo(0, worldHeight - bkSize); ctx.lineTo(0, worldHeight); ctx.lineTo(bkSize, worldHeight);
    // Bottom-right
    ctx.moveTo(worldWidth - bkSize, worldHeight); ctx.lineTo(worldWidth, worldHeight); ctx.lineTo(worldWidth, worldHeight - bkSize);
    ctx.stroke();

    // Subtle Grid mesh lines
    ctx.strokeStyle = 'rgba(109, 93, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let r = 1; r < rows; r++) {
      ctx.moveTo(0, r * CELL_SIZE);
      ctx.lineTo(worldWidth, r * CELL_SIZE);
    }
    for (let c = 1; c < cols; c++) {
      ctx.moveTo(c * CELL_SIZE, 0);
      ctx.lineTo(c * CELL_SIZE, worldHeight);
    }
    ctx.stroke();

    // Static terrain elements (Obstacles/Weights)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;

        if (cell.type === CellType.OBSTACLE) {
          // Obstacle (Debris) - physical metal hatches
          ctx.fillStyle = 'rgba(107, 114, 128, 0.12)';
          ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

          // Diagonal structural hatch lines
          ctx.strokeStyle = 'rgba(107, 114, 128, 0.25)';
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 24); ctx.lineTo(x + 24, y + 4);
          ctx.stroke();
        } else if (cell.type === CellType.WEIGHTED || cell.type === CellType.HEAVY) {
          // Nebula/Gravity - Energy-tinted panels
          const isHeavy = cell.type === CellType.HEAVY;
          ctx.fillStyle = isHeavy ? 'rgba(142, 132, 255, 0.08)' : 'rgba(109, 93, 255, 0.08)';
          ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.strokeStyle = isHeavy ? 'rgba(142, 132, 255, 0.3)' : 'rgba(109, 93, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }

    // Static cell states (Explored path nodes)
    const cellStates = snapshot?.cellStates || new Map();
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    
    for (const [key, state] of cellStates.entries()) {
      if (state === CellState.START || state === CellState.GOAL || state === CellState.CURRENT || state === CellState.IN_FRONTIER) continue;

      // Fast non-allocating parser
      const commaIdx = key.indexOf(',');
      const r = +key.substring(0, commaIdx);
      const c = +key.substring(commaIdx + 1);
      const x = c * CELL_SIZE;
      const y = r * CELL_SIZE;

      if (state === CellState.DISCOVERED) {
        ctx.fillStyle = 'rgba(109, 93, 255, 0.06)';
        ctx.strokeStyle = 'rgba(109, 93, 255, 0.16)';
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      } else if (state === CellState.EXPANDED) {
        ctx.fillStyle = 'rgba(109, 93, 255, 0.03)';
        ctx.strokeStyle = 'rgba(109, 93, 255, 0.08)';
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      } else if (state === CellState.BACKTRACKED) {
        ctx.fillStyle = 'rgba(255, 93, 115, 0.06)';
        ctx.strokeStyle = 'rgba(255, 93, 115, 0.15)';
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      } else if (state === CellState.FINAL_PATH) {
        // High visibility trace paths
        ctx.fillStyle = 'rgba(58, 190, 255, 0.75)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    }

    ctx.restore();
  }

  // LAYER 4: Interactive Controls, LAYER 5: Active Data
  function drawForeground() {
    const canvas = canvasFgRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(dpr, dpr);
    camera.applyTransform(ctx);

    const cellStates = snapshot?.cellStates || new Map();

    // 1. Draw dynamic wavefront cells (Frontier, Current)
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    
    for (const [key, state] of cellStates.entries()) {
      if (state !== CellState.IN_FRONTIER && state !== CellState.CURRENT) continue;

      const commaIdx = key.indexOf(',');
      const r = +key.substring(0, commaIdx);
      const c = +key.substring(commaIdx + 1);
      const x = c * CELL_SIZE;
      const y = r * CELL_SIZE;

      if (state === CellState.IN_FRONTIER) {
        // Active data frontier
        ctx.fillStyle = 'rgba(58, 190, 255, 0.18)';
        ctx.strokeStyle = 'rgba(58, 190, 255, 0.4)';
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      } else if (state === CellState.CURRENT) {
        // Core resolving cursor (no shadow, crisp highlight)
        ctx.fillStyle = '#3abeff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    }

    // 2. Draw TX start & RX goal endpoints
    const drawEndpoint = (node, isStart) => {
      const x = node.col * CELL_SIZE;
      const y = node.row * CELL_SIZE;
      const ringColor = isStart ? '#3abeff' : '#6d5dff';
      
      ctx.save();
      ctx.translate(x + CELL_SIZE / 2, y + CELL_SIZE / 2);

      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 1.2;

      // Outer target sweep ring
      ctx.beginPath();
      ctx.arc(0, 0, CELL_SIZE / 2 - 4, 0, Math.PI * 2);
      ctx.stroke();

      // Tactical crosshairs
      ctx.beginPath();
      ctx.moveTo(-CELL_SIZE / 2 + 2, 0); ctx.lineTo(-4, 0);
      ctx.moveTo(4, 0); ctx.lineTo(CELL_SIZE / 2 - 2, 0);
      ctx.moveTo(0, -CELL_SIZE / 2 + 2); ctx.lineTo(0, -4);
      ctx.moveTo(0, 4); ctx.lineTo(0, CELL_SIZE / 2 - 2);
      ctx.stroke();

      // Inner delta indicator
      ctx.beginPath();
      if (isStart) {
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else {
        ctx.moveTo(0, -3.5); ctx.lineTo(3.5, 0); ctx.lineTo(0, 3.5); ctx.lineTo(-3.5, 0);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      ctx.stroke();

      // Telemetry tags
      ctx.font = 'bold 6px "JetBrains Mono"';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isStart ? 'TX' : 'RX', 0, 0.5);

      ctx.restore();
    };

    if (startNode) drawEndpoint(startNode, true);
    if (goalNode) drawEndpoint(goalNode, false);

    // LAYER 4: Interactive Brush Controls (Hover Cursor)
    if (hoveredCell && isInteractive && !isPanning) {
      const hx = hoveredCell.col * CELL_SIZE;
      const hy = hoveredCell.row * CELL_SIZE;
      ctx.strokeStyle = '#3abeff';
      ctx.lineWidth = 1;
      ctx.strokeRect(hx + 1, hy + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      // Fine coordinate crosshairs sweeps outside grid bounding box
      ctx.strokeStyle = 'rgba(58, 190, 255, 0.1)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(hx + CELL_SIZE / 2, 0); ctx.lineTo(hx + CELL_SIZE / 2, worldHeight);
      ctx.moveTo(0, hy + CELL_SIZE / 2); ctx.lineTo(worldWidth, hy + CELL_SIZE / 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Handle Drag/Pan inputs
  const getCellFromEvent = (e) => {
    const camera = cameraRef.current;
    if (!camera) return null;
    const worldPoint = camera.screenToWorld(e.clientX, e.clientY);
    const col = Math.floor(worldPoint.x / CELL_SIZE);
    const row = Math.floor(worldPoint.y / CELL_SIZE);
    return { row, col };
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const camera = cameraRef.current;
    if (!camera) return;

    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      camera.handleMouseDown(e);
      setIsPanning(true);
      return;
    }

    if (!isInteractive) return;

    const cell = getCellFromEvent(e);
    if (cell && cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < cols) {
      setIsDrawing(true);
      if (onDragStart) onDragStart(cell.row, cell.col);
      if (onCellClick) onCellClick(cell.row, cell.col);
    }
  };

  const handleMouseMove = (e) => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (isPanning) {
      camera.handleMouseMove(e);
      drawAll();
      return;
    }

    const cell = getCellFromEvent(e);
    if (cell && cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < cols) {
      setHoveredCell(cell);
      if (isDrawing && onCellDrag && isInteractive) {
        onCellDrag(cell.row, cell.col);
      }
    } else {
      setHoveredCell(null);
    }
  };

  const handleMouseUp = () => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (isPanning) {
      camera.handleMouseUp();
      setIsPanning(false);
      return;
    }

    setIsDrawing(false);
    if (onDragEnd) onDragEnd();
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden bg-cyber-black border border-cyber-gray-light rounded ${
        isPanning ? 'cursor-grabbing' : isInteractive ? 'cursor-crosshair' : 'cursor-default'
      }`}
      style={{ minHeight: '430px' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Viewport bracket corners */}
      <div className="hud-bracket-tl" />
      <div className="hud-bracket-tr" />
      <div className="hud-bracket-bl" />
      <div className="hud-bracket-br" />

      {/* Grid rendering layers */}
      <canvas ref={canvasBgRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />
      <canvas ref={canvasFgRef} className="absolute inset-0 block" style={{ zIndex: 2 }} />

      {/* Viewport telemetry footer tags */}
      <div className="absolute bottom-3 left-3 z-10 font-cyber-mono text-[8px] text-slate-500 bg-cyber-black/90 px-2 py-1 border border-cyber-gray-light rounded select-none pointer-events-none">
        GRID SECTOR RATIO: {cols}x{rows} | ZOOM LEVEL: {Math.round(currentZoom * 100)}%
      </div>

      {/* Floating Tactical Zoom controls */}
      <div 
        className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2 py-1 select-none shadow-lg shadow-black/80 bg-cyber-gray-dark border border-cyber-gray-light rounded"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            if (cameraRef.current) {
              cameraRef.current.zoomToCenter(false, (z) => {
                setCurrentZoom(z);
                drawAll();
              });
            }
          }}
          disabled={currentZoom <= 0.301}
          className="w-5 h-5 flex items-center justify-center font-cyber-mono font-bold text-xs rounded border border-cyber-gray-light bg-cyber-gray-dark/50 text-slate-400 hover:text-electric-cyan hover:border-electric-cyan transition-all cursor-pointer disabled:opacity-20"
        >
          −
        </button>
        <span className="font-cyber-mono text-[8px] text-slate-400 min-w-[28px] text-center">
          {Math.round(currentZoom * 100)}%
        </span>
        <button
          onClick={() => {
            if (cameraRef.current) {
              cameraRef.current.zoomToCenter(true, (z) => {
                setCurrentZoom(z);
                drawAll();
              });
            }
          }}
          disabled={currentZoom >= 4.99}
          className="w-5 h-5 flex items-center justify-center font-cyber-mono font-bold text-xs rounded border border-cyber-gray-light bg-cyber-gray-dark/50 text-slate-400 hover:text-electric-cyan hover:border-electric-cyan transition-all cursor-pointer disabled:opacity-20"
        >
          +
        </button>
      </div>
    </div>
  );
}
