/**
 * Unit Tests for Pure Math & Engine Functions
 * Run with: node --test tests/engine.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');

// Import engine in CommonJS mode
const TurtleEngine = require('../src/js/turtle-canvas.js');
const { clamp, lerp, evalCubicBezier, catmullRomToCubicSegments, resolveValue, applyEasing, getTimeline, samplePathAtDistance } = TurtleEngine.math;

test('Math: clamp() clamps values accurately', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
  assert.equal(clamp(0, 0, 10), 0);
  assert.equal(clamp(10, 0, 10), 10);
});

test('Math: lerp() performs linear interpolation', () => {
  assert.equal(lerp(0, 100, 0), 0);
  assert.equal(lerp(0, 100, 0.5), 50);
  assert.equal(lerp(0, 100, 1), 100);
  assert.equal(lerp(20, 40, 0.25), 25);
});

test('Math: evalCubicBezier() calculates start, mid, and end correctly', () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 50, y: 100 };
  const p2 = { x: 50, y: 100 };
  const p3 = { x: 100, y: 0 };

  const start = evalCubicBezier(p0, p1, p2, p3, 0);
  assert.equal(start.x, 0);
  assert.equal(start.y, 0);

  const end = evalCubicBezier(p0, p1, p2, p3, 1);
  assert.equal(end.x, 100);
  assert.equal(end.y, 0);

  const mid = evalCubicBezier(p0, p1, p2, p3, 0.5);
  assert.equal(mid.x, 50);
  assert.equal(mid.y, 75);
});

test('Spline: catmullRomToCubicSegments() generates smooth segments', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    { x: 200, y: 0 }
  ];

  const segments = catmullRomToCubicSegments(points);
  assert.equal(segments.length, 2);

  // Segment 1 starts at points[0] and ends at points[1]
  assert.deepEqual(segments[0].p0, points[0]);
  assert.deepEqual(segments[0].p3, points[1]);

  // Segment 2 starts at points[1] and ends at points[2]
  assert.deepEqual(segments[1].p0, points[1]);
  assert.deepEqual(segments[1].p3, points[2]);

  // Handles control points existence
  assert.ok(typeof segments[0].cp1.x === 'number');
  assert.ok(typeof segments[0].cp2.x === 'number');
});

test('Parser: resolveValue() parses numbers, percentages, and px strings', () => {
  assert.equal(resolveValue(150, 1000), 150);
  assert.equal(resolveValue('25%', 1000), 250);
  assert.equal(resolveValue('80px', 1000), 80);
});

test('Timeline: applyEasing() computes easing curves accurately', () => {
  assert.equal(applyEasing(0, 'linear'), 0);
  assert.equal(applyEasing(1, 'linear'), 1);
  assert.equal(applyEasing(0.5, 'linear'), 0.5);

  assert.equal(applyEasing(0, 'easeInOut'), 0);
  assert.equal(applyEasing(1, 'easeInOut'), 1);
  assert.equal(applyEasing(0.5, 'easeInOut'), 0.5);

  assert.equal(applyEasing(0, 'easeOut'), 0);
  assert.equal(applyEasing(1, 'easeOut'), 1);
});

test('Timeline: getTimeline() respects duration, delay, reverse, and id', () => {
  // Test forward with delay
  const p1 = getTimeline({ id: 'test_tl_1', duration: 1000, delay: 500, ease: 'linear' });
  assert.equal(p1, 0); // Immediately at start (during delay)

  // Test reverse with delay
  const pRev = getTimeline({ id: 'test_tl_rev', duration: 1000, delay: 500, reverse: true, ease: 'linear' });
  assert.equal(pRev, 1); // During delay in reverse, starts at 1.0
});

test('Text: samplePathAtDistance() interpolates position and tangent accurately', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 }
  ];
  const dist = [0, 100, 200];

  const mid = samplePathAtDistance(points, dist, 50);
  assert.equal(mid.x, 50);
  assert.equal(mid.y, 0);
  assert.equal(mid.angle, 0); // Moving horizontally right

  const corner = samplePathAtDistance(points, dist, 150);
  assert.equal(corner.x, 100);
  assert.equal(corner.y, 50);
  assert.equal(Math.round(corner.angle * 100) / 100, Math.round((Math.PI / 2) * 100) / 100); // Moving vertically down
});

test('Build Integrity: Generated HTML contains zero unreplaced template tokens', () => {
  const fs = require('fs');
  const path = require('path');
  const distDir = path.join(__dirname, '..', 'dist');
  const files = ['index.html', 'about.html', 'projects.html', 'contact.html', '404.html'];
  const tokenRegex = /\{\{[a-zA-Z0-9_\.\>\s]+?\}\}/g;

  files.forEach((file) => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const matches = content.match(tokenRegex);
      assert.equal(matches, null, `Found unreplaced template tokens in ${file}: ${matches ? matches.join(', ') : ''}`);
    }
  });
});

test('Mobile Optimization: Static HTML does not contain inline canvas elements', () => {
  const fs = require('fs');
  const path = require('path');
  const distDir = path.join(__dirname, '..', 'dist');
  const files = ['index.html', 'about.html', 'projects.html'];

  files.forEach((file) => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.ok(!content.includes('<canvas id="turtle-canvas"'), `Static HTML in ${file} should not contain hardcoded canvas element for mobile performance`);
    }
  });
});



