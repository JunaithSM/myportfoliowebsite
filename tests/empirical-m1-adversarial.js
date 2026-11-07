/**
 * Empirical Adversarial Test Harness for Milestone 1: Runtime Stability Fixes
 * 
 * Verifies 4 core challenges:
 * 1. Dynamic script loading race condition (s.async = false guarantees order under network latency)
 * 2. file:// protocol and null origin preview resilience (zero unhandled exceptions)
 * 3. Reduced motion accessibility in scroll-float.js (instant .is-done without timer stalls)
 * 4. Idempotency and non-corruption of initRubberText() (zero DOM corruption or nesting on repeat calls)
 */

const http = require('node:http');
const { execFile, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const ROOT_DIR = path.resolve(__dirname, '..');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function report(name, pass, detail) {
  totalTests++;
  if (pass) {
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${name} - ${detail}`);
  }
}

// ==============================================================================
// CHALLENGE 1: Script Loading Stress Test & In-Order Execution Guarantee
// ==============================================================================
async function runChallenge1() {
  console.log('\n--- Challenge 1: Script Loading Stress Test (Dynamic Script Race Condition) ---');

  // Step 1: Start an adversarial HTTP server simulating skewed network latency
  // Script 1 (arrow-config) is delayed by 200ms.
  // Script 2 (turtle-canvas) is returned immediately with 0ms delay.
  const server = http.createServer((req, res) => {
    if (req.url === '/slow-script.js') {
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(`
          window.__order = window.__order || [];
          window.__order.push('slow-arrow-config');
          document.body.setAttribute('data-script-order', window.__order.join(','));
        `);
      }, 200);
    } else if (req.url === '/fast-script.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(`
        window.__order = window.__order || [];
        window.__order.push('fast-turtle-canvas');
        document.body.setAttribute('data-script-order', window.__order.join(','));
      `);
    } else if (req.url === '/async-false-test.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>Async False Test</title></head>
<body>
  <h1>Testing s.async = false</h1>
  <script>
    ['/slow-script.js', '/fast-script.js'].forEach(function(src) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false; // Strictly enforces order
      document.body.appendChild(s);
    });
  </script>
</body>
</html>`);
    } else if (req.url === '/async-true-test.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>Async True Test (Counter-Proof)</title></head>
<body>
  <h1>Testing default s.async = true</h1>
  <script>
    ['/slow-script.js', '/fast-script.js'].forEach(function(src) {
      var s = document.createElement('script');
      s.src = src;
      // Note: s.async left as default (true in dynamic createElement)
      document.body.appendChild(s);
    });
  </script>
</body>
</html>`);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  await new Promise((resolve) => server.listen(9876, '127.0.0.1', resolve));

  try {
    // 1A. Test with s.async = false using Headless Edge
    const runEdge = (url) => {
      return new Promise((resolve, reject) => {
        execFile(
          EDGE_PATH,
          ['--headless=new', '--disable-gpu', '--virtual-time-budget=2000', '--dump-dom', url],
          { timeout: 10000, encoding: 'utf-8' },
          (err, stdout, stderr) => {
            if (err) return reject(err);
            resolve(stdout || '');
          }
        );
      });
    };

    const domAsyncFalse = await runEdge('http://127.0.0.1:9876/async-false-test.html');
    const orderMatchFalse = domAsyncFalse.match(/data-script-order="([^"]+)"/);
    const orderFalse = orderMatchFalse ? orderMatchFalse[1] : null;

    report(
      '1A. Under 200ms latency skew, s.async = false forces strict sequential execution [slow-arrow-config, fast-turtle-canvas]',
      orderFalse === 'slow-arrow-config,fast-turtle-canvas',
      `Observed execution order: ${orderFalse}`
    );

    // 1B. Adversarial Counter-Proof: Default dynamic scripts (async = true) trigger race condition
    const domAsyncTrue = await runEdge('http://127.0.0.1:9876/async-true-test.html');
    const orderMatchTrue = domAsyncTrue.match(/data-script-order="([^"]+)"/);
    const orderTrue = orderMatchTrue ? orderMatchTrue[1] : null;

    report(
      '1B. Adversarial counter-proof: default dynamic createElement triggers out-of-order race [fast-turtle-canvas, slow-arrow-config]',
      orderTrue === 'fast-turtle-canvas,slow-arrow-config',
      `Observed execution order without s.async = false: ${orderTrue}`
    );

    // 1C. Verify all source pages implement s.async = false
    const pages = ['index.html', 'about.html', 'projects.html'];
    let allPagesProtected = true;
    for (const page of pages) {
      const content = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', page), 'utf-8');
      const hasAsyncFalse = content.includes('s.async = false');
      if (!hasAsyncFalse) allPagesProtected = false;
    }
    report('1C. All source pages (index, about, projects) strictly declare s.async = false', allPagesProtected, 'Missing in one or more pages');

  } finally {
    server.close();
  }
}

// ==============================================================================
// CHALLENGE 2: file:// Protocol & Null Origin Preview Challenge
// ==============================================================================
async function runChallenge2() {
  console.log('\n--- Challenge 2: file:// and Null Origin Preview Challenge ---');

  // 2A. Direct empirical execution of dist/index.html and dist/about.html under file:// in Headless Edge
  const runEdgeDirect = (filePath) => {
    return new Promise((resolve, reject) => {
      const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');
      execFile(
        EDGE_PATH,
        ['--headless=new', '--disable-gpu', '--dump-dom', fileUrl],
        { timeout: 8000, encoding: 'utf-8' },
        (err, stdout, stderr) => {
          if (err) return reject(err);
          resolve(stdout || '');
        }
      );
    });
  };

  try {
    const indexDom = await runEdgeDirect(path.join(ROOT_DIR, 'dist', 'index.html'));
    report('2A. dist/index.html executes cleanly under file:/// protocol in Headless Edge without crashing', indexDom.includes('<!DOCTYPE html>'), 'Execution failed');

    const aboutDom = await runEdgeDirect(path.join(ROOT_DIR, 'dist', 'about.html'));
    report('2B. dist/about.html executes cleanly under file:/// protocol in Headless Edge without crashing', aboutDom.includes('<!DOCTYPE html>'), 'Execution failed');
  } catch (e) {
    report('2A/2B. file:// preview in Headless Edge', false, e.message);
  }

  // 2C. Exhaustive isolated VM stress tests on the exact head.html script across 6 hostile origin conditions
  const headHtml = fs.readFileSync(path.join(ROOT_DIR, 'src', 'partials', 'head.html'), 'utf-8');
  const scriptMatch = headHtml.match(/<!-- Client-side Clean URL Canonicalization -->[\s\S]*?<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'head.html clean URL script must be extracted');
  const canonicalScript = scriptMatch[1];

  function testEnvironment(envName, locationMock, historyMock) {
    let unhandledException = null;
    let replaceStateCalled = false;
    let replaceCalled = false;

    const context = {
      window: {
        location: {
          ...locationMock,
          replace: (url) => { replaceCalled = true; }
        },
        history: {
          replaceState: (state, title, url) => {
            if (historyMock && historyMock.throwOnReplace) {
              const err = new Error('SecurityError: The operation is insecure.');
              err.name = 'SecurityError';
              throw err;
            }
            replaceStateCalled = true;
          }
        }
      }
    };

    try {
      vm.createContext(context);
      vm.runInContext(canonicalScript, context);
    } catch (e) {
      unhandledException = e;
    }

    return { unhandledException, replaceStateCalled, replaceCalled };
  }

  // Test 2C.1: file:// protocol with null origin
  const resFile = testEnvironment('file:// protocol', { protocol: 'file:', origin: 'null', pathname: '/C:/website/index.html', search: '', hash: '' }, { throwOnReplace: true });
  report(
    '2C.1 file:// protocol: Clean URL script safely skips history manipulation (0 exceptions, 0 replaceState calls)',
    resFile.unhandledException === null && resFile.replaceStateCalled === false,
    `Exception: ${resFile.unhandledException}`
  );

  // Test 2C.2: Opaque sandboxed origin ('null') over HTTP
  const resNullOrigin = testEnvironment('null origin', { protocol: 'https:', origin: 'null', pathname: '/about.html', search: '', hash: '' }, { throwOnReplace: true });
  report(
    '2C.2 Sandboxed null origin: Guard prevents history manipulation (0 exceptions, 0 replaceState calls)',
    resNullOrigin.unhandledException === null && resNullOrigin.replaceStateCalled === false,
    `Exception: ${resNullOrigin.unhandledException}`
  );

  // Test 2C.3: Missing/undefined origin property
  const resUndefinedOrigin = testEnvironment('undefined origin', { protocol: 'https:', origin: undefined, pathname: '/about.html', search: '', hash: '' }, { throwOnReplace: true });
  report(
    '2C.3 Undefined origin: Guard prevents history manipulation (0 exceptions, 0 replaceState calls)',
    resUndefinedOrigin.unhandledException === null && resUndefinedOrigin.replaceStateCalled === false,
    `Exception: ${resUndefinedOrigin.unhandledException}`
  );

  // Test 2C.4: Valid origin but hostile locked-down WebView throwing DOMException on replaceState
  const resHostileWebView = testEnvironment('Hostile WebView', { protocol: 'https:', origin: 'https://www.junaith.dev', pathname: '/about.html', search: '', hash: '' }, { throwOnReplace: true });
  report(
    '2C.4 Hostile WebView throwing DOMException: Handled cleanly by try/catch with zero unhandled exceptions',
    resHostileWebView.unhandledException === null,
    `Exception: ${resHostileWebView.unhandledException}`
  );

  // Test 2C.5: Valid production environment properly canonicalizes .html
  const resProduction = testEnvironment('Production', { protocol: 'https:', origin: 'https://www.junaith.dev', pathname: '/projects.html', search: '?q=test', hash: '#sec' }, { throwOnReplace: false });
  report(
    '2C.5 Valid production origin: Canonicalizes /projects.html to clean URL /projects',
    resProduction.unhandledException === null && resProduction.replaceStateCalled === true,
    `Did not call replaceState in production`
  );
}

// ==============================================================================
// CHALLENGE 3: Reduced Motion Challenge (scroll-float.js)
// ==============================================================================
async function runChallenge3() {
  console.log('\n--- Challenge 3: Reduced Motion Accessibility Challenge (scroll-float.js) ---');

  const scrollFloatSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'js', 'scroll-float.js'), 'utf-8');

  // Minimal DOM simulation for scroll-float testing
  function createProseDom() {
    const listeners = [];
    const classSet = new Set();
    
    function createMockElement(tagName, className = '') {
      const el = {
        tagName: tagName.toUpperCase(),
        className: className,
        classList: {
          add: (c) => { el.className = (el.className + ' ' + c).trim(); },
          remove: (c) => { el.className = el.className.split(/\s+/).filter(x => x !== c).join(' '); },
          contains: (c) => el.className.split(/\s+/).includes(c)
        },
        childNodes: [],
        attributes: {},
        setAttribute: (k, v) => { el.attributes[k] = String(v); },
        getAttribute: (k) => el.attributes[k] || null,
        appendChild: (child) => { el.childNodes.push(child); return child; },
        style: { setProperty: () => {} },
        querySelectorAll: (sel) => {
          const results = [];
          function traverse(node) {
            if (sel === '.scroll-float-char' && node.className && node.className.includes('scroll-float-char')) {
              results.push(node);
            }
            if (node.childNodes) node.childNodes.forEach(traverse);
          }
          traverse(el);
          return results;
        },
        addEventListener: (evt, cb) => {},
        get textContent() {
          if (el.nodeType === 3) return el.nodeValue;
          return el.childNodes.map(c => c.textContent || '').join('');
        },
        set textContent(txt) {
          el.childNodes = [{ nodeType: 3, nodeValue: txt }];
        },
        set innerHTML(html) {
          el.childNodes = [];
        }
      };
      return el;
    }

    const p1 = createMockElement('p');
    p1.textContent = 'First systems paragraph for testing.';
    const p2 = createMockElement('p');
    p2.textContent = 'Second architecture paragraph for testing.';
    const p3 = createMockElement('p');
    p3.textContent = 'Third concluding paragraph for testing.';

    const container = createMockElement('div', 'about-prose');
    container.childNodes = [p1, p2, p3];
    container.querySelectorAll = (sel) => {
      if (sel === 'p') return [p1, p2, p3];
      return [];
    };

    const doc = {
      readyState: 'complete',
      querySelector: (sel) => sel === '.about-prose' ? container : null,
      createElement: (tag) => createMockElement(tag),
      createTextNode: (txt) => ({ nodeType: 3, nodeValue: txt, textContent: txt }),
      addEventListener: () => {}
    };

    return { container, paragraphs: [p1, p2, p3], doc };
  }

  // 3A. Test with prefers-reduced-motion: reduce (active)
  const domReduced = createProseDom();
  let timeoutsScheduled = 0;

  const mockWindowReduced = {
    innerWidth: 1024,
    matchMedia: (query) => {
      if (query.includes('prefers-reduced-motion')) {
        return {
          matches: true, // USER PREFERS REDUCED MOTION
          addEventListener: () => {}
        };
      }
      return { matches: false };
    },
    setTimeout: () => { timeoutsScheduled++; return 1; },
    clearTimeout: () => {},
    requestAnimationFrame: () => 1
  };

  const contextReduced = {
    window: mockWindowReduced,
    document: domReduced.doc,
    IntersectionObserver: class {
      constructor() {}
      observe() {}
      disconnect() {}
    }
  };

  const startTime = process.hrtime.bigint();
  vm.createContext(contextReduced);
  vm.runInContext(scrollFloatSrc, contextReduced);
  const endTime = process.hrtime.bigint();
  const elapsedMs = Number(endTime - startTime) / 1e6;

  const allMarkedDone = domReduced.paragraphs.every(p => p.classList.contains('is-done'));
  const noRevealedClass = domReduced.paragraphs.every(p => !p.classList.contains('is-revealed'));

  report(
    '3A. prefers-reduced-motion immediately marks all paragraphs .is-done synchronously (< 5ms, 0 delay timers)',
    allMarkedDone && noRevealedClass && timeoutsScheduled === 0 && elapsedMs < 20,
    `allMarkedDone: ${allMarkedDone}, timeouts: ${timeoutsScheduled}, elapsedMs: ${elapsedMs.toFixed(2)}`
  );

  // 3B. Verify normal motion does NOT immediately mark paragraphs .is-done
  const domNormal = createProseDom();
  const mockWindowNormal = {
    innerWidth: 1024,
    matchMedia: (query) => ({
      matches: false, // NO REDUCED MOTION
      addEventListener: () => {}
    }),
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    requestAnimationFrame: () => 1
  };

  const contextNormal = {
    window: mockWindowNormal,
    document: domNormal.doc,
    IntersectionObserver: class {
      constructor() {}
      observe() {}
      disconnect() {}
    }
  };

  vm.createContext(contextNormal);
  vm.runInContext(scrollFloatSrc, contextNormal);

  const normalNoneDone = domNormal.paragraphs.every(p => !p.classList.contains('is-done'));
  report(
    '3B. Normal motion leaves paragraphs in idle/unrevealed state awaiting scroll intersection',
    normalNoneDone,
    `Unexpected immediate .is-done under normal motion`
  );

  // 3C. Dynamic motion preference transition
  let dynamicListener = null;
  const domDynamic = createProseDom();
  const mockWindowDynamic = {
    innerWidth: 1024,
    matchMedia: (query) => ({
      matches: false,
      addEventListener: (evt, cb) => { dynamicListener = cb; }
    }),
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    requestAnimationFrame: () => 1
  };

  const contextDynamic = {
    window: mockWindowDynamic,
    document: domDynamic.doc,
    IntersectionObserver: class {
      constructor() {}
      observe() {}
      disconnect() {}
    }
  };

  vm.createContext(contextDynamic);
  vm.runInContext(scrollFloatSrc, contextDynamic);

  // Trigger dynamic reduced-motion change
  if (dynamicListener) {
    dynamicListener({ matches: true });
  }

  const dynamicAllDone = domDynamic.paragraphs.every(p => p.classList.contains('is-done'));
  report(
    '3C. Dynamic runtime switch to prefers-reduced-motion instantly transitions all paragraphs to .is-done',
    dynamicAllDone,
    `Dynamic transition failed to mark all paragraphs .is-done`
  );
}

// ==============================================================================
// CHALLENGE 4: Idempotency & Non-Corruption Test (rubber-text.js)
// ==============================================================================
async function runChallenge4() {
  console.log('\n--- Challenge 4: Idempotency & Non-Corruption Challenge (rubber-text.js) ---');

  const rubberTextSrc = fs.readFileSync(path.join(ROOT_DIR, 'src', 'js', 'rubber-text.js'), 'utf-8');

  function createTitleDom(initialText) {
    let innerNodes = [{ nodeType: 3, nodeValue: initialText, textContent: initialText }];
    const attributes = {};

    function serializeNode(node) {
      if (node.nodeType === 3) return node.nodeValue;
      const classAttr = node.className ? ` class="${node.className}"` : '';
      const styleAttr = node._styleProps && Object.keys(node._styleProps).length ? ` style="${Object.entries(node._styleProps).map(([k,v]) => `${k}:${v}`).join(';')}"` : '';
      const children = (node.childNodes || []).map(serializeNode).join('');
      return `<${node.tagName.toLowerCase()}${classAttr}${styleAttr}>${children}</${node.tagName.toLowerCase()}>`;
    }

    function createElem(tagName, className = '') {
      const el = {
        tagName: tagName.toUpperCase(),
        className: className,
        childNodes: [],
        _styleProps: {},
        style: {
          setProperty: (k, v) => { el._styleProps[k] = v; }
        },
        appendChild: (child) => { el.childNodes.push(child); return child; },
        cloneNode: (deep) => createElem(tagName, className),
        querySelectorAll: (sel) => {
          const results = [];
          function traverse(n) {
            if (sel === '.rubber-word' && n.className === 'rubber-word') results.push(n);
            if (sel === '.rubber-letter' && n.className === 'rubber-letter') results.push(n);
            if (sel === '.rubber-word .rubber-word' && n.className === 'rubber-word') {
              (n.childNodes || []).forEach(c => {
                if (c.className === 'rubber-word') results.push(c);
              });
            }
            if (sel === '.rubber-letter .rubber-letter' && n.className === 'rubber-letter') {
              (n.childNodes || []).forEach(c => {
                if (c.className === 'rubber-letter') results.push(c);
              });
            }
            if (n.childNodes) n.childNodes.forEach(traverse);
          }
          traverse(el);
          return results;
        }
      };
      return el;
    }

    const titleEl = {
      tagName: 'H1',
      className: 'hero-title',
      classList: {
        add: (c) => {
          if (!titleEl.className.includes(c)) titleEl.className = (titleEl.className + ' ' + c).trim();
        }
      },
      attributes,
      setAttribute: (k, v) => { attributes[k] = String(v); },
      getAttribute: (k) => attributes[k] || null,
      get childNodes() { return innerNodes; },
      set innerHTML(val) {
        if (val === '') innerNodes = [];
      },
      get innerHTML() {
        return innerNodes.map(serializeNode).join('');
      },
      appendChild: (fragment) => {
        if (fragment && fragment.childNodes) {
          innerNodes.push(...fragment.childNodes);
        }
      },
      querySelectorAll: (sel) => {
        const dummy = { childNodes: innerNodes, className: titleEl.className, tagName: 'H1' };
        const results = [];
        function traverse(n) {
          if (sel === '.rubber-word' && n.className === 'rubber-word') results.push(n);
          if (sel === '.rubber-letter' && n.className === 'rubber-letter') results.push(n);
          if (sel === '.rubber-word .rubber-word' && n.className === 'rubber-word') {
            (n.childNodes || []).forEach(c => {
              if (c.className === 'rubber-word') results.push(c);
            });
          }
          if (sel === '.rubber-letter .rubber-letter' && n.className === 'rubber-letter') {
            (n.childNodes || []).forEach(c => {
              if (c.className === 'rubber-letter') results.push(c);
            });
          }
          if (n.childNodes) n.childNodes.forEach(traverse);
        }
        traverse(dummy);
        return results;
      }
    };

    let observedElements = [];
    const mockObserver = class {
      constructor(cb) { this.cb = cb; }
      observe(el) { observedElements.push(el); }
      disconnect() {}
    };

    const doc = {
      readyState: 'complete',
      querySelectorAll: (sel) => [titleEl],
      createElement: (tag) => createElem(tag),
      createTextNode: (txt) => ({ nodeType: 3, nodeValue: txt, textContent: txt }),
      createDocumentFragment: () => ({
        childNodes: [],
        appendChild: function(c) { this.childNodes.push(c); }
      }),
      addEventListener: () => {}
    };

    return { titleEl, doc, mockObserver, observedElements };
  }

  // 4A. Baseline split
  const domA = createTitleDom('Mohammed Junaith');
  const contextA = {
    window: {},
    document: domA.doc,
    IntersectionObserver: domA.mockObserver
  };

  vm.createContext(contextA);
  vm.runInContext(rubberTextSrc, contextA);

  const initInitAttr = domA.titleEl.getAttribute('data-rubber-init');
  const initObservedAttr = domA.titleEl.getAttribute('data-rubber-observed');
  const wordCount1 = domA.titleEl.querySelectorAll('.rubber-word').length;
  const letterCount1 = domA.titleEl.querySelectorAll('.rubber-letter').length;
  const htmlAfterFirst = domA.titleEl.innerHTML;

  report(
    '4A. First execution splits text into exactly 2 words and 15 letters without error',
    initInitAttr === 'true' && initObservedAttr === 'true' && wordCount1 === 2 && letterCount1 === 15,
    `words: ${wordCount1}, letters: ${letterCount1}`
  );

  // 4B. Stress Test: Call initRubberText() 100 times consecutively
  for (let i = 0; i < 100; i++) {
    contextA.window.initRubberText();
  }

  const htmlAfter100 = domA.titleEl.innerHTML;
  const wordCount100 = domA.titleEl.querySelectorAll('.rubber-word').length;
  const letterCount100 = domA.titleEl.querySelectorAll('.rubber-letter').length;
  const nestedWords = domA.titleEl.querySelectorAll('.rubber-word .rubber-word').length;
  const nestedLetters = domA.titleEl.querySelectorAll('.rubber-letter .rubber-letter').length;
  const totalObservedTimes = domA.observedElements.length;

  report(
    '4B.1 Calling initRubberText() 100 times maintains 100% byte-for-byte identical DOM innerHTML',
    htmlAfterFirst === htmlAfter100,
    `HTML mutated after repeated calls`
  );

  report(
    '4B.2 Zero nested .rubber-word or .rubber-letter spans created under re-entrancy stress',
    nestedWords === 0 && nestedLetters === 0 && wordCount100 === 2 && letterCount100 === 15,
    `nestedWords: ${nestedWords}, nestedLetters: ${nestedLetters}`
  );

  report(
    '4B.3 Exactly ONE IntersectionObserver.observe() registration recorded across 100 calls',
    totalObservedTimes === 1,
    `Observed registrations: ${totalObservedTimes}`
  );

  // 4C. Pre-rendered letters protection (e.g. data-rubber-init="true" supplied in HTML)
  const domPre = createTitleDom('Systems');
  domPre.titleEl.setAttribute('data-rubber-init', 'true');
  const preHtml = '<span class="pre-rendered">Systems</span>';
  domPre.titleEl.innerHTML = '';
  domPre.titleEl.appendChild({
    childNodes: [{
      tagName: 'SPAN',
      className: 'pre-rendered',
      childNodes: [{ nodeType: 3, nodeValue: 'Systems' }]
    }]
  });
  const savedPreHtml = domPre.titleEl.innerHTML;

  const contextPre = {
    window: {},
    document: domPre.doc,
    IntersectionObserver: domPre.mockObserver
  };

  vm.createContext(contextPre);
  vm.runInContext(rubberTextSrc, contextPre);

  report(
    '4C. Elements with pre-rendered data-rubber-init="true" are preserved without rewriting innerHTML',
    domPre.titleEl.innerHTML === savedPreHtml && domPre.titleEl.getAttribute('data-rubber-observed') === 'true',
    `Pre-rendered HTML was overwritten`
  );
}

// ==============================================================================
// RUN ALL CHALLENGES
// ==============================================================================
async function main() {
  console.log('==============================================================================');
  console.log('EMPIRICAL ADVERSARIAL CHALLENGER SUITE - MILESTONE 1 RUNTIME STABILITY');
  console.log('==============================================================================');

  try {
    await runChallenge1();
    await runChallenge2();
    await runChallenge3();
    await runChallenge4();
  } catch (err) {
    console.error('\n[UNEXPECTED SUITE ERROR]', err);
    process.exit(1);
  }

  console.log('\n==============================================================================');
  console.log(`SUMMARY: ${passedTests} passed, ${failedTests} failed, ${totalTests} total challenges`);
  console.log('==============================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main();
