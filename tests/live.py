"""Confirm actual Pages assets and run the public game in mobile WebKit."""
import hashlib,json,time
from pathlib import Path
from urllib.request import Request,urlopen
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
BASE='https://andsuch-mods.github.io/General-AI-Test-Space-5/'
KEY='deadblock.survival.run.v1'
FILES=['src/characters.js','assets/icon-180-v1.3.png','assets/icon-192-v1.3.png','assets/icon-512-v1.3.png','index.html','styles.css','src/model.js','src/defenses.js','src/data.js','src/engine.js','src/app.js','src/storage.js','src/renderer.js','src/audio.js','manifest.webmanifest','sw.js','icon.png','update.html','release.json']
def remote(path):
 req=Request(BASE+path+'?verify=1.3.0',headers={'User-Agent':'Deadblock-live-check','Cache-Control':'no-cache'})
 with urlopen(req,timeout=20) as response:return response.read()
for attempt in range(40):
 try:
  if remote('release.json')==(ROOT/'release.json').read_bytes():break
 except Exception as error:print('Waiting for Pages:',str(error),flush=True)
 time.sleep(10)
else:raise RuntimeError('Pages did not publish version 1.3.0 in time')
assets=[]
for path in FILES:
 for attempt in range(12):
  try:
   data=remote(path)
   if data==(ROOT/path).read_bytes():break
  except Exception:pass
  time.sleep(5)
 else:raise AssertionError('Live asset differs from repository: '+path)
 assets.append({'path':path,'sha256':hashlib.sha256(data).hexdigest(),'matched':True})
with sync_playwright() as pw:
 browser=pw.webkit.launch(headless=False)
 context=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'?v=1.3.0');page.bring_to_front();expect(page).to_have_title('Deadblock | Last stand')
 assert page.evaluate('typeof window.__deadblock')=='undefined'
 page.wait_for_function("document.getElementById('offlineStatus').textContent.includes('1.3.0')")
 page.locator('#newButton').click();assert page.locator('[data-map]').count()==7
 page.locator('[data-action="begin"]').click();expect(page.locator('#hud')).to_be_visible()
 expect(page.locator('#prepBar')).to_be_visible()
 page.locator('#weaponDock .more-slot').click();page.locator('[data-action="chooseBuild"][data-id="wall"]').click();page.locator('.dialog-foot [data-action="close"]').click()
 page.locator('#placeButton').click();page.locator('#startWaveButton').click()
 page.wait_for_timeout(3500)
 assert page.locator('#weaponDock button').count()==2
 assert page.locator('#autoButton').count()==0
 page.screenshot(path=str(OUT/'live-iphone-landscape.png'))
 page.locator('#weaponDock .more-slot').click();expect(page.locator('#panelTitle')).to_have_text('Field loadout.')
 page.locator('[data-action="chooseBuild"][data-id="mine"]').click();page.locator('.dialog-foot [data-action="close"]').click()
 page.locator('#pauseButton').click();run=page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).data',KEY)
 assert run['elapsed']>0 and run['worldVersion']==2 and run['wave']==1 and run['kills']==0
 page.reload();page.locator('#continueButton').click();page.locator('#pauseButton').click()
 restored=page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).data',KEY)
 for k in ['id','wave','owned','ammo','inventory','build']:assert restored[k]==run[k],k
 # Rotation must pause, hide gameplay behind the gate, and restore landscape without a reset.
 page.locator('[data-action="resume"]').click()
 page.set_viewport_size({'width':390,'height':844});expect(page.locator('#orientationGate')).to_be_visible()
 page.screenshot(path=str(OUT/'live-portrait-guard.png'))
 page.set_viewport_size({'width':844,'height':390});expect(page.locator('#orientationGate')).to_be_hidden()
 expect(page.locator('#panelTitle')).to_have_text('Catch your breath.')
 # Seed an intermission in this disposable browser context, before app startup,
 # after the previous document finishes its pagehide save. The one-shot flag
 # leaves later prep reloads untouched.
 page.add_init_script("""(()=>{
  const fixture='deadblock-test.intermission-seeded';
  if(sessionStorage.getItem(fixture))return;
  const k='deadblock.survival.run.v1',save=JSON.parse(localStorage.getItem(k));
  Object.assign(save.data,{phase:'shop',countdown:0,remaining:0,enemies:[],bullets:[],projectiles:[],cash:500});
  localStorage.setItem(k,JSON.stringify(save));sessionStorage.setItem(fixture,'1');
 })()""")
 page.reload();page.locator('#continueButton').click()
 expect(page.locator('#panelTitle')).to_have_text('The armory.')
 page.locator('[data-action="tab"][data-id="defenses"]').click();page.locator('[data-action="buy"][data-id="wall"]').click()
 page.locator('[data-action="prepare"]').click();expect(page.locator('#prepBar')).to_be_visible()
 page.locator('#pauseButton').click();prep=page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).data',KEY);assert prep['phase']=='prep' and prep['wave']==1
 page.locator('[data-action="resume"]').click();page.screenshot(path=str(OUT/'live-preparation.png'))
 page.reload();page.locator('#continueButton').click();expect(page.locator('#prepBar')).to_be_visible()
 page.locator('#startWaveButton').click();expect(page.locator('#waveNumber')).to_have_text('02')
 assert not errors,errors
 report={'url':BASE,'version':'1.3.0','passed':True,'assets':assets,'browser':'WebKit','checks':['live code and icon assets match repository','landscape rotation guard','first-wave preparation','buy structure wall','intermission exits to prep','prep save resumes before next wave','new game starts','manual idle does not shoot','compact five-button HUD','More opens and closes','select mine','single saved run resumes','production has no test hooks','zero page errors']}
 (OUT/'live-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
 context.close();browser.close()
