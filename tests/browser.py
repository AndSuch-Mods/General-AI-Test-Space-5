"""Mobile controls, save lifecycle, version upgrades and offline navigation under a Pages subpath."""
import json, os, socket
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'; OUT.mkdir(exist_ok=True)
PREFIX='/General-AI-Test-Space-5/'
KEY='deadblock.survival.run.v1'
network=True
legacy=False
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
 def do_GET(self):
  if not network:
   self.connection.shutdown(socket.SHUT_RDWR);self.connection.close();return
  if legacy and self.path.split('?')[0]==PREFIX+'sw.js':
   body=(ROOT/'tests/fixtures/sw-v1.js').read_bytes()
   self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(body);return
  super().do_GET()
 def translate_path(self,path):
  if path.startswith(PREFIX):path='/'+path[len(PREFIX):]
  return super().translate_path(path)
server=ThreadingHTTPServer(('127.0.0.1',8765),partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
BASE='http://127.0.0.1:8765'+PREFIX
results=[]
try:
 with sync_playwright() as pw:
  for engine in os.environ.get('BROWSERS','chromium,webkit').split(','):
   opts={'headless':True}
   if engine=='chromium' and os.environ.get('CHROMIUM_PATH'):opts['executable_path']=os.environ['CHROMIUM_PATH']
   browser=getattr(pw,engine).launch(**opts)
   for name,w,h in [('desktop',1365,900),('portrait',390,844),('landscape',844,390),('small-landscape',667,375)]:
    context=browser.new_context(viewport={'width':w,'height':h},has_touch=name!='desktop',is_mobile=name!='desktop')
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    try:
     page.goto(BASE+'?test=1');page.wait_for_function('!!window.__deadblock')
     page.locator('#newButton').click();assert page.locator('[data-map]').count()==6
     page.screenshot(path=str(OUT/f'{engine}-{name}-maps.png'))
     page.locator('[data-action="begin"]').click()
     page.wait_for_function('!!__deadblock.game && !__deadblock.paused')
     page.evaluate('const s=__deadblock.game.s;s.countdown=0;s.player.hurt=10000;s.remaining=1;s.spawnTimer=10000;s.enemies=[]')
     assert page.locator('#autoButton').count()==0 and page.locator('#buildCycle').count()==0
     assert page.locator('#weaponDock button').count()==2
     page.wait_for_timeout(180);assert page.evaluate('__deadblock.game.s.bullets.length')==0
     boxes=page.locator('#loadoutBar button').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})')
     for i,b in enumerate(boxes):
      assert b['x']>=0 and b['x']+b['w']<=w+1 and b['y']>=0 and b['y']+b['h']<=h+1,boxes
      assert b['w']>=44 and b['h']>=44,boxes
      for a in boxes[i+1:]:assert not (min(a['x']+a['w'],b['x']+b['w'])>max(a['x'],b['x'])+.5 and min(a['y']+a['h'],b['y']+b['h'])>max(a['y'],b['y'])+.5),boxes
     x0=page.evaluate('__deadblock.game.s.player.x')
     if name=='desktop':
      page.keyboard.down('d');page.keyboard.down(' ');page.wait_for_timeout(250);page.keyboard.up('d');page.keyboard.up(' ')
     else:
      pad=page.locator('#moveStick').bounding_box();a=page.locator('#aimStick').bounding_box()
      if engine=='chromium':
       cdp=context.new_cdp_session(page)
       cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':pad['x']+pad['width']/2+25,'y':pad['y']+pad['height']/2},{'id':2,'x':a['x']+a['width']/2+28,'y':a['y']+a['height']/2}]})
       page.wait_for_timeout(250)
       assert page.evaluate('__deadblock.currentInput().fire')
       cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      else:
       page.mouse.move(pad['x']+pad['width']/2+25,pad['y']+pad['height']/2);page.mouse.down();page.wait_for_timeout(250);page.mouse.up()
     assert page.evaluate('__deadblock.game.s.player.x')>x0+10
     page.wait_for_timeout(60);assert page.evaluate('__deadblock.currentInput().fire') is False
     page.locator('#weaponDock [data-action="loadout"]').last.click();assert page.evaluate('__deadblock.paused')
     page.locator('[data-action="chooseBuild"][data-id="mine"]').click()
     page.locator('.dialog-foot [data-action="close"]').click();assert page.evaluate('!__deadblock.paused')
     assert 'MINE' in page.locator('#placeLabel').inner_text()
     page.locator('#pauseButton').click();before=page.evaluate('__deadblock.game.s.elapsed');page.wait_for_timeout(150);assert page.evaluate('__deadblock.game.s.elapsed')==before
     page.locator('[data-action="resume"]').click()
     page.evaluate("__deadblock.game.s.phase='shop';__deadblock.game.s.cash=20000;__deadblock.showShop()")
     for gun in ['smg','shotgun','carbine','flamer','railgun','launcher','minigun']:page.locator(f'[data-action="buy"][data-id="{gun}"]').click()
     assert page.locator('#weaponDock button').count()==2
     page.locator('[data-action="tab"][data-id="upgrades"]').click();page.locator('[data-action="buy"][data-id="power"]').click()
     page.locator('[data-action="tab"][data-id="weapons"]').click();page.screenshot(path=str(OUT/f'{engine}-{name}-shop.png'))
     saved=page.evaluate('__deadblock.store.read().data');page.reload();page.locator('#continueButton').click()
     restored=page.evaluate('__deadblock.game.s')
     for field in ['id','wave','owned','ammo','cash','grenades','upgrades','inventory']:assert saved[field]==restored[field],field
     page.locator('[data-action="next"]').click();page.evaluate('__deadblock.game.s.countdown=0;__deadblock.game.s.player.hurt=10000')
     page.wait_for_timeout(200);page.screenshot(path=str(OUT/f'{engine}-{name}-game.png'))
     page.evaluate("__deadblock.game.s.player.hurt=0;__deadblock.game.damagePlayer(99999);__deadblock.processEvents()")
     assert page.evaluate('__deadblock.store.read()') is None
     page.get_by_role('button',name='Main menu',exact=True).click();expect(page.locator('#continueButton')).to_be_hidden()
     assert not errors,errors
     results.append({'browser':engine,'layout':name,'passed':True});print(engine,name,'PASS',flush=True)
    except Exception as error:
     print('FAIL',engine,name,str(error),errors,flush=True)
     try:page.screenshot(path=str(OUT/f'{engine}-{name}-FAIL.png'))
     except Exception:pass
     raise
    finally:context.close()
   # Start with a previous cache version, upgrade using the public landing page,
   # then confirm save restoration with the HTTP server completely unreachable.
   legacy=True;context=browser.new_context();page=context.new_page();page.goto(BASE)
   page.wait_for_function('navigator.serviceWorker.controller!==null')
   page.locator('#newButton').click();page.locator('[data-action="begin"]').click();page.wait_for_timeout(2400)
   page.locator('#pauseButton').click();saved=page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).data',KEY)
   legacy=False;page.goto(BASE);page.wait_for_function("async()=>{const keys=await caches.keys();return keys.includes('deadblock-survival-1.1.0')&&!keys.includes('deadblock-survival-1.0.0')}",timeout=45000);page.goto(BASE+'update.html');page.locator('#install').click();page.wait_for_url('**/?v=1.1.0',timeout=60000)
   page.locator('#continueButton').click();page.locator('#pauseButton').click()
   after=page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).data',KEY);assert saved['id']==after['id']
   page.locator('[data-action="menu"]').click();network=False;page.reload(wait_until='load')
   page.locator('#continueButton').click();expect(page.locator('#hud')).to_be_visible()
   assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).data.id',KEY)==saved['id']
   network=True;context.close();browser.close()
   results.append({'browser':engine,'layout':'cache-update-and-offline-save','passed':True});print(engine,'update/offline PASS',flush=True)
finally:
 network=True;server.shutdown();(OUT/'results.json').write_text(json.dumps(results,indent=2))
