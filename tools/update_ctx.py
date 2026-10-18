#!/usr/bin/env python3
"""Sunday refresh: context references for live tiles (sparklines + 'vs reference' reads).
Writes assets/data/ctx.json keyed by the Desk's quote keys: last 6 daily closes (5D sparkline), close ~1 month (21 sessions) ago,
1-year average / low / high, last 22 closes (1M) and every 5th close over the year (1Y). Source: Yahoo Finance chart API (free). Run: python3 tools/update_ctx.py"""
import json, time, urllib.request, datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
Y = {'.SPX': '^GSPC', '.IXIC': '^IXIC', '.DJI': '^DJI', '.RUT': '^RUT', '.VIX': '^VIX', '.DXY': 'DX-Y.NYB', 'US10Y': '^TNX', 'US5Y': '^FVX', 'US30Y': '^TYX', 'US2Y': '2YY=F',
     '@SP.1': 'ES=F', '@ND.1': 'NQ=F', '@DJ.1': 'YM=F', '@GC.1': 'GC=F', '@SI.1': 'SI=F', '@CL.1': 'CL=F', '@HG.1': 'HG=F', '@NG.1': 'NG=F',
     '.N225': '^N225', '.STOXX': '^STOXX', '.FTSE': '^FTSE', '.GDAXI': '^GDAXI', '.HSI': '^HSI', '.KS11': '^KS11', '.SSEC': '000001.SS', 'EUR=': 'EURUSD=X', 'JPY=': 'JPY=X',
     'BTC': 'BTC-USD', 'ETH': 'ETH-USD', 'SOL': 'SOL-USD'}
for t in 'MSTR MPJPY ASST MARA COIN HOOD CRCL IBIT GLD AVGO AAPL MSFT NVDA GOOGL AMZN META TSLA XXI NAKA SMLR GME RIOT CLSK STRC STRF STRK STRD SATA SPY QQQ'.split(): Y[t] = t
out = {'source': 'Yahoo Finance daily closes', 'as_of': datetime.date.today().isoformat(), 'k': {}}
for k, y in Y.items():
    try:
        req = urllib.request.Request(f'https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(y)}?range=1y&interval=1d', headers={'User-Agent': 'Mozilla/5.0'})
        r = json.load(urllib.request.urlopen(req, timeout=30))['chart']['result'][0]
    except Exception as e:
        print('skip', k, e); continue
    c = [(t, v) for t, v in zip(r.get('timestamp') or [], r['indicators']['quote'][0]['close']) if v is not None]
    if len(c) < 30: print('skip', k, 'short'); continue
    v = [x[1] for x in c]
    yr = datetime.date.today().year; iy = next((i for i, x in enumerate(c) if datetime.datetime.fromtimestamp(x[0], datetime.UTC).year == yr), None)
    ytd = v[max(0, iy - 1):] if iy is not None else None
    if ytd and len(ytd) > 60: ytd = ytd[:1] + ytd[1:][::-1][::3][::-1]
    f = lambda x: float('%.6g' % x)
    out['k'][k] = {'c5': [f(x) for x in v[-6:]], 'd': datetime.datetime.fromtimestamp(c[-1][0], datetime.UTC).date().isoformat(), 'm1': f(v[-22]), 'y': [f(sum(v) / len(v)), f(min(v)), f(max(v))], 'c22': [f(x) for x in v[-22:]], 'w': [f(x) for x in v[::-5][::-1]], 'ytd': [f(x) for x in ytd] if ytd else None}
    time.sleep(0.4)
p = ROOT / 'assets' / 'data' / 'ctx.json'
p.write_text(json.dumps(out, separators=(',', ':')))
print('wrote', p, p.stat().st_size, 'bytes,', len(out['k']), 'keys')
