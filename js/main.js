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
        slide.hidden = i !== current;
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

    Array.prototype.forEach.call(filters, function (button) {
      button.addEventListener('click', function () {
        var want = button.getAttribute('data-filter');

        cards.forEach(function (card) {
          card.hidden = want !== 'all' && card.getAttribute('data-year') !== want;
        });

        Array.prototype.forEach.call(filters, function (other) {
          other.setAttribute('aria-pressed', String(other === button));
        });

        track.scrollLeft = 0;
        update();
      });
    });

    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });

    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
