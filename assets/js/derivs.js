/* BTC Treasury Desk: BTC derivatives tiles from Deribit's free public API (no key; CORS allowed). Context only, education only.
   Funding, futures OI, options OI + put/call, ~30-day 10%-OTM skew, DVOL implied-vol index, perp premium. ✎ Edit: show/hide + reorder (btd_dved). */
(function () {
  'use strict';
  var box = document.querySelector('[data-dv]'); if (!box) return;
  var API = 'https://www.deribit.com/api/v2/public/', KEY = 'btd_dved';
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  function J(p) { return fetch(API + p, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(p); return r.json(); }).then(function (j) { return j.result; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function usdB(v) { return v >= 1e9 ? '$' + (v / 1e9).toFixed(2) + 'B' : '$' + (v / 1e6).toFixed(0) + 'M'; }
  function sg(v, d) { return (v >= 0 ? '+' : '\u2212') + Math.abs(v).toFixed(d == null ? 2 : d); }
  var T = [
    ['fund', 'Perp funding (8h)', 'BTC-PERPETUAL funding rate per 8 hours on Deribit, plus the same rate annualized (x3 x365). Positive = longs pay shorts (leverage leaning long); negative = shorts pay longs.'],
    ['prem', 'Perp premium', 'BTC-PERPETUAL mark price vs the Deribit BTC index. A premium means perpetual traders pay up versus spot.'],
    ['foi', 'Futures open interest', 'Total open futures contracts (perpetual + dated) on Deribit, in USD notional. Deribit only, not the whole market.'],
    ['ooi', 'Options open interest', 'Total open BTC options on Deribit (in BTC, shown in USD at the index), with the put/call open-interest ratio. Above 1 = more puts open than calls.'],
    ['skew', '30-day skew (10% OTM)', 'Implied volatility of a ~10% out-of-the-money put minus a ~10% out-of-the-money call, Deribit expiry nearest 30 days. Positive = downside protection priced richer than upside.'],
    ['basis', 'Futures basis (annualized)', 'Dated BTC future nearest to 3 months on Deribit: mark price vs the Deribit BTC index, annualized to the expiry. Positive (contango) = futures above spot; the carry a cash-and-carry trade would earn before costs.'],
    ['dvol', 'DVOL (implied vol)', 'Deribit BTC Volatility Index: 30-day implied volatility from BTC options, annualized %. 24h change shown.']];
  var st = null; try { st = JSON.parse(LS.get(KEY) || 'null'); } catch (e) {} var ALL = T.map(function (t) { return t[0]; });
  if (!st || !Array.isArray(st.o)) st = { o: ALL.slice(), h: [] }; st.o = st.o.filter(function (k) { return ALL.indexOf(k) >= 0; }); ALL.forEach(function (k) { if (st.o.indexOf(k) < 0) st.o.push(k); }); st.h = (st.h || []).filter(function (k) { return ALL.indexOf(k) >= 0; });
  var LAB = {}; T.forEach(function (t) { LAB[t[0]] = t[1]; });
  box.innerHTML = '<div class="p-h"><span class="p-t">BTC derivatives</span><span class="tag">Deribit public data \u00b7 live</span><button type="button" class="chip mk-ed" data-dv-ed aria-expanded="false" title="Show, hide and reorder these tiles">\u270e Edit</button></div><div class="sec-ed" data-dv-edp hidden></div>' +
    '<div class="cx dv" data-dv-g>' + T.map(function (t) { return '<div class="cx-k" data-dvt="' + t[0] + '" title="' + esc(t[2]) + '"><span>' + esc(t[1]) + '</span><b data-dv="' + t[0] + '">\u2026</b><small data-dv="' + t[0] + '-s"></small></div>'; }).join('') + '</div>' +
    '<p class="p-f">Source: <a href="https://docs.deribit.com/" target="_blank" rel="noopener">Deribit public API</a> (one venue; derivatives positioning is context, not a forecast). Updates every 60s. Education only.</p>';
  var grid = box.querySelector('[data-dv-g]'), ed = box.querySelector('[data-dv-edp]'), btn = box.querySelector('[data-dv-ed]');
  function save() { if (st.h.length || st.o.join() !== ALL.join()) LS.set(KEY, JSON.stringify(st)); else LS.del(KEY); }
  function apply() { st.o.forEach(function (k) { var e = grid.querySelector('[data-dvt="' + k + '"]'); if (e) { grid.appendChild(e); e.hidden = st.h.indexOf(k) >= 0; } }); }
  function paintEd() { ed.innerHTML = '<p class="sec-ed-h">Show, hide and reorder tiles. <span class="sec-ed-tip">Drag rows on desktop; use \u25b2\u25bc on phone.</span></p><ol class="sec-ed-l">' + st.o.map(function (k, i) { return '<li draggable="true" data-k="' + k + '"><label><input type="checkbox" data-sh="' + k + '"' + (st.h.indexOf(k) < 0 ? ' checked' : '') + '> ' + esc(LAB[k]) + '</label><span><button type="button" data-up="' + i + '"' + (i ? '' : ' disabled') + ' aria-label="Move ' + esc(LAB[k]) + ' up">\u25b2</button><button type="button" data-dn="' + i + '"' + (i < st.o.length - 1 ? '' : ' disabled') + ' aria-label="Move ' + esc(LAB[k]) + ' down">\u25bc</button></span></li>'; }).join('') + '</ol><p class="sec-ed-f"><button type="button" class="chip" data-reset>Reset to default</button><button type="button" class="chip" data-done>Done</button></p>'; }
  function mv(i, j) { if (j < 0 || j >= st.o.length) return; st.o.splice(j, 0, st.o.splice(i, 1)[0]); save(); apply(); paintEd(); }
  btn.addEventListener('click', function () { ed.hidden = !ed.hidden; btn.setAttribute('aria-expanded', String(!ed.hidden)); if (!ed.hidden) paintEd(); });
  ed.addEventListener('change', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-sh'); if (!k) return; var i = st.h.indexOf(k); if (e.target.checked) { if (i >= 0) st.h.splice(i, 1); } else if (i < 0) st.h.push(k); save(); apply(); });
  ed.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-up')) mv(+b.dataset.up, +b.dataset.up - 1); else if (b.hasAttribute('data-dn')) mv(+b.dataset.dn, +b.dataset.dn + 1); else if (b.hasAttribute('data-reset')) { st = { o: ALL.slice(), h: [] }; save(); apply(); paintEd(); } else if (b.hasAttribute('data-done')) { ed.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  var dk = null; ed.addEventListener('dragstart', function (e) { var li = e.target.closest && e.target.closest('li'); if (li) dk = li.getAttribute('data-k'); }); ed.addEventListener('dragover', function (e) { if (dk) e.preventDefault(); }); ed.addEventListener('drop', function (e) { var li = e.target.closest && e.target.closest('li'); if (!dk || !li) return; e.preventDefault(); mv(st.o.indexOf(dk), st.o.indexOf(li.getAttribute('data-k'))); dk = null; });
  apply();
  function set(k, v, sub, cls) { var b = box.querySelector('[data-dv="' + k + '"]'), s = box.querySelector('[data-dv="' + k + '-s"]'), tl = box.querySelector('[data-dvt="' + k + '"]'); if (tl) tl.classList.toggle('dv-na', v === 'n/a'); /* no data: the tile drops out instead of showing n/a */ if (b) { b.textContent = v; b.className = cls || ''; } if (s) s.innerHTML = sub || ''; }
  var MON = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
  function expT(s) { var m = /^(\d{1,2})([A-Z]{3})(\d{2})$/.exec(s); return m ? Date.UTC(2000 + +m[3], MON[m[2]], +m[1], 8) : null; }
  function load() { if (document.hidden) return;
    J('get_book_summary_by_instrument?instrument_name=BTC-PERPETUAL').then(function (r) { var p = r[0]; if (!p) return; var f = p.funding_8h * 100, ann = p.funding_8h * 3 * 365 * 100; window.BTD_FUND = { f8: f, ann: ann };
      set('fund', sg(f, 4) + '%', 'annualized ' + sg(ann, 1) + '% \u00b7 ' + (f >= 0 ? 'longs pay shorts' : 'shorts pay longs'), f >= 0 ? 'up' : 'dn');
      var pr = (p.mark_price / p.estimated_delivery_price - 1) * 100; set('prem', sg(pr, 3) + '%', 'mark $' + Math.round(p.mark_price).toLocaleString('en-US') + ' vs index $' + Math.round(p.estimated_delivery_price).toLocaleString('en-US'), pr >= 0 ? 'up' : 'dn'); }).catch(function () { set('fund', 'n/a', 'Deribit unavailable'); });
    J('get_book_summary_by_currency?currency=BTC&kind=future').then(function (a) { var oi = 0; a.forEach(function (x) { oi += x.open_interest || 0; }); set('foi', usdB(oi), a.length + ' contracts (perp + dated) \u00b7 Deribit');
      var now2 = Date.now(), bq = null; a.forEach(function (x) { var n2 = x.instrument_name.split('-'), t2 = expT(n2[1]); if (!t2 || !x.mark_price || !x.estimated_delivery_price) return; var dd = (t2 - now2) / 864e5; if (dd < 14) return; if (!bq || Math.abs(dd - 90) < Math.abs(bq.dd - 90)) bq = { dd: dd, x: x, e: n2[1] }; });
      if (bq) { var raw = (bq.x.mark_price / bq.x.estimated_delivery_price - 1) * 100, an = raw * 365 / bq.dd; set('basis', sg(an, 1) + '%', bq.e + ' \u00b7 ' + Math.round(bq.dd) + ' days \u00b7 raw ' + sg(raw, 2) + '%', an >= 0 ? 'up' : 'dn'); } else set('basis', 'n/a', ''); }).catch(function () { set('foi', 'n/a', ''); });
    J('get_book_summary_by_currency?currency=BTC&kind=option').then(function (a) { var c = 0, p = 0, idx = 0, now = Date.now(), byE = {};
      a.forEach(function (x) { var n = x.instrument_name.split('-'); if (n[3] === 'C') c += x.open_interest || 0; else p += x.open_interest || 0; idx = x.estimated_delivery_price || idx; var t = expT(n[1]); if (!t || t < now + 7 * 864e5) return; (byE[n[1]] = byE[n[1]] || []).push({ k: +n[2], cp: n[3], iv: x.mark_iv, u: x.underlying_price, t: t }); });
      set('ooi', usdB((c + p) * idx), 'put/call OI ' + (c ? (p / c).toFixed(2) : 'n/a') + ' \u00b7 ' + Math.round(c + p).toLocaleString('en-US') + ' BTC');
      var best = null; Object.keys(byE).forEach(function (e) { var d = Math.abs(byE[e][0].t - now - 30 * 864e5); if (!best || d < best.d) best = { e: e, d: d }; });
      if (best) { var L = byE[best.e], u = L[0].u, near = function (cp, tgt) { var o = null; L.forEach(function (x) { if (x.cp === cp && x.iv && (!o || Math.abs(x.k - tgt) < Math.abs(o.k - tgt))) o = x; }); return o; }, pu = near('P', u * 0.9), ca = near('C', u * 1.1);
        if (pu && ca) { var sk = pu.iv - ca.iv; set('skew', sg(sk, 1) + ' vol pts', best.e + ' \u00b7 put ' + pu.k.toLocaleString('en-US') + ' ' + pu.iv.toFixed(1) + '% vs call ' + ca.k.toLocaleString('en-US') + ' ' + ca.iv.toFixed(1) + '%', sk >= 0 ? 'dn' : 'up'); } } }).catch(function () { set('ooi', 'n/a', ''); });
    var e = Date.now(); J('get_volatility_index_data?currency=BTC&resolution=3600&start_timestamp=' + (e - 26 * 36e5) + '&end_timestamp=' + e).then(function (r) { var d = r.data || []; if (!d.length) return; var last = d[d.length - 1][4], first = d[0][4]; set('dvol', last.toFixed(1), '24h ' + sg(last - first, 1) + ' pts \u00b7 30-day implied vol, annualized %'); }).catch(function () { set('dvol', 'n/a', ''); });
  }
  load(); setInterval(load, 60000); setTimeout(function () { box.querySelectorAll('[data-dvt]').forEach(function (t) { var b = t.querySelector('b'); if (b && b.textContent === '\u2026') t.classList.add('dv-na'); }); }, 20000);
})();
