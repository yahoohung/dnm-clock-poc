import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CLOCK_WORKER_SCRIPT } from '../clock.worker';

describe('Worker Logic (Headless Simulation)', () => {
  let mockSelf: any;
  let mockCtx: any;
  let requestAnimationFrameCallbacks: Function[] = [];
  let mockCancelAnimationFrame: any;

  const loadWorkerScript = () => {
    // We pass the spy as the 3rd argument for cancelAnimationFrame
    const scriptFn = new Function('self', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', CLOCK_WORKER_SCRIPT);
    scriptFn(
      mockSelf,
      (cb: Function) => {
        const id = requestAnimationFrameCallbacks.length;
        requestAnimationFrameCallbacks.push(cb);
        return id;
      },
      mockCancelAnimationFrame,
      performance
    );
  };

  const triggerNextFrame = () => {
    if (requestAnimationFrameCallbacks.length > 0) {
      const cb = requestAnimationFrameCallbacks.shift();
      if (cb) cb();
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    requestAnimationFrameCallbacks = [];
    mockCancelAnimationFrame = vi.fn();
    
    mockCtx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      font: '',
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    };
    mockSelf = { onmessage: null, postMessage: vi.fn() };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes and paints 00:00:00', () => {
    loadWorkerScript();
    mockSelf.onmessage({
      data: {
        type: 'INIT',
        payload: {
          canvas: { getContext: () => mockCtx, width: 800, height: 600 },
          config: { textColor: '#fff' },
          initialSeconds: 0
        }
      }
    });
    expect(mockCtx.fillText).toHaveBeenCalledWith('00:00:00', expect.any(Number), expect.any(Number));
  });

  it('handles PAUSE and RESUME correctly (offset calculation)', () => {
    loadWorkerScript();
    
    // 1. Init
    mockSelf.onmessage({
      data: {
        type: 'INIT',
        payload: {
          canvas: { getContext: () => mockCtx, width: 800, height: 600 },
          config: {},
          initialSeconds: 0
        }
      }
    });

    // 2. Start
    mockSelf.onmessage({ data: { type: 'START' } });
    
    // 3. Run for 10 seconds
    vi.advanceTimersByTime(10000); 
    triggerNextFrame(); 
    expect(mockCtx.fillText).toHaveBeenLastCalledWith('00:00:10', expect.any(Number), expect.any(Number));

    // 4. Pause
    mockSelf.onmessage({ data: { type: 'PAUSE' } });
    
    // VERIFY STOP: cancelAnimationFrame must be called to stop the loop
    expect(mockCancelAnimationFrame).toHaveBeenCalled();

    // 5. Wait 5 seconds
    vi.advanceTimersByTime(5000);
    triggerNextFrame(); // Should do nothing or not be scheduled

    // 6. Resume
    mockSelf.onmessage({ data: { type: 'START' } });
    
    // 7. Advance 2 seconds
    vi.advanceTimersByTime(2000);
    triggerNextFrame();

    expect(mockCtx.fillText).toHaveBeenLastCalledWith('00:00:12', expect.any(Number), expect.any(Number));
  });

  it('handles UPDATE_CONFIG dynamic changes', () => {
    loadWorkerScript();
    
    mockSelf.onmessage({
      data: {
        type: 'INIT',
        payload: {
          canvas: { getContext: () => mockCtx, width: 800, height: 600 },
          config: { textColor: 'white' },
          initialSeconds: 5
        }
      }
    });
    
    mockSelf.onmessage({
      data: {
        type: 'UPDATE_CONFIG',
        payload: { textColor: 'red', glowEffect: false }
      }
    });

    expect(mockCtx.fillStyle).toBe('red');
    expect(mockCtx.shadowBlur).toBe(0);
    expect(mockCtx.fillText).toHaveBeenLastCalledWith('00:00:05', expect.any(Number), expect.any(Number));
  });

  it('handles SET_TIME while running (resets anchor)', () => {
    loadWorkerScript();
    
    mockSelf.onmessage({
      data: {
        type: 'INIT',
        payload: {
          canvas: { getContext: () => mockCtx, width: 800, height: 600 },
          config: {},
          initialSeconds: 0
        }
      }
    });
    mockSelf.onmessage({ data: { type: 'START' } });
    vi.advanceTimersByTime(5000);

    mockSelf.onmessage({
      data: {
        type: 'SET_TIME',
        payload: { seconds: 3600 }
      }
    });

    expect(mockCtx.fillText).toHaveBeenLastCalledWith('01:00:00', expect.any(Number), expect.any(Number));

    vi.advanceTimersByTime(1000);
    triggerNextFrame();
    expect(mockCtx.fillText).toHaveBeenLastCalledWith('01:00:01', expect.any(Number), expect.any(Number));
  });
  
   it('handles ADJUST_TIME (atomic increment) correctly', () => {
    loadWorkerScript();
    mockSelf.onmessage({
      data: {
        type: 'INIT',
        payload: {
          canvas: { getContext: () => mockCtx, width: 800, height: 600 },
          config: {},
          initialSeconds: 0
        }
      }
    });
    mockSelf.onmessage({
      data: { type: 'ADJUST_TIME', payload: { deltaSeconds: 3600 } }
    });
    expect(mockCtx.fillText).toHaveBeenLastCalledWith('01:00:00', expect.any(Number), expect.any(Number));
  });
  
  it('handles RESIZE and recalculates dimensions immediately', () => {
    loadWorkerScript();
    const mockCanvas = { width: 100, height: 100, getContext: () => mockCtx };
    mockSelf.onmessage({
      data: {
        type: 'INIT',
        payload: { canvas: mockCanvas, config: { fontFamily: 'Arial' }, initialSeconds: 10 }
      }
    });

    expect(mockCtx.fillText).toHaveBeenLastCalledWith('00:00:10', 50, 50);

    mockSelf.onmessage({
      data: { type: 'RESIZE', payload: { width: 200, height: 200, dpr: 1 } }
    });

    expect(mockCanvas.width).toBe(200);
    expect(mockCtx.fillText).toHaveBeenLastCalledWith('00:00:10', 100, 100);
  });
});