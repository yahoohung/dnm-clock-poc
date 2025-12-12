/**
 * Dedicated Worker Script for the Broadcast Timer.
 * 
 * Note: We export this as a string to maintain "Single File / Copy-Paste" portability
 * and to guarantee loading in environments where serving static worker files 
 * might be complex (e.g. some sandbox environments).
 * 
 * The hook converts this string into a Blob URL.
 */
export const TIMER_WORKER_SCRIPT = `
  const TICK_RATE_MS = 50; // High frequency check (20Hz) to catch the "second boundary" ASAP
  let intervalId = null;

  self.onmessage = function(e) {
    const { type } = e.data;
    
    if (type === 'START') {
      if (intervalId) clearInterval(intervalId);
      // Worker's job is purely to "wake up" the main thread.
      // It does NOT calculate time. It just signals.
      intervalId = setInterval(() => {
        self.postMessage({ type: 'TICK' });
      }, TICK_RATE_MS);
    } 
    else if (type === 'STOP') {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    }
  };
`;