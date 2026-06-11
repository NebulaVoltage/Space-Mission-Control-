import { useEffect, useRef, useState, useCallback } from 'react';
import { CameraController } from './CameraController.js';
import { CellState, CellType, SimStatus } from '../../engine/eventTypes.js';

const CELL_SIZE = 28;

// Depth-based color mapping for BFS (Cyan -> Electric Blue -> Purple -> Magenta)
const interpolateColor = (depth, maxDepth) => {
  if (maxDepth <= 0) return 'rgba(0, 229, 255, 0.4)'; // #00E5FF
  
  const ratio = Math.min(1, Math.max(0, depth / maxDepth));
  
  // Color stops: 
  // 0.0: Cyan (0, 229, 255)
  // 0.33: Electric Blue (77, 124, 254)
  // 0.66: Purple (139, 92, 246)
  // 1.0: Magenta (236, 72, 153)
  
  let r, g, b;
  if (ratio < 0.33) {
    const t = ratio / 0.33;
    r = 0 + (77 - 0) * t;
    g = 229 + (124 - 229) * t;
    b = 255 + (254 - 255) * t;
  } else if (ratio < 0.66) {
    const t = (ratio - 0.33) / 0.33;
    r = 77 + (139 - 77) * t;
    g = 124 + (92 - 124) * t;
    b = 254 + (246 - 254) * t;
  } else {
    const t = (ratio - 0.66) / 0.34;
    r = 139 + (236 - 139) * t;
    g = 92 + (72 - 92) * t;
    b = 246 + (153 - 246) * t;
  }
  
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.4)`;
};

const getPathColor = () => '#FFD700'; // Golden final path
const getStartColor = () => '#00FFB3'; // Start node pulse
const getGoalColor = () => '#FF4D6D'; // Goal node pulse

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

  // ────────────────────────────────────────────────────────
  // VFX STATE (Persisted across renders)
  // ────────────────────────────────────────────────────────
  const vfxRef = useRef({
    particles: [],
    ripples: [],
    pathProgress: 0,
    lastStep: -1,
  });
  const animFrameId = useRef(null);

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
    drawBackground();
  }, [worldWidth, worldHeight]);

  // Handle VFX Triggers
  useEffect(() => {
    const vfx = vfxRef.current;
    
    // Reset path progress if simulation resets or isn't complete
    if (snapshot.status !== SimStatus.COMPLETE || !snapshot.pathFound) {
      vfx.pathProgress = 0;
    } else if (snapshot.status === SimStatus.COMPLETE && snapshot.pathFound && vfx.pathProgress < 1) {
      // Start path drawing animation when complete
      if (vfx.pathProgress === 0) vfx.pathProgress = 0.01;
    }

    // Check for newly expanded nodes to spawn ripples and particles
    if (snapshot.currentStep > vfx.lastStep) {
      const newEvents = snapshot.events.slice(vfx.lastStep + 1, snapshot.currentStep + 1);
      
      newEvents.forEach(evt => {
        if (evt.type === 'NODE_EXPANDED') {
          const [r, c] = evt.nodeId.split(',').map(Number);
          const cx = c * CELL_SIZE + CELL_SIZE / 2;
          const cy = r * CELL_SIZE + CELL_SIZE / 2;
          
          // Spawn Ripple
          vfx.ripples.push({
            x: cx, y: cy,
            radius: 0,
            maxRadius: CELL_SIZE * 1.5,
            opacity: 1,
            speed: 0.8
          });

          // Spawn Particles
          for (let i = 0; i < 4; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;
            vfx.particles.push({
              x: cx, y: cy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.0,
              decay: 0.02 + Math.random() * 0.03,
              size: 1 + Math.random() * 2
            });
          }
        }
      });
    } else if (snapshot.currentStep < vfx.lastStep) {
      // User scrubbed backward, clear VFX
      vfx.particles = [];
      vfx.ripples = [];
      vfx.pathProgress = 0;
    }
    
    vfx.lastStep = snapshot.currentStep;

  }, [snapshot]);

  // Redraw Background when grid or static elements change
  useEffect(() => {
    drawBackground();
  }, [grid, startNode, goalNode, drawBackground]);

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

    // LAYER 1: Obsidian black background
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    // Layer 1 overlay: subtle teal center glow
    const centerGrad = ctx.createRadialGradient(
      worldWidth / 2, worldHeight / 2, 0,
      worldWidth / 2, worldHeight / 2, Math.max(worldWidth, worldHeight) * 0.55
    );
    centerGrad.addColorStop(0, 'rgba(0, 209, 178, 0.025)');
    centerGrad.addColorStop(1, 'rgba(8, 8, 8, 0)');
    ctx.fillStyle = centerGrad;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    // LAYER 2: Structural grid lines — space tinted
    ctx.strokeStyle = 'rgba(58, 190, 255, 0.06)';
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
          ctx.fillStyle = 'rgba(107, 114, 128, 0.12)';
          ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.strokeStyle = 'rgba(107, 114, 128, 0.25)';
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 24); ctx.lineTo(x + 24, y + 4);
          ctx.stroke();
        } else if (cell.type === CellType.WEIGHTED || cell.type === CellType.HEAVY) {
          const isHeavy = cell.type === CellType.HEAVY;
          ctx.fillStyle = isHeavy ? 'rgba(142, 132, 255, 0.08)' : 'rgba(109, 93, 255, 0.08)';
          ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.strokeStyle = isHeavy ? 'rgba(142, 132, 255, 0.3)' : 'rgba(109, 93, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }

    ctx.restore();
  }

  // ────────────────────────────────────────────────────────
  // FOREGROUND ANIMATION LOOP
  // ────────────────────────────────────────────────────────
  const renderForeground = useCallback(() => {
    const canvas = canvasFgRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(dpr, dpr);
    camera.applyTransform(ctx);

    const now = Date.now();
    const vfx = vfxRef.current;
    const cellStates = snapshot?.cellStates || new Map();
    const treeNodes = snapshot?.treeNodes || new Map();
    const maxDepth = snapshot?.metrics?.maxDepth || 1;

    // Set cinematic blending
    ctx.globalCompositeOperation = 'lighter';
    
    // 1. Draw Older Traces (Discovered, Expanded, Backtracked)
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    
    for (const [key, state] of cellStates.entries()) {
      if (state === CellState.START || state === CellState.GOAL || state === CellState.CURRENT || state === CellState.IN_FRONTIER || state === CellState.FINAL_PATH) continue;

      const [r, c] = key.split(',').map(Number);
      const x = c * CELL_SIZE;
      const y = r * CELL_SIZE;
      
      const node = treeNodes.get(key);
      const depth = node?.depth || 0;
      
      if (state === CellState.DISCOVERED || state === CellState.EXPANDED) {
        // Gradient trace
        ctx.fillStyle = interpolateColor(depth, maxDepth);
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      } else if (state === CellState.BACKTRACKED) {
        ctx.fillStyle = 'rgba(236, 72, 153, 0.15)'; // Fading pink/magenta
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    }

    // 2. Draw Active Wavefront (Frontier & Current) with Bloom
    for (const [key, state] of cellStates.entries()) {
      if (state !== CellState.IN_FRONTIER && state !== CellState.CURRENT) continue;

      const [r, c] = key.split(',').map(Number);
      const x = c * CELL_SIZE;
      const y = r * CELL_SIZE;

      const pulse = (Math.sin(now * 0.005) + 1) / 2; // 0 to 1

      if (state === CellState.IN_FRONTIER) {
        // Neon pulsing aura
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 10 + pulse * 10;
        ctx.fillStyle = `rgba(0, 229, 255, ${0.3 + pulse * 0.2})`;
        ctx.strokeStyle = '#00E5FF';
        
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      } else if (state === CellState.CURRENT) {
        // Bright scanning core
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#00E5FF';
        
        const sizeOffset = pulse * 2;
        ctx.fillRect(x + 2 - sizeOffset, y + 2 - sizeOffset, CELL_SIZE - 4 + sizeOffset * 2, CELL_SIZE - 4 + sizeOffset * 2);
      }
    }

    ctx.shadowBlur = 0; // Reset bloom for particles and paths

    // 3. Draw VFX (Ripples & Particles)
    // Update & Draw Ripples
    vfx.ripples = vfx.ripples.filter(rip => {
      rip.radius += rip.speed;
      rip.opacity = 1 - (rip.radius / rip.maxRadius);
      
      if (rip.opacity <= 0) return false;
      
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 229, 255, ${rip.opacity})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      return true;
    });

    // Update & Draw Particles
    vfx.particles = vfx.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      
      if (p.life <= 0) return false;
      
      ctx.fillStyle = `rgba(0, 229, 255, ${p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      
      return true;
    });

    // 4. Draw Animated Final Path (Golden Beam)
    if (vfx.pathProgress > 0 && snapshot.path && snapshot.path.length > 0) {
      if (vfx.pathProgress < 1) {
        vfx.pathProgress += 0.015; // Animation speed
        if (vfx.pathProgress > 1) vfx.pathProgress = 1;
      }

      ctx.shadowColor = getPathColor();
      ctx.shadowBlur = 20;
      ctx.strokeStyle = getPathColor();
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const pathLength = snapshot.path.length;
      const visibleNodes = Math.ceil(pathLength * vfx.pathProgress);
      
      for (let i = 0; i < visibleNodes; i++) {
        const nodeKey = snapshot.path[i];
        const [r, c] = nodeKey.split(',').map(Number);
        const cx = c * CELL_SIZE + CELL_SIZE / 2;
        const cy = r * CELL_SIZE + CELL_SIZE / 2;
        
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Reset composite operation for endpoints & UI
    ctx.globalCompositeOperation = 'source-over';

    // 5. Draw TX start & RX goal endpoints
    const drawEndpoint = (node, isStart) => {
      const x = node.col * CELL_SIZE;
      const y = node.row * CELL_SIZE;
      const ringColor = isStart ? getStartColor() : getGoalColor();
      
      ctx.save();
      ctx.translate(x + CELL_SIZE / 2, y + CELL_SIZE / 2);

      // Pulse effect
      const pulse = (Math.sin(now * 0.004) + 1) / 2;
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = 10 + pulse * 10;
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(0, 0, CELL_SIZE / 2 - 4 + (pulse * 2), 0, Math.PI * 2);
      ctx.stroke();

      ctx.shadowBlur = 0; // Reset
      ctx.lineWidth = 1.2;

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

      ctx.restore();
    };

    if (startNode) drawEndpoint(startNode, true);
    if (goalNode) drawEndpoint(goalNode, false);

    // LAYER 4: Interactive Brush Controls (Hover Cursor)
    if (hoveredCell && isInteractive && !isPanning) {
      const hx = hoveredCell.col * CELL_SIZE;
      const hy = hoveredCell.row * CELL_SIZE;
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1;
      ctx.strokeRect(hx + 1, hy + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      // Fine coordinate crosshairs sweeps outside grid bounding box
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.1)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(hx + CELL_SIZE / 2, 0); ctx.lineTo(hx + CELL_SIZE / 2, worldHeight);
      ctx.moveTo(0, hy + CELL_SIZE / 2); ctx.lineTo(worldWidth, hy + CELL_SIZE / 2);
      ctx.stroke();
    }

    ctx.restore();

    // Loop
    animFrameId.current = requestAnimationFrame(renderForeground);
  }, [snapshot, startNode, goalNode, hoveredCell, isInteractive, isPanning, worldWidth, worldHeight]);

  // Start/Stop Animation Loop
  useEffect(() => {
    animFrameId.current = requestAnimationFrame(renderForeground);
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [renderForeground]);

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
      drawBackground(); // Update background pan
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
      className={`w-full h-full relative overflow-hidden bg-[#080808] border border-cyber-gray-light rounded ${
        isPanning ? 'cursor-grabbing' : isInteractive ? 'cursor-crosshair' : 'cursor-default'
      }`}
      style={{ minHeight: '430px' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Background layer: static grid, grid lines, obstacles */}
      <canvas
        ref={canvasBgRef}
        className="absolute top-0 left-0 pointer-events-none z-0"
      />
      {/* Foreground layer: dynamic cell states, path, brushes, VFX */}
      <canvas
        ref={canvasFgRef}
        className="absolute top-0 left-0 pointer-events-none z-10"
      />
    </div>
  );
}
