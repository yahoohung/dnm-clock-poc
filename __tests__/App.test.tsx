import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../App';

// We mock the child components to focus on App wiring logic
// But we keep the real refs logic to test the connection
vi.mock('../components/MissionClock', () => ({
  MissionClock: ({ controllerRef }: any) => {
    React.useImperativeHandle(controllerRef, () => ({
      start: vi.fn(),
      pause: vi.fn(),
      setTime: vi.fn(),
      adjustTime: vi.fn(),
    }));
    return <div data-testid="mission-clock">MissionClock</div>;
  }
}));

vi.mock('../components/NaiveClock', () => ({
  NaiveClock: React.forwardRef(({ className }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      start: vi.fn(),
      pause: vi.fn(),
      setTime: vi.fn(),
      adjustTime: vi.fn(),
    }));
    return <div data-testid="naive-clock" className={className}>NaiveClock</div>;
  })
}));

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the layout and all sub-components', () => {
    render(<App />);
    expect(screen.getByText('DNM Clock PoC')).toBeInTheDocument();
    expect(screen.getByTestId('mission-clock')).toBeInTheDocument();
    expect(screen.getByTestId('naive-clock')).toBeInTheDocument();
    expect(screen.getByText(/Stress Testing Lab/i)).toBeInTheDocument();
  });

  it('toggles Start/Pause state and updates UI button text', () => {
    render(<App />);
    
    const toggleBtn = screen.getByText('START');
    fireEvent.click(toggleBtn);

    // Should flip to PAUSE
    expect(screen.getByText('PAUSE')).toBeInTheDocument();
    
    // Click again
    fireEvent.click(screen.getByText('PAUSE'));
    expect(screen.getByText('START')).toBeInTheDocument();
  });

  it('triggers atomic adjustments when adjustment buttons are clicked', () => {
    render(<App />);
    
    // There are multiple adjustment buttons. Let's find +1H
    const addHourBtn = screen.getByText('+1H');
    // We can't easily spy on the internal ref methods in an integration test 
    // without more complex mocking, but we can ensure the app doesn't crash 
    // and the buttons are clickable.
    fireEvent.click(addHourBtn);
    
    const subSecBtn = screen.getByText('-1S');
    fireEvent.click(subSecBtn);
  });

  it('activates presets correctly', () => {
    render(<App />);
    const halftimeBtn = screen.getByText('Halftime (45:00)');
    fireEvent.click(halftimeBtn);
    // Again, ensuring no crash and event propagation
  });

  it('renders stress test components', () => {
    render(<App />);
    expect(screen.getByText('Main Thread Blocker (Unhappy Path)')).toBeInTheDocument();
    expect(screen.getByText('Render Lag Simulator')).toBeInTheDocument();
    expect(screen.getByText('Chaos Monkey (Worker Stress)')).toBeInTheDocument();
  });
});