"""Exercise the actual WebGL scene, camera, model viewer and graphics recovery."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import json, os
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
PREFIX='/General-AI-Test-Space-5/'
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def translate_path(self,path):
  if path.startswith(PREFIX):path='/'+path[len(PREFIX):]
  return super().translate_path(path)
server=ThreadingHTTPServer(('127.0.0.1',8766),partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start();BASE='http://127.0.0.1:8766'+PREFIX
results=[]
try:
 with sync_playwright() as pw:
  for engine in os.environ.get('BROWSERS','chromium,webkit').split(','):
   args={'headless':engine!='webkit'}
   if engine=='chromium':args['args']=['--enable-unsafe-swiftshader']
   browser=getattr(pw,engine).launch(**args);context=browser.new_context(viewport={'width':1400,'height':900});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    page.goto(BASE+'models.html');page.wait_for_function('window.__models3d?.renderer.metrics?.triangles>1000')
    for kind in ['player','walker','runner','brute','bomber','cinder','boss']:
     for view,angle in [('threequarter',.92),('front',1.57079632679),('back',-1.57079632679)]:
      page.evaluate('(k)=>__models3d.setKind(k)',kind);page.evaluate('(a)=>__models3d.setAngle(a)',angle);page.wait_for_timeout(130)
      page.screenshot(path=str(OUT/f'{engine}-3d-{kind}-{view}.png'))
     assert page.evaluate('__models3d.renderer.metrics.visibleCharacters')==1
     assert page.evaluate('[...__models3d.renderer.batches.values()].every(b=>b.parts.every(p=>Array.from(p.mesh.instanceMatrix.array.slice(0,p.mesh.count*16)).every(Number.isFinite)))')
    assert page.evaluate('__models3d.renderer.gl.capabilities.isWebGL2')
    assert page.locator('canvas').count()==2
    page.goto(BASE+'?test=1');page.wait_for_function('window.__deadblock?.renderer.metrics?.triangles>1000')
    page.locator('#newButton').click();page.locator('[data-action="begin"]').click()
    assert page.evaluate('__deadblock.game.s.phase')=='prep'
    assert page.locator('#gameCanvas').get_attribute('data-renderer')=='webgl2'
    page.screenshot(path=str(OUT/f'{engine}-3d-preparation.png'))
    page.locator('#startWaveButton').click()
    page.evaluate('''()=>{const g=__deadblock.game;g.s.countdown=0;g.s.player.hurt=10000;g.s.remaining=1;g.s.spawnTimer=10000;g.s.enemies=[];const kinds=['walker','runner','brute','cinder','bomber','boss'];for(let i=0;i<120;i++){g.spawn(kinds[i%6]);const e=g.s.enemies.at(-1);e.x=g.s.player.x-500+(i%15)*65;e.y=g.s.player.y-220+Math.floor(i/15)*55;e.shoot=10000;e.attack=10000;e.fuse=-1;}__deadblock.persist();}''')
    page.wait_for_timeout(250);page.locator('#pauseButton').click();page.wait_for_timeout(100)
    metrics=page.evaluate('__deadblock.renderer.metrics');assert metrics['visibleCharacters']>75,metrics;assert metrics['drawCalls']<300,metrics;assert metrics['triangles']>200000,metrics
    page.screenshot(path=str(OUT/f'{engine}-3d-horde-paused.png'))
    page.locator('[data-action="resume"]').click();page.evaluate('__deadblock.game.s.player.hurt=10000');page.wait_for_timeout(80);page.screenshot(path=str(OUT/f'{engine}-3d-horde.png'))
    page.locator('#pauseButton').click()
    error=page.evaluate('''()=>{const r=__deadblock.renderer,p=__deadblock.game.s.player,t={x:p.x+140,y:p.y+100},s=r.project(t.x,t.y,43),q=r.screenToWorld(s.x,s.y,43);return Math.hypot(t.x-q.x,t.y-q.y);}''');assert error<1e-6,error
    page.locator('[data-action="resume"]').click()
    page.evaluate('__deadblock.renderer.gl.forceContextLoss()');page.wait_for_function('__deadblock.renderer.lost && __deadblock.paused')
    t=page.evaluate('__deadblock.game.s.elapsed');saved=page.evaluate('__deadblock.store.read().data.id');page.wait_for_timeout(200);assert page.evaluate('__deadblock.game.s.elapsed')==t
    page.evaluate('__deadblock.renderer.gl.forceContextRestore()');page.wait_for_function('!__deadblock.renderer.lost',timeout=15000);assert page.evaluate('__deadblock.paused')
    page.locator('[data-action="resume"]').click();page.wait_for_timeout(150);assert page.evaluate('__deadblock.store.read().data.id')==saved
    page.locator('#pauseButton').click()
    page.evaluate('''()=>{const s=__deadblock.game.s;s.enemies=[];s.owned=['pistol','smg','shotgun','carbine','flamer','railgun','launcher','minigun'];for(const w of s.owned)s.ammo[w]=200;}''')
    for _ in range(2):
     for weapon in ['pistol','smg','shotgun','carbine','flamer','railgun','launcher','minigun']:
      page.evaluate('(id)=>__deadblock.game.equip(id)',weapon);page.wait_for_timeout(30)
    memory=page.evaluate('__deadblock.renderer.metrics');assert memory['geometries']<180,memory
    page.evaluate('__deadblock.renderer.settings.blood=false');page.wait_for_timeout(60)
    assert page.evaluate("[...__deadblock.renderer.batches.values()].every(b=>b.parts.filter(p=>p.material==='blood').every(p=>p.mesh.count===0))")
    assert not errors,errors
    results.append({'browser':engine,'passed':True,'horde':metrics,'memoryAfterWeaponSwaps':memory,'checks':['seven actual models front rear and oblique','finite animated matrices','single WebGL2 context','120-enemy render','batched draw call budget','camera aim round trip','context loss pauses and preserves save','context restoration remains paused','weapon changes dispose old geometry','blood toggle hides only stains','no uncaught page errors']})
    print(engine,'3D PASS',json.dumps(metrics),flush=True)
   except Exception as e:
    try:page.screenshot(path=str(OUT/f'{engine}-3d-FAIL.png'))
    except Exception:pass
    results.append({'browser':engine,'passed':False,'error':str(e),'pageErrors':errors});print(engine,'3D FAIL',str(e),errors,flush=True)
   finally:context.close();browser.close()
finally:
 server.shutdown();(OUT/'webgl-results.json').write_text(json.dumps(results,indent=2))
assert results and all(r['passed'] for r in results),'WebGL checks failed'
