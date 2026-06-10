import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Maximize2, X, Terminal, Settings } from 'lucide-react';
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

  // Instantiate the simulation state machine once
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new SimulationEngine();
  }

  // React local copy of the engine snapshot
  const [snapshot, setSnapshot] = useState(() => engineRef.current.getSnapshot());

  // Subscribe to engine state changes
  useEffect(() => {
    const engine = engineRef.current;
    
    const onStateChange = (newSnapshot) => {
      setSnapshot(newSnapshot);
    };

    engine.subscribe(onStateChange);
    // Initial load
    engine.load(algorithm, grid, startNode, goalNode);

    return () => {
      engine.unsubscribe(onStateChange);
      engine.destroy();
    };
  }, []);

  // Send telemetry to Flask server on simulation completion
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

  // Reload engine when grid or nodes or selected algorithm changes
  useEffect(() => {
    engineRef.current.load(algorithm, grid, startNode, goalNode);
  }, [algorithm, grid, startNode, goalNode]);


  // Paint handlers
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

  // Presets and clear functions
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

  // Playback wrapper triggers
  const handlePlay = () => engineRef.current.play();
  const handlePause = () => engineRef.current.pause();
  const handleStep = () => engineRef.current.step();
  const handleStepBack = () => engineRef.current.stepBack();
  const handleReset = () => engineRef.current.reset();
  const handleSeek = (stepIndex) => engineRef.current.seekTo(stepIndex);
  const handleSpeedChange = (speed) => engineRef.current.setSpeed(speed);

  const isInteractive = snapshot.status !== SimStatus.RUNNING;

  // Build the operations log for the fullscreen modal sidebar
  const operationsLog = useMemo(() => {
    if (!snapshot || !snapshot.events) return [];
    return snapshot.events.slice(0, snapshot.currentStep + 1);
  }, [snapshot.currentStep, snapshot.events]);

  return (
    <div className="bg-cyber-black text-slate-200 font-sans theme-cyan overflow-x-hidden min-h-screen relative w-full flex flex-col items-center">
      {/* Glow Ambience backdrop */}
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/40 to-transparent"></div>
        <div className="absolute top-0 left-1/3 right-1/3 h-[90px] bg-neon-cyan/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl px-4 py-6 flex flex-col gap-6 flex-grow">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-cyber-gray-light pb-4 w-full select-none gap-4">
          <div className="flex items-center gap-3">
            <Terminal className="text-neon-cyan w-6 h-6 animate-pulse" />
            <div className="flex flex-col">
              <h1 className="font-cyber-header font-extrabold text-lg tracking-widest text-glow-cyan text-white">
                ORBITAL VECTOR TRANSMISSION TERMINAL
              </h1>
              <span className="text-[10px] font-cyber-mono tracking-wider text-slate-400">
                DEEP SPACE COMMUNICATIONS LINK REROUTING CORE v2.5.0
              </span>
            </div>
          </div>
          <div className="text-right flex items-center gap-3 bg-cyber-gray-dark border border-cyber-gray-light/60 px-3 py-1.5 rounded">
            <Settings className="text-slate-500 w-4 h-4" />
            <span className="text-[10px] font-cyber-mono text-neon-cyan uppercase">
              SECTOR STATUS: {snapshot.status === SimStatus.RUNNING ? 'CALCULATING TRANSITS' : 'TERMINAL STANDBY'}
            </span>
          </div>
        </header>

        {/* ALGORITHM SELECTOR CARDS */}
        <AlgorithmSelector
          selectedAlgorithm={algorithm}
          onSelect={setAlgorithm}
          disabled={!isInteractive}
        />

        {/* MAIN ROW layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-start">
          {/* LEFT SIDEBAR: Terrain Editor + Stats Panel */}
          <div className="lg:col-span-4 flex flex-col gap-5">
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
          </div>

          {/* RIGHT VIEWPORTS: Grid + Mini Tree */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Sector Scanner Canvas */}
            <div className="flex flex-col gap-2 bg-cyber-gray-dark border border-cyber-gray-light p-4 rounded-lg shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-cyber-gray-light pb-2 select-none">
                <h2 className="font-cyber-header text-xs font-bold text-slate-200 tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-neon-cyan rounded-full animate-ping"></span>
                  ORBITAL SECTOR SCANNER VIEWPORT
                </h2>
                <div className="font-cyber-mono text-[10px] text-neon-cyan tracking-widest text-glow-cyan">
                  LINKING: {algorithm.toUpperCase()}
                </div>
              </div>

              <div className="h-[420px] w-full">
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

              {/* Legend labels */}
              <div className="grid grid-cols-5 gap-1.5 text-[9px] font-cyber-mono text-slate-500 bg-cyber-black/50 p-2 rounded border border-cyber-gray-light text-center select-none">
                <div className="flex items-center justify-center gap-1"><span className="w-2.5 h-2.5 block border border-neon-cyan bg-neon-cyan/20"></span> TX HUB</div>
                <div className="flex items-center justify-center gap-1"><span className="w-2.5 h-2.5 block border border-neon-amber bg-neon-amber/20"></span> RX PROBE</div>
                <div className="flex items-center justify-center gap-1"><span className="w-2.5 h-2.5 block border border-neon-red bg-neon-red/15 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#ff3333_2px,#ff3333_3px)]"></span> DEBRIS (INF)</div>
                <div className="flex items-center justify-center gap-1"><span className="w-2.5 h-2.5 block border border-neon-amber bg-neon-amber/10 bg-[repeating-linear-gradient(-45deg,transparent,transparent_2px,#ffaa00_2px,#ffaa00_3px)]"></span> NEBULA (3x)</div>
                <div className="flex items-center justify-center gap-1"><span className="w-2.5 h-2.5 block border border-neon-purple bg-neon-purple/10 bg-[repeating-linear-gradient(-45deg,transparent,transparent_2px,#9d4edd_2px,#9d4edd_3px)]"></span> GRAVITY (5x)</div>
              </div>
            </div>

            {/* Collapsible Mini-Tree Visualization Panel */}
            <div 
              className="bg-cyber-gray-dark border border-cyber-gray-light p-3 rounded-lg shadow-2xl relative h-[250px] group flex flex-col cursor-pointer transition-all hover:border-slate-600"
              onClick={() => setIsTreeFullscreen(true)}
            >
              <div className="absolute top-2 right-2 z-20 text-slate-500 group-hover:text-neon-cyan transition-colors">
                <Maximize2 className="w-4 h-4" />
              </div>
              <div className="text-[10px] font-cyber-header text-slate-400 mb-2 border-b border-cyber-gray-light pb-1 select-none">
                TRAVERSAL PATH HIERARCHY TREE (CLICK TO EXPAND HUD)
              </div>
              <div className="flex-grow">
                <TreePanel
                  snapshot={snapshot}
                  isFullscreen={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER CONTROLS & TIMELINE SCRUBBER */}
        <footer className="w-full flex flex-col gap-4">
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

          <Timeline
            events={snapshot.events}
            currentStep={snapshot.currentStep}
            totalSteps={snapshot.totalSteps}
            onSeek={handleSeek}
            status={snapshot.status}
          />
        </footer>
      </div>

      {/* FULLSCREEN TREE PANEL INTERACTIVE HUD MODAL */}
      <AnimatePresence>
        {isTreeFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-cyber-black/90 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center select-none"
          >
            <div className="w-full h-full bg-cyber-gray-dark border border-neon-cyan/40 rounded-lg shadow-[0_0_50px_rgba(0,210,255,0.15)] flex flex-col md:flex-row relative overflow-hidden">
              <button
                onClick={() => setIsTreeFullscreen(false)}
                className="absolute top-4 right-4 z-50 text-slate-400 hover:text-white bg-cyber-black p-2 rounded-full border border-slate-700 cursor-pointer transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Main SVG Container */}
              <div className="w-full md:w-3/4 h-full relative p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-cyber-gray-light pb-2">
                  <h2 className="text-lg font-cyber-header font-black text-neon-cyan tracking-wider">
                    FULL SPECTRUM PATH TRAVERSAL SEARCH TREE
                  </h2>
                  <div className="text-xs font-cyber-mono text-slate-400 mr-12">
                    ◆ Total Nodes: {snapshot.treeNodes?.size || 0} | ↕ Depth: {snapshot.metrics?.maxDepth || 0}
                  </div>
                </div>
                <div className="flex-grow bg-cyber-black rounded border border-cyber-gray-light">
                  <TreePanel
                    snapshot={snapshot}
                    isFullscreen={true}
                  />
                </div>
              </div>

              {/* Operations logs Sidebar */}
              <div className="w-full md:w-1/4 h-full border-t md:border-t-0 md:border-l border-cyber-gray-light bg-cyber-black/40 p-4 flex flex-col">
                <h3 className="font-cyber-header text-xs text-slate-200 mb-3 tracking-widest border-b border-cyber-gray-light pb-2">
                  ALGORITHM OPERATIONS LOG
                </h3>
                <div className="flex-grow overflow-y-auto pr-1 font-cyber-mono text-[10px] flex flex-col gap-1.5 scrollbar-thin">
                  {operationsLog.map((evt, idx) => (
                    <div
                      key={idx}
                      className="bg-cyber-gray-dark/50 p-2 border-l border-neon-cyan/40 text-slate-400 flex flex-col gap-0.5"
                    >
                      <div className="flex justify-between text-[8px] text-slate-500 font-bold mb-0.5">
                        <span>STEP {String(idx + 1).padStart(3, '0')}</span>
                        <span className="text-neon-cyan">{evt.type}</span>
                      </div>
                      <span className="text-slate-300 leading-relaxed">
                        {evt.explanation || `Event: ${evt.type} on cell ${evt.nodeId}`}
                      </span>
                    </div>
                  )).reverse()}
                  {operationsLog.length === 0 && (
                    <div className="text-slate-600 text-center py-20 font-cyber-mono">
                      AWAITING MISSION DATA...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
