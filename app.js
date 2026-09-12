import {Game} from './engine.js';
import {Renderer,weaponSVG,mapSVG} from './render.js';
import {RunStore} from './storage.js';
import {Sound} from './audio.js';
import {VERSION,WEAPONS,GUN,MAPS,MAP,SKINS,UPGRADES,upgradeCost,ammoMax,clamp} from './data.js';

const $=id=>document.getElementById(id),store=new RunStore(),settings=store.settings();
const renderer=new Renderer($('world'),settings),sound=new Sound(settings);
let game=null,view='menu',paused=true,dialogKind='',returnKind='menu',shopTab='weapons',pendingOptions=null,registration=null;
let lastTime=performance.now(),accumulator=0,lastSave=0,lastHUD=0,toastTimer=0,bannerTimer=0,weaponSignature='';
const input={keys:new Set(),mouse:{x:0,y:0,down:false,active:false},move:{x:0,y:0},aim:{x:0,y:0},use:false};
const heldPointers=new Map();
const money=n=>Math.floor(n).toLocaleString('en-US');
const clock=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
const touchMode=()=>settings.touch==='on'||(settings.touch!=='off'&&(matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0));
function setTouch(){document.body.classList.toggle('touch-mode',touchMode());$('autoButton').textContent=`AUTO-FIRE ${settings.autoFire?'ON':'OFF'}`;$('autoButton').setAttribute('aria-pressed',String(settings.autoFire));}
function toast(text,delay=3200){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),delay);}
function banner(text){$('waveBanner').textContent=text;$('waveBanner').classList.add('visible');clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>$('waveBanner').classList.remove('visible'),1900);}
function resetInput(){input.keys.clear();input.mouse.down=false;input.mouse.active=false;input.move={x:0,y:0};input.aim={x:0,y:0};input.use=false;heldPointers.clear();document.querySelectorAll('.knob').forEach(n=>n.style.transform='translate(0,0)');accumulator=0;}
function capturedOptions(){return{map:$('mapSelect').value,difficulty:$('difficultySelect').value,mode:$('modeSelect').value,skin:$('skinSelect').value,devils:$('devilsOption').checked,selfDamage:$('selfDamageOption').checked};}
function setOptions(s){$('mapSelect').value=s.map;$('difficultySelect').value=s.difficulty;$('modeSelect').value=s.mode;$('skinSelect').value=s.skin;$('devilsOption').checked=s.options?.devils??s.devils??true;$('selfDamageOption').checked=s.options?.selfDamage??s.selfDamage??false;updateRoom();}
function updateRoom(){const m=MAP[$('mapSelect').value]||MAP.outpost;$('mapPreview').innerHTML=mapSVG(m);$('roomName').textContent=m.name;$('roomDescription').textContent=m.desc;document.querySelector('.issue').textContent=`${String(MAPS.indexOf(m)+1).padStart(2,'0')} / 18`;$('modeHint').textContent=$('modeSelect').value==='classic'?'Chain kills to earn weapons and upgrades. No purchases.':'Earn credits. Buy weapons and upgrades between waves.';}
function menuState(){
 const entry=store.load(),r=store.records();$('continueButton').hidden=!entry;$('startButton').disabled=false;$('startButton').textContent=entry?'New game':'Enter room';$('startButton').className=`button ${entry?'secondary':'primary'}`;
 $('saveSummary').textContent=entry?`WAVE ${entry.state.wave} · ${MAP[entry.state.map].name.toUpperCase()} · ${clock(entry.state.time)} · ${entry.state.phase==='shop'?'IN ARMORY':'RUN SAVED'}`:'One automatic save. Death ends the run.';
 $('records').innerHTML=`<span>BEST WAVE <b>${r.wave||'—'}</b></span><span>HIGH SCORE <b>${r.score?money(r.score):'—'}</b></span>`;
 $('notice').hidden=store.available&&!store.error;if(!$('notice').hidden)$('notice').textContent=store.error||'Browser storage is unavailable. Progress will be lost when this page closes.';
}
function save(){
 if(!game||game.s.phase==='dead')return false;const ok=store.save(game.snapshot());lastSave=performance.now();$('saveIndicator').textContent=ok?'AUTOSAVED':'NOT SAVED';
 if(!ok&&store.available&&!store.owns(game.s.runId)){paused=true;resetInput();showMenu(false);toast('This run is open or has ended in another tab.',4500);}
 return ok;
}
function showMenu(saveFirst=true){if(saveFirst&&game&&game.s.phase!=='dead'&&store.owns(game.s.runId))save();paused=true;view='menu';resetInput();store.release();sound.suspend();closeDialog();$('menu').hidden=false;$('gameUI').hidden=true;document.body.classList.remove('playing');menuState();renderer.camera.x=demo.s.player.x;renderer.camera.y=demo.s.player.y;renderer.clear();}
function activate(g,restored=false){
 game=g;view='play';paused=false;resetInput();closeDialog();$('menu').hidden=true;$('gameUI').hidden=false;document.body.classList.add('playing');setTouch();renderer.resize();renderer.clear();renderer.camera.x=g.s.player.x;renderer.camera.y=g.s.player.y;weaponSignature='';sound.unlock();save();updateHUD();
 if(g.s.phase==='shop')showShop();else{processEvents();if(restored)banner('RUN RESTORED');else toast(touchMode()?'Left stick moves. Auto-fire is on. Drag right to aim manually.':'WASD moves. Auto-fire is on. Hold click to aim manually.',5500);}
 navigator.storage?.persist?.().catch(()=>{});
}
function start(options){
 if(!store.canAcquire()){toast('Pause the game in your other tab before starting here.',4500);return;}
 const g=new Game(options);if(!store.start(g.snapshot())){toast(store.error||'Another tab owns this run.',5000);return;}activate(g);if(!store.available)toast('Storage is blocked. This run will not survive a reload.',6000);
}
function requestNew(){pendingOptions=capturedOptions();if(store.load())showConfirm();else start(pendingOptions);}
function continueRun(){
 const entry=store.load();if(!entry){menuState();toast(store.error||'There is no saved run.');return;}
 if(!store.acquire(entry.state.runId)){toast('This run is active in another tab. Pause it there first.',5000);return;}
 try{setOptions(entry.state);activate(new Game({},entry.state),true);}catch(e){store.release();toast(e.message,6000);}
}
function closeDialog(){if($('dialog').open)$('dialog').close();dialogKind='';}
function showDialog(kind,content,wide=false){dialogKind=kind;$('dialog').classList.toggle('wide',wide);$('dialogBody').innerHTML=content;if(!$('dialog').open)$('dialog').showModal();}
const head=(label,title,action='back')=>`<div class="dialog-head"><div><div class="eyebrow">${label}</div><h2 id="dialogTitle">${title}</h2></div>${action?`<button class="dialog-close" data-action="${action}" aria-label="Close">×</button>`:''}</div>`;
function showConfirm(){showDialog('confirm',head('ONE SAVE SLOT','Replace this run?','cancel-new')+'<div class="dialog-content"><p>The current run, weapons, and upgrades will be erased. There is no second slot or undo.</p><div class="save-rule danger">Your personal best scores stay. Your active run does not.</div></div><div class="dialog-actions"><button class="button" data-action="cancel-new">Keep current run</button><button class="button danger" data-action="confirm-new">Erase & start</button></div>');}
function pause(show=true){if(!game||view==='menu'||game.s.phase==='dead')return;paused=true;resetInput();save();sound.suspend();if(show){if(game.s.phase==='shop')showShop();else showPause();}}
function showPause(){
 if(!game)return;view='play';paused=true;const s=game.s;showDialog('pause',head('RUN SUSPENDED','Take a breather.','resume')+`<div class="dialog-content"><div class="stats-grid"><div class="stat"><strong>${s.wave}</strong>WAVE</div><div class="stat"><strong>${s.kills}</strong>KILLS</div><div class="stat"><strong>${clock(s.time)}</strong>TIME</div></div><div class="save-rule">${store.available&&!store.error?'Your run is saved on this device. Closing the app will not end it.':store.error||'This run is not saved. Storage is blocked.'}</div><div class="menu-tools"><button class="text-button" data-action="help">Controls & weapons</button><button class="text-button" data-action="settings">Settings</button></div></div><div class="dialog-actions"><button class="button" data-action="menu">Main menu</button><button class="button primary" data-action="resume">Resume</button></div>`);
}
function resume(){if(!game)return;if(game.s.phase==='shop'){showShop();return;}if(!store.owns(game.s.runId)){continueRun();return;}view='play';paused=false;resetInput();sound.unlock();closeDialog();lastTime=performance.now();}
function rememberReturn(){returnKind=view==='menu'?'menu':game?.s.phase==='shop'?'shop':'pause';if(view!=='menu')pause(false);}
function back(){if(returnKind==='shop')showShop();else if(returnKind==='pause')showPause();else closeDialog();}
function showHelp(){
 rememberReturn();showDialog('help',head('FIELD MANUAL','Stay out of the swarm.')+`<div class="dialog-content"><p>Survive the wave, collect supplies, then prepare for the next one. The pistol has unlimited ammo. Every other weapon needs ammunition.</p><h3>Touch controls</h3><p>Drag the left stick to move. Auto-fire selects a visible enemy. Drag the right stick to aim and fire manually. Tap a weapon along the bottom to equip it. For barrels, walls, mines, and charges, use the right stick or the PLACE button.</p><div class="control-row"><span>Move</span><b>WASD / arrow keys</b></div><div class="control-row"><span>Aim & fire</span><b>Hold mouse / space</b></div><div class="control-row"><span>Select / cycle weapons</span><b>1–0 / Q, E</b></div><div class="control-row"><span>Grenade / remote detonation</span><b>G / X</b></div><div class="control-row"><span>Auto-fire / pause</span><b>F / P, Escape</b></div><h3>Survival or Classic</h3><p><b>Survival:</b> kills earn credits. Spend them in the armory between waves. <b>Classic:</b> increasing your kill chain unlocks the arsenal and grants permanent-for-this-run upgrades. Your chain decays when you stop killing.</p><h3>Know your targets</h3><p>Gray zombies swarm. Brown runners close quickly. Red devils throw fireballs, but taking hits interrupts them. Brutes arrive later. Every fifth wave brings an overlord when devils are enabled.</p><h3>Use the room</h3><p>Shoot barrels for chain reactions. Barricades block movement and bullets, and zombies can break them. Mines trigger automatically. Remote charges wait for DETONATE or X. Explosions do not pass through the room's concrete walls.</p><h3>One save, one life</h3><p>The active run saves about once per second, after purchases, and when you pause or leave the app. Death removes that run. Starting over asks before replacing it. Personal bests and settings survive.</p><p>Saves stay in this browser or installed web app, not in GitHub or iCloud. Clearing website data, private browsing, or storage eviction can remove them. Safari and a Home Screen app may use separate storage. Install first, then begin your main run.</p><h3>About this edition</h3><p>This is an original, single-player homage to Sean Cooper's Boxhead: 2Play Rooms. It uses new code, room layouts, graphics, audio, balancing, and mobile controls. It does not contain the original Flash game or its co-op and deathmatch modes.</p><p class="link-note"><a href="https://www.crazymonkeygames.com/guide/Boxhead-2Play-Rooms/" target="_blank" rel="noopener noreferrer">Original game's guide</a> · <a href="https://www.newgrounds.com/portal/view/378950" target="_blank" rel="noopener noreferrer">Sean Cooper's original release</a></p></div><div class="dialog-actions"><button class="button primary" data-action="back">Got it</button></div>`);
}
function showInstall(){rememberReturn();showDialog('install',head('HOME SCREEN / OFFLINE','Install on iPhone')+`<div class="dialog-content"><p>Open this page in <b>Safari</b>. Tap <b>Share</b>, then <b>Add to Home Screen</b>. Turn on <b>Open as Web App</b> when offered, then tap <b>Add</b>.</p><p>Launch Deadblock from its new icon. Landscape gives you a wider view, but portrait works too. Let the first load finish while online. The lobby's offline indicator confirms the game files are cached.</p><div class="save-rule">Install before starting the run you plan to keep. A Home Screen app may have separate storage from the Safari tab. Saves do not sync between devices.</div><h3>No background combat</h3><p>Switching apps or locking the screen pauses the run. Tap Resume when you come back. No enemies move while the game is hidden.</p></div><div class="dialog-actions"><button class="button primary" data-action="back">Back to game</button></div>`);}
function showSettings(){
 rememberReturn();const checked=k=>settings[k]?'checked':'';showDialog('settings',head('PREFERENCES','Make it comfortable.')+`<div class="dialog-content"><div class="setting-row"><label for="set-auto">Auto-fire<small>Choose a visible enemy when not aiming manually.</small></label><input id="set-auto" type="checkbox" data-setting="autoFire" ${checked('autoFire')}></div><div class="setting-row"><label for="set-sound">Sound effects<small>Procedural arcade audio.</small></label><input id="set-sound" type="checkbox" data-setting="sound" ${checked('sound')}></div><div class="setting-row"><label for="set-volume">Volume</label><input id="set-volume" type="range" min="0" max="1" step=".05" value="${settings.volume}" data-setting="volume"></div><div class="setting-row"><label for="set-blood">Blocky hit marks<small>Turn off red floor marks.</small></label><input id="set-blood" type="checkbox" data-setting="blood" ${checked('blood')}></div><div class="setting-row"><label for="set-motion">Reduced motion<small>No screen shake or damage flashes.</small></label><input id="set-motion" type="checkbox" data-setting="reducedMotion" ${checked('reducedMotion')}></div><div class="setting-row"><label for="set-touch">Touch controls</label><select id="set-touch" data-setting="touch"><option value="auto" ${settings.touch==='auto'?'selected':''}>Automatic</option><option value="on" ${settings.touch==='on'?'selected':''}>Always show</option><option value="off" ${settings.touch==='off'?'selected':''}>Hide</option></select></div><div class="setting-row"><label for="set-zoom">View size</label><select id="set-zoom" data-setting="zoom"><option value="0.8" ${settings.zoom===.8?'selected':''}>Wider view</option><option value="1" ${settings.zoom===1?'selected':''}>Normal</option><option value="1.2" ${settings.zoom===1.2?'selected':''}>Larger characters</option></select></div><div class="setting-row"><span class="link-note">BUILD ${VERSION}</span><button class="text-button" data-action="update">${registration?.waiting?'Install ready update':'Check for updates'}</button></div></div><div class="dialog-actions"><button class="button primary" data-action="back">Done</button></div>`);
}
function showShop(tab=shopTab,scroll=0){
 if(!game||game.s.phase!=='shop')return;paused=true;view='shop';shopTab=tab;resetInput();const s=game.s;
 const meta=`<div class="shop-meta"><span>HEALTH ${Math.ceil(s.player.hp)} / ${game.maxHp}</span><span>${s.mode==='survival'?`${money(s.cash)} CR AVAILABLE`:`PEAK CHAIN ×${s.bestCombo}`}</span></div>`;
 let content=head(`WAVE ${String(s.wave).padStart(2,'0')} / CLEAR`,'Room secured.','menu')+meta;
 if(s.mode==='classic'){
  content+=`<div class="dialog-content"><p>Your chain unlocks equipment automatically. Earned weapons and upgrades stay for this run, even when the chain drops.</p></div><div class="classic-grid">${WEAPONS.map(w=>`<div class="classic-item ${s.owned.includes(w.id)?'owned':''}">${weaponSVG(w.id)}${w.short}<br><b>${s.owned.includes(w.id)?'OWNED':`×${w.combo}`}</b></div>`).join('')}</div>`;
 }else{
  content+=`<div class="shop-tabs"><button class="shop-tab ${tab==='weapons'?'active':''}" data-tab="weapons">Arsenal</button><button class="shop-tab ${tab==='upgrades'?'active':''}" data-tab="upgrades">Upgrades</button><button class="shop-tab ${tab==='supplies'?'active':''}" data-tab="supplies">Supplies</button></div><div class="shop-grid">`;
  if(tab==='weapons')content+=WEAPONS.map(w=>{const owned=s.owned.includes(w.id);return`<div class="shop-card">${weaponSVG(w.id)}<div><h3>${w.name}</h3><p>${w.desc}</p></div><button class="button ${owned?'':'primary'}" data-action="${owned?'equip':'buy'}" data-id="${w.id}" ${!owned&&s.cash<w.cost?'disabled':''}>${owned?(s.selected===w.id?'EQUIPPED':'Equip'):`${money(w.cost)} CR · Buy`}</button></div>`;}).join('');
  if(tab==='upgrades')content+=UPGRADES.map((u,i)=>{const lv=s.up[u.id],max=lv>=u.max,cost=upgradeCost(u.id,lv);return`<div class="shop-card"><div class="upgrade-icon">${String(i+1).padStart(2,'0')}</div><div><div class="tier">LEVEL ${lv} / ${u.max}</div><h3>${u.name}</h3><p>${u.desc}</p></div><button class="button primary" data-action="upgrade" data-id="${u.id}" ${max||s.cash<cost?'disabled':''}>${max?'MAX LEVEL':`${money(cost)} CR · Upgrade`}</button></div>`;}).join('');
  if(tab==='supplies'){const needsAmmo=s.owned.some(id=>GUN[id].ammo>0&&s.ammo[id]<ammoMax(GUN[id],s.up));content+=`<div class="shop-card"><div class="upgrade-icon">+</div><div><h3>Field dressing</h3><p>Restore 60 health. Maximum health does not change.</p></div><button class="button primary" data-action="supply" data-id="heal" ${s.cash<100||s.player.hp>=game.maxHp?'disabled':''}>100 CR · Heal</button></div><div class="shop-card">${weaponSVG('uzi')}<div><h3>Ammunition crate</h3><p>Fully refill every weapon, explosive, and barricade you own.</p></div><button class="button primary" data-action="supply" data-id="ammo" ${s.cash<130||!needsAmmo?'disabled':''}>130 CR · Refill all</button></div>`;}
  content+='</div>';
 }
 content+=`<div class="dialog-actions shop-footer"><button class="button" data-action="menu">Save & exit</button><button class="button primary" data-action="next">Start wave ${s.wave+1} <span>→</span></button></div>`;
 showDialog('shop',content,true);const grid=$('dialogBody').querySelector('.shop-grid');if(grid)grid.scrollTop=scroll;updateHUD();
}
function transaction(action,id){
 const scroll=$('dialogBody').querySelector('.shop-grid')?.scrollTop||0;const ok=action==='buy'?game.buyWeapon(id):action==='upgrade'?game.upgrade(id):action==='supply'?game.supply(id):game.select(id);
 if(ok){processEvents();save();showShop(shopTab,scroll);}else toast('That purchase is not available.');
}
function death(){
 if(!game)return;paused=true;view='dead';resetInput();store.end(game.s.runId);store.record(game.s);const s=game.s;sound.event({type:'death'});
 showDialog('death',head('RUN ENDED','Overrun.','menu')+`<div class="dialog-content"><div class="stats-grid"><div class="stat"><strong>${s.wave}</strong>WAVE</div><div class="stat"><strong>${money(s.kills)}</strong>KILLS</div><div class="stat"><strong>${clock(s.time)}</strong>TIME</div></div><div class="stats-grid"><div class="stat"><strong>${money(s.score)}</strong>SCORE</div><div class="stat"><strong>×${s.bestCombo}</strong>BEST CHAIN</div><div class="stat"><strong>${s.owned.length}</strong>WEAPONS</div></div><div class="save-rule danger">This run has been erased. Your personal bests stay. The next run starts with a pistol and no upgrades.</div></div><div class="dialog-actions"><button class="button" data-action="menu">Main menu</button><button class="button primary" data-action="retry">Try again</button></div>`);
}
function processEvents(){if(!game)return;for(const e of game.drainEvents()){renderer.event(e);if(e.type!=='death')sound.event(e);if(e.type==='wave')banner(`WAVE ${String(e.wave).padStart(2,'0')}`);if(e.type==='unlock')toast(`${e.name.toUpperCase()} UNLOCKED`);if(e.type==='upgrade')toast(`${e.name} · level ${e.level}`);if(e.type==='toast')toast(e.text);if(e.type==='clear'){save();showShop();}if(e.type==='death'){death();break;}}}
function updateWeapons(){
 if(!game)return;const s=game.s,sig=s.owned.join(',');if(sig!==weaponSignature){$('weaponBar').innerHTML=WEAPONS.map(w=>`<button class="weapon" data-weapon="${w.id}" title="${w.name}" aria-label="${w.name}"><span class="shortcut">${w.key}</span>${weaponSVG(w.id)}<span class="weapon-name">${w.short}</span><span class="ammo"></span></button>`).join('');weaponSignature=sig;}
 for(const b of $('weaponBar').children){const id=b.dataset.weapon,w=GUN[id],owned=s.owned.includes(id);b.classList.toggle('selected',s.selected===id);b.classList.toggle('locked',!owned);b.setAttribute('aria-pressed',String(s.selected===id));b.querySelector('.ammo').textContent=owned?(w.ammo<0?'∞':s.ammo[id]):s.mode==='classic'?`×${w.combo}`:'LOCK';}
 const selected=GUN[s.selected],deploy=['barrel','wall','mine','charge'].includes(selected.kind);$('useButton').hidden=!deploy;$('useButton').textContent=`PLACE ${selected.short}`;$('grenadeButton').disabled=!s.owned.includes('grenade')||s.ammo.grenade<=0;$('grenadeCount').textContent=s.ammo.grenade??'—';const charges=s.objects.filter(o=>o.type==='charge'&&o.hp>0).length;$('chargeCount').textContent=charges;$('detonateButton').disabled=charges===0;
}
function updateHUD(){
 if(!game)return;const s=game.s;$('healthText').textContent=`${Math.ceil(s.player.hp)} / ${game.maxHp}`;$('healthFill').style.width=`${clamp(s.player.hp/game.maxHp*100,0,100)}%`;$('healthFill').style.background=s.player.hp<game.maxHp*.3?'#ad5235':'#62754e';$('cashText').textContent=s.mode==='classic'?'CLASSIC':`${money(s.cash)} CR`;$('waveText').textContent=String(s.wave).padStart(2,'0');$('enemyText').textContent=`${game.remaining} HOSTILES`;$('scoreText').textContent=String(Math.floor(s.score)).padStart(6,'0');$('comboPanel').classList.toggle('active',s.combo>=2);$('comboText').textContent=`×${Math.floor(s.combo)}`;$('comboFill').style.width=`${clamp(s.comboGrace/2.6*100,0,100)}%`;const next=WEAPONS.find(w=>!s.owned.includes(w.id));$('unlockText').textContent=s.mode==='classic'&&next?`NEXT: ${next.short} ×${next.combo}`:'';updateWeapons();
}
function readInput(){
 const keys=input.keys;let mx=input.move.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),my=input.move.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);let ax=input.aim.x,ay=input.aim.y,fire=Math.hypot(ax,ay)>.18||input.use||keys.has('Space')||keys.has('Slash')||input.mouse.down;
 if(Math.hypot(ax,ay)<=.18&&input.mouse.active&&(input.mouse.down||!settings.autoFire)){const w=renderer.unproject(input.mouse.x,input.mouse.y);ax=w.x-game.s.player.x;ay=w.y-game.s.player.y;const mag=Math.hypot(ax,ay)||1;ax/=mag;ay/=mag;}
 return{mx,my,ax,ay,fire,auto:settings.autoFire};
}
function toggleAuto(){settings.autoFire=!settings.autoFire;store.saveSettings(settings);setTouch();toast(`Auto-fire ${settings.autoFire?'on':'off'}.`);}
function quickGrenade(){if(!game||paused||view!=='play')return;if(!game.s.owned.includes('grenade')){toast('Unlock or buy grenades first.');return;}if(game.s.ammo.grenade===0){toast('No grenades remaining.');return;}game.shoot('grenade');processEvents();}
function bindStick(id,key){
 const pad=$(id),knob=pad.querySelector('.knob');
 function move(e){const slot=heldPointers.get(e.pointerId);if(!slot||slot.id!==id)return;const rect=pad.getBoundingClientRect(),r=rect.width*.34;let x=e.clientX-rect.left-rect.width/2,y=e.clientY-rect.top-rect.height/2;const len=Math.hypot(x,y);if(len>r){x=x/len*r;y=y/len*r;}knob.style.transform=`translate(${x}px,${y}px)`;input[key]={x:Math.abs(x/r)<.12?0:x/r,y:Math.abs(y/r)<.12?0:y/r};e.preventDefault();}
 pad.addEventListener('pointerdown',e=>{if(view!=='play'||paused||[...heldPointers.values()].some(s=>s.id===id))return;heldPointers.set(e.pointerId,{id});pad.setPointerCapture(e.pointerId);move(e);sound.unlock();});
 pad.addEventListener('pointermove',move);function up(e){if(heldPointers.get(e.pointerId)?.id!==id)return;heldPointers.delete(e.pointerId);input[key]={x:0,y:0};knob.style.transform='translate(0,0)';}pad.addEventListener('pointerup',up);pad.addEventListener('pointercancel',up);pad.addEventListener('lostpointercapture',up);
}

$('mapSelect').innerHTML=MAPS.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');$('skinSelect').innerHTML=SKINS.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');$('mapSelect').addEventListener('change',updateRoom);$('modeSelect').addEventListener('change',updateRoom);$('startButton').addEventListener('click',requestNew);$('continueButton').addEventListener('click',continueRun);$('helpButton').addEventListener('click',showHelp);$('settingsButton').addEventListener('click',showSettings);$('installButton').addEventListener('click',showInstall);$('pauseButton').addEventListener('click',()=>pause());$('autoButton').addEventListener('click',toggleAuto);$('grenadeButton').addEventListener('click',quickGrenade);$('detonateButton').addEventListener('click',()=>{if(!paused&&view==='play'){game.detonate();processEvents();}});
$('useButton').addEventListener('pointerdown',e=>{if(paused)return;input.use=true;$('useButton').setPointerCapture(e.pointerId);e.preventDefault();});for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('useButton').addEventListener(ev,()=>input.use=false);
bindStick('movePad','move');bindStick('aimPad','aim');
$('weaponBar').addEventListener('click',e=>{const b=e.target.closest('[data-weapon]');if(!b||!game)return;const id=b.dataset.weapon;if(game.select(id)){save();updateHUD();}else toast(game.s.mode==='classic'?`Earn a ×${GUN[id].combo} kill chain to unlock ${GUN[id].name}.`:`Buy ${GUN[id].name} in the armory after a wave.`);});
$('world').addEventListener('pointermove',e=>{if(e.pointerType==='touch'||view!=='play')return;input.mouse.x=e.clientX;input.mouse.y=e.clientY;input.mouse.active=true;});$('world').addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||view!=='play'||paused)return;input.mouse.down=true;input.mouse.active=true;input.mouse.x=e.clientX;input.mouse.y=e.clientY;$('world').setPointerCapture(e.pointerId);sound.unlock();e.preventDefault();});for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(ev,()=>input.mouse.down=false);$('world').addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{
 if(view!=='play'||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName))return;if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();if(e.repeat)return;if(paused&&dialogKind==='pause')resume();else if(!paused)pause();return;}if(paused)return;
 const allowed=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Slash','KeyQ','KeyE','KeyG','KeyX','KeyF'];if(allowed.includes(e.code)||e.code.startsWith('Digit'))e.preventDefault();input.keys.add(e.code);if(e.repeat)return;if(e.code==='KeyQ')game.cycle(-1);if(e.code==='KeyE')game.cycle(1);if(e.code==='KeyG')quickGrenade();if(e.code==='KeyX'){game.detonate();processEvents();}if(e.code==='KeyF')toggleAuto();if(e.code.startsWith('Digit')){const w=WEAPONS.find(w=>w.key===e.key);if(w)game.select(w.id);}updateHUD();
});window.addEventListener('keyup',e=>input.keys.delete(e.code));
$('dialogBody').addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.tab){showShop(b.dataset.tab);return;}const a=b.dataset.action,id=b.dataset.id;
 if(a==='resume')resume();if(a==='back')back();if(a==='menu')showMenu();if(a==='help')showHelp();if(a==='settings')showSettings();if(a==='cancel-new')closeDialog();if(a==='confirm-new')start(pendingOptions);if(a==='retry'){const s=game.s;start({map:s.map,difficulty:s.difficulty,mode:s.mode,skin:s.skin,...s.options});}
 if(a==='next'&&game.nextWave()){view='play';paused=false;resetInput();closeDialog();sound.unlock();processEvents();save();}
 if(['buy','upgrade','supply','equip'].includes(a))transaction(a,id);
 if(a==='update'){
  if(!registration){toast('Updates require a secure connection to the hosted site.');return;}
  if(registration.waiting){if(game&&game.s.phase!=='dead')save();registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});toast('Saved. Installing update…');}
  else{try{await registration.update();toast(registration.waiting?'An update is ready. Tap Check for updates again to install.':'Update check requested. New versions appear here when ready.');}catch{toast('Could not check for updates. Connect to the internet and try again.');}}
 }
});
$('dialogBody').addEventListener('change',e=>{const key=e.target.dataset.setting;if(!key)return;const val=e.target.type==='checkbox'?e.target.checked:['zoom','volume'].includes(key)?Number(e.target.value):e.target.value;settings[key]=val;store.saveSettings(settings);setTouch();sound.update();if(key==='sound'&&val)sound.unlock();if(key==='blood'&&!val)renderer.decals=[];});
$('dialog').addEventListener('cancel',e=>{e.preventDefault();if(dialogKind==='pause')resume();else if(['help','settings','install'].includes(dialogKind))back();else if(dialogKind==='confirm')closeDialog();else if(dialogKind==='death')showMenu();});
function background(){if(view!=='menu'&&game?.s.phase!=='dead'){pause(false);store.release();if(game?.s.phase==='shop')showShop();else showPause();}sound.suspend();resetInput();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)background();else lastTime=performance.now();});window.addEventListener('pagehide',background);window.addEventListener('blur',()=>{if(view==='play'&&!paused)pause();});window.addEventListener('resize',()=>{renderer.resize();resetInput();});window.visualViewport?.addEventListener('resize',()=>renderer.resize());
window.addEventListener('storage',e=>{if(!game||view==='menu'||game.s.phase==='dead')return;if(e.key===store.key('epoch')&&e.newValue!==game.s.runId){showMenu(false);toast('The active run changed in another tab.',4500);}else if(e.key===store.key('lease')){const l=store.lease();if(l&&l.tab!==store.tab){showMenu(false);toast('This run is now active in another tab.',4500);}}});

const demo=new Game({map:'outpost',skin:'ranger',seed:4217});demo.s.player.x=755;demo.s.player.y=500;demo.s.player.angle=.35;demo.s.objects=[{id:1,type:'barrel',x:640,y:585,hp:26,arm:0,damage:160,radius:135},{id:2,type:'barrel',x:820,y:690,hp:26,arm:0,damage:160,radius:135},{id:3,type:'wall',x:662,y:440,hp:250,arm:0,damage:0,radius:0}];demo.s.enemies=[];
for(let i=0;i<15;i++){const a=i*2.399,r=145+(i%4)*58;const x=755+Math.cos(a)*r,y=500+Math.sin(a)*r;demo.s.enemies.push({id:10+i,type:i===4?'devil':'zombie',x,y,hp:40,maxHp:40,r:13,angle:Math.atan2(500-y,755-x),walk:i,flash:0});}demo.walls=[{x:390,y:730,w:180,h:80},{x:950,y:220,w:200,h:80}];demo.drainEvents();
function frame(now){
 const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
 if(!document.hidden){
  if(game&&view==='play'&&!paused&&game.s.phase==='wave'){
   accumulator=Math.min(accumulator+dt,.1);let steps=0;while(accumulator>=1/60&&steps++<6&&!paused){game.update(1/60,readInput());processEvents();accumulator-=1/60;}
   if(now-lastSave>1000&&!paused)save();
  }
  const shown=view==='menu'?demo:game||demo;renderer.render(shown,paused&&view!=='menu'?0:dt,{menu:view==='menu',touch:touchMode()});if(now-lastHUD>100&&view!=='menu'){updateHUD();lastHUD=now;}
 }
 requestAnimationFrame(frame);
}
let reloading=false;
async function enableOffline(){
 if(!('serviceWorker'in navigator)||!window.isSecureContext)return;
 try{
  registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});await navigator.serviceWorker.ready;$('offlineStatus').innerHTML='<i></i> OFFLINE READY';
  if(registration.waiting)toast('A game update is ready. Install it from Settings between sessions.',5500);
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)toast('Update ready. Your current run is unchanged.',5000);});});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!reloading&&registration?.active&&sessionStorage.getItem('deadblock-update')){reloading=true;sessionStorage.removeItem('deadblock-update');location.reload();}});
 }catch{$('offlineStatus').innerHTML='<i></i> ONLINE / CACHE UNAVAILABLE';}
}
// Keep update activation explicit; never refresh a live run automatically.
$('dialogBody').addEventListener('click',e=>{if(e.target.closest('[data-action="update"]')&&registration?.waiting){try{sessionStorage.setItem('deadblock-update','1');}catch{}}},true);
window.addEventListener('error',e=>{if(!e.error)return;paused=true;try{if(game&&game.s.phase!=='dead')save();}catch{}const n=$('bootStatus');n.hidden=false;n.textContent='The game stopped unexpectedly. Reload to restore the last saved moment.';n.style.zIndex='99';});
const existing=store.load();if(existing)setOptions(existing.state);else updateRoom();setTouch();menuState();$('bootStatus').hidden=true;$('buildLabel').textContent=`BUILD ${VERSION} · NO ADS · NO ACCOUNT`;requestAnimationFrame(frame);enableOffline();
// Local-only test hooks. No debug controls are exposed on the hosted site.
if(['localhost','127.0.0.1'].includes(location.hostname))window.__deadblock={get game(){return game;},get view(){return view;},get paused(){return paused;},store,settings,renderer,input,start,save,pause,resume,processEvents,updateHUD,showShop,showMenu};
