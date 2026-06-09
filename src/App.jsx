import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Sparkles, 
  Compass, 
  Map, 
  Radio, 
  TrendingUp, 
  Cpu, 
  Info, 
  Flame, 
  XOctagon, 
  Eraser, 
  Grid3X3,
  Search,
  Activity
} from 'lucide-react';
import { runBFS, runDFS, runDijkstra, runAStar } from './utils/pathfinding';

// Grid Dimensions
const ROWS = 20;
const COLS = 35;

// Default node locations
const DEFAULT_START = { row: 10, col: 5 };
const DEFAULT_TARGET = { row: 10, col: 29 };

// Pure helper to generate the initial random terrain on mount
const createInitialGrid = () => {
  const newGrid = [];
  const obstacleProb = 0.3; // start with a 30% density layout
  const dunesProb = 0.15;
  
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const isStart = r === DEFAULT_START.row && c === DEFAULT_START.col;
      const isTarget = r === DEFAULT_TARGET.row && c === DEFAULT_TARGET.col;
      
      let isObstacle = false;
      let isDunes = false;
      
      if (!isStart && !isTarget) {
        const rand = Math.random();
        if (rand < obstacleProb) {
          isObstacle = true;
        } else if (rand < obstacleProb + dunesProb) {
          isDunes = true;
        }
      }
      
      row.push({
        row: r,
        col: c,
        isObstacle,
        isDunes
      });
    }
    newGrid.push(row);
  }
  return newGrid;
};

export default function App() {
  // --- Simulation Configuration State ---
  const [algorithm, setAlgorithm] = useState('A-Star');
  const [speed, setSpeed] = useState(8); // 1 to 10
  const [density, setDensity] = useState(30); // 10% to 50%
  const [activeBrush, setActiveBrush] = useState('obstacle'); // 'obstacle' | 'dunes' | 'clear'
  
  // --- Grid and Position State ---
  const [grid, setGrid] = useState(() => createInitialGrid());
  const [startNode, setStartNode] = useState(DEFAULT_START);
  const [targetNode, setTargetNode] = useState(DEFAULT_TARGET);
  
  // --- Mouse State for Painting & Dragging ---
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawType, setDrawType] = useState('obstacle'); // matches activeBrush
  const [draggingNode, setDraggingNode] = useState(null); // 'start' | 'target' | null
  
  // --- Simulation Execution State ---
  const [isRunning, setIsRunning] = useState(false);
  const [visitedKeys, setVisitedKeys] = useState(new Set());
  const [pathKeys, setPathKeys] = useState(new Set());
  
  // --- Real-time Telemetry Metrics ---
  const [nodesExplored, setNodesExplored] = useState(0);
  const [pathCost, setPathCost] = useState(0);
  const [cycles, setCycles] = useState(0);
  
  // --- Persistent Telemetry Database Log ---
  const [logs, setLogs] = useState([]);
  
  // --- Mission Elapsed Time (MET) Clock ---
  const [metSeconds, setMetSeconds] = useState(0);
  
  // Refs for tracking animation state synchronously across intervals
  const isRunningRef = useRef(false);
  const timeoutRef = useRef(null);

  // Clear visual simulation overlays (visited paths, etc.) but keep terrain structures
  const clearOverlays = useCallback(() => {
    setVisitedKeys(new Set());
    setPathKeys(new Set());
    setNodesExplored(0);
    setPathCost(0);
    setCycles(0);
  }, []);

  // Abort running animation
  const abortSimulation = useCallback(() => {
    isRunningRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsRunning(false);
  }, []);

  // Update specific cell values in grid
  const updateCellTerrain = useCallback((r, c, isObstacle, isDunes) => {
    setGrid(prev => {
      const copy = prev.map(row => row.map(cell => ({ ...cell })));
      if (copy[r] && copy[r][c]) {
        copy[r][c].isObstacle = isObstacle;
        copy[r][c].isDunes = isDunes;
      }
      return copy;
    });
  }, []);

  // Apply active brush operation to a cell
  const paintCell = useCallback((r, c, brush) => {
    clearOverlays();
    setLogs([]); // layout edited, reset comparative database
    if (brush === 'obstacle') {
      updateCellTerrain(r, c, true, false);
    } else if (brush === 'dunes') {
      updateCellTerrain(r, c, false, true);
    } else if (brush === 'clear') {
      updateCellTerrain(r, c, false, false);
    }
  }, [clearOverlays, updateCellTerrain]);

  // Generate grid with random obstacles (craters) and dunes
  const generateRandomTerrain = useCallback((customDensity = density) => {
    // Stop any running simulation
    abortSimulation();
    clearOverlays();
    
    const newGrid = [];
    const obstacleProb = customDensity / 100;
    // Dunes occur less frequently, mostly clustered
    const dunesProb = 0.15; 
    
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        // Don't place obstacles on start or target positions
        const isStart = r === startNode.row && c === startNode.col;
        const isTarget = r === targetNode.row && c === targetNode.col;
        
        let isObstacle = false;
        let isDunes = false;
        
        if (!isStart && !isTarget) {
          const rand = Math.random();
          if (rand < obstacleProb) {
            isObstacle = true;
          } else if (rand < obstacleProb + dunesProb) {
            isDunes = true;
          }
        }
        
        row.push({
          row: r,
          col: c,
          isObstacle,
          isDunes
        });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    setLogs([]); // clear log because the layout has changed!
  }, [density, startNode, targetNode, abortSimulation, clearOverlays]);

  // Full reset: clear grid overlay and structures back to a blank flat map
  const resetToBlankTerrain = useCallback(() => {
    abortSimulation();
    const newGrid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        row.push({
          row: r,
          col: c,
          isObstacle: false,
          isDunes: false
        });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    clearOverlays();
    setLogs([]);
  }, [abortSimulation, clearOverlays]);

  // --- Grid Mouse Handlers for Drag & Paint ---
  const handleMouseDown = useCallback((r, c) => {
    if (isRunning) return;
    
    // Check if dragging start/target nodes
    if (r === startNode.row && c === startNode.col) {
      setDraggingNode('start');
      return;
    }
    if (r === targetNode.row && c === targetNode.col) {
      setDraggingNode('target');
      return;
    }
    
    setIsDrawing(true);
    setDrawType(activeBrush);
    paintCell(r, c, activeBrush);
  }, [isRunning, startNode, targetNode, activeBrush, paintCell]);

  const handleMouseEnter = useCallback((r, c) => {
    if (isRunning) return;
    
    const isStart = r === startNode.row && c === startNode.col;
    const isTarget = r === targetNode.row && c === targetNode.col;

    // Node Dragging Logic
    if (draggingNode === 'start') {
      if (!isTarget) {
        // Clear obstacle/dune at the new location
        updateCellTerrain(r, c, false, false);
        setStartNode({ row: r, col: c });
        clearOverlays();
        setLogs([]); // layout updated
      }
      return;
    }
    if (draggingNode === 'target') {
      if (!isStart) {
        updateCellTerrain(r, c, false, false);
        setTargetNode({ row: r, col: c });
        clearOverlays();
        setLogs([]); // layout updated
      }
      return;
    }
    
    // Cell Painting Logic
    if (isDrawing && !isStart && !isTarget) {
      paintCell(r, c, drawType);
    }
  }, [isRunning, draggingNode, startNode, targetNode, isDrawing, drawType, paintCell, updateCellTerrain, clearOverlays]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setDraggingNode(null);
  }, []);



  // Run Mission Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setMetSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Mission Elapsed Time (MET)
  const formatMET = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `MET ${hrs}:${mins}:${secs}`;
  };


  // --- Pathfinding Execution ---
  const launchSimulation = () => {
    if (isRunning) return;
    clearOverlays();

    // Gather run parameters
    let result;
    if (algorithm === 'BFS') {
      result = runBFS(grid, startNode, targetNode);
    } else if (algorithm === 'DFS') {
      result = runDFS(grid, startNode, targetNode);
    } else if (algorithm === 'Dijkstra') {
      result = runDijkstra(grid, startNode, targetNode);
    } else {
      result = runAStar(grid, startNode, targetNode);
    }

    const { visitedNodesInOrder, path, pathCost: finalCost, computeCycles, pathFound } = result;

    setIsRunning(true);
    isRunningRef.current = true;

    // Pacing calculations based on Speed slider (1 to 10)
    // Speed 1: very slow, 1 node per 120ms
    // Speed 10: instant/very fast, 4 nodes per 8ms
    const batchSize = Math.max(1, Math.floor(speed / 2.2));
    const delay = Math.max(6, 120 - (speed * 11));

    let index = 0;
    
    const animateExploration = () => {
      if (!isRunningRef.current) {
        setIsRunning(false);
        return;
      }

      if (index < visitedNodesInOrder.length) {
        // Capture the nodes for this batch synchronously in the current tick
        const batchNodes = [];
        for (let b = 0; b < batchSize; b++) {
          if (index + b < visitedNodesInOrder.length) {
            batchNodes.push(visitedNodesInOrder[index + b]);
          }
        }

        // Update visited keys using the stable pre-evaluated batch array
        setVisitedKeys(prev => {
          const next = new Set(prev);
          for (const node of batchNodes) {
            next.add(`${node.row},${node.col}`);
          }
          return next;
        });

        // Set telemetry values
        setNodesExplored(Math.min(visitedNodesInOrder.length, index + batchSize));
        setCycles(prev => prev + Math.floor(Math.random() * 8) + 3);

        index += batchSize;
        timeoutRef.current = setTimeout(animateExploration, delay);
      } else {
        // Search exploration animation complete. Finish metrics
        setNodesExplored(visitedNodesInOrder.length);
        setCycles(computeCycles);

        if (pathFound && path.length > 0) {
          // Animate the final path
          let pathIdx = 0;
          const animatePath = () => {
            if (!isRunningRef.current) {
              setIsRunning(false);
              return;
            }

            if (pathIdx < path.length) {
              // Capture the path node synchronously before updating state
              const currentNode = path[pathIdx];
              setPathKeys(prev => {
                const next = new Set(prev);
                next.add(`${currentNode.row},${currentNode.col}`);
                return next;
              });
              
              // Increment path cost incrementally for animation effect
              const intermediateCost = Math.round((pathIdx / path.length) * finalCost);
              setPathCost(Math.max(1, intermediateCost));
              
              pathIdx++;
              timeoutRef.current = setTimeout(animatePath, 25);
            } else {
              // Complete!
              setPathCost(finalCost);
              setIsRunning(false);
              saveTelemetryLog(algorithm, true, visitedNodesInOrder.length, finalCost);
            }
          };
          animatePath();
        } else {
          // Path failed
          setPathCost(0);
          setIsRunning(false);
          saveTelemetryLog(algorithm, false, visitedNodesInOrder.length, 0);
        }
      }
    };

    animateExploration();
  };

  // Log run details to persistent database
  const saveTelemetryLog = (algName, pathFound, exploredCount, cost) => {
    // Efficiency calculation: represents search directness
    // High cost and low node exploration is highly efficient
    // 100% is perfect, meaning we only visited the exact path nodes.
    let efficiencyScore = 0;
    if (pathFound && exploredCount > 0) {
      efficiencyScore = Math.round((cost / exploredCount) * 100);
      efficiencyScore = Math.min(100, Math.max(1, efficiencyScore));
    }
    
    setLogs(prev => {
      const newEntry = {
        id: Date.now(),
        algorithm: algName,
        pathFound: pathFound ? 'Yes' : 'No',
        nodesExplored: exploredCount,
        pathCost: cost,
        efficiencyScore: efficiencyScore
      };
      // Prevent duplicates of same algorithm in logging table
      const filtered = prev.filter(item => item.algorithm !== algName);
      return [...filtered, newEntry];
    });
  };

  // Compute Frontier set dynamically from visitedKeys
  const getFrontierKeys = () => {
    const frontier = new Set();
    
    for (const key of visitedKeys) {
      const [rStr, cStr] = key.split(',');
      const r = parseInt(rStr);
      const c = parseInt(cStr);
      
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          const neighborKey = `${nr},${nc}`;
          if (!visitedKeys.has(neighborKey) && 
              grid[nr] && 
              grid[nr][nc] && 
              !grid[nr][nc].isObstacle && 
              !(nr === startNode.row && nc === startNode.col) &&
              !(nr === targetNode.row && nc === targetNode.col)) {
            frontier.add(neighborKey);
          }
        }
      }
    }
    return frontier;
  };

  const frontierKeys = getFrontierKeys();

  // Selected algorithm information tooltip mapping
  const algorithmInfo = {
    'BFS': {
      desc: 'Explores layer-by-layer outwards from landing site.',
      context: 'Safe-zone mapping, unweighted terrain.',
      pros: 'Guarantees shortest path on flat terrain.',
      cons: 'Heavy memory footprint (large frontier queue).'
    },
    'DFS': {
      desc: 'Probes as deep as possible down a path before backtracking.',
      context: 'Subterranean lava tube or cave exploration.',
      pros: 'Highly efficient memory utilization.',
      cons: 'No shortest-path guarantee; prone to bad loops.'
    },
    'Dijkstra': {
      desc: 'Explores lowest cumulative weight cost cells first.',
      context: 'Weighted planetary navigation (sand dunes vs. bedrock).',
      pros: 'Guarantees absolute optimal path on weighted maps.',
      cons: 'Blind search. Explores in all directions equally.'
    },
    'A-Star': {
      desc: 'Uses weighted path cost + straight-line distance heuristic.',
      context: 'Mars Rover real-time target destination pathfinding.',
      pros: 'Gold standard. Directed, highly efficient search.',
      cons: 'Requires heuristic tuning for complex terrains.'
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black text-slate-200 p-4 font-sans scanlines flex flex-col relative select-none">
      
      {/* --- HEADER --- */}
      <header className="border-b border-cyan-900/50 pb-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-neon-cyan flex items-center justify-center rounded glow-border-cyan animate-pulse">
            <Radio className="text-neon-cyan w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-cyber-header font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-cyan-500 tracking-wider flex items-center gap-2">
              ARES-V PATHFINDING TELEMETRY
            </h1>
            <p className="text-[10px] font-cyber-mono text-cyan-500/80 tracking-widest uppercase">
              AUTONOMOUS NAVIGATIONAL SIMULATOR v4.0.0
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-cyber-gray-dark border border-cyan-950 px-4 py-2 rounded shadow-inner">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
            </span>
            <span className="font-cyber-header text-[11px] text-neon-green font-bold tracking-widest text-glow-green">
              SYSTEM ONLINE
            </span>
          </div>
          <div className="w-px h-4 bg-cyan-950"></div>
          <div className="font-cyber-mono text-sm font-semibold text-cyan-400 tracking-wider">
            {formatMET(metSeconds)}
          </div>
        </div>
      </header>

      {/* --- MAIN CORE INTERFACE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-grow" onMouseUp={handleMouseUp}>
        
        {/* --- LEFT CONTROL PANEL (4 cols) --- */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Guidance Configuration Card */}
          <div className="bg-cyber-gray-dark/90 border border-cyan-950 p-4 rounded relative overflow-hidden flex flex-col gap-4 shadow-2xl">
            {/* Sci-fi decorative borders */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-neon-cyan"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-neon-cyan"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-neon-cyan"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-neon-cyan"></div>
            
            <div className="flex items-center gap-2 border-b border-cyan-950 pb-2">
              <Compass className="text-neon-cyan w-4 h-4" />
              <h2 className="font-cyber-header text-xs font-bold text-neon-cyan uppercase tracking-wider">
                GUIDANCE COMPUTER CONFIG
              </h2>
            </div>

            {/* Algorithm Segmented Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-cyber-header uppercase tracking-wider text-slate-400">
                Primary Routing Algorithm
              </label>
              <div className="grid grid-cols-4 gap-1 bg-cyber-black p-1 rounded border border-cyan-950">
                {['BFS', 'DFS', 'Dijkstra', 'A-Star'].map(alg => (
                  <button
                    key={alg}
                    onClick={() => {
                      if (!isRunning) {
                        setAlgorithm(alg);
                        clearOverlays();
                      }
                    }}
                    disabled={isRunning}
                    className={`font-cyber-mono py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
                      algorithm === alg
                        ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan text-glow-cyan'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-cyber-gray'
                    } disabled:opacity-55 disabled:cursor-not-allowed`}
                  >
                    {alg === 'A-Star' ? 'A*' : alg}
                  </button>
                ))}
              </div>
            </div>

            {/* Algorithm Info Monospace Tooltip */}
            <div className="bg-cyber-black/80 border border-cyan-950 p-3 rounded text-[11px] font-cyber-mono flex flex-col gap-1.5 relative">
              <div className="flex items-center gap-1.5 text-neon-cyan border-b border-cyan-950/40 pb-1">
                <Info className="w-3.5 h-3.5" />
                <span>SPECIFICATIONS: {algorithm}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {algorithmInfo[algorithm].desc}
              </p>
              <div className="grid grid-cols-1 gap-1 text-slate-400 pt-1">
                <div><span className="text-neon-amber">MISSION CONTEXT:</span> {algorithmInfo[algorithm].context}</div>
                <div><span className="text-neon-green">PROS:</span> {algorithmInfo[algorithm].pros}</div>
                <div><span className="text-neon-red">CONS:</span> {algorithmInfo[algorithm].cons}</div>
              </div>
            </div>

            {/* Sliders Box */}
            <div className="flex flex-col gap-3.5 pt-1">
              {/* Speed Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-cyber-header uppercase tracking-wider">
                  <span className="text-slate-400">Simulation Velocity</span>
                  <span className="font-cyber-mono text-neon-cyan text-glow-cyan font-bold">{speed}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={speed}
                  onChange={(e) => setSpeed(parseInt(e.target.value))}
                  className="w-full accent-neon-cyan cursor-pointer bg-cyber-black rounded-lg h-1.5 appearance-none border border-cyan-950"
                />
              </div>

              {/* Obstacle Density Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-cyber-header uppercase tracking-wider">
                  <span className="text-slate-400">Crater Density</span>
                  <span className="font-cyber-mono text-neon-amber text-glow-amber font-bold">{density}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={density}
                  disabled={isRunning}
                  onChange={(e) => setDensity(parseInt(e.target.value))}
                  className="w-full accent-neon-amber cursor-pointer bg-cyber-black rounded-lg h-1.5 appearance-none border border-cyan-950 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Brush Selector */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="text-[10px] font-cyber-header uppercase tracking-wider text-slate-400">
                Terrain Editor Brush
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'obstacle', label: 'Crater', color: 'border-neon-red text-neon-red bg-neon-red/10', icon: Flame },
                  { id: 'dunes', label: 'Dunes', color: 'border-neon-amber text-neon-amber bg-neon-amber/10', icon: Compass },
                  { id: 'clear', label: 'Eraser', color: 'border-slate-500 text-slate-400 bg-slate-500/10', icon: Eraser }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (!isRunning) setActiveBrush(item.id);
                      }}
                      disabled={isRunning}
                      className={`flex items-center justify-center gap-1.5 py-1.5 border text-xs rounded transition-all cursor-pointer ${
                        activeBrush === item.id 
                          ? `${item.color} font-bold ring-1 ring-offset-0 ring-offset-cyber-black`
                          : 'border-cyan-950 text-slate-500 hover:text-slate-300 hover:bg-cyber-gray-dark'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sci-Fi Action Control Buttons */}
            <div className="flex flex-col gap-2 pt-2 border-t border-cyan-950/50">
              {/* Launch Simulation Button - Primary Action */}
              <button
                onClick={launchSimulation}
                disabled={isRunning}
                className="w-full relative py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-cyber-black font-cyber-header font-black text-sm tracking-widest rounded shadow-lg shadow-cyan-500/10 active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-neon-cyan/50 node-pulse-cyan"
              >
                <Play className="fill-cyber-black w-4 h-4" />
                <span>LAUNCH SIMULATION</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Generate Terrain Button */}
                <button
                  onClick={() => generateRandomTerrain()}
                  disabled={isRunning}
                  className="py-2.5 bg-cyber-gray text-slate-300 border border-cyan-950 hover:border-cyan-800 hover:text-slate-100 text-xs font-cyber-header font-semibold tracking-wider rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>GEN TERRAIN</span>
                </button>

                {/* Abort/Reset Button */}
                <button
                  onClick={() => {
                    if (isRunning) {
                      abortSimulation();
                    } else {
                      clearOverlays();
                    }
                  }}
                  className="py-2.5 bg-cyber-gray border border-neon-red/30 hover:border-neon-red/70 text-neon-red bg-neon-red/5 hover:bg-neon-red/10 text-xs font-cyber-header font-semibold tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <XOctagon className="w-3.5 h-3.5" />
                  <span>{isRunning ? 'ABORT RUN' : 'CLEAR PATH'}</span>
                </button>
              </div>

              {/* Blank Grid Option */}
              <button
                onClick={resetToBlankTerrain}
                disabled={isRunning}
                className="py-1.5 border border-dashed border-cyan-950 hover:border-cyan-800/80 text-[10px] font-cyber-mono tracking-widest text-slate-500 hover:text-slate-400 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                <Grid3X3 className="w-3 h-3" />
                <span>FLATTEN PLANET SURFACE</span>
              </button>
            </div>
          </div>
          
        </section>

        {/* --- MAIN RADAR VIEWPORT GRID (8 cols) --- */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-cyber-gray-dark/90 border border-cyan-950 p-4 rounded flex flex-col gap-3 relative shadow-2xl flex-grow justify-between">
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-neon-cyan"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-neon-cyan"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-neon-cyan"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-neon-cyan"></div>

            {/* Viewport Header */}
            <div className="flex items-center justify-between border-b border-cyan-950 pb-2">
              <div className="flex items-center gap-2">
                <Map className="text-neon-cyan w-4 h-4" />
                <h2 className="font-cyber-header text-xs font-bold text-neon-cyan uppercase tracking-wider">
                  RADAR VIEWPORT: SURFACE GRID
                </h2>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-cyber-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 bg-neon-cyan/20 border border-neon-cyan rounded-full node-pulse-cyan"></span>
                  <span>Lander: ({startNode.col}, {startNode.row})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 bg-neon-amber/20 border border-neon-amber rounded-full node-pulse-amber"></span>
                  <span>Science: ({targetNode.col}, {targetNode.row})</span>
                </div>
              </div>
            </div>

            {/* The 2D Grid Sandbox */}
            <div className="flex flex-col items-center justify-center p-2 bg-cyber-black/90 border border-cyan-950/40 rounded flex-grow">
              
              {/* Outer grid boundary structure */}
              <div 
                className="grid relative border border-cyan-950" 
                style={{ 
                  gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                  width: '100%',
                  maxWidth: '820px'
                }}
              >
                {grid.map((rowArr, rIdx) => 
                  rowArr.map((cell, cIdx) => {
                    const isStart = rIdx === startNode.row && cIdx === startNode.col;
                    const isTarget = rIdx === targetNode.row && cIdx === targetNode.col;
                    const cellKey = `${rIdx},${cIdx}`;
                    
                    const isVisited = visitedKeys.has(cellKey);
                    const isPath = pathKeys.has(cellKey);
                    const isFrontier = frontierKeys.has(cellKey);

                    // Combine styling states
                    const cellClass = isStart
                      ? "bg-neon-cyan/20 border-neon-cyan border shadow-neon-cyan/30 z-10 node-pulse-cyan cursor-grab"
                      : isTarget
                      ? "bg-neon-amber/20 border-neon-amber border shadow-neon-amber/30 z-10 node-pulse-amber cursor-grab"
                      : cell.isObstacle
                      ? "crater-texture"
                      : cell.isDunes
                      ? "dunes-texture"
                      : isPath
                      ? "cell-path"
                      : isFrontier
                      ? "cell-frontier"
                      : isVisited
                      ? "cell-visited"
                      : "bg-cyber-gray-dark/40";

                    return (
                      <div
                        key={cellKey}
                        onMouseDown={() => handleMouseDown(rIdx, cIdx)}
                        onMouseEnter={() => handleMouseEnter(rIdx, cIdx)}
                        className={`grid-cell cursor-crosshair flex items-center justify-center relative ${cellClass}`}
                      >
                        {/* Rendering icons inside nodes */}
                        {isStart && (
                          <span className="text-neon-cyan animate-pulse text-[9px] font-cyber-header font-black text-center">
                            🚀
                          </span>
                        )}
                        {isTarget && (
                          <span className="text-neon-amber animate-pulse text-[9px] font-cyber-header font-black text-center">
                            💎
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Grid Edit / Assist Instructions */}
            <div className="flex flex-wrap items-center justify-between text-[10px] font-cyber-mono text-slate-500 gap-2 border-t border-cyan-950/40 pt-2 select-none">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 bg-cyber-black border border-cyan-950"></span>
                  <span>Empty Grid</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 crater-texture"></span>
                  <span>Crater (Block)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 dunes-texture"></span>
                  <span>Dunes (Cost: 3)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 bg-neon-cyan/20 border border-neon-cyan"></span>
                  <span>Lander / Target</span>
                </span>
              </div>
              <div className="text-right italic">
                Drag 🚀 / 💎 to reposition. Select a Brush above and click-drag on canvas to sculpt Martian landscape.
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* --- TELEMETRY & ANALYTICS (Bottom Panel) --- */}
      <footer className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Real-time Telemetry Metrics (5 cols) */}
        <section className="lg:col-span-5 grid grid-cols-3 gap-3">
          {[
            { 
              title: 'Nodes Explored', 
              val: nodesExplored, 
              color: 'text-neon-cyan text-glow-cyan', 
              icon: Search, 
              tag: 'SENSORS ACTIVE', 
              border: 'border-cyan-950/60 shadow-cyan-950/20' 
            },
            { 
              title: 'Path Cost (KM)', 
              val: pathCost === 0 && isRunning ? 'CALC...' : `${pathCost} KM`, 
              color: 'text-neon-amber text-glow-amber', 
              icon: Activity, 
              tag: 'TRAVERSAL WEIGHT', 
              border: 'border-amber-950/60 shadow-amber-950/20' 
            },
            { 
              title: 'Compute Cycles', 
              val: cycles === 0 && isRunning ? 'CALC...' : cycles, 
              color: 'text-neon-red text-glow-red', 
              icon: Cpu, 
              tag: 'PROCESSOR SPEED', 
              border: 'border-red-950/60 shadow-red-950/20' 
            }
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div 
                key={idx} 
                className={`bg-cyber-gray-dark/85 border ${card.border} p-3 rounded flex flex-col justify-between shadow-lg relative overflow-hidden`}
              >
                <div className="flex items-center justify-between border-b border-cyan-950/30 pb-1">
                  <span className="text-[9px] font-cyber-header uppercase tracking-wider text-slate-500">
                    {card.title}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <div className="my-2 text-center">
                  <span className={`text-xl font-cyber-mono font-bold tracking-widest ${card.color}`}>
                    {card.val}
                  </span>
                </div>
                <div className="text-[8px] font-cyber-mono text-slate-600 text-center tracking-widest uppercase">
                  {card.tag}
                </div>
              </div>
            );
          })}
        </section>

        {/* Persisted Comparative Database Log (7 cols) */}
        <section className="lg:col-span-7">
          <div className="bg-cyber-gray-dark/90 border border-cyan-950 p-4 rounded relative shadow-2xl">
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-neon-cyan"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-neon-cyan"></div>
            
            <div className="flex items-center gap-2 border-b border-cyan-950 pb-2 mb-2">
              <TrendingUp className="text-neon-cyan w-4 h-4" />
              <h2 className="font-cyber-header text-xs font-bold text-neon-cyan uppercase tracking-wider">
                ROUTING TELEMETRY LOGGER (CURRENT LAYOUT)
              </h2>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-cyber-mono text-slate-300">
                <thead>
                  <tr className="border-b border-cyan-950/60 text-slate-500 uppercase tracking-widest text-[9px]">
                    <th className="py-1 text-left">Algorithm</th>
                    <th className="py-1 text-center">Shortest Path</th>
                    <th className="py-1 text-center">Nodes Explored</th>
                    <th className="py-1 text-center">Path Cost</th>
                    <th className="py-1 text-right">Efficiency Score</th>
                  </tr>
                </thead>
                <tbody>
                  {['A-Star', 'Dijkstra', 'BFS', 'DFS'].map(algName => {
                    const matchedLog = logs.find(log => log.algorithm === algName);
                    const isSelected = algorithm === algName;
                    
                    return (
                      <tr 
                        key={algName}
                        className={`border-b border-cyan-950/30 hover:bg-cyan-950/10 transition-colors ${
                          isSelected ? 'text-neon-cyan font-bold bg-cyan-950/15' : ''
                        }`}
                      >
                        <td className="py-1.5 text-left flex items-center gap-1.5">
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-neon-cyan animate-ping' : 'bg-slate-700'}`}></span>
                          <span>{algName === 'A-Star' ? 'A* Search' : algName}</span>
                        </td>
                        <td className="py-1.5 text-center font-bold">
                          {matchedLog ? (
                            <span className={matchedLog.pathFound === 'Yes' ? 'text-neon-green' : 'text-neon-red'}>
                              {matchedLog.pathFound}
                            </span>
                          ) : (
                            <span className="text-slate-600">--</span>
                          )}
                        </td>
                        <td className="py-1.5 text-center text-slate-400">
                          {matchedLog ? matchedLog.nodesExplored : '--'}
                        </td>
                        <td className="py-1.5 text-center text-slate-400">
                          {matchedLog ? (matchedLog.pathCost > 0 ? `${matchedLog.pathCost} KM` : 'N/A') : '--'}
                        </td>
                        <td className="py-1.5 text-right font-bold">
                          {matchedLog ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-12 bg-cyber-black rounded-sm border border-cyan-950 h-2 overflow-hidden hidden sm:block">
                                <div 
                                  className="h-full bg-cyan-500 shadow-cyan-500/50 shadow-sm transition-all"
                                  style={{ width: `${matchedLog.efficiencyScore}%` }}
                                ></div>
                              </div>
                              <span className={
                                matchedLog.efficiencyScore > 75 
                                  ? 'text-neon-green' 
                                  : matchedLog.efficiencyScore > 40 
                                    ? 'text-neon-amber' 
                                    : matchedLog.efficiencyScore > 0 
                                      ? 'text-neon-red' 
                                      : 'text-slate-500'
                              }>
                                {matchedLog.efficiencyScore}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Zero state reminder */}
            {logs.length === 0 && (
              <div className="text-[10px] font-cyber-mono text-center text-slate-600 mt-2 italic">
                NO LAUNCH METRICS STORED FOR CURRENT GEOMETRIC CONFIG. INITIATE NAVIGATIONAL DRIVES.
              </div>
            )}
          </div>
        </section>

      </footer>

    </div>
  );
}
