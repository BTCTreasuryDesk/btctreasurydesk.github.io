/* /long-term-chart/: hosts the shared long-term price chart (price.js) full-width with its own period tabs. Default All, BTC-USD log scale. */
(function () {
  'use strict';
  var PERS = ['1Y', '2Y', '4Y', 'All'], rng = 'All';
  function fromT(endT) { var e = new Date(endT), y = e.getUTCFullYear(), m = e.getUTCMonth(), d = e.getUTCDate(); return rng === '1Y' ? Date.UTC(y - 1, m, d) : rng === '4Y' ? Date.UTC(y - 4, m, d) : rng === '2Y' ? Date.UTC(y - 2, m, d) : Date.UTC(2015, 6, 20); }
  function seg() { return '<span class="seg" role="group" aria-label="Period">' + PERS.map(function (k) { return '<button type="button" data-lt-rng="' + k + '" aria-pressed="' + (k === rng) + '"' + (k === rng ? ' class="on"' : '') + '>' + k + '</button>'; }).join('') + '</span>'; }
  function go() {
    var box = document.querySelector('[data-lt]'), foot = document.querySelector('[data-lt-f]'); if (!box) return;
    if (!window.BTDPrice) { box.innerHTML = '<p class="muted">Chart unavailable. Please reload.</p>'; return; }
    function draw() { window.BTDPrice.render(box, foot, { per: rng, from: fromT, seg: seg() }); }
    box.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-lt-rng]'); if (!b) return; rng = b.getAttribute('data-lt-rng'); draw(); });
    draw();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
