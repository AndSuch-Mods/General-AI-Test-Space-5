"""Compare browser viewport resizing with a minimal page, outside game code."""
import json
METRICS="""()=>({inner:[innerWidth,innerHeight],client:[document.documentElement.clientWidth,document.documentElement.clientHeight],media:matchMedia('(orientation:landscape)').matches,visual:visualViewport?{width:visualViewport.width,height:visualViewport.height}:null,orientation:screen.orientation?.type})"""
def probe(browser):
 for mobile in [False,True]:
  context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=mobile)
  page=context.new_page();page.bring_to_front()
  page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>html,body{width:100%;height:100%;margin:0}</style></head><body>Viewport baseline</body></html>')
  before=page.evaluate(METRICS)
  page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(500)
  after=page.evaluate(METRICS)
  print('MINIMAL VIEWPORT PROBE',json.dumps({'mobile':mobile,'before':before,'after':after}),flush=True)
  page.evaluate("document.querySelector('meta[name=viewport]').setAttribute('content','width='+innerWidth+',initial-scale=1,viewport-fit=cover')")
  page.wait_for_timeout(250)
  print('META REFRESH PROBE',json.dumps(page.evaluate(METRICS)),flush=True)
  context.close()
