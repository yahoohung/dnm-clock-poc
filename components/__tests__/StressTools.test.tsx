import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CpuStressTest } from '../CpuStressTest';
import { ChaosMonkey } from '../ChaosMonkey';
import { RenderLagSimulator } from '../RenderLagSimulator';

describe('Stress Tools Components', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- CPU STRESS TEST ---
  it('CpuStressTest: triggers blocking state', async () => {
    render(<CpuStressTest />);
    const btn = screen.getByText('Freeze 0.5s');
    
    // We expect the text "THREAD BLOCKED" to appear briefly.
    // However, since the component uses a `while` loop, it technically freezes the test runner if not mocked carefully.
    // The component wraps the block in a setTimeout(..., 50), which gives us a chance to test the "transition" to blocking.
    
    fireEvent.click(btn);

    // Should be entering blocking state
    act(() => {
        vi.advanceTimersByTime(10); // Before the 50ms timeout fires
    });
    
    expect(screen.getByText('THREAD BLOCKED')).toBeInTheDocument();

    // Now we let the heavy loop "run". 
    // In a test environment with FakeTimers, `performance.now()` doesn't auto-increment inside a synchronous loop.
    // So the loop `while (performance.now() - start < durationMs)` would be infinite if we don't mock performance.now or just avoid it.
    // For safety in Unit Tests, we just want to ensure the state logic fires. 
    // The actual "blocking" is a browser behavior we can't fully unit test in JSDOM easily without hanging the process.
    // We'll advance timers past the loop completion assuming the loop finishes instantly in mock time.
    
    // To allow the loop to break, we mock performance.now using vi.spyOn on the window object
    let nowCallCount = 0;
    const nowSpy = vi.spyOn(window.performance, 'now').mockImplementation(() => {
        nowCallCount++;
        // Return start time first, then start + duration + 1 to break loop immediately
        return nowCallCount > 1 ? 99999999 : 0; 
    });

    act(() => {
        vi.advanceTimersByTime(100); // Trigger the setTimeout callback
    });

    nowSpy.mockRestore();
    
    // Should return to idle
    expect(screen.queryByText('THREAD BLOCKED')).not.toBeInTheDocument();
  });

  // --- CHAOS MONKEY ---
  it('ChaosMonkey: dispatches random actions when active', () => {
    const actions = {
        start: vi.fn(),
        pause: vi.fn(),
        setTime: vi.fn(),
        adjustTime: vi.fn()
    };

    render(<ChaosMonkey actions={actions} />);
    const toggle = screen.getByText('Unleash Chaos');
    
    fireEvent.click(toggle);
    expect(screen.getByText('Stop Chaos')).toBeInTheDocument();

    // Advance time to trigger intervals
    act(() => {
        vi.advanceTimersByTime(500); // 5 ticks (100ms interval)
    });

    // Check if *any* action was called. 
    // Since it's random, we can't be 100% sure which one, but probability says at least one.
    const totalCalls = actions.start.mock.calls.length + actions.pause.mock.calls.length + actions.setTime.mock.calls.length;
    expect(totalCalls).toBeGreaterThan(0);

    // Stop it
    fireEvent.click(screen.getByText('Stop Chaos'));
    const callsAtStop = totalCalls;

    act(() => {
        vi.advanceTimersByTime(500);
    });

    // Should not have called any more
    const newTotalCalls = actions.start.mock.calls.length + actions.pause.mock.calls.length + actions.setTime.mock.calls.length;
    expect(newTotalCalls).toBe(callsAtStop);
  });

  // --- RENDER LAG SIMULATOR ---
  it('RenderLagSimulator: renders nodes and updates FPS', () => {
    render(<RenderLagSimulator />);
    const toggle = screen.getByText('Start Lag');
    
    fireEvent.click(toggle);
    expect(screen.getByText('Stop Lag')).toBeInTheDocument();

    // Check that we have a bunch of nodes
    // The component defaults to 1500 nodes.
    // They are just divs.
    
    // Trigger requestAnimationFrame loop
    act(() => {
        vi.advanceTimersByTime(1000);
    });
    
    // FPS badge should appear
    expect(screen.getByText(/FPS/)).toBeInTheDocument();

    // Change intensity
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: 100 } });
    expect(slider).toHaveValue("100");
  });
});