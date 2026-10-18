/* BTC Treasury Desk: Analyst Views (Strategy page) + Sentiment gauges (Strategy page full set; home Quick glance shows 2).
   Data: assets/data/analysts.json (weekly; consensus from Nasdaq.com, per-firm actions from MarketBeat, curated notes with links),
   members/data/stocks_daily.json (closes), OKX public funding-rate history (live, CORS). Third-party views, not ours. Education only. */
(function () {
  'use strict';
  var $ = function (q, r) { return (r || document).querySelector(q); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function money(v) { return v == null ? '—' : '$' + (v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(2)); }
  function dl(d) { return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  /* ---- Street Sentiment: 60% ratings mix (buy=1, hold=0.5, sell=0) + 40% average-target upside (−50%..+100% mapped to 0..100) ---- */
  function street(buy, hold, sell, pt, px) { var n = buy + hold + sell; if (!n || !pt || !px) return null; var mix = (buy + hold * 0.5) / n * 100, up = (pt / px - 1) * 100, upS = Math.max(0, Math.min(100, (up + 50) / 150 * 100));
    var sc = Math.round(mix * 0.6 + upS * 0.4); return { score: sc, mix: mix, up: up, word: sc >= 65 ? 'Bullish' : sc >= 40 ? 'Mixed' : 'Bearish' }; }
  var STREET_METHOD = 'Street Sentiment (0–100) = 60% ratings mix + 40% target upside. Ratings mix = (buy + ½·hold) ÷ analysts. Upside = average 12-month target ÷ price − 1, mapped from −50%…+100% to 0…100. 65+ Bullish, 40–64 Mixed, under 40 Bearish. Describes analysts’ published views, not ours.';
  function funding(list) { // OKX 8h funding rates -> annualized %
    var r = list.map(function (x) { return [+x.fundingTime, +x.fundingRate]; }).sort(function (a, b) { return a[0] - b[0]; }); if (!r.length) return null;
    var ann = function (v) { return v * 3 * 365 * 100; }, last = ann(r[r.length - 1][1]), w = r.slice(-21), avg7 = ann(w.reduce(function (s, x) { return s + x[1]; }, 0) / w.length);
    var daily = []; for (var i = 0; i < r.length; i += 3) { var g = r.slice(i, i + 3); daily.push(ann(g.reduce(function (s, x) { return s + x[1]; }, 0) / g.length)); }
    var word = avg7 < 0 ? 'Cool' : avg7 < 10 ? 'Neutral' : avg7 < 30 ? 'Warm' : 'Hot'; var sc = Math.max(0, Math.min(100, (avg7 + 10) / 50 * 100));
    return { last: last, avg7: avg7, word: word, score: Math.round(sc), spark: daily, t: r[r.length - 1][0] }; }
  var FUND_METHOD = 'BTC perpetual funding (OKX BTC-USDT swap, public API), annualized: 8-hour rate × 3 × 365. 7-day average shown on the meter. Below 0% Cool (shorts paying longs), 0–10% Neutral, 10–30% Warm, 30%+ Hot (crowded leverage). Leverage heat, not a price call.';
  function spark(vals, w, h, col) { if (!vals || vals.length < 2) return ''; var lo = Math.min.apply(0, vals), hi = Math.max.apply(0, vals), r = hi - lo || 1;
    return '<svg class="sg-sp" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><polyline fill="none" stroke="' + col + '" stroke-width="1.5" points="' + vals.map(function (v, i) { return (i / (vals.length - 1) * w).toFixed(1) + ',' + (h - 2 - (v - lo) / r * (h - 4)).toFixed(1); }).join(' ') + '"/></svg>'; }
  function meter(name, score, word, line, method, sp, sub) { var col = word === 'Bullish' || word === 'Cool' ? '#2fd17c' : word === 'Bearish' || word === 'Hot' ? '#ff5a5f' : word === 'Warm' ? '#f2b84b' : '#c9ced6';
    return '<div class="sg"><div class="sg-h"><b>' + esc(name) + '</b><span class="sg-i" tabindex="0" title="' + esc(method) + '" aria-label="Method: ' + esc(method) + '">ⓘ</span></div>' +
      '<div class="sg-m"><i style="left:' + Math.max(0, Math.min(100, score)) + '%"></i></div><div class="sg-r"><span class="sg-w" style="color:' + col + '">' + esc(word) + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + (sp || '') + '</div><p class="sg-l">' + esc(line) + '</p></div>'; }
  var A = null, PX = null, F = null;
  function pxOn(tk, d) { var s = PX && PX.series[tk]; if (!s) return null; var i = s.d.length - 1; while (i > 0 && s.d[i] > d) i--; return s.c[i]; }
  function lastPx(tk) { var s = PX && PX.series[tk]; if (s) return s.c[s.c.length - 1]; return null; }
  function streetOf(tk) { var c = A.cos[tk], px = lastPx(tk) || c.px; return street(c.buy, c.hold, c.sell, c.pt, px); }
  function streetTrend(tk) { var c = A.cos[tk]; if (!c.pt_hist || !PX || !PX.series[tk]) return null; var H = c.hist || [];
    return c.pt_hist.map(function (p) { var m = H.filter(function (h) { return h.d <= p.d; }).pop() || H[0] || c; var px = pxOn(tk, p.d); var s = px && street(m.buy || 0, m.hold || 0, m.sell || 0, p.avg, px); return s ? s.score : null; }).filter(function (v) { return v != null; }); }
  function streetMeter(tk) { var s = streetOf(tk), c = A.cos[tk]; if (!s) return ''; var tr = streetTrend(tk);
    return meter('Street Sentiment · ' + tk, s.score, s.word, Math.round(s.mix) + '% of ' + c.n + ' analysts lean positive; average target ' + (s.up >= 0 ? '+' : '') + s.up.toFixed(0) + '% vs price.', STREET_METHOD, spark(tr, 70, 18, '#F7931A'), s.score + '/100'); }
  function fundMeter() { if (!F) return ''; return meter('BTC funding heat', F.score, F.word, 'Perp funding ' + (F.avg7 >= 0 ? '+' : '') + F.avg7.toFixed(1) + '%/yr (7-day avg); latest ' + (F.last >= 0 ? '+' : '') + F.last.toFixed(1) + '%/yr.', FUND_METHOD, spark(F.spark, 70, 18, '#5aa9ff'), 'OKX'); }
  function fngMeter() { var el = document.querySelector('[data-live="fng"]'); return ''; }

  /* ---- Analyst Views card (Strategy page) ---- */
  var KIND = { up: ['▲ Upgrade', 'up'], down: ['▼ Downgrade', 'dn'], init: ['● Initiated', 'nw'], pt_up: ['▲ Target raised', 'up'], pt_down: ['▼ Target cut', 'dn'], pt_new: ['● New target', 'nw'], reit: ['= Reiterated', 'mu'] };
  var sel = LS.get('btd_anl') || 'MSTR';
  function card() { var box = $('[data-analysts]'); if (!box || !A) return; if (!A.cos[sel]) sel = A.order[0]; var c = A.cos[sel], px = lastPx(sel), s = streetOf(sel), wk = new Date(Date.parse(A.as_of) - 7 * 864e5).toISOString().slice(0, 10);
    var rng = c.hi && c.lo ? '<div class="av-rg"><span>' + money(c.lo) + '</span><div class="av-bar">' + (px ? '<i class="av-px" style="left:' + Math.max(0, Math.min(100, (px - c.lo) / (c.hi - c.lo) * 100)) + '%" title="Price ' + money(px) + '"></i>' : '') + '<i class="av-pt" style="left:' + ((c.pt - c.lo) / (c.hi - c.lo) * 100) + '%" title="Average target ' + money(c.pt) + '"></i></div><span>' + money(c.hi) + '</span></div><p class="x-mu av-lg"><i class="av-k av-kpt"></i>average target <i class="av-k av-kpx"></i>price ' + (px ? money(px) + ' (last close)' : '') + '</p>' : '';
    var firms = (c.firms || []).slice(0, 12).map(function (f) { var k = KIND[f.kind] || KIND.reit, nw = f.date > wk;
      return '<tr' + (nw ? ' class="av-new"' : '') + '><td class="mono">' + esc(f.date.slice(5).replace('-', '/')) + '</td><td>' + esc(f.firm) + (nw ? ' <span class="av-wk">this week</span>' : '') + '</td><td>' + esc(f.rating || '—') + (f.r_from && f.r_from !== f.rating ? ' <small>from ' + esc(f.r_from) + '</small>' : '') + '</td><td class="mono">' + (f.pt ? money(f.pt) : '—') + (f.pt_from && f.pt_from !== f.pt ? ' <small>from ' + money(f.pt_from) + '</small>' : '') + '</td><td class="av-' + k[1] + '">' + k[0] + '</td></tr>'; }).join('');
    var notes = ((A.notes || {})[sel] || []).map(function (n) { return '<li><span class="mono">' + esc(dl(n.date)) + '</span> <b>' + esc(n.firm) + '</b>: ' + esc(n.action) + (n.to ? ' to ' + money(n.to) + (n.from ? ' from ' + money(n.from) : '') : '') + (n.rating ? ', ' + esc(n.rating) : '') + '. ' + esc(n.note || '') + ' <a href="' + esc(n.url) + '" target="_blank" rel="noopener">' + esc(n.src) + ' ↗</a></li>'; }).join('');
    box.innerHTML = '<div class="av-h"><h2>Analyst Views</h2><span class="tag">Third-party views, not ours · education only</span></div>' +
      '<div class="av-tabs" role="group" aria-label="Company">' + A.order.map(function (t) { return '<button type="button" class="chip' + (t === sel ? ' on' : '') + '" data-av="' + t + '" aria-pressed="' + (t === sel) + '">' + t + '</button>'; }).join('') + '</div>' +
      '<div class="av-g"><div class="av-c"><small class="x-mu">' + esc(c.name) + ' · consensus</small><div class="av-big">' + esc(c.cons || '—') + ' <span class="x-mu">' + c.n + ' analysts</span></div>' +
        '<div class="av-mix"><i class="b" style="flex:' + c.buy + '"></i><i class="h" style="flex:' + c.hold + '"></i><i class="s" style="flex:' + c.sell + '"></i></div><p class="x-mu">' + c.buy + ' buy · ' + c.hold + ' hold · ' + c.sell + ' sell</p>' +
        '<div class="av-big">' + money(c.pt) + ' <span class="x-mu">avg 12-month target' + (px ? ' · ' + ((c.pt / px - 1) * 100 >= 0 ? '+' : '') + ((c.pt / px - 1) * 100).toFixed(0) + '% vs price' : '') + '</span></div>' + rng + '</div>' +
      '<div class="av-c">' + streetMeter(sel) + '<div class="av-ch"><small class="x-mu">Average published target vs price, weekly</small><canvas data-av-cv aria-label="Average analyst target vs price"></canvas></div></div></div>' +
      '<h3 class="av-s">Latest rating by firm</h3><div class="av-tw"><table class="av-t"><thead><tr><th>Date</th><th>Firm</th><th>Rating</th><th>Target</th><th>Change</th></tr></thead><tbody>' + (firms || '<tr><td colspan="5" class="x-mu">No dated firm actions in the past year.</td></tr>') + '</tbody></table></div>' +
      (notes ? '<h3 class="av-s">Notable notes</h3><ul class="av-n">' + notes + '</ul>' : '') +
      '<p class="x-mu av-f">Consensus: <a href="' + esc((A.source_url || '').replace('/mstr/', '/' + sel.toLowerCase() + '/')) + '" target="_blank" rel="noopener">Nasdaq.com analyst research</a>. Ratings by firm: <a href="' + esc(c.actions_src || 'https://www.marketbeat.com/') + '" target="_blank" rel="noopener">MarketBeat</a> (last 12 months; “this week” = since ' + esc(dl(wk)) + '). The target line is the average of each firm’s latest published target as of each week, rebuilt from those dated actions. Sources can differ in which firms they count. Snapshot ' + esc(dl(A.as_of)) + '. Covered companies need 3+ analysts; others are hidden. Third-party views, not ours. Education only, not investment advice.</p>';
    chart(); }
  function chart() { var cv = $('[data-av-cv]'); if (!cv) return; var c = A.cos[sel], H = c.pt_hist || []; var W = cv.clientWidth, Ht = cv.clientHeight; if (!W || H.length < 2) { if (cv.parentNode && H.length < 2) cv.parentNode.innerHTML += '<p class="x-mu">History builds weekly.</p>'; return; }
    var dpr = devicePixelRatio || 1; cv.width = W * dpr; cv.height = Ht * dpr; var g = cv.getContext('2d'); g.scale(dpr, dpr);
    var P = H.map(function (p) { return [Date.parse(p.d), p.avg, pxOn(sel, p.d)]; }); var vals = []; P.forEach(function (p) { vals.push(p[1]); if (p[2]) vals.push(p[2]); });
    var lo = Math.min.apply(0, vals) * 0.92, hi = Math.max.apply(0, vals) * 1.05, x0 = P[0][0], x1 = P[P.length - 1][0], pl = 44, pr = 6, pt = 6, pb = 16;
    var X = function (t) { return pl + (t - x0) / (x1 - x0 || 1) * (W - pl - pr); }, Y = function (v) { return pt + (hi - v) / (hi - lo) * (Ht - pt - pb); };
    g.font = '10px ui-monospace,Menlo,monospace'; g.fillStyle = '#6b7480'; g.strokeStyle = '#161a20'; for (var i = 0; i < 4; i++) { var v = lo + (hi - lo) * (i + .5) / 4, y = Y(v); g.beginPath(); g.moveTo(pl, y); g.lineTo(W - pr, y); g.stroke(); g.fillText(money(v), 2, y + 3); }
    g.fillText(new Date(x0).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), pl, Ht - 3); var e = new Date(x1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); g.fillText(e, W - pr - g.measureText(e).width, Ht - 3);
    function ln(k, col, dash) { g.strokeStyle = col; g.lineWidth = 1.6; g.setLineDash(dash || []); g.beginPath(); var s = 0; P.forEach(function (p) { if (!p[k]) return; s++ ? g.lineTo(X(p[0]), Y(p[k])) : g.moveTo(X(p[0]), Y(p[k])); }); g.stroke(); g.setLineDash([]); }
    ln(1, '#F7931A', [4, 3]); ln(2, '#e9edf2'); }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-av]'); if (!b) return; sel = b.dataset.av; LS.set('btd_anl', sel); card(); gauges(); });
  window.addEventListener('resize', function () { clearTimeout(chart.t); chart.t = setTimeout(chart, 120); });

  /* ---- Sentiment gauges rows ---- */
  function gauges() { var fg = document.querySelector('[data-live="fng"]'), fgv = fg && parseInt(fg.textContent, 10);
    var fngM = function () { var v = window.BTD_FNG || null; return v ? meter('BTC Fear & Greed', v.value, v.word, 'Crypto-wide mood index by alternative.me (separate from analyst views).', 'Crypto Fear & Greed Index by alternative.me: 0 = extreme fear, 100 = extreme greed, from volatility, momentum, social and dominance inputs.', spark(v.hist, 70, 18, '#c9ced6'), v.value + '/100') : ''; };
    var full = $('[data-sent-full]'); if (full && A) full.innerHTML = '<div class="av-h"><h2>Sentiment gauges</h2><span class="tag">simple meters · method in ⓘ</span></div><div class="sg-row">' + streetMeter('MSTR') + fundMeter() + fngM() + '</div><p class="x-mu av-f">Each meter describes a mood, not a direction. Treasury mNAV mood and social buzz are left out until there is broad, free, verifiable data for them.</p>';
    var mini = $('[data-sent-mini]'); if (mini) mini.innerHTML = (A ? streetMeter('MSTR') : '') + fundMeter(); }
  function fng() { return J('https://api.alternative.me/fng/?limit=30').then(function (j) { var d = (j.data || []).map(function (x) { return +x.value; }); if (!d.length) return;
    window.BTD_FNG = { value: d[0], word: d[0] >= 55 ? 'Greed' : d[0] <= 45 ? 'Fear' : 'Neutral', hist: d.slice().reverse() }; }).catch(function () {}); }
  var need = document.querySelector('[data-analysts],[data-sent-full],[data-sent-mini]'); if (!need) return;
  var jobs = [J('/assets/data/analysts.json').then(function (j) { A = j; }).catch(function () {}), J('/members/data/stocks_daily.json').then(function (j) { PX = j; }).catch(function () {}),
    J('https://www.okx.com/api/v5/public/funding-rate-history?instId=BTC-USDT-SWAP&limit=100').then(function (j) { F = funding(j.data || []); }).catch(function () {})];
  if ($('[data-sent-full]')) jobs.push(fng());
  Promise.all(jobs).then(function () { card(); gauges(); });
})();
