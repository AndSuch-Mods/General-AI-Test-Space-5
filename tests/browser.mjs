import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,webkit} from 'playwright';

// Serve under the same subdirectory used by the GitHub Pages project.
const root=resolve('.'),prefix='/General-AI-Test-Space-5/';
let networkAvailable=true;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{if(!networkAvailable){res.destroy();return;}try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!path.startsWith(prefix)){res.writeHead(404).end();return;}const file=resolve(root,path.slice(prefix.length)||'index.html');if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain','Cache-Control':'no-cache'});res.end(data);}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(8765,'127.0.0.1',done));
await mkdir('qa',{recursive:true});
const results=[];
const profiles=[{name:'desktop',viewport:{width:1365,height:900},touch:false},{name:'iphone-portrait',viewport:{width:402,height:874},touch:true},{name:'iphone-landscape',viewport:{width:874,height:402},touch:true}];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true});
 for(const profile of profiles){
  networkAvailable=true;
  const name=engine+'-'+profile.name,checks=[],errors=[];
  const context=await browser.newContext({viewport:profile.viewport,isMobile:profile.touch,hasTouch:profile.touch,deviceScaleFactor:1});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
  const shot=label=>page.screenshot({path:`qa/${name}-${label}.png`,fullPage:true});
  const state=()=>page.evaluate(()=>__deadblock.game?.snapshot());
  const press=async selector=>{const locator=page.locator(selector).last();if(profile.touch)await locator.tap();else await locator.click();};
  try{
   await page.goto(`http://127.0.0.1:8765${prefix}`,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.__deadblock&&document.querySelector('#bootStatus').hidden);
   await page.waitForFunction(()=>document.querySelector('#offlineStatus').textContent.includes('OFFLINE READY'));
   console.log('CAPABILITIES',name,await page.evaluate(()=>({maxTouchPoints:navigator.maxTouchPoints,coarse:matchMedia('(pointer:coarse)').matches,setting:__deadblock.settings.touch})));
   check('lobby loads; no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   check('all 18 rooms available',await page.locator('#mapSelect option').count()===18);
   for(const id of await page.locator('#mapSelect option').evaluateAll(a=>a.map(e=>e.value)))await page.selectOption('#mapSelect',id);
   await page.selectOption('#mapSelect','outpost');await shot('lobby');
   await press('#startButton');await page.waitForTimeout(350);
   check('new game creates one save',await page.evaluate(()=>!!__deadblock.store.load()&&__deadblock.view==='play'));
   if(profile.touch)check('touch input automatically displays joysticks',await page.locator('#movePad').isVisible());
   await press('#pauseButton');const frozen=(await state()).time;await page.waitForTimeout(200);
   check('pause freezes simulation',(await state()).time===frozen);await shot('pause');
   await press('[data-action="resume"]');
   const before=(await state()).player;
   if(profile.touch){const pad=await page.locator('#movePad').boundingBox();assert.ok(pad,'movement pad visible');await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height/2);await page.mouse.down();await page.mouse.move(pad.x+pad.width/2+32,pad.y+pad.height/2-15);await page.waitForTimeout(250);await page.mouse.up();}
   else{await page.keyboard.down('KeyD');await page.waitForTimeout(250);await page.keyboard.up('KeyD');}
   check('movement input changes position',(await state()).player.x>before.x+10);
   if(profile.touch&&engine==='chromium'){
    const left=await page.locator('#movePad').boundingBox(),right=await page.locator('#aimPad').boundingBox();const cdp=await context.newCDPSession(page);
    const points=[{id:1,x:left.x+left.width/2,y:left.y+left.height/2},{id:2,x:right.x+right.width/2,y:right.y+right.height/2}];
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});points[0].x+=28;points[1].x+=30;points[1].y-=10;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points});await page.waitForTimeout(180);
    check('simultaneous touch move and aim',await page.evaluate(()=>__deadblock.input.move.x>.2&&__deadblock.input.aim.x>.2));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(30);
    check('touch release resets both sticks',await page.evaluate(()=>__deadblock.input.move.x===0&&__deadblock.input.aim.x===0));await cdp.detach();
   }
   await page.waitForTimeout(1600);await shot('gameplay');
   await page.evaluate(()=>{const g=__deadblock.game;g.s.spawnLeft=0;g.s.enemies=[];g.s.projectiles=[];g.s.cash=10000;g.update(1/60,{});__deadblock.processEvents();});
   await press('[data-action="buy"][data-id="uzi"]');
   check('armory purchase persists',await page.evaluate(()=>__deadblock.store.load().state.owned.includes('uzi')));
   await press('[data-tab="upgrades"]');await press('[data-action="upgrade"][data-id="damage"]');await press('[data-action="upgrade"][data-id="health"]');
   check('upgrade purchase persists',await page.evaluate(()=>__deadblock.store.load().state.up.damage===1&&__deadblock.game.maxHp===120));
   await press('[data-tab="weapons"]');await shot('armory');const saved=await state();
   await page.reload({waitUntil:'networkidle'});await press('#continueButton');
   check('reload restores exact run state',JSON.stringify(await state())===JSON.stringify(saved));
   await press('[data-action="next"]');check('next wave advances',(await state()).wave===2);
   await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));const backgroundTime=(await state()).time;await page.waitForTimeout(180);
   check('leaving app pauses without background combat',(await state()).time===backgroundTime&&await page.evaluate(()=>__deadblock.paused));
   await press('[data-action="resume"]');check('resume reacquires save ownership',await page.evaluate(()=>!__deadblock.paused&&__deadblock.store.owns(__deadblock.game.s.runId)));
   await press('#pauseButton');await press('[data-action="menu"]');const oldId=await page.evaluate(()=>__deadblock.store.load().state.runId);
   await press('#startButton');await press('[data-action="cancel-new"]');check('cancel new game keeps save',await page.evaluate(()=>__deadblock.store.load().state.runId)===oldId);
   await press('#startButton');await press('[data-action="confirm-new"]');
   check('confirmed new game replaces the one slot',(await state()).runId!==oldId&&(await state()).owned.length===1&&(await state()).up.damage===0);
   await page.evaluate(()=>{const g=__deadblock.game;g.s.score=12345;g.s.player.hurt=0;g.hurt(10000);__deadblock.processEvents();});
   check('death deletes save and keeps personal best',await page.evaluate(()=>__deadblock.store.load()===null&&__deadblock.store.records().score>=12345));await shot('death');
   await press('[data-action="menu"]');await page.reload({waitUntil:'networkidle'});
   check('dead run does not return after reload',await page.locator('#continueButton').isHidden());
   // A socket-level outage tests cached navigation in both engines. WebKit's
   // DevTools offline flag can fail internally before consulting its worker.
   networkAvailable=false;
   await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.__deadblock&&document.querySelector('#startButton').disabled===false);await press('#startButton');
   check('cached app starts with its server unreachable',await page.evaluate(()=>__deadblock.view==='play'&&__deadblock.game.s.phase==='wave'));
   networkAvailable=true;
   check('no uncaught browser errors',errors.length===0);
   results.push({name,passed:true,checks,errors});console.log('PASS',name,checks.length,'checks');
  }catch(error){await shot('FAILED').catch(()=>{});results.push({name,passed:false,checks,errors,error:String(error.stack||error)});console.error('FAIL',name,error);}
  networkAvailable=true;await context.close();
 }
 await browser.close();
}
server.close();await writeFile('qa/results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(r=>({name:r.name,passed:r.passed,checks:r.checks.length})),null,2));
if(results.some(r=>!r.passed))process.exitCode=1;
