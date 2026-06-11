import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Maximize2, X, Database, GitBranch, 
  ChevronLeft, ChevronRight, Sun, Moon, Compass, Activity, 
  LayoutGrid, Clock, User
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Import engine components
import { SimulationEngine } from './engine/simulationEngine.js';
import { AlgorithmName, SimStatus, CellType } from './engine/eventTypes.js';

// Import visualization components
import GridCanvas from './components/grid/GridCanvas.jsx';
import TerrainEditor from './components/grid/TerrainEditor.jsx';
import TreePanel from './components/tree/TreePanel.jsx';
import SimulationControls from './components/controls/SimulationControls.jsx';
import AlgorithmSelector from './components/controls/AlgorithmSelector.jsx';
import AlgorithmInspector from './components/inspector/AlgorithmInspector.jsx';
import DataStructureVisualizer from './components/inspector/DataStructureVisualizer.jsx';
import Timeline from './components/timeline/Timeline.jsx';
import TelemetryDashboard from './components/telemetry/TelemetryDashboard.jsx';

const ROWS = 20;
const COLS = 35;
const DEFAULT_START = { row: 10, col: 5 };
const DEFAULT_TARGET = { row: 10, col: 29 };

const createInitialGrid = () => {
  const newGrid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push({ row: r, col: c, type: CellType.NORMAL });
    }
    newGrid.push(row);
  }
  return newGrid;
};

export default function App() {
  const [grid, setGrid] = useState(() => createInitialGrid());
  const [startNode, setStartNode] = useState(DEFAULT_START);
  const [goalNode, setGoalNode] = useState(DEFAULT_TARGET);
  const [algorithm, setAlgorithm] = useState(AlgorithmName.ASTAR);
  const [activeBrush, setActiveBrush] = useState('obstacle');
  const [draggingNode, setDraggingNode] = useState(null); // 'start', 'goal', 'brush'
  const [isTreeFullscreen, setIsTreeFullscreen] = useState(false);
  
  // Navigation & Theme tabs (default sidebar collapsed to a navigation rail)
  const [currentTab, setCurrentTab] = useState('scanner'); // 'scanner' | 'tree' | 'telemetry'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [utcTime, setUtcTime] = useState('');

  // Clock tick in UTC format
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const yr = d.getUTCFullYear();
      const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dy = String(d.getUTCDate()).padStart(2, '0');
      const hr = String(d.getUTCHours()).padStart(2, '0');
      const mi = String(d.getUTCMinutes()).padStart(2, '0');
      const sc = String(d.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${yr}-${mo}-${dy} ${hr}:${mi}:${sc} UTC`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync theme
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  // Instantiate simulation state machine
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new SimulationEngine();
  }

  // React local copy of engine snapshot
  const [snapshot, setSnapshot] = useState(() => engineRef.current.getSnapshot());

  // Subscribe to engine state changes
  useEffect(() => {
    const engine = engineRef.current;
    const onStateChange = (newSnapshot) => {
      setSnapshot(newSnapshot);
    };

    engine.subscribe(onStateChange);
    engine.load(algorithm, grid, startNode, goalNode);

    return () => {
      engine.unsubscribe(onStateChange);
      engine.destroy();
    };
  }, []);

  // Telemetry endpoint submission
  const lastTelemetryStepRef = useRef(-1);

  useEffect(() => {
    if (snapshot.status === SimStatus.COMPLETE && snapshot.totalSteps > 0 && lastTelemetryStepRef.current !== snapshot.currentStep) {
      lastTelemetryStepRef.current = snapshot.currentStep;

      const exploredCount = snapshot.metrics?.nodesDiscovered || 0;
      const cost = snapshot.metrics?.pathCost || 0;
      const pathFound = snapshot.pathFound;

      let efficiencyScore = 0;
      if (pathFound && exploredCount > 0) {
        efficiencyScore = Math.min(100, Math.max(1, Math.round((cost / exploredCount) * 100)));
      }

      const saveTelemetryLog = async () => {
        try {
          await fetch('http://localhost:5000/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              algorithm: algorithm,
              pathFound: pathFound ? 'Yes' : 'No',
              nodesExplored: exploredCount,
              pathCost: cost,
              efficiencyScore,
            }),
          });
        } catch (e) {
          console.warn("Telemetry server offline:", e);
        }
      };

      saveTelemetryLog();
    } else if (snapshot.status === SimStatus.PAUSED || snapshot.status === SimStatus.IDLE) {
      if (snapshot.currentStep === -1) {
        lastTelemetryStepRef.current = -1;
      }
    }
  }, [snapshot.status, snapshot.currentStep, snapshot.totalSteps, snapshot.pathFound, algorithm]);

  // Reload engine when selector updates
  useEffect(() => {
    engineRef.current.load(algorithm, grid, startNode, goalNode);
  }, [algorithm, grid, startNode, goalNode]);

  // Paint handles
  const paintCell = useCallback((r, c, brush) => {
    if ((r === startNode.row && c === startNode.col) || (r === goalNode.row && c === goalNode.col)) return;

    setGrid((prev) => {
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
    const isStart = r === startNode.row && c === startNode.col;
    const isGoal = r === goalNode.row && c === goalNode.col;

    if (isStart) {
      setDraggingNode('start');
    } else if (isGoal) {
      setDraggingNode('goal');
    } else {
      setDraggingNode('brush');
      paintCell(r, c, activeBrush);
    }
  }, [startNode, goalNode, activeBrush, paintCell]);

  const handleCellDrag = useCallback((r, c) => {
    if (draggingNode === 'start') {
      if (r !== goalNode.row || c !== goalNode.col) {
        setStartNode({ row: r, col: c });
      }
    } else if (draggingNode === 'goal') {
      if (r !== startNode.row || c !== startNode.col) {
        setGoalNode({ row: r, col: c });
      }
    } else if (draggingNode === 'brush') {
      paintCell(r, c, activeBrush);
    }
  }, [draggingNode, startNode, goalNode, activeBrush, paintCell]);

  const handleDragEnd = useCallback(() => {
    setDraggingNode(null);
  }, []);

  const handleGenerateRandom = useCallback((density) => {
    engineRef.current.reset();
    const nextGrid = [];
    const obstacleProb = density / 100;
    const weightedProb = 0.16;
    const heavyProb = 0.08;

    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const isStart = r === startNode.row && c === startNode.col;
        const isGoal = r === goalNode.row && c === goalNode.col;
        let type = CellType.NORMAL;

        if (!isStart && !isGoal) {
          const rand = Math.random();
          if (rand < obstacleProb) {
            type = CellType.OBSTACLE;
          } else if (rand < obstacleProb + weightedProb) {
            type = CellType.WEIGHTED;
          } else if (rand < obstacleProb + weightedProb + heavyProb) {
            type = CellType.HEAVY;
          }
        }
        row.push({ row: r, col: c, type });
      }
      nextGrid.push(row);
    }
    setGrid(nextGrid);
  }, [startNode, goalNode]);

  const handleClearAll = useCallback(() => {
    engineRef.current.reset();
    setGrid(createInitialGrid());
  }, []);

  const handleLoadPreset = useCallback((presetId) => {
    engineRef.current.reset();
    const nextGrid = createInitialGrid();

    if (presetId === 'orbital-blockades') {
      const blockades = [
        { rStart: 2, rEnd: 5, cStart: 3, cEnd: 6 },
        { rStart: 2, rEnd: 5, cStart: 12, cEnd: 15 },
        { rStart: 2, rEnd: 5, cStart: 20, cEnd: 23 },
        { rStart: 2, rEnd: 5, cStart: 28, cEnd: 31 },
        { rStart: 8, rEnd: 11, cStart: 8, cEnd: 11 },
        { rStart: 8, rEnd: 11, cStart: 16, cEnd: 19 },
        { rStart: 8, rEnd: 11, cStart: 24, cEnd: 27 },
        { rStart: 14, rEnd: 17, cStart: 4, cEnd: 7 },
        { rStart: 14, rEnd: 17, cStart: 12, cEnd: 15 },
        { rStart: 14, rEnd: 17, cStart: 20, cEnd: 23 },
        { rStart: 14, rEnd: 17, cStart: 28, cEnd: 31 },
      ];
      blockades.forEach((b) => {
        for (let r = b.rStart; r <= b.rEnd; r++) {
          for (let c = b.cStart; c <= b.cEnd; c++) {
            if ((r !== startNode.row || c !== startNode.col) && (r !== goalNode.row || c !== goalNode.col)) {
              nextGrid[r][c].type = CellType.OBSTACLE;
            }
          }
        }
      });
    } else if (presetId === 'asteroid-belt') {
      for (let r = 0; r < ROWS; r++) {
        const c = 17;
        if (r !== 8 && r !== 9 && r !== 10 && r !== 11) {
          if ((r !== startNode.row || c !== startNode.col) && (r !== goalNode.row || c !== goalNode.col)) {
            nextGrid[r][c].type = CellType.OBSTACLE;
          }
        } else {
          nextGrid[r][c].type = CellType.HEAVY;
        }
      }
    } else if (presetId === 'nebula-field') {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if ((r === startNode.row && c === startNode.col) || (r === goalNode.row && c === goalNode.col)) continue;
          const rand = Math.random();
          if (rand < 0.22) {
            nextGrid[r][c].type = CellType.WEIGHTED;
          } else if (rand < 0.3) {
            nextGrid[r][c].type = CellType.HEAVY;
          }
        }
      }
    }

    setGrid(nextGrid);
  }, [startNode, goalNode]);

  // Actions
  const handlePlay = () => engineRef.current.play();
  const handlePause = () => engineRef.current.pause();
  const handleStep = () => engineRef.current.step();
  const handleStepBack = () => engineRef.current.stepBack();
  const handleReset = () => engineRef.current.reset();
  const handleSeek = (stepIndex) => engineRef.current.seekTo(stepIndex);
  const handleSpeedChange = (speed) => engineRef.current.setSpeed(speed);

  const isInteractive = snapshot.status !== SimStatus.RUNNING;

  const operationsLog = useMemo(() => {
    if (!snapshot || !snapshot.events) return [];
    return snapshot.events.slice(0, snapshot.currentStep + 1);
  }, [snapshot.currentStep, snapshot.events]);

  const navItems = [
    { id: 'scanner', label: 'Scanner View', icon: LayoutGrid },
    { id: 'tree', label: 'Hierarchy Tree', icon: GitBranch },
    { id: 'telemetry', label: 'Telemetry HUD', icon: Database },
  ];

  return (
    <div className="flex min-h-screen bg-cyber-black text-slate-200 font-sans select-none overflow-x-hidden relative w-full">
      {/* Structural coordinate mesh background mapping */}
      <div className="orbital-grid" />

      {/* LEFT Navigation Rail (Spacecraft Selector Console) */}
      <motion.aside
        layout
        animate={{ width: isSidebarCollapsed ? 64 : 220 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="flex-shrink-0 z-20 bg-cyber-gray-dark border-r border-cyber-gray-light flex flex-col justify-between select-none relative"
      >
        <div className="flex flex-col">
          {/* Rail Header */}
          <div className="h-16 flex items-center px-4 border-b border-cyber-gray-light gap-3 overflow-hidden select-none">
            <div className="w-8 h-8 rounded border border-electric-cyan flex items-center justify-center relative shrink-0">
              <Activity className="text-electric-cyan w-4.5 h-4.5" />
            </div>
            {!isSidebarCollapsed && (
              <span className="font-cyber-header font-black text-sm text-white tracking-widest leading-none whitespace-nowrap">
                SEC-OPS NAV
              </span>
            )}
          </div>

          {/* Tactile System Links */}
          <nav className="flex flex-col gap-1.5 p-2 pt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-4 p-3 rounded border text-left text-xs font-cyber-header tracking-wider uppercase transition-all relative cursor-pointer ${
                    isActive
                      ? 'border-electric-cyan/40 text-white bg-cyber-gray'
                      : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-cyber-gray/30'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-electric-cyan' : 'text-slate-500'}`} />
                  {!isSidebarCollapsed && <span className="font-bold leading-none">{item.label}</span>}
                  {isActive && !isSidebarCollapsed && (
                    <div className="absolute right-3 w-1.5 h-1.5 bg-electric-cyan rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Console control footer */}
        <div className="flex flex-col border-t border-cyber-gray-light p-2 gap-1.5 overflow-hidden">
          <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-4 p-3 hover:bg-cyber-gray/30 rounded text-slate-500 hover:text-white transition-all text-xs font-cyber-header font-bold tracking-wider uppercase cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            {!isSidebarCollapsed && <span>{theme === 'dark' ? 'SOLAR MATRIX' : 'DEEP SPACE'}</span>}
          </button>

          <button
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            className="w-full flex items-center gap-4 p-3 hover:bg-cyber-gray/30 rounded text-slate-500 hover:text-white transition-all text-xs font-cyber-header font-bold tracking-wider uppercase cursor-pointer"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5 shrink-0" /> : <ChevronLeft className="w-5 h-5 shrink-0" />}
            {!isSidebarCollapsed && <span>MINIMIZE RAIL</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Workspace Frame */}
      <main className="flex-grow flex flex-col min-w-0 relative z-10 min-h-screen">
        {/* Subsystem Header Bar */}
        <header className="h-16 flex justify-between items-center px-6 border-b border-cyber-gray-light bg-cyber-gray-dark select-none shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 bg-cyber-black border border-cyber-gray-light px-3 py-1.5 rounded">
              <span className="flex h-2 w-2">
                <span className={`inline-flex rounded-full h-2 w-2 ${
                  snapshot.status === SimStatus.RUNNING ? 'bg-electric-cyan' : 'bg-success'
                }`} />
              </span>
              <span className="text-[10px] font-cyber-mono text-slate-300 font-bold uppercase tracking-widest">
                SYS.STATUS: {snapshot.status === SimStatus.RUNNING ? 'COMPUTING ROUTE' : 'ACTIVE_STANDBY'}
              </span>
            </div>

            {/* Spacecraft UTC clock */}
            <div className="hidden sm:flex items-center gap-2 bg-cyber-black border border-cyber-gray-light px-3 py-1.5 rounded text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-cyber-mono text-[9px] font-bold tracking-widest text-slate-300">
                {utcTime}
              </span>
            </div>

            {/* Linked hardware indicators */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[9px] font-cyber-header font-bold text-slate-500 tracking-wider">
                HARDWARE LINKS:
              </span>
              <span className="bg-cyber-gray border border-cyber-gray-light text-electric-cyan font-cyber-mono text-[9px] px-2 py-0.5 rounded font-bold">
                TRANSCEIVER ONLINE
              </span>
            </div>
          </div>

          {/* Commander Credentials block */}
          <div className="flex items-center gap-2 border border-cyber-gray-light bg-cyber-black px-3 py-1.5 rounded">
            <div className="w-6 h-6 rounded-sm border border-royal-blue bg-cyber-gray flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="hidden lg:flex flex-col text-left leading-none">
              <span className="text-[9px] font-cyber-header font-bold text-white">CDR. V. SHRESTHA</span>
              <span className="text-[7.5px] font-cyber-mono text-slate-500">DEPUTY COMMANDER</span>
            </div>
          </div>
        </header>

        {/* Subsystem Workspace Slot */}
        <div className="flex-grow p-6 overflow-y-auto w-full max-w-7xl mx-auto flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-grow flex flex-col gap-6"
            >
              {/* Tab 1: Hero Scanner HUD Split */}
              {currentTab === 'scanner' && (
                <div className="flex-grow grid grid-cols-1 xl:grid-cols-10 gap-6 items-start">
                  
                  {/* CENTER COLUMN: Hero main scanner viewport (60% width = 6 columns) */}
                  <div className="xl:col-span-6 flex flex-col gap-5">
                    
                    {/* Visual identity selectors */}
                    <AlgorithmSelector
                      selectedAlgorithm={algorithm}
                      onSelect={setAlgorithm}
                      disabled={!isInteractive}
                    />

                    {/* Viewport Scanner control module */}
                    <div className="control-module">
                      <div className="hud-bracket-tl" />
                      <div className="hud-bracket-tr" />
                      <div className="hud-bracket-bl" />
                      <div className="hud-bracket-br" />

                      <div className="control-module-header">
                        <h2 className="text-xs font-cyber-header font-bold text-white tracking-widest flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-electric-cyan rounded-full" />
                          ORBITAL SECTOR SCANNER VIEWPORT
                        </h2>
                        <div className="font-cyber-mono text-[9px] text-electric-cyan tracking-widest uppercase font-bold">
                          NAV_MAP_SECTOR_LINK: {algorithm.toUpperCase()}
                        </div>
                      </div>

                      <div className="h-[430px] w-full relative">
                        <GridCanvas
                          grid={grid}
                          snapshot={snapshot}
                          startNode={startNode}
                          goalNode={goalNode}
                          onCellClick={paintCell}
                          onCellDrag={handleCellDrag}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          activeBrush={activeBrush}
                          isInteractive={isInteractive}
                        />
                      </div>

                      {/* Legend sectors */}
                      <div className="grid grid-cols-5 gap-1.5 text-[8.5px] font-cyber-mono text-slate-400 bg-cyber-black p-2.5 mt-3 rounded border border-cyber-gray-light text-center font-semibold select-none">
                        <div className="flex items-center justify-center gap-1.5"><span className="w-2.5 h-2.5 block border border-electric-cyan bg-electric-cyan/20"></span> TX HUB</div>
                        <div className="flex items-center justify-center gap-1.5"><span className="w-2.5 h-2.5 block border border-royal-blue bg-royal-blue/20"></span> RX PROBE</div>
                        <div className="flex items-center justify-center gap-1.5"><span className="w-2.5 h-2.5 block border border-critical bg-critical/15 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#ff5d73_2px,#ff5d73_3px)]"></span> DEBRIS (INF)</div>
                        <div className="flex items-center justify-center gap-1.5"><span className="w-2.5 h-2.5 block border border-warning bg-warning/10 bg-[repeating-linear-gradient(-45deg,transparent,transparent_2px,#ffb547_2px,#ffb547_3px)]"></span> NEBULA (3x)</div>
                        <div className="flex items-center justify-center gap-1.5"><span className="w-2.5 h-2.5 block border border-deep-violet bg-deep-violet/10 bg-[repeating-linear-gradient(-45deg,transparent,transparent_2px,#8e84ff_2px,#8e84ff_3px)]"></span> GRAVITY (5x)</div>
                      </div>
                    </div>

                    {/* Simulation timeline & scrubbers */}
                    <div className="control-module">
                      <div className="hud-bracket-tl" />
                      <div className="hud-bracket-tr" />
                      <div className="hud-bracket-bl" />
                      <div className="hud-bracket-br" />
                      <SimulationControls
                        status={snapshot.status}
                        currentStep={snapshot.currentStep}
                        totalSteps={snapshot.totalSteps}
                        speed={snapshot.speed}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onStep={handleStep}
                        onStepBack={handleStepBack}
                        onReset={handleReset}
                        onSpeedChange={handleSpeedChange}
                      />
                      <div className="mt-4">
                        <Timeline
                          events={snapshot.events}
                          currentStep={snapshot.currentStep}
                          totalSteps={snapshot.totalSteps}
                          onSeek={handleSeek}
                          status={snapshot.status}
                        />
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Telemetry Intelligence modules (40% width = 4 columns) */}
                  <div className="xl:col-span-4 flex flex-col gap-5">
                    
                    {/* Brush Terrain paint module */}
                    <TerrainEditor
                      activeBrush={activeBrush}
                      onBrushChange={setActiveBrush}
                      onGenerateRandom={handleGenerateRandom}
                      onLoadPreset={handleLoadPreset}
                      onClearAll={handleClearAll}
                      disabled={!isInteractive}
                    />

                    {/* Numeric stats readout */}
                    <AlgorithmInspector snapshot={snapshot} />

                    {/* Priority Queue heap registers */}
                    <DataStructureVisualizer snapshot={snapshot} />

                    {/* Compact Tree radar preview module */}
                    <div 
                      className="control-module cursor-pointer h-[240px] group flex flex-col"
                      onClick={() => setIsTreeFullscreen(true)}
                    >
                      <div className="hud-bracket-tl" />
                      <div className="hud-bracket-tr" />
                      <div className="hud-bracket-bl" />
                      <div className="hud-bracket-br" />
                      
                      <div className="absolute top-3 right-3 text-slate-500 group-hover:text-electric-cyan transition-colors">
                        <Maximize2 className="w-4.5 h-4.5" />
                      </div>
                      
                      <div className="text-[9px] font-cyber-header font-bold text-slate-400 mb-2 border-b border-cyber-gray-light pb-1 select-none">
                        VECTOR SEARCH PATH MATRIX (CLICK HUD TO FULLSCREEN)
                      </div>
                      <div className="flex-grow">
                        <TreePanel snapshot={snapshot} isFullscreen={false} />
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Tab 2: Full-spectrum search tree HUD */}
              {currentTab === 'tree' && (
                <div className="flex-grow flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-cyber-gray-light pb-2">
                    <h2 className="text-base font-cyber-header font-black text-white tracking-wider">
                      TRAVERSAL PATH HIERARCHY RADAR PORTAL
                    </h2>
                    <div className="text-[10px] font-cyber-mono text-slate-400">
                      ◆ TELEMETRY BRANCH NODES: {snapshot.treeNodes?.size || 0} | ↕ RADAR DEPTH: {snapshot.metrics?.maxDepth || 0}
                    </div>
                  </div>
                  
                  <div className="flex-grow bg-cyber-black rounded min-h-[500px] relative flex flex-col md:flex-row border border-cyber-gray-light overflow-hidden">
                    <div className="w-full md:w-3/4 h-full relative p-5 flex flex-col">
                      <div className="flex-grow bg-cyber-gray-dark/50 rounded border border-cyber-gray-light">
                        <TreePanel snapshot={snapshot} isFullscreen={true} />
                      </div>
                    </div>

                    <div className="w-full md:w-1/4 h-full border-t md:border-t-0 md:border-l border-cyber-gray-light bg-cyber-gray-dark p-4 flex flex-col">
                      <h3 className="font-cyber-header text-[10px] text-slate-300 mb-3 tracking-widest border-b border-cyber-gray-light pb-2">
                        SECTOR OPERATIONS REGISTER
                      </h3>
                      <div className="flex-grow overflow-y-auto pr-1 font-cyber-mono text-[9px] flex flex-col gap-1.5 max-h-[480px]">
                        {operationsLog.map((evt, idx) => (
                          <div
                            key={idx}
                            className="bg-cyber-black p-2 border-l border-electric-cyan text-slate-400 flex flex-col gap-0.5"
                          >
                            <div className="flex justify-between text-[8px] text-slate-500 font-bold mb-0.5">
                              <span>STEP {String(idx + 1).padStart(3, '0')}</span>
                              <span className="text-electric-cyan">{evt.type}</span>
                            </div>
                            <span className="text-slate-300 leading-relaxed">
                              {evt.explanation || `Event: ${evt.type} on cell ${evt.nodeId}`}
                            </span>
                          </div>
                        )).reverse()}
                        {operationsLog.length === 0 && (
                          <div className="text-slate-600 text-center py-20 font-cyber-mono">
                            AWAITING ROUTE TELEMETRY...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Telemetry SQL Analytics HUD */}
              {currentTab === 'telemetry' && (
                <TelemetryDashboard />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* FULLSCREEN TREE RADAR HUD DIALOG */}
      <AnimatePresence>
        {isTreeFullscreen && (
          <div className="fixed inset-0 z-50 bg-cyber-black/95 p-4 md:p-8 flex items-center justify-center select-none">
            <div className="w-full h-full bg-cyber-gray-dark border border-electric-cyan/30 rounded flex flex-col md:flex-row relative overflow-hidden">
              <button
                onClick={() => setIsTreeFullscreen(false)}
                className="absolute top-4 right-4 z-50 text-slate-400 hover:text-white bg-cyber-black p-2 rounded border border-cyber-gray-light cursor-pointer transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-full md:w-3/4 h-full relative p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-cyber-gray-light pb-2">
                  <h2 className="text-lg font-cyber-header font-black text-white tracking-wider uppercase">
                    FULL SPECTRUM PATH TRAVERSAL RADAR SCANNER
                  </h2>
                  <div className="text-xs font-cyber-mono text-slate-400 mr-12">
                    ◆ Total Nodes: {snapshot.treeNodes?.size || 0} | ↕ Depth: {snapshot.metrics?.maxDepth || 0}
                  </div>
                </div>
                <div className="flex-grow bg-cyber-black rounded border border-cyber-gray-light">
                  <TreePanel snapshot={snapshot} isFullscreen={true} />
                </div>
              </div>

              <div className="w-full md:w-1/4 h-full border-t md:border-t-0 md:border-l border-cyber-gray-light bg-cyber-gray-dark p-4 flex flex-col">
                <h3 className="font-cyber-header text-xs text-slate-200 mb-3 tracking-widest border-b border-cyber-gray-light pb-2">
                  SECTOR OPERATIONS REGISTER
                </h3>
                <div className="flex-grow overflow-y-auto pr-1 font-cyber-mono text-[9px] flex flex-col gap-1.5">
                  {operationsLog.map((evt, idx) => (
                    <div
                      key={idx}
                      className="bg-cyber-black p-2 border-l border-electric-cyan text-slate-400 flex flex-col gap-0.5"
                    >
                      <div className="flex justify-between text-[8px] text-slate-500 font-bold mb-0.5">
                        <span>STEP {String(idx + 1).padStart(3, '0')}</span>
                        <span className="text-electric-cyan">{evt.type}</span>
                      </div>
                      <span className="text-slate-300 leading-relaxed">
                        {evt.explanation || `Event: ${evt.type} on cell ${evt.nodeId}`}
                      </span>
                    </div>
                  )).reverse()}
                  {operationsLog.length === 0 && (
                    <div className="text-slate-600 text-center py-20 font-cyber-mono">
                      AWAITING ROUTE TELEMETRY...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
