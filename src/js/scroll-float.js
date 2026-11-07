/**
 * ==============================================================================
 * ScrollFloat Engine (Sequential One-by-One Per-Character Animation on Scroll)
 * Adapted from React Bits <ScrollFloat /> (Zero-Dependency Vanilla JS)
 * ==============================================================================
 */

(function () {
  function initScrollFloat() {
    var container = document.querySelector('.about-prose');
    if (!container || container.getAttribute('data-scroll-float-init')) return;
    container.setAttribute('data-scroll-float-init', 'true');

    var paragraphs = Array.from(container.querySelectorAll('p'));
    if (!paragraphs.length) return;

    var STAGGER_MS = 8;
    var CHAR_ANIMATION_DURATION = 720; // Matches charScrollFloat keyframe duration
    var GAP_BETWEEN_PARAGRAPHS = 110; // Rhythmic breath before next paragraph starts

    // 1. Prepare and split each paragraph into accessible SR text and character spans
    var pData = paragraphs.map(function (p, index) {
      var rawText = p.textContent.trim();

      // Screen reader accessible element (identical to React Bits .scroll-float-sr)
      var srSpan = document.createElement('span');
      srSpan.className = 'scroll-float-sr';
      srSpan.textContent = rawText;

      // Visual split container
      var visualWrap = document.createElement('span');
      visualWrap.className = 'scroll-float-text';
      visualWrap.setAttribute('aria-hidden', 'true');

      // Split by words first, then characters (preserves word wrapping & natural spacing)
      var chunks = rawText.split(/(\s+)/);
      var charIndex = 0;

      chunks.forEach(function (chunk) {
        if (/^\s+$/.test(chunk)) {
          visualWrap.appendChild(document.createTextNode(' '));
        } else if (chunk.length > 0) {
          var wordSpan = document.createElement('span');
          wordSpan.className = 'scroll-float-word';

          Array.from(chunk).forEach(function (char) {
            var charSpan = document.createElement('span');
            charSpan.className = 'scroll-float-char';
            charSpan.style.setProperty('--char-delay', (charIndex * STAGGER_MS) + 'ms');
            charSpan.textContent = char;
            wordSpan.appendChild(charSpan);
            charIndex++;
          });

          visualWrap.appendChild(wordSpan);
        }
      });

      p.innerHTML = '';
      p.appendChild(srSpan);
      p.appendChild(visualWrap);

      return {
        el: p,
        index: index,
        inView: false,
        status: 'idle', // 'idle' | 'animating' | 'done'
        charCount: charIndex
      };
    });

    // Mark container ready so initial CSS hiding only applies after splitting
    container.classList.add('is-ready');

    var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    function prefersReducedMotion() {
      return !!(motionQuery && motionQuery.matches);
    }

    // Accessible reduced motion: immediately complete all paragraphs without queueing animation timers
    if (prefersReducedMotion()) {
      pData.forEach(function (d) {
        d.status = 'done';
        d.el.classList.add('is-done');
      });
      return;
    }

    if (motionQuery && motionQuery.addEventListener) {
      motionQuery.addEventListener('change', function (e) {
        if (e.matches) {
          pData.forEach(function (d) {
            d.status = 'done';
            d.el.classList.remove('is-revealed');
            d.el.classList.add('is-done');
          });
        }
      });
    }

    // 2. Sequential Orchestrator: triggers paragraphs one-by-one in sequence
    function startParagraph(index) {
      var item = pData[index];
      if (!item || item.status !== 'idle') return;

      if (prefersReducedMotion()) {
        item.status = 'done';
        item.el.classList.remove('is-revealed');
        item.el.classList.add('is-done');
        processQueue();
        return;
      }

      item.status = 'animating';
      item.el.classList.remove('is-done');
      item.el.classList.add('is-revealed');

      var chars = item.el.querySelectorAll('.scroll-float-char');
      var lastChar = chars[chars.length - 1];

      var finished = false;
      function finishParagraph() {
        if (finished) return;
        finished = true;
        item.status = 'done';
        item.el.classList.remove('is-revealed');
        item.el.classList.add('is-done');

        // Once this paragraph finishes, trigger the next one in sequence
        setTimeout(function () {
          processQueue();
        }, GAP_BETWEEN_PARAGRAPHS);
      }

      if (lastChar) {
        lastChar.addEventListener('animationend', finishParagraph, { once: true });
      }

      // Resilient fallback timer: (chars * stagger) + duration + buffer
      var maxWait = (item.charCount * STAGGER_MS) + CHAR_ANIMATION_DURATION + 160;
      setTimeout(finishParagraph, maxWait);
    }

    function processQueue() {
      if (prefersReducedMotion()) {
        pData.forEach(function (d) {
          if (d.status !== 'done') {
            d.status = 'done';
            d.el.classList.remove('is-revealed');
            d.el.classList.add('is-done');
          }
        });
        return;
      }

      // Fast-forward any paragraph that has already scrolled above viewport
      pData.forEach(function (d) {
        var rect = d.el.getBoundingClientRect();
        if (rect.bottom < 0 && d.status !== 'done') {
          d.status = 'done';
          d.el.classList.remove('is-revealed');
          d.el.classList.add('is-done');
        }
      });

      // Exactly one paragraph animates at a time
      var isAnyAnimating = pData.some(function (d) {
        return d.status === 'animating';
      });
      if (isAnyAnimating) return;

      // Find the next paragraph in order that is 'idle'
      var nextItem = null;
      for (var i = 0; i < pData.length; i++) {
        if (pData[i].status === 'idle') {
          nextItem = pData[i];
          break;
        }
      }

      if (!nextItem) return;

      // Only animate if it is currently in view (or approaching viewport)
      if (nextItem.inView) {
        startParagraph(nextItem.index);
      }
    }

    // 3. Viewport Observer & Scroll Handling
    if (typeof IntersectionObserver !== 'undefined') {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var item = pData.find(function (d) { return d.el === entry.target; });
          if (!item) return;

          if (entry.isIntersecting) {
            item.inView = true;
            processQueue();
          } else {
            // If scrolled below the bottom of viewport, reset so it can re-animate on scroll down
            if (entry.boundingClientRect.top > window.innerHeight + 80) {
              item.inView = false;
              if (item.status !== 'animating') {
                item.status = 'idle';
                item.el.classList.remove('is-revealed');
                item.el.classList.remove('is-done');
              }
            } else if (entry.boundingClientRect.bottom < 0) {
              // Scrolled past above viewport
              item.inView = false;
              if (item.status !== 'done') {
                item.status = 'done';
                item.el.classList.remove('is-revealed');
                item.el.classList.add('is-done');
              }
            }
          }
        });
      }, {
        threshold: 0.08,
        rootMargin: '0px 0px 80px 0px'
      });

      paragraphs.forEach(function (p) {
        observer.observe(p);
      });
    } else {
      // Fallback for ancient browsers without IntersectionObserver: sequential auto-trigger
      var delay = 0;
      pData.forEach(function (item) {
        setTimeout(function () {
          startParagraph(item.index);
        }, delay);
        delay += (item.charCount * STAGGER_MS) + CHAR_ANIMATION_DURATION + GAP_BETWEEN_PARAGRAPHS;
      });
    }

    // Also check queue on scroll to catch fast scrolls or viewport changes
    window.addEventListener('scroll', function () {
      processQueue();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollFloat);
  } else {
    initScrollFloat();
  }
})();
