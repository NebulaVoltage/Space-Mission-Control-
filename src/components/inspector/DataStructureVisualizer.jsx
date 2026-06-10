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
    
    // Priority queue structures
    const val = item.priority;
    const valStr = typeof val === 'number' ? val.toFixed(1).replace(/\.0$/, '') : String(val);
    
    if (item.f !== undefined) {
      return `(${item.nodeId}) f:${valStr}`;
    }
    return `(${item.nodeId}) d:${valStr}`;
  };

  const renderQueue = () => {
    // Show first 15 items, truncate remainder
    const maxVisible = 12;
    const visibleItems = items.slice(0, maxVisible);
    const extraCount = items.length - maxVisible;

    return (
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center justify-between text-[10px] font-cyber-header text-slate-500">
          <span className="flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5 text-neon-cyan" /> DEQUEUE (FRONT)</span>
          <span className="font-cyber-mono text-neon-cyan">SIZE: {items.length}</span>
          <span>ENQUEUE (BACK)</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-1 border border-cyber-gray-light bg-cyber-black rounded-lg min-h-16 scrollbar-thin scrollbar-thumb-cyber-gray-light">
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
                    initial={{ opacity: 0, x: 30, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -30, scale: 0.8 }}
                    transition={{ duration: 0.18 }}
                    className={`flex-shrink-0 px-2.5 py-2 border text-[10px] font-cyber-mono rounded-md flex items-center justify-center min-w-16 text-center select-none ${
                      isHead
                        ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10 font-bold shadow-[0_0_8px_rgba(0,210,255,0.15)]'
                        : isCurrentNeighbor
                        ? 'border-neon-amber text-neon-amber bg-neon-amber/5 font-bold'
                        : 'border-cyber-gray-light text-slate-400 bg-cyber-gray/40'
                    }`}
                  >
                    {getItemLabel(item)}
                  </motion.div>
                );
              })
            )}
            {extraCount > 0 && (
              <div className="flex-shrink-0 px-3 py-2 border border-dashed border-cyber-gray-light text-[9px] font-cyber-mono text-slate-500 rounded bg-cyber-black flex items-center justify-center">
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
    // For stack, items are pushed/popped from the back of array in algorithms.js
    // Stack top is the LAST item in items array
    const stackItems = [...items].reverse();
    const visibleItems = stackItems.slice(0, maxVisible);
    const extraCount = stackItems.length - maxVisible;

    return (
      <div className="flex flex-col gap-2.5 w-full">
        <div className="flex items-center justify-between text-[10px] font-cyber-header text-slate-500">
          <span className="flex items-center gap-1"><ArrowUp className="w-3.5 h-3.5 text-neon-purple animate-pulse" /> PUSH / POP (TOP)</span>
          <span className="font-cyber-mono text-neon-purple">SIZE: {items.length}</span>
        </div>
        <div className="flex flex-col gap-1 px-3 py-2 border border-cyber-gray-light bg-cyber-black rounded-lg min-h-24 max-h-56 overflow-y-auto">
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
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.15 }}
                    className={`px-3 py-1.5 border text-[10px] font-cyber-mono rounded flex justify-between items-center select-none ${
                      isTop
                        ? 'border-neon-purple text-neon-purple bg-neon-purple/10 font-bold shadow-[0_0_8px_rgba(157,78,221,0.15)]'
                        : 'border-cyber-gray-light text-slate-400 bg-cyber-gray/40'
                    }`}
                  >
                    <span>{getItemLabel(item)}</span>
                    {isTop && <span className="text-[8px] tracking-wider uppercase font-bold text-neon-purple">TOP</span>}
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
        <div className="flex items-center justify-between text-[10px] font-cyber-header text-slate-500">
          <span className="flex items-center gap-1"><ListCollapse className="w-3.5 h-3.5 text-neon-amber" /> EXTRACT MIN (TOP)</span>
          <span className="font-cyber-mono text-neon-amber">SIZE: {items.length}</span>
        </div>
        <div className="flex flex-col gap-1 px-3 py-2 border border-cyber-gray-light bg-cyber-black rounded-lg min-h-24 max-h-56 overflow-y-auto">
          <AnimatePresence initial={false}>
            {visibleItems.length === 0 ? (
              <div className="text-slate-600 text-xs w-full text-center py-6 font-cyber-mono">HEAP EMPTY</div>
            ) : (
              visibleItems.map((item, idx) => {
                const id = getItemId(item);
                const isMin = idx === 0;
                
                // Detailed breakdown for A* open list items
                const isAStarItem = item.f !== undefined;
                
                return (
                  <motion.div
                    key={`${id}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className={`px-3 py-1.5 border text-[10px] font-cyber-mono rounded flex justify-between items-center select-none ${
                      isMin
                        ? 'border-neon-amber text-neon-amber bg-neon-amber/10 font-bold shadow-[0_0_8px_rgba(255,170,0,0.15)]'
                        : 'border-cyber-gray-light text-slate-400 bg-cyber-gray/40'
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
                      <span className="text-[8px] tracking-wider uppercase font-bold text-neon-amber">
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
    <div className="bg-cyber-gray-dark border border-cyber-gray-light p-4 flex flex-col gap-4 shadow-xl select-none w-full">
      <div className="flex items-center justify-between border-b border-cyber-gray-light pb-2">
        <h3 className="font-cyber-header text-xs font-bold text-slate-200 tracking-wider">
          DATA STRUCTURE FLUID STATE
        </h3>
        <span className="font-cyber-mono text-[9px] text-neon-cyan uppercase">
          {type === 'priority_queue' ? 'MIN-PRIORITY QUEUE' : type.toUpperCase()}
        </span>
      </div>

      {type === 'queue' && renderQueue()}
      {type === 'stack' && renderStack()}
      {type === 'priority_queue' && renderPriorityQueue()}
    </div>
  );
}
