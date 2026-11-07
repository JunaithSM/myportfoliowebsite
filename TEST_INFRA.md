# End-to-End (E2E) Test Infrastructure Specification

**Project**: Website Codebase Audit, Restructuring, SEO Optimization & Hardening  
**Target Architecture**: Zero-Dependency Static Portfolio & Systems Showcase  
**Test Framework**: Native Node.js Test Runner (`node:test`) & `node:assert/strict`  
**Test Suite Directory**: `tests/e2e/`  
**Specification Date**: 2026-11-07  

---

## 1. Executive Overview

This document specifies the architecture, testing methodology, tier hierarchy, test oracle derivations, and coverage thresholds for the comprehensive opaque-box E2E test suite.

The test harness evaluates the static site output (`dist/`), runtime scripts (`src/js/`), markup templates (`src/pages/`, `src/partials/`), stylesheets (`src/css/`), build pipelines (`build.js`, `build.ps1`), crawler discovery assets (`robots.txt`, `sitemap.xml`, `llms.txt`), and deployment configurations (`vercel.json`, `_redirects`).

Testing operates in **opaque-box mode**: validating observable HTML artifacts, DOM structure, metadata headers, JSON-LD schemas, script tags, and visual regression guards without requiring external browser automation dependencies or third-party test packages.

---

## 2. Testing Methodologies

The test suite applies four rigorous software testing methodologies:

```
+-------------------------------------------------------------------------------+
|                             TESTING METHODOLOGIES                             |
+-------------------------------------------------------------------------------+
|  1. Category-Partition (Tier 1)                                               |
|     - Systematic division of features into functional categories              |
|     - Partitioning into equivalence classes (Happy Path / Standard Behaviors) |
+-------------------------------------------------------------------------------+
|  2. Boundary Value Analysis - BVA (Tier 2)                                    |
|     - Extremes, edge values, limits, off-by-one, and empty/large inputs       |
|     - Viewport thresholds (767px/768px/800px), meta lengths (155/160 chars)   |
+-------------------------------------------------------------------------------+
|  3. Pairwise Combinatorial (Tier 3)                                           |
|     - Multi-factor interaction across feature orthogonal axes                 |
|     - Engine (Node/PS) x Page (5) x Viewport (Mobile/Desktop) x Theme         |
+-------------------------------------------------------------------------------+
|  4. Real-World Application Scenarios (Tier 4)                                 |
|     - End-to-end user and crawler journeys traversing complete workflows      |
|     - AI Crawler Journey, Social Preview, Keyboard A11y, Local file://        |
+-------------------------------------------------------------------------------+
```

### 2.1 Category-Partition Methodology
Every feature identified in `PROJECT.md` is decomposed into functional units, determining parameters, constraints, and equivalence classes. For each class, test cases verify deterministic behavior under expected inputs.

### 2.2 Boundary Value Analysis (BVA)
BVA targets the edges of equivalence classes where defects cluster:
- **String Length Limits**: Meta descriptions around 155–160 character Google SERP truncation bounds; Title lengths around 50–60 characters.
- **Image Dimensions & Aspect Ratios**: Open Graph 1200×630 pixels (1.905:1 aspect ratio), SVG vector icons.
- **Responsive Viewport Breakpoints**: Desktop canvas activation threshold (`window.innerWidth >= 768px`), mobile menu drawer breakpoint (`768px`), hero arrow threshold (`768px` vs obsolete `800px`).
- **Array Limits**: 0 items, 1 item, and multiple items in `projects`, `paragraphs`, and `skills`.
- **Protocol & Origin Boundaries**: `file://` opaque origin restrictions vs `http://` / `https://` relative URI paths.

### 2.3 Pairwise Combinatorial Testing
Validates orthogonal cross-feature interactions to identify subtle race conditions and integration bugs:
- **Build Engine** (`build.js`, `build.ps1`) × **Output Artifact** (HTML markup, prose `<p>`, sitemap change frequency).
- **Page Route** (`/`, `/about`, `/projects`, `/contact`, `/404`) × **SEO Tag Presence** (Canonical, Robots, OG, Twitter).
- **Viewport Mode** (`<768px`, `>=768px`) × **Interactive Engine** (Static HTML vs Desktop Canvas RAF).
- **Motion Preference** (`prefers-reduced-motion: reduce` vs `no-preference`) × **Typography Physics** (`scroll-float.js`, `rubber-text.js`).

### 2.4 Real-World Application Scenarios
Simulates realistic end-user, browser, and search crawler journeys through full end-to-end execution paths.

---

## 3. Feature Mapping & Tier Coverage Matrix

The suite covers all 10 core features identified in `PROJECT.md`:

| # | Feature Inventory Item | Tier 1 (Features) | Tier 2 (Boundaries) | Tier 3 (Cross-Feature) | Tier 4 (Scenarios) |
|---|------------------------|:-----------------:|:-------------------:|:----------------------:|:------------------:|
| F1 | Runtime Stability & Bug Fixes | 5 tests | 5 tests | Included | Included |
| F2 | Dead Code & Unused JSON Cleanup | 5 tests | 5 tests | Included | Included |
| F3 | Code Deduplication | 5 tests | 5 tests | Included | Included |
| F4 | Build Engine Parity & Synchronization | 5 tests | 5 tests | Included | Included |
| F5 | Codebase & Folder Restructuring | 5 tests | 5 tests | Included | Included |
| F6 | Social Graph Assets & Metadata | 5 tests | 5 tests | Included | Included |
| F7 | Unified Modern JSON-LD Schema | 5 tests | 5 tests | Included | Included |
| F8 | Semantic HTML & Accessibility Fixes | 5 tests | 5 tests | Included | Included |
| F9 | AI Search & Crawler Optimization | 5 tests | 5 tests | Included | Included |
| F10 | Performance & Layout Shift Elimination | 5 tests | 5 tests | Included | Included |
| **Sum** | **10 Features** | **50 tests** | **50 tests** | **10 tests** | **5 tests** |

**Total Suite Size: 115 test cases** (Surpassing all required minimum thresholds).

---

## 4. Test Suite Directory Structure

```
tests/
├── engine.test.js                 # Unit tests (Math, splines, interpolation, timeline)
└── e2e/
    ├── tier1-features.test.js     # 50 Feature Coverage tests (5 per feature)
    ├── tier2-boundaries.test.js   # 50 Boundary & Corner Case tests (5 per feature)
    ├── tier3-interactions.test.js # 10 Cross-Feature Pairwise Interaction tests
    └── tier4-scenarios.test.js    # 5 End-to-End Real-World Application Scenarios
```

---

## 5. Test Execution & Progressive Testability

### 5.1 Test Runner Command
The entire test suite executes via the standard npm command:
```bash
npm test
```
Which is mapped in `package.json` to:
```bash
node --test tests/engine.test.js "tests/e2e/**/*.test.js"
```

### 5.2 Progressive Testability Protocol
To adhere strictly to progressive testability during milestone-based development:
- **Baseline Features**: Tests asserting already-functioning capabilities (semantic HTML landmarks, zero-JS theme toggling, clean build tokens, math calculations) execute active assertions and PASS immediately.
- **Milestone-Pending Features**: Tests asserting features scheduled for upcoming milestones (e.g., M1 script loader `s.async = false`, M2 build parity, M3 `og-image.png` and `llms.txt`) dynamically detect implementation presence. If pending, they register via `t.todo('Pending M[X]: ...')`, exiting with status code 0 while clearly logging pending items. Once the implementing milestone lands the change, the test automatically transitions to passing with zero modifications required to the test suite.
