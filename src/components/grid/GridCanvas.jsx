import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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

  // Keep a ref of mouse positions for hit testing
  const mouseRef = useRef({ x: 0, y: 0 });

  // Grid dimensions in world coordinates
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
    
    // Add window resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set canvas size and fit to screen on mount or dimension change
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const canvasBg = canvasBgRef.current;
    const canvasFg = canvasFgRef.current;
    const camera = cameraRef.current;

    if (!container || !canvasBg || !canvasFg || !camera) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 500;
    const dpr = window.devicePixelRatio || 1;

    // Set canvas sizes for HDPI
    canvasBg.width = width * dpr;
    canvasBg.height = height * dpr;
    canvasBg.style.width = `${width}px`;
    canvasBg.style.height = `${height}px`;

    canvasFg.width = width * dpr;
    canvasFg.height = height * dpr;
    canvasFg.style.width = `${width}px`;
    canvasFg.style.height = `${height}px`;

    // Initialize/Reset camera fits
    camera.fitToScreen(worldWidth, worldHeight, width, height);
    drawAll();
  }, [worldWidth, worldHeight]);

  // Request redraw of both layers
  const drawAll = useCallback(() => {
    drawBackground();
    drawForeground();
  }, [grid, snapshot, startNode, goalNode, hoveredCell]);

  // Redraw when grid/nodes change
  useEffect(() => {
    drawAll();
  }, [grid, startNode, goalNode, drawAll]);

  // Redraw foreground specifically when simulation snapshot or hover cell changes
  useEffect(() => {
    drawForeground();
  }, [snapshot, hoveredCell, drawForeground]);

  // Background rendering: Static grid lines + Obstacles + Terrain Weights
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

    // 1. Draw subtle background mesh
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    // 2. Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let r = 0; r <= rows; r++) {
      ctx.moveTo(0, r * CELL_SIZE);
      ctx.lineTo(worldWidth, r * CELL_SIZE);
    }
    for (let c = 0; c <= cols; c++) {
      ctx.moveTo(c * CELL_SIZE, 0);
      ctx.lineTo(c * CELL_SIZE, worldHeight);
    }
    ctx.stroke();

    // 3. Draw static terrain elements (obstacles/weights)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;

        if (cell.type === CellType.OBSTACLE) {
          // Obstacle (craters/asteroids) — red warning hatched
          ctx.fillStyle = 'rgba(255, 51, 51, 0.15)';
          ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.strokeStyle = '#ff3333';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

          // Hatching lines
          ctx.strokeStyle = 'rgba(255, 51, 51, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 24); ctx.lineTo(x + 24, y + 4);
          ctx.moveTo(x + 4, y + 14); ctx.lineTo(x + 14, y + 4);
          ctx.moveTo(x + 14, y + 24); ctx.lineTo(x + 24, y + 14);
          ctx.stroke();
        } else if (cell.type === CellType.WEIGHTED || cell.type === CellType.HEAVY) {
          // Weighted terrain (dunes/nebula) — amber stripes
          const isHeavy = cell.type === CellType.HEAVY;
          ctx.fillStyle = isHeavy ? 'rgba(157, 78, 221, 0.12)' : 'rgba(255, 170, 0, 0.12)';
          ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.strokeStyle = isHeavy ? '#9d4edd' : '#ffaa00';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

          // Stripes
          ctx.strokeStyle = isHeavy ? 'rgba(157, 78, 221, 0.35)' : 'rgba(255, 170, 0, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 26, y + 26);
          ctx.moveTo(x + 2, y + 12); ctx.lineTo(x + 16, y + 26);
          ctx.moveTo(x + 12, y + 2); ctx.lineTo(x + 26, y + 16);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  };

  // Foreground rendering: Dynamic states + Start/Goal + Path + Hover indicator + Pulsing glows
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
    const pulseScale = 1 + 0.06 * Math.sin(Date.now() / 150); // Pulsing factor for animations

    // 1. Draw exploration cells (Discovered, Expanded, Frontier, etc.)
    for (const [key, state] of cellStates.entries()) {
      const [r, c] = key.split(',').map(Number);
      const x = c * CELL_SIZE;
      const y = r * CELL_SIZE;

      // Start & Goal states are rendered separately for visual prominence
      if (state === CellState.START || state === CellState.GOAL) continue;

      ctx.save();
      
      switch (state) {
        case CellState.DISCOVERED:
          ctx.fillStyle = 'rgba(0, 210, 255, 0.18)';
          ctx.strokeStyle = 'rgba(0, 210, 255, 0.35)';
          ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          break;

        case CellState.IN_FRONTIER:
          // Frontier nodes have a breathing border glow
          ctx.fillStyle = 'rgba(0, 210, 255, 0.28)';
          ctx.strokeStyle = `rgba(0, 210, 255, ${0.5 + 0.15 * Math.sin(Date.now() / 120)})`;
          ctx.lineWidth = 1.5;
          ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          break;

        case CellState.EXPANDED:
          ctx.fillStyle = 'rgba(0, 210, 255, 0.06)';
          ctx.strokeStyle = 'rgba(0, 210, 255, 0.12)';
          ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          break;

        case CellState.CURRENT:
          // Pulsing scale factor for current node
          ctx.fillStyle = '#00d2ff';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#00d2ff';
          ctx.shadowBlur = 10;
          
          ctx.translate(x + CELL_SIZE / 2, y + CELL_SIZE / 2);
          ctx.scale(pulseScale, pulseScale);
          ctx.fillRect(-CELL_SIZE / 2 + 3, -CELL_SIZE / 2 + 3, CELL_SIZE - 6, CELL_SIZE - 6);
          ctx.strokeRect(-CELL_SIZE / 2 + 3, -CELL_SIZE / 2 + 3, CELL_SIZE - 6, CELL_SIZE - 6);
          break;

        case CellState.BACKTRACKED:
          ctx.fillStyle = 'rgba(157, 78, 221, 0.15)';
          ctx.strokeStyle = 'rgba(157, 78, 221, 0.3)';
          ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          break;

        case CellState.FINAL_PATH:
          ctx.fillStyle = 'rgba(0, 210, 255, 0.85)';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#00d2ff';
          ctx.shadowBlur = 8;
          ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          break;
      }
      ctx.restore();
    }

    // 2. Draw Start (Transmitter) & Goal (Satellite)
    const drawEndpoint = (node, isStart) => {
      const x = node.col * CELL_SIZE;
      const y = node.row * CELL_SIZE;
      const glowColor = isStart ? '#ffaa00' : '#00e676';
      
      ctx.save();
      ctx.translate(x + CELL_SIZE / 2, y + CELL_SIZE / 2);
      ctx.scale(pulseScale, pulseScale);

      // Glow backing
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
      ctx.fillStyle = isStart ? 'rgba(255, 170, 0, 0.3)' : 'rgba(0, 230, 118, 0.3)';
      ctx.strokeStyle = isStart ? '#ffaa00' : '#00e676';
      ctx.lineWidth = 2;

      // Draw Diamond for start, Star/Circle for Goal
      ctx.beginPath();
      if (isStart) {
        ctx.moveTo(0, -CELL_SIZE / 2 + 4);
        ctx.lineTo(CELL_SIZE / 2 - 4, 0);
        ctx.lineTo(0, CELL_SIZE / 2 - 4);
        ctx.lineTo(-CELL_SIZE / 2 + 4, 0);
      } else {
        // Draw satellite hexagon
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          ctx.lineTo((CELL_SIZE / 2 - 4) * Math.cos(angle), (CELL_SIZE / 2 - 4) * Math.sin(angle));
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Icon emoji
      ctx.shadowBlur = 0;
      ctx.font = '13px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(isStart ? '🚀' : '📡', 0, 1);

      ctx.restore();
    };

    if (startNode) drawEndpoint(startNode, true);
    if (goalNode) drawEndpoint(goalNode, false);

    // 3. Draw Hover Cell Highlight
    if (hoveredCell && isInteractive && !isPanning) {
      const hx = hoveredCell.col * CELL_SIZE;
      const hy = hoveredCell.row * CELL_SIZE;
      ctx.strokeStyle = '#00d2ff';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00d2ff';
      ctx.shadowBlur = 6;
      ctx.strokeRect(hx + 1, hy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }

    ctx.restore();
  };

  // Continuous animation loop for glowing nodes
  useEffect(() => {
    let animId;
    const animate = () => {
      drawForeground();
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [snapshot, hoveredCell]);

  // Coordinate converter helper
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

    // Check if middle click or Space key/Alt key pans
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      camera.handleMouseDown(e);
      setIsPanning(true);
      return;
    }

    if (!isInteractive) return;

    const cell = getCellFromEvent(e);
    if (cell && cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < cols) {
      setIsDrawing(true);
      if (onDragStart) {
        onDragStart(cell.row, cell.col);
      }
      if (onCellClick) {
        onCellClick(cell.row, cell.col);
      }
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

  const handleMouseUp = (e) => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (isPanning) {
      camera.handleMouseUp();
      setIsPanning(false);
      return;
    }

    setIsDrawing(false);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const handleWheel = (e) => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.handleWheel(e);
    drawAll();
  };

  // Prevent context menu to allow panning with right click
  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden rounded bg-cyber-black border border-cyber-gray-light ${
        isPanning ? 'cursor-grabbing' : isInteractive ? 'cursor-crosshair' : 'cursor-default'
      }`}
      style={{ minHeight: '400px' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      <canvas
        ref={canvasBgRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
      <canvas
        ref={canvasFgRef}
        className="absolute inset-0 block"
        style={{ zIndex: 2 }}
      />
      {/* UI controls inside scanner viewport */}
      <div className="absolute bottom-2 left-2 z-10 font-cyber-mono text-[9px] text-slate-500 bg-cyber-black/80 px-2 py-1 border border-cyber-gray-light rounded backdrop-blur select-none pointer-events-none">
        SCROLLER: ZOOM | DRAG (RIGHT-CLICK/SHIFT): PAN | DRAG (LEFT-CLICK): PAINT
      </div>
    </div>
  );
}
