import { useEffect, useState } from 'react';
import { Play, RotateCw, Search, Sliders, Database, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';

export default function TelemetryDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/telemetry');
      if (!res.ok) throw new Error('Failed to fetch telemetry matrix');
      const data = await res.json();
      setLogs(data);
      setError(null);
    } catch (err) {
      console.warn("Telemetry server offline:", err);
      setError('Telemetry database server offline. Booting mock analysis core.');
      // Load mock fallback logs for visualization demo
      setLogs(generateMockLogs());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const generateMockLogs = () => {
    const algos = ['BFS', 'DFS', 'Dijkstra', 'A*'];
    const mock = [];
    for (let i = 0; i < 15; i++) {
      const algo = algos[i % algos.length];
      const explored = Math.round(80 + Math.random() * 200);
      const cost = Math.round(20 + Math.random() * 50);
      const score = Math.round((cost / explored) * 350);
      const eff = Math.min(100, Math.max(12, score));
      mock.push({
        id: 100 - i,
        timestamp: new Date(Date.now() - i * 3600000).toISOString().replace('T', ' ').substring(0, 19),
        algorithm: algo,
        pathFound: Math.random() > 0.15 ? 'Yes' : 'No',
        nodesExplored: explored,
        pathCost: cost,
        efficiencyScore: eff
      });
    }
    return mock;
  };

  const filteredLogs = logs.filter(log => 
    log.algorithm.toLowerCase().includes(search.toLowerCase()) ||
    log.pathFound.toLowerCase().includes(search.toLowerCase())
  );

  // Compute aggregates
  const totalRuns = logs.length;
  const avgEfficiency = totalRuns > 0 
    ? Math.round(logs.reduce((sum, item) => sum + (item.efficiencyScore || 0), 0) / totalRuns)
    : 0;
  const successRate = totalRuns > 0
    ? Math.round((logs.filter(item => item.pathFound === 'Yes').length / totalRuns) * 100)
    : 0;

  // Compute average nodes explored per algorithm for Bar Chart
  const algoAverages = ['BFS', 'DFS', 'Dijkstra', 'A*'].map(name => {
    const matches = logs.filter(item => item.algorithm.toUpperCase() === name.toUpperCase());
    const count = matches.length;
    const avgExplored = count > 0 
      ? Math.round(matches.reduce((sum, item) => sum + (item.nodesExplored || 0), 0) / count)
      : 0;
    return { name, avgExplored };
  });

  // Calculate coordinates for SVG line chart (Efficiency Score over time)
  // Let's plot the last 10 runs in chronological order (left-to-right)
  const lineChartData = [...logs].reverse().slice(-10);
  const chartHeight = 150;
  const chartWidth = 450;
  const paddingX = 40;
  const paddingY = 25;

  const points = lineChartData.map((d, index) => {
    const x = paddingX + (index * (chartWidth - paddingX * 2)) / Math.max(1, lineChartData.length - 1);
    // Y mapped 0-100 efficiency
    const y = chartHeight - paddingY - ((d.efficiencyScore || 0) * (chartHeight - paddingY * 2)) / 100;
    return { x, y, data: d };
  });

  // Construct SVG path for Line
  let linePath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth cubic bezier calculation
      const cpX1 = points[i-1].x + (points[i].x - points[i-1].x) / 2;
      const cpY1 = points[i-1].y;
      const cpX2 = points[i-1].x + (points[i].x - points[i-1].x) / 2;
      const cpY2 = points[i].y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
    }
  }

  // Construct Area under line path
  let areaPath = '';
  if (points.length > 0) {
    areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;
  }

  return (
    <div className="flex flex-col gap-6 w-full text-slate-200">
      {/* Overview stats header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-cyber-gray-dark border border-cyber-gray-light p-4 rounded-lg shadow-xl relative overflow-hidden glass-panel">
        <div className="flex items-center gap-3">
          <Database className="text-primary-purple w-6 h-6 animate-pulse" />
          <div className="flex flex-col">
            <h2 className="font-cyber-header font-extrabold text-base tracking-wider text-white">
              VECTOR TELEMETRY CONTROL CENTER
            </h2>
            <span className="text-[10px] font-cyber-mono tracking-wider text-slate-400">
              REAL-TIME DATABASE STREAM & PERFORMANCE DIAGNOSTICS
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] px-3 py-1.5 rounded font-cyber-mono">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={fetchTelemetry}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-black border border-cyber-gray-light text-[10px] font-cyber-header tracking-wider hover:border-primary-purple hover:text-white rounded transition-all cursor-pointer disabled:opacity-40"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>SYNCHRONIZE CORE</span>
        </button>
      </div>

      {/* Aggregate Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL MISSION SOLVES', value: totalRuns, desc: 'Logged telemetry runs', icon: Database, color: 'text-primary-purple' },
          { label: 'AVG ROUTING EFFICIENCY', value: `${avgEfficiency}%`, desc: 'Optimality ratio', icon: TrendingUp, color: 'text-accent-violet' },
          { label: 'LINK SUCCESS RATE', value: `${successRate}%`, desc: 'Successful routing links', icon: BarChart3, color: 'text-emerald-400' },
          { label: 'ACTIVE DATABASES', value: '1 / 1', desc: 'SQLite active core', icon: Sliders, color: 'text-blue-400' }
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="glass-card p-4 flex flex-col justify-center relative overflow-hidden glass-card-hover">
              <span className="text-[8px] font-cyber-header tracking-widest text-slate-400 mb-1">{c.label}</span>
              <span className="text-xl font-black font-cyber-mono text-white mb-0.5">{c.value}</span>
              <span className="text-[9px] text-slate-500 font-cyber-mono leading-none">{c.desc}</span>
              <Icon className={`absolute right-3 bottom-3 w-8 h-8 opacity-10 ${c.color}`} />
            </div>
          );
        })}
      </div>

      {/* Charts Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 w-full">
        {/* Line Chart: Efficiency Score */}
        <div className="md:col-span-7 glass-card p-4 flex flex-col gap-3 h-[250px] relative">
          <div className="flex justify-between items-center border-b border-cyber-gray-light pb-2 select-none">
            <span className="font-cyber-header text-[10px] text-slate-300 font-bold uppercase tracking-wider">
              EFFICIENCY PERFORMANCE MATRIX
            </span>
            <span className="font-cyber-mono text-[9px] text-primary-purple">
              LAST 10 MISSION SOLVES
            </span>
          </div>

          <div className="relative flex-grow flex items-center justify-center">
            {lineChartData.length === 0 ? (
              <span className="text-slate-600 text-xs font-cyber-mono">NO TELEMETRY DATA RECORDED</span>
            ) : (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full block overflow-visible">
                <defs>
                  <linearGradient id="purple-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.00" />
                  </linearGradient>
                  <linearGradient id="purple-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>

                {/* Y Axis Grid Lines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = chartHeight - paddingY - (val * (chartHeight - paddingY * 2)) / 100;
                  return (
                    <g key={val} className="opacity-20">
                      <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#1f2533" strokeDasharray="2 3" />
                      <text x={paddingX - 10} y={y + 3} textAnchor="end" fill="#b4b8c5" className="font-cyber-mono text-[7px]">
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {/* Horizontal X Axis line */}
                <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="#1f2533" className="opacity-40" />

                {/* Gradient area */}
                <path d={areaPath} fill="url(#purple-area)" />

                {/* Main line */}
                <path d={linePath} fill="none" stroke="url(#purple-line)" strokeWidth="1.8" />

                {/* Data point circles */}
                {points.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredPoint === idx ? 4.5 : 2.5}
                    fill={hoveredPoint === idx ? '#c084fc' : '#8b5cf6'}
                    stroke="#ffffff"
                    strokeWidth={hoveredPoint === idx ? 1.5 : 1}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </svg>
            )}

            {/* Custom SVG Tooltip inside SVG parent container */}
            {hoveredPoint !== null && points[hoveredPoint] && (
              <div 
                className="absolute z-10 bg-cyber-gray-dark border border-primary-purple text-slate-200 px-2 py-1.5 rounded font-cyber-mono text-[8px] flex flex-col gap-0.5 shadow-lg shadow-black/50 pointer-events-none"
                style={{
                  left: `${(points[hoveredPoint].x / chartWidth) * 100}%`,
                  top: `${(points[hoveredPoint].y / chartHeight) * 90}%`,
                  transform: 'translate(-50%, -110%)'
                }}
              >
                <span className="font-bold text-white uppercase">{points[hoveredPoint].data.algorithm}</span>
                <span>EFFICIENCY: {points[hoveredPoint].data.efficiencyScore}%</span>
                <span>COST: {points[hoveredPoint].data.pathCost}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart: Avg Nodes Explored */}
        <div className="md:col-span-5 glass-card p-4 flex flex-col gap-3 h-[250px]">
          <div className="flex justify-between items-center border-b border-cyber-gray-light pb-2 select-none">
            <span className="font-cyber-header text-[10px] text-slate-300 font-bold uppercase tracking-wider">
              ALGORITHM COMPASS SCALING
            </span>
            <span className="font-cyber-mono text-[9px] text-accent-violet">
              AVERAGE NODES EXPANDED
            </span>
          </div>

          <div className="relative flex-grow flex items-center justify-center">
            {totalRuns === 0 ? (
              <span className="text-slate-600 text-xs font-cyber-mono">NO TELEMETRY RECORDED</span>
            ) : (
              <svg viewBox="0 0 320 150" className="w-full h-full block overflow-visible">
                <defs>
                  <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>

                {/* Calculate sizes */}
                {(() => {
                  const maxVal = Math.max(30, ...algoAverages.map(a => a.avgExplored));
                  const bPaddingX = 35;
                  const bPaddingY = 20;
                  const svgH = 150;
                  const svgW = 320;
                  const plotW = svgW - bPaddingX * 2;
                  const plotH = svgH - bPaddingY * 2;

                  return algoAverages.map((item, idx) => {
                    const barWidth = 32;
                    const spacing = plotW / Math.max(1, algoAverages.length);
                    const x = bPaddingX + idx * spacing + (spacing - barWidth) / 2;
                    const barHeight = maxVal > 0 ? (item.avgExplored / maxVal) * plotH : 0;
                    const y = svgH - bPaddingY - barHeight;

                    return (
                      <g key={item.name} className="group cursor-pointer">
                        {/* Bar grid background helper */}
                        <line x1={x + barWidth / 2} y1={bPaddingY} x2={x + barWidth / 2} y2={svgH - bPaddingY} stroke="#1f2533" strokeDasharray="1 3" className="opacity-20" />

                        {/* Visual Bar Rect */}
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx="4"
                          fill="url(#bar-grad)"
                          className="hover:opacity-85 hover:shadow-lg transition-all"
                        />

                        {/* Top value badge */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 5}
                          textAnchor="middle"
                          fill="#ffffff"
                          className="font-cyber-mono text-[7px] font-bold"
                        >
                          {item.avgExplored}
                        </text>

                        {/* Bottom Label */}
                        <text
                          x={x + barWidth / 2}
                          y={svgH - 5}
                          textAnchor="middle"
                          fill="#b4b8c5"
                          className="font-cyber-header text-[8px] font-bold"
                        >
                          {item.name}
                        </text>
                      </g>
                    );
                  });
                })()}
                {/* Horizontal X Axis */}
                <line x1="15" y1="130" x2="305" y2="130" stroke="#1f2533" className="opacity-40" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Filterable Table */}
      <div className="glass-card p-4 flex flex-col gap-4 shadow-xl select-none w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-cyber-gray-light pb-3 gap-3">
          <span className="font-cyber-header text-xs font-bold text-slate-200 tracking-wider">
            RAW TELEMETRY SOLVE LOGS
          </span>

          {/* Search filter input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="SEARCH BY CORES / STATUS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-cyber-black/70 border border-cyber-gray-light text-[10px] font-cyber-mono rounded text-slate-300 focus:outline-none focus:border-primary-purple placeholder:text-slate-600 transition-colors"
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left font-cyber-mono text-[10px]">
            <thead>
              <tr className="border-b border-cyber-gray-light/50 text-slate-500 uppercase tracking-widest text-[8px] font-cyber-header">
                <th className="py-2.5 px-3">RUN INDEX</th>
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">ALGORITHM CORE</th>
                <th className="py-2.5 px-3">LINK CAPTURE</th>
                <th className="py-2.5 px-3 text-right">EXPLORED NODES</th>
                <th className="py-2.5 px-3 text-right">PATH COST</th>
                <th className="py-2.5 px-3 text-right">EFFICIENCY RATIO</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => {
                const isSuccess = log.pathFound === 'Yes';
                return (
                  <tr 
                    key={log.id || idx} 
                    className="border-b border-cyber-gray-light/30 hover:bg-cyber-gray-dark/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-400">
                      #{String(log.id).padStart(4, '0')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold">
                      {log.algorithm.toUpperCase()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                        isSuccess
                          ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
                          : 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
                      }`}>
                        {isSuccess ? 'LOCKED' : 'FAILED'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-300">
                      {log.nodesExplored}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-300">
                      {isSuccess ? log.pathCost : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-primary-purple">{log.efficiencyScore}%</span>
                        <div className="w-12 h-1 bg-cyber-black rounded-full overflow-hidden border border-cyber-gray-light/40">
                          <div 
                            className="h-full bg-gradient-to-r from-primary-purple to-accent-violet"
                            style={{ width: `${log.efficiencyScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-600">
                    AWAITING SOLVE TELEMETRY...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
