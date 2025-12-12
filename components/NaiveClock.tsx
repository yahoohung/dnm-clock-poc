import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface NaiveClockHandle {
    start: () => void;
    pause: () => void;
    setTime: (s: number) => void;
    adjustTime: (delta: number) => void;
}

// Pure Helper
const formatTime = (totalSeconds: number): string => {
  const absSeconds = Math.abs(totalSeconds);
  const h = Math.floor(absSeconds / 3600);
  const m = Math.floor((absSeconds % 3600) / 60);
  const s = Math.floor(absSeconds % 60);
  const prefix = totalSeconds < 0 ? '-' : '';
  return `${prefix}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const NaiveClock = forwardRef<NaiveClockHandle, { className?: string }>(({ className }, ref) => {
    const [displayTime, setDisplayTime] = useState("00:00:00");
    const [isRunning, setIsRunning] = useState(false);
    
    // Internal mutable state for time calculation
    const state = useRef({
        startTime: 0,
        baseTime: 0, // ms
    });

    useImperativeHandle(ref, () => ({
        start: () => {
            if (isRunning) return;
            state.current.startTime = Date.now();
            setIsRunning(true);
        },
        pause: () => {
            if (!isRunning) return; // Already paused
            const now = Date.now();
            state.current.baseTime += (now - state.current.startTime);
            setIsRunning(false);
        },
        setTime: (seconds: number) => {
             state.current.baseTime = seconds * 1000;
             // If currently running, we must reset the start anchor to "now"
             // to prevent the old elapsed time from being added to the new base.
             if (isRunning) {
                 state.current.startTime = Date.now();
             }
             setDisplayTime(formatTime(seconds));
        },
        adjustTime: (delta: number) => {
            state.current.baseTime += delta * 1000;
            // Force immediate update
            const now = Date.now();
            const diff = isRunning ? (now - state.current.startTime) : 0;
            const totalMs = state.current.baseTime + diff;
            const totalSec = Math.floor(totalMs / 1000);
            setDisplayTime(formatTime(totalSec));
        }
    }));

    useEffect(() => {
        if (!isRunning) return;

        // The "Naive" implementation:
        // 1. Runs on Main Thread
        // 2. Uses setInterval
        // 3. Triggers React Re-renders via setState
        // This will freeze completely if the Main Thread is blocked.
        const intervalId = setInterval(() => {
            const now = Date.now();
            const diff = now - state.current.startTime;
            const totalMs = state.current.baseTime + diff;
            const totalSec = Math.floor(totalMs / 1000);
            setDisplayTime(formatTime(totalSec));
        }, 50); // 20fps update

        return () => clearInterval(intervalId);
    }, [isRunning]);

    return (
        <div className={`font-mono tabular-nums ${className}`}>
            {displayTime}
        </div>
    );
});

NaiveClock.displayName = 'NaiveClock';