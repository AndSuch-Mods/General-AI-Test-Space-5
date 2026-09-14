import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';
import {MODEL_KINDS,MODEL_REVISION,createModelBlueprint,compileModel} from '../src/models3d.js';
import {VERSION,MAPS} from '../src/data.js';
import {Game} from '../src/engine.js';
import {makeCamera,positionCamera,sizeCamera,screenVectorToGround,GROUND_COMPRESSION,SHOT_HEIGHT} from '../src/camera3d.js';

test('active renderer uses the same versioned real 3D models as the viewer',()=>{
 assert.equal(VERSION,MODEL_REVISION);assert.equal(THREE.REVISION,'180');
 const r=readFileSync(new URL('../src/renderer3d.js',import.meta.url),'utf8');assert.match(r,/new THREE.WebGLRenderer/);assert.match(r,/new THREE.InstancedMesh/);assert.doesNotMatch(r,/drawCharacter\(/);
 const gallery=readFileSync(new URL('../src/gallery3d.js',import.meta.url),'utf8');assert.match(gallery,/from '\.\/renderer3d.js'/);
});
for(const kind of MODEL_KINDS){
 test(`${kind}: detailed 3D geometry is finite, chamfered and batched`,()=>{
  const b=createModelBlueprint(kind),parts=compileModel(b);assert.ok(b.pieces.length>=115);assert.ok(parts.length<=18);assert.ok(b.pieces.every(p=>p.size.every(v=>v>0)));
  for(const part of parts){const g=part.geometry;assert.ok(g.isBufferGeometry);assert.equal(g.attributes.position.count,g.attributes.normal.count);assert.equal(g.attributes.position.count,g.attributes.color.count);for(const name of ['position','normal','color'])assert.ok([...g.attributes[name].array].every(Number.isFinite));}
 });
 test(`${kind}: eyes face forward and horns belong to the head`,()=>{
  const b=createModelBlueprint(kind),eyes=b.pieces.filter(p=>p.tag==='eye'),head=b.pieces.find(p=>p.tag==='cranium');assert.equal(eyes.length,2);
  for(const eye of eyes){assert.equal(eye.bone,'head');assert.ok(eye.position[2]>head.size[2]/2);assert.ok(eye.size[2]<1);}
  const roots=b.pieces.filter(p=>p.tag==='horn-root');if(kind==='cinder'||kind==='boss'){assert.equal(roots.length,2);for(const root of roots){assert.equal(root.bone,'head');assert.ok(Math.abs(root.position[0])-root.size[0]/2<head.size[0]/2);assert.ok(root.position[1]-root.size[1]/2<head.position[1]+head.size[1]/2);}}
 });
 test(`${kind}: model stains can be excluded without changing the solid mesh`,()=>{
  const parts=compileModel(createModelBlueprint(kind));assert.ok(parts.some(p=>p.material==='blood'));assert.ok(parts.filter(p=>p.material!=='blood').every(p=>p.geometry.attributes.position.count>0));
 });
}
test('special silhouettes include actual equipment geometry',()=>{
 assert.equal(createModelBlueprint('bomber').pieces.filter(p=>p.tag==='explosive-charge').length,8);
 assert.ok(createModelBlueprint('boss').pieces.filter(p=>p.tag==='chain-link').length>=40);
 assert.ok(createModelBlueprint('player').pieces.some(p=>p.tag==='helmet-brim'));
 assert.ok(createModelBlueprint('boss').scale>createModelBlueprint('cinder').scale);
});
for(const [w,h] of [[844,390],[1365,900],[667,375],[390,844]])test(`camera projection and aim round-trip at ${w}x${h}`,()=>{
 const camera=makeCamera();sizeCamera(camera,w,h);positionCamera(camera,1080,760);
 for(const [x,z] of [[1080,760],[1300,600],[850,900]]){
  const target=new THREE.Vector3(x,SHOT_HEIGHT,z),ndc=target.clone().project(camera),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(ndc.x,ndc.y),camera);const hit=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-SHOT_HEIGHT),new THREE.Vector3());assert.ok(hit.distanceTo(target)<1e-7);
 }
 const v=screenVectorToGround(.5,-.5);assert.ok(Math.abs((v.y*GROUND_COMPRESSION)/v.x+1)<1e-9);assert.ok(Math.abs(Math.hypot(v.x,v.y)-Math.hypot(.5,.5))<1e-9);
});
test('building all meshes does not mutate combat state, saves or random sequence',()=>{
 const g=Game.create('runway','normal',125);const before=g.snapshot();for(const k of MODEL_KINDS)compileModel(createModelBlueprint(k));assert.deepEqual(g.snapshot(),before);
 for(const m of MAPS){assert.ok(m.approaches.length>0);}
});
