#!/usr/bin/env python3
"""Strategy preferreds (STRC/STRF/STRK/STRD/STRE) from strategy.com's own KPI JSON (api.strategy.com/btc/<t>KpiData, the data behind strategy.com/<t>):
stated dividend rate, effective yield, notional, next record/payout dates, STRC rate history; plus a 1Y daily effective-yield series built from
assets/data/stocks_hist.json closes / the rate in effect on each day (STRC: its monthly rate history). Writes assets/data/prefs_kpi.json.
Real data only: a field strategy.com doesn't publish is left out.  Run weekly: python3 tools/update_prefs_kpi.py"""
import json, urllib.request, datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
H = {'User-Agent': 'Mozilla/5.0', 'Origin': 'https://www.strategy.com', 'Referer': 'https://www.strategy.com/'}
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=30))
hist = json.loads((ROOT / 'assets/data/stocks_hist.json').read_text())['series']
out = {'as_of': datetime.date.today().isoformat(), 'src': {'name': 'strategy.com (preferred stock pages)', 'url': 'https://www.strategy.com/'}, 'p': {}}
for t in ['STRC', 'STRF', 'STRK', 'STRD', 'STRE']:
    try: d = get(f'https://api.strategy.com/btc/{t.lower()}KpiData')[0]
    except Exception as e: print(t, 'skip', e); continue
    rate = d.get('currentDividend')
    if rate is None: print(t, 'no rate'); continue
    r = {'rate': rate, 'eff': d.get('effYield'), 'price': d.get('ufPrice'), 'px_ts': d.get('timeStamp'), 'notional_musd': round(d['notional'] / 1e6, 1) if d.get('notional') else None,
         'next_record': d.get('nextRecordDate'), 'next_pay': d.get('nextPayoutDate'), 'url': f'https://www.strategy.com/{t.lower()}', 'cur': 'EUR' if t == 'STRE' else 'USD'}
    dh = d.get('dividendHistory') or []
    if dh: r['rate_hist'] = [[x['recordDate'], x['rate']] for x in dh if x.get('rate') is not None]
    S = hist.get(t)
    if S:
        d0 = datetime.date.fromisoformat(S['d0']); last = d0 + datetime.timedelta(days=S['o'][-1]); start = last - datetime.timedelta(days=372)
        RH = r.get('rate_hist') if t == 'STRC' else None
        def rate_on(day):
            if not RH: return rate
            for rd, rt in RH:
                if rd >= day: return rt
            return RH[-1][1]
        ser = []
        for o, c in zip(S['o'], S['c']):
            day = d0 + datetime.timedelta(days=o)
            if day >= start and c: ser.append([day.isoformat(), c, round(rate_on(day.isoformat()) * 100 / c, 3)])
        r['series'] = ser
    out['p'][t] = r; print(t, rate, r.get('eff'), len(r.get('series', [])))
(ROOT / 'assets/data/prefs_kpi.json').write_text(json.dumps(out, separators=(',', ':')) + '\n')
