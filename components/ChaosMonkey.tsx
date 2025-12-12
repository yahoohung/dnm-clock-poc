import React, { useEffect, useState } from 'react';

// Decoupled from the hook file for portability
export interface TimerActions {
  start: () => void;
  pause: () => void;
  setTime: (seconds: number) => void;
}

interface ChaosMonkeyProps {
  actions: TimerActions;
}

export const ChaosMonkey: React.FC<ChaosMonkeyProps> = ({ actions }) => {
  const [isActive, setIsActive] = useState(false);
  const [log, setLog] = useState<string>('Ready');

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const r = Math.random();
      if (r > 0.66) {
        actions.start();
        setLog('CMD: Start');
      } else if (r > 0.33) {
        actions.pause();
        setLog('CMD: Pause');
      } else {
        // Random set time between 0 and 90 minutes
        const randomTime = Math.floor(Math.random() * 5400); 
        actions.setTime(randomTime);
        setLog(`CMD: Set ${randomTime}`);
      }
    }, 100); // Very rapid actions (10 per second)

    return () => clearInterval(interval);
  }, [isActive, actions]);

  return (
    <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-amber-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Chaos Monkey (Worker Stress)
        </h3>
        <div className="font-mono text-xs text-amber-500 bg-black/30 px-2 py-1 rounded">
            {log}
        </div>
      </div>
      
      <p className="text-xs text-slate-400">
        Spams Start/Pause/Set commands to the Worker. Tests message queue integrity.
      </p>

      <button
        onClick={() => setIsActive(!isActive)}
        className={`w-full py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${
          isActive 
            ? 'bg-amber-600 text-white animate-pulse' 
            : 'bg-amber-950 text-amber-200 border border-amber-800 hover:bg-amber-900'
        }`}
      >
        {isActive ? 'Stop Chaos' : 'Unleash Chaos'}
      </button>
    </div>
  );
};