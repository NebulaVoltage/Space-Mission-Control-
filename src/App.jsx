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

// Mission Elapsed Time (MET) Clock Sub-component (performance decoupled)
function METClock() {
  const [metSeconds, setMetSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMetSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatMET = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `MET ${hrs}:${mins}:${secs}`;
  };

  return (
    <div className="font-cyber-mono text-sm font-semibold text-neon-cyan text-glow-cyan tracking-wider">
      {formatMET(metSeconds)}
    </div>
  );
}


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
      if (!prev[r] || !prev[r][c]) return prev;
      if (prev[r][c].isObstacle === isObstacle && prev[r][c].isDunes === isDunes) {
        return prev;
      }
      const copy = [...prev];
      copy[r] = [...prev[r]];
      copy[r][c] = {
        ...prev[r][c],
        isObstacle,
        isDunes
      };
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
      desc: 'Explores isotropic wavefront layers outwards from transmitter.',
      context: 'Unweighted propagation path mapping.',
      pros: 'Guarantees lowest hop-count link on flat vacuum.',
      cons: 'High memory utilization due to wide routing table.'
    },
    'DFS': {
      desc: 'Probes single routing branch recursively before backtracking.',
      context: 'Experimental wormhole pathfinder probe.',
      pros: 'Minimal memory allocation per routing sweep.',
      cons: 'No hop-count optimization guarantee; prone to loops.'
    },
    'Dijkstra': {
      desc: 'Explores path routes sorted by lowest cumulative latency.',
      context: 'Weighted channel navigation (grav dust vs. vacuum).',
      pros: 'Guarantees absolute optimal routing path on weighted grids.',
      cons: 'Unguided search. Scans all channel directions equally.'
    },
    'A-Star': {
      desc: 'Uses accumulated route latency + geometric distance heuristic.',
      context: 'Deep-space real-time optimal link establishing.',
      pros: 'Industry standard. Highly directed, efficient pathfinder.',
      cons: 'Dependent on heuristic accuracy across dust clouds.'
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black text-slate-200 p-4 font-sans scanlines flex flex-col relative select-none">
      {/* Subtle top ambient glowing header background */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent pointer-events-none"></div>
      <div className="absolute top-0 left-1/3 right-1/3 h-[80px] bg-neon-cyan/5 blur-[80px] pointer-events-none rounded-full"></div>

      {/* --- HEADER --- */}
      <header className="border-b border-cyan-900/30 pb-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-neon-cyan flex items-center justify-center rounded shadow-[0_0_10px_rgba(0,240,255,0.25)] animate-pulse">
            <Radio className="text-neon-cyan w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-cyber-header font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-cyan-400 tracking-wider flex items-center gap-2">
              VECTOR COMMUNICATIONS ROUTING TELEMETRY
            </h1>
            <p className="text-[10px] font-cyber-mono text-cyan-500/80 tracking-widest uppercase">
              DEEP SPACE COMMUNICATIONS LINK PROCESSOR v4.2.0
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-cyber-black/60 border border-cyan-950/80 px-4 py-2 rounded shadow-inner backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
            </span>
            <span className="font-cyber-header text-[11px] text-neon-green font-bold tracking-widest text-glow-green">
              LINK ONLINE
            </span>
          </div>
          <div className="w-px h-4 bg-cyan-950"></div>
          <METClock />
        </div>
      </header>

      {/* --- MAIN CORE INTERFACE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-grow relative z-10" onMouseUp={handleMouseUp}>
        
        {/* --- LEFT CONTROL PANEL (4 cols) --- */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Guidance Configuration Card */}
          <div className="glass-panel glass-panel-hover p-4 relative overflow-hidden flex flex-col gap-4 shadow-2xl">
            {/* Sci-fi decorative corners */}
            <div className="hud-corner-tl"></div>
            <div className="hud-corner-tr"></div>
            <div className="hud-corner-bl"></div>
            <div className="hud-corner-br"></div>
            
            <div className="flex items-center gap-2 border-b border-cyan-950/60 pb-2">
              <Compass className="text-neon-cyan w-4 h-4" />
              <h2 className="font-cyber-header text-xs font-bold text-neon-cyan uppercase tracking-wider">
                LINK CORES & CHANNEL PARAMETERS
              </h2>
            </div>

            {/* Algorithm Segmented Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-cyber-header uppercase tracking-wider text-slate-400">
                ROUTING COMPUTER DRIVE CORE
              </label>
              <div className="grid grid-cols-4 gap-1 bg-cyber-black/80 p-1 rounded border border-cyan-950/60 shadow-inner">
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
                        ? 'bg-neon-cyan/15 border border-neon-cyan text-neon-cyan text-glow-cyan shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-cyber-gray-light'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {alg === 'A-Star' ? 'A*' : alg}
                  </button>
                ))}
              </div>
            </div>

            {/* Algorithm Info Monospace Tooltip */}
            <div className="bg-cyber-black/45 backdrop-blur-md border border-cyan-950/80 p-3 rounded text-[11px] font-cyber-mono flex flex-col gap-1.5 relative shadow-inner">
              <div className="flex items-center gap-1.5 text-neon-cyan border-b border-cyan-950/40 pb-1">
                <Info className="w-3.5 h-3.5" />
                <span>DRIVE SPECIFICATIONS: {algorithm}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {algorithmInfo[algorithm].desc}
              </p>
              <div className="grid grid-cols-1 gap-1 text-[10px] text-slate-400 pt-1">
                <div><span className="text-neon-amber font-semibold">CHANNEL METRIC:</span> {algorithmInfo[algorithm].context}</div>
                <div><span className="text-neon-green font-semibold">ADVANTAGE:</span> {algorithmInfo[algorithm].pros}</div>
                <div><span className="text-neon-red font-semibold">LIMITATION:</span> {algorithmInfo[algorithm].cons}</div>
              </div>
            </div>

            {/* Sliders Box */}
            <div className="flex flex-col gap-3.5 pt-1">
              {/* Speed Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-cyber-header uppercase tracking-wider">
                  <span className="text-slate-400">PROCESSING TIME FREQUENCY</span>
                  <span className="font-cyber-mono text-neon-cyan text-glow-cyan font-bold">{speed * 10} Hz</span>
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
                  <span className="text-slate-400">ION DUST CLOUD INTRUSION (σ)</span>
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
                SURFACE TOPOLOGY CONFIGURATOR
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'obstacle', label: 'ION CLOUD', color: 'border-neon-red text-neon-red bg-neon-red/10 shadow-[0_0_8px_rgba(255,56,56,0.15)]', icon: Flame },
                  { id: 'dunes', label: 'GRAV DUST', color: 'border-neon-amber text-neon-amber bg-neon-amber/10 shadow-[0_0_8px_rgba(255,183,0,0.15)]', icon: Compass },
                  { id: 'clear', label: 'DE-IONIZER', color: 'border-slate-500 text-slate-400 bg-slate-500/10', icon: Eraser }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (!isRunning) setActiveBrush(item.id);
                      }}
                      disabled={isRunning}
                      className={`flex items-center justify-center gap-1.5 py-1.5 border text-[10px] font-cyber-header tracking-wider rounded transition-all cursor-pointer ${
                        activeBrush === item.id 
                          ? `${item.color} font-bold ring-1 ring-offset-0 ring-offset-cyber-black`
                          : 'border-cyan-950/60 text-slate-500 hover:text-slate-300 hover:bg-cyber-black/40'
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
            <div className="flex flex-col gap-2 pt-2 border-t border-cyan-950/40">
              {/* Launch Simulation Button - Primary Action */}
              <button
                onClick={launchSimulation}
                disabled={isRunning}
                className="w-full relative py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-cyber-black font-cyber-header font-black text-xs tracking-widest rounded-md shadow-[0_0_20px_rgba(0,240,255,0.3)] active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-neon-cyan/60 node-pulse-cyan"
              >
                <Play className="fill-cyber-black w-4 h-4" />
                <span>ESTABLISH VECTOR LINK</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Generate Terrain Button */}
                <button
                  onClick={() => generateRandomTerrain()}
                  disabled={isRunning}
                  className="py-2.5 bg-cyber-black/40 text-slate-300 border border-cyan-950/80 hover:border-neon-cyan/50 hover:text-slate-100 text-xs font-cyber-header font-semibold tracking-wider rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95 shadow-inner"
                >
                  <Sparkles className="w-3.5 h-3.5 text-neon-cyan text-glow-cyan" />
                  <span>GENERATE ION FIELD</span>
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
                  className="py-2.5 bg-cyber-black/40 border border-neon-red/30 hover:border-neon-red/70 text-neon-red bg-neon-red/5 hover:bg-neon-red/10 text-xs font-cyber-header font-semibold tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-inner"
                >
                  <XOctagon className="w-3.5 h-3.5" />
                  <span>{isRunning ? 'KILL LINK' : 'PURGE OVERLAYS'}</span>
                </button>
              </div>

              {/* Blank Grid Option */}
              <button
                onClick={resetToBlankTerrain}
                disabled={isRunning}
                className="py-2.5 bg-cyber-black/20 hover:bg-cyber-black/60 border border-dashed border-cyan-950/60 hover:border-neon-red/30 text-[10px] font-cyber-mono tracking-widest text-slate-500 hover:text-neon-red/70 rounded-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>RESET VECTOR SPACE</span>
              </button>
            </div>
          </div>
          
        </section>

        {/* --- MAIN RADAR VIEWPORT GRID (8 cols) --- */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          <div className="glass-panel glass-panel-hover p-4 rounded flex flex-col gap-3 relative shadow-2xl flex-grow justify-between radar-sweep-container blueprint-mesh">
            <div className="hud-corner-tl"></div>
            <div className="hud-corner-tr"></div>
            <div className="hud-corner-bl"></div>
            <div className="hud-corner-br"></div>

            {/* Viewport Header */}
            <div className="flex items-center justify-between border-b border-cyan-950/60 pb-2 z-10">
              <div className="flex items-center gap-2">
                <Map className="text-neon-cyan w-4 h-4" />
                <h2 className="font-cyber-header text-xs font-bold text-neon-cyan uppercase tracking-wider">
                  ORBITAL SECTOR VECTOR ROUTING VIEWPORT
                </h2>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-cyber-mono text-slate-400">
                <div className="flex items-center gap-1.5 bg-cyan-950/30 border border-cyan-900/60 px-2.5 py-1 rounded shadow-inner">
                  <span className="inline-block w-2 h-2 bg-neon-cyan rounded-full node-pulse-cyan"></span>
                  <span className="tracking-wide text-glow-cyan text-neon-cyan">TX-01: [{startNode.col.toString().padStart(2, '0')}, {startNode.row.toString().padStart(2, '0')}]</span>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-950/20 border border-amber-900/40 px-2.5 py-1 rounded shadow-inner">
                  <span className="inline-block w-2 h-2 bg-neon-amber rounded-full node-pulse-amber"></span>
                  <span className="tracking-wide text-glow-amber text-neon-amber">RX-99: [{targetNode.col.toString().padStart(2, '0')}, {targetNode.row.toString().padStart(2, '0')}]</span>
                </div>
              </div>
            </div>

            {/* The 2D Grid Sandbox */}
            <div className="flex flex-col items-center justify-center p-2.5 bg-cyber-black/60 backdrop-blur-sm border border-cyan-950/60 rounded flex-grow my-1 z-10">
              
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
                      ? "bg-neon-cyan/20 border-neon-cyan border shadow-neon-cyan/35 z-10 node-pulse-cyan cursor-grab"
                      : isTarget
                      ? "bg-neon-amber/20 border-neon-amber border shadow-neon-amber/35 z-10 node-pulse-amber cursor-grab"
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
                      : "bg-cyber-gray-dark/30";

                    return (
                      <div
                        key={cellKey}
                        onMouseDown={() => handleMouseDown(rIdx, cIdx)}
                        onMouseEnter={() => handleMouseEnter(rIdx, cIdx)}
                        className={`grid-cell cursor-crosshair flex items-center justify-center relative ${cellClass}`}
                      >
                        {/* Rendering icons inside nodes */}
                        {isStart && (
                          <span className="text-[12px] animate-pulse flex items-center justify-center w-full h-full drop-shadow-[0_0_8px_rgba(57,255,20,0.8)]">
                            📡
                          </span>
                        )}
                        {isTarget && (
                          <span className="text-[12px] animate-pulse flex items-center justify-center w-full h-full drop-shadow-[0_0_8px_rgba(0,255,102,0.8)]">
                            🛰️
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Grid Edit / Assist Instructions */}
            <div className="flex flex-wrap items-center justify-between text-[10px] font-cyber-mono text-slate-400 gap-2 border-t border-cyan-950/60 pt-2 select-none z-10">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 bg-cyber-black/40 px-1.5 py-0.5 border border-cyan-950/40 rounded">
                  <span className="inline-block w-2 h-2 bg-cyber-black border border-cyan-950/50"></span>
                  <span>VACUUM VECTOR (1x)</span>
                </span>
                <span className="flex items-center gap-1 bg-cyber-black/40 px-1.5 py-0.5 border border-cyan-950/40 rounded">
                  <span className="inline-block w-2 h-2 crater-texture"></span>
                  <span>ION CLOUD (BLOCKED)</span>
                </span>
                <span className="flex items-center gap-1 bg-cyber-black/40 px-1.5 py-0.5 border border-cyan-950/40 rounded">
                  <span className="inline-block w-2 h-2 dunes-texture"></span>
                  <span>GRAV DUST (3x)</span>
                </span>
                <span className="flex items-center gap-1 bg-cyber-black/40 px-1.5 py-0.5 border border-cyan-950/40 rounded">
                  <span className="inline-block w-2 h-2 bg-neon-cyan/20 border border-neon-cyan/80"></span>
                  <span>VECTOR NODES</span>
                </span>
              </div>
              <div className="text-right italic text-slate-500">
                MANUAL OVERRIDE: REPOSITION VECTOR NODES OR DEPLOY ION FIELDS TO FORCE REAL-TIME PATH RE-CALCULATION.
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* --- TELEMETRY & ANALYTICS (Bottom Panel) --- */}
      <footer className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 relative z-10">
        
        {/* Real-time Telemetry Metrics (5 cols) */}
        <section className="lg:col-span-5 grid grid-cols-3 gap-3">
          {[
            { 
              title: 'SECTORS SCANNING', 
              val: nodesExplored, 
              color: 'text-neon-cyan text-glow-cyan', 
              icon: Search, 
              tag: 'LINK DISCOVERY', 
              border: 'border-cyan-950/60 shadow-cyan-950/20',
              corner: 'hud-corner-tl'
            },
            { 
              title: 'PROPAGATION DELAY', 
              val: pathCost === 0 && isRunning ? 'CALC...' : `${pathCost} MS`, 
              color: 'text-neon-amber text-glow-amber', 
              icon: Activity, 
              tag: 'VECTOR LATENCY', 
              border: 'border-amber-950/60 shadow-amber-950/20',
              corner: 'hud-corner-amber-tl'
            },
            { 
              title: 'CORE CYCLES RUN', 
              val: cycles === 0 && isRunning ? 'CALC...' : cycles, 
              color: 'text-neon-red text-glow-red', 
              icon: Cpu, 
              tag: 'COMPUTE TIME', 
              border: 'border-red-950/60 shadow-red-950/20',
              corner: 'hud-corner-red-tl'
            }
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div 
                key={idx} 
                className="glass-panel p-3 rounded flex flex-col justify-between shadow-lg relative overflow-hidden"
              >
                <div className={card.corner}></div>
                <div className="flex items-center justify-between border-b border-cyan-950/30 pb-1 z-10">
                  <span className="text-[9px] font-cyber-header uppercase tracking-wider text-slate-400">
                    {card.title}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="my-2.5 text-center z-10">
                  <span className={`text-xl font-cyber-mono font-bold tracking-widest ${card.color}`}>
                    {card.val}
                  </span>
                </div>
                <div className="text-[8px] font-cyber-mono text-slate-500 text-center tracking-widest uppercase z-10">
                  {card.tag}
                </div>
              </div>
            );
          })}
        </section>

        {/* Persisted Comparative Database Log (7 cols) */}
        <section className="lg:col-span-7">
          <div className="glass-panel glass-panel-hover p-4 relative shadow-2xl h-full flex flex-col justify-between">
            <div className="hud-corner-tl"></div>
            <div className="hud-corner-tr"></div>
            
            <div>
              <div className="flex items-center gap-2 border-b border-cyan-950/60 pb-2 mb-2">
                <TrendingUp className="text-neon-cyan w-4 h-4" />
                <h2 className="font-cyber-header text-xs font-bold text-neon-cyan uppercase tracking-wider">
                  PROPAGATION ROUTING METRICS
                </h2>
              </div>

              {/* Logs Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-cyber-mono text-slate-300">
                  <thead>
                    <tr className="border-b border-cyan-950/60 text-slate-400 uppercase tracking-widest text-[9px] font-cyber-header">
                      <th className="py-2 text-left">CORE ENGINE</th>
                      <th className="py-2 text-center">LINK PATH</th>
                      <th className="py-2 text-center">SCAN SECTORS</th>
                      <th className="py-2 text-center">DELAY</th>
                      <th className="py-2 text-right">ROUTING EFFICIENCY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['A-Star', 'Dijkstra', 'BFS', 'DFS'].map(algName => {
                      const matchedLog = logs.find(log => log.algorithm === algName);
                      const isSelected = algorithm === algName;
                      
                      return (
                        <tr 
                          key={algName}
                          className={`border-b border-cyan-950/20 hover:bg-cyan-950/10 transition-colors ${
                            isSelected ? 'text-neon-cyan font-bold bg-neon-cyan/5 border-l-2 border-neon-cyan' : ''
                          }`}
                        >
                          <td className="py-2 text-left flex items-center gap-1.5 pl-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-neon-cyan animate-pulse shadow-[0_0_8px_rgba(0,240,255,1)]' : 'bg-slate-700'}`}></span>
                            <span>{algName === 'A-Star' ? 'A* Search' : algName}</span>
                          </td>
                          <td className="py-2 text-center font-bold">
                            {matchedLog ? (
                              <span className={matchedLog.pathFound === 'Yes' ? 'text-neon-green text-glow-green' : 'text-neon-red text-glow-red'}>
                                {matchedLog.pathFound === 'Yes' ? 'LINKED' : 'BLOCKED'}
                              </span>
                            ) : (
                              <span className="text-slate-600">--</span>
                            )}
                          </td>
                          <td className="py-2 text-center text-slate-400">
                            {matchedLog ? matchedLog.nodesExplored : '--'}
                          </td>
                          <td className="py-2 text-center text-slate-400">
                            {matchedLog ? (matchedLog.pathCost > 0 ? `${matchedLog.pathCost} MS` : 'N/A') : '--'}
                          </td>
                          <td className="py-2 text-right font-bold pr-1.5">
                            {matchedLog ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <div className="w-16 bg-cyber-black/75 rounded border border-cyan-950/60 h-2 overflow-hidden hidden sm:block shadow-inner">
                                  <div 
                                    className="h-full bg-gradient-to-r from-cyan-600 to-neon-cyan shadow-[0_0_8px_rgba(0,240,255,0.6)] transition-all duration-500"
                                    style={{ width: `${matchedLog.efficiencyScore}%` }}
                                  ></div>
                                </div>
                                <span className={
                                  matchedLog.efficiencyScore > 75 
                                    ? 'text-neon-green text-glow-green' 
                                    : matchedLog.efficiencyScore > 40 
                                      ? 'text-neon-amber text-glow-amber' 
                                      : matchedLog.efficiencyScore > 0 
                                        ? 'text-neon-red text-glow-red' 
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
            </div>

            {/* Zero state reminder */}
            {logs.length === 0 && (
              <div className="text-[10px] font-cyber-mono text-center text-slate-500 mt-2.5 border border-dashed border-cyan-950/40 p-2 bg-cyber-black/30 rounded italic">
                NO PROPAGATION METRICS STORED. INITIALIZE LINK PROCESSOR FOR CODES ANALYSIS.
              </div>
            )}
          </div>
        </section>

      </footer>

    </div>
  );
}

