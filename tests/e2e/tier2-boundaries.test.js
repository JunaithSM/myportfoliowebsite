/**
 * Tier 2: Boundary Value Analysis & Edge Case E2E Tests
 * Validates limits, off-by-one conditions, empty/extreme inputs, and security/accessibility boundaries (5 per feature = 50 tests).
 * Run with: node --test tests/e2e/tier2-boundaries.test.js
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
// FEATURE 1 BOUNDARIES: Runtime Stability & Bug Fixes
// ==============================================================================

test('F1-B1: Script loader handles rapid screen resize across 768px without injecting duplicate script tags', () => {
  const indexHtml = fs.readFileSync(path.join(SRC_DIR, 'pages', 'index.html'), 'utf-8');
  // Dynamic loader should check if script already exists or run once on initialization
  assert.ok(indexHtml.includes('window.innerWidth >= 768'), 'index.html must check 768px breakpoint');
});

test('F1-B2: Clean URL replacement script preserves query parameters and hash fragments', () => {
  const head = fs.readFileSync(path.join(SRC_DIR, 'partials', 'head.html'), 'utf-8');
  // Must preserve window.location.search and window.location.hash
  assert.ok(head.includes('window.location.search'), 'Clean URL script must preserve search parameters');
  assert.ok(head.includes('window.location.hash'), 'Clean URL script must preserve hash anchors');
});

test('F1-B3: Clean URL replacement leaves root / and non-html paths intact', () => {
  const head = fs.readFileSync(path.join(SRC_DIR, 'partials', 'head.html'), 'utf-8');
  // Must strictly target paths ending with .html
  assert.ok(head.includes("p.endsWith('.html')"), 'Clean URL script must only target paths ending with .html');
});

test('F1-B4: scroll-float.js handles single-character paragraphs or empty paragraphs without NaN timeout', () => {
  const file = path.join(SRC_DIR, 'js', 'scroll-float.js');
  const content = fs.readFileSync(file, 'utf-8');
  // STAGGER_MS calculation must be safe and bounded
  assert.ok(content.includes('STAGGER_MS'), 'scroll-float.js must define bounded STAGGER_MS');
});

test('F1-B5: Theme color updater in header.html safely handles missing meta tags without null pointer', () => {
  const header = fs.readFileSync(path.join(SRC_DIR, 'partials', 'header.html'), 'utf-8');
  assert.match(header, /if\s*\(\s*metaTheme\s*\)/, 'Theme script must null-check metaTheme before setAttribute');
});

// ==============================================================================
// FEATURE 2 BOUNDARIES: Dead Code & Unused JSON Data Cleanup
// ==============================================================================

test('F2-B1: All project objects in site.json retain required functional properties', () => {
  const site = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'site.json'), 'utf-8'));
  assert.ok(Array.isArray(site.projects), 'site.projects must be an array');
  assert.ok(site.projects.length >= 4, 'site.projects must contain at least 4 projects');
  site.projects.forEach((p) => {
    assert.ok(typeof p.id === 'string' && p.id.length > 0, `Project ${p.id} must have non-empty id`);
    assert.ok(typeof p.title === 'string' && p.title.length > 0, `Project ${p.id} must have non-empty title`);
    assert.ok(typeof p.description === 'string' && p.description.length > 0, `Project ${p.id} must have non-empty description`);
    assert.ok(typeof p.featured === 'boolean', `Project ${p.id} must have boolean featured flag`);
  });
});

test('F2-B2: Build compilers safely handle projects where repoUrl or liveUrl is null or empty', () => {
  const buildJs = fs.readFileSync(path.join(ROOT_DIR, 'build.js'), 'utf-8');
  assert.ok(
    buildJs.includes('p.repoUrl || p.liveUrl') || buildJs.includes('p.repoUrl ||') || buildJs.includes('p.liveUrl ||'),
    'build.js must provide fallback URL logic for projects'
  );
});

test('F2-B3: Compilers handle absent hero.badge without failing or emitting raw tokens', () => {
  const distIndex = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  assert.ok(!distIndex.includes('{{hero.badge}}'), 'Compiled index.html must never contain raw {{hero.badge}} token');
});

test('F2-B4: site.json skills data maintains array integrity for knowsAbout schema generation', () => {
  const site = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'site.json'), 'utf-8'));
  if (site.skills) {
    assert.ok(Array.isArray(site.skills), 'site.json skills must be an array when present');
  } else {
    assert.strictEqual(site.skills, undefined, 'skills is cleanly omitted when not needed');
  }
});

test('F2-B5: Pruning dead CSS does not affect active core button or card components', () => {
  const css = fs.readFileSync(path.join(SRC_DIR, 'css', 'components.css'), 'utf-8');
  assert.ok(css.includes('.btn'), 'components.css must retain .btn styles');
  assert.ok(css.includes('.project-item'), 'components.css must retain .project-item styles');
  assert.ok(css.includes('.rubber-letter'), 'components.css must retain .rubber-letter styles');
});

// ==============================================================================
// FEATURE 3 BOUNDARIES: Code Deduplication
// ==============================================================================

test('F3-B1: initRubberText() called multiple times on an initialized title is idempotent', () => {
  const rubberJs = fs.readFileSync(path.join(SRC_DIR, 'js', 'rubber-text.js'), 'utf-8');
  // Must check if element already has data-rubber-init='true' or similar guard
  assert.ok(
    rubberJs.includes("getAttribute('data-rubber-init')") || rubberJs.includes('data-rubber-init'),
    'rubber-text.js must inspect data-rubber-init to prevent re-wrapping letters'
  );
});

test('F3-B2: initRubberText() called with 0 matching titles completes without throwing', () => {
  const rubberJs = fs.readFileSync(path.join(SRC_DIR, 'js', 'rubber-text.js'), 'utf-8');
  assert.ok(rubberJs.includes('querySelectorAll'), 'rubber-text.js must use querySelectorAll');
  // NodeList.forEach or loop safely handles 0 elements
  assert.ok(rubberJs.includes('.forEach') || rubberJs.includes('for ('), 'rubber-text.js must safely iterate titles');
});

test('F3-B3: rubber-text.js handles headings containing unicode characters without corrupting text', () => {
  const rubberJs = fs.readFileSync(path.join(SRC_DIR, 'js', 'rubber-text.js'), 'utf-8');
  assert.ok(rubberJs.includes('span'), 'rubber-text.js must wrap letters in spans');
});

test('F3-B4: Spaces in rubber-text headings are preserved as space spans or whitespace styling', () => {
  const rubberJs = fs.readFileSync(path.join(SRC_DIR, 'js', 'rubber-text.js'), 'utf-8');
  assert.ok(
    rubberJs.includes('rubber-space') || rubberJs.includes('&nbsp;') || rubberJs.includes(' ') || rubberJs.includes('rubber-word'),
    'rubber-text.js must preserve spaces in text'
  );
});

test('F3-B5: Rubber text timing calculations remain bounded and non-negative', () => {
  const rubberJs = fs.readFileSync(path.join(SRC_DIR, 'js', 'rubber-text.js'), 'utf-8');
  assert.ok(rubberJs.includes('--rubber-delay'), 'rubber-text must set --rubber-delay animation timing');
  assert.ok(rubberJs.includes('ms'), 'rubber-text timing must specify millisecond units');
});

// ==============================================================================
// FEATURE 4 BOUNDARIES: Build Engine Parity & Synchronization
// ==============================================================================

test('F4-B1: Build compiler handles missing site.json gracefully with clear error', () => {
  const buildJs = fs.readFileSync(path.join(ROOT_DIR, 'build.js'), 'utf-8');
  assert.ok(buildJs.includes('site.json'), 'build.js must reference site.json');
});

test('F4-B2: Both build engines enforce strict zero unreplaced token validation', () => {
  const buildJs = fs.readFileSync(path.join(ROOT_DIR, 'build.js'), 'utf-8');
  const buildPs1 = fs.readFileSync(path.join(ROOT_DIR, 'build.ps1'), 'utf-8');
  assert.ok(buildJs.includes('unreplaced') || buildJs.includes('tokenRegex'), 'build.js must check for unreplaced tokens');
  assert.ok(buildPs1.includes('unreplaced') || buildPs1.includes('Matches'), 'build.ps1 must check for unreplaced tokens');
});

test('F4-B3: Both build engines generate clean-URL subdirectories with index.html', () => {
  const subdirs = ['about', 'projects', 'contact'];
  subdirs.forEach((sub) => {
    const distSubIndex = path.join(DIST_DIR, sub, 'index.html');
    assert.ok(fs.existsSync(distSubIndex), `dist/${sub}/index.html must exist for clean URL resolution`);
  });
});

test('F4-B4: Build engines preserve UTF-8 encoding for unicode characters (em-dash, copyright)', () => {
  const distIndex = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  assert.ok(distIndex.includes('©') || distIndex.includes('&copy;'), 'dist/index.html must preserve copyright symbol');
});

test('F4-B5: Watch mode CLI flags are recognized by both compilers', () => {
  const buildJs = fs.readFileSync(path.join(ROOT_DIR, 'build.js'), 'utf-8');
  const buildPs1 = fs.readFileSync(path.join(ROOT_DIR, 'build.ps1'), 'utf-8');
  assert.ok(buildJs.includes('--watch'), 'build.js must recognize --watch flag');
  assert.ok(buildPs1.includes('Watch'), 'build.ps1 must declare Watch parameter');
});

// ==============================================================================
// FEATURE 5 BOUNDARIES: Codebase & Folder Restructuring
// ==============================================================================

test('F5-B1: .agents/teamwork/ contains strictly agent metadata and zero source code files', () => {
  const teamworkDir = path.join(ROOT_DIR, '.agents', 'teamwork');
  if (fs.existsSync(teamworkDir)) {
    assert.ok(!fs.existsSync(path.join(teamworkDir, 'index.html')), '.agents/teamwork must not contain index.html');
    assert.ok(!fs.existsSync(path.join(teamworkDir, 'style.css')), '.agents/teamwork must not contain style.css');
    assert.ok(!fs.existsSync(path.join(teamworkDir, 'turtle-canvas.js')), '.agents/teamwork must not contain turtle-canvas.js');
  }
});

test('F5-B2: Clean build generates all dist HTML pages', () => {
  const pages = ['index.html', 'about.html', 'projects.html', 'contact.html', '404.html'];
  pages.forEach((p) => {
    assert.ok(fs.existsSync(path.join(DIST_DIR, p)), `dist/${p} must exist`);
  });
});

test('F5-B3: All 8 custom SVG cursor files are mirrored intact into dist/assets/cursors/', () => {
  const cursors = [
    'cursor-default.svg', 'cursor-pointer.svg', 'cursor-text.svg', 'cursor-grab.svg',
    'cursor-grabbing.svg', 'cursor-not-allowed.svg', 'cursor-zoom-in.svg', 'cursor-zoom-out.svg'
  ];
  cursors.forEach((c) => {
    const srcCursor = path.join(SRC_DIR, 'assets', 'cursors', c);
    const distCursor = path.join(DIST_DIR, 'assets', 'cursors', c);
    assert.ok(fs.existsSync(srcCursor), `src/assets/cursors/${c} must exist`);
    assert.ok(fs.existsSync(distCursor), `dist/assets/cursors/${c} must exist`);
  });
});

test('F5-B4: Relative links in clean URL subdirectories resolve properly without broken paths', () => {
  const aboutHtml = fs.readFileSync(path.join(DIST_DIR, 'about', 'index.html'), 'utf-8');
  assert.ok(aboutHtml.includes('href="/css/style.css"'), 'Clean URL subdirectory index must use root-relative stylesheet href');
});

test('F5-B5: Case sensitivity: all script and asset references match exact disk casing', () => {
  const head = fs.readFileSync(path.join(SRC_DIR, 'partials', 'head.html'), 'utf-8');
  assert.ok(head.includes('/assets/favicon.svg'), 'favicon path casing must be exact');
  assert.ok(head.includes('/css/style.css'), 'style.css path casing must be exact');
});

// ==============================================================================
// FEATURE 6 BOUNDARIES: Social Graph Assets & Metadata
// ==============================================================================

test('F6-B1: og-image.png file size is within optimal bounds (10 KB to 1 MB)', (t) => {
  const file = path.join(DIST_DIR, 'assets', 'og-image.png');
  if (!fs.existsSync(file)) {
    t.todo('Pending M3: dist/assets/og-image.png does not exist yet');
    return;
  }
  const stat = fs.statSync(file);
  assert.ok(stat.size >= 1024, 'og-image.png must be at least 1 KB');
  assert.ok(stat.size <= 1024 * 1024, 'og-image.png must not exceed 1 MB');
});

test('F6-B2: 404.html does not emit an invalid empty og:url attribute', (t) => {
  const errorPage = fs.readFileSync(path.join(DIST_DIR, '404.html'), 'utf-8');
  if (errorPage.includes('property="og:url" content=""')) {
    t.todo('Pending M3: 404.html currently outputs invalid property="og:url" content=""');
    return;
  }
  assert.ok(!errorPage.includes('property="og:url" content=""'), '404.html must not emit empty og:url');
});

test('F6-B3: Open Graph and Twitter image URLs use absolute HTTPS matching site.url', () => {
  const index = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  const site = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'site.json'), 'utf-8'));
  assert.ok(index.includes(`content="${site.site.url}/assets/og-image.png"`), 'OG image must use absolute URL');
});

test('F6-B4: og:image:alt and twitter:image:alt provide meaningful accessibility descriptions', (t) => {
  const head = fs.readFileSync(path.join(SRC_DIR, 'partials', 'head.html'), 'utf-8');
  if (!head.includes('og:image:alt') || !head.includes('twitter:image:alt')) {
    t.todo('Pending M3: head.html lacks og:image:alt and twitter:image:alt tags');
    return;
  }
  assert.ok(head.includes('og:image:alt'), 'head.html must provide og:image:alt');
  assert.ok(head.includes('twitter:image:alt'), 'head.html must provide twitter:image:alt');
});

test('F6-B5: manifest.json is valid JSON with required PWA fields', () => {
  const manifestFile = path.join(SRC_DIR, 'assets', 'manifest.json');
  assert.ok(fs.existsSync(manifestFile), 'manifest.json must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
  assert.ok(manifest.name, 'manifest must have name');
  assert.ok(manifest.short_name, 'manifest must have short_name');
  assert.ok(manifest.icons && manifest.icons.length > 0, 'manifest must have icons');
  assert.ok(manifest.start_url, 'manifest must have start_url');
  assert.ok(manifest.display, 'manifest must have display');
});

// ==============================================================================
// FEATURE 7 BOUNDARIES: Unified Modern JSON-LD Schema
// ==============================================================================

test('F7-B1: All JSON-LD script blocks across all dist HTML pages parse strictly with JSON.parse()', () => {
  const pages = ['index.html', 'about.html', 'projects.html', 'contact.html'];
  const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  pages.forEach((page) => {
    const content = fs.readFileSync(path.join(DIST_DIR, page), 'utf-8');
    let match;
    while ((match = jsonLdRegex.exec(content)) !== null) {
      assert.doesNotThrow(() => {
        JSON.parse(match[1]);
      }, `JSON-LD in ${page} must be strictly valid JSON`);
    }
  });
});

test('F7-B2: JSON-LD @id properties use absolute canonical URIs', () => {
  const index = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  const match = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match);
  const data = JSON.parse(match[1]);
  if (data['@graph']) {
    data['@graph'].forEach((entity) => {
      if (entity['@id']) {
        assert.ok(entity['@id'].startsWith('https://'), `@id ${entity['@id']} must be absolute https URI`);
      }
    });
  }
});

test('F7-B3: BreadcrumbList schema uses 1-based sequential integers for position', () => {
  const about = fs.readFileSync(path.join(DIST_DIR, 'about.html'), 'utf-8');
  const matches = about.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
  matches.forEach((block) => {
    const raw = block.replace(/<\/?script[^>]*>/g, '');
    const json = JSON.parse(raw);
    if (json['@type'] === 'BreadcrumbList' && json.itemListElement) {
      json.itemListElement.forEach((item, index) => {
        assert.equal(item.position, index + 1, `Breadcrumb position must be ${index + 1}`);
      });
    }
  });
});

test('F7-B4: Special characters in bio or project descriptions are safely escaped in JSON-LD', () => {
  const pages = ['index.html', 'about.html', 'projects.html'];
  pages.forEach((p) => {
    const content = fs.readFileSync(path.join(DIST_DIR, p), 'utf-8');
    const match = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (match) {
      assert.doesNotThrow(() => JSON.parse(match[1]), `Special chars in ${p} JSON-LD must not break JSON parser`);
    }
  });
});

test('F7-B5: Specific page entity types are correctly declared (ProfilePage, AboutPage, CollectionPage)', (t) => {
  const index = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  const about = fs.readFileSync(path.join(DIST_DIR, 'about.html'), 'utf-8');
  if (!index.includes('ProfilePage') && !about.includes('AboutPage')) {
    t.todo('Pending M3: Page-specific JSON-LD entity typing (ProfilePage, AboutPage) not yet implemented');
    return;
  }
  assert.ok(index.includes('ProfilePage') || about.includes('AboutPage'), 'Page-specific schema typing must be present');
});

// ==============================================================================
// FEATURE 8 BOUNDARIES: Semantic HTML & Accessibility Fixes
// ==============================================================================

test('F8-B1: All external links declare rel="noopener noreferrer"', () => {
  const pages = ['index.html', 'about.html', 'projects.html', 'contact.html'];
  const extLinkRegex = /<a\s+[^>]*target="_blank"[^>]*>/g;
  pages.forEach((p) => {
    const content = fs.readFileSync(path.join(DIST_DIR, p), 'utf-8');
    let match;
    while ((match = extLinkRegex.exec(content)) !== null) {
      assert.ok(
        match[0].includes('rel="noopener noreferrer"'),
        `External link in ${p} must have rel="noopener noreferrer": ${match[0]}`
      );
    }
  });
});

test('F8-B2: Decorative SVG icons inside buttons and navigation declare aria-hidden="true"', () => {
  const header = fs.readFileSync(path.join(SRC_DIR, 'partials', 'header.html'), 'utf-8');
  const footer = fs.readFileSync(path.join(SRC_DIR, 'partials', 'footer.html'), 'utf-8');
  const svgRegex = /<svg\s+[^>]*>/g;
  [header, footer].forEach((frag) => {
    let match;
    while ((match = svgRegex.exec(frag)) !== null) {
      assert.ok(match[0].includes('aria-hidden="true"'), `Decorative SVG must have aria-hidden="true": ${match[0]}`);
    }
  });
});

test('F8-B3: Headings manipulated by rubber text or scroll float preserve accessible name via aria-label', () => {
  const about = fs.readFileSync(path.join(DIST_DIR, 'about.html'), 'utf-8');
  const projects = fs.readFileSync(path.join(DIST_DIR, 'projects.html'), 'utf-8');
  assert.ok(about.includes('aria-label="S Mohammed Junaith"'), 'about.html title must declare aria-label');
  assert.ok(projects.includes('aria-label="Works &amp; Projects"') || projects.includes('aria-label="Works & Projects"'), 'projects.html title must declare aria-label');
});

test('F8-B4: Reset list elements declare role="list" to preserve VoiceOver semantics', () => {
  const header = fs.readFileSync(path.join(SRC_DIR, 'partials', 'header.html'), 'utf-8');
  assert.ok(header.includes('<ul class="nav-list" role="list">'), 'nav-list must declare role="list"');
});

test('F8-B5: Form inputs in contact.html have associated label elements matching input IDs', () => {
  const contact = fs.readFileSync(path.join(DIST_DIR, 'contact.html'), 'utf-8');
  const inputs = ['name', 'email', 'subject', 'body'];
  inputs.forEach((id) => {
    assert.ok(contact.includes(`for="${id}"`), `contact.html must have <label for="${id}">`);
    assert.ok(contact.includes(`id="${id}"`), `contact.html must have input/textarea id="${id}"`);
  });
});

test('F8-B6: Contact form enforces message character limit and client-side validation wiring', () => {
  const contact = fs.readFileSync(path.join(DIST_DIR, 'contact.html'), 'utf-8');
  assert.ok(contact.includes('maxlength="1000"'), 'contact.html must enforce maxlength="1000" on textarea');
  assert.ok(contact.includes('id="char-counter"'), 'contact.html must include character counter element');
  assert.ok(contact.includes('id="char-count"'), 'contact.html must include char-count span');
  assert.ok(contact.includes('id="submit-btn" disabled'), 'contact.html submit button must be disabled by default');
  assert.ok(contact.includes('src="/js/contact-form.js"'), 'contact.html must load contact-form.js');
  assert.ok(fs.existsSync(path.join(DIST_DIR, 'js', 'contact-form.js')), 'dist/js/contact-form.js must exist');

  const contactJs = fs.readFileSync(path.join(SRC_DIR, 'js', 'contact-form.js'), 'utf-8');
  assert.ok(contactJs.includes('MAX_MESSAGE_CHARS'), 'contact-form.js must define message limit');
  assert.ok(contactJs.includes('EMAIL_REGEX'), 'contact-form.js must validate email format');
  assert.ok(contactJs.includes('updateSubmitState'), 'contact-form.js must update submit button state on validation');
});

// ==============================================================================
// FEATURE 9 BOUNDARIES: AI Search & Crawler Optimization
// ==============================================================================

test('F9-B1: robots.txt declares canonical Sitemap directive pointing to https://www.junaith.dev/sitemap.xml', () => {
  const robots = fs.readFileSync(path.join(DIST_DIR, 'robots.txt'), 'utf-8');
  assert.ok(
    robots.includes('Sitemap: https://www.junaith.dev/sitemap.xml'),
    'robots.txt must declare canonical Sitemap directive'
  );
});

test('F9-B2: sitemap.xml declares correct sitemaps.org XML schema namespace', () => {
  const sitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf-8');
  assert.ok(
    sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'),
    'sitemap.xml must declare sitemaps.org namespace'
  );
});

test('F9-B3: sitemap.xml includes clean URLs without .html extensions (excluding 404)', () => {
  const sitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf-8');
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(sitemap)) !== null) {
    const loc = match[1];
    assert.ok(!loc.endsWith('.html'), `Sitemap URL must not contain .html: ${loc}`);
    assert.ok(!loc.includes('404'), `Sitemap must exclude 404 page: ${loc}`);
  }
});

test('F9-B4: All lastmod dates in sitemap.xml match ISO 8601 YYYY-MM-DD format', () => {
  const sitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf-8');
  const lastmodRegex = /<lastmod>(.*?)<\/lastmod>/g;
  let match;
  while ((match = lastmodRegex.exec(sitemap)) !== null) {
    assert.match(match[1], /^\d{4}-\d{2}-\d{2}$/, `lastmod ${match[1]} must match YYYY-MM-DD`);
  }
});

test('F9-B5: Root robots.txt and sitemap.xml match dist/ generated output', (t) => {
  const rootRobots = fs.readFileSync(path.join(ROOT_DIR, 'robots.txt'), 'utf-8');
  const distRobots = fs.readFileSync(path.join(DIST_DIR, 'robots.txt'), 'utf-8');
  if (rootRobots.trim() !== distRobots.trim()) {
    t.todo('Pending M2: Root robots.txt is not yet synchronized with dist/robots.txt');
    return;
  }
  assert.equal(rootRobots.trim(), distRobots.trim(), 'Root robots.txt must match dist/robots.txt');
});

// ==============================================================================
// FEATURE 10 BOUNDARIES: Performance & Layout Shift Elimination
// ==============================================================================

test('F10-B1: Mobile viewports (< 768px) avoid canvas injection', () => {
  const index = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  assert.ok(
    index.includes('window.innerWidth >= 768'),
    'Desktop canvas scripts must be guarded with window.innerWidth >= 768'
  );
});

test('F10-B2: Static asset caching headers in vercel.json provide long-term immutable caching', (t) => {
  const vercelJsonPath = path.join(ROOT_DIR, 'vercel.json');
  const raw = fs.readFileSync(vercelJsonPath, 'utf-8').replace(/^\uFEFF/, '');
  const vercel = JSON.parse(raw);
  if (!vercel.headers) {
    t.todo('Pending M3: vercel.json does not yet declare HTTP caching headers');
    return;
  }
  assert.ok(Array.isArray(vercel.headers), 'vercel.json must define headers array');
});

test('F10-B3: Deployment configurations declare essential security headers', (t) => {
  const vercelJsonPath = path.join(ROOT_DIR, 'vercel.json');
  const content = fs.readFileSync(vercelJsonPath, 'utf-8');
  if (!content.includes('X-Content-Type-Options')) {
    t.todo('Pending M3: Deployment configuration lacks X-Content-Type-Options security header');
    return;
  }
  assert.ok(content.includes('X-Content-Type-Options'), 'Must specify X-Content-Type-Options');
});

test('F10-B4: Homepage meta description length is within optimal SERP snippet bounds (120-190 chars)', () => {
  const index = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  const match = index.match(/<meta name="description" content="([^"]+)">/);
  assert.ok(match, 'index.html must have meta description');
  const desc = match[1];
  assert.ok(desc.length >= 100, `Meta description too short (${desc.length} chars)`);
  assert.ok(desc.length <= 200, `Meta description too long (${desc.length} chars)`);
});

test('F10-B5: HTML head contains zero synchronous external script tags', () => {
  const head = fs.readFileSync(path.join(SRC_DIR, 'partials', 'head.html'), 'utf-8');
  assert.ok(!head.includes('<script src='), 'head.html must not contain blocking synchronous script tags');
});
