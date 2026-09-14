import * as THREE from '../vendor/three.module.min.js';
import {WORLD,GUN,clamp} from './data.js';
import {createModelBlueprint,compileModel,MODEL_KINDS,MODEL_NAMES} from './models3d.js';
import {makeCamera,positionCamera,sizeCamera,screenVectorToGround,GROUND_COMPRESSION,SHOT_HEIGHT} from './camera3d.js';
export {miniMap,gunSvg,gearSvg} from './renderer.js';
const makeMaterial=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.86,metalness:.03,...extra});
const _v=new THREE.Vector3(),_n=new THREE.Vector3(),_q=new THREE.Quaternion(),_s=new THREE.Vector3(),_m=new THREE.Matrix4(),_root=new THREE.Matrix4(),_local=new THREE.Matrix4(),_e=new THREE.Euler(),_color=new THREE.Color();
const PICKUP_COLORS={health:'#c8d5a2',ammo:'#879694',grenade:'#d6b666',barrel:'#b77148',mine:'#a3b872',wall:'#afa590',turret:'#94b49b'};
const PICKUP_TEXT={health:'+ HEALTH',ammo:'+ AMMO',grenade:'+ FRAG',barrel:'+ BARREL',mine:'+ MINE',wall:'+ WALL',turret:'+ TURRET'};

class ModelBatch {
 constructor(scene,blueprint,materials,max=128){
  this.blueprint=blueprint;this.parts=compileModel(blueprint).map(part=>{
   const mesh=new THREE.InstancedMesh(part.geometry,materials[part.material],max);mesh.name=blueprint.kind+'/'+part.bone+'/'+part.material;
   mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;mesh.castShadow=part.material!=='glow';mesh.receiveShadow=true;scene.add(mesh);return {...part,mesh};
  });this.max=max;
 }
 update(entities,blood,time){
  const b=this.blueprint,count=Math.min(this.max,entities.length);
  for(const part of this.parts){const mesh=part.mesh;mesh.count=part.material==='blood'&&!blood?0:count;}
  for(let i=0;i<count;i++){
   const state=entities[i],walk=state.walk||0,gait=state._moving?Math.sin(walk):0,bob=state._moving?Math.abs(Math.sin(walk))*.6:Math.sin(time*1.6+(state.id||0))*.15;
   _e.set(b.lean||0,Math.PI/2-(state.angle||0),0,'YXZ');_q.setFromEuler(_e);const scale=b.scale*(state._scale||1);
   _root.compose(_v.set(state.x,bob*scale,state.y),_q,_s.setScalar(scale));
   for(const part of this.parts){
    if(!part.mesh.count)continue;const anchor=b.bones[part.bone]||[0,0,0];let rx=0,rz=0;
    if(part.bone==='legL')rx=gait*.36;
    if(part.bone==='legR')rx=-gait*.36;
    if(part.bone==='armL'){rx=b.kind==='player'?-.60:-.16-gait*.18;if(b.kind==='player')rz=.45;}
    if(part.bone==='armR'){rx=b.kind==='player'?-.60:-.16+gait*.18;if(b.kind==='player')rz=-.45;}
    if(part.bone==='head')rz=state._moving?Math.sin(walk*.5)*.015:0;
    if(part.bone==='weapon'&&state._recoil>0)rx=-state._recoil*.16;
    _local.compose(_v.set(...anchor),_q.setFromEuler(_e.set(rx,0,rz)),_s.setScalar(1));_m.multiplyMatrices(_root,_local);part.mesh.setMatrixAt(i,_m);
    _color.setScalar(state.flash>0?1.65:part.material==='glow'&&b.kind==='bomber'&&state.fuse>=0?.7+Math.abs(Math.sin(time*18))*.5:1);part.mesh.setColorAt(i,_color);
   }
  }
  for(const part of this.parts){part.mesh.instanceMatrix.needsUpdate=true;if(part.mesh.instanceColor)part.mesh.instanceColor.needsUpdate=true;}
 }
 dispose(scene){for(const p of this.parts){scene.remove(p.mesh);p.mesh.dispose();p.geometry.dispose();}}
}
function simpleBlueprint(kind){
 const pieces=[],bones={body:[0,0,0],head:[0,0,0]};
 const box=(tag,x,y,z,w,h,d,color,material='matte',bone='body',bevel=.6)=>pieces.push({bone,tag,position:[x,y,z],size:[w,h,d],color,material,bevel,rotation:[0,0,0]});
 if(kind==='wall'){
  box('concrete',0,23,0,40,46,40,'#929989');box('cap',0,48,0,40,5,40,'#b8bdaa');
  box('front-inset',0,27,20.1,32,27,.6,'#657469');box('warning',0,9,20.6,27,3,1,'#d2b276');
  for(const x of [-17,17])box('steel-edge',x,25,20.6,2,35,1,'#47544b','metal');
 }else if(kind==='barrel'){
  box('drum',0,20,0,28,38,28,'#b2653b', 'matte','body',2.3);
  for(const y of [6,30])box('steel-hoop',0,y,0,30,3,30,'#4e5652','metal');
  box('lid',0,40,0,28,2.5,28,'#727462','metal');box('bung',6,42,3,5,1.5,5,'#282f29','metal');
  box('warning-label',0,20,14.3,11,12,.6,'#e4c97a');box('hazard',0,20,15,4,6,.7,'#382c22');
 }else if(kind==='mine'){
  box('housing',0,4,0,23,7,23,'#6d7b4d');box('pressure-plate',0,9,0,14,3,14,'#a0a273');box('indicator',0,11,3,3,1,3,'#e7a658','glow');
 }else{
  box('base',0,6,0,32,12,32,'#46594a');for(const x of [-18,18])box('foot',x,3,0,7,5,34,'#333f35');
  box('post',0,19,0,11,23,11,'#637761','metal');box('head',0,33,0,23,15,19,'#8b9a72','matte','head');
  box('barrel',0,34,22,7,7,29,'#303d3b','metal','head');box('bore',0,34,37,5,5,1,'#121f1b','matte','head');
  box('target-lamp',8,34,10,3,3,1,'#d5e890','glow','head');
 }
 return {kind,bones,pieces,scale:1,lean:0};
}

export class Renderer {
 constructor(canvas,settings,options={}){
  this.canvas=canvas;this.settings=settings;this.options=options;this.time=0;this.cx=WORLD.w/2;this.cy=WORLD.h/2;this.scale=1;this.w=1;this.h=1;this.parts=[];this.beams=[];this.blasts=[];this.texts=[];this.shake=0;this.flash=0;this.mapId='';this.placement=null;this.lost=false;this.recoil=0;this.lastPositions=new Map();this.batches=new Map();this.defenseBatches=new Map();this.cachedWeapon=null;this.lastQuality='';
  this.gl=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',stencil:false});
  this.gl.outputColorSpace=THREE.SRGBColorSpace;this.gl.toneMapping=THREE.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.35;
  this.gl.shadowMap.enabled=true;this.gl.shadowMap.type=THREE.PCFSoftShadowMap;
  canvas.dataset.renderer='webgl2';canvas.dataset.modelRevision='1.4.0';
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#222c29');this.camera=makeCamera();
  this.materials={matte:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.84,metalness:.02}),metal:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.44,metalness:.48}),blood:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}),glow:new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false})};
  this.scene.add(new THREE.HemisphereLight('#dcebf1','#3b392f',2.05));
  this.sun=new THREE.DirectionalLight('#ffdfb0',3.2);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.camera.near=10;this.sun.shadow.camera.far=3000;this.sun.shadow.bias=-.00022;this.sun.shadow.normalBias=.5;
  this.scene.add(this.sun,this.sun.target);const fill=new THREE.DirectionalLight('#b5dbe5',.75);fill.position.set(500,500,-1000);this.scene.add(fill);
  this.arena=new THREE.Group();this.scene.add(this.arena);this.arenaResources=[];
  this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),-SHOT_HEIGHT);this.ndc=new THREE.Vector2();
  this.ring=new THREE.Mesh(new THREE.RingGeometry(22,24,48),new THREE.MeshBasicMaterial({color:'#d6ed86',transparent:true,opacity:.86,side:THREE.DoubleSide,depthWrite:false}));this.ring.rotation.x=-Math.PI/2;this.scene.add(this.ring);
  this.preview=new THREE.Mesh(new THREE.BoxGeometry(40,1,40),new THREE.MeshBasicMaterial({color:'#c8ea88',transparent:true,opacity:.38,depthWrite:false}));this.scene.add(this.preview);
  this.dropMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(18,16,18),makeMaterial('#ffffff'),60);this.dropMesh.frustumCulled=false;this.dropMesh.castShadow=true;this.scene.add(this.dropMesh);
  this.particleMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.85}),350);this.particleMesh.frustumCulled=false;this.scene.add(this.particleMesh);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(800*6),3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(800*6),3).setUsage(THREE.DynamicDrawUsage));this.lineGeometry=geometry;this.lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,toneMapped:false}));this.lines.frustumCulled=false;this.scene.add(this.lines);
  this.projectileMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:'#ffffff'}),350);this.projectileMesh.frustumCulled=false;this.scene.add(this.projectileMesh);
  this.markMesh=new THREE.InstancedMesh(new THREE.CircleGeometry(1,9),new THREE.MeshBasicMaterial({color:'#673b31',transparent:true,opacity:.55,depthWrite:false}),110);this.markMesh.frustumCulled=false;this.scene.add(this.markMesh);
  this.burnMesh=new THREE.InstancedMesh(new THREE.ConeGeometry(5,20,4),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.78,toneMapped:false}),360);this.burnMesh.frustumCulled=false;this.scene.add(this.burnMesh);
  this.overlay=document.createElement('canvas');this.overlay.className='world-overlay';this.overlay.setAttribute('aria-hidden','true');canvas.insertAdjacentElement('afterend',this.overlay);this.c=this.overlay.getContext('2d');
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;window.dispatchEvent(new Event('deadblockgraphicslost'));});
  canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.resize();window.dispatchEvent(new Event('deadblockgraphicsrestored'));});
  this.resize();
 }
 resize(){
  const r=this.canvas.getBoundingClientRect();this.w=Math.max(1,Math.round(r.width));this.h=Math.max(1,Math.round(r.height));
  const low=this.settings.quality==='low';let dpr=Math.min(low?1:1.75,window.devicePixelRatio||1);dpr=Math.min(dpr,Math.sqrt((low?850000:2200000)/(this.w*this.h)));
  const width=Math.max(1,Math.round(this.w*dpr)),height=Math.max(1,Math.round(this.h*dpr));
  if(this.canvas.width!==width||this.canvas.height!==height)this.gl.setSize(width,height,false);
  this.overlay.width=width;this.overlay.height=height;this.dpr=width/this.w;this.overlay.style.width=this.w+'px';this.overlay.style.height=this.h+'px';this.overlay.style.left=r.left+'px';this.overlay.style.top=r.top+'px';
  this.gl.shadowMap.enabled=!low;this.scale=sizeCamera(this.camera,this.w,this.h,this.options.span);this.lastQuality=this.settings.quality;
 }
 screenToWorld(x,y,height=SHOT_HEIGHT){
  const r=this.canvas.getBoundingClientRect();this.ndc.set((x-r.left)/this.w*2-1,1-(y-r.top)/this.h*2);this.ray.setFromCamera(this.ndc,this.camera);this.plane.constant=-height;
  const hit=this.ray.ray.intersectPlane(this.plane,_v);return hit?{x:hit.x,y:hit.z}:{x:this.cx,y:this.cy};
 }
 screenVectorToWorld(x,y){return screenVectorToGround(x,y);}
 project(x,y,height=0){_v.set(x,height,y).project(this.camera);return {x:(_v.x+1)*this.w/2,y:(1-_v.y)*this.h/2};}
 batch(kind,weapon='pistol'){
  if(kind==='player'&&this.cachedWeapon!==weapon){const prev=this.batches.get('player');if(prev){prev.dispose(this.scene);this.batches.delete('player');}this.cachedWeapon=weapon;}
  if(!this.batches.has(kind))this.batches.set(kind,new ModelBatch(this.scene,createModelBlueprint(kind,weapon),this.materials,128));
  return this.batches.get(kind);
 }
 buildArena(map){
  this.arena.clear();for(const r of this.arenaResources)r.dispose();this.arenaResources=[];this.mapId=map.id;
  if(this.options.stage){
   const geometry=new THREE.PlaneGeometry(3000,3000),material=makeMaterial('#596358'),ground=new THREE.Mesh(geometry,material);ground.rotation.x=-Math.PI/2;ground.position.y=-.8;ground.receiveShadow=true;this.arena.add(ground);this.arenaResources.push(geometry,material);this.scene.background.set('#333f36');return;
  }
  const cn=document.createElement('canvas');cn.width=1536;cn.height=1080;const c=cn.getContext('2d');c.scale(cn.width/WORLD.w,cn.height/WORLD.h);
  c.fillStyle=map.floor;c.fillRect(0,0,WORLD.w,WORLD.h);c.strokeStyle=map.line;c.lineWidth=1.5;
  for(let x=0;x<WORLD.w;x+=100){c.beginPath();c.moveTo(x,0);c.lineTo(x,WORLD.h);c.stroke();}for(let y=0;y<WORLD.h;y+=100){c.beginPath();c.moveTo(0,y);c.lineTo(WORLD.w,y);c.stroke();}
  let seed=2119;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<4500;i++){c.fillStyle=i%3?'#00000009':'#ffffff08';c.fillRect(rnd()*WORLD.w,rnd()*WORLD.h,rnd()*9+2,2+rnd()*3);}
  c.fillStyle='#1f2d2728';for(let i=0;i<30;i++){c.beginPath();c.ellipse(rnd()*WORLD.w,rnd()*WORLD.h,10+rnd()*60,7+rnd()*30,0,0,Math.PI*2);c.fill();}
  c.strokeStyle='#e4d9a077';c.lineWidth=3;c.strokeRect(27,27,WORLD.w-54,WORLD.h-54);
  if(map.id==='runway'){c.strokeStyle='#e6e1b9aa';c.lineWidth=5;for(const y of [395,1125]){c.beginPath();c.moveTo(60,y);c.lineTo(WORLD.w-60,y);c.stroke();}c.setLineDash([70,70]);c.lineWidth=8;c.beginPath();c.moveTo(90,WORLD.h/2);c.lineTo(WORLD.w-90,WORLD.h/2);c.stroke();c.setLineDash([]);}
  if(map.id==='ritual'){c.strokeStyle='#b04c3655';c.lineWidth=9;for(const radius of [200,225]){c.beginPath();c.arc(1080,780,radius,0,Math.PI*2);c.stroke();}}
  c.textAlign='center';c.font='900 66px monospace';c.fillStyle='#d9d8b726';c.fillText(map.name.toUpperCase(),WORLD.w/2,WORLD.h/2);c.font='18px monospace';c.fillText(map.flow||'',WORLD.w/2,WORLD.h/2+40);
  for(const side of map.approaches){const pos={N:[WORLD.w/2,55,0],S:[WORLD.w/2,WORLD.h-55,Math.PI],W:[55,WORLD.h/2,-Math.PI/2],E:[WORLD.w-55,WORLD.h/2,Math.PI/2]}[side];c.save();c.translate(pos[0],pos[1]);c.rotate(pos[2]);c.fillStyle='#27322c';c.fillRect(-120,-24,240,36);c.fillStyle=map.accent;for(let x=-116;x<116;x+=25){c.beginPath();c.moveTo(x,-24);c.lineTo(x+12,-24);c.lineTo(x+23,12);c.lineTo(x+11,12);c.fill();}c.beginPath();c.moveTo(-18,25);c.lineTo(18,25);c.lineTo(0,46);c.fill();c.restore();}
  const tex=new THREE.CanvasTexture(cn);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(4,this.gl.capabilities.getMaxAnisotropy());
  const gm=new THREE.PlaneGeometry(WORLD.w,WORLD.h),mat=makeMaterial('#ffffff',{map:tex}),ground=new THREE.Mesh(gm,mat);ground.rotation.x=-Math.PI/2;ground.position.set(WORLD.w/2,-.8,WORLD.h/2);ground.receiveShadow=true;this.arena.add(ground);this.arenaResources.push(tex,gm,mat);
  const pieces=[];const box=(tag,x,y,z,w,h,d,color,bevel=1)=>pieces.push({bone:'body',tag,position:[x,y,z],size:[w,h,d],color,bevel,rotation:[0,0,0],material:'matte'});
  for(const [x,z,w,d] of map.walls){
   box('concrete-wall',x+w/2,28,z+d/2,w,56,d,'#7d8c82',2);
   box('wall-cap',x+w/2,58,z+d/2,w-1,5,d-1,'#adb6a3',1);
   box('inset-roof',x+w/2,61,z+d/2,Math.max(4,w-12),1.6,Math.max(4,d-12),'#909d8c',.4);
   if(w<700&&d<500){
    box('hazard-band',x+w/2,17,z+d+.1,Math.min(w-12,80),3,.9,map.accent,.1);
    for(const dx of [10,w-10])box('corner-rivet',x+dx,43,z+d+.4,3,3,1.2,'#d4d7bd',.3);
    box('vent-frame',x+w/2,39,z+d+.2,Math.min(w-28,56),13,1.8,'#47594f',.4);
    for(let j=0;j<4;j++)box('vent-slat',x+w/2,35+j*2.6,z+d+1.3,Math.min(w-34,50),.9,1,'#819283',.1);
   }
  }
  // Cosmetic border trim stays outside the playable collision edge.
  box('border-north',WORLD.w/2,4,5,WORLD.w,8,10,'#374840');box('border-south',WORLD.w/2,4,WORLD.h-5,WORLD.w,8,10,'#374840');
  for(const part of compileModel({pieces,bones:{body:[0,0,0]}})){const mesh=new THREE.Mesh(part.geometry,this.materials.matte);mesh.castShadow=true;mesh.receiveShadow=true;this.arena.add(mesh);this.arenaResources.push(part.geometry);}
  this.scene.background.set('#26332d');
 }
 event(e){
  if(e.type==='shot'){
   this.recoil=.16;this.shake=Math.max(this.shake,e.weapon==='launcher'?3:.7);
   const flame=e.weapon==='flamer',n=flame?5:e.weapon==='shotgun'?8:3;
   for(let i=0;i<n;i++){const a=e.angle+(Math.random()-.5)*(flame?.5:1.3);this.parts.push({x:e.x,y:e.y,z:SHOT_HEIGHT,vx:Math.cos(a)*(flame?300:70),vy:Math.sin(a)*(flame?300:70),vz:flame?25:30,life:flame?.4:.1,size:flame?10:3,color:flame?'#ff9549':'#ffd37d'});}
  }
  if(e.type==='explosion'){this.blasts.push({...e,life:.36});this.shake=5;for(let i=0;i<28;i++){const a=Math.random()*Math.PI*2,v=80+Math.random()*200;this.parts.push({x:e.x,y:e.y,z:10,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:100+Math.random()*110,life:.35+Math.random()*.3,size:5+Math.random()*8,color:i%2?'#f5bc67':'#df6937'});}}
  if(e.type==='kill'){for(let i=0;i<7;i++)this.parts.push({x:e.x,y:e.y,z:38,vx:(Math.random()-.5)*120,vy:(Math.random()-.5)*120,vz:25+Math.random()*60,life:.3,size:3,color:this.settings.blood?'#853d33':'#b8bd9c'});if(e.combo>1&&e.combo%5===0)this.texts.push({x:e.x,y:e.y,text:'×'+e.combo,life:.9,color:'#e0eea1'});}
  if(e.type==='beam')this.beams.push({...e,life:.18});
  if(e.type==='pickup')this.texts.push({x:e.x,y:e.y,text:PICKUP_TEXT[e.kind]||'+ SUPPLY',life:1,color:'#deeba9'});
  if(e.type==='hurt'){this.flash=.2;this.shake=3;}
  if(this.parts.length>350)this.parts.splice(0,this.parts.length-350);
 }
 updateEffects(state,dt){
  const positions=this.lineGeometry.attributes.position.array,colors=this.lineGeometry.attributes.color.array;let vertices=0;
  const line=(a,b,color)=>{if(vertices>=1600)return;positions.set(a,vertices*3);positions.set(b,(vertices+1)*3);_color.set(color);for(let i=0;i<2;i++)colors.set([_color.r,_color.g,_color.b],(vertices+i)*3);vertices+=2;};
  for(const b of state.bullets)line([b.x-b.vx*.014,SHOT_HEIGHT,b.y-b.vy*.014],[b.x,SHOT_HEIGHT,b.y],b.owner==='turret'?'#a7eabe':'#ffe6a5');
  for(const b of this.beams){b.life-=dt;line([b.x,SHOT_HEIGHT,b.y],[b.bx,SHOT_HEIGHT,b.by],'#a2e5ff');}this.beams=this.beams.filter(b=>b.life>0);
  this.lineGeometry.setDrawRange(0,vertices);this.lineGeometry.attributes.position.needsUpdate=true;this.lineGeometry.attributes.color.needsUpdate=true;
  let i=0;for(const p of state.projectiles.slice(0,350)){
   const grenade=p.kind==='grenade',height=grenade?12+Math.sin(Math.PI*(1-p.life/p.maxLife))*65:SHOT_HEIGHT;
   _q.setFromAxisAngle(_n.set(0,1,0),Math.PI/2-Math.atan2(p.vy,p.vx));_m.compose(_v.set(p.x,height,p.y),_q,_s.set(p.kind==='rocket'?6:9,grenade?8:7,p.kind==='rocket'?19:9));this.projectileMesh.setMatrixAt(i,_m);this.projectileMesh.setColorAt(i,_color.set(grenade?'#bdb778':p.kind==='rocket'?'#b6bca6':'#ff9148'));i++;
  }this.projectileMesh.count=i;this.projectileMesh.instanceMatrix.needsUpdate=true;if(this.projectileMesh.instanceColor)this.projectileMesh.instanceColor.needsUpdate=true;
  i=0;for(const p of this.parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=dt*250;if(p.life<=0)continue;_q.identity();_m.compose(_v.set(p.x,Math.max(1,p.z),p.y),_q,_s.setScalar(p.size*Math.min(1,p.life*7)));this.particleMesh.setMatrixAt(i,_m);this.particleMesh.setColorAt(i,_color.set(p.color));i++;if(i>=350)break;}
  this.parts=this.parts.filter(p=>p.life>0);this.particleMesh.count=i;this.particleMesh.instanceMatrix.needsUpdate=true;if(this.particleMesh.instanceColor)this.particleMesh.instanceColor.needsUpdate=true;
 }
 drawOverlay(state,dt,menu){
  const c=this.c;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);c.textAlign='center';
  if(!menu){
   for(const e of state.enemies){const p=this.project(e.x,e.y,(e.kind==='boss'?190:e.kind==='brute'?116:99));
    if(e.hp<e.maxHp||e.kind==='boss'){c.fillStyle='#19281cdc';c.fillRect(p.x-12,p.y,24,3);c.fillStyle=e.kind==='boss'?'#eb996c':'#d4dcab';c.fillRect(p.x-12,p.y,24*clamp(e.hp/e.maxHp,0,1),3);}
    const q=this.project(e.x,e.y,30);if(q.x>12&&q.x<this.w-12&&q.y>55&&q.y<this.h-20)continue;
    const x=clamp(q.x,10,this.w-10),y=clamp(q.y,60,this.h-16),a=Math.atan2(q.y-this.h/2,q.x-this.w/2);c.save();c.translate(x,y);c.rotate(a);c.fillStyle=e.kind==='boss'?'#f4b178':'#d9d7a381';c.beginPath();c.moveTo(5,0);c.lineTo(-4,-3);c.lineTo(-4,3);c.fill();c.restore();
   }
   for(const d of state.defenses)if(d.hp<d.maxHp){const p=this.project(d.x,d.y,63);c.fillStyle='#1b2b22';c.fillRect(p.x-12,p.y,24,3);c.fillStyle='#d5e497';c.fillRect(p.x-12,p.y,24*d.hp/d.maxHp,3);}
   if(state.countdown>0){c.fillStyle='#15271deb';c.fillRect(this.w/2-100,this.h/2-55,200,92);c.fillStyle='#dce990';c.font='700 12px monospace';c.fillText('WAVE '+state.wave,this.w/2,this.h/2-31);c.fillStyle='#f5f3df';c.font='800 39px sans-serif';c.fillText(Math.ceil(state.countdown),this.w/2,this.h/2+15);}
  }
  c.font='bold 12px monospace';for(const t of this.texts){t.life-=dt;const p=this.project(t.x,t.y,70+(1-t.life)*15);c.globalAlpha=clamp(t.life*2,0,1);c.fillStyle='#15291f';c.fillText(t.text,p.x+1,p.y+1);c.fillStyle=t.color;c.fillText(t.text,p.x,p.y);}this.texts=this.texts.filter(t=>t.life>0);c.globalAlpha=1;
  for(const b of this.blasts){b.life-=dt;const p=this.project(b.x,b.y,5),r=b.r*this.scale*(1-b.life/.36);c.save();c.translate(p.x,p.y);c.scale(1,GROUND_COMPRESSION);c.strokeStyle=`rgba(255,193,95,${Math.max(0,b.life*2)})`;c.lineWidth=3;c.beginPath();c.arc(0,0,Math.max(0,r),0,Math.PI*2);c.stroke();c.restore();}this.blasts=this.blasts.filter(b=>b.life>0);
  this.flash=Math.max(0,this.flash-dt);if(this.flash&&this.settings.shake){c.fillStyle=`rgba(160,44,23,${this.flash*.6})`;c.fillRect(0,0,this.w,this.h);}
 }
 draw(state,map,dt=0,menu=false){
  if(this.lost)return;this.time+=dt;this.state=state;if(this.settings.quality!==this.lastQuality)this.resize();if(map.id!==this.mapId)this.buildArena(map);
  const p=state.player,viewW=this.w/this.scale,viewD=this.h/this.scale/GROUND_COMPRESSION;
  if(!this.options.fixedCamera){
   const targetX=menu?950:clamp(p.x,Math.min(viewW/2,WORLD.w/2),Math.max(WORLD.w-viewW/2,WORLD.w/2));
   const targetY=menu?650:clamp(p.y-40,Math.min(viewD/2,WORLD.h/2),Math.max(WORLD.h-viewD/2,WORLD.h/2));
   const blend=dt?Math.min(1,dt*8):1;this.cx+=(targetX-this.cx)*blend;this.cy+=(targetY-this.cy)*blend;
  }
  this.shake=Math.max(0,this.shake-dt*20);const shake=this.settings.shake?this.shake:0;positionCamera(this.camera,this.cx+(Math.random()-.5)*shake,this.cy+(Math.random()-.5)*shake);
  const lightX=Math.round(this.cx/40)*40,lightY=Math.round(this.cy/40)*40;this.sun.position.set(lightX-500,1100,lightY+350);this.sun.target.position.set(lightX,0,lightY);
  const half=this.options.stage?230:Math.max(600,viewW*.62);Object.assign(this.sun.shadow.camera,{left:-half,right:half,top:half,bottom:-half});this.sun.shadow.camera.updateProjectionMatrix();
  const lists=new Map(MODEL_KINDS.map(k=>[k,[]]));
  this.recoil=Math.max(0,this.recoil-dt);
  const all=[{...p,kind:'player',id:'player',_recoil:this.recoil},...state.enemies];const alive=new Set();
  for(const e of all){const key=(state.id||'menu')+'/'+e.id;alive.add(key);const last=this.lastPositions.get(key),moving=last&&Math.hypot(e.x-last.x,e.y-last.y)>.015;this.lastPositions.set(key,{x:e.x,y:e.y});
   const q=this.project(e.x,e.y,45);if(q.x< -120||q.x>this.w+120||q.y< -150||q.y>this.h+150)continue;
   lists.get(e.kind)?.push({...e,_moving:moving||!!this.options.animateAll});
  }for(const key of this.lastPositions.keys())if(!alive.has(key))this.lastPositions.delete(key);
  for(const [kind,entities] of lists){if(entities.length||this.batches.has(kind))this.batch(kind,state.weapon).update(entities,this.settings.blood!==false,this.time);}
  this.ring.position.set(p.x,.5,p.y);this.ring.visible=!this.options.hidePlayerRing;
  this.preview.visible=!!this.placement&&state.phase==='prep'&&state.inventory?.[state.build]>0;
  if(this.preview.visible){this.preview.position.set(this.placement.x,1,this.placement.y);this.preview.material.color.set(this.placement.valid?'#b4e075':'#f07e62');}
  for(const kind of ['barrel','wall','mine','turret']){const entities=state.defenses.filter(d=>d.kind===kind).map(d=>({...d,angle:kind==='turret'?(d.angle||0):Math.PI/2}));if(!entities.length&&!this.defenseBatches.has(kind))continue;if(!this.defenseBatches.has(kind))this.defenseBatches.set(kind,new ModelBatch(this.scene,simpleBlueprint(kind),this.materials,64));this.defenseBatches.get(kind).update(entities,true,this.time);}
  let i=0;for(const drop of state.pickups.slice(0,60)){_q.setFromAxisAngle(_n.set(0,1,0),Math.sin(this.time*.8)*.12);_m.compose(_v.set(drop.x,15+Math.sin(this.time*3+drop.x)*2,drop.y),_q,_s.setScalar(1));this.dropMesh.setMatrixAt(i,_m);this.dropMesh.setColorAt(i,_color.set(PICKUP_COLORS[drop.kind]||'#bcb888'));i++;}this.dropMesh.count=i;this.dropMesh.instanceMatrix.needsUpdate=true;if(this.dropMesh.instanceColor)this.dropMesh.instanceColor.needsUpdate=true;
  i=0;for(const mark of this.settings.blood!==false?(state.marks||[]).slice(-110):[]){_q.setFromEuler(_e.set(-Math.PI/2,0,(mark.seed||0)*6.28));_m.compose(_v.set(mark.x,.25,mark.y),_q,_s.set(mark.size*1.2,mark.size*.85,1));this.markMesh.setMatrixAt(i++,_m);}this.markMesh.count=i;this.markMesh.instanceMatrix.needsUpdate=true;
  i=0;for(const enemy of state.enemies)if(enemy.fire>0)for(let j=0;j<3;j++){_q.setFromEuler(_e.set(0,this.time*2,Math.sin(this.time*9+j)*.18));_m.compose(_v.set(enemy.x+(j-1)*9,32+Math.sin(this.time*11+j)*5,enemy.y+6),_q,_s.setScalar(1+j*.12));this.burnMesh.setMatrixAt(i,_m);this.burnMesh.setColorAt(i++,_color.set(j===1?'#ffe692':'#f58338'));if(i>=360)break;}this.burnMesh.count=i;this.burnMesh.instanceMatrix.needsUpdate=true;if(this.burnMesh.instanceColor)this.burnMesh.instanceColor.needsUpdate=true;
  this.updateEffects(state,dt);this.gl.render(this.scene,this.camera);this.drawOverlay(state,dt,menu);
  this.metrics={renderer:'WebGL2',revision:'1.4.0',drawCalls:this.gl.info.render.calls,triangles:this.gl.info.render.triangles,geometries:this.gl.info.memory.geometries,textures:this.gl.info.memory.textures,visibleCharacters:[...lists.values()].reduce((n,a)=>n+a.length,0),buffer:[this.canvas.width,this.canvas.height]};
 }
 // Used by the model-view page, with the same templates, materials and renderer.
 focusModel(kind,angle=.8){
  const state={id:'model-view',phase:'prep',weapon:this.options.weapon||'carbine',player:{id:'player',x:0,y:0,angle,walk:this.time*6,hp:100,maxHp:100},enemies:[],defenses:[],pickups:[],bullets:[],projectiles:[],marks:[],inventory:{barrel:0},build:'barrel',countdown:0};
  if(kind!=='player'){state.player.x=1e5;state.enemies.push({id:1,kind,x:0,y:0,angle,walk:this.time*6,hp:100,maxHp:100,fuse:-1});}
  this.options.fixedCamera=true;this.options.hidePlayerRing=true;this.options.animateAll=true;this.cx=0;this.cy=kind==='boss'?-76:kind==='brute'?-60:-46;this.scale=sizeCamera(this.camera,this.w,this.h,(this.w/this.h)*245);return state;
 }
 dispose(){for(const b of this.batches.values())b.dispose(this.scene);for(const b of this.defenseBatches.values())b.dispose(this.scene);for(const m of Object.values(this.materials))m.dispose();for(const r of this.arenaResources)r.dispose();for(const mesh of [this.ring,this.preview,this.dropMesh,this.particleMesh,this.projectileMesh,this.lines,this.markMesh,this.burnMesh]){mesh.geometry.dispose();mesh.material.dispose();mesh.dispose?.();}this.gl.dispose();this.overlay.remove();}
}
