import { useEffect, useRef, useState, useCallback } from 'react';
import * as E from '../../engine/eventTypes.js';

export default function Timeline({
  events = [],
  currentStep = -1,
  totalSteps = 0,
  onSeek,
  status = E.SimStatus.IDLE,
}) {
  const trackRef = useRef(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Map progress to percentage (0% to 100%)
  const percentage = totalSteps > 0 
    ? ((currentStep + 1) / totalSteps) * 100 
    : 0;

  // Handle calculation of seek step from clientX
  const handleScrub = useCallback((clientX) => {
    const track = trackRef.current;
    if (!track || totalSteps === 0) return;

    const rect = track.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const boundedRatio = Math.min(Math.max(ratio, 0), 1);
    
    // Map ratio to [-1, totalSteps - 1]
    const step = Math.round(boundedRatio * totalSteps) - 1;
    const finalStep = Math.max(-1, Math.min(step, totalSteps - 1));
    
    if (onSeek) {
      onSeek(finalStep);
    }
  }, [totalSteps, onSeek]);

  // Window-level mouse listeners when dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isScrubbing) {
        handleScrub(e.clientX);
      }
    };

    const handleMouseUp = () => {
      if (isScrubbing) {
        setIsScrubbing(false);
      }
    };

    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, handleScrub]);

  const handleMouseDown = (e) => {
    if (totalSteps === 0) return;
    setIsScrubbing(true);
    handleScrub(e.clientX);
  };

  // Get color and visibility for tick marks of significant events
  const getTickDetails = (type) => {
    switch (type) {
      case E.NODE_EXPANDED:
        return { color: 'bg-royal-blue', show: true };
      case E.BACKTRACK:
        return { color: 'bg-critical', show: true };
      case E.PATH_TRACED:
        return { color: 'bg-electric-cyan', show: true };
      case E.ALGORITHM_COMPLETE:
        return { color: 'bg-white', show: true };
      default:
        return { color: '', show: false };
    }
  };

  const currentEvent = events[currentStep] || null;
  const description = currentEvent?.explanation || 'Simulation standby. Click Play or drag the playhead.';

  return (
    <div className="control-module p-4 flex flex-col gap-3 w-full select-none relative">
      {/* HUD Corner Brackets */}
      <div className="hud-bracket-tl" />
      <div className="hud-bracket-tr" />
      <div className="hud-bracket-bl" />
      <div className="hud-bracket-br" />

      <div className="flex justify-between items-center text-[9px] font-cyber-header text-slate-500">
        <span>TIMELINE TELEMETRY SCRUBBER</span>
        <span className="font-cyber-mono text-electric-cyan font-bold">
          {totalSteps > 0 ? `${Math.round(percentage)}%` : '0%'}
        </span>
      </div>

      {/* Progress Track Bar */}
      <div className="relative py-2 cursor-pointer" onMouseDown={handleMouseDown}>
        {/* Track */}
        <div
          ref={trackRef}
          className="h-1.5 w-full bg-cyber-black border border-cyber-gray-light rounded-sm relative overflow-visible"
        >
          {/* Filled track progress */}
          <div
            className="h-full bg-royal-blue rounded-sm"
            style={{ width: `${percentage}%` }}
          />

          {/* Playhead handle */}
          {totalSteps > 0 && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded bg-white border border-royal-blue -ml-1.5 transition-transform ${
                isScrubbing ? 'scale-110 border-electric-cyan' : ''
              }`}
              style={{ left: `${percentage}%` }}
            />
          )}

          {/* Tick marks for significant events */}
          {totalSteps > 0 && events.map((evt, idx) => {
            const tick = getTickDetails(evt.type);
            if (!tick.show) return null;
            const posPct = ((idx + 1) / totalSteps) * 100;
            return (
              <div
                key={idx}
                title={`${evt.type} at step ${idx + 1}`}
                className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${tick.color}`}
                style={{ left: `${posPct}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Current Step Explanation Panel */}
      <div className="bg-cyber-black border border-cyber-gray-light/35 p-2.5 rounded flex items-center">
        <p className="font-cyber-mono text-xs text-slate-400 leading-relaxed">
          <span className="text-electric-cyan font-bold tracking-widest mr-2.5">
            [SYS_LOG]
          </span>
          {description}
        </p>
      </div>
    </div>
  );
}
