import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,validState} from '../src/engine.js';
import {SaveStore} from '../src/storage.js';
import {headFeatures} from '../src/model.js';
import {defenseTouches,defensesOverlap} from '../src/defenses.js';
import {MAPS,circleRect} from '../src/data.js';
const ticks=(g,n,input={})=>{for(let i=0;i<n;i++){g.tick(1/60,input);g.drain();}};
const fresh=()=>Game.create('yard','normal',8822);
const block=(x,y,kind='wall',hp=400)=>({id:x*10000+y,kind,x,y,r:kind==='wall'?28.3:17,hp,maxHp:hp,armed:0,fire:0,ammo:450,angle:0});
test('new game waits in preparation, with movement but no wave timer or gunfire',()=>{
 const g=fresh(),x=g.s.player.x,a=g.s.ammo.pistol,hp=g.s.player.hp;
 ticks(g,120,{mx:1,aim:0,fire:true});
 assert.ok(g.s.player.x>x+250);assert.equal(g.s.phase,'prep');assert.equal(g.s.wave,0);
 assert.equal(g.s.elapsed,0);assert.equal(g.s.enemies.length,0);assert.equal(g.s.bullets.length,0);
 assert.equal(g.s.ammo.pistol,a);assert.equal(g.s.player.hp,hp);assert.equal(g.grenade(),false);
 assert.ok(g.nextWave());assert.equal(g.s.wave,1);assert.equal(g.nextWave(),false);assert.equal(g.s.wave,1);
});
test('shop exits into prep, never into combat, and reopening cannot award a bonus',()=>{
 const g=fresh();g.nextWave();g.s.countdown=0;g.s.remaining=0;g.tick(1/60);
 const wave=g.s.wave,cash=g.s.cash,hp=g.s.player.hp;
 assert.equal(g.s.phase,'shop');assert.equal(g.nextWave(),false);
 assert.ok(g.prepare());assert.equal(g.s.phase,'prep');
 for(let i=0;i<8;i++){assert.ok(g.openShop());assert.ok(g.prepare());}
 assert.equal(g.s.wave,wave);assert.equal(g.s.cash,cash);assert.equal(g.s.player.hp,hp);
 ticks(g,600);assert.equal(g.s.enemies.length,0);assert.equal(g.s.phase,'prep');
 assert.ok(g.nextWave());assert.equal(g.s.wave,wave+1);
});
test('structure walls can be bought, selected and placed in prep, then survive wave start',()=>{
 const g=fresh();g.openShop();g.s.cash=500;const before=g.s.inventory.wall;
 assert.ok(g.buy('supply','wall'));assert.equal(g.s.inventory.wall,before+3);
 g.prepare();g.s.build='wall';g.s.player.angle=0;assert.ok(g.place());
 assert.equal(g.s.inventory.wall,before+2);const d={...g.s.defenses[0]};
 assert.equal(d.hp,400);assert.ok(g.nextWave());assert.deepEqual(g.s.defenses[0],d);
});
test('prep saves restore phase, placements, wave, cash and supplies without starting combat',()=>{
 const g=fresh();g.s.build='wall';g.s.player.angle=0;g.place();g.s.wave=7;g.s.cash=742;
 const mem=new Map(),store=new SaveStore({getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)});
 assert.ok(store.start(g));const restored=new Game(store.claim());
 assert.deepEqual(restored.snapshot(),g.snapshot());assert.ok(validState(restored.snapshot()));
 ticks(restored,120);assert.equal(restored.s.phase,'prep');assert.equal(restored.s.wave,7);
 assert.deepEqual(restored.s.defenses,g.s.defenses);
});
for(const kind of ['barrel','wall'])test(`${kind} placement snaps to connected 40-unit lines without allowing overlap`,()=>{
 const g=fresh();g.s.build=kind;g.s.inventory[kind]=5;g.s.player.x=1100;g.s.player.y=700;g.s.player.angle=0;
 assert.ok(g.place());g.s.player.placeCd=0;assert.equal(g.place(),false);
 g.s.player.y+=40;assert.ok(g.place());const [a,b]=g.s.defenses;
 assert.equal(a.x,b.x);assert.equal(b.y-a.y,40);assert.equal(defensesOverlap(a,b),false);
 assert.ok(g.s.defenses.some(d=>defenseTouches(d,a.x,(a.y+b.y)/2,12)), 'smallest zombie cannot pass through the seam');
});
test('a structure wall physically blocks the player',()=>{
 const g=fresh();g.s.player.x=1080;g.s.player.y=760;g.s.defenses=[block(1180,760)];
 ticks(g,60,{mx:1});assert.ok(g.s.player.x<1146);assert.ok(g.s.player.x>1100);
});
test('zombies navigate around player-built barriers when a route exists',()=>{
 const g=fresh();g.s.player.x=1250;g.s.player.y=760;g.nextWave();g.s.countdown=0;g.s.remaining=0;g.s.player.hurt=1e6;
 g.s.defenses=Array.from({length:6},(_,i)=>block(980,660+i*40));
 g.spawn('walker');const e=g.s.enemies[0];e.x=720;e.y=760;
 ticks(g,60*35);
 assert.ok(Math.hypot(e.x-g.s.player.x,e.y-g.s.player.y)<80,`walker stuck at ${e.x},${e.y}`);
 assert.ok(g.s.defenses.some(d=>d.hp>0));
});
test('an enclosed zombie breaks a weak wall instead of getting stuck forever',()=>{
 const g=fresh();g.s.player.x=1300;g.s.player.y=760;g.nextWave();g.s.countdown=0;g.s.remaining=0;g.s.player.hurt=1e6;
 const ds=[];for(let x=860;x<=1100;x+=40){ds.push(block(x,620,'wall',26),block(x,900,'wall',26));}
 for(let y=660;y<900;y+=40){ds.push(block(860,y,'wall',26),block(1100,y,'wall',26));}g.s.defenses=ds;
 g.spawn('walker');const e=g.s.enemies[0];e.x=980;e.y=760;
 ticks(g,60*35);assert.ok(g.s.defenses.length<ds.length);assert.ok(e.x>1120,`trapped ${e.x},${e.y}`);
});
test('destroying a defense invalidates navigation immediately',()=>{
 const g=fresh(),d=block(1180,760);g.s.defenses=[d];g.updateFlow();g.flowTime=.38;g.damageDefense(d,500);assert.equal(g.flowTime,0);
});
test('runway spawns every enemy type exclusively at the clear west entrance',()=>{
 const m=MAPS.find(m=>m.id==='runway'),g=Game.create(m.id);
 assert.deepEqual(m.approaches,['W']);assert.ok(m.spawn[0]>1500);
 for(const kind of ['walker','runner','brute','cinder','bomber','boss'])for(let i=0;i<60;i++){
  g.s.enemies=[];g.spawn(kind);const e=g.s.enemies[0];assert.equal(e.x,35);
  assert.ok(e.y>=m.spawnRanges.W[0]&&e.y<=m.spawnRanges.W[1]);assert.ok(!m.walls.some(w=>circleRect(e.x,e.y,e.r,w)));
 }
});
for(const player of [true,false]){
 test(`${player?'player':'zombie'} eyes are culled from rear and edge-on views`,()=>{
  for(const a of [-Math.PI/2,-Math.PI/4,-Math.PI*.75,0,Math.PI]){assert.equal(headFeatures(a,player).eyes.length,0);}
  for(const a of [Math.PI/4,Math.PI/2,Math.PI*.75])assert.equal(headFeatures(a,player).eyes.length,2);
 });
 test(`${player?'player':'zombie'} horns share the cuboid's rotated top plane`,()=>{
  for(let i=0;i<32;i++){
   const a=i*Math.PI/16,h=headFeatures(a,player),co=Math.cos(a),si=Math.sin(a);
   const expected=(f,u)=>[(5+f)*co-u*si,5*si+(f*si+u*co)*.68-h.z-h.height];
   for(let k=0;k<2;k++){
    const side=k?1:-1;assert.deepEqual(h.horns[k].base[0],expected(-3,side*6-1.8));
   }
  }
 });
}
