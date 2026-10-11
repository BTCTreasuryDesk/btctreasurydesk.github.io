/* BTC Treasury Desk: standalone Model Zones panel for pages without the live desk script.
   Same math as /assets/js/desk.js. Reads /assets/data/btc_daily.json and desk.json, plus a live BTC price. */
(function () {
  'use strict';
  var root = document.querySelector('[data-mz-standalone]'); if (!root) return;
  var q = function (s) { return root.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var GEN = Date.UTC(2009, 0, 3);
  var HALV = [[Date.UTC(2012, 10, 28), 10.5e6, 25], [Date.UTC(2016, 6, 9), 15.75e6, 12.5], [Date.UTC(2020, 4, 11), 18.375e6, 6.25], [Date.UTC(2024, 3, 20), 19.6875e6, 3.125]];
  function s2f(t) { var h = HALV[0]; for (var i = 0; i < HALV.length; i++) if (t >= HALV[i][0]) h = HALV[i];
    var supply = h[1] + (t - h[0]) / 864e5 * 144 * h[2], flow = 144 * 365 * h[2]; return Math.exp(-1.84) * Math.pow(supply / flow, 3.36); }
  function plaw(t) { return 1.0117e-17 * Math.pow((t - GEN) / 864e5, 5.82); }
  function pctile(arr, v) { var c = 0, n = 0; arr.forEach(function (x) { if (x != null && isFinite(x)) { n++; if (x <= v) c++; } }); return n ? 100 * c / n : null; }
  function json(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function livePx() {
    return json('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd').then(function (p) { return p.bitcoin.usd; })
      .catch(function () { return json('https://api.coinbase.com/v2/prices/BTC-USD/spot').then(function (j) { return +j.data.amount; }); })
      .catch(function () { return null; });
  }
  Promise.all([json('/assets/data/btc_daily.json'), json('/assets/data/desk.json').catch(function () { return null; }), livePx()]).then(function (r) {
    var H = r[0], D = r[1], live = r[2], t0 = Date.parse(H.start + 'T00:00:00Z'), c = H.closes.slice();
    var today = Date.parse(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) + 'T00:00:00Z');
    if (live) { if (today > t0 + (c.length - 1) * 864e5) c.push(live); else c[c.length - 1] = live; }
    var n = c.length, last = n - 1, px = c[last], T = function (i) { return t0 + i * 864e5; };
    var pre = [0]; for (var i = 0; i < n; i++) pre.push(pre[i] + c[i]);
    var sma = function (k, e) { return e + 1 < k ? null : (pre[e + 1] - pre[e + 1 - k]) / k; };
    var rPl = [], rWma = [], rMay = [], rS2f = [];
    for (i = 0; i < n; i++) {
      rPl.push(c[i] / plaw(T(i))); rS2f.push(c[i] / s2f(T(i)));
      var m = sma(200, i); rMay.push(m ? c[i] / m : null);
      if (i >= 1399) { var s = 0; for (var k = 0; k < 200; k++) s += c[i - k * 7]; rWma.push(c[i] / (s / 200)); } else rWma.push(null);
    }
    var pi = sma(111, last) / (2 * sma(350, last)), realized = D && D.onchain ? D.onchain.realized_price : null, mvrv = realized ? px / realized : null;
    var zc = function (p) { return p == null ? null : p < 20 ? -1 : p > 80 ? 1 : 0; };
    var mz = [
      ['Power Law', zc(pctile(rPl, rPl[last])), rPl[last].toFixed(2) + 'x trend'],
      ['200-week MA', zc(pctile(rWma, rWma[last])), rWma[last].toFixed(2) + 'x'],
      ['Mayer Multiple', zc(pctile(rMay, rMay[last])), rMay[last].toFixed(2) + 'x'],
      ['Pi Cycle', pi > 0.9 ? 1 : 0, (pi >= 1 ? 'crossed' : pi > 0.9 ? 'nearing cross' : 'no cross') + ' · ' + (pi * 100).toFixed(0) + '%'],
      ['MVRV', mvrv == null ? null : mvrv < 1 ? -1 : mvrv > 3 ? 1 : 0, mvrv ? mvrv.toFixed(2) + 'x' : 'n/a'],
      ['Stock-to-Flow', zc(pctile(rS2f, rS2f[last])), rS2f[last].toFixed(2) + 'x model']
    ];
    var ZL = { '-1': ['Historically cool', 'z-cool'], '0': ['Mid-range', 'z-neu'], '1': ['Historically hot', 'z-hot'] };
    var got = mz.filter(function (m) { return m[1] != null; }), sc = got.reduce(function (a, m) { return a + m[1]; }, 0) / (got.length || 1);
    var ov = sc <= -0.34 ? '-1' : sc >= 0.34 ? '1' : '0', cnt = { '-1': 0, '0': 0, '1': 0 }; got.forEach(function (m) { cnt[m[1]]++; });
    var o = q('[data-mz-overall]'); o.textContent = ZL[ov][0]; o.className = 'mz-v ' + ZL[ov][1];
    q('[data-mz-sub]').textContent = cnt['-1'] + ' cool · ' + cnt['0'] + ' mid · ' + cnt['1'] + ' hot of ' + got.length + ' models · BTC $' + Math.round(px).toLocaleString('en-US');
    q('[data-mz-dot]').style.left = Math.round((sc + 1) * 50) + '%';
    q('[data-mz-list]').innerHTML = mz.map(function (m) {
      var z = m[1] == null ? ['No data', 'z-na'] : ZL[String(m[1])];
      return '<li><span>' + esc(m[0]) + '</span><small class="mono">' + esc(m[2]) + '</small><span class="zone ' + z[1] + '">' + z[0] + '</span></li>';
    }).join('');
  }).catch(function (e) { var o = q('[data-mz-overall]'); if (o) o.textContent = 'Unavailable right now'; console.warn('model zones unavailable', e); });
})();
