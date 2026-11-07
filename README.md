# S Mohammed Junaith — Portfolio Website

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JunaithSM/myportfoliowebsite)

> A hyper-optimized, zero-framework portfolio website engineered for maximum SEO visibility, sub-second rendering, interactive canvas physics, and 100% automated test coverage.

---

## ⚡ Key Highlights

- **One-Click Vercel Deployment**: Pre-configured `vercel.json` with immutable static asset caching, clean URLs, and security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- **Interactive Canvas Physics & SVG Morphing**: Custom smooth Catmull-Rom Bézier spline arrow engine, rubber text elastic hover wave squash, and responsive hamburger-to-close morphing navigation.
- **Client-Side Contact Validation**: Accessible form validation with live 1000-character message limit counter, inline screen-reader alerts, and automated email client compose links.
- **Sub-50 KB Initial Load**: The entire compiled website (semantic HTML + bundled and minified CSS) loads in under 45 KB total payload.
- **Dual-Compiler Engine**: Compile seamlessly with either cross-platform Node.js (`build.js`) or native PowerShell (`build.ps1`). Zero runtime production dependencies. Compiles all pages in under 80ms.
- **Comprehensive Technical SEO**: Auto-generates `sitemap.xml`, `robots.txt`, `llms.txt`, Open Graph cards, Twitter Cards, canonical links, and schema.org `Person` + `WebSite` JSON-LD structured data.

---

## 🚀 Quick Start & Local Development

### 1. Installation

```bash
git clone https://github.com/JunaithSM/myportfoliowebsite.git
cd myportfoliowebsite
npm install
```

### 2. Compilation

#### Option A: Cross-Platform (Node.js)
```bash
# Build production bundle to dist/
npm run build

# Continuous watch mode (auto-recompiles on edits)
npm run watch

# Launch local preview server (http://localhost:3000)
npm start

# Run comprehensive test suite
npm test
```

#### Option B: Windows (PowerShell)
```powershell
# Build production bundle
.\build.ps1

# Continuous watch mode
.\build.ps1 -Watch

# Launch local server
.\serve.ps1
```

---

## 🌐 Easy Hosting on Vercel

Click the button below to deploy this portfolio directly to your Vercel account:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JunaithSM/myportfoliowebsite)

### Manual Vercel Deployment
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` from the repository root.
3. Vercel automatically reads `vercel.json`, executes `npm run build`, and deploys the static files from `dist/`.

---

## 📁 Project Architecture

```
myportfoliowebsite/
├── src/
│   ├── pages/               # Page templates (index, about, projects, contact, 404)
│   ├── partials/            # Reusable fragments (head, header, footer)
│   ├── css/                 # Modular CSS architecture
│   │   ├── reset.css        # Modern, low-overhead CSS reset
│   │   ├── variables.css    # Design tokens, fluid clamp() typography & colors
│   │   ├── layout.css       # Header, navigation, containers, grid systems
│   │   ├── components.css   # Zero-JS theme toggle, morphing nav, cards, forms
│   │   ├── utilities.css    # Accessibility & screen-reader utilities
│   │   └── print.css        # Clean, resume-ready print stylesheet
│   ├── js/                  # Interactive canvas & client engines
│   │   ├── arrow-config.js  # Dynamic Catmull-Rom spline path definitions
│   │   ├── turtle-canvas.js # Fixed background RAF canvas rendering engine
│   │   ├── rubber-text.js   # Elastic mouseover typography physics
│   │   ├── scroll-float.js  # Experience timeline scroll coordinator
│   │   └── contact-form.js  # Client-side validation & character limit engine
│   └── assets/              # SVG favicons, web app manifest, custom cursors
├── tools/
│   └── draw.html            # Standalone curve coordinate drawer utility
├── data/
│   └── site.json            # Single source of truth for site content & metadata
├── tests/                   # Math engine unit tests and multi-tier E2E suites
│   ├── engine.test.js
│   └── e2e/
├── build.js                 # Cross-platform Node.js compiler
├── build.ps1                # Zero-dependency PowerShell compiler
├── vercel.json              # Vercel deployment, caching & security rules
├── .gitignore               # Strict ignore patterns for dependencies & output
├── package.json             # NPM package scripts & configuration
└── dist/                    # Static output directory generated on build
```

---

## 🛠️ Modifying Content

All content, profile descriptions, project listings, experience timelines, and social links are driven by:
👉 `data/site.json`

Whenever you edit `data/site.json` or any file in `src/`, run `npm run build` (or `.\build.ps1`) to regenerate the production build in `dist/`.

---

## 🧪 Testing & Verification

Run the full automated test suite (126 tests across 4 tiers):
```bash
npm test
```
- **Tier 1**: Core features, script loader idempotency, CSS token cascade.
- **Tier 2**: Boundaries, accessibility landmarks, JSON-LD schema parsing.
- **Tier 3**: Interactions, theme toggle, mobile drawer state machine.
- **Tier 4**: End-to-end crawler, social card, and keyboard accessibility journeys.

---

## 📄 License

MIT License © 2026 S Mohammed Junaith.
