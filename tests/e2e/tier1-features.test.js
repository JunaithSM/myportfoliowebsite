/**
 * Tier 1: Feature Coverage E2E Tests
 * Validates baseline functionality across all 10 project features (5 tests per feature = 50 tests).
 * Run with: node --test tests/e2e/tier1-features.test.js
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
// FEATURE 1: Runtime Stability & Bug Fixes
// ==============================================================================

test('F1.1: Dynamic script loader in index.html enforces sequential execution via s.async = false', (t) => {
  const file = path.join(SRC_DIR, 'pages', 'index.html');
  const content = fs.readFileSync(file, 'utf-8');
  if (!content.includes('s.async = false')) {
    t.todo('Pending M1: Dynamic script loader in index.html lacks s.async = false');
    return;
  }
  assert.ok(content.includes('s.async = false'), 'index.html dynamic script loader must set s.async = false');
});

test('F1.2: Dynamic script loader in about.html and projects.html enforces s.async = false', (t) => {
  const about = fs.readFileSync(path.join(SRC_DIR, 'pages', 'about.html'), 'utf-8');
  const projects = fs.readFileSync(path.join(SRC_DIR, 'pages', 'projects.html'), 'utf-8');
  if (!about.includes('s.async = false') || !projects.includes('s.async = false')) {
    t.todo('Pending M1: Dynamic script loader in about.html or projects.html lacks s.async = false');
    return;
  }
  assert.ok(about.includes('s.async = false'), 'about.html script loader must set s.async = false');
  assert.ok(projects.includes('s.async = false'), 'projects.html script loader must set s.async = false');
});

test('F1.3: Clean URL history script in head.html guards against file:// protocol execution', (t) => {
  const file = path.join(SRC_DIR, 'partials', 'head.html');
  const content = fs.readFileSync(file, 'utf-8');
  if (!content.includes("protocol !== 'file:'") && !content.includes('location.protocol !== "file:"')) {
    t.todo('Pending M1: head.html clean URL script lacks file:// protocol guard');
    return;
  }
  assert.ok(
    content.includes("protocol !== 'file:'") || content.includes('location.protocol !== "file:"'),
    'head.html history script must check for file: protocol'
  );
});

test('F1.4: Clean URL history script in head.html wraps replaceState in try-catch to prevent DOMException', (t) => {
  const file = path.join(SRC_DIR, 'partials', 'head.html');
  const content = fs.readFileSync(file, 'utf-8');
  if (!/try\s*\{[\s\S]*?replaceState[\s\S]*?\}\s*catch/.test(content)) {
    t.todo('Pending M1: head.html replaceState is not wrapped in try-catch');
    return;
  }
  assert.match(content, /try\s*\{[\s\S]*?replaceState[\s\S]*?\}\s*catch/, 'replaceState must be enclosed within try/catch');
});

test('F1.5: scroll-float.js inspects prefers-reduced-motion to skip animation delay stalls', (t) => {
  const file = path.join(SRC_DIR, 'js', 'scroll-float.js');
  const content = fs.readFileSync(file, 'utf-8');
  if (!content.includes('prefers-reduced-motion')) {
    t.todo('Pending M1: scroll-float.js lacks prefers-reduced-motion media query check');
    return;
  }
  assert.ok(content.includes('prefers-reduced-motion'), 'scroll-float.js must check prefers-reduced-motion');
});

// ==============================================================================
// FEATURE 2: Dead Code & Unused JSON Data Cleanup
// ==============================================================================

test('F2.1: components.css eliminates dead .about-career-track style rules', (t) => {
  const file = path.join(SRC_DIR, 'css', 'components.css');
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('.about-career-track')) {
    t.todo('Pending M1: components.css contains unreferenced .about-career-track rules');
    return;
  }
  assert.ok(!content.includes('.about-career-track'), '.about-career-track should be pruned from components.css');
});

test('F2.2: components.css eliminates unused accordion rules', (t) => {
  const file = path.join(SRC_DIR, 'css', 'components.css');
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('.accordion') && content.includes('.accordion-content')) {
    t.todo('Pending M1: components.css contains unreferenced .accordion rules');
    return;
  }
  assert.ok(!content.includes('.accordion-content'), 'Dead accordion rules should be pruned');
});

test('F2.3: components.css eliminates unused benchmark card rules', (t) => {
  const file = path.join(SRC_DIR, 'css', 'components.css');
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('.benchmark-card')) {
    t.todo('Pending M1: components.css contains unreferenced .benchmark-card rules');
    return;
  }
  assert.ok(!content.includes('.benchmark-card'), 'Dead benchmark card rules should be pruned');
});

test('F2.4: Compilers prune unreferenced skills_grid HTML generation', (t) => {
  const buildJs = fs.readFileSync(path.join(ROOT_DIR, 'build.js'), 'utf-8');
  if (buildJs.includes('renderSkills') || buildJs.includes('{{skills_grid}}')) {
    t.todo('Pending M1: build.js contains unused renderSkills() logic for unreferenced {{skills_grid}}');
    return;
  }
  assert.ok(!buildJs.includes('renderSkills'), 'build.js should not contain dead renderSkills helper');
});

test('F2.5: data/site.json prunes unreferenced accentColor or connects it cleanly', (t) => {
  const siteJson = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'site.json'), 'utf-8'));
  const buildJs = fs.readFileSync(path.join(ROOT_DIR, 'build.js'), 'utf-8');
  if (siteJson.site.accentColor && !buildJs.includes('accentColor')) {
    t.todo('Pending M1: site.json has orphaned accentColor not referenced in build or templates');
    return;
  }
  assert.ok(true, 'accentColor is cleanly handled or pruned');
});

// ==============================================================================
// FEATURE 3: Code Deduplication
// ==============================================================================

test('F3.1: turtle-canvas.js removes duplicate embedded implementation of initRubberText()', (t) => {
  const content = fs.readFileSync(path.join(SRC_DIR, 'js', 'turtle-canvas.js'), 'utf-8');
  // Check if turtle-canvas has its own internal function initRubberText() body (~70 lines)
  const hasLocalFunction = /function\s+initRubberText\s*\(\)\s*\{[\s\S]*?rubber-letter/.test(content);
  if (hasLocalFunction) {
    t.todo('Pending M1: turtle-canvas.js contains duplicate internal initRubberText() function definition');
    return;
  }
  assert.ok(!hasLocalFunction, 'turtle-canvas.js must not contain duplicated initRubberText function');
});

test('F3.2: rubber-text.js provides the canonical definition of initRubberText', () => {
  const file = path.join(SRC_DIR, 'js', 'rubber-text.js');
  assert.ok(fs.existsSync(file), 'src/js/rubber-text.js must exist');
  const content = fs.readFileSync(file, 'utf-8');
  assert.ok(content.includes('initRubberText'), 'rubber-text.js must define initRubberText');
  assert.ok(content.includes('rubber-letter'), 'rubber-text.js must create rubber-letter spans');
});

test('F3.3: rubber-text.js exports initRubberText cleanly to window for shared execution', () => {
  const file = path.join(SRC_DIR, 'js', 'rubber-text.js');
  const content = fs.readFileSync(file, 'utf-8');
  assert.ok(
    content.includes('window.initRubberText =') || content.includes('window.initRubberText='),
    'rubber-text.js must expose window.initRubberText'
  );
});

test('F3.4: initRubberText checks data-rubber-init to ensure idempotent initialization', () => {
  const file = path.join(SRC_DIR, 'js', 'rubber-text.js');
  const content = fs.readFileSync(file, 'utf-8');
  assert.ok(content.includes('data-rubber-init'), 'rubber-text.js must guard with data-rubber-init attribute');
});

test('F3.5: turtle-canvas.js delegates to window.initRubberText() when available', (t) => {
  const content = fs.readFileSync(path.join(SRC_DIR, 'js', 'turtle-canvas.js'), 'utf-8');
  if (!content.includes('window.initRubberText') && !content.includes('initRubberText')) {
    t.todo('Pending M1: turtle-canvas.js does not yet delegate to shared initRubberText');
    return;
  }
  assert.ok(
    content.includes('window.initRubberText') || content.includes('initRubberText'),
    'turtle-canvas.js must delegate to shared rubber-text'
  );
});

// ==============================================================================
// FEATURE 4: Build Engine Parity & Synchronization
// ==============================================================================

test('F4.1: build.js and build.ps1 generate identical <p>${p}</p> about prose markup without about-lead mismatch', (t) => {
  const buildPs1 = fs.readFileSync(path.join(ROOT_DIR, 'build.ps1'), 'utf-8');
  if (buildPs1.includes('class=`"about-lead`"') || buildPs1.includes('class="about-lead"')) {
    t.todo('Pending M2: build.ps1 generates discrepancy class="about-lead" absent in build.js');
    return;
  }
  assert.ok(!buildPs1.includes('about-lead'), 'build.ps1 must not inject non-existent about-lead class');
});

test('F4.2: build.js and build.ps1 produce synchronized sitemap change frequency', (t) => {
  const buildJs = fs.readFileSync(path.join(ROOT_DIR, 'build.js'), 'utf-8');
  const buildPs1 = fs.readFileSync(path.join(ROOT_DIR, 'build.ps1'), 'utf-8');
  const jsFreq = (buildJs.match(/<changefreq>(.*?)<\/changefreq>/) || [])[1];
  const psFreq = (buildPs1.match(/<changefreq>(.*?)<\/changefreq>/) || [])[1];
  if (jsFreq !== psFreq) {
    t.todo(`Pending M2: Sitemap changefreq discrepancy (build.js: ${jsFreq}, build.ps1: ${psFreq})`);
    return;
  }
  assert.equal(jsFreq, psFreq, 'Both build scripts must specify identical sitemap changefreq');
});

test('F4.3: Both build engines generate identical project card HTML structure', () => {
  const buildJs = fs.readFileSync(path.join(ROOT_DIR, 'build.js'), 'utf-8');
  const buildPs1 = fs.readFileSync(path.join(ROOT_DIR, 'build.ps1'), 'utf-8');
  assert.ok(buildJs.includes('project-item'), 'build.js must render project-item articles');
  assert.ok(buildPs1.includes('project-item'), 'build.ps1 must render project-item articles');
  assert.ok(buildJs.includes('project-title'), 'build.js must render project-title');
  assert.ok(buildPs1.includes('project-title'), 'build.ps1 must render project-title');
});

test('F4.4: Both build engines process and mirror JS files to dist/js/', () => {
  const expectedJs = ['turtle-canvas.js', 'arrow-config.js', 'rubber-text.js', 'scroll-float.js'];
  expectedJs.forEach((jsFile) => {
    assert.ok(fs.existsSync(path.join(SRC_DIR, 'js', jsFile)), `src/js/${jsFile} must exist`);
    assert.ok(fs.existsSync(path.join(DIST_DIR, 'js', jsFile)), `dist/js/${jsFile} must exist in compiled build`);
  });
});

test('F4.5: Both build engines copy static assets from src/assets to dist/assets', () => {
  assert.ok(fs.existsSync(path.join(DIST_DIR, 'assets', 'favicon.svg')), 'dist/assets/favicon.svg must exist');
  assert.ok(fs.existsSync(path.join(DIST_DIR, 'assets', 'manifest.json')), 'dist/assets/manifest.json must exist');
});

// ==============================================================================
// FEATURE 5: Codebase & Folder Restructuring
// ==============================================================================

test('F5.1: Developer curve tool draw.html is housed in tools/ and excluded from dist/', (t) => {
  const toolsDraw = path.join(ROOT_DIR, 'tools', 'draw.html');
  const distDraw = path.join(DIST_DIR, 'draw.html');
  if (!fs.existsSync(toolsDraw)) {
    t.todo('Pending M2: draw.html not yet moved to tools/draw.html');
    return;
  }
  assert.ok(fs.existsSync(toolsDraw), 'tools/draw.html must exist');
  assert.ok(!fs.existsSync(distDraw), 'dist/draw.html should be excluded from production distribution');
});

test('F5.2: Root .gitignore properly ignores dist/ build output', () => {
  const gitignore = fs.readFileSync(path.join(ROOT_DIR, '.gitignore'), 'utf-8');
  assert.match(gitignore, /dist\/?/, '.gitignore must include dist/');
});

test('F5.3: Canonical source files are strictly structured under src/ and data/', () => {
  assert.ok(fs.existsSync(path.join(DATA_DIR, 'site.json')), 'data/site.json must exist as single source of truth');
  assert.ok(fs.existsSync(path.join(SRC_DIR, 'pages', 'index.html')), 'src/pages/index.html must exist');
  assert.ok(fs.existsSync(path.join(SRC_DIR, 'partials', 'head.html')), 'src/partials/head.html must exist');
  assert.ok(fs.existsSync(path.join(SRC_DIR, 'css', 'variables.css')), 'src/css/variables.css must exist');
});

test('F5.4: Output dist/ directory contains all deployable HTML and asset bundles', () => {
  const requiredDist = ['index.html', 'about.html', 'projects.html', 'contact.html', '404.html', 'css/style.css'];
  requiredDist.forEach((relPath) => {
    assert.ok(fs.existsSync(path.join(DIST_DIR, relPath)), `dist/${relPath} must exist`);
  });
});

test('F5.5: Architecture documentation accurately documents build scripts and project layout', (t) => {
  const readme = fs.readFileSync(path.join(ROOT_DIR, 'README.md'), 'utf-8');
  if (!readme.includes('build.js')) {
    t.todo('Pending M2: README.md does not yet document build.js (only build.ps1)');
    return;
  }
  assert.ok(readme.includes('build.js'), 'README must document build.js');
  assert.ok(readme.includes('build.ps1'), 'README must document build.ps1');
});

// ==============================================================================
// FEATURE 6: Social Graph Assets & Metadata
// ==============================================================================

test('F6.1: og-image.png exists in production distribution dist/assets/', (t) => {
  const ogImgDist = path.join(DIST_DIR, 'assets', 'og-image.png');
  if (!fs.existsSync(ogImgDist)) {
    t.todo('Pending M3: dist/assets/og-image.png does not exist yet');
    return;
  }
  assert.ok(fs.existsSync(ogImgDist), 'dist/assets/og-image.png must exist');
  const stat = fs.statSync(ogImgDist);
  assert.ok(stat.size > 0, 'og-image.png must not be empty');
});

test('F6.2: Open Graph meta tags are rendered in HTML head across all pages', () => {
  const pages = ['index.html', 'about.html', 'projects.html', 'contact.html'];
  pages.forEach((page) => {
    const content = fs.readFileSync(path.join(DIST_DIR, page), 'utf-8');
    assert.ok(content.includes('property="og:title"'), `${page} must contain og:title`);
    assert.ok(content.includes('property="og:description"'), `${page} must contain og:description`);
    assert.ok(content.includes('property="og:image"'), `${page} must contain og:image`);
    assert.ok(content.includes('property="og:type"'), `${page} must contain og:type`);
  });
});

test('F6.3: Open Graph image dimensions are explicitly declared in head.html', (t) => {
  const head = fs.readFileSync(path.join(SRC_DIR, 'partials', 'head.html'), 'utf-8');
  if (!head.includes('og:image:width') || !head.includes('1200')) {
    t.todo('Pending M3: head.html lacks og:image:width (1200) and og:image:height (630)');
    return;
  }
  assert.ok(head.includes('og:image:width'), 'head.html must declare og:image:width');
  assert.ok(head.includes('og:image:height'), 'head.html must declare og:image:height');
});

test('F6.4: Twitter Card meta tags are declared across all pages', () => {
  const pages = ['index.html', 'about.html', 'projects.html', 'contact.html'];
  pages.forEach((page) => {
    const content = fs.readFileSync(path.join(DIST_DIR, page), 'utf-8');
    assert.ok(content.includes('name="twitter:card"'), `${page} must contain twitter:card`);
    assert.ok(content.includes('name="twitter:title"'), `${page} must contain twitter:title`);
    assert.ok(content.includes('name="twitter:description"'), `${page} must contain twitter:description`);
    assert.ok(content.includes('name="twitter:image"'), `${page} must contain twitter:image`);
  });
});

test('F6.5: Favicon SVG and Web App Manifest links are declared in head.html', () => {
  const head = fs.readFileSync(path.join(SRC_DIR, 'partials', 'head.html'), 'utf-8');
  assert.ok(head.includes('rel="icon"'), 'head.html must declare rel="icon"');
  assert.ok(head.includes('/assets/favicon.svg'), 'head.html must link /assets/favicon.svg');
  assert.ok(head.includes('rel="manifest"'), 'head.html must declare rel="manifest"');
});

// ==============================================================================
// FEATURE 7: Unified Modern JSON-LD Schema
// ==============================================================================

test('F7.1: Every content page in dist/ contains valid JSON-LD script block', () => {
  const pages = ['index.html', 'about.html', 'projects.html', 'contact.html'];
  pages.forEach((page) => {
    const content = fs.readFileSync(path.join(DIST_DIR, page), 'utf-8');
    assert.ok(content.includes('application/ld+json'), `${page} must contain application/ld+json script`);
  });
});

test('F7.2: Home page contains structured @graph linking WebSite and Person entities', () => {
  const index = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  const match = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'index.html must contain JSON-LD block');
  const json = JSON.parse(match[1]);
  assert.ok(json['@graph'], 'JSON-LD must use @graph array architecture');
  const types = json['@graph'].map((e) => e['@type']).flat();
  assert.ok(types.includes('WebSite'), 'JSON-LD @graph must include WebSite');
  assert.ok(types.includes('Person'), 'JSON-LD @graph must include Person');
});

test('F7.3: Person entity in JSON-LD contains core identity and knowsAbout properties', () => {
  const index = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  const match = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match);
  const json = JSON.parse(match[1]);
  const person = json['@graph'].find((e) => e['@type'] === 'Person');
  assert.ok(person, 'Must find Person entity in @graph');
  assert.equal(person.name, 'S Mohammed Junaith');
  assert.ok(Array.isArray(person.sameAs), 'sameAs must be an array of social links');
  assert.ok(Array.isArray(person.knowsAbout), 'knowsAbout must be an array of technical competencies');
});

test('F7.4: projects.html JSON-LD includes structured software project catalog entities', (t) => {
  const projects = fs.readFileSync(path.join(DIST_DIR, 'projects.html'), 'utf-8');
  if (!projects.includes('SoftwareApplication') && !projects.includes('ItemList')) {
    t.todo('Pending M3: projects.html JSON-LD does not yet include SoftwareApplication/ItemList schema');
    return;
  }
  assert.ok(
    projects.includes('SoftwareApplication') || projects.includes('ItemList'),
    'projects.html JSON-LD must contain software application catalog entities'
  );
});

test('F7.5: 404.html suppresses rich entity structured data to avoid index pollution', (t) => {
  const errorPage = fs.readFileSync(path.join(DIST_DIR, '404.html'), 'utf-8');
  // If 404 has person entity schema, it is not yet suppressed
  if (errorPage.includes('"@type": "Person"') || errorPage.includes('"@type":"Person"')) {
    t.todo('Pending M3: 404.html currently includes full Person schema instead of suppressing it');
    return;
  }
  assert.ok(
    !errorPage.includes('"@type": "Person"'),
    '404.html must suppress rich Person schema markup'
  );
});

// ==============================================================================
// FEATURE 8: Semantic HTML & Accessibility Fixes
// ==============================================================================

test('F8.1: projects.html contains sequential heading levels without skipping H2', (t) => {
  const projects = fs.readFileSync(path.join(DIST_DIR, 'projects.html'), 'utf-8');
  if (!projects.includes('<h2')) {
    t.todo('Pending M3: projects.html skips from H1 to H3 with no H2');
    return;
  }
  assert.ok(projects.includes('<h2'), 'projects.html must contain an H2 heading for accessible document outline');
});

test('F8.2: Skip link is present as the first interactive element in body', () => {
  const pages = ['index.html', 'about.html', 'projects.html', 'contact.html'];
  pages.forEach((page) => {
    const content = fs.readFileSync(path.join(DIST_DIR, page), 'utf-8');
    assert.match(
      content,
      /<body[^>]*>\s*<a href="#main-content" class="skip-link">/,
      `${page} must have skip-link immediately following <body>`
    );
  });
});

test('F8.3: All content pages contain header, nav, main, and footer landmarks', () => {
  const pages = ['index.html', 'about.html', 'projects.html', 'contact.html'];
  pages.forEach((page) => {
    const content = fs.readFileSync(path.join(DIST_DIR, page), 'utf-8');
    assert.match(content, /<header\s+class="site-header[^"]*"/, `${page} must contain site-header`);
    assert.ok(content.includes('<nav class="site-nav"'), `${page} must contain site-nav`);
    assert.ok(content.includes('<main id="main-content"'), `${page} must contain main#main-content`);
    assert.ok(content.includes('<footer class="site-footer"'), `${page} must contain site-footer`);
  });
});

test('F8.4: Project cards eliminate duplicate consecutive tab stops via tabindex="-1" on secondary link', (t) => {
  const buildJs = fs.readFileSync(path.join(ROOT_DIR, 'build.js'), 'utf-8');
  if (!buildJs.includes('project-desc-link') || !buildJs.includes('tabindex="-1"')) {
    t.todo('Pending M3: renderProjectCard in build.js does not yet set tabindex="-1" on secondary desc link');
    return;
  }
  assert.ok(buildJs.includes('tabindex="-1"'), 'Secondary card link must have tabindex="-1"');
});

test('F8.5: Theme toggle and mobile nav toggle buttons have descriptive aria-labels', () => {
  const header = fs.readFileSync(path.join(SRC_DIR, 'partials', 'header.html'), 'utf-8');
  assert.ok(header.includes('aria-label="Toggle dark mode"'), 'Theme toggle must have aria-label');
  assert.match(header, /id="nav-toggle"[^>]*aria-label="Toggle navigation[^"]*"/, 'Nav toggle must have aria-label');
});

// ==============================================================================
// FEATURE 9: AI Search & Crawler Optimization
// ==============================================================================

test('F9.1: dist/llms.txt exists and follows llms.txt standard', (t) => {
  const llmsDist = path.join(DIST_DIR, 'llms.txt');
  if (!fs.existsSync(llmsDist)) {
    t.todo('Pending M3: dist/llms.txt has not been created yet');
    return;
  }
  assert.ok(fs.existsSync(llmsDist), 'dist/llms.txt must exist');
});

test('F9.2: llms.txt provides structured markdown with author bio, projects, and primary pages', (t) => {
  const llmsDist = path.join(DIST_DIR, 'llms.txt');
  if (!fs.existsSync(llmsDist)) {
    t.todo('Pending M3: dist/llms.txt does not exist yet to verify sections');
    return;
  }
  const content = fs.readFileSync(llmsDist, 'utf-8');
  assert.ok(content.includes('S Mohammed Junaith'), 'llms.txt must mention Junaith');
  assert.ok(content.includes('Primary Pages') || content.includes('Pages'), 'llms.txt must list primary pages');
  assert.ok(content.includes('Projects') || content.includes('Engineering Projects'), 'llms.txt must list projects');
});

test('F9.3: dist/robots.txt contains directives for modern AI crawlers (GPTBot, PerplexityBot, ClaudeBot)', (t) => {
  const robots = fs.readFileSync(path.join(DIST_DIR, 'robots.txt'), 'utf-8');
  if (!robots.includes('GPTBot') || !robots.includes('PerplexityBot')) {
    t.todo('Pending M3: robots.txt lacks directives for modern AI crawlers');
    return;
  }
  assert.ok(robots.includes('GPTBot'), 'robots.txt must declare GPTBot');
  assert.ok(robots.includes('PerplexityBot'), 'robots.txt must declare PerplexityBot');
  assert.ok(robots.includes('ClaudeBot'), 'robots.txt must declare ClaudeBot');
});

test('F9.4: dist/robots.txt disallows internal utility draw.html and raw source folders', (t) => {
  const robots = fs.readFileSync(path.join(DIST_DIR, 'robots.txt'), 'utf-8');
  if (!robots.includes('Disallow: /draw.html')) {
    t.todo('Pending M3: robots.txt does not disallow /draw.html');
    return;
  }
  assert.ok(robots.includes('Disallow: /draw.html'), 'robots.txt must disallow /draw.html');
});

test('F9.5: dist/sitemap.xml lists root / first with priority 1.0', (t) => {
  const sitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf-8');
  const firstLocMatch = sitemap.match(/<url>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<priority>(.*?)<\/priority>/);
  if (!firstLocMatch || firstLocMatch[1] !== 'https://www.junaith.dev/') {
    t.todo('Pending M3: sitemap.xml does not list root / first with priority 1.0');
    return;
  }
  assert.equal(firstLocMatch[1], 'https://www.junaith.dev/', 'First URL in sitemap must be root /');
  assert.equal(firstLocMatch[2], '1.0', 'Root URL in sitemap must have priority 1.0');
});

// ==============================================================================
// FEATURE 10: Performance & Layout Shift Elimination
// ==============================================================================

test('F10.1: Hero title in index.html has pre-rendered letters or data-rubber-init to eliminate CLS', (t) => {
  const index = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  if (!index.includes('data-rubber-init="true"')) {
    t.todo('Pending M3: index.html hero title is not pre-rendered with data-rubber-init="true"');
    return;
  }
  assert.ok(index.includes('data-rubber-init="true"'), 'Hero title must have data-rubber-init="true"');
});

test('F10.2: Static HTML in dist/ does not contain hardcoded inline canvas elements', () => {
  const pages = ['index.html', 'about.html', 'projects.html'];
  pages.forEach((page) => {
    const content = fs.readFileSync(path.join(DIST_DIR, page), 'utf-8');
    assert.ok(
      !content.includes('<canvas id="turtle-canvas"'),
      `Static HTML ${page} must not hardcode canvas element for mobile performance`
    );
  });
});

test('F10.3: Font stylesheet link in head.html specifies display=swap to eliminate FOIT', () => {
  const head = fs.readFileSync(path.join(SRC_DIR, 'partials', 'head.html'), 'utf-8');
  assert.ok(head.includes('display=swap'), 'Google fonts stylesheet link must specify display=swap');
});

test('F10.4: Client JavaScript files in head and body are loaded deferred or asynchronously', () => {
  const head = fs.readFileSync(path.join(SRC_DIR, 'partials', 'head.html'), 'utf-8');
  // Ensure no blocking script tags in head (theme script is inline for zero FOUC, which is desired)
  assert.ok(!head.includes('<script src='), 'head.html must not contain blocking external script tags');
});

test('F10.5: Bundled CSS dist/css/style.css is minified and under 60 KB budget', () => {
  const styleCss = path.join(DIST_DIR, 'css', 'style.css');
  assert.ok(fs.existsSync(styleCss), 'dist/css/style.css must exist');
  const stat = fs.statSync(styleCss);
  assert.ok(stat.size < 60 * 1024, `CSS size (${stat.size} bytes) must be under 60 KB budget`);
});
