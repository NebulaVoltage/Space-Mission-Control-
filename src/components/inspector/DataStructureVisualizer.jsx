import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowUp, ListCollapse } from 'lucide-react';

export default function DataStructureVisualizer({ snapshot }) {
  if (!snapshot) return null;

  const {
    algorithm,
    dataStructure = { type: 'queue', items: [] },
    currentNode,
  } = snapshot;

  const items = dataStructure.items || [];
  const type = dataStructure.type; // 'queue', 'stack', 'priority_queue'

  const getItemId = (item) => (typeof item === 'string' ? item : item.nodeId);

  const getItemLabel = (item) => {
    if (typeof item === 'string') return `(${item})`;
    const val = item.priority;
    const valStr = typeof val === 'number' ? val.toFixed(1).replace(/\.0$/, '') : String(val);
    
    if (item.f !== undefined) {
      return `(${item.nodeId}) f:${valStr}`;
    }
    return `(${item.nodeId}) d:${valStr}`;
  };

  const renderQueue = () => {
    const maxVisible = 12;
    const visibleItems = items.slice(0, maxVisible);
    const extraCount = items.length - maxVisible;

    return (
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center justify-between text-[9px] font-cyber-header text-slate-500">
          <span className="flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5 text-electric-cyan" /> DEQUEUE (FRONT)</span>
          <span className="font-cyber-mono text-electric-cyan font-bold">SIZE: {items.length}</span>
          <span>ENQUEUE (BACK)</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-1.5 border border-cyber-gray-light bg-cyber-black rounded min-h-16">
          <AnimatePresence initial={false}>
            {visibleItems.length === 0 ? (
              <div className="text-slate-600 text-xs w-full text-center py-2 font-cyber-mono">QUEUE EMPTY</div>
            ) : (
              visibleItems.map((item, idx) => {
                const id = getItemId(item);
                const isHead = idx === 0;
                const isCurrentNeighbor = id === currentNode;
                return (
                  <motion.div
                    key={`${id}-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className={`flex-shrink-0 px-2.5 py-1.5 border text-[10px] font-cyber-mono rounded-sm flex items-center justify-center min-w-16 text-center select-none ${
                      isHead
                        ? 'border-electric-cyan text-electric-cyan bg-electric-cyan/10 font-bold'
                        : isCurrentNeighbor
                        ? 'border-royal-blue text-royal-blue bg-royal-blue/10 font-bold'
                        : 'border-cyber-gray-light text-slate-500 bg-cyber-gray-dark/50'
                    }`}
                  >
                    {getItemLabel(item)}
                  </motion.div>
                );
              })
            )}
            {extraCount > 0 && (
              <div className="flex-shrink-0 px-3 py-1.5 border border-dashed border-cyber-gray-light text-[9px] font-cyber-mono text-slate-500 rounded bg-cyber-black flex items-center justify-center">
                + {extraCount} MORE
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const renderStack = () => {
    const maxVisible = 8;
    const stackItems = [...items].reverse();
    const visibleItems = stackItems.slice(0, maxVisible);
    const extraCount = stackItems.length - maxVisible;

    return (
      <div className="flex flex-col gap-2.5 w-full">
        <div className="flex items-center justify-between text-[9px] font-cyber-header text-slate-500">
          <span className="flex items-center gap-1"><ArrowUp className="w-3.5 h-3.5 text-royal-blue" /> PUSH / POP (TOP)</span>
          <span className="font-cyber-mono text-royal-blue font-bold">SIZE: {items.length}</span>
        </div>
        <div className="flex flex-col gap-1 px-3 py-2 border border-cyber-gray-light bg-cyber-black rounded min-h-24 max-h-56 overflow-y-auto">
          <AnimatePresence initial={false}>
            {visibleItems.length === 0 ? (
              <div className="text-slate-600 text-xs w-full text-center py-6 font-cyber-mono">STACK EMPTY</div>
            ) : (
              visibleItems.map((item, idx) => {
                const id = getItemId(item);
                const isTop = idx === 0;
                return (
                  <motion.div
                    key={`${id}-${idx}`}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.1 }}
                    className={`px-3 py-1.5 border text-[10px] font-cyber-mono rounded-sm flex justify-between items-center select-none ${
                      isTop
                        ? 'border-royal-blue text-royal-blue bg-royal-blue/10 font-bold'
                        : 'border-cyber-gray-light text-slate-500 bg-cyber-gray-dark/50'
                    }`}
                  >
                    <span>{getItemLabel(item)}</span>
                    {isTop && <span className="text-[8px] tracking-wider uppercase font-bold text-royal-blue">TOP</span>}
                  </motion.div>
                );
              })
            )}
            {extraCount > 0 && (
              <div className="text-center py-1.5 border border-dashed border-cyber-gray-light text-[9px] font-cyber-mono text-slate-500 rounded bg-cyber-black/20">
                + {extraCount} MORE ELEMENTS IN DEPTH
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const renderPriorityQueue = () => {
    const maxVisible = 8;
    const visibleItems = items.slice(0, maxVisible);
    const extraCount = items.length - maxVisible;

    return (
      <div className="flex flex-col gap-2.5 w-full">
        <div className="flex items-center justify-between text-[9px] font-cyber-header text-slate-500">
          <span className="flex items-center gap-1"><ListCollapse className="w-3.5 h-3.5 text-electric-cyan" /> EXTRACT MIN (TOP)</span>
          <span className="font-cyber-mono text-electric-cyan font-bold">SIZE: {items.length}</span>
        </div>
        <div className="flex flex-col gap-1 px-3 py-2 border border-cyber-gray-light bg-cyber-black rounded min-h-24 max-h-56 overflow-y-auto">
          <AnimatePresence initial={false}>
            {visibleItems.length === 0 ? (
              <div className="text-slate-600 text-xs w-full text-center py-6 font-cyber-mono">HEAP EMPTY</div>
            ) : (
              visibleItems.map((item, idx) => {
                const id = getItemId(item);
                const isMin = idx === 0;
                const isAStarItem = item.f !== undefined;
                
                return (
                  <motion.div
                    key={`${id}-${idx}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.1 }}
                    className={`px-3 py-1.5 border text-[10px] font-cyber-mono rounded-sm flex justify-between items-center select-none ${
                      isMin
                        ? 'border-electric-cyan text-electric-cyan bg-electric-cyan/10 font-bold'
                        : 'border-cyber-gray-light text-slate-500 bg-cyber-gray-dark/50'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-bold">{getItemLabel(item)}</span>
                      {isAStarItem && (
                        <span className="text-[7.5px] text-slate-500 font-medium leading-none mt-0.5">
                          g:{item.g} + h:{item.h.toFixed(1).replace(/\.0$/, '')}
                        </span>
                      )}
                    </div>
                    {isMin && (
                      <span className="text-[8px] tracking-wider uppercase font-bold text-electric-cyan">
                        NEXT
                      </span>
                    )}
                  </motion.div>
                );
              })
            )}
            {extraCount > 0 && (
              <div className="text-center py-1.5 border border-dashed border-cyber-gray-light text-[9px] font-cyber-mono text-slate-500 rounded bg-cyber-black/20">
                + {extraCount} MORE NODES IN OPEN SET
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="control-module w-full flex flex-col gap-4 select-none">
      {/* HUD Corner Brackets */}
      <div className="hud-bracket-tl" />
      <div className="hud-bracket-tr" />
      <div className="hud-bracket-bl" />
      <div className="hud-bracket-br" />

      <div className="control-module-header">
        <h3 className="font-cyber-header text-[10px] font-bold text-white tracking-widest">
          DATA STRUCTURE FLUID STATE
        </h3>
        <span className="font-cyber-mono text-[8.5px] text-royal-blue font-bold">
          {type === 'priority_queue' ? 'MIN-PRIORITY QUEUE' : type.toUpperCase()}
        </span>
      </div>

      {type === 'queue' && renderQueue()}
      {type === 'stack' && renderStack()}
      {type === 'priority_queue' && renderPriorityQueue()}
    </div>
  );
}
