import asyncio, sys
from playwright.async_api import async_playwright
BASE='http://127.0.0.1:8765'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True)
        errs=[]
        async def shot(name, path, w, h, full=True, dm=False, init=None):
            ctx = await b.new_context(viewport={'width':w,'height':h}, device_scale_factor=1)
            pg = await ctx.new_page()
            if init: await pg.add_init_script(init)
            pg.on('console', lambda m: errs.append(f'[{name}] {m.type}: {m.text}') if m.type in ('error','warning') else None)
            pg.on('pageerror', lambda e: errs.append(f'[{name}] PAGEERROR: {e}'))
            await pg.goto(BASE+path, wait_until='domcontentloaded'); await pg.wait_for_timeout(13000)
            if dm:
                await pg.click('[data-deskmode]'); await pg.wait_for_timeout(4000)
            await pg.screenshot(path=f'screens/{name}.png', full_page=full)
            await ctx.close()
        await shot('home-desktop','/',1600,1000)
        await shot('home-desktop-firstscreen','/',1600,1000,full=False)
        await shot('home-mobile','/',390,844)
        await shot('deskmode-desktop','/',1920,1080,full=False,dm=True)
        await shot('deskmode-mobile','/',390,844,full=True,dm=True)
        await shot('members-desktop','/members/',1440,900)
        await shot('members-unlocked-desktop','/members/',1440,900,init="localStorage.setItem('btd_member','1')")
        await shot('home-ticker-on-firstscreen','/',1600,1000,full=False,init="localStorage.setItem('btd_ticker','1')")
        await b.close()
        print('\n'.join(errs) or 'no console errors')
asyncio.run(main())
