import { motion } from 'framer-motion';
import { Rocket, Activity, Zap, ShieldAlert, ChevronDown } from 'lucide-react';

export default function Dashboard({ onLaunch }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cyber-black text-slate-200 p-8 relative overflow-hidden">
      
      {/* Background Starfield effect */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 blueprint-mesh" />
      <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-neon-cyan/10 blur-[100px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 flex flex-col items-center text-center max-w-4xl"
      >
        <div className="w-20 h-20 border border-neon-cyan/50 flex items-center justify-center rounded-2xl shadow-[0_0_30px_var(--brand-cyan-glow)] bg-cyber-gray-dark mb-8">
          <Rocket className="text-neon-cyan w-10 h-10" />
        </div>
        
        <h1 className="text-4xl md:text-6xl font-cyber-header font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neon-cyan to-[#00b0ff] tracking-widest mb-6 text-glow-cyan">
          SPACE MISSION CONTROL
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 font-cyber-mono mb-12 max-w-2xl leading-relaxed">
          Deep Space Communications link vector router. Analyze propagation routing algorithms (BFS, DFS, Dijkstra, A*) in real-time across cosmic anomalies, rough terrain, and orbital obstructions.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
          {[
            { title: "ZERO-LATENCY", value: "60 FPS", icon: Zap, color: "text-neon-cyan" },
            { title: "LIVE TELEMETRY", value: "ACTIVE", icon: Activity, color: "text-neon-green" },
            { title: "HAZARD AVOIDANCE", value: "OPTIMIZED", icon: ShieldAlert, color: "text-neon-amber" }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.2 + 0.4 }}
              className="bg-cyber-gray-dark border border-cyber-gray-light p-6 rounded-xl flex flex-col items-center shadow-lg"
            >
              <stat.icon className={`${stat.color} w-8 h-8 mb-4 opacity-80`} />
              <div className="text-2xl font-black font-cyber-mono text-white mb-1 tracking-wider">{stat.value}</div>
              <div className="text-xs font-cyber-header text-slate-500 tracking-widest">{stat.title}</div>
            </motion.div>
          ))}
        </div>
        
        <motion.button
          onClick={onLaunch}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative px-12 py-4 bg-gradient-to-r from-neon-cyan to-[#00b0ff] hover:from-[#00b0ff] hover:to-neon-cyan text-cyber-black font-cyber-header font-black text-lg tracking-widest rounded-lg shadow-[0_0_25px_var(--brand-cyan-glow)] transition-all cursor-pointer flex items-center gap-3 group"
        >
          <span>INITIATE SIMULATOR</span>
          <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
        </motion.button>
      </motion.div>
    </div>
  );
}
