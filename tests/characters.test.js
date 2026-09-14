import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildCharacter,visibleSurfaces,projectPoint,MODEL_KINDS,MODEL_REVISION} from '../src/characters.js';
import {Game} from '../src/engine.js';
import {ENEMIES,VERSION} from '../src/data.js';

test('legacy canvas models remain an isolated reference, not the active renderer',()=>{
  assert.equal(MODEL_REVISION,'1.3.0');
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(app,/from '\.\/renderer3d.js'/);
});
for(const kind of MODEL_KINDS){
  test(`${kind}: solid surfaces and no rear-facing eyes`,()=>{
    const m=buildCharacter(kind,'carbine',0,true);
    assert.ok(m.boxes.length>=20);
    for(const b of m.boxes){assert.ok(b.d>0&&b.w>0&&b.h>0);assert.match(b.color,/^#[0-9a-f]{6}$/i);}
    const eyeCount=a=>visibleSurfaces(m,a).flatMap(f=>f.patches).filter(p=>p.tag==='eye').length;
    for(const a of [-Math.PI/2,-Math.PI/4,-3*Math.PI/4,0,Math.PI])assert.equal(eyeCount(a),0);
    for(const a of [Math.PI/4,Math.PI/2,3*Math.PI/4])assert.equal(eyeCount(a),2);
  });
  test(`${kind}: all directions fit the cached sprite without clipping`,()=>{
    for(let direction=0;direction<32;direction++)for(let frame=0;frame<4;frame++){
      const m=buildCharacter(kind,'launcher',frame,true);
      for(const s of visibleSurfaces(m,direction*Math.PI/16))for(const [x,y] of s.points){
        assert.ok(x>-56&&x<56,`${kind} x=${x}`);assert.ok(y>-98&&y<14,`${kind} y=${y}`);
      }
    }
  });
  test(`${kind}: disabling blood removes model stains`,()=>{
    const m=buildCharacter(kind,'pistol',0,false);
    assert.equal(m.boxes.flatMap(b=>b.face).filter(p=>p.tag==='blood').length,0);
    assert.equal(m.boxes.filter(b=>b.tag==='scalp-mark').length,0);
  });
}
for(const kind of ['cinder','boss'])test(`${kind}: both horns intersect the skull`,()=>{
  const m=buildCharacter(kind),h=m.head;
  assert.equal(m.horns.length,2);
  for(const root of m.horns){
    assert.ok(root.z<h.z+h.h&&root.z+7>h.z+h.h);
    assert.ok(Math.abs(root.r)<h.w/2);
    for(let i=0;i<32;i++)assert.ok(projectPoint(root.f,root.r,root.z,i*Math.PI/16).every(Number.isFinite));
  }
});
test('special enemies retain distinct gear and silhouettes',()=>{
  assert.equal(buildCharacter('bomber').boxes.filter(b=>b.tag==='explosive').length,3);
  assert.ok(buildCharacter('boss').boxes.some(b=>b.tag==='chain'));
  assert.ok(buildCharacter('boss').scale>buildCharacter('cinder').scale);
  assert.ok(buildCharacter('player').boxes.some(b=>b.tag==='cap-brim'));
});
test('art generation does not alter game state or random sequence',()=>{
  const g=Game.create('runway','normal',12345),before=g.snapshot();
  for(const k of MODEL_KINDS)buildCharacter(k,'pistol',0,true);
  assert.deepEqual(g.snapshot(),before);
});
test('every enemy preserves its combat stats',()=>{
  const values={walker:[50,64,13,14],runner:[38,124,11,12],brute:[255,44,26,23],cinder:[140,58,18,17],bomber:[85,78,45,18],boss:[1100,47,34,30]};
  for(const [k,expected]of Object.entries(values)){const e=ENEMIES[k];assert.deepEqual([e.hp,e.speed,e.damage,e.radius],expected);}
});
