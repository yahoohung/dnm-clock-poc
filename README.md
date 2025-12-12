# High-Precision Broadcast Match Timer PoC

> **A high-precision, drift-free broadcast timer engine designed to maintain atomic accuracy under extreme main-thread rendering loads.**

![Status](https://img.shields.io/badge/Coverage-100%25-brightgreen)
![Tech](https://img.shields.io/badge/React-19-blue)
![Engine](https://img.shields.io/badge/WebWorker-OffscreenCanvas-orange)

## 🎯 The Problem

In standard React applications, timers rely on the **Main Thread**. This is the same thread responsible for:
1.  Handling User Inputs (Clicks, Typing).
2.  DOM Diffing and Reconciliation (React Updates).
3.  CSS Layout and Painting.
4.  JavaScript execution (Parsing, Logic).

If any of these tasks take too long (e.g., a complex render or a heavy calculation), the **Event Loop blocks**. `setInterval` and `requestAnimationFrame` are delayed. This results in visual stutter, time drift, and "janky" broadcast graphics.

## 🚀 The Solution: "Mission Clock" Architecture

This Proof of Concept implements a **Dual-Thread Architecture**:

1.  **The UI Layer (Main Thread):** Handles user interactions (Start/Stop/Reset buttons) and sends lightweight commands to the worker.
2.  **The Engine Layer (Worker Thread):**
    *   **Timekeeping:** Uses `performance.now()` for monotonic, high-resolution time measurement independent of system clock skew.
    *   **Rendering:** Uses **`OffscreenCanvas`** to paint the clock pixels *directly* from the worker thread.
    *   **Isolation:** Since the worker runs in parallel, the main thread can be completely frozen (infinite loop), and the clock will **continue to tick at 60 FPS**.

## 🏗 System Architecture

### 1. Zero-Allocation Render Loop (`clock.worker.ts`)
The worker utilises a highly optimised render loop designed to generate zero garbage collection (GC) pauses during runtime.
*   **Pre-allocated strings:** '00' through '59' are pre-computed.
*   **Strict Type Checks:** No dynamic object creation inside the `requestAnimationFrame` loop.
*   **Desynchronised Context:** Hints the browser to bypass the compositor for lowest possible latency.

### 2. The Stress Lab
The application includes a suite of tools designed to break standard React timers:
*   **CPU Stress Test:** Runs a synchronous `while()` loop on the main thread, simulating heavy data parsing or crypto operations.
*   **Render Lag Simulator:** Spawns 1,500+ un-memoised nodes that re-render every frame to choke the browser's layout engine.
*   **Chaos Monkey:** Randomly spams Start/Stop/Set commands to verify message queue integrity and race-condition handling.

---

## 🛠 Usage & Verification

### Installation

```bash
npm install
npm run dev
```

### Running the Comparison

1.  **Start the Timer:** Click the green `START` button. Both the "Mission Clock" (Top) and "Naive Clock" (Bottom) will begin counting.
2.  **Apply Stress:**
    *   Locate the **Stress Testing Lab** on the right panel.
    *   Click **"Freeze 2.0s"**.
3.  **Observe Results:**
    *   ❌ **Naive Clock (Main Thread):** Will completely stop updating for 2 seconds.
    *   ✅ **Mission Clock (Worker):** Will continue ticking smoothly without skipping a single frame.

### Running Tests

This project maintains **100% Test Coverage**, including the Worker environment and OffscreenCanvas logic.

```bash
npm test
```

## 📂 Project Structure

```
src/
├── components/
│   ├── MissionClock.tsx      # The "Hero" component (Canvas + Worker glue)
│   ├── NaiveClock.tsx        # The "Control" group (Standard React State)
│   ├── CpuStressTest.tsx     # Main thread blocker
│   └── RenderLagSimulator.tsx # DOM thrashing tool
├── workers/
│   ├── clock.worker.ts       # The actual Engine (Canvas painting logic)
│   └── timer.worker.ts       # Legacy simple ticker (reference)
└── hooks/
    └── useBroadcastMatchTimer.ts # Headless hook implementation
```

## 🧠 Technical Highlights

*   **Drift Correction:** The timer does not count "ticks". Instead, it calculates `(Now - StartTime) + BaseTime` on every frame. This makes it mathematically impossible for the timer to drift due to skipped frames.
*   **Atomic Adjustments:** Adding time (e.g., +1 second) adjusts the `BaseTime` and resets the `StartTime` anchor instantly, preserving sub-millisecond precision.
*   **React 19 Compatibility:** Uses `useSyncExternalStore` patterns and imperative Ref management to handle the non-React Worker lifecycle safely.

## 📄 Licence
MIT