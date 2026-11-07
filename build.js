/**
 * ==============================================================================
 * Cross-Platform Static Site Compiler (Zero-Dependency Node.js Engine)
 * Works identically on macOS, Linux, and Windows.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DATA_FILE = path.join(DATA_DIR, 'site.json');

const isWatchMode = process.argv.includes('--watch') || process.argv.includes('-w');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItem) => {
      copyRecursiveSync(path.join(src, childItem), path.join(dest, childItem));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function build() {
  const startTime = Date.now();
  console.log('\x1b[36m==========================================\x1b[0m');
  console.log('\x1b[36m [HTML Builder] Initializing Site Compilation\x1b[0m');
  console.log('\x1b[36m==========================================\x1b[0m');

  // 1. Ensure Directory Structure
  const cssDistDir = path.join(DIST_DIR, 'css');
  const assetsDistDir = path.join(DIST_DIR, 'assets');
  const jsDistDir = path.join(DIST_DIR, 'js');

  [DIST_DIR, cssDistDir, assetsDistDir, jsDistDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // 2. Load Data
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`Data file not found at: ${DATA_FILE}`);
    return;
  }
  const rawJson = fs.readFileSync(DATA_FILE, 'utf-8');
  const data = JSON.parse(rawJson);

  // Page-Specific SEO Metadata Map
  const pageMeta = {
    'index.html': {
      title: `${data.site.fullName} (${data.site.nickname}) - Systems Architect & Software Engineer`,
      description: data.site.description,
      canonical: `${data.site.url}/`,
      robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
    },
    'about.html': {
      title: `About ${data.site.fullName} (${data.site.nickname}) - Systems Architect`,
      description: `Engineering background, architectural principles, zero-bloat systems, and career record of ${data.site.fullName}.`,
      canonical: `${data.site.url}/about`,
      robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
    },
    'projects.html': {
      title: `Engineering Projects - ${data.site.fullName} (${data.site.nickname})`,
      description: `Software engineering and gameplay programming projects by ${data.site.fullName}: Nexus Gate, Air Attack Force, Jarvis AI, Holy Fraud, and interactive systems.`,
      canonical: `${data.site.url}/projects`,
      robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
    },
    'contact.html': {
      title: `Contact ${data.site.fullName} (${data.site.nickname}) - Architecture Consultations`,
      description: `Get in touch with ${data.site.fullName} (${data.site.nickname}) for systems architecture consultations, latency profiling, and engineering roles.`,
      canonical: `${data.site.url}/contact`,
      robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
    },
    '404.html': {
      title: `404 Not Found - ${data.site.fullName}`,
      description: 'The requested resource could not be found.',
      canonical: '',
      robots: 'noindex, follow'
    }
  };

  // 3. Concatenate and Minify CSS
  const cssFiles = ['reset.css', 'variables.css', 'layout.css', 'components.css', 'utilities.css', 'print.css'];
  let combinedCss = '';
  cssFiles.forEach((file) => {
    const filePath = path.join(SRC_DIR, 'css', file);
    if (fs.existsSync(filePath)) {
      combinedCss += `\n/* === ${file} === */\n` + fs.readFileSync(filePath, 'utf-8');
    }
  });

  let minifiedCss = combinedCss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([\{\}:;,>])\s*/g, '$1')
    .replace(/;\}/g, '}')
    .trim();

  const outputCssPath = path.join(cssDistDir, 'style.css');
  fs.writeFileSync(outputCssPath, minifiedCss, 'utf-8');
  const cssKb = (Buffer.byteLength(minifiedCss, 'utf-8') / 1024).toFixed(2);
  console.log(`\x1b[32m [CSS] Bundled & minified: dist/css/style.css (${cssKb} KB)\x1b[0m`);

  // 4. Load Partials
  const partialsDir = path.join(SRC_DIR, 'partials');
  const partials = {};
  if (fs.existsSync(partialsDir)) {
    fs.readdirSync(partialsDir).forEach((file) => {
      if (file.endsWith('.html')) {
        const name = path.basename(file, '.html');
        partials[name] = fs.readFileSync(path.join(partialsDir, file), 'utf-8');
      }
    });
  }

  // Helper Generators
  function renderNav(pageIdentifier) {
    let currentSlug = pageIdentifier.replace(/\.html$/, '');
    if (currentSlug === 'index') currentSlug = '';

    return data.site.nav
      .map((link) => {
        let linkSlug = link.href.replace(/^\/|\/$/g, '');
        if (linkSlug === 'index') linkSlug = '';
        const isCurrent = linkSlug === currentSlug ? ' aria-current="page"' : '';
        const charCount = link.label.length;
        const letters = link.label
          .split('')
          .map((ch, idx) => `<span class="nav-char" style="--char-index: ${idx}; --total-chars: ${charCount};">${ch === ' ' ? '&nbsp;' : ch}</span>`)
          .join('');
        return `<li><a href="${link.href}" class="nav-link"${isCurrent} aria-label="${link.label}"><span class="nav-chars-wrapper" aria-hidden="true">${letters}</span><span class="visually-hidden">${link.label}</span></a></li>`;
      })
      .join('\n        ');
  }

  function renderProjectCard(p) {
    const targetUrl = p.liveUrl || p.repoUrl || '#';
    return `
        <article class="project-item" id="${p.id}">
          <h3 class="project-title">
            <a href="${targetUrl}" class="project-title-link" target="_blank" rel="noopener noreferrer">
              ${p.title}
            </a>
          </h3>
          <p class="project-desc">
            <a href="${targetUrl}" class="project-desc-link" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">
              ${p.description}&nbsp;<span class="project-arrow-wrap" aria-hidden="true"><svg class="project-arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg></span>
            </a>
          </p>
        </article>`;
  }

  function renderProjects(featuredOnly) {
    let list = data.projects.filter((p) => !featuredOnly || p.featured);
    if (featuredOnly) {
      list = [...list].sort((a, b) => (a.featuredOrder || 99) - (b.featuredOrder || 99));
    }
    return list
      .map(renderProjectCard)
      .join('\n');
  }

  function formatRubberLetters(text) {
    if (!text) return '';
    let letterIndex = 0;
    const lines = text.split(/\r?\n/);
    return lines
      .map((line) => {
        const words = line.trim().split(/\s+/).filter(Boolean);
        return words
          .map((word) => {
            const letters = word
              .split('')
              .map((char) => {
                const delay = letterIndex * 20;
                letterIndex++;
                return `<span class="rubber-letter" style="--rubber-delay: ${delay}ms;">${char}</span>`;
              })
              .join('');
            return `<span class="rubber-word">${letters}</span>`;
          })
          .join('<span class="rubber-space">&nbsp;</span>');
      })
      .join('<br class="rubber-break">');
  }

  function renderExperience() {
    return data.experience
      .map(
        (exp, idx) => {
          const cleanRole = (exp.role || '').replace(/\r?\n\s*/g, ' ').trim();
          const cleanDesc = exp.description ? `<p class="experience-desc">${exp.description.replace(/\r?\n/g, '<br>')}</p>` : '';
          return `
        <article class="experience-float-item${idx === 0 ? ' is-active' : ''}" data-index="${idx}" data-year="${exp.period}" aria-label="${cleanRole} at ${exp.company} (${exp.period})">
          <div class="experience-meta-mobile">
            <span class="experience-period">${exp.period}</span>
          </div>
          <h3 class="experience-role rubber-title">
            <span class="experience-role-text">${formatRubberLetters(exp.role)}</span>
          </h3>
          <div class="experience-company">${exp.company}</div>
          ${cleanDesc}
        </article>`;
        }
      )
      .join('\n');
  }

  function renderAboutProse() {
    if (!data.about || !Array.isArray(data.about.paragraphs)) return '';
    return data.about.paragraphs
      .map((p) => `<p>${p}</p>`)
      .join('\n          ');
  }

  function renderSchema(pageBase, data, pageMeta) {
    if (pageBase === '404') {
      return '<!-- JSON-LD suppressed on error page to avoid search index pollution -->';
    }

    const siteUrl = data.site.url.replace(/\/+$/, '');
    const allSkills = data.skills ? data.skills.flatMap((s) => s.items) : [];
    const socialLinks = [data.site.github, data.site.linkedin, data.site.instagram].filter(Boolean);

    const personEntity = {
      '@type': 'Person',
      '@id': `${siteUrl}/#person`,
      name: data.site.fullName,
      alternateName: data.site.nickname,
      url: siteUrl,
      jobTitle: data.hero.role,
      sameAs: socialLinks,
      knowsAbout: allSkills
    };

    const webSiteEntity = {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: data.site.title,
      publisher: {
        '@id': `${siteUrl}/#person`
      },
      inLanguage: 'en-US'
    };

    const graph = [];

    if (pageBase === 'index') {
      const pTitle = pageMeta['index.html'] ? pageMeta['index.html'].title : data.site.title;
      const pDesc = pageMeta['index.html'] ? pageMeta['index.html'].description : data.site.description;
      const profilePage = {
        '@type': 'ProfilePage',
        '@id': `${siteUrl}/#webpage`,
        url: `${siteUrl}/`,
        name: pTitle,
        description: pDesc,
        isPartOf: { '@id': `${siteUrl}/#website` },
        mainEntity: { '@id': `${siteUrl}/#person` },
        inLanguage: 'en-US'
      };
      graph.push(webSiteEntity, profilePage, personEntity);
    } else if (pageBase === 'about') {
      const pTitle = pageMeta['about.html'] ? pageMeta['about.html'].title : `About ${data.site.fullName}`;
      const pDesc = pageMeta['about.html'] ? pageMeta['about.html'].description : data.site.description;
      const aboutPage = {
        '@type': 'AboutPage',
        '@id': `${siteUrl}/about#webpage`,
        url: `${siteUrl}/about`,
        name: pTitle,
        description: pDesc,
        isPartOf: { '@id': `${siteUrl}/#website` },
        mainEntity: { '@id': `${siteUrl}/#person` },
        breadcrumb: { '@id': `${siteUrl}/about#breadcrumb` },
        inLanguage: 'en-US'
      };
      const breadcrumb = {
        '@type': 'BreadcrumbList',
        '@id': `${siteUrl}/about#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'About', item: `${siteUrl}/about` }
        ]
      };
      graph.push(webSiteEntity, aboutPage, breadcrumb, personEntity);
    } else if (pageBase === 'projects') {
      const pTitle = pageMeta['projects.html'] ? pageMeta['projects.html'].title : 'Engineering Projects';
      const pDesc = pageMeta['projects.html'] ? pageMeta['projects.html'].description : data.site.description;
      const collectionPage = {
        '@type': 'CollectionPage',
        '@id': `${siteUrl}/projects#webpage`,
        url: `${siteUrl}/projects`,
        name: pTitle,
        description: pDesc,
        isPartOf: { '@id': `${siteUrl}/#website` },
        mainEntity: { '@id': `${siteUrl}/projects#itemlist` },
        breadcrumb: { '@id': `${siteUrl}/projects#breadcrumb` },
        inLanguage: 'en-US'
      };
      const breadcrumb = {
        '@type': 'BreadcrumbList',
        '@id': `${siteUrl}/projects#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Projects', item: `${siteUrl}/projects` }
        ]
      };

      const projectItems = (data.projects || []).map((p, idx) => {
        const itemObj = {
          '@type': 'SoftwareApplication',
          '@id': `${siteUrl}/projects#${p.id}`,
          name: p.title,
          description: p.description,
          applicationCategory: 'GameEngine|SystemsSoftware',
          operatingSystem: 'All',
          url: p.liveUrl || `${siteUrl}/projects`
        };
        if (p.repoUrl) itemObj.codeRepository = p.repoUrl;
        itemObj.author = { '@id': `${siteUrl}/#person` };
        return {
          '@type': 'ListItem',
          position: idx + 1,
          item: itemObj
        };
      });

      const itemList = {
        '@type': 'ItemList',
        '@id': `${siteUrl}/projects#itemlist`,
        name: data.projectsSection ? data.projectsSection.title : 'Works & Projects',
        description: pDesc,
        numberOfItems: projectItems.length,
        itemListElement: projectItems
      };

      graph.push(webSiteEntity, collectionPage, itemList, breadcrumb, personEntity);
    } else if (pageBase === 'contact') {
      const pTitle = pageMeta['contact.html'] ? pageMeta['contact.html'].title : 'Contact';
      const pDesc = pageMeta['contact.html'] ? pageMeta['contact.html'].description : data.site.description;
      const contactPage = {
        '@type': 'ContactPage',
        '@id': `${siteUrl}/contact#webpage`,
        url: `${siteUrl}/contact`,
        name: pTitle,
        description: pDesc,
        isPartOf: { '@id': `${siteUrl}/#website` },
        mainEntity: { '@id': `${siteUrl}/#person` },
        breadcrumb: { '@id': `${siteUrl}/contact#breadcrumb` },
        inLanguage: 'en-US'
      };
      const breadcrumb = {
        '@type': 'BreadcrumbList',
        '@id': `${siteUrl}/contact#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Contact', item: `${siteUrl}/contact` }
        ]
      };
      const contactPerson = {
        ...personEntity,
        email: data.site.email ? `mailto:${data.site.email}` : undefined
      };
      graph.push(webSiteEntity, contactPage, breadcrumb, contactPerson);
    }

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': graph
    };

    return `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
  }

  // 5. Compile Pages
  const pagesDir = path.join(SRC_DIR, 'pages');
  const pageList = [];

  if (fs.existsSync(pagesDir)) {
    fs.readdirSync(pagesDir).forEach((file) => {
      if (!file.endsWith('.html')) return;
      const pageName = file;
      const pageBase = path.basename(file, '.html');
      pageList.push(pageName);

      let content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');

      // Replace Partials: {{> partial_name}}
      Object.keys(partials).forEach((pName) => {
        content = content.split(`{{> ${pName}}}`).join(partials[pName]);
      });

      // Inject Computed Helpers
      content = content.split('{{nav_links}}').join(renderNav(pageName));
      content = content.split('{{featured_projects}}').join(renderProjects(true));
      content = content.split('{{all_projects}}').join(renderProjects(false));
      content = content.split('{{experience_timeline}}').join(renderExperience());

      // Replace Page-Specific Metadata
      let pTitle = data.site.title;
      let pDesc = data.site.description;
      let pCanonical = `${data.site.url}/${pageName}`;
      let pRobots = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

      if (pageMeta[pageName]) {
        pTitle = pageMeta[pageName].title;
        pDesc = pageMeta[pageName].description;
        pCanonical = pageMeta[pageName].canonical;
        if (pageMeta[pageName].robots) pRobots = pageMeta[pageName].robots;
      }

      content = content.split('{{page.title}}').join(pTitle);
      content = content.split('{{page.description}}').join(pDesc);
      content = content.split('{{page.canonicalUrl}}').join(pCanonical);
      content = content.split('{{page.robots}}').join(pRobots);

      // Conditional canonical tag (omitted on 404)
      const canonicalTag = pCanonical
        ? `<link rel="canonical" href="${pCanonical}">`
        : '<!-- canonical omitted for error page -->';
      content = content.split('{{canonical_tag}}').join(canonicalTag);

      // Open Graph & Twitter URL Tags (omitted on 404)
      const ogUrlTag = pCanonical
        ? `<meta property="og:url" content="${pCanonical}">`
        : '<!-- og:url omitted for error page -->';
      content = content.split('{{og_url_tag}}').join(ogUrlTag);

      const twitterUrlTag = pCanonical
        ? `<meta name="twitter:url" content="${pCanonical}">`
        : '<!-- twitter:url omitted for error page -->';
      content = content.split('{{twitter_url_tag}}').join(twitterUrlTag);

      // Inject Unified Schema Markup
      content = content.split('{{schema_markup}}').join(renderSchema(pageBase, data, pageMeta));
      content = content.split('{{breadcrumb_jsonld}}').join('');

      // Replace Global Site Variables
      content = content.split('{{site.name}}').join(data.site.name);
      content = content.split('{{site.fullName}}').join(data.site.fullName);
      content = content.split('{{site.nickname}}').join(data.site.nickname);
      content = content.split('{{site.title}}').join(data.site.title);
      content = content.split('{{site.description}}').join(data.site.description);
      content = content.split('{{site.url}}').join(data.site.url);
      content = content.split('{{site.author}}').join(data.site.author);
      content = content.split('{{site.email}}').join(data.site.email);
      content = content.split('{{site.twitter}}').join(data.site.twitter);
      content = content.split('{{site.github}}').join(data.site.github);
      content = content.split('{{site.linkedin}}').join(data.site.linkedin);
      content = content.split('{{site.instagram}}').join(data.site.instagram || '');
      content = content.split('{{site.themeColor}}').join(data.site.themeColor);
      content = content.split('{{site.currentYear}}').join(new Date().getFullYear().toString());

      // Replace Hero Variables
      const heroTagline = data.hero.tagline.replace(/\r?\n/g, '<br>');
      const cleanHeroRole = data.hero.role.replace(/\r?\n\s*/g, ' ');
      content = content.split('{{hero.role}}').join(cleanHeroRole);
      content = content.split('{{hero_role_letters}}').join(formatRubberLetters(data.hero.role));
      content = content.split('{{hero.tagline}}').join(heroTagline);
      content = content.split('{{hero.ctaPrimary.label}}').join(data.hero.ctaPrimary ? data.hero.ctaPrimary.label : 'Explore projects');
      content = content.split('{{hero.ctaPrimary.href}}').join(data.hero.ctaPrimary ? data.hero.ctaPrimary.href : '/projects');
      content = content.split('{{hero.ctaSecondary.label}}').join(data.hero.ctaSecondary ? data.hero.ctaSecondary.label : "Let's connect");
      content = content.split('{{hero.ctaSecondary.href}}').join(data.hero.ctaSecondary ? data.hero.ctaSecondary.href : '/contact');

      // Replace Section Variables & Helpers
      const projectsTitle = data.projectsSection ? data.projectsSection.title : 'Works & Projects';
      content = content.split('{{projects.title}}').join(projectsTitle);
      content = content.split('{{projects_title_letters}}').join(formatRubberLetters(projectsTitle));

      const expTitle = data.experienceSection ? data.experienceSection.title : 'My Experience';
      const expSub = data.experienceSection ? data.experienceSection.subtitle : '';
      content = content.split('{{experience.title}}').join(expTitle);
      content = content.split('{{experience.subtitle}}').join(expSub);

      const aboutTitle = data.about ? data.about.title : data.site.fullName;
      content = content.split('{{about.title}}').join(aboutTitle);
      content = content.split('{{about_title_letters}}').join(formatRubberLetters(aboutTitle));
      content = content.split('{{about_prose}}').join(renderAboutProse());

      // Contact Variables
      const contactTitle = data.contact && data.contact.title ? data.contact.title : "Let's connect";
      content = content.split('{{contact.title}}').join(contactTitle);
      content = content.split('{{contact_title_letters}}').join(formatRubberLetters(contactTitle));
      if (data.contact) {
        content = content.split('{{contact.subtitle}}').join(data.contact.subtitle || '');
        content = content.split('{{contact.formTitle}}').join(data.contact.formTitle);
        content = content.split('{{contact.formButton}}').join(data.contact.formButton);
      }

      // Locale & Theme Colors
      content = content.split('{{site.locale}}').join(data.site.locale || 'en_US');
      content = content.split('{{site.themeColorDark}}').join(data.site.themeColorDark || '#1C1714');

      // Formatted Handles
      const githubHandle = data.site.github ? data.site.github.replace(/^https?:\/\/github\.com\//, 'github.com/').replace(/\/$/, '') : '';
      content = content.split('{{site.githubDisplay}}').join(githubHandle);
      const linkedinHandle = data.site.linkedin ? data.site.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, 'linkedin.com/in/').replace(/\/$/, '') : '';
      content = content.split('{{site.linkedinDisplay}}').join(linkedinHandle);
      const instagramHandle = data.site.instagram ? data.site.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, 'instagram.com/').replace(/\/$/, '') : '';
      content = content.split('{{site.instagramDisplay}}').join(instagramHandle);

      // JSON-LD Skills Knowledge List
      const allSkills = data.skills ? data.skills.flatMap((s) => s.items) : [];
      content = content.split('{{knows_about_json}}').join(JSON.stringify(allSkills));

      // Output to dist/
      fs.writeFileSync(path.join(DIST_DIR, pageName), content, 'utf-8');

      // Clean URL directory output (dist/<pageBase>/index.html)
      if (pageBase !== 'index' && pageBase !== '404') {
        const subDir = path.join(DIST_DIR, pageBase);
        if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
        fs.writeFileSync(path.join(subDir, 'index.html'), content, 'utf-8');
      }

      // Mirror to workspace root for static previewers (e.g. VS Code Live Server)
      if (pageBase === 'index') {
        fs.writeFileSync(path.join(ROOT_DIR, 'index.html'), content, 'utf-8');
      } else if (pageBase === '404') {
        fs.writeFileSync(path.join(ROOT_DIR, '404.html'), content, 'utf-8');
      } else {
        // Mirror both root/<pageBase>.html AND root/<pageBase>/index.html
        fs.writeFileSync(path.join(ROOT_DIR, `${pageBase}.html`), content, 'utf-8');
        const rootSubDir = path.join(ROOT_DIR, pageBase);
        if (!fs.existsSync(rootSubDir)) fs.mkdirSync(rootSubDir, { recursive: true });
        fs.writeFileSync(path.join(rootSubDir, 'index.html'), content, 'utf-8');
      }

      console.log(`\x1b[32m [HTML] Compiled: dist/${pageName} (mirrored to root)\x1b[0m`);
    });
  }

  // 6. Generate sitemap.xml
  const todayDate = new Date().toISOString().split('T')[0];
  const sitemapPages = pageList
    .filter((p) => p !== '404.html')
    .sort((a, b) => {
      if (a === 'index.html') return -1;
      if (b === 'index.html') return 1;
      return a.localeCompare(b);
    });

  const sitemapEntries = sitemapPages
    .map((p) => {
      const slug = p.replace(/\.html$/, '');
      const priority = slug === 'index' ? '1.0' : '0.8';
      const pageUrl = slug === 'index' ? `${data.site.url}/` : `${data.site.url}/${slug}`;
      return `  <url>\n    <loc>${pageUrl}</loc>\n    <lastmod>${todayDate}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>`.trim();
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');
  fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');

  // 7. Generate robots.txt
  const robotsTxt = [
    '# Modern AI Crawlers',
    'User-agent: GPTBot',
    'Allow: /',
    'Disallow: /draw.html',
    'Disallow: /tools/',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    'Disallow: /draw.html',
    'Disallow: /tools/',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    'Disallow: /draw.html',
    'Disallow: /tools/',
    '',
    '# General Web Crawlers',
    'User-agent: *',
    'Allow: /',
    'Disallow: /draw.html',
    'Disallow: /tools/',
    '',
    `Sitemap: ${data.site.url}/sitemap.xml`
  ].join('\n').trim();

  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf-8');
  fs.writeFileSync(path.join(ROOT_DIR, 'robots.txt'), robotsTxt, 'utf-8');

  // Mirror llms.txt for AI search crawlers
  const srcLlms = path.join(SRC_DIR, 'llms.txt');
  if (fs.existsSync(srcLlms)) {
    const llmsContent = fs.readFileSync(srcLlms, 'utf-8');
    fs.writeFileSync(path.join(DIST_DIR, 'llms.txt'), llmsContent, 'utf-8');
    fs.writeFileSync(path.join(ROOT_DIR, 'llms.txt'), llmsContent, 'utf-8');
    console.log(`\x1b[32m [AI] Mirrored: src/llms.txt -> dist/llms.txt & root llms.txt\x1b[0m`);
  }

  // 8. Static Server Redirects
  const redirectsContent = `/index.html   /   301!\n/about.html   /about   301!\n/projects.html   /projects   301!\n/contact.html   /contact   301!`;
  fs.writeFileSync(path.join(DIST_DIR, '_redirects'), redirectsContent, 'utf-8');

  const vercelConfig = JSON.stringify(
    {
      buildCommand: "npm run build",
      outputDirectory: "dist",
      cleanUrls: true,
      trailingSlash: false,
      redirects: [
        { source: '/index.html', destination: '/', permanent: true },
        { source: '/about.html', destination: '/about', permanent: true },
        { source: '/projects.html', destination: '/projects', permanent: true },
        { source: '/contact.html', destination: '/contact', permanent: true }
      ],
      headers: [
        {
          source: '/assets/(.*)',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
        },
        {
          source: '/css/(.*)',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
        },
        {
          source: '/js/(.*)',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
        },
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
          ]
        }
      ]
    },
    null,
    2
  );
  fs.writeFileSync(path.join(DIST_DIR, 'vercel.json'), vercelConfig, 'utf-8');
  fs.writeFileSync(path.join(ROOT_DIR, 'vercel.json'), vercelConfig, 'utf-8');

  // 9. Process Assets & JavaScript (Minification & Root Mirroring)
  const srcAssets = path.join(SRC_DIR, 'assets');
  if (fs.existsSync(srcAssets)) {
    copyRecursiveSync(srcAssets, assetsDistDir);
    copyRecursiveSync(srcAssets, path.join(ROOT_DIR, 'assets'));
  }

  const srcJs = path.join(SRC_DIR, 'js');
  if (fs.existsSync(srcJs)) {
    const rootJsDir = path.join(ROOT_DIR, 'js');
    if (!fs.existsSync(rootJsDir)) fs.mkdirSync(rootJsDir, { recursive: true });

    fs.readdirSync(srcJs).forEach((file) => {
      const srcPath = path.join(srcJs, file);
      const destPath = path.join(jsDistDir, file);
      const rootDestPath = path.join(rootJsDir, file);

      if (fs.statSync(srcPath).isDirectory()) {
        copyRecursiveSync(srcPath, destPath);
        copyRecursiveSync(srcPath, rootDestPath);
      } else if (file.endsWith('.js')) {
        let code = fs.readFileSync(srcPath, 'utf-8');
        // Basic zero-dep JS minification: strip comments & redundant empty lines
        code = code
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^[ \t]*\/\/.*$/gm, '')
          .replace(/^\s*[\r\n]/gm, '');
        fs.writeFileSync(destPath, code, 'utf-8');
        fs.writeFileSync(rootDestPath, code, 'utf-8');
      } else {
        fs.copyFileSync(srcPath, destPath);
        fs.copyFileSync(srcPath, rootDestPath);
      }
    });
    console.log(`\x1b[32m [JS] Processed & minified: dist/js/ & root js/\x1b[0m`);
  }

  // Mirror minified CSS to root
  const rootCssDir = path.join(ROOT_DIR, 'css');
  if (!fs.existsSync(rootCssDir)) fs.mkdirSync(rootCssDir, { recursive: true });
  fs.copyFileSync(path.join(cssDistDir, 'style.css'), path.join(rootCssDir, 'style.css'));

  // 10. Strict Verification: Check ALL HTML files for unreplaced template tags
  const tokenRegex = /\{\{[a-zA-Z0-9_\.\>\s]+?\}\}/g;
  const errorsFound = [];

  function checkDir(dir) {
    fs.readdirSync(dir).forEach((entry) => {
      const fullPath = path.join(dir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        checkDir(fullPath);
      } else if (entry.endsWith('.html')) {
        const text = fs.readFileSync(fullPath, 'utf-8');
        const matches = text.match(tokenRegex);
        if (matches && matches.length > 0) {
          const uniqueBad = Array.from(new Set(matches)).join(', ');
          errorsFound.push(`${entry}: ${uniqueBad}`);
        }
      }
    });
  }

  checkDir(DIST_DIR);

  // Also verify root mirror files
  ['index.html', 'about.html', 'projects.html', 'contact.html', '404.html'].forEach((f) => {
    const rootFile = path.join(ROOT_DIR, f);
    if (fs.existsSync(rootFile)) {
      const text = fs.readFileSync(rootFile, 'utf-8');
      const matches = text.match(tokenRegex);
      if (matches && matches.length > 0) {
        errorsFound.push(`root/${f}: ${Array.from(new Set(matches)).join(', ')}`);
      }
    }
  });

  if (errorsFound.length > 0) {
    throw new Error(`CRITICAL BUILD FAILURE: Unreplaced template tokens detected:\n${errorsFound.join('\n')}`);
  }
  console.log(`\x1b[32m [Verify] Zero unreplaced template tokens confirmed across all builds.\x1b[0m`);

  const duration = Date.now() - startTime;
  console.log('\x1b[36m==========================================\x1b[0m');
  console.log(`\x1b[36m [Done] Compilation completed in ${duration} ms\x1b[0m`);
  console.log('\x1b[36m==========================================\x1b[0m');
}

// Initial Build
build();

// Watch Mode
if (isWatchMode) {
  console.log('\x1b[33m\n[Watcher] Active: Monitoring src/ and data/...\x1b[0m');
  console.log('\x1b[90mEdit any file to rebuild automatically. Press Ctrl+C to stop.\x1b[0m');

  let debounceTimer = null;
  const watchDirs = [SRC_DIR, DATA_DIR];

  watchDirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log(`\x1b[33m\n[Watcher] Change detected in "${filename}". Rebuilding...\x1b[0m`);
          try {
            build();
          } catch (err) {
            console.error('\x1b[31m[Watcher Error]:\x1b[0m', err);
          }
        }, 150);
      });
    }
  });
}

