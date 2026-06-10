/**
 * Space Mission Control — Algorithm Engine
 * 
 * All algorithms are implemented as generator functions that yield typed events.
 * The simulation engine consumes events one at a time, enabling:
 *   - Step-by-step execution
 *   - Pause/resume
 *   - Time-travel (rewind via event replay)
 *   - Live data structure visualization
 *   - Educational explanations
 * 
 * Each event is a plain object with:
 *   { type, step, nodeId?, parentId?, metadata?, explanation? }
 * 
 * Algorithms are PURE — they never mutate external state.
 * They only yield events describing what happened.
 */

import * as E from './eventTypes.js';
import { getDefaultHeuristic } from './heuristics.js';

const { DIRECTIONS, nodeKey, CellType } = E;

/**
 * Get traversable neighbors of a cell
 */
function getNeighbors(grid, row, col) {
  const rows = grid.length;
  const cols = grid[0].length;
  const neighbors = [];
  for (const [dr, dc] of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      const cell = grid[nr][nc];
      if (cell.type !== CellType.OBSTACLE) {
        neighbors.push(cell);
      }
    }
  }
  return neighbors;
}

// ═══════════════════════════════════════════════════════════════
// BFS — Breadth-First Search
// ═══════════════════════════════════════════════════════════════

/**
 * BFS explores nodes level by level using a FIFO queue.
 * Guarantees shortest path in unweighted graphs.
 * 
 * @param {Array<Array>} grid - 2D grid of { row, col, type, weight }
 * @param {{ row: number, col: number }} start
 * @param {{ row: number, col: number }} goal
 * @yields {Object} Typed events describing each algorithm step
 */
export function* runBFS(grid, start, goal) {
  let step = 0;
  const startKey = nodeKey(start.row, start.col);
  const goalKey = nodeKey(goal.row, goal.col);

  yield {
    type: E.ALGORITHM_START, step: step++,
    algorithm: E.AlgorithmName.BFS, startNode: startKey, goalNode: goalKey,
    explanation: 'BFS initializes with the start node in the queue. It will explore all nodes at distance d before any node at distance d+1.',
  };

  const visited = new Set();
  const parentMap = new Map();    // nodeKey → parentKey
  const depthMap = new Map();     // nodeKey → depth
  const discoveryStep = new Map();
  const expansionStep = new Map();
  const queue = [];

  // Discover start
  visited.add(startKey);
  parentMap.set(startKey, null);
  depthMap.set(startKey, 0);
  discoveryStep.set(startKey, step);
  queue.push(startKey);

  yield {
    type: E.NODE_DISCOVERED, step: step++,
    nodeId: startKey, parentId: null, depth: 0,
    explanation: `Start node ${startKey} discovered at depth 0.`,
  };

  yield {
    type: E.ENQUEUE, step: step++,
    nodeId: startKey,
    dataStructure: [...queue],
    explanation: `Enqueue ${startKey}. Queue now has 1 element.`,
  };

  while (queue.length > 0) {
    const currentKey = queue.shift();
    const { row: cr, col: cc } = E.parseKey(currentKey);
    const currentDepth = depthMap.get(currentKey);

    yield {
      type: E.DEQUEUE, step: step++,
      nodeId: currentKey,
      dataStructure: [...queue],
      explanation: `Dequeue ${currentKey} (depth ${currentDepth}). ${queue.length} elements remain.`,
    };

    yield {
      type: E.NODE_CURRENT, step: step++,
      nodeId: currentKey,
      explanation: `Now examining node ${currentKey}.`,
    };

    // Goal check
    if (currentKey === goalKey) {
      // Trace path
      const path = [];
      let trace = goalKey;
      while (trace !== null) {
        path.unshift(trace);
        trace = parentMap.get(trace);
      }
      const pathCost = path.length - 1; // BFS = unweighted

      yield {
        type: E.PATH_TRACED, step: step++,
        path, pathCost,
        explanation: `Goal reached! Path has ${path.length} nodes with cost ${pathCost}.`,
      };

      yield {
        type: E.ALGORITHM_COMPLETE, step: step++,
        pathFound: true, path, pathCost,
        nodesDiscovered: visited.size,
        nodesExpanded: expansionStep.size,
        maxFrontierSize: queue.length,
        maxDepth: currentDepth,
        explanation: `BFS complete. Found optimal unweighted path of length ${pathCost}. Explored ${visited.size} nodes.`,
      };
      return;
    }

    // Mark expanded
    expansionStep.set(currentKey, step);
    yield {
      type: E.NODE_EXPANDED, step: step++,
      nodeId: currentKey, depth: currentDepth,
      explanation: `Node ${currentKey} fully expanded. Checking its neighbors.`,
    };

    // Explore neighbors
    const neighbors = getNeighbors(grid, cr, cc);
    for (const neighbor of neighbors) {
      const nk = nodeKey(neighbor.row, neighbor.col);

      if (visited.has(nk)) continue;

      visited.add(nk);
      parentMap.set(nk, currentKey);
      depthMap.set(nk, currentDepth + 1);
      discoveryStep.set(nk, step);
      queue.push(nk);

      yield {
        type: E.NODE_DISCOVERED, step: step++,
        nodeId: nk, parentId: currentKey, depth: currentDepth + 1,
        explanation: `Discovered ${nk} via ${currentKey} at depth ${currentDepth + 1}.`,
      };

      yield {
        type: E.ENQUEUE, step: step++,
        nodeId: nk,
        dataStructure: [...queue],
        explanation: `Enqueue ${nk}. Queue size: ${queue.length}.`,
      };
    }
  }

  // No path found
  yield {
    type: E.NO_PATH, step: step++,
    explanation: 'All reachable nodes explored. No path to goal exists.',
  };

  yield {
    type: E.ALGORITHM_COMPLETE, step: step++,
    pathFound: false, path: [], pathCost: 0,
    nodesDiscovered: visited.size, nodesExpanded: expansionStep.size,
    explanation: `BFS complete. No path found after exploring ${visited.size} nodes.`,
  };
}


// ═══════════════════════════════════════════════════════════════
// DFS — Depth-First Search
// ═══════════════════════════════════════════════════════════════

/**
 * DFS explores as deep as possible along each branch before backtracking.
 * Uses a LIFO stack. Does NOT guarantee shortest path.
 */
export function* runDFS(grid, start, goal) {
  let step = 0;
  const startKey = nodeKey(start.row, start.col);
  const goalKey = nodeKey(goal.row, goal.col);

  yield {
    type: E.ALGORITHM_START, step: step++,
    algorithm: E.AlgorithmName.DFS, startNode: startKey, goalNode: goalKey,
    explanation: 'DFS initializes with the start node on the stack. It will dive deep along one branch before trying alternatives.',
  };

  const visited = new Set();
  const parentMap = new Map();
  const depthMap = new Map();
  const expansionStep = new Map();
  const stack = [];
  let backtrackCount = 0;
  let maxDepth = 0;

  visited.add(startKey);
  parentMap.set(startKey, null);
  depthMap.set(startKey, 0);
  stack.push(startKey);

  yield {
    type: E.NODE_DISCOVERED, step: step++,
    nodeId: startKey, parentId: null, depth: 0,
  };

  yield {
    type: E.PUSH, step: step++,
    nodeId: startKey,
    dataStructure: [...stack],
    explanation: `Push ${startKey} onto stack.`,
  };

  while (stack.length > 0) {
    const currentKey = stack.pop();
    const { row: cr, col: cc } = E.parseKey(currentKey);
    const currentDepth = depthMap.get(currentKey);
    if (currentDepth > maxDepth) maxDepth = currentDepth;

    yield {
      type: E.POP, step: step++,
      nodeId: currentKey,
      dataStructure: [...stack],
      explanation: `Pop ${currentKey} from stack (depth ${currentDepth}). Stack size: ${stack.length}.`,
    };

    yield {
      type: E.NODE_CURRENT, step: step++,
      nodeId: currentKey,
    };

    // Goal check
    if (currentKey === goalKey) {
      const path = [];
      let trace = goalKey;
      while (trace !== null) {
        path.unshift(trace);
        trace = parentMap.get(trace);
      }
      let pathCost = 0;
      for (let i = 1; i < path.length; i++) {
        const { row, col } = E.parseKey(path[i]);
        pathCost += E.getCellWeight(grid[row][col].type);
      }

      yield {
        type: E.PATH_TRACED, step: step++,
        path, pathCost,
        explanation: `Goal reached via DFS! Path length: ${path.length}, cost: ${pathCost}. Note: this may NOT be the shortest path.`,
      };

      yield {
        type: E.ALGORITHM_COMPLETE, step: step++,
        pathFound: true, path, pathCost,
        nodesDiscovered: visited.size, nodesExpanded: expansionStep.size,
        backtrackCount, maxDepth,
        explanation: `DFS complete. Path found with cost ${pathCost}. Backtracked ${backtrackCount} times. Max depth: ${maxDepth}.`,
      };
      return;
    }

    // Expand
    expansionStep.set(currentKey, step);
    yield {
      type: E.NODE_EXPANDED, step: step++,
      nodeId: currentKey, depth: currentDepth,
    };

    const neighbors = getNeighbors(grid, cr, cc);
    let discoveredAny = false;

    // Push neighbors in reverse order so first direction is explored first
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const neighbor = neighbors[i];
      const nk = nodeKey(neighbor.row, neighbor.col);
      if (visited.has(nk)) continue;

      visited.add(nk);
      parentMap.set(nk, currentKey);
      depthMap.set(nk, currentDepth + 1);
      stack.push(nk);
      discoveredAny = true;

      yield {
        type: E.NODE_DISCOVERED, step: step++,
        nodeId: nk, parentId: currentKey, depth: currentDepth + 1,
      };

      yield {
        type: E.PUSH, step: step++,
        nodeId: nk,
        dataStructure: [...stack],
        explanation: `Push ${nk} onto stack (depth ${currentDepth + 1}).`,
      };
    }

    // Backtrack event if no new neighbors discovered
    if (!discoveredAny && stack.length > 0) {
      backtrackCount++;
      yield {
        type: E.BACKTRACK, step: step++,
        nodeId: currentKey,
        explanation: `Dead end at ${currentKey}. Backtracking. (${backtrackCount} total backtracks)`,
      };
    }
  }

  yield { type: E.NO_PATH, step: step++, explanation: 'Stack empty. No path found.' };
  yield {
    type: E.ALGORITHM_COMPLETE, step: step++,
    pathFound: false, path: [], pathCost: 0,
    nodesDiscovered: visited.size, nodesExpanded: expansionStep.size,
    backtrackCount, maxDepth,
  };
}


// ═══════════════════════════════════════════════════════════════
// Dijkstra — Shortest Path with Weights
// ═══════════════════════════════════════════════════════════════

/**
 * Dijkstra's algorithm finds the absolute shortest path in weighted graphs.
 * Uses a priority queue sorted by cumulative distance from start.
 * Relaxes edges when a cheaper path is found.
 */
export function* runDijkstra(grid, start, goal) {
  let step = 0;
  const startKey = nodeKey(start.row, start.col);
  const goalKey = nodeKey(goal.row, goal.col);

  yield {
    type: E.ALGORITHM_START, step: step++,
    algorithm: E.AlgorithmName.DIJKSTRA, startNode: startKey, goalNode: goalKey,
    explanation: 'Dijkstra initializes all distances to ∞ except start (0). It greedily expands the nearest unvisited node.',
  };

  const dist = new Map();          // nodeKey → shortest distance from start
  const parentMap = new Map();     // nodeKey → parentKey
  const expanded = new Set();      // closed set
  const depthMap = new Map();
  let relaxationCount = 0;
  let distanceUpdates = 0;

  // Simple priority queue using sorted array
  // Items: { key, distance }
  const pq = [];
  const pqInsert = (key, distance) => {
    pq.push({ key, distance });
    pq.sort((a, b) => a.distance - b.distance);
  };
  const pqExtractMin = () => pq.shift();
  const pqSnapshot = () => pq.map(item => ({
    nodeId: item.key,
    priority: item.distance,
  }));

  // Initialize
  dist.set(startKey, 0);
  parentMap.set(startKey, null);
  depthMap.set(startKey, 0);
  pqInsert(startKey, 0);

  yield {
    type: E.NODE_DISCOVERED, step: step++,
    nodeId: startKey, parentId: null, depth: 0,
    metadata: { distance: 0 },
    explanation: `Start node ${startKey} initialized with distance 0.`,
  };

  yield {
    type: E.PRIORITY_ENQUEUE, step: step++,
    nodeId: startKey,
    priority: 0,
    dataStructure: pqSnapshot(),
  };

  while (pq.length > 0) {
    const { key: currentKey, distance: currentDist } = pqExtractMin();

    // Skip if already expanded (lazy deletion)
    if (expanded.has(currentKey)) continue;

    const { row: cr, col: cc } = E.parseKey(currentKey);

    yield {
      type: E.PRIORITY_DEQUEUE, step: step++,
      nodeId: currentKey,
      priority: currentDist,
      dataStructure: pqSnapshot(),
      explanation: `Extract minimum: ${currentKey} with distance ${currentDist}.`,
    };

    yield {
      type: E.NODE_CURRENT, step: step++,
      nodeId: currentKey,
      metadata: { distance: currentDist },
    };

    // Goal check
    if (currentKey === goalKey) {
      const path = [];
      let trace = goalKey;
      while (trace !== null) {
        path.unshift(trace);
        trace = parentMap.get(trace);
      }

      yield {
        type: E.PATH_TRACED, step: step++,
        path, pathCost: currentDist,
        explanation: `Shortest path found! Cost: ${currentDist}. Path length: ${path.length} nodes.`,
      };

      yield {
        type: E.ALGORITHM_COMPLETE, step: step++,
        pathFound: true, path, pathCost: currentDist,
        nodesDiscovered: dist.size, nodesExpanded: expanded.size + 1,
        relaxationCount, distanceUpdates,
        explanation: `Dijkstra complete. Optimal path cost: ${currentDist}. ${relaxationCount} relaxations performed.`,
      };
      return;
    }

    expanded.add(currentKey);
    yield {
      type: E.NODE_EXPANDED, step: step++,
      nodeId: currentKey,
      depth: depthMap.get(currentKey) || 0,
      metadata: { distance: currentDist },
    };

    // Relax neighbors
    const neighbors = getNeighbors(grid, cr, cc);
    for (const neighbor of neighbors) {
      const nk = nodeKey(neighbor.row, neighbor.col);
      if (expanded.has(nk)) continue;

      const edgeWeight = E.getCellWeight(neighbor.type);
      const newDist = currentDist + edgeWeight;
      const oldDist = dist.has(nk) ? dist.get(nk) : Infinity;
      relaxationCount++;

      if (newDist < oldDist) {
        const isUpdate = dist.has(nk);
        dist.set(nk, newDist);
        const oldParent = parentMap.get(nk) || null;
        parentMap.set(nk, currentKey);
        depthMap.set(nk, (depthMap.get(currentKey) || 0) + 1);
        pqInsert(nk, newDist);

        if (isUpdate) {
          distanceUpdates++;
          yield {
            type: E.DISTANCE_UPDATE, step: step++,
            nodeId: nk, oldDistance: oldDist, newDistance: newDist,
            explanation: `Relaxation: distance to ${nk} improved from ${oldDist} to ${newDist} via ${currentKey}.`,
          };

          yield {
            type: E.PREDECESSOR_CHANGE, step: step++,
            nodeId: nk, oldParent, newParent: currentKey,
            explanation: `Predecessor of ${nk} changed from ${oldParent} to ${currentKey}.`,
          };
        } else {
          yield {
            type: E.NODE_DISCOVERED, step: step++,
            nodeId: nk, parentId: currentKey,
            depth: depthMap.get(nk),
            metadata: { distance: newDist },
            explanation: `Discovered ${nk} with distance ${newDist} via ${currentKey}.`,
          };
        }

        yield {
          type: E.PRIORITY_ENQUEUE, step: step++,
          nodeId: nk,
          priority: newDist,
          dataStructure: pqSnapshot(),
        };
      }
    }
  }

  yield { type: E.NO_PATH, step: step++, explanation: 'Priority queue empty. No path to goal.' };
  yield {
    type: E.ALGORITHM_COMPLETE, step: step++,
    pathFound: false, path: [], pathCost: 0,
    nodesDiscovered: dist.size, nodesExpanded: expanded.size,
    relaxationCount, distanceUpdates,
  };
}


// ═══════════════════════════════════════════════════════════════
// A* — Heuristic-Guided Shortest Path
// ═══════════════════════════════════════════════════════════════

/**
 * A* combines Dijkstra's guaranteed optimality with heuristic guidance.
 * f(n) = g(n) + h(n) where:
 *   g(n) = actual cost from start to n
 *   h(n) = estimated cost from n to goal (heuristic)
 * 
 * With an admissible heuristic, A* is optimal and explores fewer nodes than Dijkstra.
 */
export function* runAStar(grid, start, goal, options = {}) {
  const heuristic = options.heuristic || getDefaultHeuristic();
  let step = 0;
  const startKey = nodeKey(start.row, start.col);
  const goalKey = nodeKey(goal.row, goal.col);

  yield {
    type: E.ALGORITHM_START, step: step++,
    algorithm: E.AlgorithmName.ASTAR, startNode: startKey, goalNode: goalKey,
    metadata: { heuristic: heuristic.displayName || 'Manhattan' },
    explanation: `A* initializes with heuristic: ${heuristic.displayName || 'Manhattan'}. f(n) = g(n) + h(n). Nodes with lowest f are explored first.`,
  };

  const gScore = new Map();      // actual cost from start
  const fScore = new Map();      // g + h
  const hScore = new Map();      // cached heuristic values
  const parentMap = new Map();
  const depthMap = new Map();
  const closedSet = new Set();   // expanded nodes
  let heuristicEvals = 0;
  let relaxationCount = 0;

  // Priority queue sorted by f-score
  const openSet = [];
  const openSetKeys = new Set();
  const pqInsert = (key, f) => {
    openSet.push({ key, f });
    openSet.sort((a, b) => a.f - b.f);
    openSetKeys.add(key);
  };
  const pqExtractMin = () => {
    const item = openSet.shift();
    if (item) openSetKeys.delete(item.key);
    return item;
  };
  const pqSnapshot = () => openSet.map(item => ({
    nodeId: item.key,
    priority: item.f,
    g: gScore.get(item.key),
    h: hScore.get(item.key),
    f: item.f,
  }));

  // Initialize start
  const startH = heuristic(start, goal);
  heuristicEvals++;
  gScore.set(startKey, 0);
  hScore.set(startKey, startH);
  fScore.set(startKey, startH);
  parentMap.set(startKey, null);
  depthMap.set(startKey, 0);
  pqInsert(startKey, startH);

  yield {
    type: E.HEURISTIC_EVALUATED, step: step++,
    nodeId: startKey, hValue: startH,
    explanation: `h(${startKey}) = ${startH.toFixed(1)}`,
  };

  yield {
    type: E.NODE_DISCOVERED, step: step++,
    nodeId: startKey, parentId: null, depth: 0,
    metadata: { g: 0, h: startH, f: startH },
    explanation: `Start: g=0, h=${startH.toFixed(1)}, f=${startH.toFixed(1)}.`,
  };

  yield {
    type: E.PRIORITY_ENQUEUE, step: step++,
    nodeId: startKey,
    priority: startH,
    dataStructure: pqSnapshot(),
  };

  while (openSet.length > 0) {
    const { key: currentKey, f: currentF } = pqExtractMin();

    if (closedSet.has(currentKey)) continue; // lazy deletion

    const { row: cr, col: cc } = E.parseKey(currentKey);
    const currentG = gScore.get(currentKey);
    const currentH = hScore.get(currentKey);

    yield {
      type: E.PRIORITY_DEQUEUE, step: step++,
      nodeId: currentKey,
      priority: currentF,
      dataStructure: pqSnapshot(),
      metadata: { g: currentG, h: currentH, f: currentF },
      explanation: `Extract min f-score: ${currentKey} with f=${currentF.toFixed(1)} (g=${currentG}, h=${currentH.toFixed(1)}).`,
    };

    yield {
      type: E.NODE_CURRENT, step: step++,
      nodeId: currentKey,
      metadata: { g: currentG, h: currentH, f: currentF },
    };

    // Goal check
    if (currentKey === goalKey) {
      const path = [];
      let trace = goalKey;
      while (trace !== null) {
        path.unshift(trace);
        trace = parentMap.get(trace);
      }

      yield {
        type: E.PATH_TRACED, step: step++,
        path, pathCost: currentG,
        explanation: `A* found optimal path! Cost: ${currentG}. Path: ${path.length} nodes. ${heuristicEvals} heuristic evaluations.`,
      };

      yield {
        type: E.ALGORITHM_COMPLETE, step: step++,
        pathFound: true, path, pathCost: currentG,
        nodesDiscovered: gScore.size, nodesExpanded: closedSet.size + 1,
        heuristicEvals,
        openSetSize: openSet.length, closedSetSize: closedSet.size + 1,
        relaxationCount,
        explanation: `A* complete. Open set: ${openSet.length}, Closed set: ${closedSet.size + 1}. Heuristic evals: ${heuristicEvals}.`,
      };
      return;
    }

    closedSet.add(currentKey);
    yield {
      type: E.NODE_EXPANDED, step: step++,
      nodeId: currentKey,
      depth: depthMap.get(currentKey) || 0,
      metadata: { g: currentG, h: currentH, f: currentF },
    };

    // Explore neighbors
    const neighbors = getNeighbors(grid, cr, cc);
    for (const neighbor of neighbors) {
      const nk = nodeKey(neighbor.row, neighbor.col);
      if (closedSet.has(nk)) continue;

      const edgeWeight = E.getCellWeight(neighbor.type);
      const tentativeG = currentG + edgeWeight;
      const oldG = gScore.has(nk) ? gScore.get(nk) : Infinity;
      relaxationCount++;

      if (tentativeG < oldG) {
        const isUpdate = gScore.has(nk);
        const oldParent = parentMap.get(nk) || null;

        // Compute heuristic if not cached
        let h;
        if (hScore.has(nk)) {
          h = hScore.get(nk);
        } else {
          h = heuristic({ row: neighbor.row, col: neighbor.col }, goal);
          hScore.set(nk, h);
          heuristicEvals++;

          yield {
            type: E.HEURISTIC_EVALUATED, step: step++,
            nodeId: nk, hValue: h,
            explanation: `h(${nk}) = ${h.toFixed(1)}`,
          };
        }

        const f = tentativeG + h;
        gScore.set(nk, tentativeG);
        fScore.set(nk, f);
        parentMap.set(nk, currentKey);
        depthMap.set(nk, (depthMap.get(currentKey) || 0) + 1);
        pqInsert(nk, f);

        if (isUpdate) {
          yield {
            type: E.DISTANCE_UPDATE, step: step++,
            nodeId: nk, oldDistance: oldG, newDistance: tentativeG,
            metadata: { g: tentativeG, h, f },
            explanation: `Relaxation: g(${nk}) improved ${oldG} → ${tentativeG}. New f=${f.toFixed(1)}.`,
          };

          if (oldParent !== currentKey) {
            yield {
              type: E.PREDECESSOR_CHANGE, step: step++,
              nodeId: nk, oldParent, newParent: currentKey,
            };
          }
        } else {
          yield {
            type: E.NODE_DISCOVERED, step: step++,
            nodeId: nk, parentId: currentKey,
            depth: depthMap.get(nk),
            metadata: { g: tentativeG, h, f },
            explanation: `Discovered ${nk}: g=${tentativeG}, h=${h.toFixed(1)}, f=${f.toFixed(1)}.`,
          };
        }

        yield {
          type: E.PRIORITY_ENQUEUE, step: step++,
          nodeId: nk,
          priority: f,
          dataStructure: pqSnapshot(),
        };
      }
    }
  }

  yield { type: E.NO_PATH, step: step++, explanation: 'Open set empty. No path to goal.' };
  yield {
    type: E.ALGORITHM_COMPLETE, step: step++,
    pathFound: false, path: [], pathCost: 0,
    nodesDiscovered: gScore.size, nodesExpanded: closedSet.size,
    heuristicEvals, openSetSize: 0, closedSetSize: closedSet.size,
  };
}

// ═══════════════════════════════════════════════════════════════
// Algorithm Registry
// ═══════════════════════════════════════════════════════════════

export const ALGORITHMS = Object.freeze({
  [E.AlgorithmName.BFS]:      { generator: runBFS,      name: 'BFS',      fullName: 'Breadth-First Search',    weighted: false, optimal: true,  dataStructure: 'queue',          timeComplexity: 'O(V + E)',     spaceComplexity: 'O(V)' },
  [E.AlgorithmName.DFS]:      { generator: runDFS,      name: 'DFS',      fullName: 'Depth-First Search',      weighted: false, optimal: false, dataStructure: 'stack',          timeComplexity: 'O(V + E)',     spaceComplexity: 'O(V)' },
  [E.AlgorithmName.DIJKSTRA]: { generator: runDijkstra, name: 'Dijkstra', fullName: "Dijkstra's Algorithm",    weighted: true,  optimal: true,  dataStructure: 'priority_queue', timeComplexity: 'O((V+E)logV)', spaceComplexity: 'O(V)' },
  [E.AlgorithmName.ASTAR]:    { generator: runAStar,    name: 'A*',       fullName: 'A-Star Search',           weighted: true,  optimal: true,  dataStructure: 'priority_queue', timeComplexity: 'O(b^d)',       spaceComplexity: 'O(b^d)' },
});
