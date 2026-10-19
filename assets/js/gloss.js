/* Glossary tips (hover on desktop, tap on phone) for key terms, and copy-link buttons on main sections. Self-contained; re-applies after panels re-render. */
(function () {
  'use strict';
  var G = {
    mnav: ['mNAV', 'Enterprise value (market cap + debt + preferred − cash) ÷ Bitcoin NAV (BTC held × BTC price). Strategy’s definition on strategy.com; the Desk’s live figure uses the same method. Above 1x the market values the company above its bitcoin.'],
    yield: ['BTC Yield', 'Strategy KPI: % change over a period in BTC held per assumed diluted share. Positive when bitcoin is added faster than dilution. Not income, and it can be negative.'],
    gain: ['BTC Gain', 'Strategy KPI: BTC held at the start of the period × BTC Yield, i.e. the accretion expressed in bitcoin. BTC $ Gain = BTC Gain × BTC price.'],
    sats: ['sats', 'Satoshis, the base unit of bitcoin: 1 BTC = 100,000,000 sats.'],
    strk: ['STRK (Strike)', 'Strategy perpetual preferred: 8% cumulative dividend on $100 liquidation preference, convertible into MSTR (conversion price $1,000, i.e. 0.1 share each).'],
    strf: ['STRF (Strife)', 'Strategy perpetual preferred: 10% fixed cumulative dividend, non-convertible, senior to the other preferreds. Unpaid dividends compound at a stepped-up rate.'],
    strd: ['STRD (Stride)', 'Strategy perpetual preferred: 10% fixed non-cumulative dividend, non-convertible, junior to STRF and STRK. Higher yield for weaker dividend protection.'],
    strc: ['STRC (Stretch)', 'Strategy variable-rate perpetual preferred: cumulative dividends; Strategy resets the rate to keep shares trading near their $100 stated amount. Short-duration, credit-like exposure.'],
    mayer: ['Mayer Multiple', 'BTC price ÷ its 200-day simple moving average. Trace Mayer’s gauge of distance from trend; readings above ~2.4 have historically marked overheated markets.'],
    mvrv: ['MVRV', 'Market value ÷ realized value (each coin valued at the price it last moved on-chain). A proxy for aggregate unrealized profit; high readings have coincided with cycle tops, below 1 with bottoms.'],
    pi: ['Pi Cycle', 'Pi Cycle Top indicator: fires when the 111-day SMA crosses above 2 × the 350-day SMA. It flagged the 2013, 2017 and April 2021 tops within days; it did not fire at the Nov 2021 high.'],
    fund: ['Funding rate', 'Periodic payment between longs and shorts on perpetual futures that tethers the perp to spot. Positive = longs pay shorts (leveraged long demand); here shown per 8h and annualized (Deribit).'],
    rvol: ['Relative volume', 'Today’s volume ÷ average daily volume (10-day on the Desk tiles). 2x = twice normal activity; intraday readings compare a partial day with a full-day average.']
  };
  var RX = [['mnav', /\bmNAV\b/], ['yield', /\bBTC Yield\b/i], ['gain', /\bBTC (?:\$ )?Gain\b/i], ['sats', /\bsats\b/i], ['strk', /\bSTRK\b/], ['strf', /\bSTRF\b/], ['strd', /\bSTRD\b/], ['strc', /\bSTRC\b/],
    ['mayer', /\bMayer(?: Multiple)?\b/i], ['mvrv', /\bMVRV\b/], ['pi', /\bPi[ -]Cycle\b/i], ['fund', /\b(?:perp )?funding(?: rate)?\b/i], ['rvol', /\b(?:relative volume|rel\.? vol|RVOL|vol [0-9.]+x avg)\b/i]];
  var SKIP = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SCRIPT|STYLE|SVG|CANVAS|OPTION|LABEL|ABBR|CODE)$/;
  var main = document.getElementById('main') || document.querySelector('main'); if (!main) return;
  function wrapIn(sec) {
    var seen = {}; sec.querySelectorAll('.gl').forEach(function (e) { seen[e.dataset.gl] = 1; });
    if (RX.every(function (r) { return seen[r[0]]; })) return;
    var w = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { if (!n.nodeValue || n.nodeValue.length < 3) return 2; for (var p = n.parentNode; p && p !== sec; p = p.parentNode) { if (SKIP.test(p.nodeName.toUpperCase()) || (p.classList && (p.classList.contains('gl') || p.classList.contains('ticker') || p.classList.contains('pk'))) || p.hidden) return 2; } return 1; } }), list = [], n;
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (t) { for (var i = 0; i < RX.length; i++) { var k = RX[i][0]; if (seen[k]) continue; var m = RX[i][1].exec(t.nodeValue); if (!m) continue;
      var after = t.splitText(m.index); after.splitText(m[0].length); var ab = document.createElement('abbr'); ab.className = 'gl'; ab.dataset.gl = k; ab.tabIndex = 0; ab.setAttribute('role', 'button'); ab.setAttribute('aria-label', m[0] + ': definition'); ab.textContent = m[0]; after.parentNode.replaceChild(ab, after); seen[k] = 1; break; } });
  }
  /* copy-link buttons: one per main section with a title row */
  function slug(s) { return String(s || '').toLowerCase().split(':')[0].replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
  function shareIn(sec) { if (sec.querySelector('.shr')) return; var t = sec.querySelector('.p-h .p-t, .p-t'); if (!t) return;
    if (!sec.id) { var s0 = slug(sec.getAttribute('aria-label')); if (!s0 || document.getElementById(s0)) return; sec.id = s0; }
    var b = document.createElement('button'); b.type = 'button'; b.className = 'shr'; b.setAttribute('data-shr', sec.id); b.setAttribute('aria-label', 'Copy link to this section'); b.title = 'Copy link to this section';
    b.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M6.5 9.5l3-3M7 4.5l1.2-1.2a2.6 2.6 0 013.7 3.7L10.7 8.2M9 11.5l-1.2 1.2a2.6 2.6 0 01-3.7-3.7L5.3 7.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    t.parentNode.insertBefore(b, t.nextSibling); }
  function scan() { main.querySelectorAll(':scope > section').forEach(function (s) { if (s.classList.contains('legacy')) return; try { wrapIn(s); shareIn(s); } catch (e) {} }); }
  var pend = 0; function later() { if (pend) return; pend = setTimeout(function () { pend = 0; scan(); }, 1200); }
  if ('MutationObserver' in window) new MutationObserver(later).observe(main, { childList: true, subtree: true });
  setTimeout(scan, 800);
  /* tip + toast */
  var tip = null, cur = null, coarse = window.matchMedia && window.matchMedia('(hover: none)').matches;
  function hide() { if (tip) tip.hidden = true; cur = null; }
  function show(el) { var d = G[el.dataset.gl]; if (!d) return; if (!tip) { tip = document.createElement('div'); tip.className = 'gl-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    tip.innerHTML = '<b>' + d[0] + '</b>' + d[1] + ' <a href="/glossary/">Glossary</a>'; tip.hidden = false; cur = el;
    var r = el.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 16); tip.style.width = w + 'px'; tip.style.left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8)) + 'px';
    var h = tip.offsetHeight, top = r.bottom + 6; if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6); tip.style.top = top + 'px'; }
  function toast(msg) { var t = document.createElement('div'); t.className = 'shr-toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.classList.add('out'); }, 1400); setTimeout(function () { t.remove(); }, 1800); }
  function copy(txt) { if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt); return new Promise(function (ok, no) { var a = document.createElement('textarea'); a.value = txt; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy') ? ok() : no(); } catch (e) { no(); } a.remove(); }); }
  window.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('.gl');
    if (g) { e.preventDefault(); e.stopPropagation(); if (cur === g) hide(); else show(g); return; }
    var cp = e.target.closest && e.target.closest('.spk-cp'); if (cp) { e.preventDefault(); e.stopPropagation(); cp.classList.toggle('sh'); return; }
    var s = e.target.closest && e.target.closest('[data-shr]');
    if (s) { e.preventDefault(); e.stopPropagation(); var u = location.origin + location.pathname + '#' + s.getAttribute('data-shr'); copy(u).then(function () { toast('Link copied'); }, function () { toast(u); }); return; }
    if (tip && !tip.hidden && !(e.target.closest && e.target.closest('.gl-tip'))) hide();
  }, true);
  if (!coarse) { document.addEventListener('mouseover', function (e) { var g = e.target.closest && e.target.closest('.gl'); if (g && g !== cur) show(g); else if (!g && cur && !(e.target.closest && e.target.closest('.gl-tip'))) hide(); }); }
  document.addEventListener('keydown', function (e) { var g = document.activeElement; if ((e.key === 'Enter' || e.key === ' ') && g && g.classList && g.classList.contains('gl')) { e.preventDefault(); cur === g ? hide() : show(g); } else if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', function () { if (cur && !coarse) hide(); }, { passive: true });
})();
/* Scrolling strips (price scroll, headlines): static and swipeable by default. A strip's play button starts it; at most one strip moves at a time (playing one stops the other), one shared speed. Saved in 'btd_scroll' = 'ticker' | 'hl' (new key: every existing visitor starts static). Hover or touch pauses while playing. Reduced motion: always static. My Alts is a static swipe row. */
(function () {
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, H = document.documentElement;
  function which() { try { var v = localStorage.getItem('btd_scroll'); return !RM && (v === 'ticker' || v === 'hl') ? v : ''; } catch (e) { return ''; } }
  function id(s) { return s.classList.contains('ticker') ? 'ticker' : 'hl'; }
  function apply() { var w = which(); document.querySelectorAll('.ticker, .tk-hl').forEach(function (s) { var on = w === id(s); s.classList.toggle('strip-static', !on); var b = s.querySelector(':scope > .strip-pp'); if (!b) return;
      b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', on ? 'Pause scrolling' : 'Play scrolling'); b.title = on ? 'Pause (remembered)' : 'Auto-scroll this strip (only one strip moves at a time; remembered)'; b.innerHTML = on ? '&#10074;&#10074;' : '&#9654;'; }); }
  function ensure() { document.querySelectorAll('.ticker, .tk-hl').forEach(function (s) { if (s.querySelector(':scope > .strip-pp')) return; if (!RM) { var b = document.createElement('button'); b.type = 'button'; b.className = 'strip-pp'; s.appendChild(b); }
      s.addEventListener('touchstart', function () { if (which() !== id(s)) return; s.classList.add('strip-hold'); clearTimeout(s._ht); s._ht = setTimeout(function () { s.classList.remove('strip-hold'); }, 4000); }, { passive: true }); }); apply(); }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.strip-pp'); if (!b) return; e.preventDefault(); e.stopPropagation(); var me = id(b.parentNode); try { localStorage.setItem('btd_scroll', which() === me ? 'off' : me); } catch (x) {} apply(); }, true);
  ensure(); setTimeout(ensure, 500); setInterval(ensure, 3000);
})();
