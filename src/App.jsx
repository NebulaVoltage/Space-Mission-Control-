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

  // UTC clock
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
        { rStart:2,rEnd:5,cStart:3,cEnd:6 }, { rStart:2,rEnd:5,cStart:12,cEnd:15 },
        { rStart:2,rEnd:5,cStart:20,cEnd:23 }, { rStart:2,rEnd:5,cStart:28,cEnd:31 },
        { rStart:8,rEnd:11,cStart:8,cEnd:11 }, { rStart:8,rEnd:11,cStart:16,cEnd:19 },
        { rStart:8,rEnd:11,cStart:24,cEnd:27 }, { rStart:14,rEnd:17,cStart:4,cEnd:7 },
        { rStart:14,rEnd:17,cStart:12,cEnd:15 }, { rStart:14,rEnd:17,cStart:20,cEnd:23 },
        { rStart:14,rEnd:17,cStart:28,cEnd:31 },
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
        } else { nextGrid[r][c].type = CellType.HEAVY; }
      }
    } else if (presetId === 'nebula-field') {
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          if ((r === startNode.row && c === startNode.col) || (r === goalNode.row && c === goalNode.col)) continue;
          const rand = Math.random();
          if (rand < 0.22) nextGrid[r][c].type = CellType.WEIGHTED;
          else if (rand < 0.3) nextGrid[r][c].type = CellType.HEAVY;
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
    { id: 'scanner',  label: 'Scanner',   icon: LayoutGrid },
    { id: 'tree',     label: 'Search Tree', icon: GitBranch },
    { id: 'telemetry',label: 'Telemetry', icon: Database },
  ];

  // ── Status color ──
  const statusColor = snapshot.status === SimStatus.RUNNING ? '#00D1B2'
    : snapshot.status === SimStatus.COMPLETE ? '#22C55E'
    : snapshot.status === SimStatus.PAUSED ? '#FF9A3C' : '#5C5650';

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#080808', color: '#F5F1E8',
      fontFamily: '"Inter", sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Structural grid overlay */}
      <div className="orbital-grid" />

      {/* ── LEFT SIDEBAR ── */}
      <motion.aside
        layout
        animate={{ width: isSidebarCollapsed ? 56 : 200 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{
          flexShrink: 0, zIndex: 20,
          background: '#111111',
          borderRight: '1px solid #2E2E2E',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {/* Sidebar top */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Logo */}
          <div style={{
            height: 56, display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: 12,
            borderBottom: '1px solid #2E2E2E',
          }}>
            <div style={{
              width: 24, height: 24, flexShrink: 0,
              background: '#FF7A00',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={12} color="#080808" strokeWidth={2.5} />
            </div>
            {!isSidebarCollapsed && (
              <span style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700, fontSize: '0.8125rem',
                letterSpacing: '0.04em', color: '#F5F1E8',
                whiteSpace: 'nowrap',
              }}>
                PATH<span style={{ color: '#FF7A00' }}>FINDER</span>
              </span>
            )}
          </div>

          {/* Nav items */}
          <nav style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = currentTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setCurrentTab(id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 12, padding: isSidebarCollapsed ? '10px 16px' : '10px 12px',
                    background: active ? 'rgba(255,122,0,0.08)' : 'transparent',
                    border: 'none',
                    borderLeft: active ? '2px solid #FF7A00' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={16}
                    color={active ? '#FF7A00' : '#5C5650'}
                    style={{ flexShrink: 0, transition: 'color 0.12s' }}
                  />
                  {!isSidebarCollapsed && (
                    <span style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 600, fontSize: '0.75rem',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: active ? '#F5F1E8' : '#5C5650',
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
        <div style={{
          borderTop: '1px solid #2E2E2E',
          padding: '8px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <button
            onClick={() => setIsSidebarCollapsed(p => !p)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 12, padding: '10px 12px',
              background: 'transparent', border: 'none',
              cursor: 'pointer',
              color: '#5C5650', transition: 'color 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#F5F1E8'}
            onMouseLeave={e => e.currentTarget.style.color = '#5C5650'}
          >
            {isSidebarCollapsed
              ? <ChevronRight size={16} />
              : <ChevronLeft size={16} />}
            {!isSidebarCollapsed && (
              <span style={{
                fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
                fontSize: '0.6875rem', letterSpacing: '0.08em',
                textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>
                Collapse
              </span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* ── MAIN WORKSPACE ── */}
      <main style={{
        flexGrow: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, position: 'relative', zIndex: 10,
      }}>

        {/* ── TOP BAR ── */}
        <header style={{
          height: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid #2E2E2E',
          background: '#111111',
          flexShrink: 0,
        }}>
          {/* Left info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Status dot + text */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 12px', border: '1px solid #2E2E2E',
              background: '#1A1A1A',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: statusColor,
                display: 'inline-block',
              }} />
              <span style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.625rem', letterSpacing: '0.14em',
                color: statusColor, textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                {snapshot.status === SimStatus.RUNNING ? 'Computing' :
                 snapshot.status === SimStatus.COMPLETE ? 'Complete' :
                 snapshot.status === SimStatus.PAUSED ? 'Paused' : 'Standby'}
              </span>
            </div>

            {/* UTC Clock */}
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.625rem', letterSpacing: '0.1em',
              color: '#5C5650', textTransform: 'uppercase',
            }}>
              {utcTime}
            </span>

            {/* Algorithm badge */}
            <div style={{
              padding: '4px 10px', background: 'rgba(255,122,0,0.08)',
              border: '1px solid rgba(255,122,0,0.25)',
            }}>
              <span style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.625rem', letterSpacing: '0.12em',
                color: '#FF7A00', textTransform: 'uppercase', fontWeight: 600,
              }}>
                {algorithm}
              </span>
            </div>
          </div>

          {/* Right info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.625rem', letterSpacing: '0.1em',
              color: '#5C5650',
            }}>
              STEP {snapshot.currentStep === -1 ? '000' : String(snapshot.currentStep + 1).padStart(3, '0')} / {String(snapshot.totalSteps).padStart(3, '0')}
            </span>
          </div>
        </header>

        {/* ── CONTENT AREA ── */}
        <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100%' }}
            >

              {/* ── SCANNER TAB ── */}
              {currentTab === 'scanner' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 320px',
                  gap: 20, alignItems: 'start',
                }}>

                  {/* Center — Grid + Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Algorithm selector */}
                    <AlgorithmSelector
                      selectedAlgorithm={algorithm}
                      onSelect={setAlgorithm}
                      disabled={!isInteractive}
                    />

                    {/* Scanner viewport */}
                    <div className="control-module" style={{ padding: 0, overflow: 'hidden' }}>
                      <div className="hud-bracket-tl" /><div className="hud-bracket-tr" />
                      <div className="hud-bracket-bl" /><div className="hud-bracket-br" />

                      <div style={{
                        padding: '12px 16px 0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: '1px solid #2E2E2E', marginBottom: 0, paddingBottom: 10,
                      }}>
                        <span style={{
                          fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                          fontSize: '0.625rem', letterSpacing: '0.14em',
                          textTransform: 'uppercase', color: '#A09A8E',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00D1B2', display: 'inline-block' }} />
                          Sector Scanner — {algorithm}
                        </span>
                        <span style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '0.5625rem', letterSpacing: '0.1em',
                          color: '#5C5650',
                        }}>
                          {ROWS}×{COLS} GRID
                        </span>
                      </div>

                      <div style={{ height: 440, width: '100%', position: 'relative' }}>
                        <GridCanvas
                          grid={grid} snapshot={snapshot}
                          startNode={startNode} goalNode={goalNode}
                          onCellClick={paintCell} onCellDrag={handleCellDrag}
                          onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                          activeBrush={activeBrush} isInteractive={isInteractive}
                        />
                      </div>

                      {/* Legend */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: 6, padding: '10px 16px 12px',
                        borderTop: '1px solid #2E2E2E',
                        background: '#0D0D0D',
                      }}>
                        {[
                          { color: '#00D1B2', label: 'Start' },
                          { color: '#FF7A00', label: 'Goal' },
                          { color: '#EF4444', label: 'Obstacle' },
                          { color: '#F59E0B', label: 'Nebula 3×' },
                          { color: '#8B5CF6', label: 'Gravity 5×' },
                        ].map(({ color, label }) => (
                          <div key={label} style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.5625rem', letterSpacing: '0.06em',
                            color: '#5C5650', textTransform: 'uppercase',
                          }}>
                            <span style={{ width: 8, height: 8, borderRadius: 1, background: color, flexShrink: 0, opacity: 0.85 }} />
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Simulation Controls */}
                    <SimulationControls
                      status={snapshot.status}
                      currentStep={snapshot.currentStep}
                      totalSteps={snapshot.totalSteps}
                      speed={snapshot.speed}
                      onPlay={handlePlay} onPause={handlePause}
                      onStep={handleStep} onStepBack={handleStepBack}
                      onReset={handleReset} onSpeedChange={handleSpeedChange}
                    />

                    {/* Timeline */}
                    <Timeline
                      events={snapshot.events}
                      currentStep={snapshot.currentStep}
                      totalSteps={snapshot.totalSteps}
                      onSeek={handleSeek}
                      status={snapshot.status}
                    />
                  </div>

                  {/* Right sidebar — inspector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <TerrainEditor
                      activeBrush={activeBrush}
                      onBrushChange={setActiveBrush}
                      onGenerateRandom={handleGenerateRandom}
                      onLoadPreset={handleLoadPreset}
                      onClearAll={handleClearAll}
                      disabled={!isInteractive}
                    />

                    <AlgorithmInspector snapshot={snapshot} />

                    <DataStructureVisualizer snapshot={snapshot} />

                    {/* Mini Tree Preview */}
                    <div
                      className="control-module"
                      style={{ cursor: 'pointer', minHeight: 200, display: 'flex', flexDirection: 'column' }}
                      onClick={() => setIsTreeFullscreen(true)}
                    >
                      <div className="hud-bracket-tl" /><div className="hud-bracket-tr" />
                      <div className="hud-bracket-bl" /><div className="hud-bracket-br" />

                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 8,
                      }}>
                        <span style={{
                          fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                          fontSize: '0.5625rem', letterSpacing: '0.14em',
                          color: '#5C5650', textTransform: 'uppercase',
                        }}>
                          Search Tree
                        </span>
                        <Maximize2 size={13} color="#5C5650" />
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid #2E2E2E', paddingBottom: 12,
                  }}>
                    <div>
                      <h2 style={{
                        fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                        fontSize: '1.125rem', letterSpacing: '-0.02em',
                        color: '#F5F1E8', margin: 0, marginBottom: 4,
                      }}>
                        Search Tree Hierarchy
                      </h2>
                      <span style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.625rem', letterSpacing: '0.1em',
                        color: '#5C5650',
                      }}>
                        {snapshot.treeNodes?.size || 0} nodes · depth {snapshot.metrics?.maxDepth || 0}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex', gap: 16,
                    minHeight: 560,
                    background: '#0D0D0D',
                    border: '1px solid #2E2E2E',
                  }}>
                    <div style={{ flexGrow: 1, position: 'relative' }}>
                      <TreePanel snapshot={snapshot} isFullscreen={true} />
                    </div>

                    <div style={{
                      width: 260, flexShrink: 0,
                      borderLeft: '1px solid #2E2E2E',
                      background: '#111111',
                      padding: 16, display: 'flex', flexDirection: 'column',
                      overflow: 'hidden',
                    }}>
                      <h3 style={{
                        fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                        fontSize: '0.625rem', letterSpacing: '0.14em',
                        color: '#A09A8E', textTransform: 'uppercase',
                        margin: 0, marginBottom: 12,
                        paddingBottom: 10, borderBottom: '1px solid #2E2E2E',
                      }}>
                        Operations Log
                      </h3>
                      <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {operationsLog.length === 0 ? (
                          <div style={{ color: '#2E2E2E', fontSize: '0.75rem', fontFamily: '"JetBrains Mono", monospace', textAlign: 'center', marginTop: 40 }}>
                            Awaiting simulation...
                          </div>
                        ) : [...operationsLog].reverse().map((evt, idx) => (
                          <div key={idx} style={{
                            padding: '8px 10px',
                            background: '#0D0D0D',
                            borderLeft: '2px solid #FF7A00',
                          }}>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.5625rem', letterSpacing: '0.1em',
                              color: '#5C5650', marginBottom: 4,
                            }}>
                              <span>STEP {String(operationsLog.length - idx).padStart(3, '0')}</span>
                              <span style={{ color: '#FF7A00' }}>{evt.type}</span>
                            </div>
                            <span style={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: '0.5625rem', lineHeight: 1.5,
                              color: '#A09A8E',
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

      {/* ── FULLSCREEN TREE DIALOG ── */}
      <AnimatePresence>
        {isTreeFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(8,8,8,0.96)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <div style={{
              width: '100%', height: '100%',
              background: '#111111',
              border: '1px solid #2E2E2E',
              display: 'flex', position: 'relative',
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setIsTreeFullscreen(false)}
                style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 10,
                  background: '#1A1A1A', border: '1px solid #2E2E2E',
                  padding: '6px', cursor: 'pointer',
                  color: '#5C5650', display: 'flex',
                  transition: 'color 0.12s, border-color 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F5F1E8'; e.currentTarget.style.borderColor = '#FF7A00'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#5C5650'; e.currentTarget.style.borderColor = '#2E2E2E'; }}
              >
                <X size={16} />
              </button>

              <div style={{ flexGrow: 1, position: 'relative' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #2E2E2E' }}>
                  <span style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                    fontSize: '0.875rem', letterSpacing: '-0.01em', color: '#F5F1E8',
                  }}>
                    Full Spectrum Search Tree
                  </span>
                </div>
                <div style={{ position: 'absolute', inset: 0, top: 48 }}>
                  <TreePanel snapshot={snapshot} isFullscreen={true} />
                </div>
              </div>

              <div style={{
                width: 280, flexShrink: 0,
                borderLeft: '1px solid #2E2E2E',
                background: '#0D0D0D',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}>
                <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #2E2E2E' }}>
                  <span style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                    fontSize: '0.625rem', letterSpacing: '0.14em',
                    color: '#A09A8E', textTransform: 'uppercase',
                  }}>
                    Operations Log
                  </span>
                </div>
                <div style={{ overflowY: 'auto', flexGrow: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {operationsLog.length === 0 ? (
                    <div style={{ color: '#2E2E2E', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', textAlign: 'center', marginTop: 48 }}>
                      Awaiting simulation...
                    </div>
                  ) : [...operationsLog].reverse().map((evt, idx) => (
                    <div key={idx} style={{
                      padding: '7px 9px', background: '#111111',
                      borderLeft: '2px solid rgba(255,122,0,0.5)',
                    }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.5rem', letterSpacing: '0.1em',
                        color: '#5C5650', marginBottom: 3,
                      }}>
                        <span>STEP {String(operationsLog.length - idx).padStart(3, '0')}</span>
                        <span style={{ color: '#FF7A00' }}>{evt.type}</span>
                      </div>
                      <span style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.5rem', lineHeight: 1.5, color: '#A09A8E',
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
   APP ROOT — Renders landing OR mission control
════════════════════════════════════════════════════════ */
export default function App() {
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(AlgorithmName.ASTAR);

  const handleEnterApp = (algo) => {
    if (algo) setSelectedAlgorithm(algo);
    setHasEnteredApp(true);
  };

  if (!hasEnteredApp) {
    return <LandingPage onEnterApp={handleEnterApp} />;
  }

  return <MissionControl initialAlgorithm={selectedAlgorithm} />;
}
