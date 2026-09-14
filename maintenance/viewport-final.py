from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'src/app.js';s=p.read_text()
old='const layoutWidth=document.documentElement.clientWidth||innerWidth;'
new='const layoutWidth=innerWidth;'
assert old in s or new in s
s=s.replace(old,new).replace('// Trust the layout width, and use visual height only when both views agree.','// innerWidth updates first in WebKit; clientWidth and visualViewport may lag a turn.')
p.write_text(s)
p=root/'tests/browser.py';s=p.read_text()
s=s.replace('from playwright.sync_api import sync_playwright, expect','from playwright.sync_api import sync_playwright, expect\nfrom viewport_probe import probe')
s=s.replace('   browser=getattr(pw,engine).launch(**opts)','   browser=getattr(pw,engine).launch(**opts)\n   if engine==\'webkit\':probe(browser)')
p.write_text(s)
