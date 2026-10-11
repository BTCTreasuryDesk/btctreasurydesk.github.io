/* Members tools: Signal Zones, Model Builder, Cycle Clock */
(function () {
  'use strict';
  var M_ = window.MEM, B = window.BTDModels, $ = M_.$, esc = M_.esc, usd = M_.usd, pct = M_.pct;

  /* ---------- 1. Signal Zones ---------- */
  M_.tools.zones = { draw: function () {
    var M = M_.M, S = M.S, ep = M_.ep, L = M.last, comp = M_.comp, z = B.band(comp[L]), ZL = B.ZL;
    var mk = ep.ev.map(function (e) { return { i: e.i, v: S.c[e.i], col: e.z < 0 ? '#2fd17c' : '#ff5a5f', up: e.z < 0, hollow: e.t === 'out' }; });
    M_.chart($('[data-z-cv]'), { t: M_.T, log: true, ratio: 0.4, bands: ep.zone, series: [{ a: S.c, col: '#e6e9ee', w: 1.2 }, { a: S.pl, col: '#F7931A', w: 1, dash: [4, 3], noScale: true }, { a: S.wma, col: '#7aa7ff', w: 1.2 }], markers: mk,
      tip: $('[data-z-tip]'), tipFn: function (i) { var b = B.band(comp[i]); return M_.dlbl(M_.T[i]) + ' · ' + usd(S.c[i]) + '<br>score ' + (comp[i] == null ? '—' : comp[i].toFixed(2) + ' · ' + ZL[b][0]); } });
    $('[data-z-read]').innerHTML = 'Today: <b class="' + ZL[z][1] + '" style="border:0">' + ZL[z][0] + '</b> (' + comp[L].toFixed(2) + ')';
    var cool = ep.ev.filter(function (e) { return e.z < 0 && e.t === 'in'; }), hot = ep.ev.filter(function (e) { return e.z > 0 && e.t === 'in'; });
    var lastIn = function (a) { return a.length ? M_.dlbl(M_.T[a[a.length - 1].i]) : '—'; }, days = { '-1': 0, '1': 0 }, tot = 0;
    ep.zone.forEach(function (x) { if (x == null) return; tot++; if (x) days[x]++; });
    $('[data-z-stats]').innerHTML = [['Score today', comp[L].toFixed(2) + ' <small class="muted">-1 cool · +1 hot</small>'], ['Zone', ZL[z][0] + ' <small class="muted">' + ZL[z][2] + '</small>'],
      ['Last entered cool', lastIn(cool)], ['Last entered hot', lastIn(hot)], ['Time in cool / hot', Math.round(100 * days['-1'] / tot) + '% / ' + Math.round(100 * days['1'] / tot) + '%']]
      .map(function (s) { return '<div><small>' + s[0] + '</small><b>' + s[1] + '</b></div>'; }).join('');
  } };

  /* ---------- 2. Model Builder ---------- */
  var PRESETS = { 'Desk default': { pl: 1, wma: 1, may: 1, mvrv: 1, pi: 1, s2f: 0 }, 'Valuation only': { pl: 1, wma: 0.5, may: 0, mvrv: 1, pi: 0, s2f: 0.5 },
    'Trend watcher': { pl: 0, wma: 1, may: 1, mvrv: 0, pi: 0.5, s2f: 0 }, 'Cycle-top watch': { pl: 0.5, wma: 0, may: 0.5, mvrv: 1, pi: 1, s2f: 0 } };
  var KEY = 'btd_mem_builder', st = M_.LS.get(KEY, { w: PRESETS['Desk default'], saved: {} });
  function rows() {
    $('[data-b-rows]').innerHTML = B.MODELS.map(function (m) { var w = st.w[m.k] || 0;
      return '<div class="wrow"><input type="checkbox" data-bk="' + m.k + '"' + (w > 0 ? ' checked' : '') + ' aria-label="Include ' + esc(m.n) + '"><span>' + esc(m.n) + '<small>' + esc(m.d) + '</small></span><input type="range" min="0" max="2" step="0.25" value="' + w + '" data-bw="' + m.k + '" aria-label="Weight for ' + esc(m.n) + '"><b data-bv="' + m.k + '">' + w.toFixed(2) + '</b></div>'; }).join('');
    $('[data-b-presets]').innerHTML = Object.keys(PRESETS).map(function (p) { return '<button type="button" class="chip" data-bp="' + esc(p) + '">' + esc(p) + '</button>'; }).join('');
    $('[data-b-saved]').innerHTML = Object.keys(st.saved).map(function (p) { return '<button type="button" class="chip" data-bs="' + esc(p) + '">' + esc(p) + '<span class="x" data-bdel="' + esc(p) + '" title="Delete">×</span></button>'; }).join('');
  }
  var drawB;
  M_.tools.builder = { init: function () {
    rows(); var root = $('[data-pane="builder"]');
    root.addEventListener('input', function (e) { var k = e.target.dataset.bw; if (k) { st.w[k] = +e.target.value; $('[data-bv="' + k + '"]').textContent = (+e.target.value).toFixed(2); $('[data-bk="' + k + '"]').checked = +e.target.value > 0; drawB(); } });
    root.addEventListener('change', function (e) { var k = e.target.dataset.bk; if (k) { st.w[k] = e.target.checked ? (st.w[k] || 1) : 0; rows(); drawB(); } });
    root.addEventListener('click', function (e) { var t = e.target;
      if (t.dataset.bdel) { delete st.saved[t.dataset.bdel]; M_.LS.set(KEY, st); rows(); e.stopPropagation(); return; }
      var b = t.closest('[data-bp],[data-bs]'); if (b) { st.w = Object.assign({}, b.dataset.bp ? PRESETS[b.dataset.bp] : st.saved[b.dataset.bs]); rows(); drawB(); }
      if (t.hasAttribute('data-b-save')) { var nm = ($('[data-b-name]').value || '').trim() || 'My composite ' + (Object.keys(st.saved).length + 1); st.saved[nm] = Object.assign({}, st.w); M_.LS.set(KEY, st); rows(); }
    });
  }, draw: function () { drawB(); } };
  drawB = function () {
    var M = M_.M, L = M.last, sc = B.composite(M, st.w), ZL = B.ZL; M_.LS.set(KEY, st);
    var v = sc[L], z = B.band(v);
    if (v == null) { $('[data-b-read]').textContent = 'Pick at least one model'; return; }
    $('[data-b-read]').innerHTML = '<span class="' + ZL[z][1] + '" style="border:0">' + ZL[z][0] + '</span> <span class="muted" style="font-size:14px">' + v.toFixed(2) + '</span><small>' + ZL[z][2] + ' · -1 = historically cool, +1 = historically hot</small>';
    $('[data-b-dot]').style.left = Math.round((v + 1) * 50) + '%'; $('[data-b-asof]').textContent = 'BTC ' + usd(M.px);
    M_.chart($('[data-b-cv]'), { t: M_.T, ratio: 0.3, ymin: -1, ymax: 1, bands: sc.map(B.band), series: [{ a: sc, col: '#F7931A', w: 1.3 }],
      hlines: [{ v: B.CUT, col: '#ff5a5f88' }, { v: -B.CUT, col: '#2fd17c88' }], yfmt: function (x) { return x.toFixed(1); }, padL: 34,
      tip: $('[data-b-tip]'), tipFn: function (i) { return M_.dlbl(M_.T[i]) + ' · score ' + (sc[i] == null ? '—' : sc[i].toFixed(2)) + '<br>BTC ' + usd(M.S.c[i]); } });
    var by = { '-1': [], '0': [], '1': [] }, first = null;
    for (var i = 0; i + 365 <= L; i++) { var b = B.band(sc[i]); if (b == null) continue; if (first == null) first = i; by[b].push(M.S.c[i + 365] / M.S.c[i] * 100 - 100); }
    $('[data-b-study] tbody').innerHTML = ['-1', '0', '1'].map(function (k) { var a = by[k].slice().sort(function (x, y) { return x - y; }), n = a.length;
      if (!n) return '<tr><td>' + ZL[k][0] + '</td><td class="r">0</td><td class="r" colspan="3">no days in this band</td></tr>';
      var avg = a.reduce(function (s, x) { return s + x; }, 0) / n, med = a[Math.floor(n / 2)], pos = a.filter(function (x) { return x > 0; }).length / n * 100;
      return '<tr><td><span class="zone ' + ZL[k][1] + '">' + ZL[k][0] + '</span></td><td class="r">' + n + '</td><td class="r ' + (avg >= 0 ? 'up' : 'dn') + '">' + pct(avg, 0) + '</td><td class="r">' + pct(med, 0) + '</td><td class="r">' + pos.toFixed(0) + '%</td></tr>'; }).join('');
    var pf = $('[data-pane="builder"] .p-f'); if (pf && first != null) pf.textContent = 'Past performance, not a forecast. Overlapping 1-year windows from ' + M_.dlbl(M_.T[first]) + ' on, so days are not independent and one cycle can dominate a band.';
  };

  /* ---------- 8. Cycle Clock ---------- */
  var height = null;
  M_.tools.clock = { init: function () {
    fetch('https://mempool.space/api/blocks/tip/height').then(function (r) { return r.ok ? r.text() : null; }).then(function (h) { if (h && +h > 860000) { height = +h; if ($('[data-pane="clock"]').classList.contains('on')) M_.tools.clock.draw(); } }).catch(function () {});
  }, draw: function () {
    var M = M_.M, v = M_.comp[M.last], ZL = B.ZL, z = B.band(v), DAY = M_.DAY;
    var cv = $('[data-c-dial]'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 400, H = Math.round(W * 0.58);
    cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cx = W / 2, cy = H * 0.86, r = Math.min(W * 0.42, H * 0.78);
    for (var k = 0; k < 60; k++) { var a0 = Math.PI + Math.PI * k / 60, a1 = Math.PI + Math.PI * (k + 1) / 60, f = k / 59;
      var col = f < 0.5 ? 'rgb(' + Math.round(47 + (201 - 47) * f * 2) + ',' + Math.round(209 + (206 - 209) * f * 2) + ',' + Math.round(124 + (214 - 124) * f * 2) + ')' : 'rgb(' + Math.round(201 + (255 - 201) * (f - .5) * 2) + ',' + Math.round(206 - (206 - 90) * (f - .5) * 2) + ',' + Math.round(214 - (214 - 95) * (f - .5) * 2) + ')';
      g.strokeStyle = col; g.lineWidth = r * 0.12; g.beginPath(); g.arc(cx, cy, r, a0, a1 + 0.004); g.stroke(); }
    g.fillStyle = '#7d8794'; g.font = '600 10px ui-monospace,monospace'; g.textAlign = 'center';
    g.fillText('COOL', cx - r * 0.95, cy + 16); g.fillText('MID', cx, cy - r - r * 0.12); g.fillText('HOT', cx + r * 0.95, cy + 16);
    var ang = Math.PI + Math.PI * (v + 1) / 2; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * r * 0.82, cy + Math.sin(ang) * r * 0.82); g.stroke();
    g.fillStyle = '#F7931A'; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = '700 ' + Math.round(r * 0.13) + 'px ui-monospace,monospace'; g.fillText(ZL[z][0], cx, cy - r * 0.32);
    g.fillStyle = '#7d8794'; g.font = '600 11px ui-monospace,monospace'; g.fillText('composite ' + v.toFixed(2) + ' · ' + ZL[z][2], cx, cy - r * 0.32 + 18);
    $('[data-c-asof]').textContent = 'BTC ' + usd(M.px);
    // halving ring
    var hv = Date.UTC(2024, 3, 20), now = Date.now(), est;
    if (height) est = now + (1050000 - height) * 600e3; else est = hv + 210000 * 600e3;
    var prog = Math.max(0, Math.min(1, (now - hv) / (est - hv)));
    var c2 = $('[data-c-halv]'), W2 = c2.clientWidth || 400, H2 = Math.round(Math.min(W2 * 0.58, 260));
    c2.style.height = H2 + 'px'; c2.width = W2 * dpr; c2.height = H2 * dpr; var h = c2.getContext('2d'); h.setTransform(dpr, 0, 0, dpr, 0, 0);
    var x2 = W2 / 2, y2 = H2 / 2, r2 = H2 * 0.38; h.lineWidth = r2 * 0.16; h.strokeStyle = '#1e232b'; h.beginPath(); h.arc(x2, y2, r2, 0, 7); h.stroke();
    h.strokeStyle = '#F7931A'; h.beginPath(); h.arc(x2, y2, r2, -Math.PI / 2, -Math.PI / 2 + prog * 2 * Math.PI); h.stroke();
    h.fillStyle = '#fff'; h.textAlign = 'center'; h.font = '700 ' + Math.round(r2 * 0.4) + 'px ui-monospace,monospace'; h.fillText(Math.round(prog * 100) + '%', x2, y2 + r2 * 0.1);
    h.fillStyle = '#7d8794'; h.font = '600 10px ui-monospace,monospace'; h.fillText('of this halving cycle', x2, y2 + r2 * 0.1 + 16);
    var dSince = Math.floor((now - hv) / DAY), dTo = Math.max(0, Math.ceil((est - now) / DAY));
    $('[data-c-height]').textContent = height ? 'block ' + height.toLocaleString('en-US') : 'block height: estimated';
    $('[data-c-stats]').innerHTML = [['Since Apr 20, 2024 halving', dSince + ' days'], ['Next halving (est.)', new Date(est).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) + ' · ~' + dTo + ' days'],
      ['Block subsidy', '3.125 → 1.5625 BTC']].map(function (s) { return '<div><small>' + s[0] + '</small><b>' + s[1] + '</b></div>'; }).join('');
  } };
})();
