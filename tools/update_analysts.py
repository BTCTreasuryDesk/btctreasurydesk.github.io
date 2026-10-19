#!/usr/bin/env python3
"""Weekly Analyst Views snapshot -> assets/data/analysts.json.
Consensus from Nasdaq.com's public analyst API (counts of buy/hold/sell, average/low/high 12-month price target, monthly consensus history).
Covers US-listed bitcoin treasury companies (pure-play + miners) from the Treasury Board top 20, plus ASST. Shown only with 3+ analysts.
Notable notes (firm actions) are curated by hand in NOTES below from public reports, each with date + source link. Never invent.
Keeps one snapshot per week (date -> per-ticker consensus) so the page can show how views change. Run: python3 tools/update_analysts.py"""
import json, urllib.request, datetime, pathlib, time, re, html
ROOT = pathlib.Path(__file__).resolve().parent.parent; OUT = ROOT / 'assets/data/analysts.json'
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept': 'application/json'}
MIN_ANALYSTS = 3
# Curated notable notes (public reports only). Keep ~3-6 recent per company; drop ones older than ~2 months.
NOTES = {
  'MSTR': [
    {'date': '2026-10-16', 'firm': 'Cantor Fitzgerald', 'action': 'Price target raised', 'rating': 'Overweight', 'from': 186, 'to': 208, 'note': 'Q3 preview: says FinTech and digital asset companies have largely calibrated Q3 expectations well.',
     'src': 'TipRanks (TheFly)', 'url': 'https://www.tipranks.com/news/the-fly/strategy-price-target-raised-to-208-from-186-at-cantor-fitzgerald-thefly-news'},
    {'date': '2026-10-09', 'firm': 'Barclays', 'action': 'Price target raised', 'rating': 'Overweight', 'from': 160, 'to': 175, 'note': 'Part of its Q3 fintech earnings preview.',
     'src': 'TipRanks', 'url': 'https://www.tipranks.com/news/strategy-stock-mstr-rises-as-barclays-raises-price-target-to-175-heres-why'},
    {'date': '2026-10-08', 'firm': 'TD Cowen', 'action': 'Target kept', 'rating': 'Buy', 'from': 260, 'to': 260, 'note': 'Raised its bitcoin forecasts but kept the $260 target, citing dilution and financial obligations as limits on upside for shareholders.',
     'src': 'The Block', 'url': 'https://www.theblock.co/news/markets/2026-10-08-strategy-shareholders-face-dilution-drag-despite-brighter-bitcoin-forecasts-td-cowen-418066'},
    {'date': '2026-10-01', 'firm': 'Citigroup', 'action': 'Price target raised', 'rating': 'Buy', 'from': 136, 'to': 240, 'note': 'After lifting its 12-month bitcoin forecast to about $113K.',
     'src': 'The Crypto Times (Citi note summary)', 'url': 'https://www.cryptotimes.io/2026/10/02/citigroup-raises-strategy-mstr-price-target-to-240-on-higher-bitcoin-forecast/'},
  ],
}
def fetch(tk):
    j = json.load(urllib.request.urlopen(urllib.request.Request('https://api.nasdaq.com/api/analyst/%s/targetprice' % tk, headers=UA), timeout=20))
    d = (j or {}).get('data') or {}; c = d.get('consensusOverview') or {}
    n = sum(int(c.get(k) or 0) for k in ('buy', 'hold', 'sell'))
    if not c or not c.get('priceTarget'): return None
    hist = [{'d': datetime.datetime.strptime(h['z']['date'], '%m/%d/%Y').date().isoformat(), 'buy': h['z'].get('buy'), 'hold': h['z'].get('hold'), 'sell': h['z'].get('sell'), 'cons': h['z'].get('consensus')}
            for h in (d.get('historicalConsensus') or []) if h.get('z') and h['z'].get('date')]
    cons = hist[-1]['cons'] if hist else None
    return {'n': n, 'buy': int(c.get('buy') or 0), 'hold': int(c.get('hold') or 0), 'sell': int(c.get('sell') or 0), 'cons': cons,
            'pt': c.get('priceTarget'), 'lo': c.get('lowPriceTarget'), 'hi': c.get('highPriceTarget'), 'hist': hist[-13:]}
def firm_actions(ex, tk):
    """Per-firm rating actions from MarketBeat's public forecast page (date, firm, action, rating old->new, target old->new). One request per company per week."""
    url = 'https://www.marketbeat.com/stocks/%s/%s/forecast/' % (ex, tk)
    s = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA['User-Agent']}), timeout=25).read().decode('utf-8', 'ignore')
    k = s.find('data-clean="Old Price Target|New Price Target"')
    if k < 0: return url, []
    tb = s[s.find('<tbody>', k):s.find('</tbody>', k)]; out = []
    txt = lambda c: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', c))).strip()
    num = lambda v: (float(v.replace('$', '').replace(',', '')) if v and re.match(r'^\$?[\d,.]+$', v) and float(v.replace('$', '').replace(',', '')) > 0 else None)
    for r in re.findall(r'<tr[^>]*>(.*?)</tr>', tb, re.S):
        tds = re.findall(r'<td([^>]*)>(.*?)</td>', r, re.S)
        if len(tds) < 6: continue
        attr = lambda i, a: (re.search(a + r'="([^"]*)"', tds[i][0]) or [None, ''])[1]
        ds = attr(0, 'data-sort-value')[:8]
        if not re.match(r'^\d{8}$', ds): continue
        firm = html.unescape(attr(1, 'data-clean').split('|')[0]).strip(); action = txt(tds[3][1])
        ro, rn = (html.unescape(attr(4, 'data-clean')) + '|').split('|')[:2]; po, pn = (attr(5, 'data-clean') + '|').split('|')[:2]
        if not firm: continue
        out.append({'date': '%s-%s-%s' % (ds[:4], ds[4:6], ds[6:]), 'firm': firm, 'action': action, 'r_from': ro if ro not in ('', 'N/A') else None, 'rating': rn if rn not in ('', 'N/A') else None,
                    'pt_from': num(po), 'pt': num(pn)})
    return url, out
def kind(a):
    t = (a['action'] or '').lower()
    if 'initiat' in t: return 'init'
    if 'upgrade' in t: return 'up'
    if 'downgrade' in t: return 'down'
    if a.get('pt') and a.get('pt_from') and a['pt'] != a['pt_from']: return 'pt_up' if a['pt'] > a['pt_from'] else 'pt_down'
    if a.get('pt') and not a.get('pt_from'): return 'pt_new'
    return 'reit'
def pt_history(actions, weeks=52):
    """Average of each firm's latest published target, as of each week (rebuilt from dated actions; firms whose last target is >12 months old drop out)."""
    acts = sorted([a for a in actions if a.get('pt')], key=lambda a: a['date']); today = datetime.date.today(); H = []
    for w in range(weeks, -1, -1):
        d = today - datetime.timedelta(days=7 * w); ds = d.isoformat(); cut = (d - datetime.timedelta(days=365)).isoformat(); last = {}
        for a in acts:
            if a['date'] <= ds: last[a['firm']] = a
        v = [a['pt'] for a in last.values() if a['date'] >= cut]
        if len(v) >= MIN_ANALYSTS: H.append({'d': ds, 'avg': round(sum(v) / len(v), 2), 'n': len(v)})
    return H
def main():
    desk = json.load(open(ROOT / 'assets/data/desk.json')); rows = desk['treasuries']['rows']
    names = {r['tk']: r['name'] for r in rows}
    pick = [r['tk'] for r in rows[:20] if r.get('tv', '').split(':')[0] in ('NASDAQ', 'NYSE', 'AMEX') and r.get('type') in ('treasury', 'miner')]
    if 'ASST' not in pick: pick.append('ASST')
    if 'MSTR' in pick: pick.remove('MSTR')
    pick = ['MSTR'] + pick
    old = json.load(open(OUT)) if OUT.exists() else {'snapshots': []}
    today = datetime.date.today().isoformat(); cos = {}
    for tk in pick:
        try: x = fetch(tk)
        except Exception as e: print('skip', tk, e); x = None
        time.sleep(0.6)
        if x and (x['n'] >= MIN_ANALYSTS or tk == 'MSTR'):
            x['name'] = names.get(tk, tk); x['pt'], x['lo'], x['hi'] = [round(v, 2) if v else v for v in (x['pt'], x['lo'], x['hi'])]
            ex = next((r['tv'].split(':')[0] for r in rows if r['tk'] == tk), 'NASDAQ')
            try: url, acts = firm_actions(ex, tk)
            except Exception as e: print('no firm actions', tk, e); url, acts = None, []
            time.sleep(1.5)
            yr = (datetime.date.today() - datetime.timedelta(days=365)).isoformat(); acts = [a for a in acts if a['date'] >= yr]
            for a in acts: a['kind'] = kind(a)
            latest = {}
            for a in sorted(acts, key=lambda a: a['date']): latest[a['firm']] = a
            x['firms'] = sorted(latest.values(), key=lambda a: a['date'], reverse=True); x['actions_src'] = url
            x['pt_hist'] = pt_history(acts)
            cos[tk] = x; print(tk, x['n'], x['cons'], x['pt'], x['lo'], x['hi'], 'firms', len(x['firms']), 'hist', len(x['pt_hist']))
        else: print('no coverage', tk)
    snaps = [s for s in old.get('snapshots', []) if s['date'] != today]
    snaps.append({'date': today, 'cos': {k: {f: v[f] for f in ('n', 'buy', 'hold', 'sell', 'cons', 'pt', 'lo', 'hi')} for k, v in cos.items()}})
    snaps = snaps[-26:]  # half a year of weekly snapshots
    out = {'_note': 'Third-party analyst views (not ours). Consensus: Nasdaq.com analyst API, refreshed weekly. Notes: curated public reports with source links. Education only.',
           'as_of': today, 'source': 'Nasdaq.com analyst research (consensus price targets and ratings)', 'source_url': 'https://www.nasdaq.com/market-activity/stocks/mstr/analyst-research',
           'actions_source': 'MarketBeat (public analyst ratings by firm)', 'min_analysts': MIN_ANALYSTS, 'order': list(cos.keys()), 'cos': cos, 'notes': NOTES, 'snapshots': snaps}
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False)); print('wrote', OUT, len(cos), 'companies')
if __name__ == '__main__': main()
