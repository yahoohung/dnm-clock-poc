import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { TIMER_WORKER_SCRIPT } from './workers/timer.worker';

// -----------------------------------------------------------------------------
// 2. Types
// -----------------------------------------------------------------------------

/**
 * Represents the current state of the broadcast timer.
 */
export type TimerState = {
  /** The formatted time string in HH:MM:SS format (e.g., "00:45:00") */
  displayTime: string;
  /** The total number of seconds elapsed (integer) */
  totalSeconds: number;
  /** Indicates whether the timer is currently active and counting */
  isRunning: boolean;
};

/**
 * Interface for controlling the timer.
 */
export type TimerActions = {
  /** Starts the timer from the current position */
  start: () => void;
  /** Pauses the timer at the current position */
  pause: () => void;
  /** 
   * Sets the timer to a specific absolute value.
   * @param seconds - The target time in seconds
   */
  setTime: (seconds: number) => void;
};

// -----------------------------------------------------------------------------
// 3. Pure Helper Functions
// -----------------------------------------------------------------------------
const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// -----------------------------------------------------------------------------
// 4. The Hook
// -----------------------------------------------------------------------------

/**
 * A headless React hook for managing a high-precision, drift-free broadcast timer.
 * 
 * This hook spawns a dedicated Web Worker to handle timekeeping, ensuring that
 * the timer remains accurate even if the main UI thread is blocked by heavy 
 * rendering or computation.
 * 
 * @param initialSeconds - The starting time in seconds (default: 0)
 * @returns An object containing the current `TimerState` and `TimerActions`
 * 
 * @example
 * ```tsx
 * const { displayTime, start, pause, setTime } = useBroadcastMatchTimer(0);
 * 
 * return (
 *   <div>
 *     <h1>{displayTime}</h1>
 *     <button onClick={start}>Start</button>
 *     <button onClick={pause}>Pause</button>
 *   </div>
 * );
 * ```
 */
export const useBroadcastMatchTimer = (initialSeconds: number = 0): TimerState & TimerActions => {
  
  // The Store: Holds the "Single Source of Truth" outside of React's Render Cycle
  const store = useRef({
    // Data Model
    baseDurationMs: initialSeconds * 1000,
    startTimeMs: 0,
    isRunning: false,
    
    // Snapshot for React (Cache)
    snapshot: {
      displayTime: formatTime(initialSeconds),
      totalSeconds: initialSeconds,
      isRunning: false
    },

    // Worker Reference
    worker: null as Worker | null,
    
    // Subscription Management
    listeners: new Set<() => void>(),
  });

  // ---------------------------------------------------------------------------
  // Internal Logic: The "Brain"
  // ---------------------------------------------------------------------------
  
  const calculateState = useCallback(() => {
    const { isRunning, baseDurationMs, startTimeMs } = store.current;
    
    let currentTotalMs = baseDurationMs;
    
    if (isRunning) {
      // Delta Calculation: (Now - Start) + Base
      // Using performance.now() for monotonic guarantee
      const now = performance.now();
      currentTotalMs += (now - startTimeMs);
    }

    const totalSeconds = Math.max(0, Math.floor(currentTotalMs / 1000));
    return {
      totalSeconds,
      displayTime: formatTime(totalSeconds),
      isRunning
    };
  }, []);

  const emitChange = useCallback(() => {
    const newState = calculateState();
    const oldState = store.current.snapshot;

    // Optimisation: Only notify React if the "visible second" or "running state" changed.
    // This filters out the 50ms worker ticks that occur within the same second.
    if (newState.totalSeconds !== oldState.totalSeconds || newState.isRunning !== oldState.isRunning) {
      store.current.snapshot = newState;
      store.current.listeners.forEach(listener => listener());
    }
  }, [calculateState]);

  // ---------------------------------------------------------------------------
  // External Store Integration (React 18+)
  // ---------------------------------------------------------------------------
  
  const subscribe = useCallback((listener: () => void) => {
    store.current.listeners.add(listener);
    return () => store.current.listeners.delete(listener);
  }, []);

  const getSnapshot = useCallback(() => {
    return store.current.snapshot;
  }, []);

  // ---------------------------------------------------------------------------
  // Worker Lifecycle (Resource Safety)
  // ---------------------------------------------------------------------------
  
  useEffect(() => {
    let workerUrl: string | null = null;

    try {
      // Create a Blob from the extracted string
      const blob = new Blob([TIMER_WORKER_SCRIPT], { type: 'application/javascript' });
      workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      store.current.worker = worker;

      worker.onmessage = (e) => {
        if (e.data.type === 'TICK') {
          // Received "Wake Up" signal -> Calculate Time -> Update UI
          emitChange();
        }
      };
      
    } catch (err) {
      console.error('Clock Worker Init Failed:', err);
    }

    return () => {
      // Cleanup: Terminate thread & Revoke Blob URL to prevent memory leaks
      store.current.worker?.terminate();
      if (workerUrl) URL.revokeObjectURL(workerUrl);
    };
  }, [emitChange]);

  // ---------------------------------------------------------------------------
  // Public Actions (Stable Identity)
  // ---------------------------------------------------------------------------

  const start = useCallback(() => {
    const s = store.current;
    if (s.isRunning) return;

    s.isRunning = true;
    s.startTimeMs = performance.now(); // Anchor start time
    s.worker?.postMessage({ type: 'START' });
    emitChange();
  }, [emitChange]);

  const pause = useCallback(() => {
    const s = store.current;
    if (!s.isRunning) return;

    // Freeze the elapsed time into baseDuration
    const now = performance.now();
    s.baseDurationMs += (now - s.startTimeMs);
    s.isRunning = false;
    
    s.worker?.postMessage({ type: 'STOP' });
    emitChange();
  }, [emitChange]);

  const setTime = useCallback((seconds: number) => {
    const s = store.current;
    
    // Atomic Update:
    // 1. Update the base time
    s.baseDurationMs = seconds * 1000;
    
    // 2. Phase Reset: If running, reset the start anchor to NOW.
    // This aligns the .000ms boundary to this exact button press.
    if (s.isRunning) {
      s.startTimeMs = performance.now();
    }
    
    emitChange(); // Force immediate update
  }, [emitChange]);

  // ---------------------------------------------------------------------------
  // Return Sync External Store State
  // ---------------------------------------------------------------------------
  const state = useSyncExternalStore(subscribe, getSnapshot);

  return {
    ...state,
    start,
    pause,
    setTime
  };
};