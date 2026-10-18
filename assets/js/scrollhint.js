/* BTC Treasury Desk: phone scroll affordance for every horizontal scroller.
   Right-edge fade + small chevron (hidden at the end), left fade once scrolled, and a one-time gentle nudge
   on the first visible scroller (localStorage btd_nudge; skipped with prefers-reduced-motion). No layout changes. */
(function () {
  'use strict';
  var MQ = window.matchMedia ? window.matchMedia('(max-width: 899px)') : { matches: false }, RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var seen = typeof WeakSet === 'function' ? new WeakSet() : null, list = [];
  function isScroller(el) { if (el === document.body || el === document.documentElement || /^(TEXTAREA|INPUT|SELECT|CANVAS)$/.test(el.tagName)) return false; var ox = getComputedStyle(el).overflowX; return (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 6 && el.clientWidth > 120; }
  function upd(o) { var el = o.el, max = el.scrollWidth - el.clientWidth, x = el.scrollLeft, L = x > 4, R = x < max - 4, vis = el.offsetParent !== null && max > 6;
    el.classList.toggle('hsc-l', vis && L); el.classList.toggle('hsc-r', vis && R);
    var c = o.ch, p = el.parentNode; if (!c || !p) return; c.hidden = !(vis && R); if (c.hidden) return;
    c.style.top = (el.offsetTop + el.offsetHeight / 2 - 20) + 'px'; c.style.left = (el.offsetLeft + el.offsetWidth - 30) + 'px'; }
  function add(el) { if (seen ? seen.has(el) : el._sh) return; if (seen) seen.add(el); else el._sh = 1; el.classList.add('hsc');
    var p = el.parentNode, ch = document.createElement('button'); ch.type = 'button'; ch.className = 'hsc-ch'; ch.setAttribute('aria-label', 'Scroll right for more'); ch.textContent = '\u203a';
    if (p && getComputedStyle(p).position === 'static') p.classList.add('hsc-p'); if (p) p.insertBefore(ch, el.nextSibling);
    ch.addEventListener('click', function () { el.scrollBy({ left: Math.round(el.clientWidth * 0.7), behavior: RM.matches ? 'auto' : 'smooth' }); });
    var o = { el: el, ch: ch }; list.push(o); el.addEventListener('scroll', function () { upd(o); }, { passive: true }); upd(o); }
  function nudge() { var k = 'btd_nudge'; try { if (localStorage.getItem(k)) return; } catch (e) { return; } if (RM.matches) { try { localStorage.setItem(k, '1'); } catch (e) {} return; }
    var t = list.filter(function (o) { var r = o.el.getBoundingClientRect(); return o.el.classList.contains('hsc-r') && r.top >= 0 && r.bottom <= innerHeight; })[0]; if (!t) return;
    try { localStorage.setItem(k, '1'); } catch (e) {} var el = t.el; setTimeout(function () { el.scrollBy({ left: 56, behavior: 'smooth' }); setTimeout(function () { el.scrollBy({ left: -56, behavior: 'smooth' }); }, 650); }, 400); }
  var nT = null;
  function scan() { if (!MQ.matches) { list.forEach(function (o) { o.el.classList.remove('hsc-l', 'hsc-r'); if (o.ch) o.ch.hidden = true; }); return; }
    var all = document.querySelectorAll('body *'); for (var i = 0; i < all.length; i++) { var el = all[i]; if (el.classList.contains('hsc') || isScroller(el)) { if (!el.classList.contains('hsc')) add(el); } }
    list.forEach(upd); if (!nT) nT = setTimeout(nudge, 1200); }
  var sT = null; function soon() { clearTimeout(sT); sT = setTimeout(scan, 300); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', soon); else soon();
  window.addEventListener('load', soon); window.addEventListener('resize', soon); setTimeout(scan, 4000); setTimeout(scan, 10000);
  var mT = null; if (window.MutationObserver) new MutationObserver(function () { if (mT) return; mT = setTimeout(function () { mT = null; scan(); }, 1500); }).observe(document.body || document.documentElement, { childList: true, subtree: true });
})();
/* Grid filler: in any tile grid (phone and desktop), the last orphan tile spans the remaining columns, so odd counts
   (including after user customization or hidden tiles) never leave a hole. */
(function () {
  'use strict';
  function cols(g) { var t = getComputedStyle(g).gridTemplateColumns; return t && t !== 'none' ? t.split(' ').filter(function (x) { return x && x !== '0px'; }).length : 1; }
  function vis(e) { return !e.hidden && getComputedStyle(e).display !== 'none'; }
  function fill() {
    var gs = document.querySelectorAll('main *'); for (var i = 0; i < gs.length; i++) { var g = gs[i]; if (g.children.length < 3) continue; var cs = getComputedStyle(g); if (cs.display !== 'grid' || g.closest('canvas')) continue;
      var kids = []; for (var j = 0; j < g.children.length; j++) { var k = g.children[j]; if (k.hasAttribute('data-gf')) { k.style.gridColumn = ''; k.removeAttribute('data-gf'); } if (vis(k)) kids.push(k); }
      if (kids.length < 2) continue; var c0 = kids[0].className.split(' ')[0]; if (!c0 || !kids.every(function (k) { return k.className.split(' ')[0] === c0; })) continue; /* tile grids only */
      if (kids.some(function (k) { return /span|-1/.test(k.style.gridColumn || '') || getComputedStyle(k).gridColumnEnd !== 'auto'; })) continue;
      var n = cols(g); if (n < 2) continue; var r = kids.length % n; if (!r) continue; var last = kids[kids.length - 1]; last.style.gridColumn = 'span ' + (n - r + 1); last.setAttribute('data-gf', '1'); } }
  var T = null; function soon() { if (T) return; T = setTimeout(function () { T = null; fill(); }, 600); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', soon); else soon();
  window.addEventListener('load', soon); window.addEventListener('resize', soon); setInterval(function () { if (!document.hidden) fill(); }, 3000);
  if (window.MutationObserver) new MutationObserver(function (m) { if (m.some(function (x) { return x.type === 'childList' && x.target.children && x.target.children.length > 1 || x.attributeName === 'hidden'; })) soon(); }).observe(document.body || document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
})();
