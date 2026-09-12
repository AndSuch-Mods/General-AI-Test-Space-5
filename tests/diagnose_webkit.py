"""Capture WebKit lifecycle state without changing game behavior."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'
OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',8766),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as pw:
        browser=pw.webkit.launch(headless=True)
        page=browser.new_page(viewport={'width':1365,'height':900})
        page.on('console',lambda msg: print('WEBKIT CONSOLE',msg.type,msg.text,flush=True))
        page.on('pageerror',lambda error: print('WEBKIT ERROR',str(error),flush=True))
        page.add_init_script('''window.lifecycleLog=[];for(const name of ['blur','focus','visibilitychange','pagehide'])window.addEventListener(name,event=>{window.lifecycleLog.push({name,target:event.target.tagName||'window',hidden:document.hidden,focused:document.hasFocus(),paused:window.__deadblock?.paused,at:performance.now()});},true);''')
        page.goto('http://127.0.0.1:8766/?test=1')
        page.wait_for_function('!!window.__deadblock')
        page.locator('#newButton').click()
        page.locator('[data-action="begin"]').click()
        for i in range(4):
            state=page.evaluate('''({game:!!__deadblock.game,paused:__deadblock.paused,hidden:document.hidden,focused:document.hasFocus(),countdown:__deadblock.game?.s.countdown,elapsed:__deadblock.game?.s.elapsed,save:!!__deadblock.store.read(),storageError:__deadblock.store.error,conflict:__deadblock.store.conflict,panel:document.getElementById('panel').open,events:window.lifecycleLog})''')
            print('WEBKIT STATE',json.dumps(state),flush=True)
            page.wait_for_timeout(500)
        page.screenshot(path=str(OUT/'webkit-lifecycle-diagnostic.png'))
        (OUT/'webkit-lifecycle-state.json').write_text(json.dumps(state,indent=2))
        browser.close()
finally:
    server.shutdown()
