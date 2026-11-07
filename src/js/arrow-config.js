/**
 * ==============================================================================
 * Arrow Animation Code (Your Custom Code File)
 * ==============================================================================
 * Write your own animation code here using real functions, if-statements, and loops!
 *
 * YOU HAVE TWO MAIN FUNCTIONS:
 *  1. init(canvas, ctx) — Runs once on page load (and on window resize).
 *  2. animate(state)    — Runs on every animation frame (smooth 60/120fps).
 *
 * STATE OBJECT PASSED TO animate(state):
 *  - scrollY:        Smoothed scroll position (buttery smooth LERP)
 *  - rawScroll:      Direct window.scrollY
 *  - width, height:  Viewport dimensions in pixels
 *  - docHeight:      Total scrollable document height
 *  - ctx:            HTML5 2D Canvas rendering context
 *  - getProgress:    getProgress(startScroll, endScroll) -> 0.0 to 1.0
 *  - getElementY:    getElementY(selector, align) -> absolute document Y of element
 *  - pointAt:        pointAt(selector, xRatio, yRatio) -> { x, y } anchored to element
 *  - drawQuadratic:  drawQuadratic({ start, control, end, progress, ... })
 *  - drawCubic:      drawCubic({ start, cp1, cp2, end, progress, ... })
 *  - drawSpline:     drawSpline({ points: [...], progress, text: 'explore', ... })
 *  - drawTextOnCurve: drawTextOnCurve({ points: [...], text: 'explore', ... })
 *  - drawCurve:      drawCurve(options) -> validated wrapper for any shape
 *  - drawArrow:      drawArrow(x, y, angle, options) -> draws arrow head sprite
 *
 * TEXT ALONG CURVE OPTIONS:
 *  - text: 'explore' (or text: { content: 'explore', offset: 0.5, font: '...', baselineOffset: -12 })
 *  - followProgress: true (reveals letters naturally as the curve draws)
 *  - baselineOffset: -12 (floats above curve line; 0 = on curve; +12 = below)
 *
 * BOOLEAN: moveWithScroll
 *  - false = FIXED on the screen (stays in place as you scroll) [DEFAULT]
 *  - true  = MOVES on Y-axis with the scroll (anchored to page content)
 * ==============================================================================
 */

let themeColor = '#F62440'; // Crimson accent
let warmColor = '#FFE5BF'; // Secondary warm tone
let itemScreenState = [false, false, false];

/**
 * ------------------------------------------------------------------------------
 * 1. init(canvas, ctx)
 * Setup initial values, precalculate math, or set options.
 * ------------------------------------------------------------------------------
 */
function init(canvas, ctx) {
  if (typeof window !== 'undefined' && window.innerWidth < 768) return;
  // Tip: Press 'D' in browser or run window.TurtleEngine.toggleDebug() to see control points!
  itemScreenState = [false, false, false];
  if (typeof document !== 'undefined') {
    document.querySelectorAll('.experience-stage .experience-float-item').forEach((item) => {
      item.classList.remove('is-active', 'is-visible');
      item.style.removeProperty('--role-slide-x');
      item.style.opacity = '0';
      item.style.visibility = 'hidden';
      item.style.pointerEvents = 'none';
    });

    const backToTopBtn = document.getElementById('experience-back-to-top');
    if (backToTopBtn && !backToTopBtn.dataset.bound) {
      backToTopBtn.dataset.bound = 'true';
      backToTopBtn.addEventListener('click', () => {
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({
          top: 0,
          behavior: prefersReduced ? 'auto' : 'smooth'
        });
      });
    }
  }
}

/**
 * ------------------------------------------------------------------------------
 * 2. animate(state)
 * Runs continuously on requestAnimationFrame.
 * Use if-statements, math, anchors, and loops to control your curves and arrow!
 * ------------------------------------------------------------------------------
 */
function animate({
  time,
  getTimeline,
  scrollY,
  width,
  height,
  getProgress,
  getElementY,
  pointAt,
  drawQuadratic,
  drawCubic,
  drawSpline,
  drawTextOnCurve,
  drawCurve
}) {
  if (width < 768) return; // Completely disable canvas animation loops on mobile screens

  // ============================================================================
  // About Page Curve (User Drawn Loop Arrow)
  // ============================================================================
  const isAboutPage = typeof document !== 'undefined' && !!document.querySelector('.about-hero, .about-section');

  if (isAboutPage) {
    const progress = getTimeline({
      duration: 1800,  // Animation duration
      delay: 300,      // Delay before starting
      reverse: false,
      loop: false,
      ease: 'easeInOut'
    });

    if (progress > 0) {
      const aboutArrowPoints = [
        { x: 0.001, y: 0.788 },
        { x: 0.061, y: 0.780 },
        { x: 0.142, y: 0.720 },
        { x: 0.246, y: 0.638 },
        { x: 0.336, y: 0.656 },
        { x: 0.363, y: 0.761 },
        { x: 0.305, y: 0.831 },
        { x: 0.261, y: 0.736 },
        { x: 0.312, y: 0.624 },
        { x: 0.373, y: 0.592 },
        { x: 0.501, y: 0.587 },
        { x: 0.621, y: 0.634 },
        { x: 0.710, y: 0.762 },
        { x: 0.710, y: 0.888 }
      ];

      const points = aboutArrowPoints.map((p) => ({
        x: p.x * width,
        y: p.y * height
      }));

      drawSpline({
        points: points,
        progress: progress,
        strokeWidth: 3.5,
        strokeColor: themeColor,
        moveWithScroll: true,
        smooth: false,
        text: {
        content: 'ABOUT ME',
        offset: 0.9,               // Positioned along the curve flow
        reverse: false,              // Reverses letter order so it reads left-to-right along right-to-left curve flow
        baselineOffset: -14,         // Floats neatly 14px above the curve line
        font: '600 13px Poppins, -apple-system, sans-serif',
        color: themeColor,
        letterSpacing: 2.5,
        followProgress: true        // Reveals smoothly with the drawing curve
      },
        arrow: {
          show: true,
          size: 24,
          color: themeColor,
          style: 'sketch'
        }
      });
    }
    return;
  }

  // ============================================================================
  // Contact Page Curve (Arrow Flow Below "Let's connect")
  // ============================================================================
  const isContactPage = typeof document !== 'undefined' && !!document.querySelector('.contact-hero, .contact-layout');

  if (isContactPage) {
    const progress = getTimeline({
      duration: 1800,  // Animation duration
      delay: 300,      // Delay before starting
      reverse: false,
      loop: false,
      ease: 'easeInOut'
    });

    if (progress > 0) {
      const contactArrowPoints = [
        { x: 0.001, y: 0.788 },
        { x: 0.061, y: 0.780 },
        { x: 0.142, y: 0.720 },
        { x: 0.246, y: 0.638 },
        { x: 0.336, y: 0.656 },
        { x: 0.363, y: 0.761 },
        { x: 0.305, y: 0.831 },
        { x: 0.261, y: 0.736 },
        { x: 0.312, y: 0.624 },
        { x: 0.373, y: 0.592 },
        { x: 0.501, y: 0.587 },
        { x: 0.621, y: 0.634 },
        { x: 0.710, y: 0.762 },
        { x: 0.710, y: 0.888 }
      ];

      const points = contactArrowPoints.map((p) => ({
        x: p.x * width,
        y: p.y * height
      }));

      drawSpline({
        points: points,
        progress: progress,
        strokeWidth: 3.5,
        strokeColor: themeColor,
        moveWithScroll: true,
        smooth: false,
        text: {
          content: 'SAY HELLO',
          offset: 0.9,
          reverse: false,
          baselineOffset: -14,
          font: '600 13px Poppins, -apple-system, sans-serif',
          color: themeColor,
          letterSpacing: 2.5,
          followProgress: true
        },
        arrow: {
          show: true,
          size: 24,
          color: themeColor,
          style: 'sketch'
        }
      });
    }
    return;
  }

  // ============================================================================
  // Homepage Hero Section: Looping Sketch Curve ("LET'S CONNECT")
  // - Arch crest on top-left
  // - Downward S-curve wave into bottom trough
  // - Smooth 360-degree loop-de-loop
  // - Crossover and forward exit into sketch-style arrow head pointing to CTA
  // - Only runs on the homepage where .hero is present
  // ============================================================================
  const isHomePageHero = typeof document !== 'undefined' && !!document.querySelector('.hero, .hero-content');

  if (isHomePageHero) {
    const progress = getTimeline({
      duration: 1800,  // Animation duration
      delay: 300,      // Delay before starting
      reverse: false,  // true = draw in reverse; false = forward; 'alternate' = ping-pong back and forth
      loop: false,     // true = loop forever; false = play once
      ease: 'easeInOut'
    });

    if (progress > 0 && width > 800) {
      // Responsive bounding box centered on viewport
      const boxWidth = Math.max(width, 950);
      const boxHeight = Math.max(height, 520);
      const startX = (width - boxWidth) / 2;
      const startY = (height - boxHeight) / 2;

      // Landmark points precisely traced from the reference sketch (normalized 0.0 - 1.0)
      const sketchPoints =[
        { x: 0.750, y: -0.012 },
        { x: 0.827, y: 0.067 },
        { x: 0.891, y: 0.200 },
        { x: 0.919, y: 0.307 },
        { x: 0.918, y: 0.453 },
        { x: 0.884, y: 0.646 },
        { x: 0.829, y: 0.710 },
        { x: 0.772, y: 0.651 },
        { x: 0.765, y: 0.528 },
        { x: 0.822, y: 0.455 },
        { x: 0.895, y: 0.541 },
        { x: 0.896, y: 0.712 },
        { x: 0.834, y: 0.842 },
        { x: 0.749, y: 0.930 },
        { x: 0.616, y: 0.965 },
        { x: 0.492, y: 0.915 },
        { x: 0.411, y: 0.857 }
      ];

      // Scale to screen pixels
      const points = sketchPoints.map((p) => ({
        x: startX + p.x * boxWidth,
        y: startY + p.y * boxHeight
      }));

      drawSpline({
        points: points,
        progress: progress,
        removeOnScroll: [0, 200], // Removes stroke from tail to head as you scroll (from 0px to 450px)
        strokeWidth: 3.5,
        strokeColor: themeColor,
        moveWithScroll: true, // true = Moves with the page content
        smooth: false,        // false = Instant 1:1 scroll lock (NO jelly delay, NO momentum lag)
        text: {
          content: 'LET\'S CONNECT',
          offset: 0.16,               // Positioned along the curve flow
          reverse: false,              // Reverses letter order so it reads left-to-right along right-to-left curve flow
          baselineOffset: -14,         // Floats neatly 14px above the curve line
          font: '600 13px Poppins, -apple-system, sans-serif',
          color: themeColor,
          letterSpacing: 2.5,
          followProgress: true        // Reveals smoothly with the drawing curve
        },
        arrow: {
          show: true,
          size: 26,
          color: themeColor,
          style: 'sketch' // 'sketch' = hand-drawn hatched arrow head from drawing; 'solid' = clean fill
        }
      });
    }
  }

  // ============================================================================
  // Works & Projects Section Curve (Similar Arrow Cursor Flow to About Page)
  // - Starts drawing as user scrolls toward Works & Projects
  // - Positioned in the spacious gap below "Works & Projects" title
  // - Swoops across with loop-de-loop and sketch arrow head pointing down to project cards
  // - Erases smoothly from tail to head as user scrolls down into the projects list
  // ============================================================================
  const projectSection = document.querySelector('#featured-projects, .featured-projects-hero');
  const projectY = projectSection ? getElementY(projectSection.id ? ('#' + projectSection.id) : '.featured-projects-hero', 'top') : 0;

  if (projectSection && projectY >= 0) {
    const heroEl = document.querySelector('.featured-projects-hero') || projectSection;
    const heroHeight = (heroEl && heroEl.offsetHeight > 100) ? heroEl.offsetHeight : height;
    const headerOffset = 64;

    const isInnerPage = projectY <= headerOffset + 50;

    let drawProgress = 1.0;
    let removeProgress = 0.0;

    if (isInnerPage) {
      // Dedicated /projects page: entrance timeline + scroll exit
      drawProgress = getTimeline({
        id: 'projects-curve-entrance',
        duration: 1800,
        delay: 300,
        ease: 'easeInOut'
      });
   //   removeProgress = getProgress(0, 350);
    } else {
      // Homepage: scroll into view entrance + scroll past exit
      const showStart = Math.max(0, projectY - height * 0.45 - headerOffset);
      const showEnd = showStart + Math.min(height * 0.40, 360);
      drawProgress = getProgress(showStart, showEnd);

      const hideStart = projectY + heroHeight * 0.25;
      const hideEnd = hideStart + height * 0.50;
      removeProgress = getProgress(hideStart, hideEnd);
    }

    if (drawProgress > 0 && removeProgress < 1.0) {
      // Landmark points matching about.html's graceful loop arrow flow
      const projectArrowPoints = [
  { x: -0.002, y: 0.389 },
  { x: 0.018, y: 0.557 },
  { x: 0.062, y: 0.700 },
  { x: 0.153, y: 0.728 },
  { x: 0.191, y: 0.681 },
  { x: 0.197, y: 0.605 },
  { x: 0.176, y: 0.549 },
  { x: 0.125, y: 0.524 },
  { x: 0.087, y: 0.578 },
  { x: 0.103, y: 0.701 },
  { x: 0.183, y: 0.774 },
  { x: 0.317, y: 0.808 },
  { x: 0.398, y: 0.925 }
];
      const points = projectArrowPoints.map((p) => ({
        x: p.x * width,
        y: projectY + p.y * heroHeight
      }));

      drawSpline({
        points: points,
        progress: drawProgress,
        startProgress: removeProgress,
        strokeWidth: 3.5,
        strokeColor: themeColor,
        moveWithScroll: true,
        smooth: false,
        text: {
          content: 'Explore',
          offset: 0.90,
          reverse: false,
          baselineOffset: -14,
          font: '600 13px Poppins, -apple-system, sans-serif',
          color: themeColor,
          letterSpacing: 2.5,
          followProgress: true
        },
        arrow: {
          show: true,
          size: 24,
          color: themeColor,
          style: 'sketch'
        }
      });
    }
  }

  // ============================================================================
  // Experience Section: Role Moves Right-to-Left & Arrow Flow Follows Till End
  // - Roles slide in from RIGHT to LEFT on scroll (not just popping up)
  // - Letters reveal with title's rubber squash & stretch spring physics
  // - Arrow flow dynamically follows the active role across the stage till the end
  // - Year text rendered along the curve line
  // ============================================================================
  const expPinTrack = document.querySelector('#experience-pin-track');
  const expY = getElementY('#experience', 'top');

  if (expY > 0 && expPinTrack) {
    const headerOffset = 64;
    const pinStart = Math.max(0, expY - headerOffset);
    const pinDistance = expPinTrack.offsetHeight - height;
    const pinEnd = pinStart + Math.max(100, pinDistance);

    const expProgress = getProgress(pinStart, pinEnd);

    // Fade/erase out as you scroll past the experience section into footer
    const pastSectionStart = pinEnd;
    const pastSectionEnd = pinEnd + height * 0.4;
    const pastProgress = getProgress(pastSectionStart, pastSectionEnd);

    if (expProgress <= 0 || pastProgress >= 1.0) {
      updateExperienceRoleMotion(null, width, 0, 0, 0, 0, false);
      const backToTopBtn = document.getElementById('experience-back-to-top');
      if (backToTopBtn) {
        backToTopBtn.classList.remove('is-visible');
      }
    } else {
      // Find stable vertical placement of experience stage
      let stageTop = height * 0.35;
      let stageBottom = height * 0.85;
      let stageHeight = height * 0.50;
      const stageEl = document.querySelector('.experience-stage');
      if (stageEl) {
        const rect = stageEl.getBoundingClientRect();
        if (rect.height > 0) {
          stageTop = rect.top;
          stageBottom = rect.bottom;
          stageHeight = rect.height;
        }
      }
      // Arrow flow UI sits cleanly in the bottom portion of the stage (generous clearance below top text roles)
      const baseY = stageBottom - Math.max(55, Math.min(85, stageHeight * 0.22));

      // Spacing between milestones: keeps items comfortably separated horizontally
      const stride = Math.max(700, width * 0.85);

      // Centers of the 3 milestones in world coordinates
      const m0 = width * 0.50;
      const m1 = m0 + stride;
      const m2 = m1 + stride;
      const milestoneWorlds = [m0, m1, m2];

      // Camera scroll travel mapping:
      // - Milestone 0 enters flush from off-screen right at expProgress = 0
      // - Milestone 1 is centered at expProgress ~ 0.65
      // - Milestone 2 arrives and rests centered in the stage at expProgress = 1.0 (final ending composition)
      const halfW = Math.max(340, width * 0.35);
      const scrollXStart = -(width * 0.50 + halfW);
      const scrollXEnd = 2 * stride; // Ends with Milestone 2 perfectly centered in the stage
      const scrollXSpan = scrollXEnd - scrollXStart;
      const scrollX = scrollXStart + expProgress * scrollXSpan;

      // Update text roles rigidly in world coordinates:
      // Items stay 100% visible on screen — they ONLY hide once completely off-screen!
      updateExperienceRoleMotion(scrollX, width, stride, m0, m1, m2, true);

      // Arrow head travels from the left edge of screen (-30px) to 70% screen on initial entrance (0 to 0.12),
      // then stays anchored at 70% of the screen while world scrolls to the left:
      const headScreenTarget = width * 0.70;
      const enterProgress = Math.min(1.0, expProgress / 0.12);
      const startScreenX = -30; // Starts from off-screen left (no gap!)
      const currentScreenHeadX = startScreenX + enterProgress * (headScreenTarget - startScreenX);

      // Current head position in world space
      const headWorldX = currentScreenHeadX + scrollX;

      // Stable world start and end that stay off-screen throughout the entire timeline:
      const worldStart = m0 - stride * 2.2;
      const worldEnd   = m2 + stride * 0.8;

      // Continuous hand-drawn path through all 3 milestones
      // Fixed world coordinates: ZERO points are ever sliced or unshifted!
      const worldWaypoints = [
        { x: worldStart,              dy: 15 },
        { x: m0 - stride * 1.60,      dy: 20 },
        { x: m0 - stride * 1.15,      dy: 14 },
        { x: m0 - stride * 0.70,      dy: -12 },
        { x: m0 - stride * 0.28,      dy: -36 }, // Crest before Milestone 0
        { x: m0,                      dy: 38 },  // Sweeping trough under Milestone 0
        { x: m0 + stride * 0.28,      dy: -18 }, // Soft rise between 0 and 1
        { x: m1 - stride * 0.28,      dy: -32 }, // Crest before Milestone 1
        { x: m1,                      dy: 36 },  // Sweeping trough under Milestone 1
        { x: m1 + stride * 0.28,      dy: -16 }, // Soft rise between 1 and 2
        { x: m2 - stride * 0.25,      dy: -24 }, // Gentle crest where 2019 — 2021 sits
        { x: m2 + stride * 0.05,      dy: 20 },  // Gentle trough under Javascript Developer
        { x: m2 + stride * 0.26,      dy: -6 },  // Smooth rise to final arrowhead position at 70% screen
        { x: worldEnd,                dy: -6 }   // Clean forward tangent guide point
      ];

      // Sample path up to headWorldX:
      const pointsToDraw = [];
      let lastSegIndex = 0;
      for (let i = 0; i < worldWaypoints.length; i++) {
        if (worldWaypoints[i].x <= headWorldX) {
          pointsToDraw.push({
            x: worldWaypoints[i].x - scrollX,
            y: baseY + worldWaypoints[i].dy
          });
          lastSegIndex = i;
        } else {
          break;
        }
      }

      // Add leading tip point at headWorldX:
      if (lastSegIndex < worldWaypoints.length - 1) {
        const pA = worldWaypoints[lastSegIndex];
        const pB = worldWaypoints[lastSegIndex + 1];
        const segSpan = pB.x - pA.x;
        const segT = segSpan > 0.001 ? Math.max(0, Math.min(1, (headWorldX - pA.x) / segSpan)) : 0;
        const tipDy = pA.dy + segT * (pB.dy - pA.dy);
        const tipPt = {
          x: headWorldX - scrollX,
          y: baseY + tipDy
        };

        const distFromLast = Math.abs(headWorldX - pA.x);
        if (distFromLast < 14 && pointsToDraw.length > 1) {
          // Replace last point to avoid degenerate micro-segments at the tip
          pointsToDraw[pointsToDraw.length - 1] = tipPt;
        } else {
          pointsToDraw.push(tipPt);
        }
      }

      // Active year on the curve: tracks the milestone closest to screen center
      const dist0 = Math.abs(m0 - scrollX - width * 0.50);
      const dist1 = Math.abs(m1 - scrollX - width * 0.50);
      const dist2 = Math.abs(m2 - scrollX - width * 0.50);

      let activeYearIdx = 0;
      let minDist = dist0;
      if (dist1 < minDist) {
        minDist = dist1;
        activeYearIdx = 1;
      }
      if (dist2 < minDist) {
        minDist = dist2;
        activeYearIdx = 2;
      }

      const roleItems = document.querySelectorAll('.experience-stage .experience-float-item');
      let currentYearText = '';
      if (roleItems && roleItems[activeYearIdx]) {
        currentYearText = (roleItems[activeYearIdx].getAttribute('data-year') || '').toUpperCase();
      }
      if (!currentYearText) {
        const fallbackYears = ['MAR 2023 — JUL 2024', 'AUG 2026', 'SEP 2025 — PRESENT'];
        currentYearText = fallbackYears[activeYearIdx] || '';
      }

      // Measure active milestone's role element position on screen
      const activeMilestoneWorld = milestoneWorlds[activeYearIdx];
      const activeScreenCenterX = activeMilestoneWorld - scrollX;
      let activeItemWidth = Math.min(640, width * 0.48);
      if (roleItems && roleItems[activeYearIdx] && roleItems[activeYearIdx].offsetWidth > 0) {
        activeItemWidth = roleItems[activeYearIdx].offsetWidth;
      }
      const activeHalfW = activeItemWidth * 0.5;

      // Position the year text on the curve directly underneath the role title:
      // roleLeftX is the left edge of the role box; + 65px places it right under the first word of the role title
      const roleLeftX = activeScreenCenterX - activeHalfW;
      const targetYearScreenX = roleLeftX + 65;

      // Keep year text on the visible drawn curve before the arrow tip
      const maxAllowedX = currentScreenHeadX - 70;
      const minAllowedX = 35;
      const clampedYearX = Math.max(minAllowedX, Math.min(maxAllowedX, targetYearScreenX));

      // Calculate the EXACT arc-distance in pixels along pointsToDraw where x == clampedYearX
      let targetDist = 0;
      let foundSegment = false;
      for (let i = 0; i < pointsToDraw.length - 1; i++) {
        const p1 = pointsToDraw[i];
        const p2 = pointsToDraw[i + 1];
        const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (clampedYearX >= p2.x) {
          targetDist += segLen;
        } else if (clampedYearX >= p1.x) {
          const span = p2.x - p1.x;
          const t = span > 0.001 ? (clampedYearX - p1.x) / span : 0;
          targetDist += t * segLen;
          foundSegment = true;
          break;
        } else {
          break;
        }
      }
      if (!foundSegment && targetDist === 0 && pointsToDraw.length >= 2) {
        targetDist = Math.hypot(pointsToDraw[1].x - pointsToDraw[0].x, pointsToDraw[1].y - pointsToDraw[0].y) * 0.5;
      }

      // Ensure targetDist is passed as a direct pixel offset (> 1.0) so it's placed accurately
      const yearOffsetPx = Math.max(10, targetDist);

      if (pointsToDraw.length >= 2) {
        drawSpline({
          points: pointsToDraw,
          progress: 1.0,
          startProgress: pastProgress,
          strokeWidth: 3.4,
          strokeColor: themeColor,
          moveWithScroll: false,
          smooth: false,
          text: {
            content: currentYearText,
            offset: yearOffsetPx, // Direct pixel distance along curve: placed right under the role!
            reverse: false,
            baselineOffset: -14,
            font: '600 13px Poppins, -apple-system, sans-serif',
            color: themeColor,
            letterSpacing: 2.5,
            followProgress: false // Always show year clearly on the curve
          },
          arrow: {
            show: true,
            size: 26,
            color: themeColor,
            style: 'sketch'
          }
        });
      }

      // Position "Back to top" button directly where the arrow points at the end of the timeline
      const backToTopBtn = document.getElementById('experience-back-to-top');
      if (backToTopBtn) {
        if (expProgress >= 0.88 && pastProgress < 1.0) {
          const stageRect = stageEl ? stageEl.getBoundingClientRect() : { top: 0, left: 0 };
          const lastPoint = pointsToDraw[pointsToDraw.length - 1];
          const arrowTipScreenX = lastPoint ? lastPoint.x : currentScreenHeadX;
          const arrowTipScreenY = lastPoint ? lastPoint.y : baseY;

          const btnRelX = arrowTipScreenX - (stageRect.left || 0) + 32;
          const btnRelY = arrowTipScreenY - (stageRect.top || 0);

          // Keep button comfortably inside screen width
          const btnWidth = backToTopBtn.offsetWidth || 135;
          const maxBtnX = width - btnWidth - 24;
          const clampedBtnX = Math.min(maxBtnX, btnRelX);

          backToTopBtn.style.setProperty('--btn-x', `${clampedBtnX.toFixed(1)}px`);
          backToTopBtn.style.setProperty('--btn-y', `${btnRelY.toFixed(1)}px`);
          backToTopBtn.classList.add('is-visible');
        } else {
          backToTopBtn.classList.remove('is-visible');
        }
      }
    }
  }
}

/**
 * Triggers/re-triggers the rubber squash & stretch animation on each letter.
 * Forces layout reflow so the animation replays even when scrolling back or revealing again.
 */
function triggerRubberSquash(item) {
  if (!item) return;
  const letters = item.querySelectorAll('.rubber-letter');
  const arrow = item.querySelector('.experience-role-arrow');

  letters.forEach((letter) => {
    letter.style.animation = 'none';
  });
  if (arrow) arrow.style.animation = 'none';

  // Force reflow to flush cached animation state in browser engine
  void item.offsetWidth;

  letters.forEach((letter) => {
    letter.style.animation = '';
  });
  if (arrow) arrow.style.animation = '';
}

/**
 * Update Experience Role Motion:
 * - Moves each milestone in world coordinates rigidly with the camera scroll
 * - Items stay 100% visible (NO fading) while inside the screen viewport
 * - Items ONLY hide after they have completely crossed off-screen
 * - Replays per-letter rubber squash animation whenever an item enters the screen
 */
function updateExperienceRoleMotion(scrollX, width, stride, m0, m1, m2, isActiveSection) {
  if (typeof document === 'undefined') return;

  const items = document.querySelectorAll('.experience-stage .experience-float-item');
  if (!items.length) return;

  if (!isActiveSection || scrollX === null) {
    items.forEach((item, idx) => {
      itemScreenState[idx] = false;
      item.classList.remove('is-active', 'is-visible');
      item.style.opacity = '0';
      item.style.visibility = 'hidden';
      item.style.pointerEvents = 'none';
    });
    return;
  }

  const milestoneWorlds = [m0, m1, m2];

  items.forEach((item, idx) => {
    const worldX = milestoneWorlds[idx];
    const screenCenterX = worldX - scrollX;
    const roleSlideX = screenCenterX - (width * 0.50);

    // Bounding measurement: use actual offsetWidth if available, else responsive fallback
    const itemWidth = item.offsetWidth > 0 ? item.offsetWidth : Math.min(640, width * 0.48);
    const halfW = itemWidth * 0.5;

    // An item is ONLY off-screen when its entire bounding box is outside the screen (+ 20px margin)
    const isOffScreenLeft = (screenCenterX + halfW) < -20;
    const isOffScreenRight = (screenCenterX - halfW) > (width + 20);
    const isOnScreen = !isOffScreenLeft && !isOffScreenRight;

    item.style.setProperty('--role-slide-x', `${roleSlideX.toFixed(1)}px`);

    if (isOnScreen) {
      // 100% solid on screen — NEVER fade on screen!
      item.style.opacity = '1';
      item.style.visibility = 'visible';
      item.style.pointerEvents = 'auto';
      if (!item.classList.contains('is-visible')) {
        item.classList.add('is-visible');
      }
      if (!item.classList.contains('is-active')) {
        item.classList.add('is-active');
      }

      // If it just entered onto the screen, trigger rubber squash animation!
      if (!itemScreenState[idx]) {
        itemScreenState[idx] = true;
        triggerRubberSquash(item);
      }
    } else {
      // Completely off-screen: hide safely outside the viewport
      itemScreenState[idx] = false;
      item.classList.remove('is-visible', 'is-active');
      item.style.opacity = '0';
      item.style.visibility = 'hidden';
      item.style.pointerEvents = 'none';
    }
  });
}

// Export for the engine
if (typeof window !== 'undefined') {
  window.init = init;
  window.animate = animate;
  window.ArrowAnimation = { init, animate };
}
