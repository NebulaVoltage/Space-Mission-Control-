import { useState } from 'react';
import { Crosshair, Waves, Circle, Eraser, Shuffle, Trash2, Sliders } from 'lucide-react';

export default function TerrainEditor({
  activeBrush,
  onBrushChange,
  onGenerateRandom,
  onLoadPreset,
  onClearAll,
  disabled = false,
}) {
  const [density, setDensity] = useState(30);

  const brushes = [
    {
      id: 'obstacle',
      name: 'ASTEROID',
      description: 'Impassable blockades',
      icon: Crosshair,
      activeColor: 'border-red-500 text-red-400 bg-red-500/10 ring-1 ring-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]',
    },
    {
      id: 'weighted',
      name: 'NEBULA',
      description: 'Slow passage (Cost: 3)',
      icon: Waves,
      activeColor: 'border-primary-purple text-primary-purple bg-primary-purple/10 ring-1 ring-primary-purple/30 shadow-[0_0_10px_rgba(139,92,246,0.15)]',
    },
    {
      id: 'heavy',
      name: 'GRAVITY WELL',
      description: 'Severe friction (Cost: 5)',
      icon: Circle,
      activeColor: 'border-accent-violet text-accent-violet bg-accent-violet/10 ring-1 ring-accent-violet/30 shadow-[0_0_10px_rgba(192,132,252,0.15)]',
    },
    {
      id: 'clear',
      name: 'ERASE',
      description: 'Reset grid cell',
      icon: Eraser,
      activeColor: 'border-slate-400 text-slate-300 bg-slate-500/10 ring-1 ring-slate-400/30 shadow-[0_0_10px_rgba(255,255,255,0.05)]',
    },
  ];

  const presets = [
    { id: 'orbital-blockades', name: 'Orbital Blockades' },
    { id: 'asteroid-belt', name: 'Asteroid Belt' },
    { id: 'nebula-field', name: 'Nebula Field' },
    { id: 'deep-space', name: 'Deep Space Void' },
  ];

  return (
    <div className="glass-card p-4 flex flex-col gap-4 shadow-xl select-none relative overflow-hidden">
      <div className="flex items-center gap-2 border-b border-cyber-gray-light pb-2">
        <Sliders className="text-primary-purple w-4 h-4" />
        <h2 className="font-cyber-header text-[11px] font-bold text-white uppercase tracking-wider">
          TERRAIN EDITOR
        </h2>
      </div>

      {/* 2x2 Grid of Brush Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {brushes.map((brush) => {
          const Icon = brush.icon;
          const isActive = activeBrush === brush.id;
          return (
            <button
              key={brush.id}
              onClick={() => !disabled && onBrushChange(brush.id)}
              disabled={disabled}
              title={brush.description}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 border text-[10px] font-cyber-header rounded transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive ? brush.activeColor : 'border-cyber-gray-light text-slate-400 hover:text-slate-200 hover:border-slate-600 bg-cyber-black/35'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-bold tracking-wide">{brush.name}</span>
            </button>
          );
        })}
      </div>

      {/* Density Slider */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex justify-between items-center text-[9px] font-cyber-header uppercase text-slate-400">
          <span>ASTEROID DENSITY</span>
          <span className="font-cyber-mono text-accent-violet font-bold">{density}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="50"
          value={density}
          disabled={disabled}
          onChange={(e) => setDensity(parseInt(e.target.value))}
          className="w-full accent-primary-purple cursor-pointer bg-cyber-black rounded-lg h-1.5 appearance-none border border-cyber-gray-light disabled:opacity-40"
        />
      </div>

      {/* Preset Select Dropdown */}
      <div className="flex flex-col gap-1.5 pt-1">
        <label className="text-[9px] font-cyber-header uppercase tracking-wider text-slate-400">LOAD PRESET</label>
        <div className="relative">
          <select
            disabled={disabled}
            onChange={(e) => onLoadPreset(e.target.value)}
            defaultValue=""
            className="w-full font-cyber-mono text-[11px] bg-cyber-black border border-cyber-gray-light text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-primary-purple cursor-pointer disabled:opacity-40"
          >
            <option value="" disabled>-- SELECT PRESET SYSTEM --</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cyber-gray-light/50">
        <button
          onClick={() => onGenerateRandom(density)}
          disabled={disabled}
          className="flex items-center justify-center gap-1 py-2 bg-cyber-black border border-cyber-gray-light text-slate-300 text-[10px] font-cyber-header tracking-widest rounded hover:bg-cyber-gray hover:text-white transition-all disabled:opacity-40 cursor-pointer"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>RANDOMIZE</span>
        </button>
        <button
          onClick={onClearAll}
          disabled={disabled}
          className="flex items-center justify-center gap-1 py-2 bg-cyber-black border border-cyber-gray-light text-slate-300 text-[10px] font-cyber-header tracking-widest rounded hover:bg-cyber-gray hover:text-white transition-all disabled:opacity-40 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>CLEAR ALL</span>
        </button>
      </div>
    </div>
  );
}
