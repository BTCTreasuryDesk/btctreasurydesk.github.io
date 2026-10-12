#!/usr/bin/env python3
"""Sunday refresh: YTD and 1-year price performance for every Treasury Board company (Company Compare).
Writes assets/data/perf.json. Source: Yahoo Finance chart API daily closes (split-adjusted; local currency for non-US listings).
Run:  python3 tools/update_perf.py   (after desk.json treasuries are updated)"""
import json, time, urllib.request, datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
D = json.loads((ROOT / 'assets/data/desk.json').read_text())
SUF = {'HKEX': '.HK', 'TSE': '.T', 'BMFBOVESPA': '.SA', 'XETR': '.DE', 'EURONEXT': '.PA', 'LSE': '.L', 'NGM': '.ST'}
OVR = {'MPJPY': ('3350.T', 'Tokyo 3350 (JPY); the US ADR MPJPY is too new for a 1-year history.')}
NOTES = {'XXI': 'Listed Dec 2025; earlier history is the SPAC (Cantor Equity Partners).',
         'ASST': 'Before the Sep 2025 merger this ticker traded as Asset Entities.'}
def ysym(r):
    if r['tk'] in OVR: return OVR[r['tk']][0]
    tv = r.get('tv')
    if not tv: return None
    ex, s = tv.split(':')
    if ex == 'HKEX': s = s.zfill(4)
    return s + SUF.get(ex, '')
out = {'source': 'Yahoo Finance daily closes (split-adjusted; local currency for non-US listings)', 'source_url': 'https://finance.yahoo.com/',
       'as_of': datetime.date.today().isoformat(), 'q': {}}
for r in D['treasuries']['rows']:
    s = ysym(r)
    if not s: continue
    try:
        req = urllib.request.Request(f'https://query1.finance.yahoo.com/v8/finance/chart/{s}?range=2y&interval=1d', headers={'User-Agent': 'Mozilla/5.0'})
        x = json.load(urllib.request.urlopen(req, timeout=30))['chart']['result'][0]
        pts = [(datetime.datetime.utcfromtimestamp(t).date(), v) for t, v in zip(x['timestamp'], x['indicators']['quote'][0]['close']) if v]
        last_d, last = pts[-1]
        y0 = [v for d, v in pts if d.year < last_d.year]
        a1 = last_d.replace(year=last_d.year - 1)
        y1 = [v for d, v in pts if d <= a1]
        q = {'sym': s, 'cur': x['meta'].get('currency'), 'd': last_d.isoformat(), 'c': round(last, 4),
             'ytd': round(last / y0[-1] * 100 - 100, 1) if y0 else None,
             'y1': round(last / y1[-1] * 100 - 100, 1) if y1 else None, 'first': pts[0][0].isoformat()}
        n = (OVR.get(r['tk']) or (None, None))[1] or NOTES.get(r['tk'])
        if n: q['note'] = n
        out['q'][r['tk']] = q; print(r['tk'], s, q['ytd'], q['y1'])
    except Exception as e:
        print('skip', r['tk'], s, e)
    time.sleep(0.6)
(ROOT / 'assets/data/perf.json').write_text(json.dumps(out, separators=(',', ':')))
print('wrote perf.json', len(out['q']), 'tickers')
