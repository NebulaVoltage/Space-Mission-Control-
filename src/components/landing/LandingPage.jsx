import { AlgorithmName } from '../../engine/eventTypes.js';

/* ────────────────────────────────────────────────────
   HERO GRID ART — Inline SVG pathfinding visualization
───────────────────────────────────────────────────── */
const HeroGridArt = () => {
  const COLS = 14, ROWS = 10, CS = 36;
  const W = COLS * CS, H = ROWS * CS;

  // Route: start(row7,col1) → zig-zag path → goal(row1,col12)
  const path = [
    [7,1],[7,2],[7,3],[7,4],[6,4],[5,4],[4,4],[4,5],[4,6],
    [3,6],[2,6],[2,7],[2,8],[2,9],[2,10],[1,10],[1,11],[1,12]
  ];
  const explored = [
    [7,2],[7,3],[7,4],[6,3],[6,4],[5,4],[5,3],[4,4],[4,5],[4,6],
    [3,5],[3,6],[3,7],[2,6],[2,7],[2,8],[2,9],[2,10],
    [1,9],[1,10],[1,11],[1,12],[6,5],[5,5],[4,3],[3,4]
  ];
  const startCell = [7, 1];
  const goalCell  = [1, 12];

  const cx = (c) => c * CS + CS / 2;
  const cy = (r) => r * CS + CS / 2;

  const pathD = path.map(([r,c],i) =>
    `${i===0?'M':'L'} ${cx(c)} ${cy(r)}`
  ).join(' ');

  const isInPath     = (r,c) => path.some(([pr,pc]) => pr===r && pc===c);
  const isExplored   = (r,c) => explored.some(([er,ec]) => er===r && ec===c);
  const isStart      = (r,c) => r===startCell[0] && c===startCell[1];
  const isGoal       = (r,c) => r===goalCell[0]  && c===goalCell[1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} fill="none" xmlns="http://www.w3.org/2000/svg"
         className="w-full h-full" preserveAspectRatio="xMidYMid meet">

      {/* Explored cells */}
      {explored.map(([r,c]) => (
        <rect key={`e${r}${c}`} x={c*CS+2} y={r*CS+2} width={CS-4} height={CS-4}
          fill="rgba(0,209,178,0.06)" stroke="rgba(0,209,178,0.15)" strokeWidth={0.5} />
      ))}

      {/* Grid dots */}
      {Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>{
        const inPath = isInPath(r,c), inExp = isExplored(r,c);
        const start  = isStart(r,c), goal = isGoal(r,c);
        if (start||goal) return null;
        return (
          <circle key={`d${r}${c}`} cx={cx(c)} cy={cy(r)} r={1.5}
            fill={
              inPath ? 'rgba(255,122,0,0.55)' :
              inExp  ? 'rgba(0,209,178,0.25)' :
                       'rgba(245,241,232,0.08)'
            }
          />
        );
      })).flat()}

      {/* Path line */}
      <path d={pathD} stroke="rgba(255,122,0,0.6)" strokeWidth={1.5}
            strokeLinejoin="round" />

      {/* Path glow */}
      <path d={pathD} stroke="rgba(255,122,0,0.15)" strokeWidth={6}
            strokeLinejoin="round" />

      {/* Start node — teal */}
      <circle cx={cx(startCell[1])} cy={cy(startCell[0])} r={11}
        fill="none" stroke="rgba(0,209,178,0.35)" strokeWidth={1} />
      <circle cx={cx(startCell[1])} cy={cy(startCell[0])} r={5}
        fill="none" stroke="#00D1B2" strokeWidth={1.5} />
      <circle cx={cx(startCell[1])} cy={cy(startCell[0])} r={2}
        fill="#00D1B2" />

      {/* Goal node — coral diamond */}
      {(() => {
        const x = cx(goalCell[1]), y = cy(goalCell[0]);
        return (
          <>
            <circle cx={x} cy={y} r={11} fill="none" stroke="rgba(255,122,0,0.3)" strokeWidth={1} />
            <path d={`M ${x} ${y-6} L ${x+6} ${y} L ${x} ${y+6} L ${x-6} ${y} Z`}
              fill="#FF7A00" />
          </>
        );
      })()}

      {/* Corner HUD brackets */}
      <path d={`M 0 14 L 0 0 L 14 0`} stroke="rgba(255,122,0,0.4)" strokeWidth={1} />
      <path d={`M ${W-14} 0 L ${W} 0 L ${W} 14`} stroke="rgba(255,122,0,0.4)" strokeWidth={1} />
      <path d={`M 0 ${H-14} L 0 ${H} L 14 ${H}`} stroke="rgba(255,122,0,0.4)" strokeWidth={1} />
      <path d={`M ${W-14} ${H} L ${W} ${H} L ${W} ${H-14}`} stroke="rgba(255,122,0,0.4)" strokeWidth={1} />

      {/* Scan line */}
      <line x1={0} y1={H*0.38} x2={W} y2={H*0.38}
        stroke="rgba(0,209,178,0.07)" strokeWidth={1} strokeDasharray="3 6" />
    </svg>
  );
};

/* ────────────────────────────────────────────────────
   ALGORITHM ARTWORK — Unique SVGs for each algorithm
───────────────────────────────────────────────────── */

const BFSArt = () => (
  <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
    {/* Rings */}
    {[26, 54, 84, 114].map((r, i) => (
      <circle key={r} cx={120} cy={120} r={r}
        stroke={`rgba(0,209,178,${0.6 - i*0.12})`} strokeWidth={1}
        strokeDasharray={i > 1 ? '3 4' : 'none'} />
    ))}
    {/* Center */}
    <circle cx={120} cy={120} r={6} fill="#00D1B2" />
    {/* Ring 1 nodes */}
    {[[120,94],[146,120],[120,146],[94,120]].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r={4} fill="rgba(0,209,178,0.9)" />
    ))}
    {/* Ring 2 nodes */}
    {[[120,66],[155,85],[166,120],[155,155],[120,174],[85,155],[74,120],[85,85]].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r={3} fill="rgba(0,209,178,0.55)" />
    ))}
    {/* Ring 3 nodes */}
    {[[120,36],[158,50],[182,78],[192,120],[182,162],[158,190],[120,204],[82,190],[58,162],[48,120],[58,78],[82,50]].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r={2} fill="rgba(0,209,178,0.25)" />
    ))}
    {/* Radial lines */}
    {[[120,94],[146,120],[120,146],[94,120]].map(([x,y],i) => (
      <line key={i} x1={120} y1={120} x2={x} y2={y} stroke="rgba(0,209,178,0.2)" strokeWidth={0.5} />
    ))}
  </svg>
);

const DFSArt = () => (
  <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
    {/* Deep branch tree structure */}
    {/* Root */}
    <circle cx={120} cy={28} r={6} fill="rgba(255,122,0,0.9)" />
    {/* Level 1 */}
    <line x1={120} y1={28} x2={80} y2={68} stroke="rgba(255,122,0,0.5)" strokeWidth={1} />
    <line x1={120} y1={28} x2={160} y2={68} stroke="rgba(255,122,0,0.2)" strokeWidth={0.5} />
    <circle cx={80} cy={68} r={5} fill="rgba(255,122,0,0.85)" />
    <circle cx={160} cy={68} r={4} fill="rgba(255,122,0,0.25)" />
    {/* Level 2 — active branch left */}
    <line x1={80} y1={68} x2={52} y2={112} stroke="rgba(255,122,0,0.5)" strokeWidth={1} />
    <line x1={80} y1={68} x2={108} y2={112} stroke="rgba(255,122,0,0.2)" strokeWidth={0.5} />
    <circle cx={52} cy={112} r={5} fill="rgba(255,122,0,0.8)" />
    <circle cx={108} cy={112} r={4} fill="rgba(255,122,0,0.2)" />
    {/* Level 3 */}
    <line x1={52} y1={112} x2={36} y2={156} stroke="rgba(255,122,0,0.5)" strokeWidth={1} />
    <line x1={52} y1={112} x2={68} y2={156} stroke="rgba(255,122,0,0.18)" strokeWidth={0.5} />
    <circle cx={36} cy={156} r={5} fill="rgba(255,122,0,0.75)" />
    <circle cx={68} cy={156} r={3} fill="rgba(255,122,0,0.18)" />
    {/* Level 4 — deepest active */}
    <line x1={36} y1={156} x2={28} y2={200} stroke="rgba(255,122,0,0.5)" strokeWidth={1} />
    <circle cx={28} cy={200} r={5} fill="#FF7A00" />
    {/* Depth indicator line */}
    <line x1={20} y1={28} x2={20} y2={206} stroke="rgba(255,122,0,0.12)" strokeWidth={0.5} strokeDasharray="2 3" />
    <line x1={18} y1={28} x2={22} y2={28} stroke="rgba(255,122,0,0.3)" strokeWidth={0.5} />
    <line x1={18} y1={206} x2={22} y2={206} stroke="rgba(255,122,0,0.3)" strokeWidth={0.5} />
    {/* Backtrack marks */}
    <circle cx={160} cy={68}  r={3} fill="none" stroke="rgba(255,122,0,0.2)" strokeWidth={0.5} />
    <circle cx={108} cy={112} r={3} fill="none" stroke="rgba(255,122,0,0.15)" strokeWidth={0.5} />
    <circle cx={68}  cy={156} r={2} fill="none" stroke="rgba(255,122,0,0.12)" strokeWidth={0.5} />
  </svg>
);

const DijkstraArt = () => (
  <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
    {/* Crystal lattice network */}
    {/* Edges */}
    {[
      [120,120,80,68], [120,120,168,68], [120,120,64,152], [120,120,176,152],
      [80,68,168,68],  [64,152,176,152], [80,68,64,152],   [168,68,176,152],
      [80,68,120,30],  [168,68,120,30],  [64,152,120,210], [176,152,120,210],
    ].map(([x1,y1,x2,y2],i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(245,241,232,0.12)" strokeWidth={0.75} />
    ))}
    {/* Highlighted optimal path */}
    {[
      [120,210,64,152],[64,152,80,68],[80,68,120,30]
    ].map(([x1,y1,x2,y2],i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(245,241,232,0.55)" strokeWidth={1.5} />
    ))}
    {/* Nodes */}
    {[
      [120,120,3,'rgba(245,241,232,0.3)'],
      [80,68,4,'rgba(245,241,232,0.7)'],
      [168,68,4,'rgba(245,241,232,0.35)'],
      [64,152,4,'rgba(245,241,232,0.7)'],
      [176,152,4,'rgba(245,241,232,0.35)'],
      [120,30,6,'#F5F1E8'],
      [120,210,5,'rgba(245,241,232,0.6)'],
    ].map(([x,y,r,fill],i) => (
      <circle key={i} cx={x} cy={y} r={r} fill={fill} />
    ))}
    {/* Weight labels */}
    {[[104,100,'4'],[136,100,'7'],[86,118,'2'],[154,118,'5'],[88,46,'6'],[154,46,'3']].map(([x,y,t],i)=>(
      <text key={i} x={x} y={y} fill="rgba(245,241,232,0.3)"
        fontSize={8} fontFamily="JetBrains Mono" textAnchor="middle">{t}</text>
    ))}
  </svg>
);

const AStarArt = () => (
  <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
    {/* Compass rings */}
    <circle cx={120} cy={120} r={88} stroke="rgba(255,122,0,0.1)" strokeWidth={1} strokeDasharray="4 6" />
    <circle cx={120} cy={120} r={60} stroke="rgba(0,209,178,0.15)" strokeWidth={1} />
    <circle cx={120} cy={120} r={32} stroke="rgba(255,122,0,0.3)" strokeWidth={1} />
    {/* Cardinal lines */}
    <line x1={120} y1={28} x2={120} y2={212} stroke="rgba(245,241,232,0.06)" strokeWidth={0.5} />
    <line x1={28}  y1={120} x2={212} y2={120} stroke="rgba(245,241,232,0.06)" strokeWidth={0.5} />
    {/* Diagonal lines */}
    <line x1={58}  y1={58}  x2={182} y2={182} stroke="rgba(245,241,232,0.04)" strokeWidth={0.5} />
    <line x1={182} y1={58}  x2={58}  y2={182} stroke="rgba(245,241,232,0.04)" strokeWidth={0.5} />
    {/* North pointer — coral (optimal direction) */}
    <path d="M 120 42 L 127 88 L 120 96 L 113 88 Z" fill="#FF7A00" />
    {/* Other cardinal pointers — muted */}
    <path d="M 198 120 L 152 113 L 144 120 L 152 127 Z" fill="rgba(245,241,232,0.15)" />
    <path d="M 120 198 L 113 152 L 120 144 L 127 152 Z" fill="rgba(245,241,232,0.15)" />
    <path d="M 42  120 L 88  127 L 96  120 L 88  113 Z" fill="rgba(245,241,232,0.15)" />
    {/* Center */}
    <circle cx={120} cy={120} r={8} fill="none" stroke="#00D1B2" strokeWidth={1.5} />
    <circle cx={120} cy={120} r={3} fill="#00D1B2" />
    {/* Heuristic h-cost rays */}
    {[30,60,90,120,150,180,210,240,270,300,330].map((deg,i) => {
      const rad = (deg * Math.PI) / 180;
      return (
        <line key={i}
          x1={120 + 18 * Math.cos(rad)} y1={120 + 18 * Math.sin(rad)}
          x2={120 + 55 * Math.cos(rad)} y2={120 + 55 * Math.sin(rad)}
          stroke="rgba(0,209,178,0.12)" strokeWidth={0.5} />
      );
    })}
    {/* Cardinal ticks */}
    <text x={120} y={25}  fill="rgba(255,122,0,0.8)" fontSize={8} fontFamily="JetBrains Mono" textAnchor="middle">N</text>
    <text x={213} y={123} fill="rgba(245,241,232,0.2)" fontSize={8} fontFamily="JetBrains Mono">E</text>
    <text x={113} y={215} fill="rgba(245,241,232,0.2)" fontSize={8} fontFamily="JetBrains Mono" textAnchor="middle">S</text>
    <text x={23}  y={123} fill="rgba(245,241,232,0.2)" fontSize={8} fontFamily="JetBrains Mono">W</text>
  </svg>
);

/* ────────────────────────────────────────────────────
   ALGORITHM MODULE — Premium editorial block
───────────────────────────────────────────────────── */
const AlgorithmModule = ({ index, id, name, theme, tagline, accent, art, description, onSelect, flip }) => {
  const accentColor = accent === 'teal' ? '#00D1B2' : accent === 'coral' ? '#FF7A00' : '#F5F1E8';
  const accentSoft  = accent === 'teal' ? 'rgba(0,209,178,0.08)' : accent === 'coral' ? 'rgba(255,122,0,0.08)' : 'rgba(245,241,232,0.05)';

  return (
    <div
      style={{
        borderTop: '1px solid #2E2E2E',
        padding: '80px 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Section number watermark */}
      <div style={{
        position: 'absolute',
        top: '50%',
        [flip ? 'left' : 'right']: '-0.05em',
        transform: 'translateY(-50%)',
        fontSize: 'clamp(180px, 22vw, 320px)',
        fontFamily: '"Space Grotesk", sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.06em',
        color: 'rgba(245,241,232,0.02)',
        lineHeight: 1,
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {String(index).padStart(2, '0')}
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 48px',
        display: 'grid',
        gridTemplateColumns: flip ? '1fr 1fr' : '1fr 1fr',
        gap: '64px',
        alignItems: 'center',
        direction: flip ? 'rtl' : 'ltr',
      }}>
        {/* Text column */}
        <div style={{ direction: 'ltr' }}>
          <p style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.6875rem',
            letterSpacing: '0.16em',
            color: accentColor,
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}>
            {String(index).padStart(2, '0')} / {id}
          </p>

          <div style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(48px, 7vw, 96px)',
            letterSpacing: '-0.04em',
            lineHeight: 0.9,
            color: '#F5F1E8',
            marginBottom: '16px',
          }}>
            {name}
          </div>

          <div style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 600,
            fontSize: 'clamp(14px, 2vw, 18px)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: accentColor,
            marginBottom: '28px',
          }}>
            {theme}
          </div>

          <p style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '1rem',
            lineHeight: 1.75,
            color: '#A09A8E',
            maxWidth: '440px',
            marginBottom: '40px',
          }}>
            {description}
          </p>

          <button
            onClick={onSelect}
            style={{
              background: 'transparent',
              border: `1px solid ${accentColor}`,
              color: accentColor,
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '12px 28px',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = accentColor;
              e.currentTarget.style.color = '#080808';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = accentColor;
            }}
          >
            Select Algorithm
            <span>→</span>
          </button>
        </div>

        {/* Art column */}
        <div style={{
          direction: 'ltr',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: accentSoft,
          border: `1px solid rgba(255,255,255,0.04)`,
          padding: '48px',
          aspectRatio: '1',
          position: 'relative',
        }}>
          {/* Corner brackets on art box */}
          {[['top:0,left:0,borderTop,borderLeft'],
            ['top:0,right:0,borderTop,borderRight'],
            ['bottom:0,left:0,borderBottom,borderLeft'],
            ['bottom:0,right:0,borderBottom,borderRight']].map((_, i) => null)}
          <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: `1px solid ${accentColor}`, borderLeft: `1px solid ${accentColor}` }} />
          <div style={{ position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderTop: `1px solid ${accentColor}`, borderRight: `1px solid ${accentColor}` }} />
          <div style={{ position: 'absolute', bottom: -1, left: -1, width: 12, height: 12, borderBottom: `1px solid ${accentColor}`, borderLeft: `1px solid ${accentColor}` }} />
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderBottom: `1px solid ${accentColor}`, borderRight: `1px solid ${accentColor}` }} />
          <div style={{ width: '100%', maxWidth: '240px', opacity: 0.9 }}>
            {art}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────
   LANDING PAGE — Full cinematic experience
───────────────────────────────────────────────────── */
export default function LandingPage({ onEnterApp }) {

  const algorithms = [
    {
      id: 'BFS',
      algo: AlgorithmName.BFS,
      name: 'BFS',
      theme: 'THE EXPLORER',
      accent: 'teal',
      art: <BFSArt />,
      description: 'Breadth-First Search expands outward in concentric waves, guaranteeing the shortest path by level. Every neighbor at distance k is visited before distance k+1.',
    },
    {
      id: 'DFS',
      algo: AlgorithmName.DFS,
      name: 'DFS',
      theme: 'THE DISCOVERER',
      accent: 'coral',
      art: <DFSArt />,
      description: 'Depth-First Search plunges into each branch until it reaches a dead end, then backtracks. Traces the shape of every possibility before committing to a path.',
    },
    {
      id: 'DIJKSTRA',
      algo: AlgorithmName.DIJKSTRA,
      name: 'Dijkstra',
      theme: 'THE OPTIMIZER',
      accent: 'ivory',
      art: <DijkstraArt />,
      description: "Dijkstra's algorithm is the gold standard for weighted graphs. It greedily extracts the minimum-cost frontier node, building the globally optimal path cost table.",
    },
    {
      id: 'A*',
      algo: AlgorithmName.ASTAR,
      name: 'A*',
      theme: 'THE NAVIGATOR',
      accent: 'coral',
      art: <AStarArt />,
      description: 'A* combines Dijkstra\'s optimal cost tracking with a heuristic compass, focusing search effort toward the goal. Optimal and intelligent in equal measure.',
    },
  ];

  return (
    <div style={{ background: '#080808', color: '#F5F1E8', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: '64px',
        borderBottom: '1px solid rgba(245,241,232,0.06)',
        background: 'rgba(8,8,8,0.92)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 700, fontSize: '1rem',
          letterSpacing: '0.06em',
          color: '#F5F1E8',
        }}>
          PATH<span style={{ color: '#FF7A00' }}>FINDER</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a href="#algorithms" style={{
            color: '#5C5650', textDecoration: 'none',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 600, fontSize: '0.75rem',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.target.style.color = '#A09A8E'}
            onMouseLeave={e => e.target.style.color = '#5C5650'}>
            Algorithms
          </a>
          <a href="#scanner" style={{
            color: '#5C5650', textDecoration: 'none',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 600, fontSize: '0.75rem',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.target.style.color = '#A09A8E'}
            onMouseLeave={e => e.target.style.color = '#5C5650'}>
            Scanner
          </a>
          <button
            className="btn-primary"
            style={{ padding: '10px 24px', fontSize: '0.75rem' }}
            onClick={() => onEnterApp()}>
            Launch →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', paddingTop: '64px',
        display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background atmosphere */}
        <div className="atmos-coral" />
        <div className="atmos-teal" />
        {/* Dot grid background */}
        <div className="dot-grid" style={{
          position: 'absolute', inset: 0, zIndex: 0,
        }} />

        <div style={{
          maxWidth: '1200px', margin: '0 auto', padding: '0 48px',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '80px', alignItems: 'center',
          position: 'relative', zIndex: 1, width: '100%',
        }}>
          {/* Left — Text */}
          <div>
            <p style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.6875rem', letterSpacing: '0.18em',
              color: '#5C5650', textTransform: 'uppercase',
              marginBottom: '32px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <span style={{ display: 'inline-block', width: '28px', height: '1px', background: '#FF7A00' }} />
              Mission Control Platform
            </p>

            <h1 style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(72px, 10vw, 148px)',
              letterSpacing: '-0.05em',
              lineHeight: 0.88,
              color: '#F5F1E8',
              margin: 0, marginBottom: '32px',
            }}>
              PATH<br />
              <span style={{ color: '#FF7A00' }}>FINDER</span>
            </h1>

            <p style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 'clamp(15px, 1.8vw, 19px)',
              lineHeight: 1.7,
              color: '#A09A8E',
              maxWidth: '440px',
              marginBottom: '48px',
            }}>
              Visualize intelligent pathfinding algorithms in real-time. 
              See every decision. Trace every route. Understand every step.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => onEnterApp()}>
                Launch Mission
                <span style={{ fontSize: '1.1em' }}>→</span>
              </button>
              <a href="#algorithms" className="btn-ghost" style={{ textDecoration: 'none' }}>
                Explore Algorithms
                <span style={{ fontSize: '1em' }}>↓</span>
              </a>
            </div>

            {/* Status indicator */}
            <div style={{
              marginTop: '56px', display: 'flex', gap: '32px',
              borderTop: '1px solid rgba(245,241,232,0.06)',
              paddingTop: '32px',
            }}>
              {[
                { val: '4', label: 'Algorithms' },
                { val: '60fps', label: 'Real-time' },
                { val: '∞', label: 'Grid presets' },
              ].map(({ val, label }) => (
                <div key={label}>
                  <div style={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 700, fontSize: '1.5rem',
                    color: '#F5F1E8', letterSpacing: '-0.03em',
                  }}>
                    {val}
                  </div>
                  <div style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.6875rem', letterSpacing: '0.1em',
                    color: '#5C5650', textTransform: 'uppercase',
                    marginTop: '2px',
                  }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Grid Art */}
          <div style={{
            position: 'relative',
            border: '1px solid rgba(245,241,232,0.06)',
            padding: '32px',
            background: 'rgba(245,241,232,0.01)',
          }}>
            {/* Corner brackets */}
            <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: '1px solid #FF7A00', borderLeft: '1px solid #FF7A00' }} />
            <div style={{ position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTop: '1px solid #FF7A00', borderRight: '1px solid #FF7A00' }} />
            <div style={{ position: 'absolute', bottom: -1, left: -1, width: 14, height: 14, borderBottom: '1px solid #FF7A00', borderLeft: '1px solid #FF7A00' }} />
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottom: '1px solid #FF7A00', borderRight: '1px solid #FF7A00' }} />
            {/* Scan status */}
            <div style={{
              position: 'absolute', top: 12, left: 20,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.625rem', letterSpacing: '0.12em',
              color: '#00D1B2', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00D1B2', display: 'inline-block', animation: 'none' }} />
              Scanner Active
            </div>
            <HeroGridArt />
          </div>
        </div>
      </section>

      {/* ── ALGORITHM MODULES ── */}
      <section id="algorithms" style={{ paddingTop: '80px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 48px 56px' }}>
          <p className="section-eyebrow" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'inline-block', width: '28px', height: '1px', background: '#FF7A00' }} />
            02 / The Algorithms
          </p>
          <h2 style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(36px, 5vw, 64px)',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: '#F5F1E8',
            maxWidth: '600px',
          }}>
            Four algorithms.<br />One visual language.
          </h2>
        </div>

        {algorithms.map((algo, i) => (
          <AlgorithmModule
            key={algo.id}
            index={i + 1}
            {...algo}
            flip={i % 2 === 1}
            onSelect={() => onEnterApp(algo.algo)}
          />
        ))}
      </section>

      {/* ── SCANNER SHOWCASE ── */}
      <section id="scanner" style={{
        padding: '120px 0',
        borderTop: '1px solid #2E2E2E',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div className="atmos-coral" style={{ opacity: 0.6 }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 48px' }}>
          <p className="section-eyebrow" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'inline-block', width: '28px', height: '1px', background: '#00D1B2' }} />
            03 / Scanner
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'end', marginBottom: '64px' }}>
            <h2 style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(36px, 5vw, 60px)',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: '#F5F1E8',
              margin: 0,
            }}>
              The scanner is the centerpiece.
            </h2>
            <p style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '1.0625rem',
              lineHeight: 1.75,
              color: '#A09A8E',
            }}>
              A dual-layer canvas renderer with zoom, pan, and live cell state visualization. 
              Every explored node, every frontier cell, every final path — rendered in real-time at 60fps.
              Paint terrain, drag waypoints, load presets.
            </p>
          </div>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#2E2E2E' }}>
            {[
              { label: 'Dual-Layer Canvas', desc: 'Background static layer + foreground dynamic layer for maximum performance.' },
              { label: 'Terrain Painting', desc: 'Draw obstacles, nebula clouds, and gravity wells directly on the grid.' },
              { label: 'Timeline Scrubber', desc: 'Step forward, backward, or seek to any point in the algorithm execution.' },
              { label: 'Zoom & Pan', desc: 'Mouse wheel zoom and drag to navigate large grids fluidly.' },
              { label: 'Search Tree', desc: 'Watch the algorithm\'s decision tree grow in real-time alongside the grid.' },
              { label: 'Live Telemetry', desc: 'Every run logs metrics to SQLite. Analytics dashboard with charts.' },
            ].map(({ label, desc }) => (
              <div key={label} style={{
                background: '#080808', padding: '32px 28px',
                borderTop: 'none',
              }}>
                <div style={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700, fontSize: '1rem',
                  color: '#F5F1E8', marginBottom: '10px',
                }}>
                  {label}
                </div>
                <p style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '0.875rem', lineHeight: 1.65,
                  color: '#5C5650', margin: 0,
                }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{
        padding: '160px 48px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid #2E2E2E',
      }}>
        <div className="atmos-teal" style={{ left: '25%', right: '25%', width: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="section-eyebrow" style={{ marginBottom: '24px' }}>04 / Begin</p>
          <h2 style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(48px, 7vw, 100px)',
            letterSpacing: '-0.04em',
            lineHeight: 0.92,
            color: '#F5F1E8',
            marginBottom: '48px',
          }}>
            Ready to navigate?
          </h2>
          <button className="btn-primary" style={{ fontSize: '0.9375rem', padding: '18px 48px' }}
            onClick={() => onEnterApp()}>
            Launch Pathfinder
            <span>→</span>
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid #2E2E2E',
        padding: '24px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 700, fontSize: '0.875rem',
          letterSpacing: '0.04em', color: '#2E2E2E',
        }}>
          PATH<span style={{ color: '#3A3A3A' }}>FINDER</span>
        </div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.625rem', letterSpacing: '0.1em',
          color: '#2E2E2E', textTransform: 'uppercase',
        }}>
          Mission Control Platform
        </div>
      </footer>

    </div>
  );
}
