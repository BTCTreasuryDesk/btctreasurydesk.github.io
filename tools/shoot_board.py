import asyncio
from playwright.async_api import async_playwright
BASE='http://127.0.0.1:8765'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True)
        errs=[]
        async def shot(name, w, h, full=False, dm=False, init=None, act=None):
            ctx = await b.new_context(viewport={'width':w,'height':h}, device_scale_factor=1)
            pg = await ctx.new_page()
            if init: await pg.add_init_script(init)
            pg.on('console', lambda m: errs.append(f'[{name}] {m.type}: {m.text}') if m.type in ('error','warning') else None)
            pg.on('pageerror', lambda e: errs.append(f'[{name}] PAGEERROR: {e}'))
            await pg.goto(BASE+'/', wait_until='domcontentloaded'); await pg.wait_for_timeout(12000)
            if act: await act(pg)
            if dm:
                await pg.click('[data-deskmode]'); await pg.wait_for_timeout(5000)
            await pg.screenshot(path=f'screens/{name}.png', full_page=full)
            bh = await pg.evaluate("(()=>{const e=document.querySelector('#board');const r=e.getBoundingClientRect();return [Math.round(r.top),Math.round(r.height), document.querySelectorAll('[data-tb] tbody tr').length]})()")
            print(name, 'board top/height/rows', bh)
            await ctx.close()
        await shot('home-board',1600,1000)
        await shot('home-board-mobile',390,844)
        async def filt(pg):
            await pg.click('[data-tb-n="50"]'); await pg.click('[data-tb-g="reg"] [data-v="JP"]'); await pg.wait_for_timeout(3000)
        await shot('home-board-filter-jp',1600,1000,act=filt)
        await shot('home-board-deskmode',1920,1080,dm=True)
        async def mexp(pg):
            await pg.click('[data-tb-more]'); await pg.click('[data-tb-live]'); await pg.wait_for_timeout(4000)
        await shot('home-board-mobile-expanded',390,844,act=mexp)
        await b.close()
        print('\n'.join(errs) or 'no console errors')
asyncio.run(main())
