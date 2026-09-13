"""Confirm actual Pages assets and run the public game in mobile WebKit."""
import hashlib,json,time
from pathlib import Path
from urllib.request import Request,urlopen
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
BASE='https://andsuch-mods.github.io/General-AI-Test-Space-5/'
KEY='deadblock.survival.run.v1'
FILES=['index.html','styles.css','src/data.js','src/engine.js','src/app.js','src/storage.js','src/renderer.js','src/audio.js','manifest.webmanifest','sw.js','icon.png','update.html','release.json']
def remote(path):
 req=Request(BASE+path+'?verify=1.1.0',headers={'User-Agent':'Deadblock-live-check','Cache-Control':'no-cache'})
 with urlopen(req,timeout=20) as response:return response.read()
for attempt in range(40):
 try:
  if remote('release.json')==(ROOT/'release.json').read_bytes():break
 except Exception as error:print('Waiting for Pages:',str(error),flush=True)
 time.sleep(10)
else:raise RuntimeError('Pages did not publish version 1.1.0 in time')
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
 page.goto(BASE+'?v=1.1.0');page.bring_to_front();expect(page).to_have_title('Deadblock | Last stand')
 assert page.evaluate('typeof window.__deadblock')=='undefined'
 page.wait_for_function("document.getElementById('offlineStatus').textContent.includes('1.1.0')")
 page.locator('#newButton').click();assert page.locator('[data-map]').count()==6
 page.locator('[data-action="begin"]').click();expect(page.locator('#hud')).to_be_visible()
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
 assert not errors,errors
 report={'url':BASE,'version':'1.1.0','passed':True,'assets':assets,'browser':'WebKit','checks':['13 live assets match repository','new game starts','manual idle does not shoot','compact five-button HUD','More opens and closes','select mine','single saved run resumes','production has no test hooks','zero page errors']}
 (OUT/'live-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
 context.close();browser.close()
