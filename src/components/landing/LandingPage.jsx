import { AlgorithmName } from '../../engine/eventTypes.js';

/* ────────────────────────────────────────────────────────
   SEEDED RANDOM — deterministic values, no re-renders
──────────────────────────────────────────────────────── */
function sRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
const rng = sRand(7331);

/* ────────────────────────────────────────────────────────
   MODULE-LEVEL CONSTANTS — created once, never GC'd
──────────────────────────────────────────────────────── */
const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: rng() * 100,
  y: rng() * 100,
  r: rng() < 0.7 ? 0.8 : rng() < 0.92 ? 1.3 : 1.8,
  op: 0.08 + rng() * 0.48,
}));

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: rng() * 90 + 5,
  y: rng() * 85 + 5,
  sz: 0.6 + rng() * 1.5,
  dur: 28 + rng() * 34,
  delay: -(rng() * 32),
  op: 0.12 + rng() * 0.28,
  color: i % 5 === 0 ? '#6D5DFF' : i % 5 === 1 ? '#00D1B2' : i % 5 === 2 ? '#F8FAFC' : '#3ABEFF',
}));

/* ────────────────────────────────────────────────────────
   STAR FIELD
──────────────────────────────────────────────────────── */
const StarField = () => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
    {STARS.map(s => (
      <div key={s.id} style={{
        position: 'absolute',
        left: `${s.x}%`, top: `${s.y}%`,
        width: s.r, height: s.r,
        borderRadius: '50%',
        background: '#F8FAFC',
        opacity: s.op,
      }} />
    ))}
  </div>
);

/* ────────────────────────────────────────────────────────
   PARTICLE FIELD — slow atmospheric drift
──────────────────────────────────────────────────────── */
const ParticleField = () => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
    {PARTICLES.map(p => (
      <div key={p.id} style={{
        position: 'absolute',
        left: `${p.x}%`, top: `${p.y}%`,
        width: p.sz, height: p.sz,
        borderRadius: '50%',
        background: p.color,
        opacity: p.op,
        animation: `particle-drift ${p.dur}s ${p.delay}s linear infinite`,
        willChange: 'transform, opacity',
      }} />
    ))}
  </div>
);

/* ────────────────────────────────────────────────────────
   ORBITAL HERO ART — Space mission control visual
──────────────────────────────────────────────────────── */
const OrbitalHeroArt = () => (
  <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full" preserveAspectRatio="xMidYMid meet">

    {/* Background stars */}
    {STARS.slice(0, 50).map(s => (
      <circle key={s.id}
        cx={s.x * 5} cy={s.y * 4}
        r={s.r * 0.6}
        fill={`rgba(248,250,252,${s.op * 0.7})`}
      />
    ))}

    {/* Outer orbital ring (tilted) */}
    <g transform="rotate(-18 250 200)">
      <ellipse cx="250" cy="200" rx="188" ry="92"
        stroke="rgba(58,190,255,0.10)" strokeWidth="1"
        strokeDasharray="5 7" />

      {/* Active path arc — the algorithm's route */}
      <path d="M 62 200 A 188 92 0 0 1 438 200"
        stroke="rgba(58,190,255,0.55)" strokeWidth="1.5" />
      {/* Glow on path */}
      <path d="M 62 200 A 188 92 0 0 1 438 200"
        stroke="rgba(58,190,255,0.12)" strokeWidth="7" />

      {/* Orbital nodes on outer ring */}
      {/* START — Aurora Teal */}
      <circle cx="62" cy="200" r="8" fill="none" stroke="#00D1B2" strokeWidth="1.5" />
      <circle cx="62" cy="200" r="3.5" fill="#00D1B2" />

      {/* Node 2 */}
      <circle cx="122" cy="118" r="5" fill="rgba(58,190,255,0.85)" />
      <circle cx="122" cy="118" r="9" fill="none" stroke="rgba(58,190,255,0.2)" strokeWidth="1" />

      {/* Node 3 */}
      <circle cx="250" cy="108" r="5" fill="rgba(58,190,255,0.7)" />

      {/* Node 4 */}
      <circle cx="378" cy="118" r="5" fill="rgba(58,190,255,0.85)" />

      {/* GOAL — Nebula Purple */}
      <circle cx="438" cy="200" r="8" fill="none" stroke="#6D5DFF" strokeWidth="1.5" />
      <path d="M 438 194 L 444 200 L 438 206 L 432 200 Z" fill="#6D5DFF" />

      {/* Transmission lines */}
      {[[62,200,122,118],[122,118,250,108],[250,108,378,118],[378,118,438,200]].map(([x1,y1,x2,y2],i)=>(
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="rgba(58,190,255,0.18)" strokeWidth="0.5" strokeDasharray="3 4" />
      ))}
    </g>

    {/* Inner orbital ring */}
    <g transform="rotate(-18 250 200)">
      <ellipse cx="250" cy="200" rx="105" ry="52"
        stroke="rgba(109,93,255,0.14)" strokeWidth="1"
        strokeDasharray="3 5" />
      {/* Secondary satellite */}
      <circle cx="145" cy="200" r="4" fill="rgba(109,93,255,0.6)" />
      <circle cx="355" cy="200" r="4" fill="rgba(109,93,255,0.4)" />
    </g>

    {/* Planet body — centered, unrotated */}
    <circle cx="250" cy="200" r="36" fill="#080C15" stroke="rgba(58,190,255,0.22)" strokeWidth="1" />
    {/* Planet atmospheric glow */}
    <circle cx="250" cy="200" r="42" fill="none"
      stroke="rgba(58,190,255,0.06)" strokeWidth="4" />
    {/* Surface detail */}
    <circle cx="250" cy="200" r="26" fill="rgba(109,93,255,0.10)" />
    <circle cx="240" cy="193" r="7" fill="rgba(58,190,255,0.07)" />
    <circle cx="258" cy="208" r="4" fill="rgba(0,209,178,0.05)" />
    {/* Planet ring */}
    <ellipse cx="250" cy="200" rx="52" ry="10"
      stroke="rgba(58,190,255,0.10)" strokeWidth="1" />

    {/* HUD frame corners */}
    <path d="M 0 18 L 0 0 L 18 0"   stroke="rgba(58,190,255,0.4)" strokeWidth="1" />
    <path d="M 482 0 L 500 0 L 500 18"   stroke="rgba(58,190,255,0.4)" strokeWidth="1" />
    <path d="M 0 382 L 0 400 L 18 400"   stroke="rgba(58,190,255,0.4)" strokeWidth="1" />
    <path d="M 482 400 L 500 400 L 500 382" stroke="rgba(58,190,255,0.4)" strokeWidth="1" />

    {/* Crosshair on planet */}
    <line x1="230" y1="200" x2="270" y2="200" stroke="rgba(58,190,255,0.18)" strokeWidth="0.5" />
    <line x1="250" y1="180" x2="250" y2="220" stroke="rgba(58,190,255,0.18)" strokeWidth="0.5" />

    {/* Labels */}
    <text x="16" y="14" fill="rgba(58,190,255,0.45)" fontSize="7" fontFamily="JetBrains Mono" letterSpacing="2">MCA-0101</text>
    <text x="38" y="197" fill="rgba(0,209,178,0.7)" fontSize="6.5" fontFamily="JetBrains Mono">ORIGIN</text>
    <text x="444" y="197" fill="rgba(109,93,255,0.8)" fontSize="6.5" fontFamily="JetBrains Mono">TARGET</text>
    <text x="16" y="394" fill="rgba(58,190,255,0.3)" fontSize="6.5" fontFamily="JetBrains Mono">ORBITAL SCAN · ACTIVE</text>

    {/* Scan sweep line */}
    <line x1="0" y1="270" x2="500" y2="270"
      stroke="rgba(58,190,255,0.05)" strokeWidth="1" strokeDasharray="3 10" />
  </svg>
);

/* ────────────────────────────────────────────────────────
   ALGORITHM SVG ARTS — unique space-themed visuals
──────────────────────────────────────────────────────── */
const BFSArt = () => (
  <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
    {/* Expanding wave rings — Cosmic Cyan */}
    {[22, 48, 76, 108, 142].map((r, i) => (
      <circle key={r} cx={120} cy={120} r={r}
        stroke={`rgba(58,190,255,${0.7 - i * 0.12})`}
        strokeWidth={1}
        strokeDasharray={i > 2 ? '3 4' : 'none'} />
    ))}
    {/* Origin point */}
    <circle cx={120} cy={120} r={6} fill="#3ABEFF" />
    <circle cx={120} cy={120} r={12} fill="none" stroke="rgba(58,190,255,0.25)" strokeWidth={1} />
    {/* Ring 1 nodes — 4 cardinal */}
    {[[120,98],[142,120],[120,142],[98,120]].map(([x,y],i)=>(
      <circle key={i} cx={x} cy={y} r={3.5} fill="rgba(58,190,255,0.9)" />
    ))}
    {/* Ring 2 nodes — 8 */}
    {[[120,72],[149,91],[168,120],[149,149],[120,168],[91,149],[72,120],[91,91]].map(([x,y],i)=>(
      <circle key={i} cx={x} cy={y} r={2.5} fill="rgba(58,190,255,0.55)" />
    ))}
    {/* Ring 3 sampling */}
    {[[120,44],[163,57],[196,90],[204,120],[196,150],[163,183],[120,196],[77,183],[44,150],[36,120],[44,90],[77,57]].map(([x,y],i)=>(
      <circle key={i} cx={x} cy={y} r={1.5} fill="rgba(58,190,255,0.22)" />
    ))}
    {/* Radial spokes */}
    {[[120,98],[142,120],[120,142],[98,120]].map(([x,y],i)=>(
      <line key={i} x1={120} y1={120} x2={x} y2={y} stroke="rgba(58,190,255,0.15)" strokeWidth={0.5} />
    ))}
  </svg>
);

const DFSArt = () => (
  <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
    {/* Branching deep path — Nebula Purple */}
    <circle cx={120} cy={22} r={6} fill="rgba(109,93,255,0.95)" />
    {/* Level 1 */}
    <line x1={120} y1={22} x2={78} y2={62} stroke="rgba(109,93,255,0.55)" strokeWidth={1} />
    <line x1={120} y1={22} x2={162} y2={62} stroke="rgba(109,93,255,0.2)" strokeWidth={0.5} />
    <circle cx={78}  cy={62}  r={5.5} fill="rgba(109,93,255,0.9)" />
    <circle cx={162} cy={62}  r={4}   fill="rgba(109,93,255,0.25)" />
    {/* Level 2 — active left branch */}
    <line x1={78} y1={62} x2={50} y2={106} stroke="rgba(109,93,255,0.55)" strokeWidth={1} />
    <line x1={78} y1={62} x2={106} y2={106} stroke="rgba(109,93,255,0.18)" strokeWidth={0.5} />
    <circle cx={50}  cy={106} r={5}   fill="rgba(109,93,255,0.85)" />
    <circle cx={106} cy={106} r={3.5} fill="rgba(109,93,255,0.2)" />
    {/* Level 3 */}
    <line x1={50} y1={106} x2={34} y2={150} stroke="rgba(109,93,255,0.55)" strokeWidth={1} />
    <line x1={50} y1={106} x2={66} y2={150} stroke="rgba(109,93,255,0.16)" strokeWidth={0.5} />
    <circle cx={34} cy={150} r={5} fill="rgba(109,93,255,0.8)" />
    <circle cx={66} cy={150} r={3} fill="rgba(109,93,255,0.16)" />
    {/* Level 4 — deepest */}
    <line x1={34} y1={150} x2={26} y2={198} stroke="rgba(109,93,255,0.6)" strokeWidth={1.2} />
    <circle cx={26} cy={198} r={6} fill="#6D5DFF" />
    <circle cx={26} cy={198} r={11} fill="none" stroke="rgba(109,93,255,0.3)" strokeWidth={1} />
    {/* Depth indicator */}
    <line x1={18} y1={22} x2={18} y2={204} stroke="rgba(109,93,255,0.1)" strokeWidth={0.5} strokeDasharray="2 4" />
    <line x1={15} y1={22}  x2={21} y2={22}  stroke="rgba(109,93,255,0.3)" strokeWidth={0.5} />
    <line x1={15} y1={204} x2={21} y2={204} stroke="rgba(109,93,255,0.3)" strokeWidth={0.5} />
    {/* Unexplored ghost nodes */}
    <circle cx={162} cy={62}  r={3.5} fill="none" stroke="rgba(109,93,255,0.2)" strokeWidth={0.5} />
    <circle cx={106} cy={106} r={3} fill="none" stroke="rgba(109,93,255,0.15)" strokeWidth={0.5} />
  </svg>
);

const DijkstraArt = () => (
  <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
    {/* Crystal lattice — Aurora Teal */}
    {[
      [120,120,78,66],[120,120,170,66],[120,120,62,154],[120,120,178,154],
      [78,66,170,66],[62,154,178,154],[78,66,62,154],[170,66,178,154],
      [78,66,120,28],[170,66,120,28],[62,154,120,212],[178,154,120,212],
      [78,66,170,66],[62,154,178,154],
    ].map(([x1,y1,x2,y2],i)=>(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(0,209,178,0.12)" strokeWidth={0.75} />
    ))}
    {/* Highlighted optimal path */}
    {[[120,212,62,154],[62,154,78,66],[78,66,120,28]].map(([x1,y1,x2,y2],i)=>(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(0,209,178,0.6)" strokeWidth={1.8} />
    ))}
    {/* Path glow */}
    {[[120,212,62,154],[62,154,78,66],[78,66,120,28]].map(([x1,y1,x2,y2],i)=>(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(0,209,178,0.10)" strokeWidth={6} />
    ))}
    {/* Nodes */}
    {[
      [120,120,3,'rgba(0,209,178,0.35)'],
      [78,66,4.5,'rgba(0,209,178,0.75)'],  [170,66,4,'rgba(0,209,178,0.3)'],
      [62,154,4.5,'rgba(0,209,178,0.75)'], [178,154,4,'rgba(0,209,178,0.3)'],
      [120,28,7,'#00D1B2'], [120,212,5.5,'rgba(0,209,178,0.65)'],
    ].map(([x,y,r,fill],i)=>(
      <circle key={i} cx={x} cy={y} r={r} fill={fill} />
    ))}
    {/* Weight numbers */}
    {[[102,98,'4'],[138,98,'7'],[84,116,'2'],[156,116,'5'],[86,44,'6'],[152,44,'3']].map(([x,y,t],i)=>(
      <text key={i} x={x} y={y} fill="rgba(0,209,178,0.32)" fontSize={7.5} fontFamily="JetBrains Mono" textAnchor="middle">{t}</text>
    ))}
  </svg>
);

const AStarArt = () => (
  <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
    {/* Cosmic compass — Cyan + Purple */}
    <circle cx={120} cy={120} r={88} stroke="rgba(58,190,255,0.08)" strokeWidth={1} strokeDasharray="4 7" />
    <circle cx={120} cy={120} r={60} stroke="rgba(109,93,255,0.14)" strokeWidth={1} />
    <circle cx={120} cy={120} r={32} stroke="rgba(58,190,255,0.25)" strokeWidth={1} />
    {/* Cardinal gridlines */}
    <line x1={120} y1={28} x2={120} y2={212} stroke="rgba(248,250,252,0.04)" strokeWidth={0.5} />
    <line x1={28}  y1={120} x2={212} y2={120} stroke="rgba(248,250,252,0.04)" strokeWidth={0.5} />
    <line x1={58}  y1={58}  x2={182} y2={182} stroke="rgba(248,250,252,0.03)" strokeWidth={0.5} />
    <line x1={182} y1={58}  x2={58}  y2={182} stroke="rgba(248,250,252,0.03)" strokeWidth={0.5} />
    {/* NORTH pointer — Cosmic Cyan (optimal direction) */}
    <path d="M 120 40 L 127 90 L 120 98 L 113 90 Z" fill="#3ABEFF" />
    <path d="M 120 40 L 127 90 L 120 98 L 113 90 Z" fill="rgba(58,190,255,0.2)" />
    {/* Other pointers — muted */}
    <path d="M 200 120 L 150 113 L 142 120 L 150 127 Z" fill="rgba(248,250,252,0.14)" />
    <path d="M 120 200 L 113 150 L 120 142 L 127 150 Z" fill="rgba(248,250,252,0.14)" />
    <path d="M 40  120 L 90  127 L 98  120 L 90  113 Z" fill="rgba(248,250,252,0.14)" />
    {/* Center — Aurora Teal */}
    <circle cx={120} cy={120} r={9} fill="none" stroke="#00D1B2" strokeWidth={1.5} />
    <circle cx={120} cy={120} r={3.5} fill="#00D1B2" />
    {/* H-cost heuristic rays */}
    {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i)=>{
      const rad = (deg*Math.PI)/180;
      return (
        <line key={i}
          x1={120+18*Math.cos(rad)} y1={120+18*Math.sin(rad)}
          x2={120+56*Math.cos(rad)} y2={120+56*Math.sin(rad)}
          stroke="rgba(109,93,255,0.12)" strokeWidth={0.5} />
      );
    })}
    {/* Cardinal labels */}
    <text x={120} y={25}  fill="rgba(58,190,255,0.75)" fontSize={7.5} fontFamily="JetBrains Mono" textAnchor="middle">N</text>
    <text x={208} y={123} fill="rgba(248,250,252,0.18)" fontSize={7.5} fontFamily="JetBrains Mono">E</text>
    <text x={113} y={214} fill="rgba(248,250,252,0.18)" fontSize={7.5} fontFamily="JetBrains Mono" textAnchor="middle">S</text>
    <text x={22}  y={123} fill="rgba(248,250,252,0.18)" fontSize={7.5} fontFamily="JetBrains Mono">W</text>
  </svg>
);

/* ────────────────────────────────────────────────────────
   ALGORITHM MODULE — editorial asymmetric section
──────────────────────────────────────────────────────── */
const AlgorithmModule = ({ index, id, name, theme, accent, accentDim, art, description, onSelect, flip }) => (
  <div style={{
    borderTop: '1px solid #1E2D45',
    padding: '80px 0',
    position: 'relative',
    overflow: 'hidden',
  }}>
    {/* Watermark number */}
    <div style={{
      position: 'absolute', top: '50%',
      [flip ? 'left' : 'right']: '-0.04em',
      transform: 'translateY(-50%)',
      fontSize: 'clamp(160px, 21vw, 300px)',
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 700, letterSpacing: '-0.07em',
      color: 'rgba(248,250,252,0.018)',
      lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
    }}>
      {String(index).padStart(2, '0')}
    </div>

    <div style={{
      maxWidth: 1200, margin: '0 auto', padding: '0 48px',
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 72, alignItems: 'center',
      direction: flip ? 'rtl' : 'ltr',
    }}>
      {/* Text */}
      <div style={{ direction: 'ltr' }}>
        <p style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem',
          letterSpacing: '0.18em', color: accent,
          textTransform: 'uppercase', marginBottom: 20,
        }}>
          {String(index).padStart(2, '0')} / {id}
        </p>

        <div style={{
          fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
          fontSize: 'clamp(52px, 8vw, 104px)',
          letterSpacing: '-0.04em', lineHeight: 0.88,
          color: '#F8FAFC', marginBottom: 16,
        }}>
          {name}
        </div>

        <div style={{
          fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
          fontSize: 'clamp(13px, 1.6vw, 17px)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          color: accent, marginBottom: 28,
        }}>
          {theme}
        </div>

        <p style={{
          fontFamily: '"Inter", sans-serif', fontSize: '1rem',
          lineHeight: 1.75, color: '#8899AA',
          maxWidth: 420, marginBottom: 44,
        }}>
          {description}
        </p>

        <button onClick={onSelect} style={{
          background: 'transparent', border: `1px solid ${accent}`,
          color: accent, fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em',
          textTransform: 'uppercase', padding: '12px 28px',
          cursor: 'pointer', transition: 'all 0.15s',
          display: 'inline-flex', alignItems: 'center', gap: 10,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = '#05060A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = accent; }}
        >
          Select Algorithm <span>→</span>
        </button>
      </div>

      {/* Art */}
      <div style={{
        direction: 'ltr', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: accentDim, border: '1px solid rgba(248,250,252,0.04)',
        padding: 48, aspectRatio: '1', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: `1px solid ${accent}`, borderLeft: `1px solid ${accent}` }} />
        <div style={{ position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderTop: `1px solid ${accent}`, borderRight: `1px solid ${accent}` }} />
        <div style={{ position: 'absolute', bottom: -1, left: -1, width: 12, height: 12, borderBottom: `1px solid ${accent}`, borderLeft: `1px solid ${accent}` }} />
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderBottom: `1px solid ${accent}`, borderRight: `1px solid ${accent}` }} />
        <div style={{ width: '100%', maxWidth: 240 }}>{art}</div>
      </div>
    </div>
  </div>
);

/* ────────────────────────────────────────────────────────
   LANDING PAGE — Full MCA Mission Control Experience
──────────────────────────────────────────────────────── */
export default function LandingPage({ onEnterApp }) {

  const algorithms = [
    {
      id: 'BFS', algo: AlgorithmName.BFS,
      name: 'BFS', theme: 'THE EXPLORER',
      accent: '#3ABEFF', accentDim: 'rgba(58,190,255,0.07)',
      art: <BFSArt />,
      description: 'Breadth-First Search expands outward in concentric waves, level by level. Guarantees the shortest path by hop count. Ideal for unweighted exploration missions.',
    },
    {
      id: 'DFS', algo: AlgorithmName.DFS,
      name: 'DFS', theme: 'THE DISCOVERER',
      accent: '#6D5DFF', accentDim: 'rgba(109,93,255,0.07)',
      art: <DFSArt />,
      description: 'Depth-First Search plunges deep before backtracking. Traces every branch of possibility. Best for maze-like environments and full-path exploration.',
    },
    {
      id: 'DIJKSTRA', algo: AlgorithmName.DIJKSTRA,
      name: 'Dijkstra', theme: 'THE OPTIMIZER',
      accent: '#00D1B2', accentDim: 'rgba(0,209,178,0.07)',
      art: <DijkstraArt />,
      description: "Dijkstra's algorithm is the gold standard for weighted navigation. Greedily extracts minimum-cost nodes from a priority heap — building optimal path tables.",
    },
    {
      id: 'A*', algo: AlgorithmName.ASTAR,
      name: 'A*', theme: 'THE NAVIGATOR',
      accent: '#3ABEFF', accentDim: 'rgba(58,190,255,0.07)',
      art: <AStarArt />,
      description: 'A* fuses optimal cost tracking with a heuristic compass. It focuses search intelligence toward the target. Optimal, efficient, and mission-ready.',
    },
  ];

  return (
    <div style={{ background: '#05060A', color: '#F8FAFC', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ══ NAVIGATION ══ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 60,
        borderBottom: '1px solid rgba(30,45,69,0.8)',
        background: 'rgba(5,6,10,0.90)',
        backdropFilter: 'blur(16px)',
      }}>
        {/* MCA Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="11" stroke="rgba(58,190,255,0.4)" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx="14" cy="14" r="6" stroke="#3ABEFF" strokeWidth="1" />
            <circle cx="14" cy="14" r="2.5" fill="#3ABEFF" />
            <line x1="14" y1="3" x2="14" y2="8" stroke="rgba(58,190,255,0.5)" strokeWidth="1" />
          </svg>
          <div>
            <div style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700, fontSize: '0.9375rem',
              letterSpacing: '0.04em', color: '#F8FAFC',
              lineHeight: 1,
            }}>
              MCA
            </div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.45rem', letterSpacing: '0.18em',
              color: '#44556B', textTransform: 'uppercase',
            }}>
              Mission Control Analyst
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {['Algorithms', 'Navigation', 'Systems'].map(label => (
            <a key={label} href={`#${label.toLowerCase()}`} style={{
              color: '#44556B', textDecoration: 'none',
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600, fontSize: '0.75rem',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => e.target.style.color = '#8899AA'}
              onMouseLeave={e => e.target.style.color = '#44556B'}
            >
              {label}
            </a>
          ))}
          <button className="btn-primary"
            style={{ padding: '9px 22px', fontSize: '0.6875rem' }}
            onClick={() => onEnterApp()}>
            Initialize →
          </button>
        </div>
      </nav>

      {/* ══ SECTION 01 — MISSION INTRODUCTION (HERO) ══ */}
      <section style={{
        minHeight: '100vh', paddingTop: 60,
        display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Nebula atmosphere */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse 70% 55% at 8% 12%, rgba(109,93,255,0.11) 0%, transparent 65%),
            radial-gradient(ellipse 55% 45% at 90% 80%, rgba(58,190,255,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 85% 60% at 50% 110%, rgba(0,209,178,0.04) 0%, transparent 50%),
            #05060A
          `,
        }} />

        <StarField />
        <ParticleField />

        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '60px 48px',
          display: 'grid', gridTemplateColumns: '52% 48%',
          gap: 64, alignItems: 'center',
          position: 'relative', zIndex: 2, width: '100%',
        }}>

          {/* Left — Hero Typography */}
          <div>
            {/* Mission eyebrow */}
            <p style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.625rem', letterSpacing: '0.22em',
              color: '#3ABEFF', textTransform: 'uppercase',
              marginBottom: 48, margin: '0 0 48px 0',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{
                display: 'inline-block', width: 32, height: 1, background: '#3ABEFF',
              }} />
              01 / Mission Control Platform
            </p>

            {/* THE BIG DISPLAY TYPE */}
            <div style={{ marginBottom: 12 }}>
              {/* MCA — massive */}
              <div style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(100px, 16vw, 196px)',
                letterSpacing: '-0.06em', lineHeight: 0.85,
                color: '#F8FAFC',
                position: 'relative',
              }}>
                MCA
                {/* Subtle glow behind MCA */}
                <div style={{
                  position: 'absolute', inset: '-10px -20px',
                  background: 'radial-gradient(ellipse at 40% 50%, rgba(58,190,255,0.06) 0%, transparent 65%)',
                  pointerEvents: 'none',
                }} />
              </div>

              {/* Divider line */}
              <div style={{ width: '100%', height: 1, background: 'rgba(58,190,255,0.15)', margin: '16px 0' }} />

              {/* MISSION — light weight, cyan */}
              <div style={{
                fontFamily: '"Space Grotesk", sans-serif', fontWeight: 300,
                fontSize: 'clamp(24px, 4vw, 52px)',
                letterSpacing: '-0.01em', lineHeight: 1.0,
                color: '#3ABEFF',
              }}>
                MISSION
              </div>

              {/* CONTROL — bold, starlight */}
              <div style={{
                fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                fontSize: 'clamp(24px, 4vw, 52px)',
                letterSpacing: '-0.03em', lineHeight: 1.05,
                color: '#F8FAFC',
              }}>
                CONTROL
              </div>

              {/* ANALYST — mono, spaced, muted */}
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontWeight: 400,
                fontSize: 'clamp(9px, 1.1vw, 13px)',
                letterSpacing: '0.38em', lineHeight: 2.2,
                color: '#44556B', textTransform: 'uppercase',
              }}>
                ANALYST
              </div>
            </div>

            {/* Tagline */}
            <p style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 'clamp(15px, 1.8vw, 18px)',
              lineHeight: 1.65, color: '#8899AA',
              maxWidth: 420, margin: '32px 0 52px',
            }}>
              Navigate Complexity. Visualize Intelligence.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 64 }}>
              <button className="btn-primary" onClick={() => onEnterApp()}>
                Initialize Mission <span>→</span>
              </button>
              <a href="#algorithms" className="btn-ghost" style={{ textDecoration: 'none' }}>
                Explore Algorithms <span>↓</span>
              </a>
            </div>

            {/* Mission stats */}
            <div style={{
              display: 'flex', gap: 40,
              borderTop: '1px solid rgba(30,45,69,0.8)',
              paddingTop: 32,
            }}>
              {[
                { val: '4', label: 'Algorithms' },
                { val: '60fps', label: 'Real-Time' },
                { val: '∞', label: 'Configurations' },
              ].map(({ val, label }) => (
                <div key={label}>
                  <div style={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 700, fontSize: '1.5rem',
                    color: '#F8FAFC', letterSpacing: '-0.03em',
                  }}>
                    {val}
                  </div>
                  <div style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.5625rem', letterSpacing: '0.12em',
                    color: '#44556B', textTransform: 'uppercase', marginTop: 3,
                  }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Orbital Art */}
          <div style={{
            position: 'relative',
            border: '1px solid rgba(30,45,69,0.8)',
            padding: 32,
            background: 'rgba(13,19,33,0.4)',
          }}>
            {/* Corner brackets */}
            {[
              { top: -1, left: -1 }, { top: -1, right: -1 },
              { bottom: -1, left: -1 }, { bottom: -1, right: -1 },
            ].map((pos, i) => (
              <div key={i} style={{
                position: 'absolute', width: 14, height: 14, ...pos,
                borderTop:    (i === 0 || i === 1) ? '1px solid rgba(58,190,255,0.5)' : 'none',
                borderBottom: (i === 2 || i === 3) ? '1px solid rgba(58,190,255,0.5)' : 'none',
                borderLeft:   (i === 0 || i === 2) ? '1px solid rgba(58,190,255,0.5)' : 'none',
                borderRight:  (i === 1 || i === 3) ? '1px solid rgba(58,190,255,0.5)' : 'none',
              }} />
            ))}

            {/* Status label */}
            <div style={{
              position: 'absolute', top: 12, left: 20,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.5625rem', letterSpacing: '0.14em',
              color: '#3ABEFF', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: '#3ABEFF',
                animation: 'glow-breathe 2s ease-in-out infinite',
              }} />
              Scanner Online
            </div>

            <OrbitalHeroArt />
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
          background: 'linear-gradient(to bottom, transparent, #05060A)',
          pointerEvents: 'none', zIndex: 3,
        }} />
      </section>

      {/* ══ SECTION 02 — ALGORITHM INTELLIGENCE ══ */}
      <section id="algorithms" style={{ paddingTop: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px 60px' }}>
          <p className="section-eyebrow" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'inline-block', width: 28, height: 1, background: '#3ABEFF' }} />
            02 / Algorithm Intelligence
          </p>
          <h2 style={{
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
            fontSize: 'clamp(36px, 5.5vw, 68px)',
            letterSpacing: '-0.04em', lineHeight: 1.0,
            color: '#F8FAFC', maxWidth: 620, margin: 0,
          }}>
            Four algorithms.<br />
            <span style={{ color: '#3ABEFF' }}>One mission.</span>
          </h2>
        </div>

        {algorithms.map((algo, i) => (
          <AlgorithmModule key={algo.id} index={i + 1} {...algo}
            flip={i % 2 === 1}
            onSelect={() => onEnterApp(algo.algo)} />
        ))}
      </section>

      {/* ══ SECTION 03 — NAVIGATION SYSTEMS ══ */}
      <section id="navigation" style={{
        padding: '120px 0',
        borderTop: '1px solid #1E2D45',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background atmosphere */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 50% at 85% 40%, rgba(58,190,255,0.05) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', position: 'relative', zIndex: 1 }}>
          <p className="section-eyebrow" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'inline-block', width: 28, height: 1, background: '#6D5DFF' }} />
            03 / Navigation Systems
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 80, marginBottom: 72, alignItems: 'end',
          }}>
            <h2 style={{
              fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
              fontSize: 'clamp(36px, 5vw, 60px)',
              letterSpacing: '-0.04em', lineHeight: 1.0,
              color: '#F8FAFC', margin: 0,
            }}>
              The scanner is alive before you touch it.
            </h2>
            <p style={{
              fontFamily: '"Inter", sans-serif', fontSize: '1.0625rem',
              lineHeight: 1.75, color: '#8899AA', margin: 0,
            }}>
              A dual-layer canvas renderer with orbital overlays, sector grids, and atmospheric depth.
              Every node state, every path trace, every frontier expansion — visualized in real-time at 60fps.
            </p>
          </div>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: '#1E2D45' }}>
            {[
              { label: 'Dual-Layer Canvas', desc: 'Background static terrain + foreground dynamic algorithm states — maximum performance.', accent: '#3ABEFF' },
              { label: 'Orbital Overlays', desc: 'Sector grid, concentric rings, and mission HUD decorations rendered before interaction.', accent: '#6D5DFF' },
              { label: 'Terrain Painting', desc: 'Draw obstacles, nebula fields, and gravity wells directly. Drag start and goal nodes.', accent: '#00D1B2' },
              { label: 'Timeline Scrubber', desc: 'Step forward, backward, or seek to any point in the algorithm execution history.', accent: '#3ABEFF' },
              { label: 'Search Tree Panel', desc: 'Watch the algorithm\'s decision hierarchy grow in real-time. Zoom, pan, inspect nodes.', accent: '#6D5DFF' },
              { label: 'Mission Telemetry', desc: 'Every run is logged to SQLite. Analytics dashboard with efficiency scoring and charts.', accent: '#00D1B2' },
            ].map(({ label, desc, accent }) => (
              <div key={label} style={{ background: '#05060A', padding: '36px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ width: 4, height: 16, background: accent, borderRadius: 2, flexShrink: 0 }} />
                  <div style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                    fontSize: '1rem', color: '#F8FAFC',
                  }}>
                    {label}
                  </div>
                </div>
                <p style={{
                  fontFamily: '"Inter", sans-serif', fontSize: '0.875rem',
                  lineHeight: 1.65, color: '#44556B', margin: 0,
                }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION 04 — LIVE MISSION CONTROL PREVIEW ══ */}
      <section id="systems" style={{
        padding: '100px 48px',
        borderTop: '1px solid #1E2D45',
        maxWidth: 1200, margin: '0 auto',
      }}>
        <p className="section-eyebrow" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', width: 28, height: 1, background: '#00D1B2' }} />
          04 / Live Mission Control
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 80, alignItems: 'center',
        }}>
          <h2 style={{
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
            fontSize: 'clamp(36px, 5vw, 60px)',
            letterSpacing: '-0.04em', lineHeight: 1.0,
            color: '#F8FAFC', margin: 0,
          }}>
            Every route tells a story.
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {[
              { label: 'Mission Brief', desc: 'Set the origin and target. Choose your algorithm. Configure the terrain.', num: '01' },
              { label: 'Execute', desc: 'Run the algorithm in real-time or step through each decision manually.', num: '02' },
              { label: 'Analyze', desc: 'Review the search tree, telemetry data, path cost, and efficiency score.', num: '03' },
            ].map(({ label, desc, num }) => (
              <div key={num} style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem',
                  letterSpacing: '0.12em', color: '#253450',
                  flexShrink: 0, paddingTop: 2,
                }}>
                  {num}
                </div>
                <div>
                  <div style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                    fontSize: '1rem', color: '#F8FAFC', marginBottom: 6,
                  }}>
                    {label}
                  </div>
                  <p style={{
                    fontFamily: '"Inter", sans-serif', fontSize: '0.875rem',
                    lineHeight: 1.65, color: '#44556B', margin: 0,
                  }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION 05 — LAUNCH EXPERIENCE ══ */}
      <section style={{
        padding: '160px 48px',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
        borderTop: '1px solid #1E2D45',
      }}>
        {/* Atmospheric glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse 60% 50% at 50% 50%, rgba(58,190,255,0.06) 0%, transparent 65%),
            radial-gradient(ellipse 80% 60% at 50% 50%, rgba(109,93,255,0.04) 0%, transparent 70%)
          `,
          pointerEvents: 'none',
        }} />

        <StarField />
        <ParticleField />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <p className="section-eyebrow" style={{ marginBottom: 32 }}>05 / Launch Experience</p>

          <h2 style={{
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
            fontSize: 'clamp(52px, 8vw, 110px)',
            letterSpacing: '-0.05em', lineHeight: 0.9,
            color: '#F8FAFC', marginBottom: 48,
          }}>
            Ready for<br />
            <span style={{ color: '#3ABEFF' }}>mission?</span>
          </h2>

          <p style={{
            fontFamily: '"Inter", sans-serif', fontSize: '1.0625rem',
            lineHeight: 1.7, color: '#8899AA',
            maxWidth: 420, margin: '0 auto 48px',
          }}>
            See intelligence in motion. Every path tells a story.
          </p>

          <button className="btn-primary"
            style={{ fontSize: '0.9375rem', padding: '18px 52px' }}
            onClick={() => onEnterApp()}>
            Initialize Mission Control
            <span style={{ fontSize: '1.1em' }}>→</span>
          </button>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{
        borderTop: '1px solid #1E2D45',
        padding: '20px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
          fontSize: '0.8125rem', letterSpacing: '0.04em', color: '#1E2D45',
        }}>
          MCA
        </div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5625rem',
          letterSpacing: '0.1em', color: '#1E2D45', textTransform: 'uppercase',
        }}>
          Mission Control Analyst
        </div>
      </footer>

    </div>
  );
}
