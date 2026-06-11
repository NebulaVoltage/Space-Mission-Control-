import { Search, CheckCircle, Layers, Route, AlertCircle, TrendingUp, GitPullRequest, Settings, HelpCircle, HardDrive, Clock } from 'lucide-react';
import { AlgorithmName, SimStatus } from '../../engine/eventTypes.js';

export default function AlgorithmInspector({ snapshot }) {
  if (!snapshot) return null;

  const {
    algorithm,
    metrics = {},
    status = SimStatus.IDLE,
    pathFound,
    computationTime = 0,
  } = snapshot;

  const isComplete = status === SimStatus.COMPLETE;

  // Format computation execution time
  const displayCompTime = computationTime === 0
    ? '0.00 ms'
    : computationTime < 0.01
    ? '< 0.01 ms'
    : `${computationTime.toFixed(3)} ms`;

  // Build standard metrics list
  const commonMetrics = [
    {
      label: 'NODES DISCOVERED',
      value: metrics.nodesDiscovered || 0,
      icon: Search,
      desc: 'Total grid cells queued or touched.',
    },
    {
      label: 'NODES EXPANDED',
      value: metrics.nodesExpanded || 0,
      icon: CheckCircle,
      desc: 'Total cells whose neighbors were evaluated.',
    },
    {
      label: 'FRONTIER SIZE',
      value: metrics.frontierSize || 0,
      icon: Layers,
      desc: 'Active search cells in structure queue/stack.',
    },
    {
      label: 'PATH TRAVEL COST',
      value: pathFound ? `${metrics.pathCost || 0} units` : '—',
      icon: Route,
      desc: 'Total cumulative path edge transit weight.',
    },
    {
      label: 'COMPUTATION TIME',
      value: displayCompTime,
      icon: Clock,
      desc: 'Exact CPU execution time of the pathfinding algorithm.',
    },
    {
      label: 'RESOLVING SPEED',
      value: `${snapshot.speed || 0} Hz`,
      icon: Settings,
      desc: 'Current simulation step processing frequency.',
    },
  ];

  // Build algorithm-specific metrics
  const getAlgoMetrics = () => {
    switch (algorithm) {
      case AlgorithmName.BFS:
        return [
          {
            label: 'CURRENT LEVEL',
            value: metrics.currentLevel || 0,
            icon: TrendingUp,
            desc: 'The current radial hop distance from start.',
          },
          {
            label: 'MAX FRONTIER',
            value: metrics.maxFrontierSize || 0,
            icon: HardDrive,
            desc: 'Peak size of FIFO queue.',
          },
        ];
      case AlgorithmName.DFS:
        return [
          {
            label: 'CURRENT DEPTH',
            value: metrics.currentDepth || 0,
            icon: TrendingUp,
            desc: 'The current active branch height.',
          },
          {
            label: 'BACKTRACK COUNT',
            value: metrics.backtrackCount || 0,
            icon: GitPullRequest,
            desc: 'Number of times tree traversal stepped back.',
          },
        ];
      case AlgorithmName.DIJKSTRA:
        return [
          {
            label: 'RELAXATION COUNTS',
            value: metrics.relaxationCount || 0,
            icon: Settings,
            desc: 'Total neighbor shortest-path revisions.',
          },
          {
            label: 'DISTANCE UPDATES',
            value: metrics.distanceUpdates || 0,
            icon: TrendingUp,
            desc: 'Number of edge weight updates in table.',
          },
        ];
      case AlgorithmName.ASTAR:
        return [
          {
            label: 'HEURISTIC EVALS',
            value: metrics.heuristicEvals || 0,
            icon: HelpCircle,
            desc: 'Estimations calculated using Manhattan grid space.',
          },
          {
            label: 'OPEN SET SIZE',
            value: metrics.openSetSize || 0,
            icon: Layers,
            desc: 'Priority queue open list size.',
          },
        ];
      default:
        return [];
    }
  };

  const algoMetrics = getAlgoMetrics();

  return (
    <div className="control-module w-full flex flex-col gap-4 select-none">
      {/* HUD Corner Brackets */}
      <div className="hud-bracket-tl" />
      <div className="hud-bracket-tr" />
      <div className="hud-bracket-bl" />
      <div className="hud-bracket-br" />

      <div className="control-module-header">
        <h3 className="font-cyber-header text-[10px] font-bold text-white tracking-widest">
          LIVE TELEMETRY MONITOR
        </h3>
        <span className="font-cyber-mono text-[8.5px] text-electric-cyan font-bold">
          {algorithm} ANALYTICS
        </span>
      </div>

      {/* Completion Alerts */}
      {isComplete && pathFound && (
        <div className="flex items-start gap-3.5 bg-success/10 border border-success/35 text-success p-3 rounded-sm text-xs leading-normal font-cyber-mono">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-sm tracking-wider">ROUTING SUCCESSFUL</span>
            Optimal path established to target probe receiver. Signal locked.
          </div>
        </div>
      )}

      {isComplete && !pathFound && (
        <div className="flex items-start gap-3.5 bg-critical/10 border border-critical/35 text-critical p-3 rounded-sm text-xs leading-normal font-cyber-mono">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-sm tracking-wider">TRANSMISSION FAILURE</span>
            Grid blockades prevent connection. No path exists to receptor.
          </div>
        </div>
      )}

      {/* Grid of common metrics */}
      <div className="grid grid-cols-2 gap-2">
        {commonMetrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              title={m.desc}
              className="p-3 border border-cyber-gray-light bg-cyber-gray-dark/50 rounded flex flex-col justify-center relative overflow-hidden"
            >
              <div className="text-[8px] font-cyber-header tracking-wider text-slate-500 mb-1 leading-none">
                {m.label}
              </div>
              <div className="text-sm font-black font-cyber-mono text-white leading-none">
                {m.value}
              </div>
              <div className="absolute right-2 bottom-2 opacity-5 pointer-events-none">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid of algorithm-specific metrics */}
      {algoMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2 border-t border-cyber-gray-light/30 pt-3">
          {algoMetrics.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                title={m.desc}
                className="p-2.5 border border-cyber-gray-light bg-cyber-black rounded flex justify-between items-center relative overflow-hidden"
              >
                <div className="flex flex-col">
                  <span className="text-[8px] font-cyber-header tracking-wider text-slate-500 mb-0.5 leading-none">
                    {m.label}
                  </span>
                  <span className="text-xs font-bold font-cyber-mono text-white leading-none">
                    {m.value}
                  </span>
                </div>
                <Icon className="w-4 h-4 text-slate-500 opacity-20 shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
