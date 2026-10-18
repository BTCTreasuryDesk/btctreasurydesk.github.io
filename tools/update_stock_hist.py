#!/usr/bin/env python3
"""Sunday refresh: price history for the home chart overlays, Live Wall and Your Bitcoin calculator.
Writes assets/data/stocks_hist.json: last ~400 trading days daily + weekly closes before that (up to 10y), per ticker.
Source: Yahoo Finance chart API (split-adjusted closes, local currency; overlays compare % change so currency does not matter).
Run: python3 tools/update_stock_hist.py"""
import json, time, urllib.request, datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
# key = Desk ticker (as on the leaderboard), value = Yahoo symbol
SYMS = {'MSTR': 'MSTR', 'XXI': 'XXI', '3350.T': '3350.T', 'MARA': 'MARA', 'ASST': 'ASST', 'BLSH': 'BLSH', 'COIN': 'COIN', 'CLSK': 'CLSK',
        'DJT': 'DJT', 'TSLA': 'TSLA', 'RIOT': 'RIOT', 'HUT': 'HUT', 'XYZ': 'XYZ', 'ABTC': 'ABTC', 'GLXY': 'GLXY', 'NAKA': 'NAKA', 'GME': 'GME', 'MPJPY': 'MPJPY',
        'SWC.L': 'SWC.L', 'ALCPB.PA': 'ALCPB.PA', 'ADE.DE': 'ADE.DE', 'CORZ': 'CORZ', 'KULR': 'KULR',
        'SPX': '^GSPC', 'IXIC': '^IXIC', 'GOLD': 'GC=F', 'STRC': 'STRC', 'STRF': 'STRF', 'STRK': 'STRK', 'STRD': 'STRD', 'SATA': 'SATA', 'DXY': 'DX-Y.NYB'}
out = {'source': 'Yahoo Finance closes (split-adjusted, local currency)', 'as_of': datetime.date.today().isoformat(), 'series': {}}
for k, y in SYMS.items():
    try:
        req = urllib.request.Request(f'https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(y)}?range=10y&interval=1d', headers={'User-Agent': 'Mozilla/5.0'})
        r = json.load(urllib.request.urlopen(req, timeout=30))['chart']['result'][0]
    except Exception as e:
        print('skip', k, e); continue
    pts = {}
    for t, v in zip(r.get('timestamp') or [], r['indicators']['quote'][0]['close']):
        if v is None: continue
        pts[datetime.datetime.fromtimestamp(t + r['meta'].get('gmtoffset', 0), datetime.UTC).date()] = v
    days = sorted(pts)
    if len(days) < 5: print('skip', k, 'short'); continue
    recent, old = days[-400:], days[:-400]
    wk = {}
    for d in old: wk[d.isocalendar()[:2]] = d  # last trading day of each week
    keep = sorted(wk.values()) + recent
    base = keep[0]
    out['series'][k] = {'d0': base.isoformat(), 'o': [(d - base).days for d in keep], 'c': [float('%.5g' % pts[d]) for d in keep], 'cur': r['meta'].get('currency')}
    print(k, len(keep), keep[0], keep[-1], pts[keep[-1]]); time.sleep(0.6)
p = ROOT / 'assets' / 'data' / 'stocks_hist.json'
p.write_text(json.dumps(out, separators=(',', ':')))
print('wrote', p, p.stat().st_size, 'bytes')
