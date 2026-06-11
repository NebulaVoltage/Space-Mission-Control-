import { AlgorithmName } from '../../engine/eventTypes.js';

export default function AlgorithmSelector({
  selectedAlgorithm,
  onSelect,
  disabled = false,
}) {
  const options = [
    {
      id: AlgorithmName.BFS,
      shortName: 'BFS',
      fullName: 'Breadth-First Search',
      badge: 'ISOTROPIC WAVEFRONT',
      renderGraphic: (colorClass) => (
        <svg className={`w-full h-20 ${colorClass}`} viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Expanding isotropic wave rings */}
          <ellipse cx="50" cy="30" rx="42" ry="15" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.3" />
          <ellipse cx="50" cy="30" rx="30" ry="11" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
          <ellipse cx="50" cy="30" rx="18" ry="7" stroke="currentColor" strokeWidth="1.2" opacity="0.9" />
          {/* Planet center body */}
          <circle cx="50" cy="30" r="9" fill="#080C14" stroke="currentColor" strokeWidth="1.5" />
          <path d="M 36 30 A 14 5 0 0 0 64 30" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ),
    },
    {
      id: AlgorithmName.DFS,
      shortName: 'DFS',
      fullName: 'Depth-First Search',
      badge: 'RECURSIVE VECTOR',
      renderGraphic: (colorClass) => (
        <svg className={`w-full h-20 ${colorClass}`} viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cave network layout */}
          <path d="M 12 30 H 26 L 42 12 H 58 L 74 38 H 88" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 3" opacity="0.3" />
          <path d="M 26 30 L 38 46 H 58 L 70 30" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 3" opacity="0.3" />
          {/* Recursive branch line */}
          <path d="M 12 30 H 26 L 42 12 H 58 L 74 38 H 88" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="30" r="2.5" fill="currentColor" />
          <circle cx="26" cy="30" r="2" fill="currentColor" />
          <circle cx="42" cy="12" r="2" fill="currentColor" />
          <circle cx="58" cy="12" r="2" fill="currentColor" />
          <circle cx="74" cy="38" r="2" fill="currentColor" />
          <circle cx="88" cy="38" r="3.5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1" />
        </svg>
      ),
    },
    {
      id: AlgorithmName.DIJKSTRA,
      shortName: 'DIJKSTRA',
      fullName: "Dijkstra's Algorithm",
      badge: 'COST-MINIMIZATION MESH',
      renderGraphic: (colorClass) => (
        <svg className={`w-full h-20 ${colorClass}`} viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Crystalline network mesh */}
          <line x1="15" y1="30" x2="45" y2="12" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <line x1="15" y1="30" x2="35" y2="48" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <line x1="45" y1="12" x2="75" y2="30" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <line x1="35" y1="48" x2="65" y2="48" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <line x1="45" y1="12" x2="35" y2="48" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <line x1="75" y1="30" x2="65" y2="48" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          {/* Selected cost path */}
          <path d="M 15 30 L 45 12 L 75 30" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          {/* Diamond crystal nodes */}
          <polygon points="15,26 19,30 15,34 11,30" fill="#080C14" stroke="currentColor" strokeWidth="1.2" />
          <polygon points="45,8 49,12 45,16 41,12" fill="currentColor" stroke="currentColor" strokeWidth="1.2" />
          <polygon points="35,44 39,48 35,52 31,48" fill="#080C14" stroke="currentColor" strokeWidth="1.2" />
          <polygon points="65,44 69,48 65,52 61,48" fill="#080C14" stroke="currentColor" strokeWidth="1.2" />
          <polygon points="75,26 79,30 75,34 71,30" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ),
    },
    {
      id: AlgorithmName.ASTAR,
      shortName: 'A-STAR',
      fullName: 'A-Star Search',
      badge: 'HEURISTIC VECTOR NAV',
      renderGraphic: (colorClass) => (
        <svg className={`w-full h-20 ${colorClass}`} viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Bounding tactical dashboard grid */}
          <rect x="25" y="10" width="50" height="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 3" opacity="0.3" />
          {/* Target lock crosshairs */}
          <line x1="78" y1="30" x2="66" y2="30" stroke="currentColor" strokeWidth="0.75" />
          <line x1="72" y1="24" x2="72" y2="36" stroke="currentColor" strokeWidth="0.75" />
          <circle cx="72" cy="30" r="4.5" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1 1" />
          {/* Direct Heuristic path line */}
          <line x1="22" y1="30" x2="72" y2="30" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.5" />
          {/* Tactical delta arrow heading */}
          <g transform="translate(38, 30)">
            <path d="M 9 0 L -6 -7 L -3 0 L -6 7 Z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
          </g>
          <circle cx="72" cy="30" r="2" fill="#FFFFFF" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none w-full">
      {options.map((opt) => {
        const isSelected = selectedAlgorithm === opt.id;
        const colorClass = isSelected ? 'text-electric-cyan' : 'text-muted';

        return (
          <button
            key={opt.id}
            disabled={disabled}
            onClick={() => onSelect(opt.id)}
            className={`control-module flex flex-col items-center justify-between p-4 rounded border text-center transition-all cursor-pointer ${
              disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:border-electric-cyan hover:scale-[1.01]'
            } ${
              isSelected
                ? 'border-electric-cyan bg-cyber-gray-dark shadow-[0_0_12px_rgba(58,190,255,0.15)]'
                : 'border-cyber-gray-light bg-cyber-gray-dark/50'
            }`}
          >
            {/* HUD Corner Brackets */}
            {isSelected && (
              <>
                <div className="hud-bracket-tl" />
                <div className="hud-bracket-tr" />
                <div className="hud-bracket-bl" />
                <div className="hud-bracket-br" />
              </>
            )}

            {/* Visual identity graphic */}
            <div className="w-full mb-3 flex items-center justify-center">
              {opt.renderGraphic(colorClass)}
            </div>

            {/* Subsystem labels */}
            <div className="w-full border-t border-cyber-gray-light/35 pt-2 flex flex-col gap-0.5">
              <span className="font-cyber-header font-black text-sm tracking-widest text-white">
                {opt.shortName}
              </span>
              <span className="font-cyber-mono text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                {opt.badge}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
