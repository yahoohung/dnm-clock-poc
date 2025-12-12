import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useBroadcastMatchTimer } from '../useBroadcastMatchTimer';

// We need a way to trigger messages "from" the worker back to the hook.
let workerOnMessageCallback: ((e: MessageEvent) => void) | null = null;

const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();

class MockHookWorker {
  constructor() {
    workerOnMessageCallback = null;
  }
  set onmessage(handler: (e: MessageEvent) => void) {
    workerOnMessageCallback = handler;
  }
  postMessage = mockPostMessage;
  terminate = mockTerminate;
}

describe('useBroadcastMatchTimer Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (window as any).Worker = MockHookWorker;
    window.URL.createObjectURL = vi.fn();
    window.URL.revokeObjectURL = vi.fn();
    workerOnMessageCallback = null;
    vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error logs for negative test
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('updates state when Worker sends TICK message', () => {
    const { result } = renderHook(() => useBroadcastMatchTimer(0));
    act(() => { result.current.start(); });
    vi.advanceTimersByTime(2000);
    act(() => {
      if (workerOnMessageCallback) {
        workerOnMessageCallback({ data: { type: 'TICK' } } as MessageEvent);
      }
    });
    expect(result.current.displayTime).toBe('00:00:02');
  });

  it('pauses correctly', () => {
    const { result } = renderHook(() => useBroadcastMatchTimer(0));
    act(() => { result.current.start(); });
    vi.advanceTimersByTime(5000);
    act(() => { if(workerOnMessageCallback) workerOnMessageCallback({ data: { type: 'TICK' } } as MessageEvent); });
    
    act(() => { result.current.pause(); });
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'STOP' });
  });

  it('handles setTime correctly', () => {
    const { result } = renderHook(() => useBroadcastMatchTimer(0));
    act(() => { result.current.setTime(120); });
    expect(result.current.displayTime).toBe('00:02:00');
  });

  it('terminates worker on unmount (Memory Leak Prevention)', () => {
    const { unmount } = renderHook(() => useBroadcastMatchTimer(0));
    unmount();
    expect(mockTerminate).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('gracefully handles Worker initialization failure', () => {
    // Force Worker to throw during construction
    (window as any).Worker = class BadWorker {
      constructor() { throw new Error('Security Error'); }
    };

    const { result } = renderHook(() => useBroadcastMatchTimer(0));
    
    // Should not crash, but also won't run.
    expect(result.current.displayTime).toBe('00:00:00');
    expect(console.error).toHaveBeenCalledWith('Clock Worker Init Failed:', expect.any(Error));
  });
});