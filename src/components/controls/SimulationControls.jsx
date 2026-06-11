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
  const isPlaying  = status === SimStatus.RUNNING;
  const isComplete = status === SimStatus.COMPLETE;
  const isIdle     = status === SimStatus.IDLE;

  const displayStep  = currentStep === -1 ? 0 : currentStep + 1;
  const displayTotal = totalSteps;

  const statusLabel = isPlaying ? 'RUNNING' : isComplete ? 'COMPLETE' : status === SimStatus.PAUSED ? 'PAUSED' : 'STANDBY';
  const statusColor = isPlaying ? '#00D1B2' : isComplete ? '#22C55E' : status === SimStatus.PAUSED ? '#FF9A3C' : '#5C5650';

  return (
    <div style={{
      background: '#111111',
      border: '1px solid #2E2E2E',
      borderRadius: 2,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      position: 'relative',
      flexWrap: 'wrap',
    }}>
      {/* HUD corner brackets */}
      <div className="hud-bracket-tl" /><div className="hud-bracket-tr" />
      <div className="hud-bracket-bl" /><div className="hud-bracket-br" />

      {/* Step counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.5rem', letterSpacing: '0.14em',
            color: '#5C5650', textTransform: 'uppercase', marginBottom: 3,
          }}>
            Step
          </div>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '1.0625rem', fontWeight: 700,
            color: '#F5F1E8', letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            {String(displayStep).padStart(3, '0')}
            <span style={{ color: '#2E2E2E', fontWeight: 400, fontSize: '0.9em' }}>
              &nbsp;/&nbsp;{String(displayTotal).padStart(3, '0')}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          padding: '4px 10px',
          border: `1px solid ${statusColor}40`,
          background: `${statusColor}0D`,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.5rem', letterSpacing: '0.14em',
          color: statusColor, textTransform: 'uppercase', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 4, height: 4, borderRadius: '50%',
            background: statusColor, display: 'inline-block',
          }} />
          {statusLabel}
        </div>
      </div>

      {/* Playback buttons */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: '#1A1A1A', border: '1px solid #2E2E2E',
        padding: '6px',
      }}>
        {/* Reset */}
        <button
          onClick={onReset}
          disabled={isIdle || isPlaying}
          title="Reset"
          style={{
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: '1px solid transparent',
            color: '#5C5650', cursor: 'pointer', borderRadius: 2,
            transition: 'all 0.12s', opacity: (isIdle || isPlaying) ? 0.25 : 1,
          }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.color = '#F5F1E8'; e.currentTarget.style.borderColor = '#2E2E2E'; } }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5C5650'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          <SkipBack size={14} />
        </button>

        {/* Step back */}
        <button
          onClick={onStepBack}
          disabled={isIdle || isPlaying || displayStep <= 0}
          title="Step Back"
          style={{
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: '1px solid transparent',
            color: '#5C5650', cursor: 'pointer', borderRadius: 2,
            transition: 'all 0.12s', opacity: (isIdle || isPlaying || displayStep <= 0) ? 0.25 : 1,
          }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.color = '#F5F1E8'; e.currentTarget.style.borderColor = '#2E2E2E'; } }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5C5650'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          <StepBack size={14} />
        </button>

        {/* Play/Pause — coral primary action */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={isComplete && !isPlaying}
          title={isPlaying ? 'Pause' : 'Play'}
          style={{
            width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isPlaying ? 'rgba(255,122,0,0.12)' : '#FF7A00',
            border: isPlaying ? '1px solid rgba(255,122,0,0.4)' : '1px solid transparent',
            color: isPlaying ? '#FF7A00' : '#080808',
            cursor: 'pointer', borderRadius: 2,
            transition: 'all 0.12s',
            opacity: (isComplete && !isPlaying) ? 0.25 : 1,
            fontWeight: 700,
          }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        {/* Step forward */}
        <button
          onClick={onStep}
          disabled={isPlaying || isComplete || displayTotal === 0}
          title="Step Forward"
          style={{
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: '1px solid transparent',
            color: '#5C5650', cursor: 'pointer', borderRadius: 2,
            transition: 'all 0.12s', opacity: (isPlaying || isComplete || displayTotal === 0) ? 0.25 : 1,
          }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.color = '#F5F1E8'; e.currentTarget.style.borderColor = '#2E2E2E'; } }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5C5650'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          <StepForward size={14} />
        </button>
      </div>

      {/* Speed slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
        <Gauge size={14} color="#5C5650" style={{ flexShrink: 0 }} />
        <div style={{ flexGrow: 1 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.5rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 5,
          }}>
            <span style={{ color: '#5C5650' }}>Speed</span>
            <span style={{ color: '#FF7A00', fontWeight: 600 }}>{speed} Hz</span>
          </div>
          <input
            type="range" min={1} max={100} value={speed}
            onChange={e => onSpeedChange && onSpeedChange(parseInt(e.target.value))}
            style={{
              width: '100%', cursor: 'pointer',
              accentColor: '#FF7A00',
              height: '2px',
            }}
          />
        </div>
      </div>
    </div>
  );
}
