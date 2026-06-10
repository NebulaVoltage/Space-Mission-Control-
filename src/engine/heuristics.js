/**
 * Space Mission Control — Heuristic Function Library
 * 
 * A* supports multiple interchangeable heuristic functions.
 * Each heuristic estimates the cost from a node to the goal.
 * The choice of heuristic dramatically affects exploration behavior.
 */

/**
 * Manhattan Distance (L1 Norm)
 * Best for 4-directional grids. Admissible and consistent.
 * Never overestimates when diagonal movement is not allowed.
 */
export function manhattan(node, goal) {
  return Math.abs(node.row - goal.row) + Math.abs(node.col - goal.col);
}
manhattan.displayName = 'Manhattan';
manhattan.description = 'Sum of horizontal and vertical distances. Optimal for 4-directional grids.';
manhattan.formula = '|Δrow| + |Δcol|';

/**
 * Euclidean Distance (L2 Norm)
 * Admissible but not consistent for 4-directional grids.
 * Underestimates, causing more exploration but still finds optimal paths.
 */
export function euclidean(node, goal) {
  const dr = node.row - goal.row;
  const dc = node.col - goal.col;
  return Math.sqrt(dr * dr + dc * dc);
}
euclidean.displayName = 'Euclidean';
euclidean.description = 'Straight-line distance. Underestimates on 4-directional grids.';
euclidean.formula = '√(Δrow² + Δcol²)';

/**
 * Chebyshev Distance (L∞ Norm)
 * Best for 8-directional grids (where diagonal moves cost 1).
 * On 4-directional grids, it underestimates.
 */
export function chebyshev(node, goal) {
  return Math.max(Math.abs(node.row - goal.row), Math.abs(node.col - goal.col));
}
chebyshev.displayName = 'Chebyshev';
chebyshev.description = 'Maximum of horizontal and vertical distances. Ideal for 8-directional movement.';
chebyshev.formula = 'max(|Δrow|, |Δcol|)';

/**
 * Octile Distance
 * Optimal for 8-directional grids where diagonal moves cost √2.
 * On 4-directional grids, it underestimates.
 */
export function octile(node, goal) {
  const dx = Math.abs(node.row - goal.row);
  const dy = Math.abs(node.col - goal.col);
  const F = Math.SQRT2 - 1; // ≈ 0.414
  return dx > dy ? F * dy + dx : F * dx + dy;
}
octile.displayName = 'Octile';
octile.description = 'Combines diagonal and straight moves. Optimal for 8-directional with √2 diagonal cost.';
octile.formula = 'max(Δ) + (√2-1)·min(Δ)';

/**
 * Weighted Manhattan (Greedy bias)
 * Multiplies Manhattan distance by a weight > 1.
 * Higher weight = more greedy (faster but possibly non-optimal).
 * Weight = 1 is standard A*. Weight → ∞ is pure greedy best-first.
 */
export function createWeightedManhattan(weight = 1.5) {
  const fn = (node, goal) => {
    return weight * (Math.abs(node.row - goal.row) + Math.abs(node.col - goal.col));
  };
  fn.displayName = `Weighted Manhattan (w=${weight})`;
  fn.description = `Manhattan × ${weight}. Trades optimality for speed. w>1 explores fewer nodes.`;
  fn.formula = `${weight} × (|Δrow| + |Δcol|)`;
  fn.weight = weight;
  return fn;
}

/**
 * Zero Heuristic (turns A* into Dijkstra)
 * Useful for demonstrating the relationship between A* and Dijkstra.
 */
export function zero() {
  return 0;
}
zero.displayName = 'Zero (Dijkstra mode)';
zero.description = 'Always returns 0. A* degenerates into Dijkstra — no heuristic guidance.';
zero.formula = '0';

// ═══════════════════════════════════════════════════════════════
// Heuristic Registry (for UI dropdowns)
// ═══════════════════════════════════════════════════════════════
export const HEURISTICS = Object.freeze({
  manhattan,
  euclidean,
  chebyshev,
  octile,
  'weighted-1.5': createWeightedManhattan(1.5),
  'weighted-3.0': createWeightedManhattan(3.0),
  zero,
});

/** Get default heuristic for A* */
export function getDefaultHeuristic() {
  return manhattan;
}
