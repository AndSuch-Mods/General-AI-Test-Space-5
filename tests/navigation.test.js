import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../engine.js';
import {MAPS,distance} from '../data.js';

test('kill events retain their event name and carry enemy type separately',()=>{
 const g=new Game({map:'empty',seed:42});g.drainEvents();g.spawn();const e=g.s.enemies[0];g.hit(e,10000);
 const event=g.drainEvents().find(e=>e.type==='kill');assert.ok(event);assert.equal(event.enemyType,e.type);
 g.emit('test',{type:'should-not-replace-event-name'});assert.equal(g.drainEvents()[0].type,'test');
});

test('small and large enemies navigate all 18 rooms from four directions',()=>{
 for(const map of MAPS)for(const r of [13,30])for(const start of [[60,520],[1380,520],[720,60],[720,980]]){
  const g=new Game({map:map.id,seed:42});g.s.objects=[];g.s.enemies=[];g.s.spawnLeft=0;
  const spot=g.findFree(...start,r);const e={id:g.s.nextId++,type:'zombie',...spot,r,hp:100,maxHp:100,speed:110,angle:0,attack:1,stun:0,walk:0};g.s.enemies.push(e);
  for(let i=0;i<2400&&distance(e,g.s.player)>r+18;i++){g.s.player.hurt=5;g.update(1/60,{});g.drainEvents();}
  assert.ok(distance(e,g.s.player)<=r+24,`${map.id}, radius ${r}, entrance ${start}: enemy stuck`);
 }
});
