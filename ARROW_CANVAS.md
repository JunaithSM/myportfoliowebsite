# Interactive Scroll Canvas & Arrow Engine Documentation

> A lightweight, zero-dependency canvas background engine inspired by Python Turtle graphics. Draws smooth curves and directional arrows driven by scroll position using `requestAnimationFrame` with momentum smoothing.

---

## 📑 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start & npm Commands](#quick-start--npm-commands)
3. [The Two Core Functions](#the-two-core-functions)
   - [`init(canvas, ctx)`](#1-initcanvas-ctx)
   - [`animate(state)`](#2-animatestate)
4. [Coordinate Systems & `moveWithScroll`](#coordinate-systems--movewithscroll)
5. [Element Anchors (No Magic Numbers)](#element-anchors-no-magic-numbers)
   - [`pointAt(selector, xRatio, yRatio)`](#pointatselector-xratio-yratio)
   - [`getElementY(selector, align)`](#getelementyselector-align)
6. [Explicit Drawing Helpers](#explicit-drawing-helpers)
   - [`drawQuadratic(options)`](#1-drawquadraticoptions)
   - [`drawCubic(options)`](#2-drawcubicoptions)
   - [`drawSpline(options)`](#3-drawsplineoptions)
   - [`drawCurve(options)` (With Typos & Validation Warnings)](#4-drawcurveoptions-validated-wrapper)
7. [Debug Mode](#debug-mode)
8. [Production Safety & Performance](#production-safety--performance)
   - `prefers-reduced-motion`
   - Tab Visibility Auto-Pause
   - Viewport Frustum Culling
   - `destroy()` Lifecycle Cleanup
9. [TypeScript Autocomplete & Types](#typescript-autocomplete--types)
10. [Standalone Examples](#standalone-examples)
11. [Unit Tests](#unit-tests)

---

## 🏛️ Architecture Overview

The system is split into two clean files:

| File | Purpose |
| :--- | :--- |
| **`src/js/arrow-config.js`** | **Your custom code file.** Where you write `init()` and `animate()` using standard JavaScript, `if` statements, loops, and math. |
| **`src/js/turtle-canvas.js`** | **The background engine.** Creates the fixed full-screen canvas, manages High-DPI / Retina resolution, handles resize observers, element anchors, and drives the smooth 60/120fps LERP loop. |

```
Browser Viewport
┌────────────────────────────────────────────────────────┐
│  <canvas class="arrow-canvas"> (Fixed Background)       │
│  ├── Full Width & Full Height (100vw × 100vh)          │
│  ├── pointer-events: none (Zero interaction blocking)  │
│  └── z-index: 0 (Sits behind text and cards)           │
│                                                        │
│  turtle-canvas.js (Engine)                             │
│  ├── requestAnimationFrame + LERP physics              │
│  ├── Visibility pause & prefers-reduced-motion check   │
│  └── Frustum culling                                   │
│       │                                                │
│       ▼ calls on every frame                           │
│  arrow-config.js (Your Code)                           │
│  └── animate({ scrollY, width, height, drawCurve })    │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start & npm Commands

The project includes cross-platform Node.js scripts in `package.json` that work identically on **macOS**, **Linux**, and **Windows**:

```bash
# Compile site and mirror JS to dist/
npm run build

# Continuous watch mode (recompiles on file save)
npm run watch

# Start local HTTP preview server (http://localhost:3000)
npm run serve

# Run math and engine unit tests
npm test
```

*(Windows users can also use `.\build.ps1` and `.\serve.ps1`).*

---

## 🧩 The Two Core Functions

In **`src/js/arrow-config.js`**:

### 1. `init(canvas, ctx)`
Runs once when the page loads, and again whenever the window is resized.
Use this to setup variables, precalculate values, or read theme colors.

```javascript
let themeColor = '#F62440';

function init(canvas, ctx) {
  themeColor = getComputedStyle(canvas).getPropertyValue('--color-accent').trim() || '#F62440';
}
```

### 2. `animate(state)`
Runs on **every animation frame**. The engine automatically passes a rich `state` object:

```javascript
function animate({
  time,           // Elapsed time in seconds
  timeMs,         // Elapsed time in milliseconds
  getTimeline,    // getTimeline({ duration, delay, reverse, loop, ease }) -> 0.0 to 1.0
  scrollY,        // Smoothed scroll position in px (LERP momentum)
  rawScroll,      // Direct window.scrollY
  width, height,  // Viewport width and height in px
  docHeight,      // Total document scrollable height
  ctx,            // 2D canvas context
  getProgress,    // getProgress(start, end) -> 0.0 to 1.0
  getElementY,    // getElementY(selector, align) -> Y px
  pointAt,        // pointAt(selector, xRatio, yRatio) -> { x, y }
  drawQuadratic,  // drawQuadratic({ start, control, end, ... })
  drawCubic,      // drawCubic({ start, cp1, cp2, end, ... })
  drawSpline,     // drawSpline({ points: [...], ... })
  drawCurve,      // drawCurve(options) (Validated wrapper)
  drawArrow       // drawArrow(x, y, angle, options)
}) {
  // Use if-statements, loops, or math!
}
```

---

## ⏱️ Time-Based Animation (`duration`, `delay`, `reverse`, `loop`)

You can animate any curve over time without relying on scroll.

### Method 1: Using `getTimeline()`
```javascript
const progress = getTimeline({
  duration: 1800,  // Animation length in ms (or seconds, e.g. 1.8)
  delay: 300,      // Wait 300ms before starting
  reverse: false,  // false = forward (0 -> 1); true = backward (1 -> 0); 'alternate' = pingpong
  loop: false,     // false = play once & stay; true = continuous repeat; N = repeat N times
  ease: 'easeInOut'// 'easeInOut' | 'easeOut' | 'cubicOut' | 'easeIn' | 'linear'
});

drawSpline({
  points: points,
  progress: progress
});
```

### Method 2: Passing Parameters Directly to Draw Functions
All draw functions (`drawSpline`, `drawCurve`, `drawQuadratic`, `drawCubic`) accept these options directly:

```javascript
drawSpline({
  points: points,
  duration: 1800,
  delay: 300,
  reverse: false,
  loop: false,
  ease: 'easeInOut'
});
```

---

## 🗺️ Coordinate Systems & `moveWithScroll`

Every curve can be configured with `moveWithScroll` and `smooth`:

```
1. moveWithScroll: false (Fixed to Viewport)
   Viewport Glass (0,0) ────────────────────────── (width, 0)
   │                                                         │
   │   • Coordinates (x, y) map to fixed screen pixels / %   │
   │   • When page scrolls, the curve STAYS on the screen    │
   │   • Best for HUDs, section guides, and screen ribbons   │
   │                                                         │
   (0, height) ────────────────────────────── (width, height)

2. moveWithScroll: true (Anchored to Document)
   Top of Page (0,0) ───────────────────────────── (width, 0)
   │  [ Hero Section ]                                       │
   │                                                         │
   │  [ Featured Projects ] ◄── Curve starts here            │
   │       \                                                 │
   │        \─── Curve flows with the page                   │
   │             \                                           │
   │  [ Track Record ]      ◄── Curve ends here              │
   │                                                         │
   Bottom of Page (0, docHeight) ──────────── (width, docHeight)
   • When page scrolls, the curve TRAVELS UP/DOWN with content
   • Automatically culled (skipped) when scrolled off screen!
```

### ⚡ Eliminating "Jelly" Scroll Delay (`smooth: false`)

By default, the engine applies momentum smoothing (LERP). If you want the curve to move with the page **without any elastic/jelly lag**, pass `smooth: false`:

```javascript
drawSpline({
  points: points,
  moveWithScroll: true, // Moves with the page
  smooth: false,        // Instant 1:1 scroll lock (NO jelly lag, NO momentum delay)
  progress: 1.0         // Fully drawn
});
```

You can also disable momentum globally in `init()`:
```javascript
function init(canvas, ctx) {
  window.TurtleEngine.setSmooth(false); // Disables jelly lag across all curves
}
```

### ✂️ Removing Stroke from Tail to Head on Scroll (`removeOnScroll` / `startProgress`)

To have the stroke erase itself starting from the tail toward the arrow head as you scroll down:

```javascript
drawSpline({
  points: points,
  progress: 1.0,            // Full stroke initially
  removeOnScroll: [0, 450], // As user scrolls from 0px to 450px, stroke is erased from tail to head!
  moveWithScroll: true,
  smooth: false
});

// Or pass startProgress directly:
drawSpline({
  points: points,
  progress: 1.0,
  startProgress: getProgress(0, 500) // 0.0 at top, 1.0 at 500px scroll
});
```

---

## ⚓ Element Anchors (No Magic Numbers)

Avoid hardcoding fragile pixel values like `y: 1400`. Use dynamic element anchors that adapt whenever content changes or the page is viewed on mobile:

### `pointAt(selector, xRatio, yRatio)`
Returns `{ x, y }` in document coordinates attached to any DOM element:
- `xRatio`: `0.0` (left edge), `0.5` (horizontal center), `1.0` (right edge)
- `yRatio`: `0.0` (top edge), `0.5` (vertical middle), `1.0` (bottom edge)

```javascript
// Anchor starting point to right edge of #featured-projects
const p1 = pointAt('#featured-projects', 1.0, 0.5);

// Anchor ending point to left edge of #experience-title
const p2 = pointAt('#experience-title', 0.0, 0.5);

drawCubic({
  start: p1,
  cp1:   { x: p1.x + 100, y: p1.y + 150 },
  cp2:   { x: p2.x - 100, y: p2.y - 150 },
  end:   p2,
  progress: getProgress('#featured-projects', '#experience-title'),
  moveWithScroll: true, // Flows with the elements!
  arrow: true
});
```

### `getElementY(selector, align)`
Returns the document Y coordinate of an element:
- `align`: `'top'` (default), `'center'`, `'bottom'`, or decimal fraction (e.g. `0.25`).

```javascript
const startY = getElementY('#featured-projects', 'top');
const endY   = getElementY('#featured-projects', 'bottom');
const progress = getProgress(startY, endY);
```

---

## 🎨 Explicit Drawing Helpers

### 1. `drawQuadratic(options)`
For smooth, single-arc sweeps.
- Required keys: `start`, `control`, `end`.

```javascript
drawQuadratic({
  start:   { x: width * 0.10, y: height * 0.25 },
  control: { x: width * 0.50, y: height * 0.08 }, // Arc bend point
  end:     { x: width * 0.88, y: height * 0.45 },
  progress: getProgress(0, 600),
  strokeWidth: 3,
  strokeColor: '#F62440',
  moveWithScroll: false,
  arrow: true
});
```

### 2. `drawCubic(options)`
For S-curves that bend in two directions.
- Required keys: `start`, `cp1`, `cp2`, `end`.

```javascript
drawCubic({
  start: { x: width * 0.88, y: height * 0.45 },
  cp1:   { x: width * 0.96, y: height * 0.68 }, // First control handle
  cp2:   { x: width * 0.12, y: height * 0.62 }, // Second control handle
  end:   { x: width * 0.35, y: height * 0.82 },
  progress: getProgress(500, 1350),
  strokeWidth: 2.5,
  strokeColor: '#F62440',
  moveWithScroll: false,
  arrow: true
});
```

### 3. `drawSpline(options)`
Passes smoothly through an arbitrary list of waypoints using Catmull-Rom interpolation.
- Required keys: `points: [p1, p2, p3, ...]`.

```javascript
drawSpline({
  points: [
    { x: width * 0.2, y: 1200 },
    { x: width * 0.8, y: 1500 },
    { x: width * 0.3, y: 1800 }
  ],
  progress: getProgress(1000, 2000),
  strokeWidth: 2.5,
  strokeColor: '#FFE5BF',
  moveWithScroll: true,
  arrow: true
});
```

### 4. `drawCurve(options)` (Validated Wrapper)
Accepts any shape format, validates the input, and logs helpful warnings if keys are missing or misspelled (e.g. `controll`):

```javascript
// If you pass invalid keys:
drawCurve({ start: p0, controll: p1 });
// Logs: "[TurtleCanvas] drawCurve: Invalid curve definition! You must provide either:
//   - { start, control, end } for a Quadratic curve
//   - { start, cp1, cp2, end } for a Cubic curve
//   - { points: [...] } for a Waypoint Spline"
```

### 5. `text` (Text Along Curve Flow)
Draw text that curves and rotates along the tangent flow of any spline, quadratic, or cubic curve!

#### Quick string syntax:
```javascript
drawSpline({
  points: points,
  progress: progress,
  text: 'explore', // Draws "explore" flowing along the curve path
  arrow: true
});
```

#### Full configuration options:
```javascript
drawSpline({
  points: points,
  progress: drawProgress,
  text: {
    content: 'explore',           // Text to draw along the curve
    offset: 0.50,                 // Position along curve: 0.0 (start) to 1.0 (end), 'center', or px
    align: 'center',              // 'center' | 'start' | 'end'
    baselineOffset: -14,          // Distance perpendicular to curve: -14 = floats above, +14 = below, 0 = on line
    font: '600 13px Poppins, sans-serif',
    color: '#F62440',
    letterSpacing: 2.5,           // Extra spacing between characters
    reverse: false,               // true = reverses letter order (reads LTR on curves flowing right-to-left)
    autoReverse: true,            // Automatically detects R-to-L flow and flips reading order
    followProgress: true,         // Reveals letters one-by-one as the curve draws
    autoRotate: true,             // Rotates each letter to match the curve tangent
    flipUpsideDown: true          // Automatically keeps text readable left-to-right
  },
  arrow: true
});

// Or draw standalone curved text without a stroke:
drawTextOnCurve({
  points: points,
  text: 'explore',
  progress: drawProgress
});
```

---

## 🔍 Debug Mode

Enable debug mode to immediately see why a curve looks off:

- Visualizes **control points** (red = CP1, blue = CP2, green = endpoints).
- Draws **tangent handle lines** (dashed).
- Displays current **curve progress %** next to the arrow tip.
- Shows a diagnostic **HUD** (current `scrollY`, target `scrollY`, active curve count, motion mode).

```javascript
// Option A: Enable globally via JavaScript console or script
window.TurtleEngine.setDebug(true);

// Option B: Toggle on/off dynamically
window.TurtleEngine.toggleDebug();

// Option C: Enable on a single curve
drawQuadratic({
  start: p0,
  control: p1,
  end: p2,
  debug: true // Debug only this curve
});
```

---

## 🛡️ Production Safety & Performance

The engine includes several production-grade safeguards:

1. **`prefers-reduced-motion` Support**:
   Detects OS reduced motion settings via `window.matchMedia`. Automatically disables smooth glide and snaps curves immediately to prevent motion sickness.
2. **Page Visibility Auto-Pause**:
   Listens to the Page Visibility API (`document.visibilitychange`). Immediately cancels the RAF loop when the user switches tabs, consuming **0% CPU** while backgrounded.
3. **Viewport Frustum Culling**:
   Curves with `moveWithScroll: true` that fall completely outside `[scrollY, scrollY + viewportHeight]` are skipped automatically, keeping drawing fast even on long pages.
4. **`destroy()` Cleanup**:
   Call `window.TurtleEngine.destroy()` in Single Page Applications (SPAs) to remove scroll/resize listeners, cancel pending frames, and detach the canvas.

---

## ⌨️ TypeScript Autocomplete & Types

Full TypeScript declarations are included in **`src/js/turtle-canvas.d.ts`**.
VS Code and WebStorm provide full IntelliSense, autocomplete, and hover documentation as you type:

```typescript
import { AnimateState } from './turtle-canvas';

function animate({ scrollY, width, height, drawQuadratic }: AnimateState) {
  // Full parameter types and hints displayed in your editor!
}
```

---

## 📁 Standalone Examples

Explore runnable, self-contained examples in the **`examples/`** folder:

| File | Description |
| :--- | :--- |
| **`examples/01-basic-hero.html`** | Minimal quadratic sweep curve with directional arrow. |
| **`examples/02-element-anchors.html`** | Using `pointAt()` and `getElementY()` to anchor curves to cards. |
| **`examples/03-debug-mode.html`** | Live control handles, tangent lines, and debug HUD. |
| **`examples/04-loops-and-logic.html`** | Generating multiple dynamic ribbons with a `for` loop. |

To run any example:
```bash
npm run serve
# Then open http://localhost:3000/examples/01-basic-hero.html in your browser
```

---

## 🧪 Unit Tests

Pure functions (`clamp`, `lerp`, `evalCubicBezier`, `catmullRomToCubicSegments`, `resolveValue`) are covered by automated unit tests in **`tests/engine.test.js`**:

```bash
npm test
```
All tests use Node.js's native test runner (`node:test`) with zero external dependencies.
