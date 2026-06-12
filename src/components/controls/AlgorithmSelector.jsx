import { AlgorithmName } from '../../engine/eventTypes.js';

const ALGORITHMS = [
  {
    id: AlgorithmName.BFS,
    label: 'BFS',
    full: 'Breadth-First',
    theme: 'THE EXPLORER',
    structure: 'Queue (FIFO)',
    complexity: 'O(V + E)',
    guarantee: 'Shortest Hops',
    accent: '#3ABEFF',
    accentDim: 'rgba(58,190,255,0.07)',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" style={{ width: 20, height: 20 }}>
        <circle cx="16" cy="16" r="2.5" fill="#3ABEFF" />
        <circle cx="16" cy="16" r="7"   stroke="rgba(58,190,255,0.6)" strokeWidth="1" />
        <circle cx="16" cy="16" r="12"  stroke="rgba(58,190,255,0.25)" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="16" cy="16" r="14.5" stroke="rgba(58,190,255,0.10)" strokeWidth="0.5" />
      </svg>
    ),
  },
  {
    id: AlgorithmName.DFS,
    label: 'DFS',
    full: 'Depth-First',
    theme: 'THE DISCOVERER',
    structure: 'Stack (LIFO)',
    complexity: 'O(V + E)',
    guarantee: 'Complete Path',
    accent: '#6D5DFF',
    accentDim: 'rgba(109,93,255,0.07)',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" style={{ width: 20, height: 20 }}>
        <line x1="16" y1="3" x2="16" y2="29" stroke="rgba(109,93,255,0.2)" strokeWidth="0.5" strokeDasharray="2 3" />
        <circle cx="16" cy="5"  r="2.5" fill="rgba(109,93,255,0.95)" />
        <circle cx="16" cy="12" r="2"   fill="rgba(109,93,255,0.75)" />
        <circle cx="16" cy="19" r="1.5" fill="rgba(109,93,255,0.50)" />
        <circle cx="16" cy="26" r="1"   fill="rgba(109,93,255,0.28)" />
        <line x1="16" y1="7"  x2="9"  y2="11" stroke="rgba(109,93,255,0.35)" strokeWidth="0.75" />
        <line x1="16" y1="14" x2="9"  y2="18" stroke="rgba(109,93,255,0.25)" strokeWidth="0.6" />
        <line x1="16" y1="14" x2="23" y2="18" stroke="rgba(109,93,255,0.18)" strokeWidth="0.5" />
      </svg>
    ),
  },
  {
    id: AlgorithmName.DIJKSTRA,
    label: 'Dijkstra',
    full: "Dijkstra's",
    theme: 'THE OPTIMIZER',
    structure: 'Min-Heap (PQ)',
    complexity: 'O((V+E) log V)',
    guarantee: 'Optimal Cost',
    accent: '#00D1B2',
    accentDim: 'rgba(0,209,178,0.07)',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" style={{ width: 20, height: 20 }}>
        <circle cx="16" cy="16" r="3"  fill="rgba(0,209,178,0.85)" />
        <circle cx="8"  cy="10" r="2"  fill="rgba(0,209,178,0.6)" />
        <circle cx="24" cy="10" r="2"  fill="rgba(0,209,178,0.4)" />
        <circle cx="8"  cy="24" r="2"  fill="rgba(0,209,178,0.6)" />
        <circle cx="24" cy="24" r="2"  fill="rgba(0,209,178,0.35)" />
        <circle cx="16" cy="4"  r="2.5" fill="#00D1B2" />
        <line x1="16" y1="16" x2="8"  y2="10" stroke="rgba(0,209,178,0.35)" strokeWidth="0.75" />
        <line x1="16" y1="16" x2="24" y2="10" stroke="rgba(0,209,178,0.22)" strokeWidth="0.75" />
        <line x1="16" y1="16" x2="8"  y2="24" stroke="rgba(0,209,178,0.35)" strokeWidth="0.75" />
        <line x1="16" y1="16" x2="24" y2="24" stroke="rgba(0,209,178,0.22)" strokeWidth="0.75" />
        {/* Highlighted optimal path */}
        <line x1="16" y1="4"  x2="8"  y2="10" stroke="rgba(0,209,178,0.6)" strokeWidth="1.2" />
        <line x1="8"  y1="10" x2="8"  y2="24" stroke="rgba(0,209,178,0.55)" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: AlgorithmName.ASTAR,
    label: 'A*',
    full: 'A-Star',
    theme: 'THE NAVIGATOR',
    structure: 'Min-Heap (f=g+h)',
    complexity: 'O(E log V)',
    guarantee: 'Optimal + Fast',
    accent: '#3ABEFF',
    accentDim: 'rgba(58,190,255,0.07)',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" style={{ width: 20, height: 20 }}>
        <circle cx="16" cy="16" r="8"  stroke="rgba(109,93,255,0.2)" strokeWidth="0.75" />
        <circle cx="16" cy="16" r="13" stroke="rgba(58,190,255,0.1)" strokeWidth="0.5" strokeDasharray="2 4" />
        {/* North pointer — optimal direction */}
        <path d="M 16 4 L 18.5 12 L 16 14 L 13.5 12 Z" fill="#3ABEFF" />
        {/* Other pointers */}
        <path d="M 28 16 L 20 13.5 L 18 16 L 20 18.5 Z" fill="rgba(248,250,252,0.18)" />
        <path d="M 16 28 L 13.5 20 L 16 18 L 18.5 20 Z" fill="rgba(248,250,252,0.18)" />
        <path d="M 4  16 L 12 18.5 L 14 16 L 12 13.5 Z" fill="rgba(248,250,252,0.18)" />
        {/* Center */}
        <circle cx="16" cy="16" r="2.5" fill="none" stroke="#00D1B2" strokeWidth="1" />
        <circle cx="16" cy="16" r="1"   fill="#00D1B2" />
      </svg>
    ),
  },
  {
    id: AlgorithmName.GBFS,
    label: 'GBFS',
    full: 'Greedy Best-First',
    theme: 'THE SPRINTER',
    structure: 'Min-Heap (h)',
    complexity: 'O(E log V)',
    guarantee: 'Fastest Path',
    accent: '#FF007F',
    accentDim: 'rgba(255,0,127,0.07)',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" style={{ width: 20, height: 20 }}>
        <path d="M 4 16 Q 16 4 28 16" stroke="#FF007F" strokeWidth="1.5" fill="none" />
        <circle cx="28" cy="16" r="3" fill="#FF007F" />
        <circle cx="4" cy="16" r="2" fill="rgba(255,0,127,0.5)" />
      </svg>
    ),
  },
];

export default function AlgorithmSelector({ selectedAlgorithm, onSelect, disabled }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
      {ALGORITHMS.map((algo) => {
        const active = selectedAlgorithm === algo.id;
        return (
          <button
            key={algo.id}
            onClick={() => !disabled && onSelect(algo.id)}
            disabled={disabled}
            style={{
              background: active ? algo.accentDim : '#0D1321',
              border: `1px solid ${active ? algo.accent : '#1E2D45'}`,
              borderRadius: 2, padding: '12px 14px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled && !active ? 0.45 : 1,
              textAlign: 'left', position: 'relative',
              transition: 'border-color 0.15s, background 0.15s',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}
            onMouseEnter={e => { if (!disabled && !active) { e.currentTarget.style.borderColor = algo.accent; e.currentTarget.style.background = algo.accentDim; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#1E2D45'; e.currentTarget.style.background = '#0D1321'; } }}
          >
            {/* Active top accent line */}
            {active && (
              <div style={{
                position: 'absolute', top: -1, left: -1, right: -1, height: 2,
                background: algo.accent,
              }} />
            )}

            {/* Icon + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {algo.icon}
              <div>
                <div style={{
                  fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                  fontSize: '1rem', letterSpacing: '-0.02em',
                  color: active ? algo.accent : '#F8FAFC',
                  lineHeight: 1, marginBottom: 2, transition: 'color 0.12s',
                }}>
                  {algo.label}
                </div>
                <div style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: '0.45rem',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: active ? algo.accent : '#44556B', transition: 'color 0.12s',
                }}>
                  {algo.full}
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#44556B',
              }}>
                {algo.structure}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[algo.complexity, algo.guarantee].map(tag => (
                  <span key={tag} style={{
                    padding: '2px 5px',
                    background: active ? `${algo.accent}14` : '#111929',
                    border: `1px solid ${active ? `${algo.accent}35` : '#1E2D45'}`,
                    fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem',
                    letterSpacing: '0.05em',
                    color: active ? algo.accent : '#44556B',
                    whiteSpace: 'nowrap',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
