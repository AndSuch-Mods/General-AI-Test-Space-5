import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,validState} from '../src/engine.js';
import {SaveStore} from '../src/storage.js';
import {MAPS,WORLD,MAP_SCALE} from '../src/data.js';
const ready=()=>{const g=Game.create('yard','normal',123);g.nextWave();g.s.countdown=0;g.s.player.hurt=100;g.s.remaining=1;g.s.spawnTimer=100;g.drain();return g;};
test('player never auto-aims or fires, even with obsolete auto input',()=>{
 const g=ready();g.spawn('walker');const e=g.s.enemies[0];e.x=g.s.player.x+120;e.y=g.s.player.y;g.s.player.angle=-1;
 for(let i=0;i<30;i++)g.tick(1/60,{auto:true});
 assert.equal(g.s.player.angle,-1);assert.equal(g.s.bullets.length,0);assert.equal(e.hp,e.maxHp);
 g.tick(1/60,{aim:0,fire:true});assert.ok(g.s.bullets.length>0);
});
for(const kind of ['grenade','barrel','mine','wall','turret'])test(`${kind} pickup credits inventory once and survives save validation`,()=>{
 const g=ready(),before=kind==='grenade'?g.s.grenades:g.s.inventory[kind];
 const d={kind,x:g.s.player.x,y:g.s.player.y,life:45};g.s.pickups.push(d);
 assert.ok(validState(g.snapshot()));g.collect(d);g.collect(d);
 assert.equal(kind==='grenade'?g.s.grenades:g.s.inventory[kind],before+1);assert.ok(validState(g.snapshot()));
});
test('legacy save migrates once into the bigger world without losing the run',()=>{
 const g=ready();g.s.wave=9;g.s.cash=459;g.s.owned.push('flamer');g.s.ammo.flamer=650;g.s.weapon='flamer';
 const old=g.snapshot();delete old.worldVersion;old.player.x/=MAP_SCALE.x;old.player.y/=MAP_SCALE.y;
 assert.ok(validState(old));const restored=new Game(old);
 assert.equal(restored.s.worldVersion,2);assert.equal(restored.s.player.x,g.s.player.x);assert.equal(restored.s.player.y,g.s.player.y);
 assert.equal(restored.s.wave,9);assert.equal(restored.s.cash,459);assert.deepEqual(restored.s.ammo,g.s.ammo);assert.equal(restored.s.id,old.id);
 assert.deepEqual(new Game(restored.snapshot()).snapshot(),restored.snapshot());assert.equal(old.worldVersion,undefined);
});
test('map entrances match their preview labels and spawn only on the listed edges',()=>{
 assert.ok(WORLD.w>1440&&WORLD.h>1000);
 for(const m of MAPS){const g=Game.create(m.id,'normal',456);
  for(let i=0;i<80;i++){g.s.enemies=[];g.spawn('walker');const e=g.s.enemies[0];
   const sides=[];if(e.x===35)sides.push('W');if(e.x===WORLD.w-35)sides.push('E');if(e.y===35)sides.push('N');if(e.y===WORLD.h-35)sides.push('S');
   assert.ok(sides.some(k=>m.approaches.includes(k)),m.id);
  }
 }
});
test('settings no longer expose the saved auto-fire preference',()=>{
 const mem={getItem:()=>JSON.stringify({auto:true,sound:false}),setItem:()=>{}};
 assert.equal(new SaveStore(mem).settings().auto,undefined);
});
