/* BTC Treasury Desk: ONE shared live data bus (window.BTD_FEED). Free public client-side feeds only, no keys, no AI.
   - Crypto: Coinbase Exchange websocket ticker (BTC/ETH/SOL, ~every trade), REST fallback every 5 s. Header tiles, chart and scroll all read THIS feed.
   - Stocks / indexes / futures / commodities / yields / FX: CNBC quote service, every 15 s in US sessions (4 AM-8 PM ET), 60 s otherwise.
     Pre-market and after-hours prices from the same feed; last close cached in localStorage so a tile is never blank.
   - Crypto market: CoinGecko /global (total cap, dominance) 2 min; alt breadth (top alts vs BTC, 30 d) 10 min; DefiLlama stablecoin supply (USD-pegged, all chains) 15 min.
   - Tokenized stocks: xStocks (onchain, 24/7) via CoinGecko, 60 s. Education only. */
(function () {
  'use strict';
  if (window.BTD_FEED) return;
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var Q = {}, subs = {}, want = {}, G = {}, wsOK = false;
  try { var c0 = JSON.parse(LS.get('btd_qc') || '{}'); Object.keys(c0).forEach(function (k) { Q[k] = c0[k]; Q[k].cached = 1; }); } catch (e) {}
  function emit(k, v) { (subs[k] || []).concat(subs['*'] || []).forEach(function (f) { try { f(v, k); } catch (e) { if (window.console) console.warn(e); } }); }
  function on(k, f) { (subs[k] = subs[k] || []).push(f); if (Q[k]) f(Q[k], k); else if (G[k]) f(G[k], k); }
  function num(v) { if (/^\s*UNCH/i.test(String(v))) return 0; var n = parseFloat(String(v == null ? '' : v).replace(/[,%+]/g, '')); return isFinite(n) ? n : null; }
  function etNow() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })); }
  /* US equity session: pre 4:00-9:30, open 9:30-16:00, post 16:00-20:00 ET, weekdays (holidays: CNBC status wins when known). */
  function session() { var n = etNow(), d = n.getDay(), m = n.getHours() * 60 + n.getMinutes();
    var st = d === 0 || d === 6 ? 'closed' : m >= 240 && m < 570 ? 'pre' : m >= 570 && m < 960 ? 'open' : m >= 960 && m < 1200 ? 'post' : 'closed';
    var ref = Q.MSTR && !Q.MSTR.cached ? Q.MSTR.status : null; if (st === 'open' && ref && /PRE|POST|CLOSED/.test(ref) && Date.now() - Q.MSTR.t < 120e3) st = 'closed'; return st; }
  function setQ(k, v) { var o = Q[k]; v.t = Date.now(); v.dir = o && o.px != null && v.px != null ? (v.px > o.px ? 1 : v.px < o.px ? -1 : 0) : 0; Q[k] = v; emit(k, v); }

  /* ---------- Coinbase websocket (crypto) ---------- */
  var CB = ['BTC', 'ETH', 'SOL'], ws = null, wsTry = 0, lastWs = 0;
  function wsOpen() {
    if (!('WebSocket' in window)) return; try { ws = new WebSocket('wss://ws-feed.exchange.coinbase.com'); } catch (e) { return; }
    ws.onopen = function () { wsTry = 0; ws.send(JSON.stringify({ type: 'subscribe', product_ids: CB.map(function (s) { return s + '-USD'; }), channels: ['ticker'] })); };
    ws.onmessage = function (ev) { var m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m.type !== 'ticker' || !m.price) return;
      var s = m.product_id.split('-')[0], px = +m.price, op = +m.open_24h; wsOK = true; lastWs = Date.now();
      setQ(s, { px: px, chp: op ? (px / op - 1) * 100 : null, ch: op ? px - op : null, prev: op, hi: +m.high_24h, lo: +m.low_24h, vol: +m.volume_24h, src: 'Coinbase', sess: '24/7', live: 1 }); };
    ws.onclose = function () { wsOK = false; ws = null; setTimeout(wsOpen, Math.min(30e3, 1500 * Math.pow(2, wsTry++))); };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }
  function cbPoll() { if (document.hidden || (wsOK && Date.now() - lastWs < 8e3)) return;
    CB.forEach(function (s) { fetch('https://api.exchange.coinbase.com/products/' + s + '-USD/stats').then(function (r) { return r.json(); }).then(function (x) { var l = +x.last, o = +x.open; if (!l) return;
      setQ(s, { px: l, chp: o ? (l / o - 1) * 100 : null, ch: o ? l - o : null, prev: o, hi: +x.high, lo: +x.low, src: 'Coinbase', sess: '24/7', live: 1 }); }).catch(function () {}); }); }

  /* ---------- CNBC quotes (everything else) ---------- */
  var CN = 'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1&symbols=';
  function watch(list) { (list || []).forEach(function (s) { if (s && CB.indexOf(s) < 0) want[s] = 1; }); qPollSoon(); }
  var qT = null; function qPollSoon() { clearTimeout(qT); qT = setTimeout(qPoll, 60); }
  function parseQ(x) { var px = num(x.last); if (px == null || String(x.code) !== '0') return null; var e = x.ExtendedMktQuote || null, ext = null;
    if (e && num(e.last) != null && /PRE|POST/.test(e.type || '')) ext = { px: num(e.last), ch: num(e.change), chp: num(e.change_pct), kind: /PRE/.test(e.type) ? 'pre' : 'post', vol: e.volume_alt || null, t: e.last_timedate || e.last_time || null };
    return { px: px, ch: num(x.change), chp: num(x.change_pct), prev: num(x.previous_day_closing), open: num(x.open), hi: num(x.high), lo: num(x.low), yh: num(x.yrhiprice), yl: num(x.yrloprice), vol: x.volume_alt || null, avgv: x.tendayavgvol || null, rvol: num(x.pcttendayvol), name: x.name || x.shortName, sn: x.shortName, cur: x.currencyCode,
      status: x.curmktstatus, ext: ext, yld: /%/.test(String(x.last)), rt: String(x.realTime) !== 'false', lt: x.last_time, src: 'CNBC' }; }
  function qPoll() {
    var syms = Object.keys(want); if (!syms.length || document.hidden) return; var chunks = [];
    for (var i = 0; i < syms.length; i += 45) chunks.push(syms.slice(i, i + 45));
    chunks.forEach(function (ch) { fetch(CN + encodeURIComponent(ch.join('|')), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      var a = (j.FormattedQuoteResult || {}).FormattedQuote || []; a = Array.isArray(a) ? a : [a];
      a.forEach(function (x) { var v = parseQ(x); if (v) setQ(x.symbol, v); else if (!Q[x.symbol]) { Q[x.symbol] = { none: 1 }; emit(x.symbol, Q[x.symbol]); } });
      cacheSave(); emit('quotes', Q); }).catch(function () {}); });
  }
  function cacheSave() { var o = {}; Object.keys(Q).forEach(function (k) { var v = Q[k]; if (v && v.px != null && CB.indexOf(k) < 0) o[k] = { px: v.px, ch: v.ch, chp: v.chp, prev: v.prev, name: v.name, cur: v.cur, ext: v.ext, yld: v.yld, status: v.status, lt: v.lt, t: v.t }; }); LS.set('btd_qc', JSON.stringify(o)); }
  var qInt = null; function qSchedule() { clearInterval(qInt); var s = session(); qInt = setInterval(function () { qPoll(); var s2 = session(); if (s2 !== s) { s = s2; emit('session', s2); qSchedule(); } }, s === 'closed' ? 60e3 : 15e3); }

  /* ---------- crypto market (CoinGecko global, alt breadth, stablecoins) ---------- */
  var CG = 'https://api.coingecko.com/api/v3';
  function gGlobal() { if (document.hidden && G.global) return; fetch(CG + '/global').then(function (r) { return r.json(); }).then(function (j) { var d = j.data; if (!d) return;
    var tot = d.total_market_cap.usd, dom = d.market_cap_percentage.btc, edom = d.market_cap_percentage.eth, chp = d.market_cap_change_percentage_24h_usd;
    G.global = { tot: tot, chp: chp, dom: dom, edom: edom, alt: tot * (1 - dom / 100), t: Date.now() }; emit('global', G.global); }).catch(function () {}); }
  var STABLE = /^(usdt|usdc|usde|dai|usds|fdusd|pyusd|tusd|usdd|usd1|frax|busd|usdtb|rlusd|gusd|usdp|susde|bsc-usd|usdf|usdg)$/i, WRAP = /^(wbtc|weth|steth|wsteth|cbbtc|weeth|reth|wbeth|lbtc|solvbtc|btcb|bnsol|jitosol|msol|meth|ezeth|rseth|tbtc|leo|figr_heloc)$/i;
  function gBreadth() { fetch(CG + '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=80&page=1&price_change_percentage=24h,7d,30d').then(function (r) { return r.json(); }).then(function (a) {
    if (!Array.isArray(a)) return; var b = a.filter(function (c) { return c.symbol === 'btc'; })[0]; if (!b) return; var bt = b.price_change_percentage_30d_in_currency;
    var alts = a.filter(function (c) { return c.symbol !== 'btc' && !STABLE.test(c.symbol) && !WRAP.test(c.symbol) && c.price_change_percentage_30d_in_currency != null; }).slice(0, 50);
    var beat = alts.filter(function (c) { return c.price_change_percentage_30d_in_currency > bt; }).length;
    var cn = 0, cp = 0, an = 0, ap = 0; a.forEach(function (c) { if (WRAP.test(c.symbol) || !c.market_cap || c.market_cap_change_percentage_24h == null) return; var pv = c.market_cap / (1 + c.market_cap_change_percentage_24h / 100); cn += c.market_cap; cp += pv; if (c.symbol !== 'btc') { an += c.market_cap; ap += pv; } });
    G.breadth = { n: alts.length, beat: beat, score: alts.length ? Math.round(beat / alts.length * 100) : null, btc30: bt, tchp: cp ? (cn / cp - 1) * 100 : null, achp: ap ? (an / ap - 1) * 100 : null, t: Date.now() }; emit('breadth', G.breadth); }).catch(function () {}); }
  function gStable() { fetch('https://stablecoins.llama.fi/stablecoinchains').then(function (r) { return r.json(); }).then(function (a) { var s = 0;
    (a || []).forEach(function (c) { s += ((c.totalCirculatingUSD || {}).peggedUSD) || 0; }); if (!s) return;
    var h = null; try { h = JSON.parse(LS.get('btd_stb') || 'null'); } catch (e) {} var ch = null, now = Date.now();
    if (h && now - h.t >= 20 * 36e5) { ch = (s / h.v - 1) * 100; if (now - h.t > 48 * 36e5) LS.set('btd_stb', JSON.stringify({ v: s, t: now })); h.ago = now - h.t; } else if (!h) LS.set('btd_stb', JSON.stringify({ v: s, t: now }));
    G.stable = { tot: s, ch: ch, ago: h && h.ago, t: now }; emit('stable', G.stable); }).catch(function () {}); }
  /* tokenized stocks (xStocks on Solana and other chains) */
  var XS = { MSTR: 'microstrategy-xstock', COIN: 'coinbase-xstock', NVDA: 'nvidia-xstock', AAPL: 'apple-xstock', MSFT: 'microsoft-xstock', GOOGL: 'alphabet-xstock', AMZN: 'amazon-xstock', META: 'meta-xstock', TSLA: 'tesla-xstock', CRCL: 'circle-xstock', HOOD: 'robinhood-xstock', SPY: 'sp500-xstock', QQQ: 'nasdaq-xstock', GLD: 'gold-xstock', MARA: 'mara-xstock', STRC: 'strategy-pp-variable-xstock', BMNR: 'bitmine-xstock', AVGO: 'broadcom-xstock', AMD: 'amd-xstock', ORCL: 'oracle-xstock', INTC: 'intel-xstock', GME: 'gamestop-xstock' };
  function gTok() { if (document.hidden && G.tok) return; var ids = Object.keys(XS).map(function (k) { return XS[k]; }).join(',');
    fetch(CG + '/simple/price?ids=' + ids + '&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true&include_24hr_vol=true').then(function (r) { return r.json(); }).then(function (j) { var o = {};
      Object.keys(XS).forEach(function (k) { var x = j[XS[k]]; if (x && x.usd) o[k] = { px: x.usd, chp: x.usd_24h_change, t: x.last_updated_at * 1e3, vol: x.usd_24h_vol }; }); if (Object.keys(o).length) { G.tok = o; tokTry = 0; LS.set('btd_tok', JSON.stringify(o)); emit('tok', o); } else throw 0; }).catch(function () { if (tokTry++ < 3) setTimeout(gTok, 20e3 * tokTry); }); }
  var tokTry = 0; (function () { try { var c = JSON.parse(LS.get('btd_tok') || 'null'); if (c && !G.tok) { G.tok = c; setTimeout(function () { if (G.tok === c) emit('tok', c); }, 0); } } catch (e) {} })(); /* last good token prices; tiles grey out as stale by their own timestamps */

  /* Robinhood-style extended-hours line: 'After hours $X  +$Y (+Z%)', change measured from the regular-session close (q.px). Shown only when CNBC has an extended price and the regular session is not open. */
  /* Overnight (Robinhood-style 24 Hour Market, Sun 8 PM - Fri 8 PM ET outside 4 AM - 8 PM): no free overnight-session quote exists
     (CNBC has no overnight field; Nasdaq, Yahoo, Robinhood and Blue Ocean are not browser-readable for free), so we show the xStocks token price, clearly labeled. */
  function overnight() { var n = etNow(), d = n.getDay(), m = n.getHours() * 60 + n.getMinutes(); return (d >= 0 && d <= 4 && m >= 1200) || (d >= 1 && d <= 5 && m < 240); }
  function ovn(q, o) { if (!q || q.px == null || !overnight() || !G.tok) return ''; var tk = G.tok[q.sn] || G.tok[String(q.sn || '').replace(/\..*$/, '')]; if (!tk || !tk.px || Date.now() - (tk.t || 0) > 3 * 3600e3 || q.cur && q.cur !== 'USD') return '';
    var d = tk.px - q.px, p = d / q.px * 100, up = d >= 0, f = function (v) { return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var tip = 'Overnight: no free overnight-session (24 Hour Market) quote is available, so this is the ' + q.sn + 'x token (xStocks, trades 24/7) via CoinGecko, compared with the regular-session close $' + f(q.px) + '. Thin liquidity: can differ from the stock. Updated ' + new Date(tk.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET.';
    return '<span class="xh xh-ov' + (o.cls ? ' ' + o.cls : '') + '" title="' + tip + '"><span class="xh-l"><span class="xh-lf">' + q.sn + 'x token 24/7</span><span class="xh-ls">' + q.sn + 'x</span></span> <b class="xh-p">$' + f(tk.px) + '</b> <span class="xh-c ' + (up ? 'up' : 'dn') + '"><span class="xh-d">' + (up ? '+' : '\u2212') + '$' + f(Math.abs(d)) + ' </span>(' + (up ? '+' : '\u2212') + Math.abs(p).toFixed(2) + '% vs close)</span> <small class="xh-src">xStocks via CoinGecko \u00b7 ' + new Date(tk.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET</small> <abbr class="gl" data-gl="xstock" tabindex="0" role="button" aria-label="What is the ' + q.sn + 'x token?">\u24d8</abbr></span>'; }
  function xh(q, o) { o = o || {}; return xh0(q, o) + ovn(q, o); }
  function xh0(q, o) { if (!q || !q.ext || q.ext.px == null || q.px == null || session() === 'open') return ''; var e = q.ext, d = e.px - q.px, p = q.px ? d / q.px * 100 : e.chp, usd = !q.cur || q.cur === 'USD', sym = usd ? '$' : '', up = d >= 0,
      f = function (v) { return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }, lab = e.kind === 'pre' ? 'Pre-market' : 'After hours',
      tip = lab + (e.kind === 'pre' ? ' trading, 4:00\u20139:30 AM ET' : ' trading, 4:00\u20138:00 PM ET') + (e.t ? '. Last extended trade: ' + e.t : '') + (e.vol ? '. Extended-hours volume ' + e.vol : '') + '. Change from the regular-session close ' + sym + f(q.px) + (usd ? '' : ' ' + q.cur) + '. CNBC quote service (may be delayed).';
    return '<span class="xh' + (o.cls ? ' ' + o.cls : '') + '" title="' + tip.replace(/"/g, '&quot;') + '"><span class="xh-l"><span class="xh-lf">' + lab + '</span><span class="xh-ls">' + (e.kind === 'pre' ? 'Pre' : 'AH') + '</span></span> <b class="xh-p">' + sym + f(e.px) + (usd ? '' : ' ' + (q.cur || '')) + '</b> <span class="xh-c ' + (up ? 'up' : 'dn') + '"><span class="xh-d">' + (up ? '+' : '\u2212') + sym + f(Math.abs(d)) + ' </span>(' + (up ? '+' : '\u2212') + Math.abs(p).toFixed(2) + '%)</span>' + (e.vol ? '<span class="xh-v"> \u00b7 vol ' + e.vol + '</span>' : '') + '</span>'; }
  window.BTD_FEED = { on: on, xh: xh, get: function (k) { return Q[k] || G[k] || null; }, watch: watch, session: session, num: num, XS: XS, all: Q, g: G,
    /* treasury ticker -> CNBC symbol (null if the feed has no listing) */
    cn: function (t) { if (!t) return null; t = String(t).toUpperCase(); var m = { 'SWC.L': 'SWC-GB', 'SWC': 'SWC-GB', 'ALCPB.PA': 'ALCPB-FR', 'ADE.DE': 'ADE-DE', 'OBTC3.SA': 'OBTC3-BR', 'MPJPY': 'MPJPY', '3350.T': 'MTPLF' };
      if (m[t]) return m[t]; if (/\.(T)$/.test(t)) return t; if (/\.(HK|NE|SE|ST|AX|TO|V)$/.test(t)) return null; return /^[A-Z0-9]{1,6}$/.test(t) ? t : null; } };
  wsOpen(); cbPoll(); setInterval(cbPoll, 5e3); qSchedule();
  gGlobal(); setInterval(gGlobal, 120e3); setTimeout(gTok, 1500); setInterval(gTok, 120e3); setTimeout(gBreadth, 3000); setInterval(gBreadth, 600e3); setTimeout(gStable, 2000); setInterval(gStable, 900e3);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { qPoll(); cbPoll(); } });
})();
