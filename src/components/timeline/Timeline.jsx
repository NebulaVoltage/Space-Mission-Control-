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
        return { color: 'bg-neon-cyan/80', show: true };
      case E.BACKTRACK:
        return { color: 'bg-neon-purple', show: true };
      case E.PATH_TRACED:
        return { color: 'bg-neon-green', show: true };
      case E.ALGORITHM_COMPLETE:
        return { color: 'bg-white shadow-[0_0_4px_#fff]', show: true };
      default:
        return { color: '', show: false };
    }
  };

  const currentEvent = events[currentStep] || null;
  const description = currentEvent?.explanation || 'Simulation standby. Click Play or drag the playhead.';

  return (
    <div className="bg-cyber-gray-dark border border-cyber-gray-light p-4 flex flex-col gap-3 shadow-xl w-full select-none">
      <div className="flex justify-between items-center text-[10px] font-cyber-header text-slate-500">
        <span>TIMELINE TELEMETRY SCRUBBER</span>
        <span className="font-cyber-mono text-neon-cyan">
          {totalSteps > 0 ? `${Math.round(percentage)}%` : '0%'}
        </span>
      </div>

      {/* Progress Track Bar */}
      <div className="relative py-2 cursor-pointer" onMouseDown={handleMouseDown}>
        {/* Track Track */}
        <div
          ref={trackRef}
          className="h-1.5 w-full bg-cyber-black border border-cyber-gray-light rounded-full relative overflow-visible"
        >
          {/* Filled track progress */}
          <div
            className="h-full bg-gradient-to-r from-neon-cyan to-neon-cyan/40 rounded-full"
            style={{ width: `${percentage}%` }}
          />

          {/* Draggable Playhead handle */}
          {totalSteps > 0 && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-cyber-black border-2 border-neon-cyan shadow-[0_0_8px_rgba(0,210,255,0.4)] -ml-1.5 transition-shadow ${
                isScrubbing ? 'shadow-[0_0_12px_rgba(0,210,255,0.7)] border-white' : ''
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
      <div className="bg-cyber-black border border-cyber-gray-light/40 p-2.5 rounded min-h-12 flex items-center shadow-inner">
        <p className="font-cyber-mono text-xs text-slate-400 leading-relaxed">
          <span className="text-neon-cyan font-bold tracking-wider mr-2">
            [SYS_LOG]
          </span>
          {description}
        </p>
      </div>
    </div>
  );
}
