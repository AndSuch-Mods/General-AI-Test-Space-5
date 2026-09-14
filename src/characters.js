// Original voxel models, based on the approved survivor / demon concept art.
// Every detail belongs to a model-space surface. No screen-space eyes or horns.
const TAU = Math.PI * 2;
export const MODEL_REVISION = '1.3.0';
export const MODEL_KINDS = ['player', 'walker', 'runner', 'brute', 'cinder', 'bomber', 'boss'];
export const MODEL_STYLE = {
  player: {skin:'#c9a77d', shirt:'#556044', pants:'#3e4a35', hair:'#252620', trim:'#bdb899'},
  walker: {skin:'#a0a68b', shirt:'#474f59', pants:'#594a3a', hair:'#382e2b', trim:'#87917c'},
  runner: {skin:'#a4a485', shirt:'#c7bfa4', pants:'#444b47', hair:'#6a352b', trim:'#e1d3b3'},
  brute:  {skin:'#a2a184', shirt:'#424953', pants:'#333942', hair:'#555344', trim:'#78838a'},
  cinder: {skin:'#ae3027', shirt:'#8d241f', pants:'#352b2b', hair:'#641b17', trim:'#d1583b'},
  bomber: {skin:'#a4a48a', shirt:'#4c5943', pants:'#56533e', hair:'#50392e', trim:'#7a8860'},
  boss:   {skin:'#982921', shirt:'#721c1b', pants:'#32282b', hair:'#4c1617', trim:'#b84430'}
};
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const patch = (u,v,w,h,color,tag='detail')=>({u,v,w,h,color,tag});
const blood = '#773b30';
const pale = '#e5d5a2';
const shadow = '#222523';

export function buildCharacter(kind='walker', weapon='pistol', frame=0, stains=true) {
  if (!MODEL_KINDS.includes(kind)) kind='walker';
  const p=MODEL_STYLE[kind], player=kind==='player', demon=kind==='cinder'||kind==='boss';
  const heavy=kind==='brute'||kind==='boss';
  const boxes=[],horns=[];
  const box=(f,r,z,d,w,h,color,tag='',face=[])=>{
    const b={f,r,z,d,w,h,color,tag,face,id:boxes.length};boxes.push(b);return b;
  };
  const gait=[0,2.5,0,-2.5][frame%4];
  const waist=heavy?23:17,torsoW=heavy?29:22,headW=heavy?24:21;
  const headZ=heavy?43:41,headH=heavy?22:21,headD=20;
  for (const side of [-1,1]) {
    const r=side*(heavy?7:5.7),step=gait*side;
    box(step,r,6,9,heavy?10:8,16,p.pants,'leg',[
      patch(-3,6,5,5,p.trim),...(stains?[patch(0,2,3,4,blood,'blood')]:[])
    ]);
    box(step+1.5,r,0,15,heavy?12:10,7,'#252a28','boot');
    box(step+2,r,6,10,heavy?11:8,2,'#484b3d','boot-cuff');
  }
  box(0,0,19,15,waist,8,p.pants,'hips');
  box(0,0,23,16,torsoW+1,3,'#242b27','belt',[patch(-2.5,0,5,3,'#a2a28b')]);
  const torsoFace=player?[
    patch(-9,1,4,18,'#323e2f'),patch(5,1,4,18,'#323e2f'),
    patch(-4,5,8,9,'#69734e'),patch(-3,9,6,1,'#adb383'),
    ...(stains?[patch(6,13,3,3,blood,'blood')]:[])
  ]:demon?[
    patch(-9,8,7,5,p.trim),patch(2,8,7,5,p.trim),
    patch(-5,2,10,3,p.hair),patch(-2,6,4,2,p.hair)
  ]:[
    patch(-8,0,6,3,p.skin),patch(4,1,4,6,p.skin),
    ...(stains?[patch(4,5,4,8,blood,'blood'),patch(-7,12,3,4,blood,'blood')]:[])
  ];
  box(0,0,25,15,torsoW,heavy?18:16,p.shirt,'torso',torsoFace);
  box(1,0,headZ-3,10,11,5,p.skin,'neck');
  // Sleeves, exposed forearms and squared fists remain visibly separate.
  for (const side of [-1,1]) {
    const r=side*(torsoW/2+3.5),reach=player?5:5-gait*side*.35;
    box(reach,r,30,12,heavy?10:8,heavy?14:11,player?p.shirt:p.skin,'upper-arm',
      stains?[patch(-2,3,3,4,blood,'blood')]:[]);
    if (!demon) box(reach,r,38,13,heavy?11:9,4,p.shirt,'sleeve');
    box(reach+5,r,25,14,heavy?9:7,8,p.skin,'forearm',
      stains?[patch(-2,2,4,2,blood,'blood')]:[]);
    box(reach+10,r,24,7,heavy?10:8,8,p.skin,'fist',[
      patch(-3,0,6,2,demon?'#351411':'#6c715b')
    ]);
  }
  if (player) {
    box(-9,0,25,7,17,17,'#354332','backpack');
    box(-12.7,0,29,1,12,8,'#566445','backpack-pocket');
    for (const r of [-6,6])box(8.5,r,28,3,7,8,'#344330','ammo-pouch',[
      patch(-2.7,6,5.4,1,'#82905f'),patch(-1,3,2,2,'#b2b599')
    ]);
  }
  if (kind==='brute') {
    box(8.4,0,25,2,torsoW-4,13,'#434d59','overalls',[
      patch(-10,0,4,17,'#78818a'),patch(6,0,4,17,'#78818a'),
      patch(-4,4,8,5,'#343c46'),...(stains?[patch(3,1,4,5,blood,'blood')]:[])
    ]);
    for(const r of [-10,10])box(7,r,38,3,4,5,'#737b7d','overall-strap');
  }
  if (kind==='bomber') {
    box(8.3,0,24,4,21,18,'#252f2c','bomb-vest',[
      patch(-9,14,3,4,'#687159'),patch(6,14,3,4,'#687159')
    ]);
    for (const r of [-6,0,6]) {
      box(11.5,r,27,4,4.5,12,'#a5412e','explosive',[
        patch(-2,3,4,1,'#222726'),patch(-2,8,4,1,'#222726')
      ]);
      box(11.5,r,39,3,3,1.5,'#b9b69a','cap');
    }
    box(14.5,0,28,1,4,4,'#251815','detonator',[
      patch(-1.3,1,2.6,2.5,'#ff7854','indicator')
    ]);
    box(-9,0,25,5,17,14,'#303b2f','rear-bomb-pack');
  }
  if (kind==='boss') {
    for (const side of [-1,1]) {
      box(-1,side*17,39,18,12,8,'#65201e','shoulder-armor');
      box(-2,side*20,47,6,4,5,'#442224','shoulder-spike');
    }
    // Large square chain links, not a line floating over the body.
    for (let i=0;i<5;i++) {
      box(9,-10+i*5,39-i*2.7,3,4,4,'#707376','chain',[
        patch(-1,1,2,2,'#313537')
      ]);
    }
  }
  const face=[];
  if (player) {
    for(const side of [-1,1]) {
      const r=side*4.6;
      face.push(patch(r-2.2,9,4.4,5,'#e7e0c9','eye'),
        patch(r-1.2,9,2.4,4,'#241f1c','pupil'),
        patch(r-2.7,14,5.4,2,'#24231f','brow'));
    }
    face.push(patch(-3.3,4,6.6,1.6,'#69472c','mouth'));
  } else {
    for(const side of [-1,1]) {
      const r=side*(heavy?5.6:4.6);
      face.push(patch(r-3.4,9,6.8,6,demon?'#491511':'#686b55','socket'),
        patch(r-2.2,10,4.4,3.8,demon?'#ff603e':'#ecdf7b','eye'),
        patch(r-1.2,10.5,2.4,2.6,demon?'#ffcf8a':'#fff0af','eye-core'),
        patch(r-3.2,15,6.4,2,p.hair,'brow'));
    }
    face.push(patch(-5.3,1,10.6,7.5,demon?'#2a0e0d':'#3d2721','mouth'),
      patch(-1,9,2,2,p.hair,'nose'));
    for(const r of [-3.5,0,3.5])face.push(patch(r-1.1,6,2.2,2.7,pale,'tooth'));
    for(const r of [-3.4,3.4])face.push(patch(r-1.2,1,2.4,2,pale,'tooth'));
  }
  if(stains)face.push(patch(-headW/2+1,4,2.4,4,blood,'blood'),patch(headW/2-4,2,2.6,3,blood,'blood'));
  const head=box(3,0,headZ,headD,headW,headH,p.skin,'head',face);
  if (player) {
    box(-1,0,headZ+13,headD-5,headW+1,5,p.hair,'hair');
    // Olive patrol cap, white patch, attached brim and dark sideburns.
    box(2,0,headZ+headH-1,21,24,6,'#52613e','cap',[
      patch(-3,1,6,3,'#b9b79b','cap-badge')
    ]);
    box(13,0,headZ+headH-1,7,26,2,'#455234','cap-brim');
    for(const side of [-1,1])box(2,side*10.7,headZ+7,5,1.8,7,p.hair,'sideburn');
  } else if (!demon) {
    if(kind==='runner'||kind==='walker'||kind==='bomber') {
      box(-2,0,headZ+headH-1,14,headW+1,3,p.hair,'hair');
      box(-6,0,headZ+headH-7,3,headW+1,7,p.hair,'back-hair');
    } else if(stains)box(0,-5,headZ+headH,5,4,.3,blood,'scalp-mark');
  }
  if (demon) {
    // Each root intersects the skull. Overlapping voxel segments turn upward.
    for(const side of [-1,1]) {
      const root={f:0,r:side*(headW/2-2),z:headZ+headH-4};
      horns.push(root);
      box(root.f,root.r,root.z,8,7,7,'#72281d','horn-root');
      box(-1,root.r+side*4,root.z+2,7,6,6,'#762d20','horn-bend');
      box(-2,root.r+side*7,root.z+6,6,5,7,'#923d26','horn');
      box(-3,root.r+side*8,root.z+12,4,4,7,'#502520','horn-tip');
    }
    box(-6,0,headZ+headH,6,9,3,p.hair,'skull-ridge');
  }
  if (player) {
    const metal='#374341',light='#78827b',black='#202826';
    const long=weapon!=='pistol',launcher=weapon==='launcher',mini=weapon==='minigun';
    box(17,1,29,long?23:13,launcher?11:6,launcher?10:6,metal,'gun');
    box(13,1,31,long?17:10,5,4,light,'receiver');
    box(27+(long?4:0),1,29,launcher?15:mini?16:10,launcher?13:mini?10:3,launcher?13:mini?8:3,black,'muzzle');
    box(15,1,23,4,4,7,black,'grip');
    if (long)box(22,1,22,4,4,9,black,'magazine');
    if (weapon==='railgun')box(23,1,34,15,3,2,'#6aa4b8','rail');
    if (weapon==='flamer') {
      box(-10,-5,23,8,8,20,'#776f38','fuel-tank');
      box(34,1,28,5,6,6,'#a77748','nozzle');
    }
    if (weapon==='shotgun')box(25,1,27,12,5,4,'#816044','pump');
  }
  return {kind,boxes,head,horns,scale:kind==='boss'?1.85:kind==='brute'?1.32:kind==='runner'?.9:1};
}

export function projectPoint(f,r,z,angle) {
  const co=Math.cos(angle),si=Math.sin(angle),y=f*si+r*co;
  return [f*co-r*si,y*.68-z,y+.68*z];
}
const faceDefs = [
  {name:'front',normal:a=>Math.sin(a),point:(b,u,v)=>[b.f+b.d/2,b.r+u,b.z+v],span:b=>[b.w,b.h],base:.89},
  {name:'back',normal:a=>-Math.sin(a),point:(b,u,v)=>[b.f-b.d/2,b.r-u,b.z+v],span:b=>[b.w,b.h],base:.73},
  {name:'right',normal:a=>Math.cos(a),point:(b,u,v)=>[b.f-u,b.r+b.w/2,b.z+v],span:b=>[b.d,b.h],base:.8},
  {name:'left',normal:a=>-Math.cos(a),point:(b,u,v)=>[b.f+u,b.r-b.w/2,b.z+v],span:b=>[b.d,b.h],base:.77},
  {name:'top',normal:()=>.68,point:(b,u,v)=>[b.f+v-b.d/2,b.r+u,b.z+b.h],span:b=>[b.w,b.d],base:1.16}
];
function tint(hex,factor) {
  const n=parseInt(hex.slice(1),16);
  return `rgb(${clamp((n>>16)*factor,0,255)|0},${clamp((n>>8&255)*factor,0,255)|0},${clamp((n&255)*factor,0,255)|0})`;
}
export function visibleSurfaces(model,angle) {
  const faces=[];
  for (const b of model.boxes)for(const d of faceDefs) {
    if(d.normal(angle)<.025)continue;
    const [w,h]=d.span(b);
    const point=(u,v)=>projectPoint(...d.point(b,u,v),angle);
    const points=[point(-w/2,0),point(w/2,0),point(w/2,h),point(-w/2,h)];
    faces.push({b,name:d.name,points,point,w,h,shade:d.base,
      depth:points.reduce((n,p)=>n+p[2],0)/4,
      patches:d.name==='front'?b.face:[]});
  }
  return faces.sort((a,b)=>a.depth-b.depth||a.b.id-b.b.id);
}
function polygon(c,points,fill,stroke=false) {
  c.beginPath();for(let i=0;i<points.length;i++)i?c.lineTo(points[i][0],points[i][1]):c.moveTo(points[i][0],points[i][1]);c.closePath();
  c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.38;c.stroke();}
}
export function paintCharacter(c,model,angle) {
  for(const s of visibleSurfaces(model,angle)) {
    polygon(c,s.points,tint(s.b.color,s.shade),'#242820');
    const rect=(u,v,w,h,color)=>polygon(c,[s.point(u,v),s.point(u+w,v),s.point(u+w,v+h),s.point(u,v+h)],color);
    // Sparse deterministic blocks add wear without noisy per-frame randomness.
    if(s.w>=7&&s.h>=7){
      let n=(s.b.id*2371+model.kind.length*917+s.name.length*33)>>>0;
      for(let i=0;i<4;i++) {
        n=(Math.imul(n,1664525)+1013904223)>>>0;const u=-s.w/2+(n%1000)/1000*(s.w-3);
        n=(Math.imul(n,1664525)+1013904223)>>>0;const v=(n%1000)/1000*(s.h-3);
        rect(u,v,2+(i%2),2+(i%3),tint(s.b.color,s.shade*(i%2?1.13:.87)));
      }
    }
    if(s.patches.length){
      c.save();c.beginPath();s.points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.clip();
      for(const p of s.patches)rect(p.u,p.v,p.w,p.h,p.color);
      c.restore();
    }
  }
}
const sprites=new Map();
const CAPACITY=256;
const SIZE=112,BASE=98,DENSITY=2;
function getSprite(kind,weapon,angle,frame,stains) {
  const direction=((Math.round(angle/TAU*32)%32)+32)%32;
  const key=[kind,weapon,direction,frame,stains?1:0].join(':');
  if(sprites.has(key)){const s=sprites.get(key);sprites.delete(key);sprites.set(key,s);return s;}
  const canvas=document.createElement('canvas');canvas.width=SIZE*DENSITY;canvas.height=SIZE*DENSITY;
  const c=canvas.getContext('2d');c.scale(DENSITY,DENSITY);c.translate(SIZE/2,BASE);
  const model=buildCharacter(kind,weapon,frame,stains);paintCharacter(c,model,direction*TAU/32);
  const s={canvas,scale:model.scale};sprites.set(key,s);
  if(sprites.size>CAPACITY){const first=sprites.keys().next().value;const old=sprites.get(first);sprites.delete(first);old.canvas.width=old.canvas.height=1;}
  return s;
}
export function clearCharacterCache(){for(const s of sprites.values())s.canvas.width=s.canvas.height=1;sprites.clear();}
export function characterCacheSize(){return sprites.size;}
export function drawCharacter(c,e,{player=false,weapon='pistol',blood=true,time=0}={}) {
  const kind=player?'player':e.kind;
  const frame=((Math.floor((e.walk||0)*2/Math.PI)%4)+4)%4;
  const s=getSprite(kind,player?weapon:'',e.angle||0,frame,blood);
  c.save();c.translate(e.x,e.y);c.scale(s.scale,s.scale);
  c.fillStyle='#16211f50';c.beginPath();c.ellipse(3,3,kind==='boss'?24:18,9,0,0,TAU);c.fill();
  if(player){c.strokeStyle='#d8ed89';c.lineWidth=1.6;c.beginPath();c.ellipse(0,1,22,12,0,0,TAU);c.stroke();}
  c.drawImage(s.canvas,-SIZE/2,-BASE,SIZE,SIZE);
  if(e.flash>0){c.strokeStyle='#f8ead9aa';c.lineWidth=1.6;c.beginPath();c.ellipse(0,-28,17,24,0,0,TAU);c.stroke();}
  if(!player&&e.fire>0)for(let i=0;i<3;i++)polygon(c,[[-14+i*10,-16],[-9+i*10,-42-Math.sin(time*16+i)*6],[-2+i*10,-16]],i%2?'#ffd78b90':'#f07b5080');
  if(e.telegraph>0||e.fuse>=0){c.strokeStyle=e.fuse>=0?'#ff8d5a':'#f2b872';c.lineWidth=1.8;c.beginPath();c.ellipse(0,0,e.fuse>=0?31:25,e.fuse>=0?19:15,0,0,TAU);c.stroke();}
  if(!player&&(e.hp<e.maxHp||kind==='boss')){
    const y=kind==='boss'||kind==='cinder'?-102:-79;
    c.fillStyle='#202923';c.fillRect(-17,y,34,3);
    c.fillStyle=kind==='boss'?'#e9a171':'#cfdbb0';c.fillRect(-17,y,34*clamp(e.hp/e.maxHp,0,1),3);
  }
  c.restore();
}
