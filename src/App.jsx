import GridSimulator from './components/GridSimulator';

export default function App() {
  return (
    <div className="bg-cyber-black text-slate-200 font-sans theme-cyan overflow-x-hidden min-h-screen relative">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent"></div>
        <div className="absolute top-0 left-1/3 right-1/3 h-[80px] bg-neon-cyan/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="relative z-10 p-4 md:p-8 flex flex-col items-center justify-center blueprint-mesh min-h-screen">
        <GridSimulator />
      </div>
    </div>
  );
}
