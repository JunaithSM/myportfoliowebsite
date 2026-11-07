/**
 * ==============================================================================
 * Background Canvas Engine (Zero-Dependency Smooth RAF Engine)
 * ==============================================================================
 * Manages full-screen fixed canvas background, High-DPI scaling,
 * buttery-smooth scroll momentum (LERP), element anchors, and provides
 * programmer-friendly drawing helpers to your `init(canvas, ctx)` and
 * `animate(state)` functions.
 * ==============================================================================
 */

(function (root) {
  'use strict';

  // ----------------------------------------------------------------------------
  // Engine Configuration & State
  // ----------------------------------------------------------------------------
  const CONFIG = {
    canvasId: 'turtle-canvas',
    ease: 0.08,             // LERP smoothing factor (0.01 = slow glide, 0.2 = fast, 1.0 = instant)
    smooth: true,           // false = Instant 1:1 scroll lock (NO jelly / momentum lag)
    dprMax: 2,              // High-DPI Retina cap
    defaultColor: '#F62440',
    defaultWidth: 2.5,
    debug: false            // Debug overlay & curve handles
  };

  let canvas = null;
  let ctx = null;

  let viewportWidth = 0;
  let viewportHeight = 0;
  let documentHeight = 0;
  let dpr = 1;

  let targetScroll = 0;
  let currentScroll = 0;
  let isAnimating = false;
  let rafId = null;

  let prefersReducedMotion = false;
  let isTabVisible = true;
  let debugCurveCount = 0;

  // ----------------------------------------------------------------------------
  // Timeline Animation Engine (Duration, Delay, Reverse, Loop, Easing)
  // ----------------------------------------------------------------------------
  const timelines = new Map();
  let timelineAutoIdCounter = 0;
  let anyTimelineActive = false;
  const engineStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  function applyEasing(t, ease) {
    t = Math.max(0, Math.min(1, t));
    if (typeof ease === 'function') return ease(t);
    switch (ease) {
      case 'linear': return t;
      case 'easeIn': return t * t;
      case 'easeOut': return t * (2 - t);
      case 'cubicIn': return t * t * t;
      case 'cubicOut': return (--t) * t * t + 1;
      case 'cubicInOut': return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      case 'easeInOut':
      default:
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
  }

  /**
   * Evaluates a time-based animation progress (0.0 to 1.0) with duration, delay, reverse, loop, and easing.
   * @param {Object} [options]
   * @param {number} [options.duration=1000] - Duration in ms (or seconds if <= 10)
   * @param {number} [options.delay=0] - Delay in ms before starting
   * @param {boolean|string} [options.reverse=false] - true (reverse), false (forward), 'alternate' (pingpong)
   * @param {boolean|number} [options.loop=false] - true (infinite loop), false (play once), number (repeat N times)
   * @param {string|Function} [options.ease='easeInOut'] - Easing curve name or function
   * @param {string} [options.id] - Optional unique identifier to preserve timeline state
   * @returns {number} Current progress between 0.0 and 1.0
   */
  function getTimelineHelper(options) {
    const opts = options || {};
    const id = opts.id || ('__tl_' + (++timelineAutoIdCounter));

    let duration = typeof opts.duration === 'number' ? opts.duration : 1000;
    if (duration > 0 && duration <= 10) duration *= 1000;

    let delay = typeof opts.delay === 'number' ? opts.delay : 0;
    if (delay > 0 && delay <= 10) delay *= 1000;

    const reverse = opts.reverse || false;
    const loop = opts.loop || false;
    const ease = opts.ease || opts.easing || 'easeInOut';

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!timelines.has(id)) {
      timelines.set(id, { startTime: now });
    }

    const record = timelines.get(id);
    const elapsed = now - record.startTime;
    const activeTime = elapsed - delay;

    if (activeTime < 0) {
      anyTimelineActive = true;
      return reverse === true ? 1.0 : 0.0;
    }

    const isAlternate = reverse === 'alternate' || reverse === 'pingpong';
    const cycleDuration = isAlternate ? duration * 2 : duration;

    let rawT = 0;
    let isActive = false;

    if (loop === true) {
      isActive = true;
      if (isAlternate) {
        const mod = activeTime % cycleDuration;
        rawT = mod < duration ? (mod / duration) : 1.0 - ((mod - duration) / duration);
      } else {
        rawT = (activeTime % duration) / duration;
        if (reverse === true) rawT = 1.0 - rawT;
      }
    } else if (typeof loop === 'number' && loop > 0) {
      const totalLoopTime = cycleDuration * loop;
      if (activeTime < totalLoopTime) {
        isActive = true;
        if (isAlternate) {
          const mod = activeTime % cycleDuration;
          rawT = mod < duration ? (mod / duration) : 1.0 - ((mod - duration) / duration);
        } else {
          rawT = (activeTime % duration) / duration;
          if (reverse === true) rawT = 1.0 - rawT;
        }
      } else {
        isActive = false;
        rawT = isAlternate ? 0.0 : (reverse === true ? 0.0 : 1.0);
      }
    } else {
      if (activeTime < duration) {
        isActive = true;
        rawT = activeTime / duration;
        if (reverse === true) rawT = 1.0 - rawT;
      } else {
        isActive = false;
        rawT = reverse === true ? 0.0 : 1.0;
      }
    }

    if (isActive) {
      anyTimelineActive = true;
    }

    return applyEasing(rawT, ease);
  }

  // ----------------------------------------------------------------------------
  // Accessibility & System Preferences
  // ----------------------------------------------------------------------------
  function checkMotionPreference() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion = mediaQuery.matches;
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', (e) => {
          prefersReducedMotion = e.matches;
        });
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Metrics & Coordinate Resolvers
  // ----------------------------------------------------------------------------
  function updateMetrics() {
    viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1024;
    viewportHeight = window.innerHeight || document.documentElement.clientHeight || 768;
    documentHeight = Math.max(
      document.body ? document.body.scrollHeight : 0,
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.offsetHeight : 0,
      document.documentElement ? document.documentElement.offsetHeight : 0,
      viewportHeight
    );
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.dprMax);
  }

  function resolveValue(val, basis) {
    if (typeof val === 'number') return val;
    if (typeof val === 'function') return val(viewportWidth, viewportHeight, documentHeight);
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.endsWith('%')) {
        return (parseFloat(trimmed) / 100) * basis;
      }
      if (trimmed.endsWith('vw')) {
        return (parseFloat(trimmed) / 100) * viewportWidth;
      }
      if (trimmed.endsWith('vh')) {
        return (parseFloat(trimmed) / 100) * viewportHeight;
      }
      if (trimmed.endsWith('px')) {
        return parseFloat(trimmed);
      }
      const num = parseFloat(trimmed);
      if (!isNaN(num)) return num;
    }
    return 0;
  }

  function resolveScroll(trigger) {
    if (typeof trigger === 'number') return trigger;
    if (typeof trigger === 'string') {
      const trimmed = trigger.trim();
      if (trimmed.startsWith('#') || trimmed.startsWith('.')) {
        try {
          const elY = getElementY(trimmed, 'top');
          if (elY > 0) return elY;
        } catch (e) {}
      }
      const maxScroll = Math.max(0, documentHeight - viewportHeight);
      if (trimmed.endsWith('%')) {
        return (parseFloat(trimmed) / 100) * maxScroll;
      }
      if (trimmed.endsWith('vh')) {
        return (parseFloat(trimmed) / 100) * viewportHeight;
      }
      if (trimmed.endsWith('px')) {
        return parseFloat(trimmed);
      }
      const num = parseFloat(trimmed);
      if (!isNaN(num)) return num;
    }
    return 0;
  }

  function resolveColor(colorStr) {
    if (!colorStr) return CONFIG.defaultColor;
    if (typeof colorStr === 'string' && colorStr.startsWith('var(')) {
      const varName = colorStr.replace(/var\((--[^,\)]+).*\)/, '$1').trim();
      const resolved = getComputedStyle(canvas || document.documentElement).getPropertyValue(varName).trim();
      if (resolved) return resolved;
    }
    return colorStr;
  }

  // ----------------------------------------------------------------------------
  // Element Anchors (No Magic Numbers)
  // ----------------------------------------------------------------------------
  /**
   * Returns the absolute document Y position of any element selector.
   * @param {string} selector - CSS selector (e.g. '#featured-projects')
   * @param {string|number} [align='top'] - 'top', 'center', 'bottom', or decimal fraction (0.0 to 1.0)
   * @returns {number} Document Y position in pixels
   */
  function getElementY(selector, align) {
    if (typeof document === 'undefined') return 0;
    try {
      const el = document.querySelector(selector);
      if (!el) {
        console.warn(`[TurtleCanvas] getElementY: Element "${selector}" not found.`);
        return 0;
      }
      // Calculate true static in-flow document Y (immune to CSS position: sticky shifts during scroll)
      let staticTop = 0;
      let curr = el;
      while (curr && curr !== document.body) {
        staticTop += curr.offsetTop || 0;
        curr = curr.offsetParent;
      }

      const rect = el.getBoundingClientRect();
      const pageTop = staticTop > 0 ? staticTop : (rect.top + (window.scrollY || window.pageYOffset || 0));

      let ratio = 0;
      if (align === 'center' || align === 'middle') ratio = 0.5;
      else if (align === 'bottom') ratio = 1.0;
      else if (typeof align === 'number') ratio = align;

      return pageTop + rect.height * ratio;
    } catch (e) {
      console.warn(`[TurtleCanvas] getElementY failed for "${selector}":`, e);
      return 0;
    }
  }

  /**
   * Attaches coordinates to an element's bounding box.
   * @param {string} selector - CSS selector (e.g. '#hero', '.card')
   * @param {number} [xRatio=0.5] - Relative X position across element (0 = left, 0.5 = center, 1 = right)
   * @param {number} [yRatio=0.5] - Relative Y position down element (0 = top, 0.5 = middle, 1 = bottom)
   * @returns {{x: number, y: number}} Absolute document coordinates in pixels
   */
  function pointAt(selector, xRatio = 0.5, yRatio = 0.5) {
    if (typeof document === 'undefined') return { x: 0, y: 0 };
    try {
      const el = document.querySelector(selector);
      if (!el) {
        console.warn(`[TurtleCanvas] pointAt: Element "${selector}" not found.`);
        return { x: 0, y: 0 };
      }
      const rect = el.getBoundingClientRect();
      const pageLeft = rect.left + (window.scrollX || window.pageXOffset || 0);
      const pageTop = rect.top + (window.scrollY || window.pageYOffset || 0);

      return {
        x: pageLeft + rect.width * xRatio,
        y: pageTop + rect.height * yRatio
      };
    } catch (e) {
      console.warn(`[TurtleCanvas] pointAt failed for "${selector}":`, e);
      return { x: 0, y: 0 };
    }
  }

  // ----------------------------------------------------------------------------
  // Math & Geometry
  // ----------------------------------------------------------------------------
  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function evalCubicBezier(p0, p1, p2, p3, t) {
    const it = 1 - t;
    const it2 = it * it;
    const t2 = t * t;
    return {
      x: it2 * it * p0.x + 3 * it2 * t * p1.x + 3 * it * t2 * p2.x + t2 * t * p3.x,
      y: it2 * it * p0.y + 3 * it2 * t * p1.y + 3 * it * t2 * p2.y + t2 * t * p3.y
    };
  }

  function catmullRomToCubicSegments(pts) {
    if (!pts || pts.length < 2) return [];
    if (pts.length === 2) {
      return [{
        p0: pts[0],
        cp1: { x: pts[0].x + (pts[1].x - pts[0].x) / 3, y: pts[0].y + (pts[1].y - pts[0].y) / 3 },
        cp2: { x: pts[0].x + (2 * (pts[1].x - pts[0].x)) / 3, y: pts[0].y + (2 * (pts[1].y - pts[0].y)) / 3 },
        p3: pts[1]
      }];
    }

    const segments = [];
    const n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(n - 1, i + 2)];

      const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const maxHandleLen = segLen / 3;

      let dx1 = (p2.x - p0.x) / 6;
      let dy1 = (p2.y - p0.y) / 6;
      const hLen1 = Math.hypot(dx1, dy1);
      if (hLen1 > maxHandleLen && hLen1 > 0.0001) {
        const factor = maxHandleLen / hLen1;
        dx1 *= factor;
        dy1 *= factor;
      }

      let dx2 = (p3.x - p1.x) / 6;
      let dy2 = (p3.y - p1.y) / 6;
      const hLen2 = Math.hypot(dx2, dy2);
      if (hLen2 > maxHandleLen && hLen2 > 0.0001) {
        const factor = maxHandleLen / hLen2;
        dx2 *= factor;
        dy2 *= factor;
      }

      const cp1 = { x: p1.x + dx1, y: p1.y + dy1 };
      const cp2 = { x: p2.x - dx2, y: p2.y - dy2 };

      segments.push({ p0: p1, cp1, cp2, p3: p2 });
    }
    return segments;
  }

  // ----------------------------------------------------------------------------
  // Arrow Rendering
  // ----------------------------------------------------------------------------
  function drawArrowHead(targetCtx, x, y, angle, options) {
    const opts = options || {};
    const size = opts.size || 18;
    const color = resolveColor(opts.color || CONFIG.defaultColor);
    const style = opts.style || 'solid';

    targetCtx.save();
    targetCtx.translate(x, y);
    targetCtx.rotate(angle);

    targetCtx.fillStyle = color;
    targetCtx.strokeStyle = color;
    targetCtx.lineJoin = 'round';
    targetCtx.lineCap = 'round';

    const notchX = 0;
    const backX = -size * 0.45;
    const tipX = size * 1.15;
    const halfWing = size * 0.55;

    if (style === 'sketch' || style === 'hatched') {
      // Sketched hand-drawn barbed outline
      targetCtx.lineWidth = Math.max(1.8, size * 0.1);
      targetCtx.beginPath();
      targetCtx.moveTo(tipX, 0);
      targetCtx.lineTo(backX, -halfWing);
      targetCtx.lineTo(notchX, 0);
      targetCtx.lineTo(backX, halfWing);
      targetCtx.closePath();
      targetCtx.stroke();

      // Sketched diagonal cross-hatch lines inside the arrow head (matching hand-drawn sketch)
      targetCtx.save();
      targetCtx.clip();
      targetCtx.lineWidth = Math.max(1.4, size * 0.08);

      const hatchSpacing = Math.max(3.2, size * 0.22);
      const span = size * 1.5;
      for (let offset = -span; offset <= span; offset += hatchSpacing) {
        targetCtx.beginPath();
        targetCtx.moveTo(offset - halfWing, -halfWing);
        targetCtx.lineTo(offset + halfWing, halfWing);
        targetCtx.stroke();
      }
      targetCtx.restore();
    } else {
      // Solid filled arrow head
      targetCtx.lineWidth = 1.6;
      targetCtx.beginPath();
      targetCtx.moveTo(tipX, 0);
      targetCtx.lineTo(backX, -halfWing);
      targetCtx.lineTo(notchX, 0);
      targetCtx.lineTo(backX, halfWing);
      targetCtx.closePath();
      targetCtx.fill();
      targetCtx.stroke();
    }

    targetCtx.restore();
  }

  // ----------------------------------------------------------------------------
  // Text Along Curve Flow Rendering
  // ----------------------------------------------------------------------------
  /**
   * Samples a point and tangent angle at an exact arc-length distance along a sampled path.
   * @param {Array<{x: number, y: number}>} rawPoints
   * @param {Array<number>} cumulativeDist
   * @param {number} targetDist
   * @returns {{x: number, y: number, angle: number}}
   */
  function samplePathAtDistance(rawPoints, cumulativeDist, targetDist) {
    if (!rawPoints || rawPoints.length === 0) return { x: 0, y: 0, angle: 0 };
    if (rawPoints.length === 1) return { x: rawPoints[0].x, y: rawPoints[0].y, angle: 0 };

    const maxD = cumulativeDist[cumulativeDist.length - 1];
    const d = clamp(targetDist, 0, maxD);
    let idx = 0;
    while (idx < cumulativeDist.length - 1 && cumulativeDist[idx + 1] < d) {
      idx++;
    }
    const d0 = cumulativeDist[idx];
    const d1 = cumulativeDist[Math.min(idx + 1, cumulativeDist.length - 1)];
    const span = d1 - d0;
    const t = span > 0.0001 ? (d - d0) / span : 0;
    const pA = rawPoints[idx];
    const pB = rawPoints[Math.min(idx + 1, rawPoints.length - 1)];

    const x = pA.x + (pB.x - pA.x) * t;
    const y = pA.y + (pB.y - pA.y) * t;
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const angle = (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) ? Math.atan2(dy, dx) : 0;
    return { x: x, y: y, angle: angle };
  }

  /**
   * Renders text following the flow and curvature of a sampled path.
   * @param {CanvasRenderingContext2D} targetCtx
   * @param {Array<{x: number, y: number}>} rawPoints
   * @param {Array<number>} cumulativeDist
   * @param {number} totalLen
   * @param {string|Object} textOptions
   * @param {number} currentDist - Visible arc-length from head progress
   * @param {number} startDist - Visible arc-length from tail progress
   * @param {string} defaultColor
   */
  function drawTextAlongPath(targetCtx, rawPoints, cumulativeDist, totalLen, textOptions, currentDist, startDist, defaultColor) {
    if (!targetCtx || !textOptions || totalLen <= 0) return;

    const opts = typeof textOptions === 'string' ? { content: textOptions } : textOptions;
    const content = (opts.content !== undefined ? opts.content : (opts.text !== undefined ? opts.text : '')).toString();
    if (!content) return;

    if (opts.show === false) return;

    const font = opts.font || '600 13px Poppins, -apple-system, sans-serif';
    const color = resolveColor(opts.color || defaultColor || CONFIG.defaultColor);
    const letterSpacing = typeof opts.letterSpacing === 'number' ? opts.letterSpacing : 2.5;
    const baselineOffset = typeof opts.baselineOffset === 'number'
      ? opts.baselineOffset
      : (opts.side === 'below' ? 14 : (opts.side === 'on' ? 0 : -14)); // default floats 14px above curve line
    const followProgress = opts.followProgress !== false;
    const flipUpsideDown = opts.flipUpsideDown !== false;
    const autoRotate = opts.autoRotate !== false;
    const align = opts.align || 'center'; // 'center' | 'start' | 'end'
    const opacity = typeof opts.opacity === 'number' ? opts.opacity : 1.0;

    targetCtx.save();
    targetCtx.font = font;
    targetCtx.fillStyle = color;
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    if (opacity < 1.0) targetCtx.globalAlpha *= opacity;

    // Determine anchor position along curve
    let anchorDist = totalLen * 0.5; // default center of curve
    if (typeof opts.offset === 'number') {
      anchorDist = (opts.offset >= 0.0 && opts.offset <= 1.0) ? opts.offset * totalLen : opts.offset;
    } else if (typeof opts.offset === 'string') {
      const trimmed = opts.offset.trim();
      if (trimmed === 'start') anchorDist = totalLen * 0.2;
      else if (trimmed === 'center' || trimmed === 'middle') anchorDist = totalLen * 0.5;
      else if (trimmed === 'end') anchorDist = totalLen * 0.8;
      else if (trimmed.endsWith('%')) anchorDist = (parseFloat(trimmed) / 100) * totalLen;
      else if (trimmed.endsWith('px')) anchorDist = parseFloat(trimmed);
      else {
        const parsed = parseFloat(trimmed);
        if (!isNaN(parsed)) anchorDist = parsed <= 1.0 ? parsed * totalLen : parsed;
      }
    }

    // Determine if text order should be reversed (e.g. for curves flowing right-to-left)
    let shouldReverse = opts.reverse === true || opts.reverseText === true || opts.rtl === true;
    if (opts.reverse === 'auto' || opts.autoReverse === true || opts.direction === 'auto') {
      const anchorSample = samplePathAtDistance(rawPoints, cumulativeDist, anchorDist);
      shouldReverse = Math.cos(anchorSample.angle) < 0; // True if curve travels right-to-left
    }

    const chars = shouldReverse ? Array.from(content).reverse() : Array.from(content);

    // Measure character widths
    const charWidths = [];
    let totalTextWidth = 0;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const w = targetCtx.measureText(ch).width + letterSpacing;
      charWidths.push(w);
      totalTextWidth += w;
    }

    let textStartDist = anchorDist;
    if (align === 'center') {
      textStartDist = anchorDist - totalTextWidth / 2;
    } else if (align === 'end') {
      textStartDist = anchorDist - totalTextWidth;
    }

    let runningDist = textStartDist;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const charWidth = charWidths[i];
      const charCenterDist = runningDist + (charWidth - letterSpacing) / 2;
      runningDist += charWidth;

      // Follow progress: reveal as curve draws, hide as tail erases
      if (followProgress) {
        if (charCenterDist > currentDist) continue;
        if (charCenterDist < startDist) continue;
      }
      if (charCenterDist < 0 || charCenterDist > totalLen) continue;

      const sample = samplePathAtDistance(rawPoints, cumulativeDist, charCenterDist);

      // Normal vector pointing 90 deg counter-clockwise: (-sin(angle), cos(angle))
      const nx = -Math.sin(sample.angle);
      const ny = Math.cos(sample.angle);
      const posX = sample.x + nx * baselineOffset;
      const posY = sample.y + ny * baselineOffset;

      targetCtx.save();
      targetCtx.translate(posX, posY);

      if (autoRotate) {
        let rot = sample.angle;
        if (flipUpsideDown && (rot > Math.PI / 2 || rot < -Math.PI / 2)) {
          rot += Math.PI; // Keep readable upright when flowing right-to-left
        }
        if (typeof opts.rotate === 'number') rot += (opts.rotate * Math.PI) / 180;
        targetCtx.rotate(rot);
      }

      targetCtx.fillText(ch, 0, 0);
      targetCtx.restore();
    }

    targetCtx.restore();
  }

  // ----------------------------------------------------------------------------
  // Debug Visualizer
  // ----------------------------------------------------------------------------
  function drawDebugOverlay(targetCtx, segments, options, currentPt, progress) {
    targetCtx.save();

    // 1. Draw Control Handle Lines
    targetCtx.lineWidth = 1;
    targetCtx.setLineDash([4, 4]);

    segments.forEach((seg) => {
      // Line from P0 to CP1
      targetCtx.strokeStyle = 'rgba(246, 36, 64, 0.45)';
      targetCtx.beginPath();
      targetCtx.moveTo(seg.p0.x, seg.p0.y);
      targetCtx.lineTo(seg.cp1.x, seg.cp1.y);
      targetCtx.stroke();

      // Line from P3 to CP2
      targetCtx.strokeStyle = 'rgba(33, 150, 243, 0.45)';
      targetCtx.beginPath();
      targetCtx.moveTo(seg.p3.x, seg.p3.y);
      targetCtx.lineTo(seg.cp2.x, seg.cp2.y);
      targetCtx.stroke();

      // Control points
      targetCtx.setLineDash([]);
      targetCtx.fillStyle = '#F62440'; // CP1 dot
      targetCtx.beginPath();
      targetCtx.arc(seg.cp1.x, seg.cp1.y, 3.5, 0, Math.PI * 2);
      targetCtx.fill();

      targetCtx.fillStyle = '#2196F3'; // CP2 dot
      targetCtx.beginPath();
      targetCtx.arc(seg.cp2.x, seg.cp2.y, 3.5, 0, Math.PI * 2);
      targetCtx.fill();

      // End points (green)
      targetCtx.fillStyle = '#4CAF50';
      targetCtx.beginPath();
      targetCtx.arc(seg.p0.x, seg.p0.y, 4, 0, Math.PI * 2);
      targetCtx.arc(seg.p3.x, seg.p3.y, 4, 0, Math.PI * 2);
      targetCtx.fill();
    });

    // 2. Progress percentage label near current tip
    targetCtx.font = '11px monospace';
    targetCtx.fillStyle = 'rgba(28, 23, 20, 0.9)';
    const pctText = `${Math.round(progress * 100)}%`;
    targetCtx.fillText(pctText, currentPt.x + 12, currentPt.y - 10);

    targetCtx.restore();
  }

  function drawDebugHud() {
    if (!ctx) return;
    ctx.save();
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = 'rgba(28, 23, 20, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.5;

    const hudText = `[TurtleCanvas Debug] scrollY: ${Math.round(currentScroll)}px | target: ${Math.round(targetScroll)}px | curves: ${debugCurveCount} | motion: ${prefersReducedMotion ? 'reduced' : 'smooth'}`;
    const x = 16;
    const y = viewportHeight - 16;

    ctx.strokeText(hudText, x, y);
    ctx.fillText(hudText, x, y);
    ctx.restore();
  }

  // ----------------------------------------------------------------------------
  // Explicit Curve Drawing Helpers (Quadratic, Cubic, Spline)
  // ----------------------------------------------------------------------------

  /**
   * Draws a Quadratic Bézier curve (single control point).
   * @param {Object} options
   * @param {{x: number|string, y: number|string}} options.start - Start point
   * @param {{x: number|string, y: number|string}} options.control - Control bend point
   * @param {{x: number|string, y: number|string}} options.end - End point
   * @param {number} [options.progress=1.0] - Progress 0.0 to 1.0
   * @param {boolean} [options.moveWithScroll=false] - false = fixed, true = scrolls with page
   */
  function drawQuadratic(options) {
    if (!options) return;
    if (!options.start || !options.control || !options.end) {
      console.warn('[TurtleCanvas] drawQuadratic requires "start", "control", and "end" points.', options);
      return;
    }
    drawCurveInternal(options, 'quadratic');
  }

  /**
   * Draws a Cubic Bézier curve (two control points for S-curves).
   * @param {Object} options
   * @param {{x: number|string, y: number|string}} options.start - Start point
   * @param {{x: number|string, y: number|string}} options.cp1 - First control handle
   * @param {{x: number|string, y: number|string}} options.cp2 - Second control handle
   * @param {{x: number|string, y: number|string}} options.end - End point
   * @param {number} [options.progress=1.0] - Progress 0.0 to 1.0
   * @param {boolean} [options.moveWithScroll=false] - false = fixed, true = scrolls with page
   */
  function drawCubic(options) {
    if (!options) return;
    if (!options.start || !options.cp1 || !options.cp2 || !options.end) {
      console.warn('[TurtleCanvas] drawCubic requires "start", "cp1", "cp2", and "end" points.', options);
      return;
    }
    drawCurveInternal(options, 'cubic');
  }

  /**
   * Draws a multi-point spline passing smoothly through all waypoints.
   * @param {Object} options
   * @param {Array<{x: number|string, y: number|string}>} options.points - Array of waypoints
   * @param {number} [options.progress=1.0] - Progress 0.0 to 1.0
   * @param {boolean} [options.moveWithScroll=false] - false = fixed, true = scrolls with page
   */
  function drawSpline(options) {
    if (!options) return;
    if (!Array.isArray(options.points) || options.points.length < 2) {
      console.warn('[TurtleCanvas] drawSpline requires a "points" array with at least 2 waypoints.', options);
      return;
    }
    drawCurveInternal(options, 'spline');
  }

  /**
   * Flexible wrapper with input validation. Auto-detects quadratic, cubic, or spline based on keys passed.
   * @param {Object} options
   */
  function drawCurve(options) {
    if (!options || typeof options !== 'object') {
      console.warn('[TurtleCanvas] drawCurve: options must be an object.');
      return;
    }

    const src = options.curve || options;

    if (src.control || src.cp || src.ctrl) {
      drawQuadratic(options);
    } else if (src.cp1 && src.cp2) {
      drawCubic(options);
    } else if (Array.isArray(src.points)) {
      drawSpline(options);
    } else {
      console.warn(
        '[TurtleCanvas] drawCurve: Invalid curve definition! You must provide either:\n' +
        '  - { start, control, end } for a Quadratic curve\n' +
        '  - { start, cp1, cp2, end } for a Cubic curve\n' +
        '  - { points: [...] } for a Waypoint Spline',
        options
      );
    }
  }

  /**
   * Draws text flowing along any curve path (spline, quadratic, or cubic).
   * @param {Object} options
   */
  function drawTextOnCurve(options) {
    if (!options || typeof options !== 'object') return;
    const opts = Object.assign({}, options, {
      stroke: options.stroke !== undefined ? options.stroke : false,
      strokeWidth: options.strokeWidth || 0
    });
    drawCurve(opts);
  }

  // ----------------------------------------------------------------------------
  // Internal Curve Engine
  // ----------------------------------------------------------------------------
  function drawCurveInternal(options, detectedType) {
    if (!ctx) return;

    let progress = options.progress;
    if (progress === undefined) {
      if (options.duration !== undefined || options.delay !== undefined) {
        progress = getTimelineHelper({
          id: options.id,
          duration: options.duration,
          delay: options.delay,
          reverse: options.reverse,
          loop: options.loop,
          ease: options.ease || options.easing
        });
      } else {
        progress = 1.0;
      }
    }
    progress = clamp(progress, 0, 1);
    // When prefers-reduced-motion is active, snap curve to full length immediately
    if (prefersReducedMotion && progress > 0) {
      progress = 1.0;
    }
    if (progress <= 0) return;

    // moveWithScroll: true = moves on Y axis with scroll; false = fixed on screen
    let moveWithScroll = false;
    if (typeof options.moveWithScroll === 'boolean') {
      moveWithScroll = options.moveWithScroll;
    } else if (typeof options.scrollWithPage === 'boolean') {
      moveWithScroll = options.scrollWithPage;
    } else if (typeof options.fixed === 'boolean') {
      moveWithScroll = !options.fixed;
    }

    const yBasis = moveWithScroll ? documentHeight : viewportHeight;
    const src = options.curve || options;
    let segments = [];

    if (detectedType === 'quadratic' || src.control || src.cp || src.ctrl) {
      const p0 = {
        x: resolveValue((src.start || src.from).x, viewportWidth),
        y: resolveValue((src.start || src.from).y, yBasis)
      };
      const p1 = {
        x: resolveValue((src.control || src.cp || src.ctrl).x, viewportWidth),
        y: resolveValue((src.control || src.cp || src.ctrl).y, yBasis)
      };
      const p2 = {
        x: resolveValue((src.end || src.to).x, viewportWidth),
        y: resolveValue((src.end || src.to).y, yBasis)
      };

      segments.push({
        p0,
        cp1: { x: p0.x + (2 / 3) * (p1.x - p0.x), y: p0.y + (2 / 3) * (p1.y - p0.y) },
        cp2: { x: p2.x + (2 / 3) * (p1.x - p2.x), y: p2.y + (2 / 3) * (p1.y - p2.y) },
        p3: p2
      });
    } else if (detectedType === 'cubic' || (src.cp1 && src.cp2)) {
      const p0 = {
        x: resolveValue((src.start || src.from).x, viewportWidth),
        y: resolveValue((src.start || src.from).y, yBasis)
      };
      const cp1 = {
        x: resolveValue((src.cp1 || src.ctrl1).x, viewportWidth),
        y: resolveValue((src.cp1 || src.ctrl1).y, yBasis)
      };
      const cp2 = {
        x: resolveValue((src.cp2 || src.ctrl2).x, viewportWidth),
        y: resolveValue((src.cp2 || src.ctrl2).y, yBasis)
      };
      const p3 = {
        x: resolveValue((src.end || src.to).x, viewportWidth),
        y: resolveValue((src.end || src.to).y, yBasis)
      };

      segments.push({ p0, cp1, cp2, p3 });
    } else if (detectedType === 'spline' || Array.isArray(src.points)) {
      const resolvedPts = src.points.map(pt => ({
        x: resolveValue(pt.x, viewportWidth),
        y: resolveValue(pt.y, yBasis)
      }));
      segments = catmullRomToCubicSegments(resolvedPts);
    }

    if (segments.length === 0) return;

    // Determine if scrolling motion is smoothed (LERP) or locked 1:1 instantaneously (no jelly)
    const isSmooth = options.smooth !== false && options.lerp !== false && CONFIG.smooth !== false;
    const effectiveScroll = isSmooth ? currentScroll : (typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || targetScroll) : targetScroll);

    // Viewport Frustum Culling Check:
    // If moveWithScroll is true and curve bounding box is completely off-screen, skip drawing!
    if (moveWithScroll) {
      let minY = Infinity;
      let maxY = -Infinity;
      segments.forEach(s => {
        minY = Math.min(minY, s.p0.y, s.p3.y, s.cp1.y, s.cp2.y);
        maxY = Math.max(maxY, s.p0.y, s.p3.y, s.cp1.y, s.cp2.y);
      });
      const screenMinY = minY - effectiveScroll;
      const screenMaxY = maxY - effectiveScroll;
      const pad = 120; // 120px margin of safety
      if (screenMaxY < -pad || screenMinY > viewportHeight + pad) {
        return; // Culled: outside viewport
      }
    }

    // Discretize into uniform points for smooth arc-length parameterized drawing
    const samplesPerSegment = 40;
    const rawPoints = [];
    segments.forEach((seg, sIdx) => {
      const startI = sIdx === 0 ? 0 : 1;
      for (let i = startI; i <= samplesPerSegment; i++) {
        rawPoints.push(evalCubicBezier(seg.p0, seg.cp1, seg.cp2, seg.p3, i / samplesPerSegment));
      }
    });

    if (rawPoints.length < 2) return;

    // Compute cumulative distances
    const cumulativeDist = [0];
    let totalLen = 0;
    for (let i = 1; i < rawPoints.length; i++) {
      const dx = rawPoints[i].x - rawPoints[i - 1].x;
      const dy = rawPoints[i].y - rawPoints[i - 1].y;
      totalLen += Math.sqrt(dx * dx + dy * dy);
      cumulativeDist.push(totalLen);
    }

    // Start Progress / Tail Trimming (removes stroke from tail to head on scroll)
    let startProgress = 0.0;
    if (options.removeOnScroll !== undefined) {
      if (typeof options.removeOnScroll === 'boolean') {
        startProgress = options.removeOnScroll ? getProgressHelper(0, 450) : 0.0;
      } else if (Array.isArray(options.removeOnScroll) && options.removeOnScroll.length >= 2) {
        startProgress = getProgressHelper(options.removeOnScroll[0], options.removeOnScroll[1]);
      } else if (typeof options.removeOnScroll === 'number') {
        startProgress = getProgressHelper(0, options.removeOnScroll);
      } else if (typeof options.removeOnScroll === 'object') {
        startProgress = getProgressHelper(options.removeOnScroll.start || 0, options.removeOnScroll.end || 450);
      }
    } else if (typeof options.startProgress === 'number') {
      startProgress = options.startProgress;
    } else if (typeof options.trimStart === 'number') {
      startProgress = options.trimStart;
    } else if (typeof options.tailProgress === 'number') {
      startProgress = options.tailProgress;
    }
    startProgress = clamp(startProgress, 0.0, 1.0);

    // If tail has overtaken head, stroke is completely removed
    if (startProgress >= progress) {
      return;
    }

    const targetDist = progress * totalLen;
    let idx = 0;
    while (idx < cumulativeDist.length - 1 && cumulativeDist[idx + 1] < targetDist) {
      idx++;
    }

    const d0 = cumulativeDist[idx];
    const d1 = cumulativeDist[Math.min(idx + 1, cumulativeDist.length - 1)];
    const span = d1 - d0;
    const segT = span > 0.0001 ? (targetDist - d0) / span : 0;

    const pA = rawPoints[idx];
    const pB = rawPoints[Math.min(idx + 1, rawPoints.length - 1)];

    const currentPt = {
      x: pA.x + (pB.x - pA.x) * segT,
      y: pA.y + (pB.y - pA.y) * segT
    };

    let angle = 0;
    let dx = pB.x - pA.x;
    let dy = pB.y - pA.y;
    if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001 && idx > 0) {
      const pPrev = rawPoints[idx - 1];
      dx = pA.x - pPrev.x;
      dy = pA.y - pPrev.y;
    }
    if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
      angle = Math.atan2(dy, dx);
    }

    // Determine tail starting point (removed progressively from tail toward head)
    let startPt = rawPoints[0];
    let startIdx = 0;

    if (startProgress > 0) {
      const startDist = startProgress * totalLen;
      while (startIdx < cumulativeDist.length - 1 && cumulativeDist[startIdx + 1] < startDist) {
        startIdx++;
      }
      const s_d0 = cumulativeDist[startIdx];
      const s_d1 = cumulativeDist[Math.min(startIdx + 1, cumulativeDist.length - 1)];
      const s_span = s_d1 - s_d0;
      const s_segT = s_span > 0.0001 ? (startDist - s_d0) / s_span : 0;
      const s_pA = rawPoints[startIdx];
      const s_pB = rawPoints[Math.min(startIdx + 1, rawPoints.length - 1)];
      startPt = {
        x: s_pA.x + (s_pB.x - s_pA.x) * s_segT,
        y: s_pA.y + (s_pB.y - s_pA.y) * s_segT
      };
    }

    const strokeColor = resolveColor(options.strokeColor || options.color || CONFIG.defaultColor);
    const strokeWidth = options.strokeWidth || options.width || CONFIG.defaultWidth;

    ctx.save();

    // When moveWithScroll is true: translate by -effectiveScroll
    // If smooth is false, this locks 1:1 directly to the page scroll without any jelly lag!
    if (moveWithScroll) {
      ctx.translate(0, -effectiveScroll);
    }

    // Draw main stroke from startPt (tail) to currentPt (head)
    const drawStroke = options.stroke !== false && strokeWidth > 0;
    if (drawStroke) {
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (options.dash) ctx.setLineDash(options.dash);

      ctx.moveTo(startPt.x, startPt.y);
      for (let i = startIdx + 1; i <= idx; i++) {
        ctx.lineTo(rawPoints[i].x, rawPoints[i].y);
      }
      ctx.lineTo(currentPt.x, currentPt.y);
      ctx.stroke();
    }

    // Draw text flowing along the curve path
    if (options.text) {
      const textList = Array.isArray(options.text) ? options.text : [options.text];
      textList.forEach((tOpt) => {
        drawTextAlongPath(
          ctx,
          rawPoints,
          cumulativeDist,
          totalLen,
          tOpt,
          targetDist,
          (startProgress * totalLen),
          strokeColor
        );
      });
    }

    // Draw arrow at leading tip if tail hasn't overtaken it
    const arrowOpt = options.arrow;
    const showArrow = arrowOpt !== false && arrowOpt !== undefined;
    if (showArrow && (progress - startProgress) > 0.015) {
      const hideAtEnd = typeof arrowOpt === 'object' && arrowOpt.hideAtEnd === true;
      if (!hideAtEnd || progress < 1.0) {
        const arrowSize = typeof arrowOpt === 'object' && arrowOpt.size ? arrowOpt.size : 18;
        const arrowColor = typeof arrowOpt === 'object' && arrowOpt.color ? resolveColor(arrowOpt.color) : strokeColor;
        const arrowStyle = typeof arrowOpt === 'object' && arrowOpt.style ? arrowOpt.style : 'solid';
        drawArrowHead(ctx, currentPt.x, currentPt.y, angle, { size: arrowSize, color: arrowColor, style: arrowStyle });
      }
    }

    // Debug Mode Handles & Visualizer
    const isDebug = options.debug !== undefined ? options.debug : CONFIG.debug;
    if (isDebug) {
      drawDebugOverlay(ctx, segments, options, currentPt, progress);
    }

    ctx.restore();
    debugCurveCount++;
  }

  // ----------------------------------------------------------------------------
  // Helper: getProgress(start, end)
  // ----------------------------------------------------------------------------
  function getProgressHelper(startTrigger, endTrigger) {
    const start = resolveScroll(startTrigger);
    const end = resolveScroll(endTrigger);
    if (end <= start) return currentScroll >= start ? 1.0 : 0.0;
    return clamp((currentScroll - start) / (end - start), 0.0, 1.0);
  }

  // ----------------------------------------------------------------------------
  // Engine Render Frame
  // ----------------------------------------------------------------------------
  function renderFrame() {
    if (!ctx || !canvas) return;

    debugCurveCount = 0;
    timelineAutoIdCounter = 0;
    anyTimelineActive = false;

    const nowTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsedSeconds = (nowTime - engineStartTime) / 1000;

    // Clear whole canvas
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);

    // Call user's animate({ ... }) function
    const userAnimate = (root.ArrowAnimation && root.ArrowAnimation.animate) || root.animate;

    if (typeof userAnimate === 'function') {
      userAnimate({
        time: elapsedSeconds,
        timeMs: nowTime - engineStartTime,
        getTimeline: getTimelineHelper,
        scrollY: currentScroll,
        rawScroll: window.scrollY || window.pageYOffset || 0,
        targetScroll: targetScroll,
        width: viewportWidth,
        height: viewportHeight,
        docHeight: documentHeight,
        ctx: ctx,
        canvas: canvas,
        getProgress: getProgressHelper,
        drawCurve: drawCurve,
        drawQuadratic: drawQuadratic,
        drawCubic: drawCubic,
        drawSpline: drawSpline,
        drawTextOnCurve: drawTextOnCurve,
        drawArrow: function (x, y, angle, opts) {
          drawArrowHead(ctx, x, y, angle, opts);
        },
        getElementY: getElementY,
        pointAt: pointAt,
        lerp: lerp,
        clamp: clamp,
        withScroll: function (moveWithScroll, fn) {
          ctx.save();
          if (moveWithScroll) ctx.translate(0, -currentScroll);
          fn(ctx);
          ctx.restore();
        }
      });
    }

    // Draw Debug HUD overlay if debug is globally enabled
    if (CONFIG.debug) {
      drawDebugHud();
    }
  }

  // ----------------------------------------------------------------------------
  // Animation Frame Loop
  // ----------------------------------------------------------------------------
  function tick() {
    if (!isTabVisible) {
      isAnimating = false;
      return;
    }

    // If reduced motion is requested, snap immediately
    if (prefersReducedMotion) {
      currentScroll = targetScroll;
      renderFrame();
      isAnimating = false;
      rafId = null;
      return;
    }

    const diff = targetScroll - currentScroll;
    const isScrollMoving = (CONFIG.smooth && CONFIG.ease < 1.0) ? Math.abs(diff) > 0.15 : false;

    if (isScrollMoving) {
      currentScroll += diff * CONFIG.ease;
    } else {
      currentScroll = targetScroll;
    }

    renderFrame();

    if (isScrollMoving || anyTimelineActive) {
      rafId = requestAnimationFrame(tick);
    } else {
      currentScroll = targetScroll;
      isAnimating = false;
      rafId = null;
    }
  }

  function requestTick() {
    if (!isAnimating && isTabVisible) {
      isAnimating = true;
      rafId = requestAnimationFrame(tick);
    }
  }

  function onScroll() {
    targetScroll = window.scrollY || window.pageYOffset || 0;
    if (!CONFIG.smooth || CONFIG.ease >= 1.0) {
      currentScroll = targetScroll;
      renderFrame();
      return;
    }
    requestTick();
  }

  function onVisibilityChange() {
    isTabVisible = document.visibilityState !== 'hidden';
    if (isTabVisible) {
      targetScroll = window.scrollY || window.pageYOffset || 0;
      currentScroll = targetScroll;
      requestTick();
    } else {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      isAnimating = false;
    }
  }

  function resizeCanvas() {
    updateMetrics();
    if (!canvas) return;

    canvas.width = Math.round(viewportWidth * dpr);
    canvas.height = Math.round(viewportHeight * dpr);
    canvas.style.width = viewportWidth + 'px';
    canvas.style.height = viewportHeight + 'px';

    ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    // Call user's init(canvas, ctx)
    const userInit = (root.ArrowAnimation && root.ArrowAnimation.init) || root.init;
    if (typeof userInit === 'function') {
      try {
        userInit(canvas, ctx);
      } catch (e) {
        console.error('Error in user init():', e);
      }
    }

    renderFrame();
  }

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 60);
  }

  // ----------------------------------------------------------------------------
  // Lifecycle & Public API
  // ----------------------------------------------------------------------------
  function ensureCanvas() {
    canvas = document.getElementById(CONFIG.canvasId);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = CONFIG.canvasId;
      canvas.className = 'turtle-canvas arrow-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(canvas);
    }
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';
    ctx = canvas.getContext('2d');
  }

  // ----------------------------------------------------------------------------
  // Rubber Text Reveal (Per-Letter & Scroll Triggered)
  // Delegated to standalone rubber-text.js (window.initRubberText)
  // ----------------------------------------------------------------------------
  function initRubberText() {
    if (typeof window !== 'undefined' && typeof window.initRubberText === 'function') {
      return window.initRubberText();
    }
  }

  function start() {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) return; // Completely disable canvas on mobile devices

    checkMotionPreference();
    initRubberText();
    ensureCanvas();
    updateMetrics();
    resizeCanvas();

    targetScroll = window.scrollY || window.pageYOffset || 0;
    currentScroll = targetScroll;
    renderFrame();
    requestTick(); // Kick off frame loop for any time-based animations

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  function destroy() {
    if (typeof window === 'undefined') return;

    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    isAnimating = false;

    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    canvas = null;
    ctx = null;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }

  // Expose public API
  const publicAPI = {
    start: start,
    destroy: destroy,
    refresh: resizeCanvas,
    initRubberText: initRubberText,
    getTimeline: getTimelineHelper,
    resetTimeline: function (id) {
      if (id) {
        timelines.delete(id);
      } else {
        timelines.clear();
      }
      requestTick();
    },
    setEase: function (val) { CONFIG.ease = val; },
    setSmooth: function (enabled) {
      CONFIG.smooth = !!enabled;
      renderFrame();
    },
    setOptions: function (opts) {
      if (!opts) return;
      if (typeof opts.ease === 'number') CONFIG.ease = opts.ease;
      if (typeof opts.smooth === 'boolean') CONFIG.smooth = opts.smooth;
      if (typeof opts.debug === 'boolean') CONFIG.debug = opts.debug;
      if (typeof opts.defaultColor === 'string') CONFIG.defaultColor = opts.defaultColor;
      if (typeof opts.defaultWidth === 'number') CONFIG.defaultWidth = opts.defaultWidth;
      renderFrame();
    },
    setDebug: function (enabled) {
      CONFIG.debug = !!enabled;
      renderFrame();
    },
    toggleDebug: function () {
      CONFIG.debug = !CONFIG.debug;
      renderFrame();
      return CONFIG.debug;
    },
    drawTextOnCurve: drawTextOnCurve,
    // Export pure math & helpers for testing or direct usage
    math: {
      clamp: clamp,
      lerp: lerp,
      applyEasing: applyEasing,
      evalCubicBezier: evalCubicBezier,
      catmullRomToCubicSegments: catmullRomToCubicSegments,
      samplePathAtDistance: samplePathAtDistance,
      getProgress: getProgressHelper,
      getTimeline: getTimelineHelper,
      resolveScroll: resolveScroll,
      resolveValue: resolveValue
    }
  };

  root.TurtleEngine = publicAPI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = publicAPI;
  }

})(typeof self !== 'undefined' ? self : this);
