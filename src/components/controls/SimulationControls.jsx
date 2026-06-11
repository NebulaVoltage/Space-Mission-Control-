import { SkipBack, StepBack, Play, Pause, StepForward, Gauge } from 'lucide-react';
import { SimStatus } from '../../engine/eventTypes.js';

export default function SimulationControls({
  status = SimStatus.IDLE,
  currentStep = -1,
  totalSteps = 0,
  speed = 5,
  onPlay,
  onPause,
  onStep,
  onStepBack,
  onReset,
  onSpeedChange,
}) {
  const isPlaying = status === SimStatus.RUNNING;
  const isComplete = status === SimStatus.COMPLETE;
  const isIdle = status === SimStatus.IDLE;

  // Formatting steps
  const displayStep = currentStep === -1 ? 0 : currentStep + 1;
  const displayTotal = totalSteps;

  return (
    <div className="glass-card px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl select-none w-full relative overflow-hidden">
      {/* Step Counter (Left) */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[9px] font-cyber-header uppercase tracking-wider text-slate-400">SIMULATION STEP</span>
          <span className="font-cyber-mono text-sm text-primary-purple font-bold tracking-widest min-w-32">
            STEP {String(displayStep).padStart(3, '0')} / {String(displayTotal).padStart(3, '0')}
          </span>
        </div>
        
        {isComplete && (
          <span className="bg-neon-green/10 border border-neon-green/35 text-neon-green font-cyber-header text-[9px] font-bold px-2 py-0.5 rounded tracking-widest animate-pulse">
            COMPLETE
          </span>
        )}
        {isPlaying && (
          <span className="bg-primary-purple/10 border border-primary-purple/35 text-primary-purple font-cyber-header text-[9px] font-bold px-2 py-0.5 rounded tracking-widest animate-pulse">
            RUNNING
          </span>
        )}
        {status === SimStatus.PAUSED && (
          <span className="bg-neon-amber/10 border border-neon-amber/35 text-accent-violet font-cyber-header text-[9px] font-bold px-2 py-0.5 rounded tracking-widest">
            PAUSED
          </span>
        )}
      </div>

      {/* Transport Playback Buttons (Center) */}
      <div className="flex items-center gap-1.5 bg-cyber-black/55 border border-cyber-gray-light p-1.5 rounded-lg">
        {/* Reset / Jump to start */}
        <button
          onClick={onReset}
          disabled={isIdle || isPlaying}
          title="Reset Simulation"
          className="p-2 rounded bg-cyber-gray/40 border border-cyber-gray-light/60 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-cyber-gray-light/60 cursor-pointer transition-all"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Step Back */}
        <button
          onClick={onStepBack}
          disabled={isIdle || isPlaying || displayStep <= 0}
          title="Step Backward (Rewind)"
          className="p-2 rounded bg-cyber-gray/40 border border-cyber-gray-light/60 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-cyber-gray-light/60 cursor-pointer transition-all"
        >
          <StepBack className="w-4 h-4" />
        </button>

        {/* Play / Pause Toggle */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={isComplete && !isPlaying}
          title={isPlaying ? "Pause Simulation" : "Start/Resume Simulation"}
          className={`p-3 rounded-lg border cursor-pointer transition-all ${
            isPlaying
              ? 'bg-primary-purple/15 border-primary-purple text-primary-purple shadow-[0_0_15px_rgba(139,92,246,0.2)]'
              : 'bg-primary-purple hover:bg-primary-purple/90 border-transparent text-white hover:scale-105'
          } disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed`}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-primary-purple" /> : <Play className="w-4 h-4 fill-white" />}
        </button>

        {/* Step Forward */}
        <button
          onClick={onStep}
          disabled={isPlaying || isComplete || displayTotal === 0}
          title="Step Forward"
          className="p-2 rounded bg-cyber-gray/40 border border-cyber-gray-light/60 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-cyber-gray-light/60 cursor-pointer transition-all"
        >
          <StepForward className="w-4 h-4" />
        </button>
      </div>

      {/* Speed Slider (Right) */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <Gauge className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="flex flex-col w-full md:w-36">
          <div className="flex justify-between items-center text-[9px] font-cyber-header uppercase tracking-wider text-slate-500 mb-0.5">
            <span>FREQUENCY</span>
            <span className="font-cyber-mono text-primary-purple font-bold">{speed} Hz</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={speed}
            onChange={(e) => onSpeedChange && onSpeedChange(parseInt(e.target.value))}
            className="w-full accent-primary-purple cursor-pointer bg-cyber-black rounded-lg h-1.5 appearance-none border border-cyber-gray-light"
          />
        </div>
      </div>
    </div>
  );
}
