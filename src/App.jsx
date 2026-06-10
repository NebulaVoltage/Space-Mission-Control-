import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Sparkles, 
  Cpu, 
  Info, 
  XOctagon, 
  Eraser, 
  Grid3X3,
  Search,
  Activity,
  Truck,
  Building2,
  Clock,
  Download,
  Palette,
  LayoutGrid,
  Settings,
  Navigation,
  Database
} from 'lucide-react';
import { runBFS, runDFS, runDijkstra, runAStar } from './utils/pathfinding';

// Grid Dimensions
const ROWS = 20;
const COLS = 35;

// Dispatch Cycle Timer (DCT) Clock Sub-component (performance decoupled)
function DCTClock() {
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
    return `DCT ${hrs}:${mins}:${secs}`;
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

// Pre-configured smart-city presets layouts
const PRESETS = {
  'urban-maze': {
    name: 'Urban Grid Blocks',
    description: 'Simulates a standard grid city with skyscrapers blocks.',
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
    name: 'Congested Corridor',
    description: 'Heavy traffic congestion wall, forcing detour routes.',
    obstacles: [
      { rStart: 0, rEnd: 7, cStart: 15, cEnd: 15 },
      { rStart: 12, rEnd: 19, cStart: 15, cEnd: 15 }
    ],
    dunes: [
      { rStart: 8, rEnd: 11, cStart: 14, cEnd: 16 }
    ]
  },
  'clear-channel': {
    name: 'Express Clearway',
    description: 'Flat grid for benchmark routing speeds.',
    obstacles: [],
    dunes: []
  }
};

// Pure helper to generate the initial random terrain on mount
const createInitialGrid = () => {
  const newGrid = [];
  const obstacleProb = 0.25; // 25% buildings
  const dunesProb = 0.15; // 15% traffic
  
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
  
  // --- Navbar Customized Theme & Preset states ---
  const [colorProfile, setColorProfile] = useState('cyan'); // 'cyan' | 'amber' | 'crimson'
  const [activePreset, setActivePreset] = useState('clear-channel');
  
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

  // Update specific cell values in grid (optimized single cell updates)
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

  // Load Preset layouts
  const loadPreset = useCallback((presetKey) => {
    abortSimulation();
    clearOverlays();
    setActivePreset(presetKey);
    
    const preset = PRESETS[presetKey];
    if (!preset) return;
    
    const newGrid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const isStart = r === startNode.row && c === startNode.col;
        const isTarget = r === targetNode.row && c === targetNode.col;
        
        let isObstacle = false;
        let isDunes = false;
        
        if (!isStart && !isTarget) {
          isObstacle = preset.obstacles.some(block => 
            r >= block.rStart && r <= block.rEnd && c >= block.cStart && c <= block.cEnd
          );
          isDunes = preset.dunes.some(block => 
            r >= block.rStart && r <= block.rEnd && c >= block.cStart && c <= block.cEnd
          );
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
    setLogs([]);
  }, [startNode, targetNode, abortSimulation, clearOverlays]);

  // Generate grid with random obstacles (craters) and dunes
  const generateRandomTerrain = useCallback((customDensity = density) => {
    // Stop any running simulation
    abortSimulation();
    clearOverlays();
    setActivePreset('custom');
    
    const newGrid = [];
    const obstacleProb = customDensity / 100;
    const dunesProb = 0.15; 
    
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
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
    setLogs([]);
  }, [density, startNode, targetNode, abortSimulation, clearOverlays]);

  // Full reset: clear grid overlay and structures back to a blank flat map
  const resetToBlankTerrain = useCallback(() => {
    abortSimulation();
    setActivePreset('clear-channel');
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
        updateCellTerrain(r, c, false, false);
        setStartNode({ row: r, col: c });
        clearOverlays();
        setLogs([]);
      }
      return;
    }
    if (draggingNode === 'target') {
      if (!isStart) {
        updateCellTerrain(r, c, false, false);
        setTargetNode({ row: r, col: c });
        clearOverlays();
        setLogs([]);
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

    const batchSize = Math.max(1, Math.floor(speed / 2.2));
    const delay = Math.max(6, 120 - (speed * 11));

    let index = 0;
    
    const animateExploration = () => {
      if (!isRunningRef.current) {
        setIsRunning(false);
        return;
      }

      if (index < visitedNodesInOrder.length) {
        const batchNodes = [];
        for (let b = 0; b < batchSize; b++) {
          if (index + b < visitedNodesInOrder.length) {
            batchNodes.push(visitedNodesInOrder[index + b]);
          }
        }

        setVisitedKeys(prev => {
          const next = new Set(prev);
          for (const node of batchNodes) {
            next.add(`${node.row},${node.col}`);
          }
          return next;
        });

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
            if (!isRunningRef.current) {
              setIsRunning(false);
              return;
            }

            if (pathIdx < path.length) {
              const currentNode = path[pathIdx];
              setPathKeys(prev => {
                const next = new Set(prev);
                next.add(`${currentNode.row},${currentNode.col}`);
                return next;
              });
              
              const intermediateCost = Math.round((pathIdx / path.length) * finalCost);
              setPathCost(Math.max(1, intermediateCost));
              
              pathIdx++;
              timeoutRef.current = setTimeout(animatePath, 25);
            } else {
              setPathCost(finalCost);
              setIsRunning(false);
              saveTelemetryLog(algorithm, true, visitedNodesInOrder.length, finalCost);
            }
          };
          animatePath();
        } else {
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
      const filtered = prev.filter(item => item.algorithm !== algName);
      return [...filtered, newEntry];
    });
  };

  // Export path metrics logs as JSON file
  const exportLogs = () => {
    if (logs.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `dispatch_telemetry_report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
      desc: 'Explores isotropic wavefront layers outwards from distribution hub.',
      context: 'Unweighted routing path dispatch.',
      pros: 'Guarantees lowest hop-count road path.',
      cons: 'Heavy memory footprint (large frontier queue).'
    },
    'DFS': {
      desc: 'Probes single courier branch recursively before backtracking.',
      context: 'Unmapped residential street probe.',
      pros: 'Minimal processor memory allocation.',
      cons: 'No transit duration optimization guarantee.'
    },
    'Dijkstra': {
      desc: 'Explores road routes sorted by lowest cumulative transit time.',
      context: 'Weighted terrain navigation (heavy traffic vs. clearways).',
      pros: 'Guarantees absolute optimal routing path on congested grids.',
      cons: 'Unguided search. Scans all city directions equally.'
    },
    'A-Star': {
      desc: 'Uses accumulated route latency + Manhattan geometric heuristic.',
      context: 'Real-time optimal drone courier link establishing.',
      pros: 'Industry standard. Highly directed, efficient pathfinder.',
      cons: 'Dependent on heuristic accuracy across high building densities.'
    }
  };

  return (
    <div className={`min-h-screen bg-cyber-black text-slate-200 p-4 font-sans flex flex-col relative select-none theme-${colorProfile}`}>
      {/* Subtle top ambient glowing header background */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent pointer-events-none"></div>
      <div className="absolute top-0 left-1/3 right-1/3 h-[80px] bg-neon-cyan/5 blur-[80px] pointer-events-none rounded-full"></div>

      {/* --- NAVIGATION BAR & HEADER --- */}
      <header className="border-b border-cyber-gray-light pb-3 mb-4 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-neon-cyan flex items-center justify-center rounded shadow-[0_0_10px_var(--brand-cyan-glow)] bg-cyber-gray-dark">
            <Truck className="text-neon-cyan w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-cyber-header font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-slate-400 tracking-wider flex items-center gap-2">
              AUTONOMOUS URBAN DISPATCH ROUTER
            </h1>
            <p className="text-[10px] font-cyber-mono text-slate-400/80 tracking-widest uppercase flex items-center gap-2">
              <span>SMART-CITY FLEET CONTROL</span>
              <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
              <span className="text-neon-cyan">v5.0.0</span>
            </p>
          </div>
        </div>
        
        {/* Navbar Options & Gauges */}
        <div className="flex flex-wrap items-center gap-3 bg-cyber-gray-dark border border-cyber-gray-light px-3 py-1.5 rounded shadow-inner">
          
          {/* Preset Selector dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-cyber-mono">
            <LayoutGrid className="w-3.5 h-3.5 text-neon-cyan" />
            <select
              value={activePreset}
              onChange={(e) => loadPreset(e.target.value)}
              className="bg-cyber-black text-slate-300 border border-cyber-gray-light rounded px-2 py-1 focus:outline-none focus:border-neon-cyan cursor-pointer text-[11px]"
            >
              <option value="clear-channel">Express Clearway</option>
              <option value="urban-maze">Urban Grid Blocks</option>
              <option value="traffic-blockade">Congested Corridor</option>
            </select>
          </div>

          <div className="hidden sm:block w-px h-4 bg-cyber-gray-light"></div>

          {/* Color theme selectors */}
          <div className="flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-slate-500 mr-1" />
            {[
              { id: 'cyan', color: 'bg-[#00e5ff]', label: 'Cyan' },
              { id: 'amber', color: 'bg-[#ffb300]', label: 'Amber' },
              { id: 'crimson', color: 'bg-[#ff3333]', label: 'Crimson' }
            ].map(theme => (
              <button
                key={theme.id}
                onClick={() => setColorProfile(theme.id)}
                title={`Swap profile: ${theme.label}`}
                className={`w-4 h-4 rounded-full ${theme.color} border transition-all cursor-pointer ${
                  colorProfile === theme.id ? 'ring-2 ring-white scale-110 border-transparent' : 'border-cyber-gray hover:scale-105'
                }`}
              ></button>
            ))}
          </div>

          <div className="w-px h-4 bg-cyber-gray-light"></div>

          {/* Active fleet status */}
          <div className="flex items-center gap-1.5 bg-cyber-black px-2 py-1 rounded text-[10px] font-cyber-mono text-slate-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neon-cyan"></span>
            </span>
            <span className="tracking-wide">FLEET: 12 DRONES ACTIVE</span>
          </div>

          <div className="hidden sm:block w-px h-4 bg-cyber-gray-light"></div>
          <DCTClock />
        </div>
      </header>

      {/* --- MAIN CORE INTERFACE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-grow relative z-10" onMouseUp={handleMouseUp}>
        
        {/* --- LEFT CONTROL PANEL (4 cols) --- */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Dispatch Configuration Card */}
          <div className="glass-panel glass-panel-hover p-4 relative overflow-hidden flex flex-col gap-4 shadow-2xl">
            <div className="hud-corner-tl"></div>
            <div className="hud-corner-tr"></div>
            <div className="hud-corner-bl"></div>
            <div className="hud-corner-br"></div>
            
            <div className="flex items-center gap-2 border-b border-cyber-gray-light pb-2">
              <Settings className="text-neon-cyan w-4 h-4" />
              <h2 className="font-cyber-header text-xs font-bold text-neon-cyan uppercase tracking-wider">
                DISPATCH PARAMETERS & VEHICLE ROUTING
              </h2>
            </div>

            {/* Algorithm Segmented Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-cyber-header uppercase tracking-wider text-slate-400">
                ROUTING ALGORITHM ENGINE
              </label>
              <div className="grid grid-cols-4 gap-1 bg-cyber-black p-1 rounded border border-cyber-gray-light shadow-inner">
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
                        ? 'bg-neon-cyan/15 border border-neon-cyan text-neon-cyan text-glow-cyan shadow-[0_0_10px_var(--brand-cyan-glow-low)]'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-cyber-gray-light'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {alg === 'A-Star' ? 'A*' : alg}
                  </button>
                ))}
              </div>
            </div>

            {/* Algorithm Info Monospace Tooltip */}
            <div className="bg-cyber-black/50 border border-cyber-gray-light p-3 rounded text-[11px] font-cyber-mono flex flex-col gap-1.5 relative shadow-inner">
              <div className="flex items-center gap-1.5 text-neon-cyan border-b border-cyber-gray-light/30 pb-1">
                <Info className="w-3.5 h-3.5" />
                <span>ROUTING SPECIFICATIONS: {algorithm}</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {algorithmInfo[algorithm].desc}
              </p>
              <div className="grid grid-cols-1 gap-1 text-[10px] text-slate-400 pt-1 border-t border-cyber-gray-light/20">
                <div><span className="text-neon-amber font-semibold">ROUTING CONTEXT:</span> {algorithmInfo[algorithm].context}</div>
                <div><span className="text-neon-cyan font-semibold">PROS:</span> {algorithmInfo[algorithm].pros}</div>
                <div><span className="text-neon-red font-semibold">CONS:</span> {algorithmInfo[algorithm].cons}</div>
              </div>
            </div>

            {/* Sliders Box */}
            <div className="flex flex-col gap-3.5 pt-1">
              {/* Speed Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-cyber-header uppercase tracking-wider">
                  <span className="text-slate-400">PROCESSING SPEED (HZ)</span>
                  <span className="font-cyber-mono text-neon-cyan text-glow-cyan font-bold">{speed * 10} Hz</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={speed}
                  onChange={(e) => setSpeed(parseInt(e.target.value))}
                  className="w-full accent-neon-cyan cursor-pointer bg-cyber-black rounded-lg h-1.5 appearance-none border border-cyber-gray-light"
                />
              </div>

              {/* Obstacle Density Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-cyber-header uppercase tracking-wider">
                  <span className="text-slate-400">TRAFFIC CONGESTION DENSITY (σ)</span>
                  <span className="font-cyber-mono text-neon-amber text-glow-amber font-bold">{density}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={density}
                  disabled={isRunning}
                  onChange={(e) => setDensity(parseInt(e.target.value))}
                  className="w-full accent-neon-amber cursor-pointer bg-cyber-black rounded-lg h-1.5 appearance-none border border-cyber-gray-light disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Brush Selector */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="text-[10px] font-cyber-header uppercase tracking-wider text-slate-400">
                CITY ROADWAY SURFACE EDITOR
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'obstacle', label: 'ROAD BLOCKAGE', color: 'border-neon-red text-neon-red bg-neon-red/10 shadow-[0_0_8px_rgba(255,109,0,0.15)]', icon: Building2 },
                  { id: 'dunes', label: 'TRAFFIC CONGESTION', color: 'border-neon-amber text-neon-amber bg-neon-amber/10 shadow-[0_0_8px_rgba(255,179,0,0.15)]', icon: Clock },
                  { id: 'clear', label: 'CLEARWAY ERASER', color: 'border-slate-600 text-slate-400 bg-slate-600/10', icon: Eraser }
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
                          : 'border-cyber-gray-light text-slate-500 hover:text-slate-300 hover:bg-cyber-black/40'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex flex-col gap-2 pt-2 border-t border-cyber-gray-light">
              {/* Dispatch Action */}
              <button
                onClick={launchSimulation}
                disabled={isRunning}
                className="w-full relative py-3 bg-gradient-to-r from-neon-cyan to-[#00b0ff] hover:from-[#00b0ff] hover:to-neon-cyan text-cyber-black font-cyber-header font-black text-xs tracking-widest rounded shadow-[0_0_15px_var(--brand-cyan-glow)] active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/20 node-pulse-cyan"
              >
                <Play className="fill-cyber-black w-4 h-4" />
                <span>DISPATCH ROUTING FLEET</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Generate Terrain Button */}
                <button
                  onClick={() => generateRandomTerrain()}
                  disabled={isRunning}
                  className="py-2.5 bg-cyber-black/40 text-slate-300 border border-cyber-gray-light hover:border-neon-cyan/50 hover:text-slate-100 text-xs font-cyber-header font-semibold tracking-wider rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95 shadow-inner"
                >
                  <Sparkles className="w-3.5 h-3.5 text-neon-cyan" />
                  <span>GENERATE TRAFFIC GRID</span>
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
                  <span>{isRunning ? 'HALT DISPATCH' : 'CLEAR ACTIVE PATHS'}</span>
                </button>
              </div>

              {/* Blank Grid Option */}
              <button
                onClick={resetToBlankTerrain}
                disabled={isRunning}
                className="py-2 bg-cyber-black/20 hover:bg-cyber-black/60 border border-dashed border-cyber-gray-light hover:border-neon-red/30 text-[10px] font-cyber-mono tracking-widest text-slate-500 hover:text-neon-red/70 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>RESET ENTIRE GRID</span>
              </button>
            </div>
          </div>
          
        </section>

        {/* --- MAIN CITY VIEWPORT GRID (8 cols) --- */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          <div className="glass-panel glass-panel-hover p-4 rounded flex flex-col gap-3 relative shadow-2xl flex-grow justify-between blueprint-mesh">
            <div className="hud-corner-tl"></div>
            <div className="hud-corner-tr"></div>
            <div className="hud-corner-bl"></div>
            <div className="hud-corner-br"></div>

            {/* Viewport Header */}
            <div className="flex items-center justify-between border-b border-cyber-gray-light pb-2">
              <div className="flex items-center gap-2">
                <Navigation className="text-neon-cyan w-4 h-4" />
                <h2 className="font-cyber-header text-xs font-bold text-neon-cyan uppercase tracking-wider">
                  AUTONOMOUS URBAN DISPATCH TELEMETRY VIEWPORT
                </h2>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-cyber-mono text-slate-400">
                <div className="flex items-center gap-1.5 bg-cyber-black border border-cyber-gray-light px-2 py-0.5 rounded shadow-inner">
                  <span className="inline-block w-2 h-2 bg-neon-cyan rounded-full node-pulse-cyan"></span>
                  <span className="tracking-wide text-neon-cyan">HUB: [{startNode.col.toString().padStart(2, '0')}, {startNode.row.toString().padStart(2, '0')}]</span>
                </div>
                <div className="flex items-center gap-1.5 bg-cyber-black border border-cyber-gray-light px-2 py-0.5 rounded shadow-inner">
                  <span className="inline-block w-2 h-2 bg-neon-amber rounded-full node-pulse-amber"></span>
                  <span className="tracking-wide text-neon-amber">CLIENT: [{targetNode.col.toString().padStart(2, '0')}, {targetNode.row.toString().padStart(2, '0')}]</span>
                </div>
              </div>
            </div>

            {/* The 2D Grid Sandbox */}
            <div className="flex flex-col items-center justify-center p-2 bg-cyber-black border border-cyber-gray-light rounded flex-grow my-1">
              <div 
                className="grid relative border border-cyber-gray-light bg-cyber-black/90" 
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
 
                    const cellClass = isStart
                      ? "bg-neon-cyan/20 border-neon-cyan border shadow-[0_0_6px_var(--brand-cyan-glow)] z-10 node-pulse-cyan cursor-grab"
                      : isTarget
                      ? "bg-neon-amber/20 border-neon-amber border shadow-neon-amber/35 z-10 node-pulse-amber cursor-grab"
                      : cell.isObstacle
                      ? "blockage-texture"
                      : cell.isDunes
                      ? "congestion-texture"
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
                        {isStart && (
                          <span className="text-[12px] animate-pulse flex items-center justify-center w-full h-full drop-shadow-[0_0_8px_var(--brand-cyan-glow)]">
                            🏬
                          </span>
                        )}
                        {isTarget && (
                          <span className="text-[12px] animate-pulse flex items-center justify-center w-full h-full drop-shadow-[0_0_8px_rgba(255,179,0,0.8)]">
                            📍
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Grid Edit / Assist Instructions */}
            <div className="flex flex-wrap items-center justify-between text-[10px] font-cyber-mono text-slate-400 gap-2 border-t border-cyber-gray-light pt-2 select-none">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 bg-cyber-black px-1.5 py-0.5 border border-cyber-gray-light rounded">
                  <span className="inline-block w-2 h-2 bg-cyber-black border border-cyber-gray-light"></span>
                  <span>EXPRESS CLEARWAY (1 min)</span>
                </span>
                <span className="flex items-center gap-1 bg-cyber-black px-1.5 py-0.5 border border-cyber-gray-light rounded">
                  <span className="inline-block w-2 h-2 blockage-texture"></span>
                  <span>ROAD BLOCKAGE (BLOCKED)</span>
                </span>
                <span className="flex items-center gap-1 bg-cyber-black px-1.5 py-0.5 border border-cyber-gray-light rounded">
                  <span className="inline-block w-2 h-2 congestion-texture"></span>
                  <span>TRAFFIC CONGESTION (3 min)</span>
                </span>
                <span className="flex items-center gap-1 bg-cyber-black px-1.5 py-0.5 border border-cyber-gray-light rounded">
                  <span className="inline-block w-2 h-2 bg-neon-cyan/25 border border-neon-cyan"></span>
                  <span>ROUTE TERMINALS</span>
                </span>
              </div>
              <div className="text-right italic text-slate-500">
                MANUAL OVERRIDE: REPOSITION ROUTE TERMINALS OR PAINT BLOCKAGES TO RE-CALCULATE ROUTES IN REAL-TIME.
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
              title: 'SECTORS ANALYZED', 
              val: nodesExplored, 
              color: 'text-neon-cyan text-glow-cyan', 
              icon: Search, 
              tag: 'ROADWAY ANALYSIS', 
              border: 'border-cyber-gray-light shadow-cyber-gray-dark',
              corner: 'hud-corner-tl'
            },
            { 
              title: 'TRANSIT TIME', 
              val: pathCost === 0 && isRunning ? 'CALC...' : `${pathCost} MIN`, 
              color: 'text-neon-amber text-glow-amber', 
              icon: Activity, 
              tag: 'PATH TRANSIT METRIC', 
              border: 'border-cyber-gray-light shadow-cyber-gray-dark',
              corner: 'hud-corner-amber-tl'
            },
            { 
              title: 'ROUTER COMPUTE TIME', 
              val: cycles === 0 && isRunning ? 'CALC...' : `${cycles} CYCLES`, 
              color: 'text-neon-red text-glow-red', 
              icon: Cpu, 
              tag: 'CPU CORE CYCLES', 
              border: 'border-cyber-gray-light shadow-cyber-gray-dark',
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
                <div className="flex items-center justify-between border-b border-cyber-gray-light pb-1 z-10">
                  <span className="text-[9px] font-cyber-header uppercase tracking-wider text-slate-400">
                    {card.title}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="my-2.5 text-center z-10">
                  <span className={`text-lg font-cyber-mono font-bold tracking-widest ${card.color}`}>
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
              <div className="flex items-center justify-between border-b border-cyber-gray-light pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <Database className="text-neon-cyan w-4 h-4" />
                  <h2 className="font-cyber-header text-xs font-bold text-neon-cyan uppercase tracking-wider">
                    COMPARATIVE RUN METRICS DATABASE
                  </h2>
                </div>
                {logs.length > 0 && (
                  <button 
                    onClick={exportLogs}
                    className="flex items-center gap-1 text-[9px] font-cyber-mono text-neon-cyan border border-neon-cyan/35 hover:bg-neon-cyan/15 rounded px-2 py-0.5 cursor-pointer transition-all shadow-[0_0_4px_var(--brand-cyan-glow-low)]"
                  >
                    <Download className="w-3 h-3" />
                    <span>EXPORT TELEMETRY REPORT</span>
                  </button>
                )}
              </div>

              {/* Logs Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-cyber-mono text-slate-300">
                  <thead>
                    <tr className="border-b border-cyber-gray-light text-slate-400 uppercase tracking-widest text-[9px] font-cyber-header">
                      <th className="py-2 text-left">ROUTING ENGINE</th>
                      <th className="py-2 text-center">DISPATCH STATUS</th>
                      <th className="py-2 text-center">SECTORS ANALYZED</th>
                      <th className="py-2 text-center">TRANSIT TIME</th>
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
                          className={`border-b border-cyber-gray-light/30 hover:bg-cyber-gray-light/20 transition-colors ${
                            isSelected ? 'text-neon-cyan font-bold bg-neon-cyan/5 border-l-2 border-neon-cyan' : ''
                          }`}
                        >
                          <td className="py-2 text-left flex items-center gap-1.5 pl-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-neon-cyan animate-pulse shadow-[0_0_8px_var(--brand-cyan-glow)]' : 'bg-slate-700'}`}></span>
                            <span>{algName === 'A-Star' ? 'A* Search' : algName}</span>
                          </td>
                          <td className="py-2 text-center font-bold">
                            {matchedLog ? (
                              <span className={matchedLog.pathFound === 'Yes' ? 'text-neon-green text-glow-cyan' : 'text-neon-red text-glow-red'}>
                                {matchedLog.pathFound === 'Yes' ? 'DISPATCHED' : 'BLOCKED'}
                              </span>
                            ) : (
                              <span className="text-slate-600">--</span>
                            )}
                          </td>
                          <td className="py-2 text-center text-slate-400">
                            {matchedLog ? matchedLog.nodesExplored : '--'}
                          </td>
                          <td className="py-2 text-center text-slate-400">
                            {matchedLog ? (matchedLog.pathCost > 0 ? `${matchedLog.pathCost} MIN` : 'N/A') : '--'}
                          </td>
                          <td className="py-2 text-right font-bold pr-1.5">
                            {matchedLog ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <div className="w-16 bg-cyber-black rounded border border-cyber-gray-light h-2 overflow-hidden hidden sm:block shadow-inner">
                                  <div 
                                    className="h-full bg-gradient-to-r from-neon-cyan to-[#00b0ff] shadow-[0_0_8px_var(--brand-cyan-glow)] transition-all duration-500"
                                    style={{ width: `${matchedLog.efficiencyScore}%` }}
                                  ></div>
                                </div>
                                <span className={
                                  matchedLog.efficiencyScore > 75 
                                    ? 'text-neon-green text-glow-cyan' 
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
              <div className="text-[10px] font-cyber-mono text-center text-slate-500 mt-2.5 border border-dashed border-cyber-gray-light/40 p-2 bg-cyber-black/30 rounded italic">
                NO ROUTING TELEMETRY STORED. INITIALIZE DISPATCH PROCESSOR TO GENERATE METRICS.
              </div>
            )}
          </div>
        </section>

      </footer>

    </div>
  );
}
