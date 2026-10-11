import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True)
        ctx = await b.new_context(viewport={'width':1600,'height':1000}); pg = await ctx.new_page()
        pg.on('requestfailed', lambda r: print('FAILED', r.url[:140], r.failure))
        pg.on('pageerror', lambda e: print('PAGEERROR', e))
        pg.on('console', lambda m: print('CONSOLE', m.type, m.text[:160]) if m.type=='error' else None)
        await pg.goto('http://127.0.0.1:8765/', wait_until='domcontentloaded'); await pg.wait_for_timeout(15000)
        await pg.screenshot(path='screens/home-desktop-firstscreen.png')
        await b.close()
asyncio.run(main())
