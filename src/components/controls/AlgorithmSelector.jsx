import { AlgorithmName } from '../../engine/eventTypes.js';

/* ────────────────────────────────────────────────────
   ALGORITHM SELECTOR
   Premium horizontal row of algorithm "modules".
   Each has a unique identity: accent color, label, 
   data-structure badge, and complexity notation.
───────────────────────────────────────────────────── */

const ALGORITHMS = [
  {
    id: AlgorithmName.BFS,
    label: 'BFS',
    full: 'Breadth-First',
    theme: 'THE EXPLORER',
    structure: 'Queue (FIFO)',
    complexity: 'O(V + E)',
    guarantee: 'Shortest Hops',
    accent: '#00D1B2',
    accentDim: 'rgba(0,209,178,0.08)',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" style={{ width: 20, height: 20 }}>
        <circle cx="16" cy="16" r="3" fill="#00D1B2" />
        <circle cx="16" cy="16" r="8" stroke="rgba(0,209,178,0.5)" strokeWidth="1" />
        <circle cx="16" cy="16" r="14" stroke="rgba(0,209,178,0.2)" strokeWidth="1" strokeDasharray="2 3" />
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
    accent: '#FF7A00',
    accentDim: 'rgba(255,122,0,0.08)',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" style={{ width: 20, height: 20 }}>
        <line x1="16" y1="4" x2="16" y2="28" stroke="rgba(255,122,0,0.3)" strokeWidth="0.5" strokeDasharray="2 3" />
        <circle cx="16" cy="6" r="2.5" fill="rgba(255,122,0,0.9)" />
        <circle cx="16" cy="14" r="2" fill="rgba(255,122,0,0.7)" />
        <circle cx="16" cy="21" r="1.5" fill="rgba(255,122,0,0.5)" />
        <circle cx="16" cy="27" r="1" fill="rgba(255,122,0,0.3)" />
        <line x1="16" y1="8"  x2="9"  y2="13" stroke="rgba(255,122,0,0.25)" strokeWidth="0.5" />
        <line x1="16" y1="16" x2="9"  y2="21" stroke="rgba(255,122,0,0.2)"  strokeWidth="0.5" />
        <line x1="16" y1="16" x2="23" y2="21" stroke="rgba(255,122,0,0.15)" strokeWidth="0.5" />
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
    accent: '#F5F1E8',
    accentDim: 'rgba(245,241,232,0.05)',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" style={{ width: 20, height: 20 }}>
        <circle cx="16" cy="16" r="3" fill="rgba(245,241,232,0.8)" />
        <circle cx="8"  cy="10" r="2" fill="rgba(245,241,232,0.5)" />
        <circle cx="24" cy="10" r="2" fill="rgba(245,241,232,0.4)" />
        <circle cx="8"  cy="24" r="2" fill="rgba(245,241,232,0.5)" />
        <circle cx="24" cy="24" r="2" fill="rgba(245,241,232,0.3)" />
        <line x1="16" y1="16" x2="8"  y2="10" stroke="rgba(245,241,232,0.3)" strokeWidth="0.75" />
        <line x1="16" y1="16" x2="24" y2="10" stroke="rgba(245,241,232,0.2)" strokeWidth="0.75" />
        <line x1="16" y1="16" x2="8"  y2="24" stroke="rgba(245,241,232,0.3)" strokeWidth="0.75" />
        <line x1="16" y1="16" x2="24" y2="24" stroke="rgba(245,241,232,0.2)" strokeWidth="0.75" />
        <line x1="8"  y1="10" x2="8"  y2="24" stroke="rgba(245,241,232,0.12)" strokeWidth="0.5" />
        <line x1="8"  y1="10" x2="24" y2="10" stroke="rgba(245,241,232,0.12)" strokeWidth="0.5" />
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
    accent: '#FF7A00',
    accentDim: 'rgba(255,122,0,0.08)',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" style={{ width: 20, height: 20 }}>
        <circle cx="16" cy="16" r="7" stroke="rgba(0,209,178,0.25)" strokeWidth="1" />
        <path d="M 16 6 L 18 14 L 16 16 L 14 14 Z" fill="#FF7A00" />
        <path d="M 26 16 L 18 14 L 16 16 L 18 18 Z" fill="rgba(245,241,232,0.2)" />
        <path d="M 16 26 L 14 18 L 16 16 L 18 18 Z" fill="rgba(245,241,232,0.15)" />
        <path d="M 6 16 L 14 18 L 16 16 L 14 14 Z" fill="rgba(245,241,232,0.2)" />
        <circle cx="16" cy="16" r="2" fill="none" stroke="#00D1B2" strokeWidth="1" />
      </svg>
    ),
  },
];

export default function AlgorithmSelector({ selectedAlgorithm, onSelect, disabled }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8,
    }}>
      {ALGORITHMS.map((algo) => {
        const active = selectedAlgorithm === algo.id;
        return (
          <button
            key={algo.id}
            onClick={() => !disabled && onSelect(algo.id)}
            disabled={disabled}
            style={{
              background: active ? algo.accentDim : '#111111',
              border: `1px solid ${active ? algo.accent : '#2E2E2E'}`,
              borderRadius: 2,
              padding: '12px 14px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled && !active ? 0.5 : 1,
              textAlign: 'left',
              position: 'relative',
              transition: 'border-color 0.15s ease, background 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
            onMouseEnter={e => {
              if (!disabled && !active) {
                e.currentTarget.style.borderColor = algo.accent;
                e.currentTarget.style.background = algo.accentDim;
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                e.currentTarget.style.borderColor = '#2E2E2E';
                e.currentTarget.style.background = '#111111';
              }
            }}
          >
            {/* Active top accent line */}
            {active && (
              <div style={{
                position: 'absolute', top: -1, left: -1, right: -1, height: 2,
                background: algo.accent,
              }} />
            )}

            {/* Header row: icon + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {algo.icon}
              <div>
                <div style={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '1rem',
                  letterSpacing: '-0.02em',
                  color: active ? algo.accent : '#F5F1E8',
                  lineHeight: 1,
                  marginBottom: 2,
                  transition: 'color 0.12s',
                }}>
                  {algo.label}
                </div>
                <div style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.5rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: active ? algo.accent : '#5C5650',
                  transition: 'color 0.12s',
                }}>
                  {algo.full}
                </div>
              </div>
            </div>

            {/* Data structure badge */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.5rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#5C5650',
              }}>
                {algo.structure}
              </div>

              {/* Complexity + guarantee */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '2px 6px',
                  background: active ? `${algo.accent}18` : '#1A1A1A',
                  border: `1px solid ${active ? `${algo.accent}40` : '#2E2E2E'}`,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.5rem',
                  letterSpacing: '0.06em',
                  color: active ? algo.accent : '#5C5650',
                  whiteSpace: 'nowrap',
                }}>
                  {algo.complexity}
                </span>
                <span style={{
                  padding: '2px 6px',
                  background: active ? `${algo.accent}10` : '#1A1A1A',
                  border: `1px solid ${active ? `${algo.accent}30` : '#2E2E2E'}`,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.5rem',
                  letterSpacing: '0.06em',
                  color: active ? algo.accent : '#5C5650',
                  whiteSpace: 'nowrap',
                }}>
                  {algo.guarantee}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
