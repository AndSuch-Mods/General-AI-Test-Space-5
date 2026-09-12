"""Real HTTP browser tests. Screenshots and failures are saved as CI artifacts."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
KEY = 'deadblock.survival.run.v1'
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 8765), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:8765/'
results = []
try:
    with sync_playwright() as pw:
        for engine in ['chromium', 'webkit']:
            browser = getattr(pw, engine).launch(headless=True)
            for name, width, height in [('desktop',1365,900),('portrait',390,844),('landscape',844,390)]:
                mobile = name != 'desktop'
                context = browser.new_context(viewport={'width':width,'height':height}, has_touch=mobile, is_mobile=mobile, device_scale_factor=1)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    page.goto(BASE+'?test=1')
                    page.wait_for_function('!!window.__deadblock')
                    page.screenshot(path=str(OUT/f'{engine}-{name}-menu.png'))
                    page.locator('#newButton').click()
                    page.screenshot(path=str(OUT/f'{engine}-{name}-setup.png'))
                    page.locator('[data-action="begin"]').click()
                    page.wait_for_function('!!__deadblock.game && !__deadblock.paused')
                    page.evaluate('__deadblock.game.s.countdown=0; __deadblock.game.s.player.hurt=20')
                    x0 = page.evaluate('__deadblock.game.s.player.x')
                    if mobile:
                        left=page.locator('#moveStick').bounding_box()
                        right=page.locator('#aimStick').bounding_box()
                        assert left and right
                        lx,ly=left['x']+left['width']/2,left['y']+left['height']/2
                        rx,ry=right['x']+right['width']/2,right['y']+right['height']/2
                        if engine=='chromium':
                            cdp=context.new_cdp_session(page)
                            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':lx+35,'y':ly,'id':1},{'x':rx,'y':ry-35,'id':2}]})
                            page.wait_for_timeout(450)
                            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                        else:
                            page.mouse.move(lx+35,ly)
                            page.mouse.down()
                            page.wait_for_timeout(450)
                            page.mouse.up()
                    else:
                        page.keyboard.down('d')
                        page.wait_for_timeout(450)
                        page.keyboard.up('d')
                    assert page.evaluate('__deadblock.game.s.player.x') > x0+20
                    page.wait_for_timeout(150)
                    stopped=page.evaluate('__deadblock.game.s.player.x')
                    page.wait_for_timeout(200)
                    assert abs(page.evaluate('__deadblock.game.s.player.x')-stopped)<3
                    page.locator('#pauseButton').click()
                    elapsed=page.evaluate('__deadblock.game.s.elapsed')
                    page.wait_for_timeout(150)
                    assert page.evaluate('__deadblock.game.s.elapsed')==elapsed
                    page.get_by_role('button',name='Resume run →',exact=True).click()
                    page.evaluate("const g=__deadblock.game;g.s.phase='shop';g.s.cash=20000;__deadblock.showShop()")
                    for weapon in ['smg','shotgun','carbine','flamer','railgun','launcher','minigun']:
                        page.locator(f'[data-action="buy"][data-id="{weapon}"]').click()
                    assert page.evaluate('__deadblock.game.s.owned.length')==8
                    page.locator('[data-action="tab"][data-id="upgrades"]').click()
                    page.locator('[data-action="buy"][data-id="power"]').click()
                    page.locator('[data-action="tab"][data-id="supplies"]').click()
                    page.locator('[data-action="buy"][data-id="grenade"]').click()
                    page.locator('[data-action="tab"][data-id="weapons"]').click()
                    page.screenshot(path=str(OUT/f'{engine}-{name}-shop.png'))
                    saved=page.evaluate('__deadblock.store.read().data')
                    page.reload()
                    expect(page.locator('#continueButton')).to_be_visible()
                    page.locator('#continueButton').click()
                    restored=page.evaluate('__deadblock.game.s')
                    for field in ['id','wave','cash','owned','ammo','upgrades','inventory','grenades','enemies','projectiles']:
                        assert restored[field]==saved[field], field
                    page.locator('[data-action="next"]').click()
                    page.evaluate('__deadblock.game.s.countdown=0; __deadblock.game.s.player.hurt=10')
                    page.wait_for_timeout(400)
                    page.screenshot(path=str(OUT/f'{engine}-{name}-combat.png'))
                    page.evaluate('__deadblock.game.s.player.hurt=0;__deadblock.game.damagePlayer(100000);__deadblock.processEvents()')
                    expect(page.locator('#panelTitle')).to_have_text('End of the line.')
                    assert page.evaluate('(key)=>localStorage.getItem(key)',KEY) is None
                    page.screenshot(path=str(OUT/f'{engine}-{name}-death.png'))
                    page.get_by_role('button',name='Main menu',exact=True).click()
                    expect(page.locator('#continueButton')).to_be_hidden()
                    page.locator('#newButton').click()
                    page.locator('[data-action="begin"]').click()
                    page.evaluate('__deadblock.toMenu()')
                    previous=page.evaluate('__deadblock.store.read().data.id')
                    page.locator('#newButton').click()
                    page.locator('[data-action="begin"]').click()
                    page.locator('[data-action="backNew"]').click()
                    assert page.evaluate('__deadblock.store.read().data.id')==previous
                    page.locator('[data-action="begin"]').click()
                    page.locator('[data-action="start"]').click()
                    assert page.evaluate('__deadblock.game.s.id')!=previous
                    assert not errors, errors
                    results.append({'browser':engine,'layout':name,'result':'passed','checks':['movement','release','pause','all weapon purchases','upgrades','supplies','reload','continue','death clears save','new-game cancellation','new-game replacement']})
                    print(engine,name,'PASS',flush=True)
                except Exception:
                    page.screenshot(path=str(OUT/f'{engine}-{name}-failure.png'))
                    (OUT/f'{engine}-{name}-failure.html').write_text(page.content())
                    (OUT/f'{engine}-{name}-errors.json').write_text(json.dumps(errors,indent=2))
                    raise
                finally:
                    context.close()
            context=browser.new_context()
            page=context.new_page()
            page.goto(BASE)
            page.wait_for_function("document.getElementById('offlineStatus').textContent.includes('OFFLINE READY')",timeout=30000)
            page.wait_for_function('navigator.serviceWorker.controller!==null')
            context.set_offline(True)
            page.reload()
            expect(page.locator('#newButton')).to_be_visible()
            page.locator('#newButton').click()
            page.locator('[data-action="begin"]').click()
            expect(page.locator('#hud')).to_be_visible()
            page.wait_for_timeout(2500)
            assert page.locator('#waveNumber').inner_text()=='01'
            results.append({'browser':engine,'layout':'offline','result':'passed'})
            print(engine,'offline PASS',flush=True)
            context.close()
            browser.close()
finally:
    (OUT/'results.json').write_text(json.dumps(results,indent=2))
    server.shutdown()
