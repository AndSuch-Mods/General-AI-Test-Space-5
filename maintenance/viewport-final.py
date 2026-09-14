from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'src/app.js';s=p.read_text()
old='const layoutWidth=document.documentElement.clientWidth||innerWidth;'
new='const layoutWidth=innerWidth;'
assert old in s or new in s
s=s.replace(old,new).replace('// Trust the layout width, and use visual height only when both views agree.','// innerWidth updates first in WebKit; clientWidth and visualViewport may lag a turn.')
p.write_text(s)
