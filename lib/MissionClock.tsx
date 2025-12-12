import React, { useEffect, useRef, useMemo } from 'react';
import { CLOCK_WORKER_SCRIPT } from './workers/clock.worker';

/**
 * Configuration options for the clock's visual appearance.
 */
export interface ClockStyleConfig {
  /** Background color of the canvas (CSS color string) */
  backgroundColor: string;
  /** Color of the digits (CSS color string) */
  textColor: string;
  /** Font family for the digits (monospace recommended) */
  fontFamily: string;
  /** Whether to show a glow/shadow effect behind digits */
  glowEffect: boolean;
  /** Whether to show the pulsing activity dot indicating worker status */
  showDot: boolean;
}

const DEFAULT_CONFIG: ClockStyleConfig = {
  backgroundColor: '#0f172a',
  textColor: '#22c55e',
  fontFamily: "'Courier New', monospace",
  glowEffect: true,
  showDot: true,
};

/**
 * Props for the MissionClock component.
 */
export interface MissionClockProps {
  /** Initial time in seconds to display (default: 0) */
  initialSeconds?: number;
  /** Optional style configuration overrides */
  config?: Partial<ClockStyleConfig>;
  /** CSS class names for the container div */
  className?: string;
  /** 
   * Mutable ref to access imperative controls (start/pause/setTime).
   * Useful when controlling the clock from a parent component or external store.
   */
  controllerRef?: React.MutableRefObject<any>;
}

/**
 * A high-performance, off-thread rendering clock component.
 * 
 * ============================================================================
 * COMPONENT: Mission Clock (React 18 Hardened)
 * * SECURITY: CSP Compliant (Import URL)
 * * STABILITY: React 18 Strict Mode Safe (Imperative DOM)
 * ============================================================================
 * 
 * Uses `OffscreenCanvas` inside a dedicated Web Worker to render time.
 * This ensures the clock remains smooth (60fps) and accurate even when 
 * the main React thread is blocked or stuttering.
 * 
 * @param props - {@link MissionClockProps}
 * @returns A React component wrapping the offscreen canvas
 * 
 * @example
 * ```tsx
 * <MissionClock 
 *   initialSeconds={60} 
 *   config={{ textColor: '#00ff00' }} 
 *   className="w-full h-64"
 * />
 * ```
 */
export const MissionClock = ({ 
  initialSeconds = 0, 
  config = {}, 
  className = "",
  controllerRef 
}: MissionClockProps) => {
  
  // [FIX] Ref points to container DIV, not Canvas directly
  const containerRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  
  const activeConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  useEffect(() => {
    if (!containerRef.current) return;

    // ------------------------------------------------------------------------
    // [FIX] React 18 Strategy: Imperative Creation
    // We manually create Canvas to avoid React Render cycle interference.
    // This ensures that every time the Effect runs (Worker init), we have a
    // fresh, non-transferred Canvas element. Solves "InvalidStateError".
    // ------------------------------------------------------------------------
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    containerRef.current.appendChild(canvas);

    // Worker Instantiation (Blob URL for portability)
    const blob = new Blob([CLOCK_WORKER_SCRIPT], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    workerRef.current = worker;

    // Transfer Control
    // Since canvas is freshly created, it will not throw InvalidStateError
    const offscreen = canvas.transferControlToOffscreen();
    
    worker.postMessage(
      { 
        type: 'INIT', 
        payload: { 
          canvas: offscreen, 
          config: activeConfig,
          initialSeconds 
        } 
      }, 
      [offscreen]
    );

    // ResizeObserver: Watch container size
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        
        worker.postMessage({
          type: 'RESIZE',
          payload: {
            // Send physical pixel dimensions
            width: Math.round(width * dpr), 
            height: Math.round(height * dpr),
            dpr: dpr
          }
        });
      }
    });
    observer.observe(containerRef.current);

    // Controller Binding for Parent Access
    if (controllerRef) {
      controllerRef.current = {
        start: () => worker.postMessage({ type: 'START' }),
        pause: () => worker.postMessage({ type: 'PAUSE' }),
        setTime: (s: number) => worker.postMessage({ type: 'SET_TIME', payload: { seconds: s } }),
        adjustTime: (delta: number) => worker.postMessage({ 
          type: 'ADJUST_TIME', 
          payload: { deltaSeconds: delta } 
        })
      };
    }

    // Cleanup
    return () => {
      observer.disconnect();
      worker.terminate();
      workerRef.current = null;
      URL.revokeObjectURL(workerUrl);
      
      // [FIX] Important: Manually remove canvas to keep DOM clean
      if (containerRef.current && containerRef.current.contains(canvas)) {
        containerRef.current.removeChild(canvas);
      }
    };
  }, []); // Empty dependency ensures logic runs once per mount cycle

  // Dynamic Config Update
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'UPDATE_CONFIG',
        payload: activeConfig
      });
    }
  }, [activeConfig]);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      // Ensure min-height before canvas loads
      style={{ minHeight: '1px' }} 
    />
  );
};