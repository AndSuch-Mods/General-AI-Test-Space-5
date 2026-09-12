import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,validState} from '../src/engine.js';
test('boss health drops preserve the pickup cap and a valid save',()=>{
  const g=Game.create('yard','normal',987);
  g.s.countdown=0;
  g.s.remaining=1;
  g.s.spawnTimer=99;
  g.s.pickups=Array.from({length:60},(_,i)=>({x:100+i,y:100,kind:'ammo',life:45}));
  g.spawn('boss');
  const boss=g.s.enemies.at(-1);
  boss.x=1200;boss.y=500;
  g.damageEnemy(boss,100000);
  assert.equal(g.s.pickups.length,60);
  g.tick(1/60);
  assert.equal(g.s.pickups.length,60);
  assert.ok(validState(g.snapshot()));
});
