/* ==========================================================================
   Scroll-driven flythrough.

   Two backends behind one section:

   1. SEQUENCE  — if assets/frames/frame_0001.jpg exists, scroll scrubs a
                  Seedance one-take render frame by frame on canvas. Canvas,
                  not <video>, because iOS Safari will not scrub a video
                  element smoothly — it seeks in keyframe jumps.
   2. CORRIDOR  — otherwise, a procedural fly-through of film frames
                  receding in Z. No assets, no dependencies. This is what
                  runs until the render lands.

   Both are driven by one scroll progress value, so swapping backends
   changes nothing else on the page.
   ========================================================================== */
(function () {
  'use strict';

  var SEQ = {
    dir: 'assets/frames/', prefix: 'frame_', pad: 4, ext: '.jpg',
    count: 'auto',   // 'auto' discovers the frame count; set a number to skip the probe
    max: 2000        // ceiling for the search, so a misconfigured path can't run away
  };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var section = document.querySelector('.fly');
  if (!section) return;

  var canvas = section.querySelector('.fly__canvas');
  var ctx = canvas.getContext('2d');
  var caps = Array.prototype.slice.call(section.querySelectorAll('.fly__cap'));

  var W = 0, H = 0, dpr = 1;
  var progress = 0, eased = 0;
  var mode = 'corridor';
  var frames = [], loadedCount = 0;

  /* ── sizing ───────────────────────────────────────────────────────── */
  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── scroll progress: 0 when the stage pins, 1 when it releases ───── */
  function readProgress() {
    var r = section.getBoundingClientRect();
    var travel = section.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    return Math.min(Math.max(-r.top / travel, 0), 1);
  }

  /* ── backend 1: image sequence ────────────────────────────────────── */
  function framePath(i) {
    var n = String(i);
    while (n.length < SEQ.pad) n = '0' + n;
    return SEQ.dir + SEQ.prefix + n + SEQ.ext;
  }

  function frameExists(i, yes, no) {
    var img = new Image();
    img.onload = function () { yes(img); };
    img.onerror = no;
    img.src = framePath(i);
  }

  /* How many frames are there? Double until one 404s, then binary search the
     gap — about 2·log2(n) requests, ~16 for a 180-frame sequence. Beats making
     someone hand-edit a count every time they re-render. Frames must be
     contiguous from 1, which is what ffmpeg outputs anyway. */
  function discoverCount(done) {
    frameExists(1, function (first) {
      frames[0] = first; loadedCount = 1;

      function narrow(low, high) {           // low exists, high does not
        if (high - low <= 1) { done(low); return; }
        var mid = (low + high) >> 1;
        frameExists(mid, function () { narrow(mid, high); },
                         function () { narrow(low, mid); });
      }

      (function grow(lo, hi) {
        if (hi > SEQ.max) { narrow(lo, SEQ.max + 1); return; }
        frameExists(hi, function () { grow(hi, hi * 2); },
                        function () { narrow(lo, hi); });
      })(1, 2);
    }, function () { done(0); });
  }

  function loadSequence() {
    // Progressive: draw the nearest loaded frame, so it is usable immediately.
    for (var i = 2; i <= SEQ.count; i++) {
      (function (idx) {
        var img = new Image();
        img.onload = function () { frames[idx - 1] = img; loadedCount++; };
        img.src = framePath(idx);
      })(i);
    }
  }

  function nearestFrame(idx) {
    if (frames[idx]) return frames[idx];
    for (var d = 1; d < SEQ.count; d++) {
      if (frames[idx - d]) return frames[idx - d];
      if (frames[idx + d]) return frames[idx + d];
    }
    return null;
  }

  function drawSequence(p) {
    var idx = Math.min(SEQ.count - 1, Math.round(p * (SEQ.count - 1)));
    var img = nearestFrame(idx);
    ctx.clearRect(0, 0, W, H);
    if (!img) return;
    // cover-fit
    var s = Math.max(W / img.width, H / img.height);
    var w = img.width * s, h = img.height * s;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }

  /* ── backend 2: procedural corridor of film frames ────────────────── */
  /* Dark fills, luminous edges. The dark fill is the whole trick: nearer
     frames occlude farther ones, which is what makes flat 2D canvas read
     as depth. Translucent fills just stack into mush. */
  var COUNT = 110, SPACING = 235, NEAR = 90;
  var cards = [];

  // One curve, evaluated at a continuous index. The frames sit on it and the
  // camera rides it, so you fly *through* the corridor instead of past it.
  function pathX(t) { return Math.sin(t * 0.34) * 210 + Math.sin(t * 1.31) * 46; }
  function pathY(t) { return Math.cos(t * 0.27) * 138 + Math.cos(t * 1.07) * 32; }

  function buildCorridor() {
    cards = [];
    for (var i = 0; i < COUNT; i++) {
      cards.push({
        idx: i,
        z: NEAR + i * SPACING,
        x: pathX(i),
        y: pathY(i),
        roll: Math.sin(i * 0.61) * 0.26,
        accent: i % 7 === 0
      });
    }
  }

  function drawCorridor(p) {
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H / 2;
    var focal = Math.max(W, H) * 0.82;
    var camZ = p * (COUNT - 10) * SPACING;
    // keyed to the diagonal, not the short edge — a portrait phone would
    // otherwise get a corridor half the size it has room for
    var scale = Math.hypot(W, H) / 1430;
    var DEPTH = COUNT * SPACING;
    var camT = camZ / SPACING;
    var camX = pathX(camT), camY = pathY(camT);

    // vanishing-point glow so the corridor reads as receding into something
    var vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.42);
    vg.addColorStop(0, 'rgba(255,92,40,.16)');
    vg.addColorStop(0.55, 'rgba(58,74,150,.07)');
    vg.addColorStop(1, 'rgba(8,8,10,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    var vis = [];
    for (var i = 0; i < cards.length; i++) {
      var dz = cards[i].z - camZ;
      if (dz > NEAR && dz < DEPTH) vis.push([dz, cards[i]]);
    }
    vis.sort(function (a, b) { return b[0] - a[0]; });   // far → near

    for (var k = 0; k < vis.length; k++) {
      var dz2 = vis[k][0], card = vis[k][1];
      var f = focal / dz2;
      var sx = cx + (card.x - camX) * scale * f;
      var sy = cy + (card.y - camY) * scale * f;
      var w = 340 * scale * f, h = w * 9 / 16;
      if (w < 3) continue;

      // fade up out of the far plane, and out again as it passes the lens
      var far  = Math.pow(Math.min(Math.max(1 - dz2 / (DEPTH * 0.5), 0), 1), 0.7);
      var near = Math.min(Math.max((dz2 - NEAR) / 700, 0), 1);
      var alpha = far * near;
      if (alpha <= 0.004) continue;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(card.roll);

      // opaque-ish dark fill → real occlusion → real depth
      ctx.globalAlpha = alpha * 0.92;
      ctx.fillStyle = '#0A0A0E';
      ctx.fillRect(-w / 2, -h / 2, w, h);

      // a breath of colour inside the frame
      ctx.globalAlpha = alpha * 0.7;
      var g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      if (card.accent) {
        g.addColorStop(0, 'rgba(255,92,40,.5)');
        g.addColorStop(1, 'rgba(30,16,12,0)');
      } else {
        g.addColorStop(0, 'rgba(58,74,150,.42)');
        g.addColorStop(1, 'rgba(10,12,20,0)');
      }
      ctx.fillStyle = g;
      ctx.fillRect(-w / 2, -h / 2, w, h);

      // the luminous edge that carries the whole read
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = card.accent ? 'rgba(255,110,50,1)' : 'rgba(244,241,235,.82)';
      ctx.lineWidth = Math.max(0.75, 1.2 * Math.min(f * 2.4, 1.7));
      if (card.accent) { ctx.shadowColor = 'rgba(255,92,40,.9)'; ctx.shadowBlur = 18 * Math.min(f * 3, 1.4); }
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.shadowBlur = 0;

      // inset frame line — the film-gate detail, only when there is room for it
      if (w > 130) {
        var pad = w * 0.045;
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = 'rgba(244,241,235,.5)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-w / 2 + pad, -h / 2 + pad, w - pad * 2, h - pad * 2);
      }
      ctx.restore();
    }
  }

  /* ── captions track progress ──────────────────────────────────────── */
  function paintCaps(p) {
    var active = p < 0.34 ? 0 : p < 0.68 ? 1 : 2;
    for (var i = 0; i < caps.length; i++) {
      caps[i].classList.toggle('is-on', i === active);
    }
  }

  /* ── loop ─────────────────────────────────────────────────────────── */
  function render() {
    if (mode === 'sequence') drawSequence(eased); else drawCorridor(eased);
    paintCaps(eased);
  }

  var running = false;
  function frame() {
    var d = progress - eased;
    eased += d * 0.16;
    if (Math.abs(d) < 0.0004) { eased = progress; running = false; render(); return; }
    render();
    requestAnimationFrame(frame);
  }
  function kick() {
    progress = readProgress();
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  /* ── boot ─────────────────────────────────────────────────────────── */
  function start() {
    resize();
    buildCorridor();

    if (reduced) {
      // no scroll binding: one representative still, everything legible
      progress = eased = 0.42;
      render();
      caps.forEach(function (c) { c.classList.add('is-on'); });
      window.addEventListener('resize', function () { resize(); render(); });
      return;
    }

    progress = eased = readProgress();
    render();
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', function () { resize(); render(); });

    function useSequence(n) {
      SEQ.count = n;
      mode = 'sequence';
      section.setAttribute('data-mode', 'sequence');
      section.setAttribute('data-frames', n);
      loadSequence();
      render();
    }

    if (typeof SEQ.count === 'number' && SEQ.count > 0) {
      var manual = SEQ.count;
      frameExists(1, function (first) {
        frames[0] = first; loadedCount = 1; useSequence(manual);
      }, function () { section.setAttribute('data-mode', 'corridor'); });
    } else {
      discoverCount(function (n) {
        if (n > 0) useSequence(n);
        else section.setAttribute('data-mode', 'corridor');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else { start(); }
})();
