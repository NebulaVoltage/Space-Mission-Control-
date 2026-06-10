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
      color: 'text-neon-cyan border-neon-cyan/20 bg-neon-cyan/5',
      desc: 'Total grid cells queued or touched.',
    },
    {
      label: 'NODES EXPANDED',
      value: metrics.nodesExpanded || 0,
      icon: CheckCircle,
      color: 'text-neon-green border-neon-green/20 bg-neon-green/5',
      desc: 'Total cells whose neighbors were evaluated.',
    },
    {
      label: 'FRONTIER SIZE',
      value: metrics.frontierSize || 0,
      icon: Layers,
      color: 'text-neon-purple border-neon-purple/20 bg-neon-purple/5',
      desc: 'Active search cells in structure queue/stack.',
    },
    {
      label: 'PATH TRAVEL COST',
      value: pathFound ? `${metrics.pathCost || 0} units` : '—',
      icon: Route,
      color: 'text-neon-amber border-neon-amber/20 bg-neon-amber/5',
      desc: 'Total cumulative path edge transit weight.',
    },
    {
      label: 'COMPUTATION TIME',
      value: displayCompTime,
      icon: Clock,
      color: 'text-white border-cyber-gray-light bg-cyber-black/35',
      desc: 'Exact CPU execution time of the pathfinding algorithm.',
    },
    {
      label: 'TRANSMISSION SPEED',
      value: `${snapshot.speed || 0} Hz`,
      icon: Settings,
      color: 'text-neon-cyan border-neon-cyan/20 bg-cyber-black/35',
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
            color: 'text-neon-cyan border-neon-cyan/20 bg-cyber-black/40',
            desc: 'The current radial hop distance from start.',
          },
          {
            label: 'MAX FRONTIER',
            value: metrics.maxFrontierSize || 0,
            icon: HardDrive,
            color: 'text-slate-400 border-cyber-gray-light bg-cyber-black/40',
            desc: 'Peak size of FIFO queue.',
          },
        ];
      case AlgorithmName.DFS:
        return [
          {
            label: 'CURRENT DEPTH',
            value: metrics.currentDepth || 0,
            icon: TrendingUp,
            color: 'text-neon-purple border-neon-purple/20 bg-cyber-black/40',
            desc: 'The current active branch height.',
          },
          {
            label: 'BACKTRACK COUNT',
            value: metrics.backtrackCount || 0,
            icon: GitPullRequest,
            color: 'text-neon-red border-neon-red/20 bg-cyber-black/40',
            desc: 'Number of times tree traversal stepped back.',
          },
        ];
      case AlgorithmName.DIJKSTRA:
        return [
          {
            label: 'RELAXATION COUNTS',
            value: metrics.relaxationCount || 0,
            icon: Settings,
            color: 'text-neon-amber border-neon-amber/20 bg-cyber-black/40',
            desc: 'Total neighbor shortest-path revisions.',
          },
          {
            label: 'DISTANCE UPDATES',
            value: metrics.distanceUpdates || 0,
            icon: TrendingUp,
            color: 'text-slate-400 border-cyber-gray-light bg-cyber-black/40',
            desc: 'Number of edge weight updates in table.',
          },
        ];
      case AlgorithmName.ASTAR:
        return [
          {
            label: 'HEURISTIC EVALS',
            value: metrics.heuristicEvals || 0,
            icon: HelpCircle,
            color: 'text-neon-green border-neon-green/20 bg-cyber-black/40',
            desc: 'Estimations calculated using Manhattan grid space.',
          },
          {
            label: 'OPEN SET SIZE',
            value: metrics.openSetSize || 0,
            icon: Layers,
            color: 'text-neon-cyan border-neon-cyan/20 bg-cyber-black/40',
            desc: 'Priority queue open list size.',
          },
        ];
      default:
        return [];
    }
  };

  const algoMetrics = getAlgoMetrics();

  return (
    <div className="bg-cyber-gray-dark border border-cyber-gray-light p-4 flex flex-col gap-4 shadow-xl select-none w-full">
      <div className="flex items-center justify-between border-b border-cyber-gray-light pb-2">
        <h3 className="font-cyber-header text-xs font-bold text-slate-200 tracking-wider">
          LIVE TELEMETRY MONITOR
        </h3>
        <span className="font-cyber-mono text-[9px] text-neon-cyan uppercase">
          {algorithm} STATS
        </span>
      </div>

      {/* Completion Alerts */}
      {isComplete && pathFound && (
        <div className="flex items-start gap-2 bg-neon-green/10 border border-neon-green/35 text-neon-green p-3 rounded text-xs leading-normal font-cyber-mono font-medium">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-glow-green">ROUTING SUCCESSFUL</span>
            Optimal path established to target probe receiver. Signal locked.
          </div>
        </div>
      )}

      {isComplete && !pathFound && (
        <div className="flex items-start gap-2 bg-neon-red/10 border border-neon-red/35 text-neon-red p-3 rounded text-xs leading-normal font-cyber-mono font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-glow-red">TRANSMISSION FAILURE</span>
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
              className={`p-3 border rounded flex flex-col justify-center relative overflow-hidden ${m.color}`}
            >
              <div className="text-[8px] font-cyber-header tracking-wider text-slate-500 mb-1 leading-none">
                {m.label}
              </div>
              <div className="text-base font-black font-cyber-mono text-white leading-none">
                {m.value}
              </div>
              <div className="absolute right-2 bottom-2 opacity-15 pointer-events-none">
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid of algorithm-specific metrics */}
      {algoMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2 border-t border-cyber-gray-light/40 pt-3">
          {algoMetrics.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                title={m.desc}
                className={`p-2.5 border rounded flex justify-between items-center relative overflow-hidden ${m.color}`}
              >
                <div className="flex flex-col">
                  <span className="text-[8px] font-cyber-header tracking-wider text-slate-500 mb-0.5 leading-none">
                    {m.label}
                  </span>
                  <span className="text-sm font-bold font-cyber-mono text-white leading-none">
                    {m.value}
                  </span>
                </div>
                <Icon className="w-4 h-4 text-slate-500 opacity-40 shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
