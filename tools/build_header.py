#!/usr/bin/env python3
"""Write the ONE shared header (assets/css/head.css styles it) into every page, so header/nav never change size or position between pages.
Re-run after adding a page or changing the nav: python3 tools/build_header.py"""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
NAV = [('/', 'Desk'), ('/strategy/', 'Strategy'), ('/companies/', 'Companies'), ('/your-bitcoin/', 'Your Bitcoin'), ('/preferreds/', 'Yield Desk'), ('/saylor/', 'Saylor'),
       ('/dashboard/', 'Dashboard'), ('/lab/', 'Math Lab'), ('/episodes/', 'Episodes'), ('/news/', 'News'), ('/members/', 'Members'),
       ('/resources/', 'Resources'), ('/start/', 'Start here')]
# pages that live under a nav parent (for aria-current)
PARENT = {'/glossary/': '/resources/', '/library-files/': '/resources/', '/tip/': '/members/', '/subscribe/': '/members/', '/members/pro/': '/members/',
          '/about/': None, '/privacy/': None, '/contact/': None, '/404.html': None}
YT = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>'
def header(route):
    cur = PARENT.get(route, route)
    links = ''.join('<a href="%s"%s>%s</a>' % (h, ' aria-current="page"' if h == cur else '', t) for h, t in NAV)
    return ('<header class="sh"><div class="sh-in">'
            '<a class="sh-brand" href="/" aria-label="BTC Treasury Desk home"><img src="/assets/img/emblem-96.png" alt="" width="26" height="26"><span><span class="o">BTC</span> TREASURY DESK</span></a>'
            '<nav class="sh-nav" aria-label="Main">' + links + '</nav>'
            '<a class="sh-yt" href="https://www.youtube.com/@btctreasurydesk" target="_blank" rel="noopener" aria-label="Watch on YouTube">' + YT + '<span>Watch on YouTube</span></a>'
            '</div></header>'
            '<script>(function(){var h=document.querySelector(".sh");function f(){if(h&&getComputedStyle(h).position==="sticky")document.documentElement.style.setProperty("--sh-h",h.offsetHeight+"px");else document.documentElement.style.removeProperty("--sh-h");}f();addEventListener("resize",f);})();</script>')
RX = re.compile(r'<header class="(?:sh|site-header|t-head)"[^>]*>.*?</header>(?:<script>\(function\(\)\{var [nh]=document\.querySelector\("\.sh(?:-nav)?"\).*?</script>)?', re.S)
def main():
    n = 0
    for f in sorted(list(ROOT.glob('**/index.html')) + [ROOT / '404.html']):
        rel = '/' + str(f.relative_to(ROOT)).replace('index.html', '')
        if rel.startswith('/library-files/'): continue
        if rel == '/404.html/': rel = '/404.html'
        s = f.read_text(); m = RX.search(s)
        if not m: print('no header:', rel); continue
        old = m.group(0); tools = ''
        if rel == '/' and 'class="t-head"' in old: # home: page tools move to the desk toolbar below the header
            t = re.search(r'<div class="t-tools">(.*)</div>\s*</header>', old, re.S).group(1)
            t = re.sub(r'<a class="tbtn tbtn-yt".*?</a>', '', t, flags=re.S).strip()
            tools = '\n  <div class="deskbar" aria-label="Desk tools">' + t + '</div>'
        s = s[:m.start()] + header(rel) + tools + s[m.end():]
        if '/assets/css/head.css' not in s: s = s.replace('</head>', '  <link rel="stylesheet" href="/assets/css/head.css?v=h1">\n</head>', 1)
        f.write_text(s); n += 1
    print('headers written:', n)
if __name__ == '__main__': main()
