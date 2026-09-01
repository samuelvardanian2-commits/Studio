/* ==========================================================================
   Samuel Vardanian — interaction layer
   No dependencies. Everything degrades: no JS = a readable, complete page.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ── 1. Preloader ─────────────────────────────────────────────────── */
  function bootPreloader() {
    var pre = $('#preloader'), count = $('#pcount'), bar = $('#pbar');
    if (!pre) { document.body.classList.add('is-ready'); return; }

    if (reduced) { pre.remove(); document.body.classList.add('is-ready'); return; }

    document.body.classList.add('is-loading');
    var start = null, DUR = 1150;

    function pad(n) { return n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n; }

    function tick(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / DUR, 1);
      var eased = 1 - Math.pow(1 - t, 3);           // easeOutCubic
      var v = Math.round(eased * 100);
      count.textContent = pad(v);
      bar.style.width = eased * 100 + '%';
      if (t < 1) { requestAnimationFrame(tick); return; }
      pre.classList.add('is-done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      setTimeout(function () { pre.remove(); }, 1100);
    }
    requestAnimationFrame(tick);
  }

  /* ── 2. Nav: elevate on scroll, hide on scroll-down ───────────────── */
  function bootNav() {
    var nav = $('#nav'), last = 0;
    if (!nav) return;
    var onScroll = function () {
      var y = window.scrollY;
      nav.classList.toggle('is-stuck', y > 40);
      // only hide once well past the hero, and never while a menu is open
      var hide = y > last && y > 560 && !document.body.classList.contains('menu-open');
      nav.classList.toggle('is-hidden', hide);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── 3. Mobile menu ───────────────────────────────────────────────── */
  function bootMenu() {
    var btn = $('#navToggle'), menu = $('#mobileMenu');
    if (!btn || !menu) return;

    function set(open) {
      btn.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      document.body.classList.toggle('menu-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      $('.nav__toggle-label', btn).textContent = open ? 'Close' : 'Menu';
      if (open) { var f = $('a', menu); if (f) f.focus(); }
    }
    btn.addEventListener('click', function () {
      set(btn.getAttribute('aria-expanded') !== 'true');
    });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
    });
  }

  /* ── 4. Hero film: fade in when it can actually play, parallax on scroll */
  function bootHero() {
    var v = $('#heroVideo');
    if (!v) return;

    var ready = function () { v.classList.add('is-ready'); };
    if (v.readyState >= 2) ready();
    v.addEventListener('loadeddata', ready);
    // No file yet? Stay on the gradient fallback — never show a black box.
    v.addEventListener('error', function () { v.style.display = 'none'; }, true);
    $$('source', v).forEach(function (s) {
      s.addEventListener('error', function () { v.style.display = 'none'; });
    });

    if (reduced) { v.pause(); return; }

    var hero = $('.hero'), raf = null;
    var onScroll = function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var y = window.scrollY;
        if (y > hero.offsetHeight) return;
        var p = y / hero.offsetHeight;
        v.style.transform = 'scale(' + (1 + p * 0.14).toFixed(4) + ') translate3d(0,' + (p * 7).toFixed(2) + '%,0)';
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── 5. Word-by-word reveal for the manifesto statement ───────────── */
  function bootSplit() {
    $$('[data-split]').forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach(function (w, i) {
        var s = document.createElement('span');
        s.className = 'w';
        s.textContent = w;
        s.style.transitionDelay = (i * 18) + 'ms';
        el.appendChild(s);
        el.appendChild(document.createTextNode(' '));
      });
    });
  }

  /* ── 6. Scroll reveals — auto-tagged, no markup noise ─────────────── */
  function bootReveal() {
    var sel = '.sechead, .proj, .cap, .step, .stat, .about__title, .about__body p,' +
              '.about__list, .quote blockquote, .contact__title, .contact__mail,' +
              '.contact__note, .manifesto__aside, .process__rail';
    $$(sel).forEach(function (el, i) {
      el.setAttribute('data-rise', '');
      el.style.transitionDelay = ((i % 4) * 70) + 'ms';
    });

    var targets = $$('[data-rise], .statement');
    if (!('IntersectionObserver' in window) || reduced) {
      targets.forEach(function (el) {
        el.classList.add('on');
        $$('.w', el).forEach(function (w) { w.classList.add('on'); });
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('on');
        $$('.w', e.target).forEach(function (w) { w.classList.add('on'); });
        io.unobserve(e.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ── 7. Stat counters ─────────────────────────────────────────────── */
  function bootCounters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    var run = function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduced) { el.textContent = target + suffix; return; }
      var start = null, DUR = 1500;
      requestAnimationFrame(function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / DUR, 1);
        var eased = 1 - Math.pow(1 - t, 4);
        el.textContent = Math.round(eased * target) + suffix;
        if (t < 1) requestAnimationFrame(step);
      });
    };

    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        run(e.target); io.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ── 8. Clock — reads the visitor's own timezone, so it's never wrong */
  function bootClock() {
    var tz;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = ''; }
    var city = tz ? tz.split('/').pop().replace(/_/g, ' ') : 'Local';

    var cities = $$('#clockCity, #clockCity2');
    var times  = $$('#clockTime, #clockTime2');
    cities.forEach(function (el) { el.textContent = city; });

    var paint = function () {
      var s = new Date().toLocaleTimeString('en-GB', { hour12: false });
      times.forEach(function (el) { el.textContent = s; });
    };
    paint();
    setInterval(paint, 1000);
  }

  /* ── 9. Magnetic email link (fine pointers only) ──────────────────── */
  function bootMagnet() {
    var el = $('#magnet');
    if (!el || reduced || !finePointer) return;

    var move = function (e) {
      var r = el.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) * 0.12;
      var dy = (e.clientY - (r.top + r.height / 2)) * 0.22;
      el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    };
    var reset = function () {
      el.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1), color .4s, border-color .4s';
      el.style.transform = '';
    };
    el.addEventListener('pointerenter', function () { el.style.transition = 'color .4s, border-color .4s'; });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', reset);
    el.addEventListener('blur', reset);
  }

  /* ── 10. Hero eyebrow/lead stagger delays from data-delay ─────────── */
  function bootHeroDelays() {
    $$('.hero [data-delay]').forEach(function (el) {
      el.style.setProperty('--d', el.getAttribute('data-delay'));
    });
  }

  /* ── boot ─────────────────────────────────────────────────────────── */
  function init() {
    bootHeroDelays();
    bootPreloader();
    bootNav();
    bootMenu();
    bootHero();
    bootSplit();
    bootReveal();
    bootCounters();
    bootClock();
    bootMagnet();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
