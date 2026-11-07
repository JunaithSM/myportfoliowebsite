/**
 * ==============================================================================
 * Standalone Rubber Text Reveal & Spring Physics Engine
 * Works across ALL devices (desktop, tablet, mobile) with zero canvas dependency.
 * ==============================================================================
 */

(function () {
  'use strict';

  var rubberObserver = null;

  function initRubberText() {
    if (typeof document === 'undefined') return;

    var titles = document.querySelectorAll(
      '.hero-title, .section-title, .featured-projects-title, .experience-title, .about-title, .rubber-title'
    );

    titles.forEach(function (title) {
      if (title.getAttribute('data-rubber-init')) return;
      title.setAttribute('data-rubber-init', 'true');
      title.classList.add('rubber-title');

      var rawNodes = Array.from(title.childNodes);
      var letterIndex = 0;
      var fragment = document.createDocumentFragment();

      rawNodes.forEach(function (node) {
        if (node.nodeType === 3) {
          var text = node.nodeValue;
          var chunks = text.split(/(\s+)/);

          chunks.forEach(function (chunk) {
            if (/^\s+$/.test(chunk)) {
              fragment.appendChild(document.createTextNode(chunk));
            } else if (chunk.length > 0) {
              var wordSpan = document.createElement('span');
              wordSpan.className = 'rubber-word';

              Array.from(chunk).forEach(function (char) {
                var letterSpan = document.createElement('span');
                letterSpan.className = 'rubber-letter';
                letterSpan.style.setProperty('--rubber-delay', (letterIndex * 20) + 'ms');
                letterSpan.textContent = char;
                wordSpan.appendChild(letterSpan);
                letterIndex++;
              });

              fragment.appendChild(wordSpan);
            }
          });
        } else {
          fragment.appendChild(node.cloneNode(true));
        }
      });

      title.innerHTML = '';
      title.appendChild(fragment);
    });

    // Scroll reveal observer: triggers rubber bounce whenever title scrolls into view
    if (typeof IntersectionObserver !== 'undefined') {
      if (!rubberObserver) {
        rubberObserver = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add('is-revealed');
              } else {
                entry.target.classList.remove('is-revealed');
              }
            });
          },
          {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
          }
        );
      }

      titles.forEach(function (title) {
        if (!title.getAttribute('data-rubber-observed')) {
          title.setAttribute('data-rubber-observed', 'true');
          rubberObserver.observe(title);
        }
      });
    } else {
      titles.forEach(function (title) {
        title.classList.add('is-revealed');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRubberText);
  } else {
    initRubberText();
  }

  if (typeof window !== 'undefined') {
    window.initRubberText = initRubberText;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = initRubberText;
  }
})();

