/* Reset view: clears saved Desk view settings (charts, ranges, types, sync, chart lines, tiles, scroll, caches) and reloads fresh.
   Kept: Members login/paid flag, email signup state, Your Bitcoin holdings, planner inputs, price alerts. */
(function () {
  var KEEP = /^btd_(member|paid|optin|mem_|pl_|yb|ybp|alerts|al_notify)/;
  function reset() {
    if (!confirm('Reset all your saved views?\n\nCharts go back to BTC + MSTR, 1D, Candles. Your Members login, email signup, holdings and price alerts are kept.')) return;
    try { Object.keys(localStorage).forEach(function (k) { if (/^btd_/.test(k) && !KEEP.test(k)) localStorage.removeItem(k); }); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    location.replace(location.pathname + '?fresh=' + Date.now());
  }
  window.BTD_RESET = reset;
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-reset]'); if (!b) return; e.preventDefault(); e.stopPropagation(); reset(); }, true);
})();
