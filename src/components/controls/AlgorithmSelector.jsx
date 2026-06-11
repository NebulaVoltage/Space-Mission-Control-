import { Layers, GitBranch, Route, Compass } from 'lucide-react';
import { AlgorithmName } from '../../engine/eventTypes.js';

export default function AlgorithmSelector({
  selectedAlgorithm,
  onSelect,
  disabled = false,
}) {
  const cards = [
    {
      id: AlgorithmName.BFS,
      shortName: 'BFS',
      fullName: 'Breadth-First Search',
      badges: ['Optimal', 'Unweighted'],
      icon: Layers,
      color: 'text-primary-purple',
      description: 'Explores isotropic level rings out from the start transmitter.',
    },
    {
      id: AlgorithmName.DFS,
      shortName: 'DFS',
      fullName: 'Depth-First Search',
      badges: ['Fast', 'Unweighted'],
      icon: GitBranch,
      color: 'text-accent-violet',
      description: 'Probes single vector lines recursively before backtracking.',
    },
    {
      id: AlgorithmName.DIJKSTRA,
      shortName: 'Dijkstra',
      fullName: "Dijkstra's Algorithm",
      badges: ['Optimal', 'Weighted'],
      icon: Route,
      color: 'text-secondary-purple',
      description: 'Finds shortest paths by minimizing cumulative cost.',
    },
    {
      id: AlgorithmName.ASTAR,
      shortName: 'A*',
      fullName: 'A-Star Search',
      badges: ['Optimal', 'Heuristics', 'Weighted'],
      icon: Compass,
      color: 'text-accent-violet',
      description: 'Uses distance weights + directional Manhattan heuristics.',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 select-none w-full">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedAlgorithm === card.id;

        return (
          <button
            key={card.id}
            disabled={disabled}
            onClick={() => onSelect(card.id)}
            className={`flex flex-col text-left p-3.5 border rounded-lg transition-all relative overflow-hidden group ${
              disabled 
                ? 'opacity-40 cursor-not-allowed' 
                : 'cursor-pointer hover:border-slate-500 bg-cyber-gray-dark'
            } ${
              isSelected
                ? 'border-primary-purple bg-primary-purple/5 shadow-[0_0_15px_rgba(139,92,246,0.12)]'
                : 'border-cyber-gray-light'
            } glass-card`}
          >
            {/* Background design elements */}
            <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Icon className="w-16 h-16" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-1.5 w-full">
              <span className="font-cyber-header font-black text-lg text-white leading-none tracking-wide">
                {card.shortName}
              </span>
              <Icon className={`w-4 h-4 ${isSelected ? 'text-primary-purple' : 'text-slate-500'}`} />
            </div>

            {/* Full Name */}
            <span className="font-cyber-header text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 leading-tight">
              {card.fullName}
            </span>

            {/* Description */}
            <p className="text-[10px] text-slate-400 leading-normal mb-3 flex-grow font-cyber-mono font-medium">
              {card.description}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-1 mt-auto">
              {card.badges.map((badge, idx) => (
                <span
                  key={idx}
                  className={`text-[8px] font-cyber-header font-bold px-1.5 py-0.5 rounded tracking-wide ${
                    isSelected
                      ? 'bg-primary-purple/15 text-primary-purple border border-primary-purple/30'
                      : 'bg-cyber-black text-slate-500 border border-cyber-gray-light'
                  }`}
                >
                  {badge.toUpperCase()}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
