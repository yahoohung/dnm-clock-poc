import React, { useState, useEffect, useRef } from 'react';

// A single "heavy" cell.
// intentionally not memoised to force re-render every parent tick.
const HeavyCell: React.FC<{ index: number; tick: number }> = ({ index, tick }) => {
  // Artificial heavy calculation per cell to burn CPU cycles during render
  const expensiveMath = Math.sin(index * tick) * Math.cos(index);
  
  const hue = (index + tick) % 360;
  const lightness = 40 + (expensiveMath * 10);
  
  return (
    <div 
      style={{ 
        backgroundColor: `hsl(${hue}, 70%, ${lightness}%)`,
        width: '100%',
        height: '100%',
      }} 
    />
  );
};

export const RenderLagSimulator = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [itemCount, setItemCount] = useState(1500);
  const [tick, setTick] = useState(0);
  const reqIdRef = useRef<number>(0);
  const [fps, setFps] = useState(60);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  useEffect(() => {
    if (!isEnabled) {
      cancelAnimationFrame(reqIdRef.current);
      return;
    }

    const loop = () => {
      // Force React to re-render the entire grid every single frame
      setTick(t => t + 5);
      
      // Calculate FPS
      const now = performance.now();
      frameCountRef.current++;
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      reqIdRef.current = requestAnimationFrame(loop);
    };

    reqIdRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(reqIdRef.current);
  }, [isEnabled]);

  return (
    <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-purple-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          Render Lag Simulator
        </h3>
        {isEnabled && (
          <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${fps < 30 ? 'bg-red-500 text-white' : 'bg-green-900 text-green-300'}`}>
            {fps} FPS
          </span>
        )}
      </div>
      
      <p className="text-xs text-slate-400">
        Spawns thousands of un-memoised components that re-render every frame. 
        Tests if the Timer stays accurate even when React is struggling to paint.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
            <button
                onClick={() => setIsEnabled(!isEnabled)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${
                isEnabled
                    ? 'bg-purple-600 text-white animate-pulse' 
                    : 'bg-purple-950 text-purple-200 border border-purple-800 hover:bg-purple-900'
                }`}
            >
                {isEnabled ? 'Stop Lag' : 'Start Lag'}
            </button>
        </div>

        <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Load Intensity</span>
                <span>{itemCount} Nodes</span>
            </div>
            <input 
                type="range" 
                min="100" 
                max="5000" 
                step="100"
                value={itemCount}
                onChange={(e) => setItemCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                disabled={isEnabled}
            />
        </div>

        {/* The Grid of Doom */}
        <div 
            className="grid gap-[1px] bg-black/50 p-1 rounded h-32 overflow-hidden content-start opacity-80"
            style={{ 
                gridTemplateColumns: `repeat(auto-fill, minmax(8px, 1fr))`,
                gridAutoRows: '8px'
            }}
        >
            {isEnabled ? (
                Array.from({ length: itemCount }).map((_, i) => (
                    <HeavyCell key={i} index={i} tick={tick} />
                ))
            ) : (
                <div className="col-span-full h-full flex items-center justify-center text-slate-600 text-xs italic">
                    Lag Generator Inactive
                </div>
            )}
        </div>
      </div>
    </div>
  );
};