/* BTC Treasury Desk: News of the Week (home card + /news/ archive). Weekly, from desk.json news_week and news_archive.json. Material items only, each dated and sourced. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var CATS = [['strategy', 'Strategy & Saylor'], ['treasury', 'Other treasury companies'], ['industry', 'Industry & Bitcoin']]; function cat(x) { return x.cat === 'bitcoin' ? 'industry' : x.cat; } // empty groups are hidden
  var CL = { bitcoin: 'Industry & Bitcoin' }; CATS.forEach(function (c) { CL[c[0]] = c[1]; });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dl(iso) { return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); }
  function safe(u) { return /^https:\/\//.test(u || '') ? u : '#'; }
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function src(it) { return '<a href="' + esc(safe(it.src && it.src.url)) + '" target="_blank" rel="noopener">' + esc(it.src ? it.src.name : 'source') + ' &#8599;</a>'; }
  function why(it) { return it.why ? '<span class="nw-why"><b>Why it matters for holders:</b> ' + esc(it.why) + '</span>' : ''; }
  function li(it, chip) {
    return '<li class="nw-i"><span class="nw-d mono">' + esc(dl(it.date)) + '</span>' + (chip ? '<span class="nw-c nw-' + esc(it.cat) + '">' + esc(CL[it.cat] || it.cat) + '</span>' : '') +
      '<span class="nw-t">' + esc(it.text) + ' ' + src(it) + why(it) + '</span></li>';
  }
  function lead(it) {
    return '<div class="nw-lead"><span class="nw-k">Top story</span><span class="nw-c nw-' + esc(it.cat) + '">' + esc(CL[it.cat] || it.cat) + '</span><span class="nw-d mono">' + esc(dl(it.date)) + '</span>' +
      '<p class="nw-lt">' + esc(it.text) + ' ' + src(it) + '</p>' + why(it) + '</div>';
  }
  /* On deck next week: desk.json week_ahead items in the 7 days after as_of, plus earnings / votes / dividend dates up to 3 weeks out */
  var MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  function onDeck(D, W) {
    var A = D.week_ahead || [], t0 = Date.parse((W.as_of || D.updated) + 'T12:00:00Z'), y = new Date(t0).getUTCFullYear(), out = [];
    A.forEach(function (x) { var m = /([A-Z][a-z]{2}) (\d{1,2})/.exec(x.d || ''); if (!m || MON[m[1]] == null) return; var t = Date.UTC(y, MON[m[1]], +m[2], 12); if (t < t0 - 864e5 * 180) t = Date.UTC(y + 1, MON[m[1]], +m[2], 12);
      var dd = (t - t0) / 864e5, key = /earnings|vote|meeting|dividend|record|ex-div|decision|CPI|FOMC/i.test(x.e);
      if (dd > 0 && t > Date.now() - 864e5 && (dd <= 7 || (key && dd <= 21))) out.push({ t: t, d: x.d, e: x.e.split(/; |\. /)[0].replace(/,? *\d{1,2}:\d{2} ?[AP]M ET.*$/, '').trim() }); });
    out.sort(function (a, b) { return a.t - b.t; });
    return out.length ? '<p class="nw-deck"><b>On deck next week</b> ' + out.slice(0, 6).map(function (x) { return '<span><i class="mono">' + esc(x.d.replace(/^[A-Z][a-z]{2} /, '')) + '</i> ' + esc(x.e) + '</span>'; }).join('') + '</p>' : '';
  }
  function grouped(items) {
    return CATS.map(function (c) { var g = items.filter(function (x) { return cat(x) === c[0]; }); if (!g.length) return '';
      return '<div class="nw-g"><h4 class="nw-h nw-' + c[0] + '">' + esc(c[1]) + '</h4><ul class="nw-l">' + g.map(function (x) { return li(x, false); }).join('') + '</ul></div>'; }).join('');
  }
  function weekLbl(W) { return 'Week of ' + esc(W.label || W.week_of); }
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }

  var home = $('[data-news-week]');
  if (home) J('/assets/data/desk.json').then(function (D) {
    var W = D.news_week; if (!W || !W.items || !W.items.length) { home.hidden = true; return; }
    var items = W.items.slice(0, 8), L = items.filter(function (x) { return x.lead; })[0] || items[0], rest = items.filter(function (x) { return x !== L; });
    var top = rest.filter(function (x) { return x.top; }).slice(0, 2); if (top.length < 2) top = top.concat(rest.filter(function (x) { return top.indexOf(x) < 0; })).slice(0, 2);
    var ord = function (c) { for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === c) return i; return 9; };
    top.sort(function (a, b) { return ord(cat(a)) - ord(cat(b)); });
    var open = LS.get('btd_news_open') === '1';
    home.innerHTML = '<div class="p-h"><span class="p-t">News of the Week</span><span class="tag nw-wk">' + weekLbl(W) + '</span><a class="more" href="/news/">Past weeks &rarr;</a></div>' + lead(L) +
      '<div class="nw-top"' + (open ? ' hidden' : '') + '><ul class="nw-l">' + top.map(function (x) { return li(x, true); }).join('') + '</ul></div>' +
      '<div class="nw-all" id="nw-all"' + (open ? '' : ' hidden') + '>' + grouped(rest) + '</div>' + onDeck(D, W) +
      '<div class="nw-f"><button type="button" class="chip nw-tg" aria-expanded="' + open + '" aria-controls="nw-all">' + (open ? 'Show less &#9652;' : 'Show all ' + items.length + ' &#9662;') + '</button>' +
      '<span class="muted">Official sources first · updated Sundays · education only</span></div>';
    var b = $('.nw-tg', home);
    b.addEventListener('click', function () { open = !open; LS.set('btd_news_open', open ? '1' : '0'); $('.nw-top', home).hidden = open; $('.nw-all', home).hidden = !open;
      b.setAttribute('aria-expanded', open); b.innerHTML = open ? 'Show less &#9652;' : 'Show all ' + items.length + ' &#9662;'; });
  }).catch(function () { home.hidden = true; });

  function archWeek(W) { var it = W.items || [], L = it.filter(function (x) { return x.lead; })[0]; return (L ? lead(L) : '') + grouped(it.filter(function (x) { return x !== L; })); }
  var arch = $('[data-news-archive]');
  if (arch) Promise.all([J('/assets/data/desk.json'), J('/assets/data/news_archive.json').catch(function () { return { weeks: [] }; })]).then(function (r) {
    var weeks = (r[0].news_week ? [r[0].news_week] : []).concat(r[1].weeks || []);
    arch.innerHTML = weeks.map(function (W, i) { return '<section class="nw-wkb"><h2>' + weekLbl(W) + (i === 0 ? ' <span class="nw-now">this week</span>' : '') + '</h2>' + archWeek(W) + '</section>'; }).join('') +
      (weeks.length < 2 ? '<p class="muted">The archive starts with the week of Oct 5 – 11, 2026. Each Sunday the previous week moves here.</p>' : '');
  }).catch(function () { arch.innerHTML = '<p>Could not load the archive right now.</p>'; });
})();
