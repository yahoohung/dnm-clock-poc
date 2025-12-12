import React, { useRef, useState } from 'react';
import { CpuStressTest } from './components/CpuStressTest';
import { ChaosMonkey } from './components/ChaosMonkey';
import { RenderLagSimulator } from './components/RenderLagSimulator';
import { MissionClock } from './components/MissionClock';
import { NaiveClock, NaiveClockHandle } from './components/NaiveClock';

function App() {
  // We no longer use the hook for display/logic.
  // State is now inside the MissionClock worker.
  const clockControllerRef = useRef<any>(null);
  const naiveClockRef = useRef<NaiveClockHandle>(null);
  
  // Local UI state for buttons (optimistic updates)
  const [isRunning, setIsRunning] = useState(false);

  // Helper actions to wrap the ref
  const actions = {
    start: () => {
      clockControllerRef.current?.start();
      naiveClockRef.current?.start();
      setIsRunning(true);
    },
    pause: () => {
      clockControllerRef.current?.pause();
      naiveClockRef.current?.pause();
      setIsRunning(false);
    },
    setTime: (s: number) => {
      clockControllerRef.current?.setTime(s);
      naiveClockRef.current?.setTime(s);
      // Usually setting time doesn't stop it if it's running, 
      // but let's assume for safety we don't change running state automatically
    }
  };
  
  // Quick presets for common sports
  const presets = [
    { label: 'Reset (00:00)', value: 0 },
    { label: 'Halftime (45:00)', value: 45 * 60 },
    { label: 'Fulltime (90:00)', value: 90 * 60 },
    { label: 'Overtime (120:00)', value: 120 * 60 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 flex flex-col items-center">
      
      <header className="max-w-4xl w-full mb-8 flex justify-between items-end border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            DNM Clock PoC
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            OffscreenCanvas Worker Engine vs. Main Thread Implementation
          </p>
        </div>
        <div className="text-right hidden md:block">
           <div className="flex items-center gap-2 text-xs text-slate-400">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             Engine: Hybrid Comparison
           </div>
        </div>
      </header>

      <main className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: VISUAL OUTPUT */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Display: Mission Clock */}
          <div className="flex flex-col gap-4">
            
            {/* HERO CLOCK (WORKER) */}
            <div className="bg-black rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden group h-64 flex items-center justify-center">
                <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                    <div className="px-2 py-1 bg-green-900/50 border border-green-800 rounded text-[10px] font-bold text-green-400 uppercase tracking-widest">
                        Worker Thread
                    </div>
                </div>
                
                <MissionClock 
                controllerRef={clockControllerRef}
                initialSeconds={0}
                className="w-full h-full"
                config={{
                    textColor: isRunning ? '#22c55e' : '#64748b',
                    glowEffect: true
                }}
                />
            </div>

            {/* COMPARISON CLOCK (MAIN THREAD) */}
            <div className="bg-slate-900 rounded-xl border border-red-900/30 p-4 flex items-center justify-between relative overflow-hidden">
                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-red-600/50"></div>
                
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">
                        Main Thread (Standard)
                    </span>
                    <span className="text-xs text-slate-500 max-w-[150px]">
                        Subject to UI freezing & jitter
                    </span>
                </div>

                <div className="text-right">
                    <NaiveClock 
                        ref={naiveClockRef} 
                        className={`text-4xl md:text-5xl font-bold tracking-tighter transition-colors duration-200 ${
                            isRunning ? 'text-red-500' : 'text-slate-700'
                        }`}
                    />
                </div>
            </div>
          </div>

          {/* Standard Controls */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Sync Control (Controls Both)</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={isRunning ? actions.pause : actions.start}
                className={`h-14 rounded-lg font-bold text-lg tracking-wide shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  isRunning 
                    ? 'bg-amber-500 hover:bg-amber-400 text-black' 
                    : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                {isRunning ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    PAUSE
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    START
                  </>
                )}
              </button>
              
              <button
                onClick={() => actions.setTime(0)}
                className="h-14 rounded-lg font-bold text-lg tracking-wide bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                RESET
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => actions.setTime(preset.value)}
                  className="px-3 py-2 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STRESS TESTS */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 h-full">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Stress Testing Lab
            </h2>
            
            <div className="space-y-6">
              {/* CPU Stress */}
              <CpuStressTest />
              
              {/* Render Stress (Now extremely relevant for OffscreenCanvas comparison) */}
              <RenderLagSimulator />

              {/* Chaos Monkey */}
              <ChaosMonkey actions={actions} />

              {/* Edge Case Instructions */}
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 space-y-3">
                <h3 className="text-blue-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Validation Scenarios
                </h3>
                <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                   <li>
                    <strong className="text-blue-300">The "Freeze" Test:</strong> Click <strong>"Freeze 2.0s"</strong> above. Watch how the <span className="text-red-400">Main Thread Clock</span> completely stops updating for 2 seconds, while the <span className="text-green-400">Worker Clock</span> continues ticking smoothly without interruption.
                  </li>
                   <li>
                    <strong className="text-blue-300">Immunity to Lag:</strong> Enable "Start Lag" at max intensity. The <span className="text-red-400">Main Thread Clock</span> will stutter or update unevenly (FPS drops). The <span className="text-green-400">Worker Clock</span> remains silky smooth (60fps).
                  </li>
                  <li>
                    <strong className="text-blue-300">Tab Throttling:</strong> Switch tabs for 5 minutes. Return. Both should eventually match, but the Main Thread clock might visually "catch up" rapidly, while the Worker clock was never behind.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;