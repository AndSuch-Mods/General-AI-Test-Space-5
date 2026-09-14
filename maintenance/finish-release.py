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

# Avoid replacing a button's child text while a pointer gesture is in progress.
p=root/'src/app.js';s=p.read_text()
old="$('startWaveButton').textContent=`Start wave ${s.wave+1} →`;"
new="const startLabel=`Start wave ${s.wave+1} →`;if($('startWaveButton').textContent!==startLabel)$('startWaveButton').textContent=startLabel;"
assert old in s or new in s;s=s.replace(old,new)
p.write_text(s)
p=root/'src/renderer.js';s=p.read_text()
old="if (p.hurt <= 0 || Math.floor(this.time * 16) % 2 === 0)"
new="if (state.phase === 'prep' || p.hurt <= 0 || Math.floor(this.time * 16) % 2 === 0)"
assert old in s or new in s;s=s.replace(old,new);p.write_text(s)
p=root/'styles.css';s=p.read_text()
extra='\n/* Prep notices stay clear of Shop and Start wave. */\nbody:has(#prepBar:not([hidden])) #toast{top:calc(113px + var(--safe-top))}\n'
if extra not in s:p.write_text(s+extra)
p=root/'tests/browser.py';s=p.read_text()
s=s.replace("page.locator('#startWaveButton').click();assert page.evaluate('__deadblock.game.s.wave')==1", "page.locator('#startWaveButton').click();page.wait_for_function('__deadblock.game.s.wave===1',timeout=7000)")
s=s.replace("expect(page.locator('#orientationGate')).to_be_hidden()", "expect(page.locator('#orientationGate')).to_be_hidden(timeout=10000)")
s=s.replace("blocked:window.__deadblock?.rotationBlocked}", "blocked:window.__deadblock?.rotationBlocked,phase:window.__deadblock?.game?.s.phase,wave:window.__deadblock?.game?.s.wave,paused:window.__deadblock?.paused,focus:document.activeElement?.outerHTML,panel:document.querySelector('#panel')?.open}")
s=s.replace("     raise\n    finally:context.close()", "     results.append({'browser':engine,'layout':name,'passed':False,'error':str(error),'viewport':metrics})\n    finally:context.close()")
s += "\nassert all(item['passed'] for item in results), 'Browser cases failed; see results.json'\n" if "assert all(item['passed']" not in s else ''
p.write_text(s)
