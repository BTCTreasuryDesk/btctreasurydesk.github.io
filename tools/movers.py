#!/usr/bin/env python3
"""Movers & Makers: flags the board's top-50 treasury companies making waves this week, with a one-line 'why it stands out'.
Inputs: assets/data/perf.json (tools/update_perf.py: 1W/1M moves, 52-week range, 200-day MA state; Yahoo daily closes) and
desk.json treasuries.rows vs treasuries.prev (reported BTC holdings changes). Writes assets/data/movers.json (full ranked list,
read by the home card and Members) and desk.json -> movers_week (top 3, for the Sunday episode segment). Neutral wording only.
Run after update_perf.py:  python3 tools/movers.py"""
import json, pathlib, datetime
ROOT = pathlib.Path(__file__).resolve().parent.parent
D = json.loads((ROOT / 'assets/data/desk.json').read_text()); P = json.loads((ROOT / 'assets/data/perf.json').read_text())
T = D['treasuries']; rows = sorted(T['rows'], key=lambda r: -r['btc'])[:50]
prev = {k: v['btc'] for k, v in ((T.get('prev') or {}).get('rows') or {}).items()}
bw, bm = P.get('btc', {}).get('w1'), P.get('btc', {}).get('m1')
def f(x): return f"{'+' if x >= 0 else '−'}{abs(x):.0f}%"
out = []
for r in rows:
    q = P['q'].get(r['tk']); fl = []
    if q:
        w1, m1, c = q.get('w1'), q.get('m1'), q['c']
        if (m1 is not None and abs(m1) > 80) or (w1 is not None and abs(w1) > 60) or (q.get('y1') is not None and q['y1'] <= -98): q = None  # likely split / ticker change: skip price flags rather than mislead
    if q:
        if w1 is not None and abs(w1) >= 10: fl.append((abs(w1) * 2.2, 'move', f"{f(w1)} in a week" + (f" (BTC {f(bw)})" if bw is not None else '')))
        if m1 is not None and abs(m1) >= 20: fl.append((abs(m1) * 0.8, 'move', f"{f(m1)} in a month" + (f" (BTC {f(bm)})" if bm is not None else '')))
        if q.get('hi52') and c >= q['hi52'] * 0.995: fl.append((40, 'high', 'At a new 52-week high'))
        if q.get('lo52') and c <= q['lo52'] * 1.005: fl.append((35, 'low', 'At a new 52-week low'))
        if q.get('cross200'): fl.append((30, 'trend', 'Crossed ' + ('above' if q['cross200'] == 'up' else 'below') + ' its 200-day average this week'))
        if m1 is not None and bm is not None:
            rs = ((1 + m1 / 100) / (1 + bm / 100) - 1) * 100
            if abs(rs) >= 15: fl.append((abs(rs) * 0.7, 'rs', ('Outpaced' if rs > 0 else 'Lagged') + f" BTC by {abs(rs):.0f} pts over a month"))
    p0 = prev.get(r['tk'])
    if p0 is not None and r['btc'] > p0:
        add = r['btc'] - p0
        if add >= 1000 or add / max(p0, 1) >= 0.05: fl.append((min(60, 20 + add / 200), 'buy', f"Reported +{add:,.0f} BTC this week (now {r['btc']:,.0f})"))
    if not fl: continue
    fl.sort(key=lambda x: -x[0]); sc = fl[0][0] + 0.25 * sum(x[0] for x in fl[1:])
    out.append({'tk': r['tk'], 'name': r['name'], 'rank': r['rank'], 'btc': r['btc'], 'score': round(sc, 1), 'why': fl[0][2], 'flags': [{'k': x[1], 't': x[2]} for x in fl],
                'w1': q.get('w1') if q else None, 'm1': q.get('m1') if q else None})
out.sort(key=lambda x: -x['score'])
M = {'as_of': P['as_of'], 'price_as_of': max((v['d'] for v in P['q'].values()), default=None), 'btc': P.get('btc'), 'source': 'Yahoo Finance daily closes (perf.json) + reported holdings (desk.json treasuries vs last week)',
     'note': 'Flags: |1W| >= 10%, |1M| >= 20%, new 52-week high/low (within 0.5%), 200-day average cross in the last 5 sessions, 1M relative strength vs BTC >= 15 pts, reported BTC additions >= 1,000 BTC or +5%. Ranked by strongest flag. Descriptive only.', 'items': out}
(ROOT / 'assets/data/movers.json').write_text(json.dumps(M, ensure_ascii=False, separators=(',', ':')))
D['movers_week'] = {'_note': 'Written by tools/movers.py each Sunday: the top 3 Movers & Makers for the episode segment. Descriptive, no advice.', 'as_of': M['as_of'],
                    'items': [{'tk': x['tk'], 'name': x['name'], 'why': x['why'], 'also': [y['t'] for y in x['flags'][1:3]]} for x in out[:3]]}
(ROOT / 'assets/data/desk.json').write_text(json.dumps(D, indent=2, ensure_ascii=False) + '\n')
print(len(out), 'flagged;', [(x['tk'], x['why']) for x in out[:5]])
