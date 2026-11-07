# Project: Website Codebase Audit, Restructuring, SEO Optimization & Hardening

## Architecture
The website is a ultra-fast, zero-framework, static portfolio and systems showcase built with a lightweight custom template engine supporting both Node.js (`build.js`) and PowerShell (`build.ps1`). It compiles HTML templates in `src/pages/` and `src/partials/` with data from `data/site.json` into `dist/` (and mirrors static files for deployment). Interactive canvas features (Catmull-Rom splines, Hermite curves, Euler integration, and rubber-band typography) run on vanilla ES6/DOM APIs without external runtime libraries.

### Core Modules & Boundaries
1. **Data Layer (`data/`)**: `data/site.json` — Authoritative data model for author profile, navigation, projects, about prose, and social links.
2. **Template & Presentation Layer (`src/pages/`, `src/partials/`, `src/css/`)**: Semantic HTML templates, modular CSS design system (tokens, components, typography, layout).
3. **Interactive & Canvas Engine (`src/js/`)**: `arrow-config.js`, `turtle-canvas.js`, `rubber-text.js`, `scroll-float.js`, `theme.js`.
4. **Build & Tooling Engine (`build.js`, `build.ps1`, `serve.js`)**: Dual-engine static site compiler, asset pipeline, sitemap and robots generator.
5. **Quality Assurance & Verification (`tests/`, `tests/e2e/`)**: Math/spline unit tests (`tests/engine.test.js`) and comprehensive opaque-box E2E test suite.

---

## Feature Inventory
Every feature from user requirements and the Phase 0 survey is inventoried below and mapped to a milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Runtime Stability & Bug Fixes | Fix dynamic script loading race condition (`s.async = false`), unhandled `history.replaceState` DOMException on `file://`, and `prefers-reduced-motion` stall in `scroll-float.js` | M1 | Survey (Explorer 1, 3) |
| 2 | Dead Code & Unused JSON Data Cleanup | Remove dead CSS selectors (~150 lines), unreferenced `skills_grid` compiler logic, dead `hero.badge` checks, and unused JSON fields while preserving data integrity | M1 | Survey (Explorer 1, 3) / R2 |
| 3 | Code Deduplication | Eliminate duplicate `initRubberText()` implementations across `turtle-canvas.js` and `rubber-text.js` | M1 | Survey (Explorer 1) |
| 4 | Build Engine Parity & Synchronization | Harmonize `build.js` and `build.ps1` (sitemap `changefreq`, prose HTML markup, JS handling, and tool copying) | M2 | Survey (Explorer 1, 3) |
| 5 | Codebase & Folder Restructuring | Cleanly organize workspace, assets, and build outputs, updating `.gitignore` and build scripts for maintainability | M2 | Survey (Explorer 3) / R2 |
| 6 | Social Graph Assets & Metadata | Generate high-quality 1200×630 `og-image.png` and `favicon.svg`, completing Open Graph & Twitter Card tags | M3 | Survey (Explorer 2, 3) / R3 |
| 7 | Unified Modern JSON-LD Schema | Implement unified `@graph` schemas per page (`WebSite`, `Person`, `ProfilePage`, `AboutPage`, `CollectionPage`, `SoftwareApplication`, `ContactPage`), suppressing on 404 | M3 | Survey (Explorer 2) / R3 |
| 8 | Semantic HTML & Accessibility Fixes | Fix `projects.html` heading level skip (`<h1>` -> `<h2>` -> `<h3>`) and deduplicate redundant project card link tab stops | M3 | Survey (Explorer 2) / R3 |
| 9 | AI Search & Crawler Optimization | Create `llms.txt`, configure `robots.txt` with AI bot directives (`GPTBot`, `PerplexityBot`, `ClaudeBot`), and disallow internal tool routes (`/draw.html`) | M3 | Survey (Explorer 2) / R3 |
| 10 | Performance & Layout Shift Elimination | Pre-compile hero title letters (`{{hero_role_letters}}`) at build time to prevent client-side CLS and font display swap optimization | M3 | Survey (Explorer 3) / R3 |
| 11 | Written Audit & Findings Documentation | Produce comprehensive written report of all issues discovered across files with solutions and improvements | M4 | Survey / R1 |
| 12 | Opaque-Box E2E Test Suite (Tiers 1-4) | Comprehensive multi-tier test harness covering all features, boundaries, interactions, and real-world scenarios | E2E Track | Requirements |
| 13 | Final E2E Test Pass & Zero Visual Regression | Verify 100% E2E test pass, clean `node build.js` and `build.ps1`, zero UI regressions | M4 | R4 & Acceptance Criteria |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Design and implement opaque-box E2E test suite (Tiers 1-4) publishing `TEST_READY.md` | none | DONE |
| 1 | Runtime Stability, Bug Fixes & Dead Code/Data Cleanup | Resolve dynamic script race condition, DOMException, reduced-motion stall, deduplicate rubber-text, remove dead CSS and unused JSON data | none | DONE |
| 2 | Build Parity & Codebase Restructuring | Harmonize `build.js` and `build.ps1`, organize project files, update `.gitignore` and build pipelines | M1 | DONE |
| 3 | Advanced SEO, Structured Data, Performance & AI Optimization | OG images/favicons, unified JSON-LD `@graph`, semantic HTML fixes, `llms.txt`, AI robots directives, CLS fix | M2 | DONE |
| 4 | Audit Report Delivery & 100% E2E Verification | Deliver written audit findings document (`AUDIT_REPORT.md`), verify 100% E2E test suite pass, zero UI/data regressions | M3, E2E Track | DONE |

---

## Interface Contracts
### Data Layer ↔ Build Engines (`data/site.json` ↔ `build.js`, `build.ps1`)
- `site.json` must provide required fields: `site` (`fullName`, `nickname`, `title`, `url`, `description`, `author`, `keywords`, `repo`), `nav`, `hero`, `skills.items` (used in schema), `about`, `projects` (`id`, `title`, `description`, `repoUrl`, `liveUrl`, `year`, `featured`), `contact`.
- Any cleanup of dead fields in `site.json` must NOT remove fields relied upon by existing pages or templates.

### Templates ↔ Interactive Scripts
- `rubber-text.js` and `turtle-canvas.js`: Both rely on `.rubber-title` elements. When pre-rendered letters are supplied (`data-rubber-init="true"`), client scripts must attach mouseover physics without clearing and rewriting DOM innerHTML.
- `index.html`, `about.html`, `projects.html`: Dynamic script loader must specify `s.async = false` and `s.src = ...` to preserve deterministic execution order (`arrow-config.js` before `turtle-canvas.js`).

---

## Code Layout
- `data/site.json`: Single source of truth for site data.
- `src/pages/`: Page HTML templates (`index.html`, `about.html`, `projects.html`, `contact.html`, `404.html`, `draw.html`).
- `src/partials/`: Reusable HTML partials (`head.html`, `nav.html`, `footer.html`).
- `src/css/`: Modular stylesheets (`tokens.css`, `base.css`, `typography.css`, `layout.css`, `components.css`, `animations.css`, `responsive.css`).
- `src/js/`: Client scripts (`theme.js`, `rubber-text.js`, `arrow-config.js`, `turtle-canvas.js`, `scroll-float.js`).
- `src/assets/`: Static image/icon assets (`og-image.png`, `favicon.svg`, etc.).
- `build.js` & `build.ps1`: Dual compiler scripts building to `dist/` and syncing root artifacts.
- `tests/`: Existing unit test suite (`engine.test.js`) and new E2E test suite (`tests/e2e/`).
- `AUDIT_REPORT.md`: Comprehensive written audit and solutions document at repository root.

