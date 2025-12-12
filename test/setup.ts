import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 1. Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// 2. Mock Worker
class WorkerMock {
  url: string;
  onmessage: (msg: any) => void;
  constructor(stringUrl: string) {
    this.url = stringUrl;
    this.onmessage = () => {};
  }
  postMessage(msg: any) {
    // We can intercept messages here if needed for integration tests
  }
  terminate() {}
}
global.Worker = WorkerMock as any;

// 3. Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// 4. Mock Canvas transferControlToOffscreen
// JSDOM doesn't support OffscreenCanvas, so we stub it.
Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', {
  value: function() {
    return {
        getContext: () => ({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            fillText: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
        }),
        width: 100,
        height: 100
    };
  }
});
