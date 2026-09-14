from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'src/app.js';s=p.read_text()
old="  const w=Math.round(viewport?.width||innerWidth),h=Math.round(viewport?.height||innerHeight);"
new="""  // Safari can report the previous visual viewport during orientation transitions.
  // Trust the layout width, and use visual height only when both views agree.
  const layoutWidth=document.documentElement.clientWidth||innerWidth;
  const settled=viewport&&Math.abs(viewport.width-layoutWidth)<4&&Math.abs(viewport.scale-1)<.02;
  const w=Math.round(layoutWidth),h=Math.round(settled?viewport.height:innerHeight);"""
assert old in s or new in s
s=s.replace(old,new);p.write_text(s)
p=root/'tests/browser.py';s=p.read_text()
old="     print('FAIL',engine,name,str(error),errors,flush=True);"
new="""     metrics=page.evaluate('''()=>({inner:[innerWidth,innerHeight],outer:[outerWidth,outerHeight],client:[document.documentElement.clientWidth,document.documentElement.clientHeight],screen:[screen.width,screen.height],media:matchMedia('(orientation:landscape)').matches,visual:visualViewport?{w:visualViewport.width,h:visualViewport.height,scale:visualViewport.scale}:null,hidden:document.hidden,orientation:screen.orientation?.type,blocked:window.__deadblock?.rotationBlocked})''')
     print('VIEWPORT',page.viewport_size,metrics,flush=True)
     print('FAIL',engine,name,str(error),errors,flush=True);"""
assert old in s or new in s
s=s.replace(old,new) if new not in s else s;p.write_text(s)
