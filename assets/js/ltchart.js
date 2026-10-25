/* BTC Treasury Desk: Long-term chart (flagship, Oct 25, 2026). Lightweight Charts (Apache-2.0, vendored).
   BTC daily closes since Jul 2015 (Coinbase, assets/data/btc_daily.json, weekly refresh) + live Coinbase price; stocks from assets/data/stocks_hist.json.
   Ranges 1Y-Max, log/linear, overlays (Power Law, 200W MA, 200D MA + Mayer bands, Pi Cycle, realized price / MVRV, halvings),
   lower pane (Mayer Multiple, MSTR mNAV, BTC per MSTR share), compare (%), drawing (horizontal + trend lines), saved layouts.
   Members extras are marked "Members" and gated with BTD_MEMBERS (PRO_GATE off = open to everyone during launch). Education only, not investment advice. */
(function () {
  'use strict';
  var box = document.querySelector('[data-ltc]'); if (!box || !window.LightweightCharts) return;
  var LW = window.LightweightCharts, DAY = 86400;
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pro() { var C = window.BTD_MEMBERS; if (!C || !C.PRO_GATE) return true; return C.canAccess ? C.canAccess('pro') : false; }
  var OV = [['pl', 'Power Law', 0], ['w200', '200W MA', 0], ['d200', '200D MA + Mayer bands', 0], ['pi', 'Pi Cycle', 1], ['rp', 'Realized price (MVRV)', 0], ['halv', 'Halvings', 0]];
  var PANES = [['none', 'No lower pane', 0], ['mayer', 'Mayer Multiple', 0], ['mnav', 'MSTR mNAV', 1], ['bps', 'BTC per MSTR share', 1]];
  var RANGES = ['1Y', '2Y', '4Y', '5Y', 'Max'], CMP = ['MSTR', 'MARA', 'ASST', 'COIN', 'TSLA', 'XXI', 'CLSK', 'BLSH'];
  var DEF = { sym: 'BTC', r: 'Max', log: 1, ov: { pl: 1, w200: 1, halv: 1 }, pane: 'none', cmp: [], lines: [], trends: [] };
  var S = JSON.parse(JSON.stringify(DEF)); try { var o = JSON.parse(LS.get('btd_lt') || 'null'); if (o && o.v === 1) Object.keys(DEF).forEach(function (k) { if (o[k] != null) S[k] = o[k]; }); } catch (e) {}
  function save() { var o = { v: 1 }; Object.keys(DEF).forEach(function (k) { o[k] = S[k]; }); LS.set('btd_lt', JSON.stringify(o)); }
  var LAY = []; try { LAY = JSON.parse(LS.get('btd_lt_layouts') || '[]') || []; } catch (e) {}

  var BTC = [], HIST = {}, STRAT = null, DESK = null;
  var ready = Promise.all([J('/assets/data/btc_daily.json').then(function (j) { var t0 = Date.parse(j.start + 'T00:00:00Z') / 1e3; BTC = j.closes.map(function (c, i) { return { time: t0 + i * DAY, value: c }; }); }),
    J('/assets/data/stocks_hist.json').then(function (j) { Object.keys(j.series).forEach(function (k) { var x = j.series[k], b = Date.parse(x.d0 + 'T00:00:00Z') / 1e3; HIST[k] = x.o.map(function (o, i) { return { time: b + o * DAY, value: x.c[i] }; }); }); }).catch(function () {}),
    J('/assets/data/strategy.json').then(function (j) { STRAT = j; }).catch(function () {}), J('/assets/data/desk.json').then(function (j) { DESK = j; }).catch(function () {}),
    J('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400').then(function (a) { if (!Array.isArray(a)) return; a.slice().reverse().forEach(function (q) { var t = q[0]; if (!BTC.length || t > BTC[BTC.length - 1].time) BTC.push({ time: t, value: +q[4] }); }); }).catch(function () {})]);

  /* indicators */
  function sma(s, n) { var out = [], sum = 0; for (var i = 0; i < s.length; i++) { sum += s[i].value; if (i >= n) sum -= s[i - n].value; if (i >= n - 1) out.push({ time: s[i].time, value: sum / n }); } return out; }
  function plaw(t, k) { var d = (t - Date.UTC(2009, 0, 3) / 1e3) / DAY; return 1.0117e-17 * Math.pow(d, 5.82) * k; } /* Santostasi power law, fair value; bands 0.42x / 2.5x */
  var HALV = [['2016-07-09', '2nd halving'], ['2020-05-11', '3rd halving'], ['2024-04-20', '4th halving']];
  function mstrHold() { if (!STRAT) return []; var p = STRAT.purchases.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }); return p.map(function (x) { return { t: Date.parse(x.date + 'T00:00:00Z') / 1e3, h: x.holdings, sh: x.adso_k ? x.adso_k * 1e3 : null }; }); }
  function stepAt(a, t, k) { var v = null; for (var i = 0; i < a.length && a[i].t <= t; i++) if (a[i][k] != null) v = a[i][k]; return v; }
  function btcAt(t) { var lo = 0, hi = BTC.length - 1; while (lo < hi) { var m = (lo + hi + 1) >> 1; if (BTC[m].time <= t) lo = m; else hi = m - 1; } return BTC[lo] ? BTC[lo].value : null; }

  /* chart */
  box.innerHTML = '<div class="lt-bar" data-bar></div><div class="lt-cv" data-cv><div class="tc-hud mono" data-hud></div></div><div class="lt-note mono" data-note></div>';
  var cv = box.querySelector('[data-cv]');
  var ch = LW.createChart(cv, { autoSize: true, layout: { background: { color: 'transparent' }, textColor: '#8b95a3', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, attributionLogo: false, panes: { separatorColor: '#222831' } },
    grid: { vertLines: { color: 'rgba(255,255,255,.04)' }, horzLines: { color: 'rgba(255,255,255,.05)' } }, rightPriceScale: { borderColor: '#222831' }, timeScale: { borderColor: '#222831', minBarSpacing: 0.01 }, crosshair: { mode: 0 } });
  var SER = [];
  var PF = null; function addS(type, opt, pane) { var s = ch.addSeries(type, Object.assign({ lastValueVisible: false, priceLineVisible: false }, !pane && PF ? { priceFormat: PF } : {}, opt), pane || 0); SER.push(s); return s; }
  var mainS = null, drawMode = null, pend = null;
  function seg(name, opts, on) { return '<span class="tc-seg">' + opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<button type="button" data-' + name + '="' + v + '"' + (v === on ? ' class="on"' : '') + '>' + l + '</button>'; }).join('') + '</span>'; }
  function tg(k, lab, on, prem) { return '<button type="button" class="tc-tg' + (on ? ' on' : '') + '" data-ov="' + k + '">' + lab + (prem ? ' <sup class="lt-pro">Members</sup>' : '') + '</button>'; }
  function bar() { var b = box.querySelector('[data-bar]');
    b.innerHTML = '<div class="lt-row">' + seg('sym', [['BTC', 'BTC'], ['MSTR', 'MSTR']], S.sym) + seg('rng', RANGES, S.r) + '<button type="button" class="tc-tg' + (S.log ? ' on' : '') + '" data-log>Log</button>' +
      '<select class="tc-pick" data-cmp aria-label="Compare"><option value="">+ Compare…</option>' + CMP.concat(['BTC']).filter(function (x) { return x !== S.sym && S.cmp.indexOf(x) < 0; }).map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select>' + S.cmp.map(function (x) { return '<button type="button" class="tc-tg on" data-uncmp="' + x + '">' + x + ' ×</button>'; }).join('') +
      '<button type="button" class="tc-tg' + (drawMode === 'h' ? ' on' : '') + '" data-draw="h">— H-line</button><button type="button" class="tc-tg' + (drawMode === 't' ? ' on' : '') + '" data-draw="t">╱ Trend <sup class="lt-pro">Members</sup></button>' + (S.lines.length || S.trends.length ? '<button type="button" class="tc-tg" data-clr>Clear drawings</button>' : '') + '<button type="button" class="tc-tg" data-fs>⛶</button></div>' +
      (S.sym === 'BTC' ? '<div class="lt-row">' + OV.map(function (x) { return tg(x[0], x[1], S.ov[x[0]], x[2]); }).join('') + '</div>' : '') +
      '<div class="lt-row"><select class="tc-pick" data-pane aria-label="Lower pane">' + PANES.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === S.pane ? ' selected' : '') + '>' + p[1] + (p[2] ? ' · Members' : '') + '</option>'; }).join('') + '</select>' +
      '<select class="tc-pick" data-lay aria-label="Saved layouts"><option value="">Layouts…</option>' + LAY.map(function (l, i) { return '<option value="' + i + '">' + esc(l.n) + '</option>'; }).join('') + '<option value="save">＋ Save current layout</option>' + (LAY.length ? '<option value="del">Delete a layout…</option>' : '') + '<option value="reset">Reset to default</option></select></div>'; }
  function gate(feat) { if (pro()) return true; note('“' + feat + '” is a Members feature. Unlock it on /members/.'); return false; }
  function note(t) { box.querySelector('[data-note]').textContent = t; }
  function fromT() { var last = BTC.length ? BTC[BTC.length - 1].time : Date.now() / 1e3; return S.r === 'Max' ? 0 : last - { '1Y': 366, '2Y': 731, '4Y': 1461, '5Y': 1827 }[S.r] * DAY; }
  function render() { bar(); SER.forEach(function (s) { try { ch.removeSeries(s); } catch (e) {} }); SER = []; var f = fromT(), cut = function (a) { return a.filter(function (p) { return p.time >= f; }); };
    var base = S.sym === 'BTC' ? BTC : (HIST.MSTR || []), pct = S.cmp.length > 0; PF = pct ? null : { type: 'custom', minMove: 0.01, formatter: function (v) { return v >= 1000 ? '$' + Math.round(v).toLocaleString('en-US') : '$' + v.toFixed(2); } };
    mainS = addS(LW.AreaSeries, { lineColor: '#F7931A', topColor: 'rgba(247,147,26,.22)', bottomColor: 'rgba(247,147,26,0)', lineWidth: 2, lastValueVisible: true, title: S.sym });
    mainS.setData(cut(base));
    ch.priceScale('right', 0).applyOptions({ mode: pct ? 2 : S.log ? 1 : 0 });
    var notes = [];
    if (S.sym === 'BTC' && !pct) {
      if (S.ov.pl) { [[1, '#9aa4b2', 'Power law fair', 0], [0.42, '#3ccf8e', 'Power law support', 2], [2.5, '#ff5c5c', 'Power law top', 2]].forEach(function (b) { var s = addS(LW.LineSeries, { color: b[1], lineWidth: 1, lineStyle: b[3], title: b[2] }); var d = [], last = BTC[BTC.length - 1].time; for (var t = Math.max(f, BTC[0].time); t <= last + 365 * DAY; t += 7 * DAY) d.push({ time: t, value: plaw(t, b[0]) }); s.setData(d); }); }
      if (S.ov.w200) { var wk = BTC.filter(function (p, i) { return (BTC.length - 1 - i) % 7 === 0; }); addS(LW.LineSeries, { color: '#4fa3ff', lineWidth: 2, title: '200W MA' }).setData(cut(sma(wk, 200))); }
      if (S.ov.d200) { var m2 = sma(BTC, 200); addS(LW.LineSeries, { color: '#f2c94c', lineWidth: 1, title: '200D MA' }).setData(cut(m2)); addS(LW.LineSeries, { color: '#3ccf8e', lineWidth: 1, lineStyle: 2, title: 'Mayer 0.8x' }).setData(cut(m2.map(function (p) { return { time: p.time, value: p.value * 0.8 }; }))); addS(LW.LineSeries, { color: '#ff5c5c', lineWidth: 1, lineStyle: 2, title: 'Mayer 2.4x' }).setData(cut(m2.map(function (p) { return { time: p.time, value: p.value * 2.4 }; }))); }
      if (S.ov.pi && pro()) { var a = sma(BTC, 111), b2 = sma(BTC, 350).map(function (p) { return { time: p.time, value: p.value * 2 }; }); addS(LW.LineSeries, { color: '#c084fc', lineWidth: 1, title: '111D MA' }).setData(cut(a)); addS(LW.LineSeries, { color: '#22d3ee', lineWidth: 1, title: '2×350D MA' }).setData(cut(b2));
        var mk = [], bm = {}; b2.forEach(function (p) { bm[p.time] = p.value; }); for (var i = 1; i < a.length; i++) { var x0 = bm[a[i - 1].time], x1 = bm[a[i].time]; if (x0 && x1 && a[i - 1].value < x0 && a[i].value >= x1 && a[i].time >= f) mk.push({ time: a[i].time, position: 'aboveBar', color: '#c084fc', shape: 'arrowDown', text: 'Pi Cycle cross' }); } if (mk.length && LW.createSeriesMarkers) LW.createSeriesMarkers(mainS, mk); }
      if (S.ov.rp && DESK && DESK.onchain && DESK.onchain.realized_price) { var rp = DESK.onchain.realized_price, last2 = BTC[BTC.length - 1].value; mainS.createPriceLine({ price: rp, color: '#3ccf8e', lineStyle: 1, lineWidth: 1, axisLabelVisible: true, title: 'Realized ' + Math.round(rp).toLocaleString('en-US') }); notes.push('MVRV now ' + (last2 / rp).toFixed(2) + ' (price / realized price $' + rp.toLocaleString('en-US') + ', ' + DESK.onchain.as_of + '; current level only, no free history).'); }
      if (S.ov.halv && LW.createSeriesMarkers && !(S.ov.pi && pro())) LW.createSeriesMarkers(mainS, HALV.map(function (h) { return { time: Date.parse(h[0] + 'T00:00:00Z') / 1e3, position: 'belowBar', color: '#F7931A', shape: 'arrowUp', text: h[1] }; }).filter(function (m) { return m.time >= f; }).map(function (m) { var n = near(m.time); return Object.assign(m, { time: n }); }));
    }
    var cols = ['#9aa4b2', '#4fa3ff', '#3ccf8e', '#c084fc'];
    S.cmp.forEach(function (sym, i) { var d = sym === 'BTC' ? BTC : HIST[sym]; if (!d) return; var b0 = base.length ? Math.max(f, base[0].time) : f; addS(LW.LineSeries, { color: cols[i % 4], lineWidth: 1.5, lastValueVisible: true, title: sym }).setData(d.filter(function (p) { return p.time >= b0; })); });
    /* lower pane */
    if (S.pane === 'mayer') { var m3 = sma(BTC, 200), mm = {}; m3.forEach(function (p) { mm[p.time] = p.value; }); var s3 = addS(LW.LineSeries, { color: '#f2c94c', lineWidth: 1.5, lastValueVisible: true, title: 'Mayer' }, 1); s3.setData(cut(BTC.filter(function (p) { return mm[p.time]; }).map(function (p) { return { time: p.time, value: p.value / mm[p.time] }; }))); s3.createPriceLine({ price: 1, color: '#5a6370', lineStyle: 2, axisLabelVisible: false }); s3.createPriceLine({ price: 2.4, color: '#ff5c5c', lineStyle: 2, axisLabelVisible: true, title: '2.4' }); }
    if ((S.pane === 'mnav' || S.pane === 'bps') && pro()) { var H = mstrHold(), M = HIST.MSTR || [], out = [];
      M.forEach(function (p) { var sh = stepAt(H, p.time, 'sh'), h = stepAt(H, p.time, 'h'), bt = btcAt(p.time); if (!sh || !h || !bt) return; out.push({ time: p.time, value: S.pane === 'mnav' ? p.value * sh / (h * bt) : h / sh * 1e8 }); });
      var s4 = addS(LW.LineSeries, { color: '#F7931A', lineWidth: 1.5, lastValueVisible: true, title: S.pane === 'mnav' ? 'mNAV (mkt cap)' : 'sats / share' }, 1); s4.setData(out);
      notes.push(S.pane === 'mnav' ? 'Market-cap mNAV = MSTR close × diluted shares ÷ (BTC held × BTC price), from Jan 2025 (shares from Strategy’s ledger). Strategy’s official EV-based mNAV is on the Strategy tab.' : 'BTC per share shown in sats, from Jan 2025 (Strategy ledger holdings ÷ assumed diluted shares).'); }
    try { var pn = ch.panes(); if (S.pane === 'none') { while (pn.length > 1) { ch.removePane(pn.length - 1); pn = ch.panes(); } } else if (pn.length > 1) { try { pn[0].setStretchFactor(3); pn[1].setStretchFactor(1); } catch (e2) { pn[1].setHeight(160); } ch.priceScale('right', 1).applyOptions({ mode: 0 }); } } catch (e) {}
    S.lines.forEach(function (px) { mainS.createPriceLine({ price: px, color: '#F7931A', lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: 'level' }); });
    S.trends.forEach(function (tr) { if (tr.s !== S.sym) return; addS(LW.LineSeries, { color: '#e6e9ee', lineWidth: 1, crosshairMarkerVisible: false }).setData([{ time: tr.a[0], value: tr.a[1] }, { time: tr.b[0], value: tr.b[1] }]); });
    ch.timeScale().fitContent(); note(notes.join(' ') || 'BTC: Coinbase daily closes since Jul 2015 + live. Power law: 1.0117e-17 × days-since-genesis^5.82. Education only, not investment advice.'); }
  function near(t) { var b = BTC; for (var i = 0; i < b.length; i++) if (b[i].time >= t) return b[i].time; return t; }
  ch.subscribeCrosshairMove(function (p) { var h = box.querySelector('[data-hud]'); if (!p || !p.time || !mainS) { h.textContent = ''; return; } var v = p.seriesData.get(mainS); if (!v) return; var bt = btcAt(p.time), t = new Date(p.time * 1e3).toISOString().slice(0, 10);
    h.innerHTML = t + ' · ' + S.sym + ' <b>$' + (+v.value).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '</b>' + (S.sym === 'BTC' ? ' · vs power law <b>' + (bt / plaw(p.time, 1)).toFixed(2) + 'x</b>' : ''); });
  ch.subscribeClick(function (p) { if (!drawMode || !p || !p.point || !mainS) return; var px = mainS.coordinateToPrice(p.point.y); if (px == null) return;
    if (drawMode === 'h') { S.lines.push(+px.toPrecision(6)); drawMode = null; save(); render(); return; }
    if (drawMode === 't' && p.time) { if (!pend) { pend = [p.time, px]; note('Trend line: click the second point.'); return; } if (p.time === pend[0]) return; var a = pend[0] < p.time ? pend : [p.time, px], b = pend[0] < p.time ? [p.time, px] : pend; S.trends.push({ s: S.sym, a: a, b: b }); pend = null; drawMode = null; save(); render(); } });
  box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var d = b.dataset;
    if (d.sym) { S.sym = d.sym; S.cmp = S.cmp.filter(function (x) { return x !== S.sym; }); if (S.sym !== 'BTC' && S.r === 'Max') S.r = 'Max'; }
    else if (d.rng) S.r = d.rng; else if (b.hasAttribute('data-log')) S.log = S.log ? 0 : 1;
    else if (d.ov) { var p0 = OV.filter(function (x) { return x[0] === d.ov; })[0]; if (p0 && p0[2] && !S.ov[d.ov] && !gate(p0[1])) return; S.ov[d.ov] = S.ov[d.ov] ? 0 : 1; }
    else if (d.uncmp) S.cmp = S.cmp.filter(function (x) { return x !== d.uncmp; });
    else if (d.draw) { if (d.draw === 't' && !gate('Trend lines')) return; drawMode = drawMode === d.draw ? null : d.draw; pend = null; note(drawMode ? 'Click the chart to place the ' + (drawMode === 'h' ? 'level' : 'first point') + '.' : ''); bar(); return; }
    else if (b.hasAttribute('data-clr')) { S.lines = []; S.trends = []; }
    else if (b.hasAttribute('data-fs')) { if (document.fullscreenElement) document.exitFullscreen(); else if (box.requestFullscreen) box.requestFullscreen(); return; } else return;
    save(); render(); });
  box.addEventListener('change', function (e) { var t = e.target;
    if (t.hasAttribute('data-cmp') && t.value) { if (S.cmp.length >= 1 && !gate('Compare more than one symbol')) { t.value = ''; return; } S.cmp.push(t.value); save(); render(); }
    else if (t.hasAttribute('data-pane')) { var p = PANES.filter(function (x) { return x[0] === t.value; })[0]; if (p[2] && !gate(p[1])) { t.value = S.pane; return; } S.pane = t.value; save(); render(); }
    else if (t.hasAttribute('data-lay')) { var v = t.value;
      if (v === 'save') { if (LAY.length >= 1 && !gate('More than one saved layout')) { t.value = ''; return; } var n = (prompt('Name this layout', 'Layout ' + (LAY.length + 1)) || '').slice(0, 40); if (n) { var o = {}; Object.keys(DEF).forEach(function (k) { o[k] = S[k]; }); LAY.push({ n: n, s: JSON.parse(JSON.stringify(o)) }); LS.set('btd_lt_layouts', JSON.stringify(LAY.slice(0, 20))); note('Saved “' + n + '” in this browser.'); } }
      else if (v === 'del') { var n2 = prompt('Delete which layout? Type its name:\n' + LAY.map(function (l) { return l.n; }).join('\n')); LAY = LAY.filter(function (l) { return l.n !== n2; }); LS.set('btd_lt_layouts', JSON.stringify(LAY)); }
      else if (v === 'reset') { S = JSON.parse(JSON.stringify(DEF)); save(); }
      else if (v !== '') { var L = LAY[+v]; if (L) { Object.keys(DEF).forEach(function (k) { if (L.s[k] != null) S[k] = JSON.parse(JSON.stringify(L.s[k])); }); save(); } }
      render(); } });
  ready.then(render, render);
})();
