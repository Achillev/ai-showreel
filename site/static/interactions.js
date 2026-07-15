/* AI Showreel — micro-interactions (refonte dark-native). Vanilla, zero dependance.
   Chaque fonction est autonome et defensive : si son markup est absent, elle no-op.
   Rien ne cache jamais de contenu : les valeurs finales sont deja dans le HTML. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var isEN = document.documentElement.getAttribute('lang') === 'en';
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function tr(fr, en) { return isEN ? en : fr; }

  /* ---- Modal reutilisable (blind spot, get-the-data) ---- */
  var modal = (function () {
    var overlay, titleEl, bodyEl, closeBtn, lastFocus;
    function build() {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML = '<div class="modal"><button class="modal-close" aria-label="' + tr('Fermer', 'Close') + '">×</button><h3></h3><div class="modal-body"></div></div>';
      document.body.appendChild(overlay);
      titleEl = overlay.querySelector('h3');
      bodyEl = overlay.querySelector('.modal-body');
      closeBtn = overlay.querySelector('.modal-close');
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
      closeBtn.addEventListener('click', close);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });
    }
    function open(title, html) {
      if (!overlay) build();
      titleEl.textContent = title;
      bodyEl.innerHTML = html;
      lastFocus = document.activeElement;
      overlay.classList.add('open');
      closeBtn.focus();
    }
    function close() { if (overlay) { overlay.classList.remove('open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); } }
    return { open: open, close: close };
  })();

  /* ---- 1. Count-up (hero + cartes) : 0 -> valeur cible, easeOutExpo ---- */
  function countUp() {
    var els = document.querySelectorAll('[data-countup]');
    if (!els.length) return;
    var easeOutExpo = function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); };
    function run(el) {
      var target = parseInt(el.dataset.target, 10);
      if (isNaN(target)) return;
      var prefix = el.dataset.prefix || '';
      var duration = parseInt(el.dataset.dur, 10) || 2000;
      if (reduced) { el.textContent = prefix + target; return; }
      var start = null, done = false;
      function frame(now) {
        if (done) return;
        if (start === null) start = now;
        var p = Math.min((now - start) / duration, 1);
        el.textContent = prefix + Math.round(easeOutExpo(p) * target);
        if (p < 1) requestAnimationFrame(frame); else done = true;
      }
      requestAnimationFrame(frame);
      // filet de securite : si rAF est ralenti (onglet en arriere-plan), on fige la vraie valeur
      setTimeout(function () { if (!done) { done = true; el.textContent = prefix + target; } }, duration + 800);
    }
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---- 2. Constellation hero : un point par cas, pulsation douce, parallax ---- */
  function constellationCanvas() {
    var canvas = document.querySelector('.hero-constellation');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var hero = canvas.parentElement;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var baseColor = cssVar('--text-primary') || '#F5F1E8';
    var accent = cssVar('--accent-primary') || '#7C5CFF';
    var want = parseInt(canvas.dataset.dots, 10) || 120;
    var N = coarse ? Math.min(want, 80) : Math.min(want, 220);
    var W = 0, H = 0, dots = [], mouse = { x: -9999, y: -9999 }, scrollY = 0, raf = null;

    function hexToRgb(h) {
      h = h.replace('#', '');
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var baseRGB = hexToRgb(baseColor.charAt(0) === '#' ? baseColor : '#F5F1E8');
    var accRGB = hexToRgb(accent.charAt(0) === '#' ? accent : '#7C5CFF');

    function seed() {
      dots = [];
      var cols = Math.max(1, Math.round(Math.sqrt(N * (W / Math.max(H, 1)))));
      var rows = Math.max(1, Math.ceil(N / cols));
      var cw = W / cols, ch = H / rows, i = 0;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols && i < N; c++, i++) {
          // grille + jitter (poisson-disc simplifie)
          var jx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
          var jy = (Math.sin(i * 78.233) * 12543.123) % 1;
          dots.push({
            x: c * cw + (0.2 + Math.abs(jx) * 0.6) * cw,
            y: r * ch + (0.2 + Math.abs(jy) * 0.6) * ch,
            r: 1 + Math.abs(jx) * 1.2,
            period: 3000 + Math.abs(jy) * 3000,
            phase: Math.abs(jx) * 6283,
            signature: (i % 20 === 0) // ~5% en accent (les cas "signature")
          });
        }
      }
    }
    function resize() {
      var rect = hero.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      var py = Math.max(-20, -scrollY * 0.06); // parallax leger, max 20px
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var pulse = reduced ? 0.55 : (0.3 + 0.5 * (0.5 + 0.5 * Math.sin((now + d.phase) / d.period * 6.283)));
        var dx = mouse.x - d.x, dy = (mouse.y - py) - d.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var near = !coarse && dist < 80;
        var rgb = d.signature ? accRGB : baseRGB;
        var op = d.signature ? Math.min(1, pulse + 0.15) : pulse * 0.55;
        if (near) {
          ctx.strokeStyle = 'rgba(' + accRGB[0] + ',' + accRGB[1] + ',' + accRGB[2] + ',' + (0.25 * (1 - dist / 80)) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(d.x, d.y + py); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(d.x, d.y + py, d.r * (near ? 1.8 : 1), 0, 6.283);
        ctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + op + ')';
        ctx.fill();
      }
    }
    function loop(now) {
      if (document.hidden) { raf = null; return; }
      draw(now);
      raf = requestAnimationFrame(loop);
    }
    function start() { if (raf === null) raf = requestAnimationFrame(loop); }

    resize();
    if (reduced) { draw(0); }
    else {
      start();
      window.addEventListener('scroll', function () { scrollY = window.scrollY; }, { passive: true });
      document.addEventListener('mousemove', function (e) {
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
      }, { passive: true });
      document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
    }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 200); });
  }

  /* ---- 3. Matrice de couverture : focus mode, surlignage, breathe, cascade, angle mort ---- */
  function matrixInteractions() {
    var matrix = document.querySelector('.matrix');
    if (!matrix) return;
    var cells = [].slice.call(matrix.querySelectorAll('.cell'));

    // focus mode : au survol d'une case avec chiffre, les autres s'estompent
    cells.forEach(function (c) {
      if (c.classList.contains('filled')) {
        c.addEventListener('mouseenter', function () { matrix.classList.add('matrix--focused'); });
      }
    });
    matrix.addEventListener('mouseleave', function () { matrix.classList.remove('matrix--focused'); });

    // surlignage ligne / colonne au survol d'un header
    var headers = [].slice.call(matrix.querySelectorAll('.row-h[data-row], .col-h[data-col]'));
    headers.forEach(function (h) {
      var rk = h.getAttribute('data-row'), ck = h.getAttribute('data-col');
      var sel = rk ? '[data-row="' + rk + '"]' : '[data-col="' + ck + '"]';
      function set(on) {
        [].slice.call(matrix.querySelectorAll(sel)).forEach(function (el) { el.classList.toggle('rc-hi', on); });
        h.classList.toggle('rc-hi', on);
      }
      h.addEventListener('mouseenter', function () { set(true); });
      h.addEventListener('mouseleave', function () { set(false); });
    });

    // angle mort : ouvre un modal "opportunite"
    cells.forEach(function (c) {
      if (c.dataset.empty) {
        var open = function () {
          modal.open(c.dataset.cross || tr('Angle mort', 'Blind spot'),
            '<p>' + tr('Aucun cas prouve publiquement dans ce croisement. C\'est une fenetre : un pattern deploye ailleurs et absent ici.', 'No publicly proven case in this crossing. That is an opening: a pattern deployed elsewhere and absent here.') + '</p>');
        };
        c.addEventListener('click', open);
        c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      }
    });

    // apparition en cascade (stagger 30ms) ; jamais bloquant
    if (reduced || !('IntersectionObserver' in window)) return;
    matrix.classList.add('is-armed');
    var revealed = false;
    function revealAll() {
      if (revealed) return; revealed = true;
      cells.forEach(function (c, i) { setTimeout(function () { c.classList.add('in'); }, Math.min(i, 40) * 30); });
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { revealAll(); io.disconnect(); } });
    }, { threshold: 0.08 });
    io.observe(matrix);
    setTimeout(revealAll, 1600); // filet de securite : rien ne reste cache
  }

  /* ---- init ---- */
  function init() { countUp(); constellationCanvas(); matrixInteractions(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
