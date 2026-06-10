/**
 * Space Mission Control — Event Type Constants
 * 
 * Every algorithm emits a deterministic stream of typed events.
 * The simulation engine consumes these events to update visualization state.
 * All visualization components subscribe to state changes — never to algorithms directly.
 */

// ═══════════════════════════════════════════════════════════════
// Algorithm Lifecycle Events
// ═══════════════════════════════════════════════════════════════
export const ALGORITHM_START    = 'ALGORITHM_START';
export const ALGORITHM_COMPLETE = 'ALGORITHM_COMPLETE';

// ═══════════════════════════════════════════════════════════════
// Node State Transition Events
// ═══════════════════════════════════════════════════════════════
export const NODE_DISCOVERED = 'NODE_DISCOVERED';   // First time a node is seen
export const NODE_EXPANDED   = 'NODE_EXPANDED';      // Node is fully processed (all neighbors checked)
export const NODE_CURRENT    = 'NODE_CURRENT';       // Node is the current focus of the algorithm

// ═══════════════════════════════════════════════════════════════
// Data Structure Operations (for live queue/stack visualization)
// ═══════════════════════════════════════════════════════════════
export const ENQUEUE          = 'ENQUEUE';           // BFS: added to queue
export const DEQUEUE          = 'DEQUEUE';           // BFS: removed from queue
export const PUSH             = 'PUSH';              // DFS: pushed to stack
export const POP              = 'POP';               // DFS: popped from stack
export const PRIORITY_ENQUEUE = 'PRIORITY_ENQUEUE';  // Dijkstra/A*: added to priority queue
export const PRIORITY_DEQUEUE = 'PRIORITY_DEQUEUE';  // Dijkstra/A*: removed from priority queue

// ═══════════════════════════════════════════════════════════════
// Algorithm-Specific Events
// ═══════════════════════════════════════════════════════════════
export const DISTANCE_UPDATE     = 'DISTANCE_UPDATE';      // Dijkstra/A*: relaxation found shorter path
export const PREDECESSOR_CHANGE  = 'PREDECESSOR_CHANGE';   // Dijkstra/A*: parent pointer updated
export const HEURISTIC_EVALUATED = 'HEURISTIC_EVALUATED';  // A*: h(n) computed for a node
export const BACKTRACK           = 'BACKTRACK';             // DFS: backtracking to previous node

// ═══════════════════════════════════════════════════════════════
// Path Resolution Events
// ═══════════════════════════════════════════════════════════════
export const PATH_TRACED = 'PATH_TRACED';   // Optimal path reconstructed
export const NO_PATH     = 'NO_PATH';       // No path exists

// ═══════════════════════════════════════════════════════════════
// Cell Visual States (for grid renderer)
// ═══════════════════════════════════════════════════════════════
export const CellState = Object.freeze({
  UNVISITED:   'UNVISITED',
  DISCOVERED:  'DISCOVERED',
  IN_FRONTIER: 'IN_FRONTIER',
  EXPANDED:    'EXPANDED',
  CURRENT:     'CURRENT',
  BACKTRACKED: 'BACKTRACKED',
  FINAL_PATH:  'FINAL_PATH',
  START:       'START',
  GOAL:        'GOAL',
  OBSTACLE:    'OBSTACLE',
  WEIGHTED:    'WEIGHTED',
});

// ═══════════════════════════════════════════════════════════════
// Cell Terrain Types (for grid data model)
// ═══════════════════════════════════════════════════════════════
export const CellType = Object.freeze({
  NORMAL:   'NORMAL',     // Weight 1
  WEIGHTED: 'WEIGHTED',   // Weight 3 (Nebula zones / rough terrain)
  HEAVY:    'HEAVY',      // Weight 5 (Gravity wells)
  OBSTACLE: 'OBSTACLE',   // Impassable (Asteroids)
});

/** Get the traversal cost for a cell type */
export function getCellWeight(cellType) {
  switch (cellType) {
    case CellType.NORMAL:   return 1;
    case CellType.WEIGHTED: return 3;
    case CellType.HEAVY:    return 5;
    case CellType.OBSTACLE: return Infinity;
    default:                return 1;
  }
}

// ═══════════════════════════════════════════════════════════════
// Simulation Status
// ═══════════════════════════════════════════════════════════════
export const SimStatus = Object.freeze({
  IDLE:     'IDLE',
  RUNNING:  'RUNNING',
  PAUSED:   'PAUSED',
  COMPLETE: 'COMPLETE',
});

// ═══════════════════════════════════════════════════════════════
// Algorithm Names
// ═══════════════════════════════════════════════════════════════
export const AlgorithmName = Object.freeze({
  BFS:      'BFS',
  DFS:      'DFS',
  DIJKSTRA: 'Dijkstra',
  ASTAR:    'A-Star',
});

// ═══════════════════════════════════════════════════════════════
// Directions (4-connected grid)
// ═══════════════════════════════════════════════════════════════
export const DIRECTIONS = Object.freeze([
  [-1, 0],  // Up
  [0, 1],   // Right
  [1, 0],   // Down
  [0, -1],  // Left
]);

/** Create a deterministic string key from row,col */
export const nodeKey = (row, col) => `${row},${col}`;

/** Parse a node key back to {row, col} */
export const parseKey = (key) => {
  const [r, c] = key.split(',').map(Number);
  return { row: r, col: c };
};
