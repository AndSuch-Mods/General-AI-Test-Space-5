"""Mobile controls, save lifecycle, version upgrades and offline navigation under a Pages subpath."""
import base64, json, os, socket
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect
from viewport_probe import probe
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
   opts={'headless':engine!='webkit'}
   if engine=='chromium' and os.environ.get('CHROMIUM_PATH'):opts['executable_path']=os.environ['CHROMIUM_PATH']
   browser=getattr(pw,engine).launch(**opts)
   if engine=='webkit':probe(browser)
   for name,w,h in [('desktop',1365,900),('portrait',390,844),('landscape',844,390),('small-landscape',667,375)]:
    context=browser.new_context(viewport={'width':w,'height':h},has_touch=name!='desktop',is_mobile=name!='desktop')
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    try:
     page.goto(BASE+'?test=1');page.bring_to_front();page.wait_for_function('!!window.__deadblock')
     if name=='portrait':
      expect(page.locator('#orientationGate')).to_be_visible();assert page.evaluate('__deadblock.rotationBlocked')
      page.screenshot(path=str(OUT/f'{engine}-portrait-rotate.png'))
      w,h=844,390;page.set_viewport_size({'width':w,'height':h});expect(page.locator('#orientationGate')).to_be_hidden(timeout=10000)
     if name=='desktop':
      sheet=page.evaluate('''()=>{
       const canvas=document.createElement('canvas');
       const r=new __deadblock.renderer.constructor(canvas,{blood:false,shake:false,quality:'high'});
       canvas.width=2240;canvas.height=2520;r.state={weapon:'pistol'};const c=r.c;c.scale(2,2);
       c.fillStyle='#ced0bc';c.fillRect(0,0,1120,1260);c.font='13px monospace';
       const kinds=['player','walker','runner','brute','bomber','cinder','boss'];
       kinds.forEach((kind,row)=>{for(let col=0;col<8;col++){
        const angle=-Math.PI/2+col*Math.PI/4,x=col*140+70,y=row*180+164;
        c.fillStyle='#28362c';c.fillText(kind+' '+(col*45)+'deg',x-55,row*180+19);
        r.actor({kind,x,y,angle,walk:0,fire:0,flash:0,telegraph:0,fuse:-1,hp:100,maxHp:100},kind==='player');
       }});return canvas.toDataURL().split(',')[1];
      }''');(OUT/f'{engine}-model-directions.png').write_bytes(base64.b64decode(sheet))
     page.locator('#newButton').click();assert page.locator('[data-map]').count()==7
     page.screenshot(path=str(OUT/f'{engine}-{name}-maps.png'))
     page.locator('[data-action="begin"]').click()
     page.wait_for_function('!!__deadblock.game && !__deadblock.paused')
     assert page.evaluate('__deadblock.game.s.phase')=='prep'
     assert page.evaluate('__deadblock.game.s.wave')==0
     page.evaluate('__deadblock.game.s.cash=500')
     page.locator('#prepBar [data-action="shop"]').click()
     expect(page.locator('[data-action="buy"][data-id="wall"]')).to_be_visible()
     page.locator('[data-action="buy"][data-id="wall"]').click()
     page.locator('[data-action="prepare"]').click()
     assert page.evaluate('__deadblock.game.s.wave')==0
     page.locator('#weaponDock .more-slot').click();page.locator('[data-action="chooseBuild"][data-id="wall"]').click()
     page.locator('.dialog-foot [data-action="close"]').click()
     page.locator('#placeButton').click()
     assert page.evaluate('__deadblock.game.s.defenses.length')==1
     assert page.evaluate('__deadblock.game.s.elapsed')==0
     expect(page.locator('#grenadeButton')).to_be_disabled()
     page.evaluate('__deadblock.persist()');prep_save=page.evaluate('__deadblock.store.read().data')
     page.reload();page.locator('#continueButton').click();assert page.evaluate('__deadblock.game.s.phase')=='prep'
     assert page.evaluate('__deadblock.game.s.defenses')==prep_save['defenses']
     page.screenshot(path=str(OUT/f'{engine}-{name}-preparation.png'))
     page.locator('#startWaveButton').click();page.wait_for_function('__deadblock.game.s.wave===1',timeout=7000)
     assert page.evaluate('__deadblock.game.s.defenses.length')==1
     page.evaluate('const s=__deadblock.game.s;s.countdown=0;s.player.hurt=10000;s.remaining=1;s.spawnTimer=10000;s.enemies=[]')
     assert page.locator('#autoButton').count()==0 and page.locator('#buildCycle').count()==0
     assert page.locator('#weaponDock button').count()==2
     page.wait_for_timeout(180);assert page.evaluate('__deadblock.game.s.bullets.length')==0
     boxes=page.locator('#loadoutBar button').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})')
     for i,b in enumerate(boxes):
      assert b['x']>=0 and b['x']+b['w']<=w+1 and b['y']>=0 and b['y']+b['h']<=h+1,boxes
      assert b['w']>=44 and b['h']>=44,boxes
      for a in boxes[i+1:]:assert not (min(a['x']+a['w'],b['x']+b['w'])>max(a['x'],b['x'])+.5 and min(a['y']+a['h'],b['y']+b['h'])>max(a['y'],b['y'])+.5),boxes
     x0=page.evaluate('__deadblock.game.s.player.x');move_id=page.evaluate('__deadblock.game.s.id')
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
     assert page.evaluate('__deadblock.game.s.player.x')>x0+10, page.evaluate('({x:__deadblock.game.s.player.x,id:__deadblock.game.s.id,paused:__deadblock.paused,countdown:__deadblock.game.s.countdown,elapsed:__deadblock.game.s.elapsed,hidden:document.hidden,visibility:document.visibilityState,renderTime:__deadblock.renderer.time,focus:document.activeElement?.outerHTML,inputs:__deadblock.currentInput()})')
     page.wait_for_timeout(60);assert page.evaluate('__deadblock.currentInput().fire') is False
     page.locator('#weaponDock [data-action="loadout"]').last.click();assert page.evaluate('__deadblock.paused')
     page.locator('[data-action="chooseBuild"][data-id="mine"]').click()
     page.locator('.dialog-foot [data-action="close"]').click();assert page.evaluate('!__deadblock.paused')
     assert 'MINE' in page.locator('#placeLabel').inner_text()
     if name=='landscape':
      before_rotation=page.evaluate('__deadblock.game.s.elapsed')
      page.set_viewport_size({'width':390,'height':844});expect(page.locator('#orientationGate')).to_be_visible()
      paused_time=page.evaluate('__deadblock.game.s.elapsed');page.wait_for_timeout(250)
      assert page.evaluate('__deadblock.game.s.elapsed')==paused_time
      assert page.evaluate('__deadblock.currentInput().fire') is False
      page.set_viewport_size({'width':w,'height':h});expect(page.locator('#orientationGate')).to_be_hidden(timeout=10000)
      expect(page.locator('#panelTitle')).to_have_text('Catch your breath.')
      page.locator('[data-action="resume"]').click()
     page.locator('#pauseButton').click();before=page.evaluate('__deadblock.game.s.elapsed');page.wait_for_timeout(150);assert page.evaluate('__deadblock.game.s.elapsed')==before
     page.locator('[data-action="resume"]').click()
     page.evaluate("__deadblock.game.s.phase='shop';__deadblock.game.s.enemies=[];__deadblock.game.s.remaining=0;__deadblock.game.s.cash=20000;__deadblock.showShop()")
     page.locator('[data-action="tab"][data-id="weapons"]').click()
     for gun in ['smg','shotgun','carbine','flamer','railgun','launcher','minigun']:page.locator(f'[data-action="buy"][data-id="{gun}"]').click()
     assert page.locator('#weaponDock button').count()==2
     page.locator('[data-action="tab"][data-id="upgrades"]').click();page.locator('[data-action="buy"][data-id="power"]').click()
     page.locator('[data-action="tab"][data-id="weapons"]').click();page.screenshot(path=str(OUT/f'{engine}-{name}-shop.png'))
     saved=page.evaluate('__deadblock.store.read().data');page.reload();page.locator('#continueButton').click()
     restored=page.evaluate('__deadblock.game.s')
     for field in ['id','wave','owned','ammo','cash','grenades','upgrades','inventory']:assert saved[field]==restored[field],field
     page.locator('[data-action="prepare"]').click();assert page.evaluate('__deadblock.game.s.phase')=='prep';page.locator('#startWaveButton').click();page.evaluate('__deadblock.game.s.countdown=0;__deadblock.game.s.player.hurt=10000')
     page.wait_for_timeout(200);page.evaluate('__deadblock.game.s.player.hurt=0');page.wait_for_timeout(30);page.screenshot(path=str(OUT/f'{engine}-{name}-game.png'))
     page.evaluate("__deadblock.game.s.player.hurt=0;__deadblock.game.damagePlayer(99999);__deadblock.processEvents()")
     assert page.evaluate('__deadblock.store.read()') is None
     page.get_by_role('button',name='Main menu',exact=True).click();expect(page.locator('#continueButton')).to_be_hidden()
     assert not errors,errors
     results.append({'browser':engine,'layout':name,'passed':True});print(engine,name,'PASS',flush=True)
    except Exception as error:
     metrics=page.evaluate('''()=>({inner:[innerWidth,innerHeight],outer:[outerWidth,outerHeight],client:[document.documentElement.clientWidth,document.documentElement.clientHeight],screen:[screen.width,screen.height],media:matchMedia('(orientation:landscape)').matches,visual:visualViewport?{w:visualViewport.width,h:visualViewport.height,scale:visualViewport.scale}:null,hidden:document.hidden,orientation:screen.orientation?.type,blocked:window.__deadblock?.rotationBlocked,phase:window.__deadblock?.game?.s.phase,wave:window.__deadblock?.game?.s.wave,paused:window.__deadblock?.paused,focus:document.activeElement?.outerHTML,panel:document.querySelector('#panel')?.open})''')
     print('VIEWPORT',page.viewport_size,metrics,flush=True)
     print('FAIL',engine,name,str(error),errors,flush=True);(OUT/f'{engine}-{name}-error.txt').write_text(str(error)+chr(10)+str(errors))
     try:page.screenshot(path=str(OUT/f'{engine}-{name}-FAIL.png'))
     except Exception:pass
     results.append({'browser':engine,'layout':name,'passed':False,'error':str(error),'viewport':metrics})
    finally:context.close()
   # Start with a previous cache version, upgrade using the public landing page,
   # then confirm save restoration with the HTTP server completely unreachable.
   legacy=True;context=browser.new_context();page=context.new_page();page.goto(BASE)
   page.wait_for_function('navigator.serviceWorker.controller!==null')
   page.locator('#newButton').click();page.locator('[data-action="begin"]').click();page.locator('#startWaveButton').click();page.wait_for_timeout(2400)
   page.locator('#pauseButton').click();saved=page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).data',KEY)
   legacy=False;page.goto(BASE);page.evaluate("""async()=>{
    const reg=await navigator.serviceWorker.getRegistration();await reg.update();
    const deadline=Date.now()+45000;
    while(Date.now()<deadline){
     const keys=await caches.keys();
     if(keys.includes('deadblock-survival-1.3.0')&&!keys.includes('deadblock-survival-1.0.0')&&reg.active?.state==='activated'&&navigator.serviceWorker.controller===reg.active)return true;
     await new Promise(resolve=>setTimeout(resolve,150));
    }
    throw Error('Updated cache exists but its worker did not take control');
   }""");page.goto(BASE+'update.html');page.locator('#install').click();page.wait_for_url('**/?v=1.3.0',timeout=60000)
   page.locator('#continueButton').click();page.locator('#pauseButton').click()
   after=page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).data',KEY);assert saved['id']==after['id']
   page.locator('[data-action="menu"]').click();network=False;page.reload(wait_until='load')
   page.locator('#continueButton').click();expect(page.locator('#hud')).to_be_visible()
   assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).data.id',KEY)==saved['id']
   network=True;context.close();browser.close()
   results.append({'browser':engine,'layout':'cache-update-and-offline-save','passed':True});print(engine,'update/offline PASS',flush=True)
finally:
 network=True;server.shutdown();(OUT/'results.json').write_text(json.dumps(results,indent=2))

assert all(item['passed'] for item in results), 'Browser cases failed; see results.json'
