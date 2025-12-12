import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NaiveClock, NaiveClockHandle } from '../NaiveClock';

describe('NaiveClock Component', () => {
  let ref: React.RefObject<NaiveClockHandle>;

  beforeEach(() => {
    vi.useFakeTimers();
    ref = React.createRef<NaiveClockHandle>();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders initial 00:00:00', () => {
    render(<NaiveClock ref={ref} />);
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
  });

  it('starts and ticks correctly', () => {
    render(<NaiveClock ref={ref} />);
    act(() => { ref.current?.start(); });
    act(() => { vi.advanceTimersByTime(10000); });
    expect(screen.getByText('00:00:10')).toBeInTheDocument();
  });

  it('pauses and resumes without losing time', () => {
    render(<NaiveClock ref={ref} />);
    act(() => { ref.current?.start(); vi.advanceTimersByTime(5000); });
    expect(screen.getByText('00:00:05')).toBeInTheDocument();

    act(() => { ref.current?.pause(); });
    act(() => { vi.advanceTimersByTime(10000); });
    expect(screen.getByText('00:00:05')).toBeInTheDocument();

    act(() => { ref.current?.start(); vi.advanceTimersByTime(2000); });
    expect(screen.getByText('00:00:07')).toBeInTheDocument();
  });

  it('supports atomic time adjustment', () => {
    render(<NaiveClock ref={ref} />);
    act(() => { ref.current?.start(); vi.advanceTimersByTime(10000); });
    act(() => { ref.current?.adjustTime(3600); });
    expect(screen.getByText('01:00:10')).toBeInTheDocument();
  });

  it('handles negative time edge case', () => {
    render(<NaiveClock ref={ref} />);
    act(() => { ref.current?.start(); });
    act(() => { ref.current?.adjustTime(-10); });
    expect(screen.getByText('-00:00:10')).toBeInTheDocument();
  });

  it('clears interval on unmount (Prevent Memory Leak)', () => {
    // Spy on window.clearInterval since we are in JSDOM environment
    const spyClearInterval = vi.spyOn(window, 'clearInterval');
    const { unmount } = render(<NaiveClock ref={ref} />);
    
    act(() => { ref.current?.start(); });
    unmount();
    
    // We expect clearInterval to have been called when unmounting a running clock
    expect(spyClearInterval).toHaveBeenCalled();
  });
});