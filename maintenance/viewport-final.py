from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'src/app.js';s=p.read_text()
old='const layoutWidth=document.documentElement.clientWidth||innerWidth;'
new='const layoutWidth=innerWidth;'
assert old in s or new in s
s=s.replace(old,new).replace('// Trust the layout width, and use visual height only when both views agree.','// innerWidth updates first in WebKit; clientWidth and visualViewport may lag a turn.')
old='  if(w<1||h<1)return;'
new="""  if(w<1||h<1)return;
  // Some WebKit mobile views retain the previous CSS viewport after rotation.
  // Re-resolve the meta viewport only on a verified mismatch at normal scale.
  if(touch&&Math.abs(document.documentElement.clientWidth-w)>4&&(!viewport||Math.abs(viewport.scale-1)<.02)){
    const meta=document.querySelector('meta[name="viewport"]');
    const content=`width=${w}, initial-scale=1, viewport-fit=cover`;
    if(meta&&meta.content!==content)meta.content=content;
  }"""
assert old in s
s=s.replace(old,new)
p.write_text(s)
p=root/'tests/browser.py';s=p.read_text()
s=s.replace('from playwright.sync_api import sync_playwright, expect','from playwright.sync_api import sync_playwright, expect\nfrom viewport_probe import probe')
s=s.replace('   browser=getattr(pw,engine).launch(**opts)','   browser=getattr(pw,engine).launch(**opts)\n   if engine==\'webkit\':probe(browser)')
p.write_text(s)
