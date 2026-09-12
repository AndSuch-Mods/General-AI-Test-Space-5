"""Verify that GitHub Pages serves this commit's assets and plays in WebKit."""
from pathlib import Path
import hashlib
import json
import time
from urllib.request import Request, urlopen
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'
OUT.mkdir(exist_ok=True)
BASE='https://andsuch-mods.github.io/General-AI-Test-Space-5/'
KEY='deadblock.survival.run.v1'
FILES=['index.html','styles.css','src/data.js','src/engine.js','src/app.js','src/storage.js','src/renderer.js','src/audio.js','manifest.webmanifest','sw.js','icon.png']

def read_remote(path):
    req=Request(BASE+path,headers={'User-Agent':'Deadblock-deployment-check','Cache-Control':'no-cache'})
    with urlopen(req,timeout=20) as response:
        return response.read()

for attempt in range(30):
    try:
        if read_remote('index.html')==(ROOT/'index.html').read_bytes():
            break
    except Exception as error:
        print('Waiting for Pages:',type(error).__name__,flush=True)
    time.sleep(10)
else:
    raise RuntimeError('GitHub Pages did not publish this game within five minutes')

resources=[]
for path in FILES:
    expected=(ROOT/path).read_bytes()
    for attempt in range(12):
        actual=read_remote(path)
        if actual==expected:
            break
        time.sleep(5)
    else:
        raise AssertionError('Deployed asset does not match checkout: '+path)
    resources.append({'path':path,'sha256':hashlib.sha256(actual).hexdigest(),'result':'matched'})

with sync_playwright() as pw:
    browser=pw.webkit.launch(headless=True)
    context=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    try:
        page.goto(BASE)
        expect(page).to_have_title('Deadblock | Last stand')
        assert page.evaluate('typeof window.__deadblock')=='undefined'
        page.wait_for_function("document.getElementById('offlineStatus').textContent.includes('OFFLINE READY')")
        page.wait_for_function('navigator.serviceWorker.controller!==null')
        page.screenshot(path=str(OUT/'live-menu.png'))
        page.locator('#newButton').click()
        page.locator('[data-action="begin"]').click()
        expect(page.locator('#hud')).to_be_visible()
        page.wait_for_timeout(3300)
        page.locator('#pauseButton').click()
        run=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).data',KEY)
        assert run['wave']==1
        assert run['player']['hp']>0
        page.screenshot(path=str(OUT/'live-paused.png'))
        context.set_offline(True)
        page.reload()
        expect(page.locator('#continueButton')).to_be_visible()
        page.locator('#continueButton').click()
        expect(page.locator('#hud')).to_be_visible()
        page.wait_for_timeout(250)
        page.locator('#pauseButton').click()
        restored=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).data',KEY)
        assert restored['id']==run['id']
        assert restored['owned']==run['owned']
        assert not errors,errors
        page.screenshot(path=str(OUT/'live-offline-resume.png'))
        report={'url':BASE,'result':'passed','assets':resources,'browser':'WebKit','checks':['public HTML and assets match repository','no production test hooks','new game','autosave','offline reload','continue same run','zero page errors']}
        (OUT/'live-results.json').write_text(json.dumps(report,indent=2))
        print(json.dumps(report,indent=2),flush=True)
    except Exception:
        page.screenshot(path=str(OUT/'live-failure.png'))
        raise
    finally:
        context.close()
        browser.close()
