import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TIMER_WORKER_SCRIPT } from '../timer.worker';

describe('Timer Worker Logic', () => {
  let mockSelf: any;

  const loadWorkerScript = () => {
    const scriptFn = new Function('self', 'setInterval', 'clearInterval', TIMER_WORKER_SCRIPT);
    scriptFn(
        mockSelf,
        setInterval,
        clearInterval
    );
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockSelf = {
      onmessage: null,
      postMessage: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts ticking when receiving START', () => {
    loadWorkerScript();

    mockSelf.onmessage({ data: { type: 'START' } });

    // Advance time by 100ms (should fire 2 ticks at 50ms rate)
    vi.advanceTimersByTime(100);

    expect(mockSelf.postMessage).toHaveBeenCalledWith({ type: 'TICK' });
    expect(mockSelf.postMessage).toHaveBeenCalledTimes(2);
  });

  it('stops ticking when receiving STOP', () => {
    loadWorkerScript();

    // Start
    mockSelf.onmessage({ data: { type: 'START' } });
    vi.advanceTimersByTime(100);
    expect(mockSelf.postMessage).toHaveBeenCalledTimes(2);

    // Stop
    mockSelf.onmessage({ data: { type: 'STOP' } });
    
    // Clear mock history
    mockSelf.postMessage.mockClear();

    // Advance time
    vi.advanceTimersByTime(500);
    expect(mockSelf.postMessage).not.toHaveBeenCalled();
  });
});