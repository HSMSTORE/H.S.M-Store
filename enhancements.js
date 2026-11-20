/* H.S.M Store — enhancements.js
   1) "Back to Collection" returns to the exact spot in the grid
   2) Hover (mouse) / press-and-hold (touch) zoom on the product photo
   Load it AFTER your main scripts, right before </body>. */
(function () {
  'use strict';

  /* ---------- 1) Remember scroll position ---------- */
  var savedY = 0;
  var gallery = function () { return document.getElementById('gallery-view'); };
  var galleryVisible = function () {
    var g = gallery();
    return !!g && getComputedStyle(g).display !== 'none';
  };

  var _showDetail = window.showDetail;
  var _showCart = window.showCart;
  var _showGallery = window.showGallery;

  if (typeof _showDetail === 'function') {
    window.showDetail = function () {
      if (galleryVisible()) savedY = window.pageYOffset;
      return _showDetail.apply(this, arguments);
    };
  }
  if (typeof _showCart === 'function') {
    window.showCart = function () {
      if (galleryVisible()) savedY = window.pageYOffset;
      return _showCart.apply(this, arguments);
    };
  }
  if (typeof _showGallery === 'function') {
    window.showGallery = function () {
      var cameFromOtherView = !galleryVisible();
      var g = gallery();
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
  function zoomOn() { win.classList.add('is-zoomed'); }
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
