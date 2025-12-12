import React, { useEffect, useRef, useMemo } from 'react';
import { CLOCK_WORKER_SCRIPT } from '../workers/clock.worker';

export interface ClockStyleConfig {
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  glowEffect: boolean;
  showDot: boolean;
}

const DEFAULT_CONFIG: ClockStyleConfig = {
  backgroundColor: '#0f172a',
  textColor: '#22c55e',
  fontFamily: "'Courier New', monospace",
  glowEffect: true,
  showDot: true,
};

interface MissionClockProps {
  initialSeconds?: number;
  config?: Partial<ClockStyleConfig>;
  className?: string;
  controllerRef?: React.MutableRefObject<any>;
}

/**
 * ============================================================================
 * COMPONENT: Mission Clock (React 18 Hardened)
 * * SECURITY: CSP Compliant (Import URL)
 * * STABILITY: React 18 Strict Mode Safe (Imperative DOM)
 * ============================================================================
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
        setTime: (s: number) => worker.postMessage({ type: 'SET_TIME', payload: { seconds: s } })
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