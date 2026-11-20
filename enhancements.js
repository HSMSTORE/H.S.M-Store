/* H.S.M Store — enhancements.js
   1) "Back to Collection" returns to the exact spot in the grid
   2) Hover (mouse) / press-and-hold (touch) zoom on the product photo
   3) "Go to Cart" button on the product page after adding an item
   Load it AFTER your main scripts, right before </body>. */
(function () {
  'use strict';

  var byId = function (id) { return document.getElementById(id); };
  var isVisible = function (id) {
    var el = byId(id);
    return !!el && getComputedStyle(el).display !== 'none';
  };

  /* ---------- 3) Go to Cart button (product page) ---------- */
  var cartBtn = document.createElement('button');
  cartBtn.id = 'detailCartBtn';
  cartBtn.type = 'button';
  cartBtn.setAttribute('aria-label', 'Go to cart');
  cartBtn.innerHTML = '🛒 Go to Cart <span class="detail-cart-count">0</span>';
  document.body.appendChild(cartBtn);

  var cartQty = function () {
    var el = byId('cartCount');
    return el ? (parseInt(el.textContent, 10) || 0) : 0;
  };
  function showCartBtn() {
    cartBtn.querySelector('.detail-cart-count').textContent = cartQty();
    cartBtn.classList.remove('show');
    void cartBtn.offsetWidth; /* restart the entrance animation */
    cartBtn.classList.add('show');
  }
  function hideCartBtn() { cartBtn.classList.remove('show'); }
  cartBtn.addEventListener('click', function () { window.showCart(); });

  var _addToCart = window.addToCart;
  if (typeof _addToCart === 'function') {
    window.addToCart = function () {
      var before = cartQty();
      var result = _addToCart.apply(this, arguments);
      if (isVisible('detail-view') && cartQty() > before) showCartBtn();
      return result;
    };
  }

  /* ---------- 1) Remember scroll position ---------- */
  var savedY = 0;
  var _showDetail = window.showDetail;
  var _showCart = window.showCart;
  var _showGallery = window.showGallery;

  if (typeof _showDetail === 'function') {
    window.showDetail = function () {
      if (isVisible('gallery-view')) savedY = window.pageYOffset;
      hideCartBtn();
      return _showDetail.apply(this, arguments);
    };
  }
  if (typeof _showCart === 'function') {
    window.showCart = function () {
      if (isVisible('gallery-view')) savedY = window.pageYOffset;
      hideCartBtn();
      return _showCart.apply(this, arguments);
    };
  }
  if (typeof _showGallery === 'function') {
    window.showGallery = function () {
      var cameFromOtherView = !isVisible('gallery-view');
      var g = byId('gallery-view');
      hideCartBtn();
      if (cameFromOtherView && g) g.classList.add('restoring');
      var result = _showGallery.apply(this, arguments);
      if (cameFromOtherView) {
        window.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
        try { lastScrollY = savedY; } catch (e) {} /* keep the header visible */
        setTimeout(function () { if (g) g.classList.remove('restoring'); }, 800);
      }
      return result;
    };
  }

  /* ---------- 4) Order confirmed: "Unboxing" celebration + Back to Main Menu ---------- */
  (function celebration() {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Back to Main Menu = the very first page: top of the shop, search cleared, "All" category */
    function goHome() {
      if (typeof closePostOrderModal === 'function') closePostOrderModal();
      var s = byId('searchInput'); if (s) s.value = '';
      var allBtn = document.querySelector('.cat-btn');
      if (allBtn && typeof setCat === 'function') setCat('All', allBtn);
      else if (typeof render === 'function') render();
      savedY = 0;
      window.showGallery();
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      try { lastScrollY = 0; } catch (e) {}
    }
    var menuBtn = document.querySelector('#postOrderOverlay .post-order-actions .secondary-btn');
    if (menuBtn) {
      menuBtn.innerHTML = '🏠 Back to Main Menu';
      menuBtn.classList.add('main-menu-btn');
      menuBtn.removeAttribute('onclick');
      menuBtn.onclick = goHome;
    }

    /* ----- gold particle engine (canvas) ----- */
    var canvas = null, ctx = null, W = 0, H = 0, parts = [], raf = null, rainOn = false;
    var COLORS = ['#f3e6c4', '#d4af37', '#ffdf8a', '#b8860b', '#ffffff', '#f6c6cf', '#e8b4bc'];
    var SHAPES = ['dot', 'star', 'diamond', 'heart', 'star'];
    var pick = function (a) { return a[(Math.random() * a.length) | 0]; };

    function sizeCanvas() {
      if (!canvas) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function ensureCanvas() {
      if (canvas) return;
      canvas = document.createElement('canvas');
      canvas.id = 'celebCanvas';
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
      sizeCanvas();
      window.addEventListener('resize', sizeCanvas);
    }
    function burst(x, y, n, speed, gravity, life) {
      ensureCanvas();
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = speed * (0.35 + Math.random());
        parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - speed * 0.25, g: gravity, drag: 0.985,
          s: 4 + Math.random() * 8, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
          life: 0, max: life + Math.random() * 60, shape: pick(SHAPES), color: pick(COLORS), tw: Math.random() * 6.28 });
      }
      loop();
    }
    function rain(ms) {
      ensureCanvas();
      var end = performance.now() + ms;
      rainOn = true;
      (function drip() {
        if (performance.now() > end) { rainOn = false; return; }
        for (var i = 0; i < 2; i++) {
          parts.push({ x: Math.random() * W, y: -12, vx: (Math.random() - 0.5) * 1.4, vy: 1.5 + Math.random() * 2.5, g: 0.03, drag: 0.999,
            s: 3 + Math.random() * 5, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.25,
            life: 0, max: 260, shape: pick(SHAPES), color: pick(COLORS), tw: Math.random() * 6.28 });
        }
        loop();
        setTimeout(drip, 45);
      })();
    }
    function drawPart(p, alpha) {
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = alpha; ctx.fillStyle = p.color;
      var r = p.s;
      ctx.beginPath();
      if (p.shape === 'dot') { ctx.arc(0, 0, r * 0.45, 0, 6.2832); }
      else if (p.shape === 'star') {
        for (var i = 0; i < 8; i++) { var rr = i % 2 ? r * 0.28 : r, an = i * Math.PI / 4; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
      } else if (p.shape === 'diamond') {
        ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, 0);
      } else {
        ctx.moveTo(0, r * 0.35); ctx.bezierCurveTo(-r, -r * 0.3, -r * 0.5, -r, 0, -r * 0.45);
        ctx.bezierCurveTo(r * 0.5, -r, r, -r * 0.3, 0, r * 0.35);
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
    function loop() {
      if (raf) return;
      (function frame() {
        ctx.clearRect(0, 0, W, H);
        for (var i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          p.life++; p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
          var k = p.life / p.max;
          if (k >= 1 || p.y > H + 30) { parts.splice(i, 1); continue; }
          var alpha = (k < 0.08 ? k / 0.08 : (k > 0.7 ? (1 - k) / 0.3 : 1)) * (0.7 + 0.3 * Math.sin(p.life * 0.25 + p.tw));
          drawPart(p, Math.max(0, alpha));
        }
        if (parts.length || rainOn) { raf = requestAnimationFrame(frame); }
        else {
          raf = null;
          window.removeEventListener('resize', sizeCanvas);
          if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
          canvas = null; ctx = null;
        }
      })();
    }

    /* ----- the scene ----- */
    var timers = [];
    var later = function (ms, fn) { timers.push(setTimeout(fn, ms)); };
    var centerOf = function (el, dy) {
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 + (dy || 0) };
    };

    function build(orderId) {
      var ov = document.createElement('div');
      ov.id = 'orderCelebration';
      var i, h = '';
      for (i = 0; i < 14; i++) {
        var sz = 10 + Math.random() * 26;
        h += '<span class="cel-bokeh" style="left:' + (Math.random() * 100) + '%;width:' + sz + 'px;height:' + sz +
             'px;animation-duration:' + (6 + Math.random() * 6) + 's;animation-delay:' + (Math.random() * 5) + 's"></span>';
      }
      h += '<div class="cel-rays"></div><div class="cel-flash"></div><div class="cel-ring r1"></div><div class="cel-ring r2"></div>';
      var sparks = '';
      for (i = 0; i < 10; i++) {
        var a = (i / 10) * Math.PI * 2, d = 62 + (i % 3) * 22;
        sparks += '<i class="cel-spark" style="--x:' + Math.round(Math.cos(a) * d) + 'px;--y:' + Math.round(Math.sin(a) * d * 0.9) +
                  'px;--d:' + (i * 0.11).toFixed(2) + 's"></i>';
      }
      h += '<div class="cel-box">' +
             '<div class="cel-lid"></div>' +
             '<div class="cel-gem">' +
               '<svg viewBox="0 0 100 90" aria-hidden="true">' +
                 '<polygon points="20,10 40,10 30,35 0,35" fill="#fff8dc"/>' +
                 '<polygon points="40,10 60,10 70,35 30,35" fill="#ffffff"/>' +
                 '<polygon points="60,10 80,10 100,35 70,35" fill="#f3d98a"/>' +
                 '<polygon points="0,35 30,35 50,88" fill="#e8c765"/>' +
                 '<polygon points="30,35 70,35 50,88" fill="#fff1b8"/>' +
                 '<polygon points="70,35 100,35 50,88" fill="#d4af37"/>' +
                 '<polygon points="20,10 80,10 100,35 50,88 0,35" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.2" stroke-linejoin="round"/>' +
               '</svg>' + sparks +
             '</div>' +
             '<div class="cel-base"></div>' +
           '</div>';
      var word = 'Order Confirmed', letters = '';
      for (i = 0; i < word.length; i++) {
        letters += '<span style="--i:' + i + '">' + (word[i] === ' ' ? '&nbsp;' : word[i]) + '</span>';
      }
      var idText = orderId ? '<div class="cel-id">Order #' + String(orderId).replace('#', '') + '</div>' : '';
      h += '<div class="cel-text"><h2>' + letters + '</h2><p>Thank you for choosing H.S.M Store ✦</p>' + idText + '</div>';
      h += '<div class="cel-skip">Tap anywhere to continue</div>';
      ov.innerHTML = h;
      return ov;
    }

    function finish(ov) {
      timers.forEach(clearTimeout); timers = [];
      if (!ov.parentNode || ov.classList.contains('out')) return;
      ov.classList.add('out');
      var modal = document.querySelector('#postOrderOverlay .post-order-modal');
      if (modal) { modal.style.animation = 'none'; void modal.offsetWidth; modal.style.animation = 'popup .7s var(--ease) both'; }
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 850);
    }

    function play(orderId) {
      if (reduced) return;
      var old = byId('orderCelebration');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      timers.forEach(clearTimeout); timers = [];

      var ov = build(orderId);
      document.body.appendChild(ov);
      ov.addEventListener('click', function () { finish(ov); });

      var box = ov.querySelector('.cel-box'), gem = ov.querySelector('.cel-gem');
      later(1450, function () { var c = centerOf(box, -50); burst(c.x, c.y, 140, 11, 0.2, 120); });      /* lid pops open */
      later(2600, function () { var c = centerOf(gem); burst(c.x, c.y, 90, 9, 0.12, 130); });             /* gem reaches the top */
      later(3000, function () { burst(W ? W * 0.2 : 80, window.innerHeight * 0.34, 60, 8, 0.14, 110); }); /* little fireworks */
      later(3300, function () { burst(window.innerWidth * 0.8, window.innerHeight * 0.34, 60, 8, 0.14, 110); });
      later(2700, function () { rain(2800); });                                                          /* gold rain */
      later(5000, function () { finish(ov); });                                                          /* reveal the order box */
    }

    var _openPostOrder = window.openPostOrderModal;
    if (typeof _openPostOrder === 'function') {
      window.openPostOrderModal = function (orderId) {
        var result = _openPostOrder.apply(this, arguments);
        try { play(orderId); } catch (e) { console.error('Celebration failed:', e); }
        return result;
      };
    }
  })();

  /* ---------- 2) Hover / hold zoom on the product photo ---------- */
  var win = document.querySelector('.slide-window');
  if (!win) return;

  function setOrigin(x, y) {
    var r = win.getBoundingClientRect();
    var px = Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100));
    var py = Math.max(0, Math.min(100, ((y - r.top) / r.height) * 100));
    win.style.setProperty('--zx', px + '%');
    win.style.setProperty('--zy', py + '%');
  }

  /* zoom ONLY the slide that is currently showing (matters when a product has 2+ photos) */
  function pickTarget() {
    var imgs = win.querySelectorAll('.slide-track img');
    var dots = document.querySelectorAll('#dots .dot');
    var idx = 0;
    for (var i = 0; i < dots.length; i++) {
      if (dots[i].classList.contains('active')) { idx = i; break; }
    }
    for (var j = 0; j < imgs.length; j++) imgs[j].classList.toggle('zoom-target', j === idx);
  }
  function zoomOn() {
    pickTarget();
    win.classList.add('is-zoomed');
    win.classList.add('hint-done'); /* hide the little hint after first use */
  }
  function zoomOff() { win.classList.remove('is-zoomed'); }

  /* mouse */
  win.addEventListener('pointerenter', function (e) {
    if (e.pointerType !== 'mouse') return;
    setOrigin(e.clientX, e.clientY); zoomOn();
  });
  win.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    setOrigin(e.clientX, e.clientY);
  });
  win.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') zoomOff();
  });

  /* touch: hold ~0.2s to zoom, slide finger to explore, release to settle back */
  var timer = null, held = false, sx = 0, sy = 0;
  win.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    sx = t.clientX; sy = t.clientY; held = false;
    setOrigin(sx, sy);
    clearTimeout(timer);
    timer = setTimeout(function () { held = true; zoomOn(); }, 200);
  }, { passive: true });

  win.addEventListener('touchmove', function (e) {
    var t = e.touches[0];
    if (held) {
      e.preventDefault(); /* explore the photo instead of scrolling the page */
      setOrigin(t.clientX, t.clientY);
    } else if (Math.hypot(t.clientX - sx, t.clientY - sy) > 10) {
      clearTimeout(timer); /* they're scrolling, not holding */
    }
  }, { passive: false });

  function endTouch() { clearTimeout(timer); held = false; zoomOff(); }
  win.addEventListener('touchend', endTouch);
  win.addEventListener('touchcancel', endTouch);
  win.addEventListener('contextmenu', function (e) { e.preventDefault(); });
})();
