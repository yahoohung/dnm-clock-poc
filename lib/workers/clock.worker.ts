/**
 * ============================================================================
 * MODULE: High-Precision Mission Clock Kernel (Dedicated Worker)
 * * SECURITY LEVEL: STRICT (CSP Compliant - worker-src 'self')
 * * PERFORMANCE: Zero-Allocation Loop
 * ============================================================================
 */

// Note: We export as string to ensure portability without bundler reliance for worker loading
export const CLOCK_WORKER_SCRIPT = `
// -- Global Scope --
let canvas = null;
let ctx = null;
let animationFrameId = null;

// [OPTIMISATION] Pre-allocate strings (00-59).
// Eliminates string allocation during the render loop.
const DIGITS = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

const state = {
  baseTimeMs: 0,
  startTimeMs: 0,
  isRunning: false,
  lastRenderedSecond: -1,
  width: 0,
  height: 0,
  dpr: 1,
  config: {
    backgroundColor: '#0f172a',
    textColor: '#22c55e',
    fontFamily: "'Courier New', monospace",
    glowEffect: true,
    showDot: true
  }
};

function paint(displaySeconds) {
  // Safety check
  if (!ctx || state.width === 0 || state.height === 0) return;
  
  const { width, height, dpr, config } = state;

  // 1. Clear Buffer
  ctx.clearRect(0, 0, width, height);

  // 2. Background
  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // 3. Typography
  // Adaptive font size based on container.
  // [FIX] Adjusted divisor from 5 to 6.5 to prevent horizontal clipping of the glow effect
  // and ensuring the 8-character string (00:00:00) fits comfortably with margins.
  const fontSize = Math.min(width / 6.5, height / 1.5); 
  ctx.font = \`bold \${fontSize}px \${config.fontFamily}\`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 4. Time String Composition (Zero GC)
  // [OPTIMISATION] Use lookup table instead of real-time formatting
  // Handle negative time gracefully (optional, but good for robustness)
  const absSeconds = Math.abs(displaySeconds);
  const h = DIGITS[Math.floor(absSeconds / 3600) % 60]; 
  const m = DIGITS[Math.floor((absSeconds % 3600) / 60)];
  const s = DIGITS[Math.floor(absSeconds % 60)];
  
  // Simple prefix for negative if needed, though usually match timers are positive
  const prefix = displaySeconds < 0 ? '-' : '';
  const timeText = \`\${prefix}\${h}:\${m}:\${s}\`;

  // 5. Draw Text
  ctx.fillStyle = config.textColor;
  if (config.glowEffect) {
    ctx.shadowColor = config.textColor;
    ctx.shadowBlur = 20 * dpr;
  } else {
    ctx.shadowBlur = 0;
  }
  ctx.fillText(timeText, width / 2, height / 2);
  
  // 6. Alive Indicator (Red Dot)
  if (config.showDot && absSeconds % 2 === 0) {
    ctx.beginPath();
    const dotRadius = fontSize / 12;
    // Position dot relative to width, but ensure it doesn't overlap text area too much
    const dotX = width - (dotRadius * 4);
    const dotY = dotRadius * 4;
    
    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = config.glowEffect ? 10 * dpr : 0;
    ctx.fill();
  }
}

function loop() {
  if (!state.isRunning) return;

  const now = performance.now();
  const elapsedMs = now - state.startTimeMs;
  const totalMs = state.baseTimeMs + elapsedMs;
  const currentSecond = Math.floor(totalMs / 1000);

  // [OPTIMISATION] Dirty Check: Only paint if the second has changed
  if (currentSecond !== state.lastRenderedSecond) {
    state.lastRenderedSecond = currentSecond;
    paint(currentSecond);
  }

  animationFrameId = requestAnimationFrame(loop);
}

self.onmessage = function(e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT':
      canvas = payload.canvas;
      // desynchronized: true hints to UA to skip composition for lower latency
      ctx = canvas.getContext('2d', { 
        alpha: false, 
        desynchronized: true 
      });
      
      state.config = payload.config;
      state.baseTimeMs = payload.initialSeconds * 1000;
      state.lastRenderedSecond = payload.initialSeconds;
      
      paint(payload.initialSeconds);
      break;

    case 'RESIZE':
      // [FIX] Critical: Resize the backing bitmap store.
      // Ensures 1:1 pixel mapping for sharp text on high DPI.
      if (canvas) {
          canvas.width = payload.width;
          canvas.height = payload.height;
      }
      state.width = payload.width;
      state.height = payload.height;
      state.dpr = payload.dpr;
      
      // Force repaint immediately
      if (state.lastRenderedSecond >= 0) {
          paint(state.lastRenderedSecond);
      }
      break;

    case 'UPDATE_CONFIG':
      state.config = payload;
      if (state.lastRenderedSecond >= 0) paint(state.lastRenderedSecond);
      break;

    case 'START':
      if (state.isRunning) return;
      state.isRunning = true;
      state.startTimeMs = performance.now();
      animationFrameId = requestAnimationFrame(loop);
      break;

    case 'PAUSE':
      if (!state.isRunning) return;
      state.isRunning = false;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      state.baseTimeMs += (performance.now() - state.startTimeMs);
      break;

    case 'SET_TIME':
      state.baseTimeMs = payload.seconds * 1000;
      if (state.isRunning) {
        state.startTimeMs = performance.now();
      }
      state.lastRenderedSecond = payload.seconds;
      paint(payload.seconds);
      break;

    case 'ADJUST_TIME':
      // payload.deltaSeconds can be positive or negative
      state.baseTimeMs += payload.deltaSeconds * 1000;
      
      // Calculate current total immediately for UI feedback
      let currentTotalMs = state.baseTimeMs;
      if (state.isRunning) {
        currentTotalMs += (performance.now() - state.startTimeMs);
      }
      
      const newSecond = Math.floor(currentTotalMs / 1000);
      state.lastRenderedSecond = newSecond;
      paint(newSecond);
      break;
  }
};
`;