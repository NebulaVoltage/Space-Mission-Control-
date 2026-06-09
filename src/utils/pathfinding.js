/**
 * Space Mission Control Pathfinding Simulator - Core Algorithms
 * All algorithms assume standard 4-directional grid movement.
 * Rough terrain (dunes) has a movement cost of 3, default has cost of 1.
 * Obstacles cannot be traversed.
 */

// Helper to check if coordinates are within the grid
const isValid = (row, col, maxRows, maxCols) => {
  return row >= 0 && row < maxRows && col >= 0 && col < maxCols;
};

// Reconstruct path from the parent node pointers
const reconstructPath = (endNode, parentMap) => {
  const path = [];
  let current = endNode;
  const keyOf = (node) => `${node.row},${node.col}`;
  
  while (current) {
    path.unshift(current);
    current = parentMap.get(keyOf(current));
  }
  return path;
};

// Calculate actual path travel cost (sum of cell weights, excluding the start cell itself)
const calculatePathCost = (path, grid) => {
  if (path.length <= 1) return 0;
  let cost = 0;
  for (let i = 1; i < path.length; i++) {
    const { row, col } = path[i];
    const cell = grid[row][col];
    cost += cell.isDunes ? 3 : 1;
  }
  return cost;
};

// Manhattan distance heuristic for A-Star
const getManhattanDistance = (node, targetNode) => {
  return Math.abs(node.row - targetNode.row) + Math.abs(node.col - targetNode.col);
};

// 4-directional moves (up, down, left, right)
const DIRECTIONS = [
  [-1, 0], // Up
  [1, 0],  // Down
  [0, -1], // Left
  [0, 1],  // Right
];

/**
 * Breadth-First Search (BFS)
 * Unweighted shortest path finder. Layer-by-layer expansion.
 */
export function runBFS(grid, startNode, targetNode) {
  const maxRows = grid.length;
  const maxCols = grid[0].length;
  const visitedNodesInOrder = [];
  const parentMap = new Map();
  const visited = new Set();
  
  const keyOf = (node) => `${node.row},${node.col}`;
  const startKey = keyOf(startNode);
  
  const queue = [startNode];
  visited.add(startKey);
  parentMap.set(startKey, null);
  
  let computeCycles = 0;
  let pathFound = false;
  
  while (queue.length > 0) {
    computeCycles++;
    const current = queue.shift();
    
    // Track visited nodes for animation (exclude start and target for visual aesthetics if preferred, 
    // but standard is to track all explored cells)
    if (keyOf(current) !== startKey && keyOf(current) !== keyOf(targetNode)) {
      visitedNodesInOrder.push(current);
    }
    
    if (current.row === targetNode.row && current.col === targetNode.col) {
      pathFound = true;
      break;
    }
    
    for (const [dr, dc] of DIRECTIONS) {
      const nextRow = current.row + dr;
      const nextCol = current.col + dc;
      
      if (!isValid(nextRow, nextCol, maxRows, maxCols)) continue;
      
      const neighbor = grid[nextRow][nextCol];
      const neighborKey = keyOf(neighbor);
      
      if (neighbor.isObstacle || visited.has(neighborKey)) continue;
      
      visited.add(neighborKey);
      parentMap.set(neighborKey, current);
      queue.push(neighbor);
    }
  }
  
  const path = pathFound ? reconstructPath(targetNode, parentMap) : [];
  const pathCost = pathFound ? calculatePathCost(path, grid) : 0;
  
  return {
    visitedNodesInOrder,
    path,
    pathCost,
    computeCycles: computeCycles * 3, // scale for cool telemetry readout
    pathFound
  };
}

/**
 * Depth-First Search (DFS)
 * Probes deeply down branches. Not guaranteed to find the shortest path.
 */
export function runDFS(grid, startNode, targetNode) {
  const maxRows = grid.length;
  const maxCols = grid[0].length;
  const visitedNodesInOrder = [];
  const parentMap = new Map();
  const visited = new Set();
  
  const keyOf = (node) => `${node.row},${node.col}`;
  const startKey = keyOf(startNode);
  const targetKey = keyOf(targetNode);
  
  // We use an iterative stack implementation
  const stack = [startNode];
  parentMap.set(startKey, null);
  
  let computeCycles = 0;
  let pathFound = false;
  
  while (stack.length > 0) {
    computeCycles++;
    const current = stack.pop();
    const currentKey = keyOf(current);
    
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    
    if (currentKey !== startKey && currentKey !== targetKey) {
      visitedNodesInOrder.push(current);
    }
    
    if (current.row === targetNode.row && current.col === targetNode.col) {
      pathFound = true;
      break;
    }
    
    // For DFS to explore in a natural order, we can reverse neighbors or just push them
    // Note that standard DFS will explore the last pushed neighbor first
    for (const [dr, dc] of DIRECTIONS) {
      const nextRow = current.row + dr;
      const nextCol = current.col + dc;
      
      if (!isValid(nextRow, nextCol, maxRows, maxCols)) continue;
      
      const neighbor = grid[nextRow][nextCol];
      const neighborKey = keyOf(neighbor);
      
      if (neighbor.isObstacle || visited.has(neighborKey)) continue;
      
      // Update parent pointer before pushing (might be overwritten, but tracks path branch)
      parentMap.set(neighborKey, current);
      stack.push(neighbor);
    }
  }
  
  const path = pathFound ? reconstructPath(targetNode, parentMap) : [];
  const pathCost = pathFound ? calculatePathCost(path, grid) : 0;
  
  return {
    visitedNodesInOrder,
    path,
    pathCost,
    computeCycles: computeCycles * 2,
    pathFound
  };
}

/**
 * Dijkstra's Algorithm
 * Finds the absolute optimal path across weighted terrains.
 */
export function runDijkstra(grid, startNode, targetNode) {
  const maxRows = grid.length;
  const maxCols = grid[0].length;
  const visitedNodesInOrder = [];
  const parentMap = new Map();
  
  const keyOf = (node) => `${node.row},${node.col}`;
  const startKey = keyOf(startNode);
  const targetKey = keyOf(targetNode);
  
  // Initialize distances map: key -> distance
  const distances = new Map();
  const unvisited = [];
  
  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      const node = grid[r][c];
      if (node.isObstacle) continue;
      
      const key = keyOf(node);
      distances.set(key, Infinity);
      unvisited.push(node);
    }
  }
  
  distances.set(startKey, 0);
  parentMap.set(startKey, null);
  
  let computeCycles = 0;
  let pathFound = false;
  
  while (unvisited.length > 0) {
    computeCycles++;
    
    // Find node with the smallest distance in unvisited list
    let minIndex = 0;
    for (let i = 1; i < unvisited.length; i++) {
      const nodeKey = keyOf(unvisited[i]);
      const minKey = keyOf(unvisited[minIndex]);
      if (distances.get(nodeKey) < distances.get(minKey)) {
        minIndex = i;
      }
    }
    
    const current = unvisited[minIndex];
    const currentKey = keyOf(current);
    const currentDistance = distances.get(currentKey);
    
    // If smallest distance is infinity, the remaining nodes are unreachable
    if (currentDistance === Infinity) {
      break;
    }
    
    // Remove current from unvisited array
    unvisited.splice(minIndex, 1);
    
    if (currentKey !== startKey && currentKey !== targetKey) {
      visitedNodesInOrder.push(current);
    }
    
    if (current.row === targetNode.row && current.col === targetNode.col) {
      pathFound = true;
      break;
    }
    
    for (const [dr, dc] of DIRECTIONS) {
      const nextRow = current.row + dr;
      const nextCol = current.col + dc;
      
      if (!isValid(nextRow, nextCol, maxRows, maxCols)) continue;
      
      const neighbor = grid[nextRow][nextCol];
      if (neighbor.isObstacle) continue;
      
      const neighborKey = keyOf(neighbor);
      // Check if neighbor is still unvisited
      const isUnvisited = unvisited.some(node => node.row === nextRow && node.col === nextCol);
      if (!isUnvisited) continue;
      
      const weight = neighbor.isDunes ? 3 : 1;
      const tentDistance = currentDistance + weight;
      
      if (tentDistance < distances.get(neighborKey)) {
        distances.set(neighborKey, tentDistance);
        parentMap.set(neighborKey, current);
      }
    }
  }
  
  const path = pathFound ? reconstructPath(targetNode, parentMap) : [];
  const pathCost = pathFound ? calculatePathCost(path, grid) : 0;
  
  return {
    visitedNodesInOrder,
    path,
    pathCost,
    computeCycles: computeCycles * 5, // higher cost search
    pathFound
  };
}

/**
 * A* (A-Star) Search
 * Uses heuristic + cost tracking to find shortest path efficiently.
 */
export function runAStar(grid, startNode, targetNode) {
  const maxRows = grid.length;
  const maxCols = grid[0].length;
  const visitedNodesInOrder = [];
  const parentMap = new Map();
  
  const keyOf = (node) => `${node.row},${node.col}`;
  const startKey = keyOf(startNode);
  const targetKey = keyOf(targetNode);
  
  // Track gScore (cost from start to current) and fScore (gScore + hScore)
  const gScore = new Map();
  const fScore = new Map();
  
  // Set of open nodes currently being considered
  const openSet = [startNode];
  const openSetKeys = new Set([startKey]);
  const closedSet = new Set();
  
  gScore.set(startKey, 0);
  fScore.set(startKey, getManhattanDistance(startNode, targetNode));
  parentMap.set(startKey, null);
  
  let computeCycles = 0;
  let pathFound = false;
  
  while (openSet.length > 0) {
    computeCycles++;
    
    // Find node in openSet with lowest fScore
    let minIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      const nodeKey = keyOf(openSet[i]);
      const minKey = keyOf(openSet[minIndex]);
      if (fScore.get(nodeKey) < fScore.get(minKey)) {
        minIndex = i;
      }
    }
    
    const current = openSet[minIndex];
    const currentKey = keyOf(current);
    
    if (current.row === targetNode.row && current.col === targetNode.col) {
      pathFound = true;
      break;
    }
    
    // Remove from openSet
    openSet.splice(minIndex, 1);
    openSetKeys.delete(currentKey);
    closedSet.add(currentKey);
    
    if (currentKey !== startKey && currentKey !== targetKey) {
      visitedNodesInOrder.push(current);
    }
    
    for (const [dr, dc] of DIRECTIONS) {
      const nextRow = current.row + dr;
      const nextCol = current.col + dc;
      
      if (!isValid(nextRow, nextCol, maxRows, maxCols)) continue;
      
      const neighbor = grid[nextRow][nextCol];
      if (neighbor.isObstacle) continue;
      
      const neighborKey = keyOf(neighbor);
      if (closedSet.has(neighborKey)) continue;
      
      const weight = neighbor.isDunes ? 3 : 1;
      const tentativeGScore = gScore.get(currentKey) + weight;
      
      const neighborG = gScore.has(neighborKey) ? gScore.get(neighborKey) : Infinity;
      
      if (tentativeGScore < neighborG) {
        parentMap.set(neighborKey, current);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + getManhattanDistance(neighbor, targetNode));
        
        if (!openSetKeys.has(neighborKey)) {
          openSet.push(neighbor);
          openSetKeys.add(neighborKey);
        }
      }
    }
  }
  
  const path = pathFound ? reconstructPath(targetNode, parentMap) : [];
  const pathCost = pathFound ? calculatePathCost(path, grid) : 0;
  
  return {
    visitedNodesInOrder,
    path,
    pathCost,
    computeCycles: computeCycles * 4,
    pathFound
  };
}
