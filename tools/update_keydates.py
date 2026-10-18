#!/usr/bin/env python3
"""Key dates (weekly): FOMC decision days (federalreserve.gov FOMC calendar), CPI and Employment Situation release dates (bls.gov release schedules,
via headless Chrome since BLS blocks plain HTTP clients), and Strategy preferred record/payout dates (assets/data/prefs_kpi.json, from strategy.com).
Writes assets/data/keydates.json. Only official dates; nothing estimated.  Run: python3 tools/update_keydates.py (after update_prefs_kpi.py)"""
import json, re, datetime, pathlib, urllib.request
ROOT = pathlib.Path(__file__).resolve().parent.parent; today = datetime.date.today()
M = {m: i for i, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], 1)}
ev = []
t = urllib.request.urlopen(urllib.request.Request('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read().decode('utf-8', 'ignore')
for y in (today.year, today.year + 1):
    i = t.find(f'{y} FOMC Meetings'); j = t.find(f'{y - 1} FOMC Meetings')
    if i < 0: continue
    seg = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', t[i:j if j > i else i + 30000]))
    for mo, d1, d2 in re.findall(r'(January|February|March|April|May|June|July|August|September|October|November|December)(?:/\w+)? (\d+)-(\d+)\*?', seg):
        m = M[mo] + (1 if int(d2) < int(d1) else 0); d = datetime.date(y, m, int(d2))
        if d >= today: ev.append({'date': d.isoformat(), 'time': '2:00 PM ET', 'kind': 'macro', 'title': 'FOMC rate decision', 'detail': f'Meeting {mo} {d1}-{d2}; statement 2:00 PM ET, press conference 2:30 PM ET', 'source': 'Federal Reserve FOMC calendar', 'url': 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'})
from playwright.sync_api import sync_playwright
MO = {m[:3]: i for m, i in M.items()}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--disable-blink-features=AutomationControlled'])
    pg = b.new_context(user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36').new_page()
    for code, title, nm in [('cpi', 'CPI inflation report', 'Consumer Price Index'), ('empsit', 'Jobs report (nonfarm payrolls)', 'Employment Situation')]:
        u = f'https://www.bls.gov/schedule/news_release/{code}.htm'; pg.goto(u, wait_until='domcontentloaded', timeout=45000); pg.wait_for_timeout(2500); tx = pg.inner_text('body')
        for ref, dd, tm in re.findall(r'([A-Z][a-z]+ \d{4})\s+(\w{3})\.? (\d{1,2}), (\d{4})\s+(\d\d:\d\d [AP]M)'.replace(r'(\w{3})\.? (\d{1,2}), (\d{4})', r'(\w{3}\.? \d{1,2}, \d{4})'), tx):
            mm, d, y = re.match(r'(\w{3})\.? (\d{1,2}), (\d{4})', dd).groups(); day = datetime.date(int(y), MO[mm], int(d))
            if day >= today: ev.append({'date': day.isoformat(), 'time': tm.lstrip('0') + ' ET', 'kind': 'macro', 'title': title, 'detail': f'{nm} for {ref}', 'source': 'BLS release schedule', 'url': u})
    b.close()
pk = json.loads((ROOT / 'assets/data/prefs_kpi.json').read_text())
for tk, r in pk['p'].items():
    for f, lab in (('next_record', 'record date'), ('next_pay', 'payment date')):
        if r.get(f) and r[f] >= today.isoformat(): ev.append({'date': r[f], 'kind': 'dividend', 'title': f'{tk} dividend {lab}', 'detail': f'{tk} stated rate {r["rate"]:.2f}%', 'source': 'strategy.com', 'url': r['url']})
ev.sort(key=lambda e: (e['date'], e['title']))
out = {'as_of': today.isoformat(), 'note': 'Official calendars only (Federal Reserve, BLS, strategy.com). Strategy earnings are added only once Strategy announces the date.', 'items': ev}
(ROOT / 'assets/data/keydates.json').write_text(json.dumps(out, indent=1) + '\n'); print(len(ev)); [print(e['date'], e['title']) for e in ev[:14]]
