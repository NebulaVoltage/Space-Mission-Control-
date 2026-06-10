/**
 * Space Mission Control — Simulation Engine
 * 
 * Central state machine that:
 *   1. Accepts an algorithm generator
 *   2. Pre-computes ALL events (so step-back and timeline scrubbing work)
 *   3. Manages play/pause/step/reset state
 *   4. Maintains a visualization snapshot at each step
 *   5. Notifies subscribers of state changes
 * 
 * State Machine:
 *   IDLE → RUNNING → PAUSED → RUNNING → COMPLETE
 *     ↑                                      │
 *     └──────────── RESET ←──────────────────┘
 */

import * as E from './eventTypes.js';
import { ALGORITHMS } from './algorithms.js';

const { CellState, SimStatus } = E;

/**
 * Build the visualization snapshot at a given step by replaying events 0..stepIndex
 */
function buildSnapshot(events, stepIndex, startKey, goalKey) {
  const cellStates = new Map();
  const treeNodes = new Map();
  let treeRoot = null;
  let currentNode = null;
  let path = null;
  let pathCost = 0;
  let pathFound = null;
  let currentEvent = null;
  let explanation = null;

  // Metrics
  let nodesDiscovered = 0;
  let nodesExpanded = 0;
  let frontierSize = 0;
  let maxFrontierSize = 0;
  let currentLevel = 0;
  let backtrackCount = 0;
  let maxDepth = 0;
  let currentDepth = 0;
  let relaxationCount = 0;
  let distanceUpdates = 0;
  let heuristicEvals = 0;
  let openSetSize = 0;
  let closedSetSize = 0;

  // Data structure state
  let dataStructure = { type: 'queue', items: [] };

  // Mark start and goal
  cellStates.set(startKey, CellState.START);
  cellStates.set(goalKey, CellState.GOAL);

  // Replay events up to stepIndex
  for (let i = 0; i <= stepIndex && i < events.length; i++) {
    const evt = events[i];
    currentEvent = evt;
    explanation = evt.explanation || null;

    switch (evt.type) {
      case E.ALGORITHM_START:
        if (evt.algorithm === 'DFS') dataStructure = { type: 'stack', items: [] };
        else if (evt.algorithm === 'Dijkstra' || evt.algorithm === 'A-Star') dataStructure = { type: 'priority_queue', items: [] };
        else dataStructure = { type: 'queue', items: [] };
        break;

      case E.NODE_DISCOVERED:
        nodesDiscovered++;
        if (evt.nodeId !== startKey && evt.nodeId !== goalKey) {
          cellStates.set(evt.nodeId, CellState.DISCOVERED);
        }
        treeNodes.set(evt.nodeId, {
          id: evt.nodeId,
          parentId: evt.parentId,
          depth: evt.depth || 0,
          discoveryStep: evt.step,
          expansionStep: null,
          metadata: evt.metadata || {},
        });
        if (evt.parentId === null) treeRoot = evt.nodeId;
        if ((evt.depth || 0) > maxDepth) maxDepth = evt.depth;
        break;

      case E.NODE_CURRENT:
        // Reset previous CURRENT to DISCOVERED or IN_FRONTIER
        if (currentNode && currentNode !== startKey && currentNode !== goalKey) {
          const prevState = cellStates.get(currentNode);
          if (prevState === CellState.CURRENT) {
            cellStates.set(currentNode, CellState.IN_FRONTIER);
          }
        }
        currentNode = evt.nodeId;
        if (evt.nodeId !== startKey && evt.nodeId !== goalKey) {
          cellStates.set(evt.nodeId, CellState.CURRENT);
        }
        currentDepth = evt.metadata?.depth || (treeNodes.get(evt.nodeId)?.depth || 0);
        break;

      case E.NODE_EXPANDED:
        nodesExpanded++;
        if (evt.nodeId !== startKey && evt.nodeId !== goalKey) {
          cellStates.set(evt.nodeId, CellState.EXPANDED);
        }
        if (treeNodes.has(evt.nodeId)) {
          treeNodes.get(evt.nodeId).expansionStep = evt.step;
          if (evt.metadata) Object.assign(treeNodes.get(evt.nodeId).metadata, evt.metadata);
        }
        currentLevel = evt.depth || currentLevel;
        break;

      case E.BACKTRACK:
        backtrackCount++;
        if (evt.nodeId !== startKey && evt.nodeId !== goalKey) {
          cellStates.set(evt.nodeId, CellState.BACKTRACKED);
        }
        break;

      case E.DISTANCE_UPDATE:
        distanceUpdates++;
        relaxationCount++;
        if (treeNodes.has(evt.nodeId) && evt.metadata) {
          Object.assign(treeNodes.get(evt.nodeId).metadata, evt.metadata);
        }
        break;

      case E.PREDECESSOR_CHANGE:
        if (treeNodes.has(evt.nodeId)) {
          treeNodes.get(evt.nodeId).parentId = evt.newParent;
        }
        break;

      case E.HEURISTIC_EVALUATED:
        heuristicEvals++;
        break;

      // Data structure operations
      case E.ENQUEUE:
      case E.PUSH:
      case E.PRIORITY_ENQUEUE:
        if (evt.dataStructure) {
          dataStructure.items = evt.dataStructure;
        }
        frontierSize = dataStructure.items.length;
        if (frontierSize > maxFrontierSize) maxFrontierSize = frontierSize;
        openSetSize = frontierSize;
        break;

      case E.DEQUEUE:
      case E.POP:
      case E.PRIORITY_DEQUEUE:
        if (evt.dataStructure) {
          dataStructure.items = evt.dataStructure;
        }
        frontierSize = dataStructure.items.length;
        closedSetSize = nodesExpanded;
        break;

      case E.PATH_TRACED:
        path = evt.path;
        pathCost = evt.pathCost;
        pathFound = true;
        // Mark path cells
        for (const nodeId of evt.path) {
          if (nodeId !== startKey && nodeId !== goalKey) {
            cellStates.set(nodeId, CellState.FINAL_PATH);
          }
        }
        break;

      case E.NO_PATH:
        pathFound = false;
        break;

      case E.ALGORITHM_COMPLETE:
        pathFound = evt.pathFound;
        if (evt.path) path = evt.path;
        if (evt.pathCost !== undefined) pathCost = evt.pathCost;
        break;
    }
  }

  return {
    cellStates,
    currentNode,
    treeNodes,
    treeRoot,
    dataStructure,
    metrics: {
      nodesDiscovered, nodesExpanded, frontierSize, maxFrontierSize,
      currentLevel, backtrackCount, maxDepth, currentDepth,
      relaxationCount, distanceUpdates, heuristicEvals,
      openSetSize, closedSetSize,
    },
    path,
    pathCost,
    pathFound,
    currentEvent,
    explanation,
  };
}


export class SimulationEngine {
  constructor() {
    this.status = SimStatus.IDLE;
    this.algorithm = null;
    this.events = [];
    this.currentStep = -1;
    this.speed = 10;              // Events per animation frame group
    this.subscribers = new Set();
    this._animFrameId = null;
    this._snapshot = null;
    this._startKey = null;
    this._goalKey = null;
    this._grid = null;
    this._lastFrameTime = 0;
    this.computationTime = 0;
  }

  /**
   * Load an algorithm: pre-compute ALL events from the generator
   */
  load(algorithmName, grid, start, goal, options = {}) {
    this.destroy();

    this.algorithm = algorithmName;
    this._grid = grid;
    this._startKey = E.nodeKey(start.row, start.col);
    this._goalKey = E.nodeKey(goal.row, goal.col);

    const algDef = ALGORITHMS[algorithmName];
    if (!algDef) throw new Error(`Unknown algorithm: ${algorithmName}`);

    // Run generator to completion, collecting all events
    const t0 = performance.now();
    const gen = algDef.generator(grid, start, goal, options);
    this.events = [];
    let result = gen.next();
    while (!result.done) {
      this.events.push(result.value);
      result = gen.next();
    }
    const t1 = performance.now();
    this.computationTime = t1 - t0;

    this.currentStep = -1;
    this.status = SimStatus.PAUSED;
    this._snapshot = null;
    this._notify();
  }

  /** Start or resume animated playback */
  play() {
    if (this.events.length === 0) return;
    if (this.currentStep >= this.events.length - 1) return; // Already complete

    this.status = SimStatus.RUNNING;
    this._lastFrameTime = performance.now();
    this._notify();
    this._scheduleFrame();
  }

  /** Pause playback */
  pause() {
    if (this.status !== SimStatus.RUNNING) return;
    this.status = SimStatus.PAUSED;
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    this._notify();
  }

  /** Execute exactly one event forward */
  step() {
    if (this.currentStep >= this.events.length - 1) return;
    if (this.status === SimStatus.RUNNING) this.pause();

    this.currentStep++;
    this.status = this.currentStep >= this.events.length - 1 ? SimStatus.COMPLETE : SimStatus.PAUSED;
    this._snapshot = null;
    this._notify();
  }

  /** Go back one event */
  stepBack() {
    if (this.currentStep <= -1) return;
    if (this.status === SimStatus.RUNNING) this.pause();

    this.currentStep--;
    this.status = SimStatus.PAUSED;
    this._snapshot = null;
    this._notify();
  }

  /** Jump to a specific step index */
  seekTo(stepIndex) {
    if (this.status === SimStatus.RUNNING) this.pause();

    this.currentStep = Math.max(-1, Math.min(stepIndex, this.events.length - 1));
    this.status = this.currentStep >= this.events.length - 1 ? SimStatus.COMPLETE : SimStatus.PAUSED;
    this._snapshot = null;
    this._notify();
  }

  /** Reset to initial state (before first event) */
  reset() {
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    this.currentStep = -1;
    this.status = this.events.length > 0 ? SimStatus.PAUSED : SimStatus.IDLE;
    this._snapshot = null;
    this._notify();
  }

  /** Set playback speed (1-100) */
  setSpeed(speed) {
    this.speed = Math.max(1, Math.min(100, speed));
  }

  /** Get current visualization snapshot */
  getSnapshot() {
    if (this.events.length === 0) {
      return {
        status: this.status,
        algorithm: this.algorithm,
        currentStep: this.currentStep,
        totalSteps: 0,
        speed: this.speed,
        cellStates: new Map(),
        currentNode: null,
        treeNodes: new Map(),
        treeRoot: null,
        dataStructure: { type: 'queue', items: [] },
        metrics: {
          nodesDiscovered: 0, nodesExpanded: 0, frontierSize: 0, maxFrontierSize: 0,
          currentLevel: 0, backtrackCount: 0, maxDepth: 0, currentDepth: 0,
          relaxationCount: 0, distanceUpdates: 0, heuristicEvals: 0,
          openSetSize: 0, closedSetSize: 0,
        },
        path: null, pathCost: 0, pathFound: null,
        currentEvent: null, events: this.events, explanation: null,
        computationTime: 0,
      };
    }

    // Cache snapshot if step hasn't changed
    if (!this._snapshot) {
      const built = this.currentStep >= 0
        ? buildSnapshot(this.events, this.currentStep, this._startKey, this._goalKey)
        : {
            cellStates: new Map([[this._startKey, CellState.START], [this._goalKey, CellState.GOAL]]),
            currentNode: null, treeNodes: new Map(), treeRoot: null,
            dataStructure: { type: 'queue', items: [] },
            metrics: {
              nodesDiscovered: 0, nodesExpanded: 0, frontierSize: 0, maxFrontierSize: 0,
              currentLevel: 0, backtrackCount: 0, maxDepth: 0, currentDepth: 0,
              relaxationCount: 0, distanceUpdates: 0, heuristicEvals: 0,
              openSetSize: 0, closedSetSize: 0,
            },
            path: null, pathCost: 0, pathFound: null,
            currentEvent: null, explanation: null,
          };

      this._snapshot = {
        ...built,
        status: this.status,
        algorithm: this.algorithm,
        currentStep: this.currentStep,
        totalSteps: this.events.length,
        speed: this.speed,
        events: this.events,
        computationTime: this.computationTime,
      };
    }
    return this._snapshot;
  }

  /** Subscribe to state changes */
  subscribe(callback) {
    this.subscribers.add(callback);
  }

  /** Unsubscribe from state changes */
  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  /** Cleanup */
  destroy() {
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    this.events = [];
    this.currentStep = -1;
    this.status = SimStatus.IDLE;
    this.algorithm = null;
    this._snapshot = null;
    this.computationTime = 0;
  }

  // ── Internal ────────────────────────────────────────────────

  _notify() {
    this._snapshot = null; // Invalidate cache
    const snapshot = this.getSnapshot();
    for (const cb of this.subscribers) {
      try { cb(snapshot); } catch (e) { console.error('Subscriber error:', e); }
    }
  }

  _scheduleFrame() {
    this._animFrameId = requestAnimationFrame((now) => this._tick(now));
  }

  _tick(now) {
    if (this.status !== SimStatus.RUNNING) return;

    // Speed: 1 = ~2 events/sec, 50 = ~100 events/sec, 100 = instant
    const eventsPerSecond = this.speed <= 50
      ? 2 + (this.speed - 1) * 4    // 2 to 198
      : 200 + (this.speed - 50) * 40; // 200 to 2200

    const elapsed = (now - this._lastFrameTime) / 1000;
    const eventsThisFrame = Math.max(1, Math.floor(eventsPerSecond * elapsed));
    this._lastFrameTime = now;

    // Advance by eventsThisFrame, skipping non-visual events for speed
    let advanced = 0;
    while (advanced < eventsThisFrame && this.currentStep < this.events.length - 1) {
      this.currentStep++;
      advanced++;

      // At high speeds, skip data-structure-only events
      if (this.speed > 70) {
        const evt = this.events[this.currentStep];
        if (evt && (evt.type === E.ENQUEUE || evt.type === E.PUSH ||
                    evt.type === E.PRIORITY_ENQUEUE || evt.type === E.HEURISTIC_EVALUATED)) {
          continue; // Don't count these as visual steps
        }
      }
    }

    // Check completion
    if (this.currentStep >= this.events.length - 1) {
      this.status = SimStatus.COMPLETE;
      this._animFrameId = null;
      this._notify();
      return;
    }

    this._notify();
    this._scheduleFrame();
  }
}
