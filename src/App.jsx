import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Maximize2, X, GitBranch,
  ChevronLeft, ChevronRight, LayoutGrid, Database, Activity
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Engine
import { SimulationEngine } from './engine/simulationEngine.js';
import { AlgorithmName, SimStatus, CellType } from './engine/eventTypes.js';

// Components
import GridCanvas from './components/grid/GridCanvas.jsx';
import TerrainEditor from './components/grid/TerrainEditor.jsx';
import TreePanel from './components/tree/TreePanel.jsx';
import SimulationControls from './components/controls/SimulationControls.jsx';
import AlgorithmSelector from './components/controls/AlgorithmSelector.jsx';
import AlgorithmInspector from './components/inspector/AlgorithmInspector.jsx';
import DataStructureVisualizer from './components/inspector/DataStructureVisualizer.jsx';
import Timeline from './components/timeline/Timeline.jsx';
import TelemetryDashboard from './components/telemetry/TelemetryDashboard.jsx';

// Landing Page
import LandingPage from './components/landing/LandingPage.jsx';

const ROWS = 20;
const COLS = 35;
const DEFAULT_START = { row: 10, col: 5 };
const DEFAULT_TARGET = { row: 10, col: 29 };

const createInitialGrid = () => {
  const g = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push({ row: r, col: c, type: CellType.NORMAL });
    g.push(row);
  }
  return g;
};

/* ════════════════════════════════════════════════════════
   SCANNER SECTOR OVERLAY — atmospheric decorations
   These are CSS-only overlays, zero canvas impact
════════════════════════════════════════════════════════ */
const ScannerSectorOverlay = () => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
    overflow: 'hidden',
  }}>
    {/* Sector divider lines */}
    <div style={{
      position: 'absolute', top: 0, bottom: 0, left: '33.3%',
      borderLeft: '1px solid rgba(58,190,255,0.04)',
    }} />
    <div style={{
      position: 'absolute', top: 0, bottom: 0, left: '66.6%',
      borderLeft: '1px solid rgba(58,190,255,0.04)',
    }} />
    <div style={{
      position: 'absolute', left: 0, right: 0, top: '50%',
      borderTop: '1px solid rgba(58,190,255,0.03)',
    }} />

    {/* Orbital rings — centered */}
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '55%', aspectRatio: '1',
      border: '1px solid rgba(58,190,255,0.055)',
      borderRadius: '50%',
    }} />
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '28%', aspectRatio: '1',
      border: '1px solid rgba(109,93,255,0.05)',
      borderRadius: '50%',
    }} />

    {/* Sector labels — corner typography */}
    {[
      { top: 8, left: 12, label: 'ALPHA' },
      { top: 8, right: 12, label: 'BETA' },
      { bottom: 8, left: 12, label: 'GAMMA' },
      { bottom: 8, right: 12, label: 'DELTA' },
    ].map(({ label, ...pos }) => (
      <div key={label} style={{
        position: 'absolute', ...pos,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.4375rem', letterSpacing: '0.18em',
        color: 'rgba(58,190,255,0.25)',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
    ))}

    {/* Transmission path lines */}
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      preserveAspectRatio="none">
      {/* Diagonal corner to corner — ultra faint */}
      <line x1="0%" y1="0%" x2="100%" y2="100%"
        stroke="rgba(58,190,255,0.025)" strokeWidth="0.5" />
      <line x1="100%" y1="0%" x2="0%" y2="100%"
        stroke="rgba(58,190,255,0.025)" strokeWidth="0.5" />
    </svg>
  </div>
);

/* ════════════════════════════════════════════════════════
   MISSION CONTROL — main application interface
════════════════════════════════════════════════════════ */
function MissionControl({ initialAlgorithm = AlgorithmName.ASTAR }) {
  const [grid, setGrid] = useState(() => createInitialGrid());
  const [startNode, setStartNode] = useState(DEFAULT_START);
  const [goalNode, setGoalNode] = useState(DEFAULT_TARGET);
  const [algorithm, setAlgorithm] = useState(initialAlgorithm);
  const [activeBrush, setActiveBrush] = useState('obstacle');
  const [draggingNode, setDraggingNode] = useState(null);
  const [isTreeFullscreen, setIsTreeFullscreen] = useState(false);
  const [currentTab, setCurrentTab] = useState('scanner');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [utcTime, setUtcTime] = useState('');

  // UTC mission clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      setUtcTime(
        `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ` +
        `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // Engine
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = new SimulationEngine();

  const [snapshot, setSnapshot] = useState(() => engineRef.current.getSnapshot());

  useEffect(() => {
    const engine = engineRef.current;
    const onState = (snap) => setSnapshot(snap);
    engine.subscribe(onState);
    engine.load(algorithm, grid, startNode, goalNode);
    return () => { engine.unsubscribe(onState); engine.destroy(); };
  }, []);

  // Telemetry logging
  const lastTelRef = useRef(-1);
  useEffect(() => {
    if (snapshot.status === SimStatus.COMPLETE && snapshot.totalSteps > 0 && lastTelRef.current !== snapshot.currentStep) {
      lastTelRef.current = snapshot.currentStep;
      const explored = snapshot.metrics?.nodesDiscovered || 0;
      const cost     = snapshot.metrics?.pathCost || 0;
      const efficiency = (snapshot.pathFound && explored > 0)
        ? Math.min(100, Math.max(1, Math.round((cost / explored) * 100))) : 0;
      fetch('http://localhost:5000/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm, pathFound: snapshot.pathFound ? 'Yes' : 'No', nodesExplored: explored, pathCost: cost, efficiencyScore: efficiency }),
      }).catch(() => {});
    } else if ((snapshot.status === SimStatus.PAUSED || snapshot.status === SimStatus.IDLE) && snapshot.currentStep === -1) {
      lastTelRef.current = -1;
    }
  }, [snapshot.status, snapshot.currentStep, snapshot.totalSteps, snapshot.pathFound, algorithm]);

  useEffect(() => {
    engineRef.current.load(algorithm, grid, startNode, goalNode);
  }, [algorithm, grid, startNode, goalNode]);

  // Paint & drag
  const paintCell = useCallback((r, c, brush) => {
    if ((r === startNode.row && c === startNode.col) || (r === goalNode.row && c === goalNode.col)) return;
    setGrid(prev => {
      const copy = prev.map(row => row.map(cell => ({ ...cell })));
      const cell = copy[r]?.[c];
      if (!cell) return prev;
      if (brush === 'obstacle') cell.type = CellType.OBSTACLE;
      else if (brush === 'weighted') cell.type = CellType.WEIGHTED;
      else if (brush === 'heavy') cell.type = CellType.HEAVY;
      else if (brush === 'clear') cell.type = CellType.NORMAL;
      return copy;
    });
  }, [startNode, goalNode]);

  const handleDragStart = useCallback((r, c) => {
    if (r === startNode.row && c === startNode.col) setDraggingNode('start');
    else if (r === goalNode.row && c === goalNode.col) setDraggingNode('goal');
    else { setDraggingNode('brush'); paintCell(r, c, activeBrush); }
  }, [startNode, goalNode, activeBrush, paintCell]);

  const handleCellDrag = useCallback((r, c) => {
    if (draggingNode === 'start' && (r !== goalNode.row || c !== goalNode.col)) setStartNode({ row: r, col: c });
    else if (draggingNode === 'goal' && (r !== startNode.row || c !== startNode.col)) setGoalNode({ row: r, col: c });
    else if (draggingNode === 'brush') paintCell(r, c, activeBrush);
  }, [draggingNode, startNode, goalNode, activeBrush, paintCell]);

  const handleDragEnd = useCallback(() => setDraggingNode(null), []);

  const handleGenerateRandom = useCallback((density) => {
    engineRef.current.reset();
    const nextGrid = [];
    const obP = density / 100, wP = 0.16, hP = 0.08;
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const isSt = r === startNode.row && c === startNode.col;
        const isGo = r === goalNode.row  && c === goalNode.col;
        let type = CellType.NORMAL;
        if (!isSt && !isGo) {
          const rand = Math.random();
          if (rand < obP) type = CellType.OBSTACLE;
          else if (rand < obP + wP) type = CellType.WEIGHTED;
          else if (rand < obP + wP + hP) type = CellType.HEAVY;
        }
        row.push({ row: r, col: c, type });
      }
      nextGrid.push(row);
    }
    setGrid(nextGrid);
  }, [startNode, goalNode]);

  const handleClearAll = useCallback(() => { engineRef.current.reset(); setGrid(createInitialGrid()); }, []);

  const handleLoadPreset = useCallback((presetId) => {
    engineRef.current.reset();
    const nextGrid = createInitialGrid();
    if (presetId === 'orbital-blockades') {
      [
        {rStart:2,rEnd:5,cStart:3,cEnd:6},{rStart:2,rEnd:5,cStart:12,cEnd:15},
        {rStart:2,rEnd:5,cStart:20,cEnd:23},{rStart:2,rEnd:5,cStart:28,cEnd:31},
        {rStart:8,rEnd:11,cStart:8,cEnd:11},{rStart:8,rEnd:11,cStart:16,cEnd:19},
        {rStart:8,rEnd:11,cStart:24,cEnd:27},{rStart:14,rEnd:17,cStart:4,cEnd:7},
        {rStart:14,rEnd:17,cStart:12,cEnd:15},{rStart:14,rEnd:17,cStart:20,cEnd:23},
        {rStart:14,rEnd:17,cStart:28,cEnd:31},
      ].forEach(b => {
        for (let r = b.rStart; r <= b.rEnd; r++)
          for (let c = b.cStart; c <= b.cEnd; c++)
            if ((r !== startNode.row || c !== startNode.col) && (r !== goalNode.row || c !== goalNode.col))
              nextGrid[r][c].type = CellType.OBSTACLE;
      });
    } else if (presetId === 'asteroid-belt') {
      for (let r = 0; r < ROWS; r++) {
        const c = 17;
        if (r !== 8 && r !== 9 && r !== 10 && r !== 11) {
          if ((r !== startNode.row || c !== startNode.col) && (r !== goalNode.row || c !== goalNode.col))
            nextGrid[r][c].type = CellType.OBSTACLE;
        } else nextGrid[r][c].type = CellType.HEAVY;
      }
    } else if (presetId === 'nebula-field') {
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          if ((r === startNode.row && c === startNode.col) || (r === goalNode.row && c === goalNode.col)) continue;
          const rand = Math.random();
          if (rand < 0.22) nextGrid[r][c].type = CellType.WEIGHTED;
          else if (rand < 0.30) nextGrid[r][c].type = CellType.HEAVY;
        }
    }
    setGrid(nextGrid);
  }, [startNode, goalNode]);

  // Playback
  const handlePlay      = () => engineRef.current.play();
  const handlePause     = () => engineRef.current.pause();
  const handleStep      = () => engineRef.current.step();
  const handleStepBack  = () => engineRef.current.stepBack();
  const handleReset     = () => engineRef.current.reset();
  const handleSeek      = (s) => engineRef.current.seekTo(s);
  const handleSpeedChange = (sp) => engineRef.current.setSpeed(sp);

  const isInteractive = snapshot.status !== SimStatus.RUNNING;

  const operationsLog = useMemo(() => {
    if (!snapshot?.events) return [];
    return snapshot.events.slice(0, snapshot.currentStep + 1);
  }, [snapshot.currentStep, snapshot.events]);

  const navItems = [
    { id: 'scanner',   label: 'Scanner',    icon: LayoutGrid },
    { id: 'tree',      label: 'Search Tree', icon: GitBranch },
    { id: 'telemetry', label: 'Telemetry',   icon: Database },
  ];

  const statusColor = snapshot.status === SimStatus.RUNNING  ? '#3ABEFF'
    : snapshot.status === SimStatus.COMPLETE ? '#00D1B2'
    : snapshot.status === SimStatus.PAUSED   ? '#6D5DFF' : '#44556B';

  const statusLabel = snapshot.status === SimStatus.RUNNING  ? 'COMPUTING'
    : snapshot.status === SimStatus.COMPLETE ? 'COMPLETE'
    : snapshot.status === SimStatus.PAUSED   ? 'PAUSED' : 'STANDBY';

  // Algorithm accent color
  const algoAccent = {
    [AlgorithmName.BFS]: '#3ABEFF',
    [AlgorithmName.DFS]: '#6D5DFF',
    [AlgorithmName.DIJKSTRA]: '#00D1B2',
    [AlgorithmName.ASTAR]: '#3ABEFF',
  }[algorithm] || '#3ABEFF';

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#05060A', color: '#F8FAFC',
      fontFamily: '"Inter", sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Deep space orbital grid */}
      <div className="orbital-grid" />

      {/* Atmospheric nebula in mission control bg */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 45% 40% at 80% 20%, rgba(109,93,255,0.04) 0%, transparent 65%),
          radial-gradient(ellipse 40% 35% at 15% 75%, rgba(58,190,255,0.03) 0%, transparent 60%)
        `,
      }} />

      {/* ── LEFT SIDEBAR ── */}
      <motion.aside
        layout
        animate={{ width: isSidebarCollapsed ? 52 : 196 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{
          flexShrink: 0, zIndex: 20,
          background: '#0D1321',
          borderRight: '1px solid #1E2D45',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {/* Sidebar top */}
        <div>
          {/* MCA Logo */}
          <div style={{
            height: 56, display: 'flex', alignItems: 'center',
            padding: '0 14px', gap: 10,
            borderBottom: '1px solid #1E2D45',
          }}>
            {/* Orbital logo mark */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="9" stroke="rgba(58,190,255,0.3)" strokeWidth="0.75" strokeDasharray="2.5 3" />
              <circle cx="12" cy="12" r="5" stroke="#3ABEFF" strokeWidth="0.75" />
              <circle cx="12" cy="12" r="2" fill="#3ABEFF" />
              <line x1="12" y1="3" x2="12" y2="7" stroke="rgba(58,190,255,0.5)" strokeWidth="0.75" />
            </svg>
            {!isSidebarCollapsed && (
              <div>
                <div style={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700, fontSize: '0.875rem',
                  letterSpacing: '0.04em', color: '#F8FAFC',
                  lineHeight: 1,
                }}>
                  MCA
                </div>
                <div style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.375rem', letterSpacing: '0.16em',
                  color: '#44556B', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  Mission Control
                </div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{ padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = currentTab === id;
              return (
                <button key={id} onClick={() => setCurrentTab(id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 10, padding: isSidebarCollapsed ? '10px 14px' : '10px 12px',
                    background: active ? 'rgba(58,190,255,0.07)' : 'transparent',
                    border: 'none',
                    borderLeft: active ? '2px solid #3ABEFF' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(248,250,252,0.03)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={15}
                    color={active ? '#3ABEFF' : '#44556B'}
                    style={{ flexShrink: 0, transition: 'color 0.12s' }}
                  />
                  {!isSidebarCollapsed && (
                    <span style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
                      fontSize: '0.6875rem', letterSpacing: '0.07em',
                      textTransform: 'uppercase', color: active ? '#F8FAFC' : '#44556B',
                      whiteSpace: 'nowrap', transition: 'color 0.12s',
                    }}>
                      {label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar bottom */}
        <div style={{ borderTop: '1px solid #1E2D45', padding: '6px' }}>
          <button onClick={() => setIsSidebarCollapsed(p => !p)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 10, padding: '10px 12px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', color: '#44556B', transition: 'color 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.color = '#44556B'}
          >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            {!isSidebarCollapsed && (
              <span style={{
                fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
                fontSize: '0.625rem', letterSpacing: '0.08em',
                textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>
                Collapse
              </span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* ── MAIN WORKSPACE ── */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 10 }}>

        {/* ── TOP BAR ── */}
        <header style={{
          height: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 24px', borderBottom: '1px solid #1E2D45',
          background: 'rgba(13,19,33,0.95)',
          backdropFilter: 'blur(8px)',
          flexShrink: 0,
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Status */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '4px 12px', border: `1px solid ${statusColor}30`,
              background: `${statusColor}0A`,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: statusColor, display: 'inline-block',
              }} />
              <span style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5625rem',
                letterSpacing: '0.16em', color: statusColor, textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                {statusLabel}
              </span>
            </div>

            {/* Mission clock */}
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5625rem',
              letterSpacing: '0.1em', color: '#44556B', textTransform: 'uppercase',
            }}>
              {utcTime}
            </span>

            {/* Algorithm badge */}
            <div style={{
              padding: '3px 10px',
              background: `${algoAccent}10`,
              border: `1px solid ${algoAccent}28`,
            }}>
              <span style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5625rem',
                letterSpacing: '0.14em', color: algoAccent,
                textTransform: 'uppercase', fontWeight: 600,
              }}>
                {algorithm}
              </span>
            </div>
          </div>

          {/* Right */}
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5625rem',
            letterSpacing: '0.1em', color: '#253450',
          }}>
            STEP {snapshot.currentStep === -1 ? '000' : String(snapshot.currentStep + 1).padStart(3, '0')} / {String(snapshot.totalSteps).padStart(3, '0')}
          </div>
        </header>

        {/* ── CONTENT ── */}
        <div style={{ flexGrow: 1, padding: 20, overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            <motion.div key={currentTab}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 18, minHeight: '100%' }}
            >

              {/* ── SCANNER TAB ── */}
              {currentTab === 'scanner' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 316px', gap: 18, alignItems: 'start' }}>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Algorithm selector */}
                    <AlgorithmSelector selectedAlgorithm={algorithm} onSelect={setAlgorithm} disabled={!isInteractive} />

                    {/* Scanner viewport */}
                    <div className="control-module" style={{ padding: 0, overflow: 'hidden' }}>
                      <div className="hud-bracket-tl" /><div className="hud-bracket-tr" />
                      <div className="hud-bracket-bl" /><div className="hud-bracket-br" />

                      {/* Header */}
                      <div style={{
                        padding: '10px 14px 9px', borderBottom: '1px solid #1E2D45',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{
                          fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                          fontSize: '0.5625rem', letterSpacing: '0.16em',
                          textTransform: 'uppercase', color: '#8899AA',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#3ABEFF', display: 'inline-block' }} />
                          Sector Scanner — {algorithm}
                        </span>
                        <span style={{
                          fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5rem',
                          letterSpacing: '0.1em', color: '#253450',
                        }}>
                          {ROWS}×{COLS}
                        </span>
                      </div>

                      {/* Canvas + overlays */}
                      <div style={{ height: 440, width: '100%', position: 'relative' }}>
                        <GridCanvas
                          grid={grid} snapshot={snapshot}
                          startNode={startNode} goalNode={goalNode}
                          onCellClick={paintCell} onCellDrag={handleCellDrag}
                          onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                          activeBrush={activeBrush} isInteractive={isInteractive}
                        />
                        {/* Sector overlay decorations */}
                        <ScannerSectorOverlay />
                      </div>

                      {/* Legend */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
                        gap: 4, padding: '8px 14px 10px',
                        borderTop: '1px solid #1E2D45', background: '#080C15',
                      }}>
                        {[
                          { color: '#00D1B2', label: 'Origin' },
                          { color: '#3ABEFF', label: 'Target' },
                          { color: '#EF4444', label: 'Obstacle' },
                          { color: '#6D5DFF', label: 'Nebula 3×' },
                          { color: '#8B7DFF', label: 'Gravity 5×' },
                        ].map(({ color, label }) => (
                          <div key={label} style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.4375rem', letterSpacing: '0.08em',
                            color: '#44556B', textTransform: 'uppercase',
                          }}>
                            <span style={{ width: 7, height: 7, borderRadius: 1, background: color, flexShrink: 0, opacity: 0.8 }} />
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Controls */}
                    <SimulationControls
                      status={snapshot.status} currentStep={snapshot.currentStep}
                      totalSteps={snapshot.totalSteps} speed={snapshot.speed}
                      onPlay={handlePlay} onPause={handlePause}
                      onStep={handleStep} onStepBack={handleStepBack}
                      onReset={handleReset} onSpeedChange={handleSpeedChange}
                    />

                    {/* Timeline */}
                    <Timeline
                      events={snapshot.events} currentStep={snapshot.currentStep}
                      totalSteps={snapshot.totalSteps} onSeek={handleSeek}
                      status={snapshot.status}
                    />
                  </div>

                  {/* Right panel */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <TerrainEditor
                      activeBrush={activeBrush} onBrushChange={setActiveBrush}
                      onGenerateRandom={handleGenerateRandom}
                      onLoadPreset={handleLoadPreset} onClearAll={handleClearAll}
                      disabled={!isInteractive}
                    />
                    <AlgorithmInspector snapshot={snapshot} />
                    <DataStructureVisualizer snapshot={snapshot} />

                    {/* Mini Tree */}
                    <div className="control-module" style={{ cursor: 'pointer', minHeight: 180, display: 'flex', flexDirection: 'column' }}
                      onClick={() => setIsTreeFullscreen(true)}>
                      <div className="hud-bracket-tl" /><div className="hud-bracket-tr" />
                      <div className="hud-bracket-bl" /><div className="hud-bracket-br" />
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
                      }}>
                        <span style={{
                          fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                          fontSize: '0.5rem', letterSpacing: '0.16em',
                          color: '#44556B', textTransform: 'uppercase',
                        }}>
                          Search Tree
                        </span>
                        <Maximize2 size={12} color="#44556B" />
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <TreePanel snapshot={snapshot} isFullscreen={false} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TREE TAB ── */}
              {currentTab === 'tree' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ borderBottom: '1px solid #1E2D45', paddingBottom: 12 }}>
                    <h2 style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                      fontSize: '1.0625rem', letterSpacing: '-0.02em',
                      color: '#F8FAFC', margin: '0 0 4px',
                    }}>
                      Search Tree Hierarchy
                    </h2>
                    <span style={{
                      fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5625rem',
                      letterSpacing: '0.1em', color: '#44556B',
                    }}>
                      {snapshot.treeNodes?.size || 0} nodes · depth {snapshot.metrics?.maxDepth || 0}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex', gap: 14, minHeight: 560,
                    background: '#080C15', border: '1px solid #1E2D45',
                  }}>
                    <div style={{ flexGrow: 1, position: 'relative' }}>
                      <TreePanel snapshot={snapshot} isFullscreen={true} />
                    </div>
                    <div style={{
                      width: 256, flexShrink: 0,
                      borderLeft: '1px solid #1E2D45',
                      background: '#0D1321', padding: 14,
                      display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                      <h3 style={{
                        fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                        fontSize: '0.5rem', letterSpacing: '0.16em',
                        color: '#8899AA', textTransform: 'uppercase',
                        margin: '0 0 10px', paddingBottom: 10,
                        borderBottom: '1px solid #1E2D45',
                      }}>
                        Operations Log
                      </h3>
                      <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {operationsLog.length === 0 ? (
                          <div style={{ color: '#1E2D45', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', textAlign: 'center', marginTop: 40 }}>
                            Awaiting simulation...
                          </div>
                        ) : [...operationsLog].reverse().map((evt, idx) => (
                          <div key={idx} style={{
                            padding: '7px 9px', background: '#080C15',
                            borderLeft: '2px solid rgba(58,190,255,0.4)',
                          }}>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.4375rem', letterSpacing: '0.1em',
                              color: '#44556B', marginBottom: 3,
                            }}>
                              <span>STEP {String(operationsLog.length - idx).padStart(3, '0')}</span>
                              <span style={{ color: '#3ABEFF' }}>{evt.type}</span>
                            </div>
                            <span style={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.4375rem', lineHeight: 1.5, color: '#8899AA',
                            }}>
                              {evt.explanation || `${evt.type} on ${evt.nodeId}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TELEMETRY TAB ── */}
              {currentTab === 'telemetry' && <TelemetryDashboard />}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── FULLSCREEN TREE ── */}
      <AnimatePresence>
        {isTreeFullscreen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(5,6,10,0.96)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
          >
            <div style={{
              width: '100%', height: '100%',
              background: '#0D1321', border: '1px solid #1E2D45',
              display: 'flex', position: 'relative', overflow: 'hidden',
            }}>
              <button onClick={() => setIsTreeFullscreen(false)} style={{
                position: 'absolute', top: 12, right: 12, zIndex: 10,
                background: '#111929', border: '1px solid #1E2D45',
                padding: 6, cursor: 'pointer',
                color: '#44556B', display: 'flex',
                transition: 'color 0.12s, border-color 0.12s',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F8FAFC'; e.currentTarget.style.borderColor = '#3ABEFF'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#44556B'; e.currentTarget.style.borderColor = '#1E2D45'; }}
              >
                <X size={15} />
              </button>

              <div style={{ flexGrow: 1, position: 'relative' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #1E2D45' }}>
                  <span style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                    fontSize: '0.8125rem', letterSpacing: '-0.01em', color: '#F8FAFC',
                  }}>
                    Full Spectrum Search Tree
                  </span>
                </div>
                <div style={{ position: 'absolute', inset: 0, top: 46 }}>
                  <TreePanel snapshot={snapshot} isFullscreen={true} />
                </div>
              </div>

              <div style={{
                width: 272, flexShrink: 0,
                borderLeft: '1px solid #1E2D45', background: '#080C15',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}>
                <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #1E2D45' }}>
                  <span style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                    fontSize: '0.5rem', letterSpacing: '0.16em',
                    color: '#8899AA', textTransform: 'uppercase',
                  }}>
                    Operations Log
                  </span>
                </div>
                <div style={{ overflowY: 'auto', flexGrow: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {operationsLog.length === 0 ? (
                    <div style={{ color: '#1E2D45', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', textAlign: 'center', marginTop: 48 }}>
                      Awaiting simulation...
                    </div>
                  ) : [...operationsLog].reverse().map((evt, idx) => (
                    <div key={idx} style={{
                      padding: '6px 8px', background: '#0D1321',
                      borderLeft: '2px solid rgba(58,190,255,0.35)',
                    }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.4375rem', letterSpacing: '0.1em',
                        color: '#44556B', marginBottom: 2,
                      }}>
                        <span>STEP {String(operationsLog.length - idx).padStart(3, '0')}</span>
                        <span style={{ color: '#3ABEFF' }}>{evt.type}</span>
                      </div>
                      <span style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.4375rem', lineHeight: 1.5, color: '#8899AA',
                      }}>
                        {evt.explanation || `${evt.type} on ${evt.nodeId}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   APP ROOT
════════════════════════════════════════════════════════ */
export default function App() {
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(AlgorithmName.ASTAR);

  const handleEnterApp = (algo) => {
    if (algo) setSelectedAlgorithm(algo);
    setHasEnteredApp(true);
  };

  if (!hasEnteredApp) return <LandingPage onEnterApp={handleEnterApp} />;
  return <MissionControl initialAlgorithm={selectedAlgorithm} />;
}
