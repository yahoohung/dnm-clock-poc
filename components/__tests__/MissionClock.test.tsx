import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MissionClock } from '../MissionClock';

const mockWorkerPostMessage = vi.fn();
const mockWorkerTerminate = vi.fn();
let resizeCallback: ResizeObserverCallback | null = null;

class MockWorker {
  url: string;
  constructor(stringUrl: string) {
    this.url = stringUrl;
  }
  postMessage = mockWorkerPostMessage;
  terminate = mockWorkerTerminate;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

describe('MissionClock Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resizeCallback = null;
    (window as any).Worker = MockWorker;
    window.ResizeObserver = class ResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        resizeCallback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('instantiates a Worker and transfers control of OffscreenCanvas on mount', () => {
    const { unmount } = render(<MissionClock />);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(mockWorkerPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'INIT' }),
      expect.anything()
    );
    unmount();
    expect(mockWorkerTerminate).toHaveBeenCalled();
  });

  it('renders correctly without a controllerRef (Optional Prop)', () => {
    // This covers the branch `if (controllerRef) ...` being false
    const { container } = render(<MissionClock className="custom-class" />);
    // Check if classname is applied
    expect(container.firstChild).toHaveClass('custom-class');
    // Ensure no crash
    expect(mockWorkerPostMessage).toHaveBeenCalled();
  });

  it('sends RESIZE message when ResizeObserver fires', () => {
    render(<MissionClock />);
    if (resizeCallback) {
      const mockEntry = {
        contentRect: { width: 500, height: 300 }
      } as ResizeObserverEntry;
      resizeCallback([mockEntry], {} as ResizeObserver);
    }
    expect(mockWorkerPostMessage).toHaveBeenCalledWith({
      type: 'RESIZE',
      payload: expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number)
      })
    });
  });

  it('exposes controller methods', () => {
    const controllerRef = React.createRef<any>();
    render(<MissionClock controllerRef={controllerRef} />);
    controllerRef.current.start();
    expect(mockWorkerPostMessage).toHaveBeenCalledWith({ type: 'START' });
  });

  it('updates configuration', () => {
    const { rerender } = render(<MissionClock config={{ showDot: false }} />);
    rerender(<MissionClock config={{ showDot: true }} />);
    expect(mockWorkerPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'UPDATE_CONFIG' })
    );
  });
});