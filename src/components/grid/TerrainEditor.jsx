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
      name: 'DEBRIS HATCH',
      description: 'Impassable blocks',
      icon: Crosshair,
      activeColor: 'border-critical text-critical bg-critical/10 shadow-[0_0_8px_rgba(255,93,115,0.2)]',
    },
    {
      id: 'weighted',
      name: 'NEBULA CLOUD',
      description: 'Cost: 3 units',
      icon: Waves,
      activeColor: 'border-royal-blue text-royal-blue bg-royal-blue/10 shadow-[0_0_8px_rgba(109,93,255,0.2)]',
    },
    {
      id: 'heavy',
      name: 'GRAVITY WELL',
      description: 'Cost: 5 units',
      icon: Circle,
      activeColor: 'border-deep-violet text-deep-violet bg-deep-violet/10 shadow-[0_0_8px_rgba(142,132,255,0.2)]',
    },
    {
      id: 'clear',
      name: 'ERASE BRUSH',
      description: 'Reset cell',
      icon: Eraser,
      activeColor: 'border-slate-400 text-slate-300 bg-slate-500/10 shadow-[0_0_8px_rgba(255,255,255,0.05)]',
    },
  ];

  const presets = [
    { id: 'orbital-blockades', name: 'Orbital Blockades' },
    { id: 'asteroid-belt', name: 'Asteroid Belt' },
    { id: 'nebula-field', name: 'Nebula Field' },
    { id: 'deep-space', name: 'Deep Space Void' },
  ];

  return (
    <div className="control-module w-full flex flex-col gap-4 select-none relative">
      {/* HUD Corner Brackets */}
      <div className="hud-bracket-tl" />
      <div className="hud-bracket-tr" />
      <div className="hud-bracket-bl" />
      <div className="hud-bracket-br" />

      <div className="control-module-header">
        <div className="flex items-center gap-2">
          <Sliders className="text-royal-blue w-4 h-4" />
          <h2 className="font-cyber-header text-[10px] font-bold text-white uppercase tracking-widest">
            TERRAIN SECTOR WRITER
          </h2>
        </div>
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
              className={`sci-fi-button flex flex-col items-center justify-center gap-1.5 py-3 border text-[9.5px] font-cyber-header rounded select-none disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive ? brush.activeColor : 'border-cyber-gray-light text-slate-500 hover:text-slate-200 bg-cyber-black'
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
        <div className="flex justify-between items-center text-[9px] font-cyber-header uppercase text-slate-500">
          <span>DEBRIS VECTOR DENSITY</span>
          <span className="font-cyber-mono text-royal-blue font-bold">{density}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="50"
          value={density}
          disabled={disabled}
          onChange={(e) => setDensity(parseInt(e.target.value))}
          className="w-full accent-royal-blue cursor-pointer bg-cyber-black rounded h-1 appearance-none border border-cyber-gray-light disabled:opacity-45"
        />
      </div>

      {/* Preset Select Dropdown */}
      <div className="flex flex-col gap-1.5 pt-1">
        <label className="text-[9px] font-cyber-header uppercase tracking-wider text-slate-500">LOAD SECTOR PRESET</label>
        <select
          disabled={disabled}
          onChange={(e) => onLoadPreset(e.target.value)}
          defaultValue=""
          className="w-full font-cyber-mono text-[10px] bg-cyber-black border border-cyber-gray-light text-slate-300 rounded px-2.5 py-2 focus:outline-none focus:border-royal-blue cursor-pointer disabled:opacity-45"
        >
          <option value="" disabled>-- SELECT SECTOR ARCHIVE --</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-3.5 border-t border-cyber-gray-light/30">
        <button
          onClick={() => onGenerateRandom(density)}
          disabled={disabled}
          className="sci-fi-button flex items-center justify-center gap-1.5 py-2.5 text-[9px] font-cyber-header tracking-widest rounded hover:bg-cyber-gray hover:text-white disabled:opacity-45"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>RANDOMIZE</span>
        </button>
        <button
          onClick={onClearAll}
          disabled={disabled}
          className="sci-fi-button flex items-center justify-center gap-1.5 py-2.5 text-[9px] font-cyber-header tracking-widest rounded hover:bg-cyber-gray hover:text-white disabled:opacity-45"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>CLEAR ALL</span>
        </button>
      </div>
    </div>
  );
}
