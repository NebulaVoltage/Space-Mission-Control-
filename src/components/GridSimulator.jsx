import { useState, useRef, useCallback } from 'react';
import { Play, Settings, Info, Building2, Clock, Eraser } from 'lucide-react';
import { runBFS, runDFS, runDijkstra, runAStar } from '../utils/pathfinding';
import TreeVisualization from './TreeVisualization';

// Grid Dimensions
const ROWS = 20;
const COLS = 35;
const DEFAULT_START = { row: 10, col: 5 };
const DEFAULT_TARGET = { row: 10, col: 29 };

const PRESETS = {
  'urban-maze': {
    name: 'Orbital Blockades',
    description: 'Simulates a standard grid with orbital debris.',
    obstacles: [
      { rStart: 2, rEnd: 5, cStart: 3, cEnd: 6 },
      { rStart: 2, rEnd: 5, cStart: 10, cEnd: 13 },
      { rStart: 2, rEnd: 5, cStart: 17, cEnd: 20 },
      { rStart: 2, rEnd: 5, cStart: 24, cEnd: 27 },
      { rStart: 2, rEnd: 5, cStart: 30, cEnd: 32 },
      { rStart: 8, rEnd: 11, cStart: 3, cEnd: 6 },
      { rStart: 8, rEnd: 11, cStart: 10, cEnd: 13 },
      { rStart: 8, rEnd: 11, cStart: 17, cEnd: 20 },
      { rStart: 8, rEnd: 11, cStart: 24, cEnd: 27 },
      { rStart: 8, rEnd: 11, cStart: 30, cEnd: 32 },
      { rStart: 14, rEnd: 17, cStart: 3, cEnd: 6 },
      { rStart: 14, rEnd: 17, cStart: 10, cEnd: 13 },
      { rStart: 14, rEnd: 17, cStart: 17, cEnd: 20 },
      { rStart: 14, rEnd: 17, cStart: 24, cEnd: 27 },
      { rStart: 14, rEnd: 17, cStart: 30, cEnd: 32 }
    ],
    dunes: []
  },
  'traffic-blockade': {
    name: 'Asteroid Belt',
    description: 'Heavy debris wall, forcing detour routes.',
    obstacles: [
      { rStart: 0, rEnd: 7, cStart: 15, cEnd: 15 },
      { rStart: 12, rEnd: 19, cStart: 15, cEnd: 15 }
    ],
    dunes: [
      { rStart: 8, rEnd: 11, cStart: 14, cEnd: 16 }
    ]
  },
  'clear-channel': {
    name: 'Deep Space Void',
    description: 'Flat grid for benchmark routing speeds.',
    obstacles: [],
    dunes: []
  }
};

const createInitialGrid = () => {
  const newGrid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push({ row: r, col: c, isObstacle: false, isDunes: false });
    }
    newGrid.push(row);
  }
  return newGrid;
};

export default function GridSimulator() {
  const [algorithm, setAlgorithm] = useState('A-Star');
  const [speed, setSpeed] = useState(8);
  const [density, setDensity] = useState(30);
  const [activeBrush, setActiveBrush] = useState('obstacle');
  
  const [grid, setGrid] = useState(() => createInitialGrid());
  const [startNode, setStartNode] = useState(DEFAULT_START);
  const [targetNode, setTargetNode] = useState(DEFAULT_TARGET);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawType, setDrawType] = useState('obstacle');
  const [draggingNode, setDraggingNode] = useState(null);
  
  const [isRunning, setIsRunning] = useState(false);
  
  const [runResult, setRunResult] = useState(null); // For Tree Visualization
  
  const isRunningRef = useRef(false);
  const timeoutRef = useRef(null);
  
  const [nodesExplored, setNodesExplored] = useState(0);
  const [pathCost, setPathCost] = useState(0);
  const [cycles, setCycles] = useState(0);

  // Directly clear CSS classes from the DOM (ZERO LAG)
  const clearOverlays = useCallback(() => {
    document.querySelectorAll('.cell-visited, .cell-path').forEach(el => {
      el.classList.remove('cell-visited', 'cell-path');
    });
    setNodesExplored(0);
    setPathCost(0);
    setCycles(0);
    setRunResult(null);
  }, []);

  const abortSimulation = useCallback(() => {
    isRunningRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const updateCellTerrain = useCallback((r, c, isObstacle, isDunes) => {
    setGrid(prev => {
      if (!prev[r] || !prev[r][c]) return prev;
      if (prev[r][c].isObstacle === isObstacle && prev[r][c].isDunes === isDunes) return prev;
      const copy = [...prev];
      copy[r] = [...prev[r]];
      copy[r][c] = { ...prev[r][c], isObstacle, isDunes };
      return copy;
    });
  }, []);

  const paintCell = useCallback((r, c, brush) => {
    clearOverlays();
    if (brush === 'obstacle') updateCellTerrain(r, c, true, false);
    else if (brush === 'dunes') updateCellTerrain(r, c, false, true);
    else if (brush === 'clear') updateCellTerrain(r, c, false, false);
  }, [clearOverlays, updateCellTerrain]);

  const loadPreset = useCallback((presetKey) => {
    abortSimulation();
    clearOverlays();
    clearOverlays();
    const preset = PRESETS[presetKey];
    if (!preset) return;
    
    const newGrid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const isStart = r === startNode.row && c === startNode.col;
        const isTarget = r === targetNode.row && c === targetNode.col;
        let isObstacle = false, isDunes = false;
        if (!isStart && !isTarget) {
          isObstacle = preset.obstacles.some(b => r >= b.rStart && r <= b.rEnd && c >= b.cStart && c <= b.cEnd);
          isDunes = preset.dunes.some(b => r >= b.rStart && r <= b.rEnd && c >= b.cStart && c <= b.cEnd);
        }
        row.push({ row: r, col: c, isObstacle, isDunes });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
  }, [startNode, targetNode, abortSimulation, clearOverlays]);

  const generateRandomTerrain = useCallback(() => {
    abortSimulation();
    clearOverlays();
    clearOverlays();
    const newGrid = [];
    const obstacleProb = density / 100;
    const dunesProb = 0.15; 
    
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const isStart = r === startNode.row && c === startNode.col;
        const isTarget = r === targetNode.row && c === targetNode.col;
        let isObstacle = false, isDunes = false;
        if (!isStart && !isTarget) {
          const rand = Math.random();
          if (rand < obstacleProb) isObstacle = true;
          else if (rand < obstacleProb + dunesProb) isDunes = true;
        }
        row.push({ row: r, col: c, isObstacle, isDunes });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
  }, [density, startNode, targetNode, abortSimulation, clearOverlays]);

  const handleMouseDown = useCallback((r, c) => {
    if (isRunning) return;
    if (r === startNode.row && c === startNode.col) { setDraggingNode('start'); return; }
    if (r === targetNode.row && c === targetNode.col) { setDraggingNode('target'); return; }
    setIsDrawing(true);
    setDrawType(activeBrush);
    paintCell(r, c, activeBrush);
  }, [isRunning, startNode, targetNode, activeBrush, paintCell]);

  const handleMouseEnter = useCallback((r, c) => {
    if (isRunning) return;
    const isStart = r === startNode.row && c === startNode.col;
    const isTarget = r === targetNode.row && c === targetNode.col;

    if (draggingNode === 'start') {
      if (!isTarget) {
        updateCellTerrain(r, c, false, false);
        setStartNode({ row: r, col: c });
        clearOverlays();
      }
      return;
    }
    if (draggingNode === 'target') {
      if (!isStart) {
        updateCellTerrain(r, c, false, false);
        setTargetNode({ row: r, col: c });
        clearOverlays();
      }
      return;
    }
    if (isDrawing && !isStart && !isTarget) {
      paintCell(r, c, drawType);
    }
  }, [isRunning, draggingNode, startNode, targetNode, isDrawing, drawType, paintCell, updateCellTerrain, clearOverlays]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setDraggingNode(null);
  }, []);

  const saveTelemetryLog = () => {
    // logs removed
    // No logs state anymore
  };

  const launchSimulation = () => {
    if (isRunning) return;
    clearOverlays();

    let result;
    if (algorithm === 'BFS') result = runBFS(grid, startNode, targetNode);
    else if (algorithm === 'DFS') result = runDFS(grid, startNode, targetNode);
    else if (algorithm === 'Dijkstra') result = runDijkstra(grid, startNode, targetNode);
    else result = runAStar(grid, startNode, targetNode);

    const { visitedNodesInOrder, path, pathCost: finalCost, computeCycles, pathFound } = result;

    // Immediately pass tree data to visualizer
    setRunResult(result);

    setIsRunning(true);
    isRunningRef.current = true;

    // Faster speed scaling
    const batchSize = Math.max(1, Math.floor(speed / 1.5));
    const delay = Math.max(2, 60 - (speed * 5));

    let index = 0;
    
    const animateExploration = () => {
      if (!isRunningRef.current) return setIsRunning(false);

      if (index < visitedNodesInOrder.length) {
        const batchNodes = [];
        for (let b = 0; b < batchSize; b++) {
          if (index + b < visitedNodesInOrder.length) batchNodes.push(visitedNodesInOrder[index + b]);
        }

        // Direct DOM manipulation for ZERO lag React
        for (const node of batchNodes) {
          const key = `${node.row},${node.col}`;
          const el = document.getElementById(`cell-${key}`);
          if (el) el.classList.add('cell-visited');
          
          // Animate tree elements concurrently
          const treeNode = document.getElementById(`tree-node-${key}`);
          if (treeNode) treeNode.style.opacity = '1';
          const treeLink = document.getElementById(`tree-link-${key}`);
          if (treeLink) treeLink.style.opacity = '1';
        }

        setNodesExplored(Math.min(visitedNodesInOrder.length, index + batchSize));
        setCycles(prev => prev + Math.floor(Math.random() * 8) + 3);

        index += batchSize;
        timeoutRef.current = setTimeout(animateExploration, delay);
      } else {
        setNodesExplored(visitedNodesInOrder.length);
        setCycles(computeCycles);

        if (pathFound && path.length > 0) {
          let pathIdx = 0;
          const animatePath = () => {
            if (!isRunningRef.current) return setIsRunning(false);

            if (pathIdx < path.length) {
              const currentNode = path[pathIdx];
              const key = `${currentNode.row},${currentNode.col}`;
              
              const el = document.getElementById(`cell-${key}`);
              if (el) {
                el.classList.remove('cell-visited');
                el.classList.add('cell-path');
              }
              
              const treeNode = document.getElementById(`tree-node-${key}`);
              if (treeNode) treeNode.style.stroke = '#ff6d00';
              const treeLink = document.getElementById(`tree-link-${key}`);
              if (treeLink) treeLink.style.stroke = '#ff6d00';
              
              setPathCost(Math.round(((pathIdx + 1) / path.length) * finalCost));
              
              pathIdx++;
              timeoutRef.current = setTimeout(animatePath, 15);
            } else {
              setPathCost(finalCost);
              setIsRunning(false);
              saveTelemetryLog();
            }
          };
          animatePath();
        } else {
          setPathCost(0);
          setIsRunning(false);
          saveTelemetryLog();
        }
      }
    };

    animateExploration();
  };

  const algorithmInfo = {
    'BFS': { desc: 'Explores isotropic wavefront layers.', context: 'Unweighted routing path dispatch.', pros: 'Guarantees lowest hop-count road path.', cons: 'Heavy memory footprint.' },
    'DFS': { desc: 'Probes single vector recursively before backtracking.', context: 'Deep space anomaly probe.', pros: 'Minimal processor memory allocation.', cons: 'No transit duration optimization.' },
    'Dijkstra': { desc: 'Explores routes sorted by lowest cumulative transit time.', context: 'Weighted terrain navigation.', pros: 'Guarantees absolute optimal routing path.', cons: 'Unguided search.' },
    'A-Star': { desc: 'Uses accumulated route latency + Manhattan geometric heuristic.', context: 'Real-time optimal drone courier link establishing.', pros: 'Highly directed, efficient pathfinder.', cons: 'Dependent on heuristic accuracy.' }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 w-full max-w-7xl mx-auto" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      
      {/* LEFT CONTROL PANEL */}
      <section className="lg:col-span-4 flex flex-col gap-4">
        
        {/* Dispatch Config Panel */}
        <div className="bg-cyber-gray-dark border border-cyber-gray-light p-4 relative flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-cyber-gray-light pb-2">
            <Settings className="text-neon-cyan w-4 h-4" />
            <h2 className="font-cyber-header text-xs font-bold text-neon-cyan uppercase tracking-wider">
              MISSION CONTROL ROUTING
            </h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-cyber-header uppercase tracking-wider text-slate-400">ALGORITHM ENGINE</label>
            <div className="grid grid-cols-4 gap-1 bg-cyber-black p-1 rounded border border-cyber-gray-light shadow-inner">
              {['BFS', 'DFS', 'Dijkstra', 'A-Star'].map(alg => (
                <button
                  key={alg}
                  onClick={() => !isRunning && setAlgorithm(alg)}
                  disabled={isRunning}
                  className={`font-cyber-mono py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
                    algorithm === alg ? 'bg-neon-cyan/15 border border-neon-cyan text-neon-cyan text-glow-cyan shadow-[0_0_10px_var(--brand-cyan-glow-low)]' : 'text-slate-500 hover:text-slate-300'
                  } disabled:opacity-50`}
                >
                  {alg === 'A-Star' ? 'A*' : alg}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-cyber-black/50 border border-cyber-gray-light p-3 rounded text-[11px] font-cyber-mono flex flex-col gap-1.5 shadow-inner">
            <div className="flex items-center gap-1.5 text-neon-cyan border-b border-cyber-gray-light/30 pb-1">
              <Info className="w-3.5 h-3.5" />
              <span>ROUTING SPECS: {algorithm}</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">{algorithmInfo[algorithm].desc}</p>
          </div>

          <div className="flex flex-col gap-3.5 pt-1">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] font-cyber-header uppercase text-slate-400">
                <span>PROCESSING SPEED (HZ)</span>
                <span className="font-cyber-mono text-neon-cyan text-glow-cyan font-bold">{speed * 10} Hz</span>
              </div>
              <input type="range" min="1" max="10" value={speed} onChange={(e) => setSpeed(parseInt(e.target.value))} className="w-full accent-neon-cyan cursor-pointer bg-cyber-black rounded-lg h-1.5 appearance-none border border-cyber-gray-light" />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] font-cyber-header uppercase text-slate-400">
                <span>ASTEROID DENSITY (σ)</span>
                <span className="font-cyber-mono text-neon-amber text-glow-amber font-bold">{density}%</span>
              </div>
              <input type="range" min="10" max="50" value={density} disabled={isRunning} onChange={(e) => setDensity(parseInt(e.target.value))} className="w-full accent-neon-amber cursor-pointer bg-cyber-black rounded-lg h-1.5 appearance-none border border-cyber-gray-light disabled:opacity-50" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-[10px] font-cyber-header uppercase tracking-wider text-slate-400">TERRAIN EDITOR</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'obstacle', label: 'CRATERS', color: 'border-neon-red text-neon-red bg-neon-red/10', icon: Building2 },
                { id: 'dunes', label: 'ROUGH TERRAIN', color: 'border-neon-amber text-neon-amber bg-neon-amber/10', icon: Clock },
                { id: 'clear', label: 'ERASER', color: 'border-slate-600 text-slate-400 bg-slate-600/10', icon: Eraser }
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => !isRunning && setActiveBrush(item.id)}
                    disabled={isRunning}
                    className={`flex flex-col items-center justify-center gap-1 py-2 border text-[10px] font-cyber-header rounded transition-all cursor-pointer ${
                      activeBrush === item.id ? `${item.color} font-bold ring-1 ring-offset-0 ring-offset-cyber-black` : 'border-cyber-gray-light text-slate-500 hover:text-slate-300'
                    } disabled:opacity-50`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-cyber-gray-light">
            <button
              onClick={launchSimulation}
              disabled={isRunning}
              className="w-full py-3 bg-gradient-to-r from-neon-cyan to-[#00b0ff] hover:from-[#00b0ff] hover:to-neon-cyan text-cyber-black font-cyber-header font-black text-xs tracking-widest rounded transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 node-pulse-cyan shadow-[0_0_15px_var(--brand-cyan-glow)]"
            >
              <Play className="fill-cyber-black w-4 h-4" />
              <span>INITIATE VECTOR ROUTING</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={generateRandomTerrain} disabled={isRunning} className="py-2 bg-cyber-black border border-cyber-gray-light text-slate-300 text-[10px] font-cyber-header tracking-widest rounded hover:bg-cyber-gray transition-colors disabled:opacity-50 cursor-pointer">
                RANDOM SECTOR
              </button>
              <button onClick={() => loadPreset('clear-channel')} disabled={isRunning} className="py-2 bg-cyber-black border border-cyber-gray-light text-slate-300 text-[10px] font-cyber-header tracking-widest rounded hover:bg-cyber-gray transition-colors disabled:opacity-50 cursor-pointer">
                CLEAR SPACE
              </button>
            </div>
          </div>
        </div>
        
        {/* Real-time Tree Visualization Panel */}
        <div className="bg-cyber-gray-dark border border-cyber-gray-light p-2 relative shadow-xl h-[300px] flex flex-col">
          <TreeVisualization runResult={runResult} startNode={startNode} />
        </div>
        
      </section>

      {/* MAIN CITY VIEWPORT GRID */}
      <section className="lg:col-span-8 flex flex-col gap-4">
        <div className="bg-cyber-gray-dark border border-cyber-gray-light p-4 flex flex-col gap-3 relative shadow-xl flex-grow">
          
          <div className="flex justify-between items-center border-b border-cyber-gray-light pb-2">
            <h2 className="font-cyber-header text-sm font-bold text-slate-200 tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse"></span>
              ORBITAL SECTOR SCANNER
            </h2>
            <div className="text-neon-cyan font-cyber-mono text-xs text-glow-cyan animate-pulse">
              {isRunning ? 'CALCULATING VECTORS...' : 'STANDBY'}
            </div>
          </div>

          <div className="flex-grow flex items-center justify-center bg-cyber-black rounded overflow-hidden relative border border-cyber-gray-light p-1">
            <div 
              className="grid gap-[1px] blueprint-mesh p-1 bg-cyber-gray-light/30"
              style={{
                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`
              }}
            >
              {grid.map((row, r) => (
                row.map((node, c) => {
                  const isStart = r === startNode.row && c === startNode.col;
                  const isTarget = r === targetNode.row && c === targetNode.col;
                  
                  let extraClasses = '';
                  if (node.isObstacle) extraClasses = 'crater-texture shadow-inner';
                  else if (node.isDunes) extraClasses = 'dunes-texture shadow-inner';
                  
                  if (isStart) extraClasses += ' node-pulse-cyan bg-neon-cyan/20 border-neon-cyan z-20';
                  if (isTarget) extraClasses += ' node-pulse-amber bg-neon-amber/20 border-neon-amber z-20';

                  return (
                    <div
                      key={`${r}-${c}`}
                      id={`cell-${r},${c}`}
                      onMouseDown={() => handleMouseDown(r, c)}
                      onMouseEnter={() => handleMouseEnter(r, c)}
                      className={`grid-cell w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-[1.1rem] lg:h-[1.1rem] xl:w-[1.25rem] xl:h-[1.25rem] relative ${extraClasses}`}
                    >
                      {isStart && <div className="absolute inset-0 flex items-center justify-center text-[10px]">🚀</div>}
                      {isTarget && <div className="absolute inset-0 flex items-center justify-center text-[10px]">📡</div>}
                    </div>
                  );
                })
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-[10px] font-cyber-mono text-slate-400 bg-cyber-black p-2 rounded border border-cyber-gray-light text-center">
            <div className="flex items-center justify-center gap-1.5"><span className="w-3 h-3 block border border-neon-cyan bg-neon-cyan/20"></span> TX HUB</div>
            <div className="flex items-center justify-center gap-1.5"><span className="w-3 h-3 block border border-neon-amber bg-neon-amber/20"></span> RX PROBE</div>
            <div className="flex items-center justify-center gap-1.5"><span className="w-3 h-3 block border border-[#ff6d00] bg-[#1a1515] bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#ff6d00_2px,#ff6d00_3px)]"></span> CRATERS (INF)</div>
            <div className="flex items-center justify-center gap-1.5"><span className="w-3 h-3 block border border-[rgba(255,179,0,0.4)] bg-[#1a1815] bg-[repeating-linear-gradient(-45deg,transparent,transparent_2px,rgba(255,179,0,0.15)_2px,rgba(255,179,0,0.15)_4px)]"></span> ROUGH (3x)</div>
          </div>
        </div>

        {/* Telemetry Footer inline */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: 'NODES TRAVERSED', val: nodesExplored, color: 'text-neon-cyan' },
            { label: 'TOTAL TRANSIT TIME', val: `${pathCost} CYCLES`, color: 'text-neon-amber' },
            { label: 'COMPUTATION CPU CLOCKS', val: `${cycles} ms`, color: 'text-white' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-cyber-gray-dark border border-cyber-gray-light p-3 rounded flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="text-[10px] font-cyber-header tracking-widest text-slate-500 mb-1">{stat.label}</div>
              <div className={`text-xl font-black font-cyber-mono ${stat.color}`}>{stat.val}</div>
            </div>
          ))}
        </section>
      </section>
    </div>
  );
}
