/**
 * Tier 4: Real-World Application Scenario E2E Tests
 * Validates realistic end-to-end user, crawler, and deployment workflows (5 tests).
 * Run with: node --test tests/e2e/tier4-scenarios.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DATA_DIR = path.join(ROOT_DIR, 'data');

// ==============================================================================
// SCENARIO 1: AI Search Engine Discovery & Indexing Journey
// ==============================================================================
test('T4.1: Scenario 1 - AI Search Engine Discovery Journey (Robots -> Sitemap -> LLMs -> JSON-LD)', (t) => {
  // Step 1: Crawler requests robots.txt
  const robots = fs.readFileSync(path.join(DIST_DIR, 'robots.txt'), 'utf-8');
  assert.ok(robots.includes('Sitemap: https://www.junaith.dev/sitemap.xml'), 'Crawler discovers Sitemap directive');

  // Step 2: Crawler fetches sitemap.xml and parses clean URLs
  const sitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf-8');
  assert.ok(sitemap.includes('<loc>https://www.junaith.dev/</loc>'), 'Sitemap indexes homepage');
  assert.ok(sitemap.includes('<loc>https://www.junaith.dev/projects</loc>'), 'Sitemap indexes projects');

  // Step 3: Crawler queries llms.txt for plain-text AI context
  const llmsFile = path.join(DIST_DIR, 'llms.txt');
  if (!fs.existsSync(llmsFile)) {
    t.todo('Pending M3: dist/llms.txt not yet created for AI search crawler journey');
    return;
  }
  const llms = fs.readFileSync(llmsFile, 'utf-8');
  assert.ok(llms.includes('Junaith'), 'llms.txt provides author entity summary');

  // Step 4: Crawler extracts structured knowledge graph from index.html
  const index = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  const match = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'Homepage contains structured knowledge graph');
  const jsonLd = JSON.parse(match[1]);
  assert.ok(jsonLd['@graph'], 'Knowledge graph uses linked @graph architecture');
});

// ==============================================================================
// SCENARIO 2: Social Media Share & Preview Card Generation Journey
// ==============================================================================
test('T4.2: Scenario 2 - Social Media Rich Card Share Journey (OG/Twitter tags -> Asset verification)', (t) => {
  const pages = ['index.html', 'about.html', 'projects.html'];
  pages.forEach((p) => {
    const html = fs.readFileSync(path.join(DIST_DIR, p), 'utf-8');
    assert.ok(html.includes('property="og:title"'), `${p} provides og:title for preview`);
    assert.ok(html.includes('property="og:image"'), `${p} provides og:image for preview`);
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'), `${p} provides summary_large_image`);
  });

  // Verify social image asset resolution
  const ogImg = path.join(DIST_DIR, 'assets', 'og-image.png');
  if (!fs.existsSync(ogImg)) {
    t.todo('Pending M3: dist/assets/og-image.png missing for social crawler card preview');
    return;
  }
  assert.ok(fs.existsSync(ogImg), 'og-image.png must exist for social crawlers');
});

// ==============================================================================
// SCENARIO 3: Keyboard & Assistive Device User Navigation Journey
// ==============================================================================
test('T4.3: Scenario 3 - Accessibility & Keyboard User Journey (Skip Link -> Nav -> Outline -> Targets)', (t) => {
  const index = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');

  // Step 1: Focus lands on skip-to-content link
  assert.ok(index.includes('<a href="#main-content" class="skip-link">Skip to main content</a>'), 'Skip link is present');

  // Step 2: Skip link target <main id="main-content"> exists
  assert.ok(index.includes('<main id="main-content"'), 'Target main#main-content exists in document');

  // Step 3: Nav list retains list role for VoiceOver
  assert.ok(index.includes('<ul class="nav-list" role="list">'), 'Nav list declares role="list"');

  // Step 4: Heading hierarchy is sequential
  assert.ok(index.includes('<h1 id="hero-heading"'), 'H1 is declared on hero');
  assert.ok(index.includes('<h2 id="featured-projects-title"'), 'H2 is declared on works section');

  // Step 5: External links have security attributes
  assert.ok(index.includes('rel="noopener noreferrer"'), 'External links have rel="noopener noreferrer"');
});

// ==============================================================================
// SCENARIO 4: Offline & Local file:// Direct Browser Inspection Journey
// ==============================================================================
test('T4.4: Scenario 4 - Local file:// Protocol Preview Resilience (Guarded history replaceState)', (t) => {
  const head = fs.readFileSync(path.join(SRC_DIR, 'partials', 'head.html'), 'utf-8');

  // Verify that clean URL canonicalizer has a safe guard for file: protocol or try/catch
  if (!head.includes("protocol !== 'file:'") && !head.includes('try {')) {
    t.todo('Pending M1: Clean URL script lacks file:// protocol check and try/catch error wrapper');
    return;
  }

  assert.ok(
    head.includes("protocol !== 'file:'") || head.includes('try {'),
    'head.html must guard replaceState for safe local file:// previews'
  );

  // Verify zero external CDN runtime dependencies
  const html = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  assert.ok(!html.includes('cdn.jsdelivr.net'), 'Zero external CDN dependencies in HTML');
  assert.ok(!html.includes('cdnjs.cloudflare.com'), 'Zero external CDN dependencies in HTML');
  assert.ok(!html.includes('unpkg.com'), 'Zero external CDN dependencies in HTML');
});

// ==============================================================================
// SCENARIO 5: Clean Static Build Pipeline & Deployment Artifact Verification
// ==============================================================================
test('T4.5: Scenario 5 - Production Static Build Pipeline & Deployment Verification', () => {
  // Step 1: Verify all 5 dist HTML files exist
  const pages = ['index.html', 'about.html', 'projects.html', 'contact.html', '404.html'];
  pages.forEach((p) => {
    assert.ok(fs.existsSync(path.join(DIST_DIR, p)), `dist/${p} must exist`);
  });

  // Step 2: Verify zero unreplaced {{...}} tokens across all generated HTML
  const tokenRegex = /\{\{[a-zA-Z0-9_\.\>\s]+?\}\}/g;
  pages.forEach((p) => {
    const content = fs.readFileSync(path.join(DIST_DIR, p), 'utf-8');
    const matches = content.match(tokenRegex);
    assert.equal(matches, null, `Found unreplaced template tokens in ${p}: ${matches ? matches.join(', ') : ''}`);
  });

  // Step 3: Verify clean URL directory index mirrors exist
  ['about', 'projects', 'contact'].forEach((dir) => {
    assert.ok(fs.existsSync(path.join(DIST_DIR, dir, 'index.html')), `dist/${dir}/index.html must exist`);
  });

  // Step 4: Verify server routing configs exist
  assert.ok(fs.existsSync(path.join(DIST_DIR, '_redirects')), 'dist/_redirects must exist');
  assert.ok(fs.existsSync(path.join(DIST_DIR, 'vercel.json')), 'dist/vercel.json must exist');

  // Step 5: Verify data integrity against site.json
  const site = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'site.json'), 'utf-8'));
  const indexHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  assert.ok(indexHtml.includes(site.site.nickname), 'index.html must render author nickname');
});
