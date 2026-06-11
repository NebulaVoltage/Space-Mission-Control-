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

  const displayStep = currentStep === -1 ? 0 : currentStep + 1;
  const displayTotal = totalSteps;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-cyber-gray-dark border border-cyber-gray-light rounded select-none w-full relative">
      {/* HUD Corner Brackets */}
      <div className="hud-bracket-tl" />
      <div className="hud-bracket-tr" />
      <div className="hud-bracket-bl" />
      <div className="hud-bracket-br" />

      {/* Step Counter Readout */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[9px] font-cyber-header uppercase tracking-widest text-slate-500">RESOLVING SECTOR VECTORS</span>
          <span className="font-cyber-mono text-base text-white font-bold tracking-widest min-w-36">
            STEP {String(displayStep).padStart(3, '0')} / {String(displayTotal).padStart(3, '0')}
          </span>
        </div>
        
        {isComplete && (
          <span className="bg-success/10 border border-success/30 text-success font-cyber-header text-[9px] font-bold px-2.5 py-0.5 rounded tracking-widest">
            VECTOR_RESOLVED
          </span>
        )}
        {isPlaying && (
          <span className="bg-electric-cyan/10 border border-electric-cyan/30 text-electric-cyan font-cyber-header text-[9px] font-bold px-2.5 py-0.5 rounded tracking-widest">
            VECTOR_RESOLVING
          </span>
        )}
        {status === SimStatus.PAUSED && (
          <span className="bg-royal-blue/10 border border-royal-blue/30 text-deep-violet font-cyber-header text-[9px] font-bold px-2.5 py-0.5 rounded tracking-widest">
            VECTOR_PAUSED
          </span>
        )}
      </div>

      {/* Tactile Playback Controls */}
      <div className="flex items-center gap-1.5 bg-cyber-gray border border-cyber-gray-light p-1.5 rounded">
        {/* Reset */}
        <button
          onClick={onReset}
          disabled={isIdle || isPlaying}
          title="Reset Simulation"
          className="p-2.5 rounded bg-cyber-gray-dark border border-cyber-gray-light text-slate-400 hover:text-white hover:border-electric-cyan disabled:opacity-25 transition-all cursor-pointer"
        >
          <SkipBack className="w-4.5 h-4.5" />
        </button>

        {/* Step Back */}
        <button
          onClick={onStepBack}
          disabled={isIdle || isPlaying || displayStep <= 0}
          title="Step Backward"
          className="p-2.5 rounded bg-cyber-gray-dark border border-cyber-gray-light text-slate-400 hover:text-white hover:border-electric-cyan disabled:opacity-25 transition-all cursor-pointer"
        >
          <StepBack className="w-4.5 h-4.5" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={isComplete && !isPlaying}
          title={isPlaying ? "Pause Simulation" : "Start/Resume Simulation"}
          className={`p-3 rounded border font-bold uppercase tracking-wider text-xs transition-all cursor-pointer ${
            isPlaying
              ? 'bg-royal-blue/15 border-royal-blue text-deep-violet'
              : 'bg-royal-blue hover:bg-royal-blue/85 border-transparent text-white'
          } disabled:opacity-25`}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-deep-violet" /> : <Play className="w-5 h-5 fill-white" />}
        </button>

        {/* Step Forward */}
        <button
          onClick={onStep}
          disabled={isPlaying || isComplete || displayTotal === 0}
          title="Step Forward"
          className="p-2.5 rounded bg-cyber-gray-dark border border-cyber-gray-light text-slate-400 hover:text-white hover:border-electric-cyan disabled:opacity-25 transition-all cursor-pointer"
        >
          <StepForward className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Calibration Slider */}
      <div className="flex items-center gap-3.5 w-full md:w-auto">
        <Gauge className="w-4.5 h-4.5 text-slate-500 shrink-0" />
        <div className="flex flex-col w-full md:w-44">
          <div className="flex justify-between items-center text-[9px] font-cyber-header uppercase tracking-widest text-slate-500 mb-0.5">
            <span>RESOLVING_FREQUENCY</span>
            <span className="font-cyber-mono text-electric-cyan font-bold">{speed} Hz</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={speed}
            onChange={(e) => onSpeedChange && onSpeedChange(parseInt(e.target.value))}
            className="w-full accent-royal-blue cursor-pointer bg-cyber-black rounded h-1 appearance-none border border-cyber-gray-light"
          />
        </div>
      </div>
    </div>
  );
}
