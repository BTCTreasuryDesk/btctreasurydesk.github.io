/* Key dates panel: FOMC, CPI, jobs (official Fed / BLS calendars) and Strategy preferred dividend dates (strategy.com), from assets/data/keydates.json (weekly).
   Countdown to each; phone shows the next 3 with Show all, desktop shows the next 8. Education only. */
(function () {
  'use strict';
  var box = document.querySelector('[data-kd]'); if (!box) return;
  var D = null, open = false;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function at(e) { var m = /(\d+):(\d+) ([AP]M)/.exec(e.time || ''), h = m ? (+m[1] % 12) + (m[3] === 'PM' ? 12 : 0) : 0, mi = m ? +m[2] : 0;
    var g = new Date(e.date + 'T12:00:00Z');
    var et = Date.UTC(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate(), h, mi); var p = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(g).forEach(function (x) { p[x.type] = x.value; });
    var o = /GMT([+-]\d+)/.exec(p.timeZoneName || ''), oh = o ? +o[1] : -4; return et - oh * 36e5; }
  function cd(t) { var s = Math.round((t - Date.now()) / 1e3); if (s <= 0) return 'today'; var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? 'in ' + d + 'd ' + h + 'h' : 'in ' + h + 'h ' + m + 'm'; }
  function paint() { if (!D) return; var now = Date.now(), wide = window.matchMedia('(min-width:900px)').matches;
    var it = D.items.filter(function (e) { return at(e) + (e.time ? 36e5 : 864e5) > now; }), n = wide ? 8 : open ? 12 : 3;
    box.innerHTML = '<div class="p-h"><span class="p-t">Key dates</span><span class="kd-sub">Fed, inflation, jobs and Strategy preferred dividends</span></div><ol class="kd-l">' + it.slice(0, n).map(function (e) { var t = at(e);
      return '<li class="kd-' + e.kind + '"><span class="kd-d"><b>' + new Date(e.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) + '</b>' + (e.time ? '<small>' + esc(e.time) + '</small>' : '') + '</span><span class="kd-t"><b>' + esc(e.title) + '</b><small>' + esc(e.detail || '') + '</small></span><span class="kd-c">' + cd(t) + '<a href="' + esc(e.url) + '" target="_blank" rel="noopener" title="Source: ' + esc(e.source) + '">' + esc(e.source) + ' \u2197</a></span></li>'; }).join('') + '</ol>' +
      (!wide && it.length > 3 ? '<button type="button" class="chip kd-more" data-kd-more aria-expanded="' + open + '">' + (open ? 'Show fewer' : 'Show all ' + Math.min(12, it.length)) + '</button>' : '') +
      '<p class="p-f">Official calendars only: Federal Reserve, BLS and strategy.com (as of ' + esc(D.as_of) + '). Strategy\u2019s next earnings date appears once Strategy announces it. Education only.</p>'; }
  box.addEventListener('click', function (e) { if (e.target.closest('[data-kd-more]')) { open = !open; paint(); } });
  fetch('/assets/data/keydates.json?v=' + Math.floor(Date.now() / 36e5)).then(function (r) { return r.json(); }).then(function (j) { D = j; paint(); }).catch(function () { box.hidden = true; });
  setInterval(paint, 6e4); window.addEventListener('resize', function () { clearTimeout(paint.t); paint.t = setTimeout(paint, 200); });
})();
