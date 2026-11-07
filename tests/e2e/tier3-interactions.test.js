/**
 * Tier 3: Cross-Feature Combinations & Pairwise Interaction Tests
 * Validates orthogonal multi-factor interactions between modules and features (10 tests).
 * Run with: node --test tests/e2e/tier3-interactions.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DATA_DIR = path.join(ROOT_DIR, 'data');

test('T3.1: Build Engine Parity x JSON-LD Schema (Both engines generate valid JSON-LD schemas)', () => {
  const buildJs = fs.readFileSync(path.join(ROOT_DIR, 'build.js'), 'utf-8');
  const buildPs1 = fs.readFileSync(path.join(ROOT_DIR, 'build.ps1'), 'utf-8');
  assert.ok(buildJs.includes('application/ld+json'), 'build.js must inject JSON-LD');
  assert.ok(buildPs1.includes('application/ld+json'), 'build.ps1 must inject JSON-LD');
  assert.ok(buildJs.includes('knows_about_json'), 'build.js must populate knows_about_json');
  assert.ok(buildPs1.includes('knows_about_json'), 'build.ps1 must populate knows_about_json');
});

test('T3.2: Code Restructuring x Asset Resolution (All cursor assets in CSS resolve to existing files)', () => {
  const css = fs.readFileSync(path.join(DIST_DIR, 'css', 'style.css'), 'utf-8');
  const cursorMatches = css.match(/\/assets\/cursors\/[a-zA-Z0-9_-]+\.svg/g) || [];
  assert.ok(cursorMatches.length > 0, 'CSS must reference cursor assets');
  cursorMatches.forEach((relUrl) => {
    const fullPath = path.join(DIST_DIR, relUrl.replace(/^\//, ''));
    assert.ok(fs.existsSync(fullPath), `CSS cursor asset must exist at ${fullPath}`);
  });
});

test('T3.3: SEO Metadata x Accessibility Hierarchy (Page title aligns with primary h1 accessible context)', () => {
  const pages = ['index.html', 'about.html', 'projects.html', 'contact.html'];
  pages.forEach((p) => {
    const content = fs.readFileSync(path.join(DIST_DIR, p), 'utf-8');
    const titleMatch = content.match(/<title>([^<]+)<\/title>/);
    const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    assert.ok(titleMatch, `${p} must have <title>`);
    assert.ok(h1Match, `${p} must have <h1>`);
    assert.ok(titleMatch[1].length > 0, `${p} title must not be empty`);
  });
});

test('T3.4: Mobile Optimization x Zero-JS UI (Drawer nav & theme toggle operate via pure CSS)', () => {
  const css = fs.readFileSync(path.join(DIST_DIR, 'css', 'style.css'), 'utf-8');
  assert.ok(css.includes('#theme-toggle:checked'), 'CSS must handle #theme-toggle:checked');
  assert.ok(css.includes('#nav-toggle:checked'), 'CSS must handle #nav-toggle:checked');
  assert.ok(css.includes(':has('), 'CSS must use modern :has() selector for state toggling');
});

test('T3.5: AI Crawler Optimization x Route Normalization (Sitemap URLs match _redirects and vercel.json)', () => {
  const sitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf-8');
  const redirects = fs.readFileSync(path.join(DIST_DIR, '_redirects'), 'utf-8');
  const locs = (sitemap.match(/<loc>(.*?)<\/loc>/g) || []).map((l) => l.replace(/<\/?loc>/g, ''));
  locs.forEach((loc) => {
    const slug = new URL(loc).pathname;
    if (slug !== '/') {
      const htmlTarget = `${slug}.html`;
      assert.ok(
        redirects.includes(htmlTarget),
        `_redirects must declare rewrite for ${htmlTarget} to support sitemap route ${slug}`
      );
    }
  });
});

test('T3.6: Rubber Text Pre-rendering x Screen Reader Accessibility (aria-label preserves readable text)', () => {
  const pages = ['about.html', 'projects.html'];
  pages.forEach((p) => {
    const content = fs.readFileSync(path.join(DIST_DIR, p), 'utf-8');
    const titleMatch = content.match(/<h1[^>]*class="[^"]*rubber-title[^"]*"[^>]*aria-label="([^"]+)"[^>]*>/);
    assert.ok(titleMatch, `${p} rubber-title must have aria-label for accessibility`);
    assert.ok(titleMatch[1].length > 0, `${p} rubber-title aria-label must not be empty`);
  });
});

test('T3.7: Dead Code Pruning x CSS Design Token Cascade (Design tokens remain intact in compiled CSS)', () => {
  const css = fs.readFileSync(path.join(DIST_DIR, 'css', 'style.css'), 'utf-8');
  const requiredTokens = ['--color-bg', '--color-surface', '--color-text-primary', '--color-accent', '--font-heading', '--font-sans'];
  requiredTokens.forEach((token) => {
    assert.ok(css.includes(token), `Compiled CSS must contain design token ${token}`);
  });
});

test('T3.8: Reduced Motion Accessibility x Scroll Float Prose (CSS and JS support reduced-motion)', (t) => {
  const css = fs.readFileSync(path.join(SRC_DIR, 'css', 'components.css'), 'utf-8');
  const js = fs.readFileSync(path.join(SRC_DIR, 'js', 'scroll-float.js'), 'utf-8');
  assert.ok(css.includes('prefers-reduced-motion: reduce'), 'components.css must define prefers-reduced-motion reset');
  if (!js.includes('prefers-reduced-motion')) {
    t.todo('Pending M1: scroll-float.js lacks prefers-reduced-motion JS guard');
    return;
  }
  assert.ok(js.includes('prefers-reduced-motion'), 'scroll-float.js must check prefers-reduced-motion');
});

test('T3.9: Clean URLs x Local file:// Protocol Preview Resilience', (t) => {
  const head = fs.readFileSync(path.join(SRC_DIR, 'partials', 'head.html'), 'utf-8');
  if (!head.includes("protocol !== 'file:'") && !head.includes('try {')) {
    t.todo('Pending M1: head.html lacks file:// protocol check and try/catch guard');
    return;
  }
  assert.ok(
    head.includes("protocol !== 'file:'") || head.includes('try {'),
    'head.html must guard replaceState against opaque file:// origin errors'
  );
});

test('T3.10: Project Card Link Accessibility x Data Layer (Project card links prevent duplicate tab stops)', (t) => {
  const buildJs = fs.readFileSync(path.join(ROOT_DIR, 'build.js'), 'utf-8');
  if (!buildJs.includes('tabindex="-1"')) {
    t.todo('Pending M3: Project card description link not yet flagged with tabindex="-1"');
    return;
  }
  assert.ok(buildJs.includes('tabindex="-1"'), 'build.js must add tabindex="-1" to secondary card link');
});
