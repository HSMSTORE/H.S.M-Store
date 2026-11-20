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
