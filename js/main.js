/* Three small behaviours. Nothing else on the page needs JavaScript. */

(function () {
  'use strict';

  /* --- 1. Mobile menu ------------------------------------- */

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', String(!open));
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.textContent = open ? 'Menu' : 'Close';
    });
  }

  /* --- 2. Hero image rotation ------------------------------
     Swaps the visible image on a timer. No fade — the image
     is simply replaced. Held still if the visitor has asked
     for reduced motion, or while the tab is in the background. */

  var hero = document.querySelector('[data-hero]');

  if (hero) {
    var slides = Array.prototype.slice.call(hero.querySelectorAll('[data-hero-slide]'));
    var dots = Array.prototype.slice.call(document.querySelectorAll('[data-hero-dot]'));
    var interval = Number(hero.getAttribute('data-interval')) || 6000;
    var current = 0;

    var show = function (next) {
      current = (next + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        // All four stay laid out on top of each other and crossfade. Display
        // is set inline because an author `img { display: block }` rule beats
        // the browser's built-in [hidden] rule, so hidden alone is unreliable.
        slide.hidden = false;
        slide.style.display = 'block';
        slide.style.opacity = i === current ? '1' : '0';
        slide.style.zIndex = i === current ? '1' : '0';
      });
      dots.forEach(function (dot, i) {
        dot.setAttribute('aria-current', String(i === current));
      });
    };

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { show(i); });
    });

    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (slides.length > 1 && !still) {
      setInterval(function () {
        if (document.hidden) return;
        show(current + 1);
      }, interval);
    }
  }

  /* --- Reveal on scroll -----------------------------------
     Sections settle in once as they are scrolled to. The hidden
     starting state is added here rather than in the stylesheet so
     that a visitor without JS sees the page fully, not a blank one. */

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reducedMotion && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll(
      '.section-head, .intro-text, .portrait, .card, .quote, .timeline li, .gallery li, .post-header, .post-cover');

    if (targets.length) {
      document.documentElement.classList.add('reveal');

      Array.prototype.forEach.call(targets, function (el) {
        el.setAttribute('data-reveal', '');
      });

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

      Array.prototype.forEach.call(targets, function (el) { observer.observe(el); });
    }
  }

  /* --- 3. Projects strip ------------------------------------
     A plain horizontally scrolling list — it swipes natively on
     touch. The year buttons hide the cards that do not match;
     the arrows and the counter just read and set scrollLeft. */

  var track = document.querySelector('[data-track]');

  if (track) {
    var cards = Array.prototype.slice.call(track.querySelectorAll('.project'));
    var prev = document.querySelector('[data-track-prev]');
    var next = document.querySelector('[data-track-next]');
    var tally = document.querySelector('[data-track-tally]');
    var filters = document.querySelectorAll('[data-filters] button');
    var index = 0;

    var pad = function (n) { return n < 10 ? '0' + n : String(n); };

    var visible = function () {
      return cards.filter(function (card) { return !card.hidden; });
    };

    var update = function () {
      var shown = visible();
      if (!shown.length) return;

      var nearest = 0;
      var smallest = Infinity;

      shown.forEach(function (card, i) {
        var distance = Math.abs(card.offsetLeft - track.scrollLeft);
        if (distance < smallest) {
          smallest = distance;
          nearest = i;
        }
      });

      index = nearest;

      if (tally) tally.textContent = pad(index + 1) + ' / ' + pad(shown.length);
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    };

    var go = function (to) {
      var shown = visible();
      var card = shown[Math.max(0, Math.min(to, shown.length - 1))];
      if (card) track.scrollLeft = card.offsetLeft;
    };

    // Two independent filter rows, year and category. A card has to satisfy
    // both to stay visible.
    var chosen = { year: 'all', category: 'all' };

    var applyFilters = function () {
      cards.forEach(function (card) {
        var okYear = chosen.year === 'all' ||
          card.getAttribute('data-year') === chosen.year;
        var okCat = chosen.category === 'all' ||
          (card.getAttribute('data-category') || '').split('|').indexOf(chosen.category) !== -1;
        card.hidden = !(okYear && okCat);
      });

      track.scrollLeft = 0;
      update();
    };

    Array.prototype.forEach.call(filters, function (button) {
      button.addEventListener('click', function () {
        var row = button.parentNode;
        var kind = row.getAttribute('data-filters');
        chosen[kind] = button.getAttribute('data-filter');

        Array.prototype.forEach.call(row.querySelectorAll('button'), function (other) {
          other.setAttribute('aria-pressed', String(other === button));
        });

        applyFilters();
      });
    });

    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });

    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
