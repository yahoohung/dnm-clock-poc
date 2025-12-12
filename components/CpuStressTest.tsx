import React, { useState } from 'react';

export const CpuStressTest = () => {
  const [blockingStatus, setBlockingStatus] = useState<'idle' | 'blocking'>('idle');

  const blockMainThread = (durationMs: number) => {
    setBlockingStatus('blocking');
    // We use setTimeout to allow the React state to update ("blocking" status)
    // before we actually freeze the thread.
    setTimeout(() => {
      const start = performance.now();
      while (performance.now() - start < durationMs) {
        // Artificially block the main thread
        // The Timer Worker will keep ticking in background, but React won't render.
        // When this loop finishes, the Timer should "jump" to correct time immediately
        // without drift.
      }
      setBlockingStatus('idle');
    }, 50);
  };

  return (
    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-red-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Main Thread Blocker (Unhappy Path)
        </h3>
        {blockingStatus === 'blocking' && (
          <span className="text-xs font-bold text-red-500 animate-pulse">THREAD BLOCKED</span>
        )}
      </div>
      
      <p className="text-xs text-slate-400">
        Simulates heavy CPU load (e.g., complex calculations, large parsers).
        <br />
        <span className="text-white font-bold">Watch the Red Clock stop</span> while the Green Clock keeps ticking!
      </p>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => blockMainThread(500)}
          className="px-3 py-2 bg-red-950 hover:bg-red-900 text-red-200 text-xs font-mono rounded border border-red-800 transition-colors"
          disabled={blockingStatus === 'blocking'}
        >
          Freeze 0.5s
        </button>
        <button
          onClick={() => blockMainThread(2000)}
          className="px-3 py-2 bg-red-950 hover:bg-red-900 text-red-200 text-xs font-mono rounded border border-red-800 transition-colors"
          disabled={blockingStatus === 'blocking'}
        >
          Freeze 2.0s
        </button>
        <button
          onClick={() => blockMainThread(5000)}
          className="px-3 py-2 bg-red-950 hover:bg-red-900 text-red-200 text-xs font-mono rounded border border-red-800 transition-colors"
          disabled={blockingStatus === 'blocking'}
        >
          Freeze 5.0s
        </button>
      </div>
    </div>
  );
};