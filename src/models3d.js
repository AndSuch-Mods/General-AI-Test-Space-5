import * as THREE from '../vendor/three.module.min.js';

// Model space: X is the character's right, Y is up, +Z is the face/weapon direction.
// Fixed details are merged by moving body section, not drawn as separate meshes.
export const MODEL_REVISION = '1.4.0';
export const MODEL_KINDS = ['player','walker','runner','brute','bomber','cinder','boss'];
const P = {
 player:{skin:'#d9b28b',cloth:'#596540',dark:'#2b3729',pants:'#3f4b31',hair:'#302d24',light:'#87915f'},
 walker:{skin:'#a9ae88',cloth:'#454e5b',dark:'#343d48',pants:'#65503d',hair:'#52352d',light:'#c8c69b'},
 runner:{skin:'#acaf88',cloth:'#d1c7ad',dark:'#928b78',pants:'#384147',hair:'#673a2c',light:'#cdcaa3'},
 brute:{skin:'#aeb38a',cloth:'#434c5a',dark:'#282f39',pants:'#35404d',hair:'#746440',light:'#c9c7a3'},
 bomber:{skin:'#aaa982',cloth:'#586047',dark:'#293329',pants:'#686144',hair:'#573c30',light:'#c9c096'},
 cinder:{skin:'#b73428',cloth:'#97291e',dark:'#521611',pants:'#332b2a',hair:'#552018',light:'#e15b3b'},
 boss:{skin:'#a92b20',cloth:'#711c19',dark:'#361014',pants:'#30272b',hair:'#471514',light:'#d6452a'}
};
const BLOOD='#82382d', METAL='#7c8587', BLACK='#202723', TOOTH='#e5dab5';

export function createModelBlueprint(kind='walker', weapon='pistol') {
 if(!MODEL_KINDS.includes(kind))throw new Error('Unknown character: '+kind);
 const p=P[kind],human=kind==='player',demon=kind==='cinder'||kind==='boss',heavy=kind==='brute'||kind==='boss';
 const width=heavy?34:kind==='runner'?23:27;
 const bones={body:[0,0,0],head:[0,heavy?60:57,1],armL:[-width/2-5,49,0],armR:[width/2+5,49,0],legL:[-7,26,0],legR:[7,26,0],weapon:[0,43,13]};
 const pieces=[];
 const box=(bone,tag,x,y,z,w,h,d,color,bevel=.6,rotation=[0,0,0],material='matte')=>pieces.push({bone,tag,position:[x,y,z],size:[w,h,d],color,bevel,rotation,material});
 const tile=(bone,tag,x,y,z,w,h,color,material='matte')=>box(bone,tag,x,y,z,w,h,.28,color,.09,[0,0,0],material);
 const ring=(bone,tag,x,y,z,size,color,rotation=[0,0,0])=>{
   // Four bars form a real hole, not a dark rectangle painted on a solid block.
   for(const [dx,dy,w,h] of [[-size/2,0,1.5,size],[size/2,0,1.5,size],[0,-size/2,size,1.5],[0,size/2,size,1.5]]){
    const v=new THREE.Vector3(dx,dy,0).applyEuler(new THREE.Euler(...rotation));
    box(bone,tag,x+v.x,y+v.y,z+v.z,w,h,1.6,color,.25,rotation,'metal');
   }
 };
 const scuff=(bone,x,y,z,i,front=true)=>{
  for(let j=0;j<4;j++)tile(bone,'weathering',x+((i*7+j*5)%9)-4,y+((i*3+j*7)%11)-5,z+(front?.16:-.16),1.2+(j%2)*1.3,1+(j%3),j%2?p.dark:p.light);
 };
 for(const side of [-1,1]){
  const leg=side<0?'legL':'legR',arm=side<0?'armL':'armR';
  box(leg,'thigh',0,-6,0,heavy?13:10,14,11,p.pants,1.25);
  box(leg,'knee',0,-13,2,heavy?13:10,6,11,human?p.dark:p.skin,1);
  box(leg,'shin',0,-19,.7,heavy?12:9,10,10,p.pants,1);
  box(leg,'boot-sole',0,-24.2,3,heavy?15:12,3.4,19,'#171d1a',.5);
  box(leg,'boot',0,-20.5,3,heavy?14:11,6,18,BLACK,1.2);
  box(leg,'boot-toecap',0,-19,8.8,heavy?14:11,4.7,6,'#3c4035',.7);
  box(leg,'boot-cuff',0,-16.5,-.6,heavy?13:10,3,11,'#4c513e',.5);
  for(let j=0;j<3;j++)tile(leg,'laces',0,-19+j*1.3,12,4.4,.6,'#86876b');
  if(human){
   box(leg,'knee-pad',0,-11,6.3,9,7,3.3,'#7b855a',.9);
   box(leg,'knee-strap',0,-13,5.5,11,1.5,2,'#28362a',.2);
   box(leg,'cargo-pocket',side*5.3,-5,0,2.5,7,8,p.cloth,.6);
  }else{
   box(leg,'torn-trouser-edge',side*2,-9,5.7,5,4,1.6,p.dark,.15);
   tile(leg,'exposed-knee',-2,-13.2,7,3,4,p.skin);
   tile(leg,'blood',2,-14,7.2,3,2.1,BLOOD,'blood');
  }
  box(arm,'upper-arm',0,-7.5,0,heavy?15:10,17,13,p.skin,1.8,[side*.07,0,side*.07]);
  if(!demon){
   box(arm,'sleeve',0,-1.5,0,heavy?16:12,human?9:7,14,p.cloth,.9);
   for(let j=0;j<3;j++)box(arm,'ragged-cuff',-4+j*3.5,-6.6,6.2,2.8,2+j%2,1.6,p.dark,.1);
  }
  box(arm,'elbow',0,-16,2,heavy?14:10,7,11,p.skin,1.4);
  box(arm,'forearm',0,-20,5.2,heavy?14:10,12,12,p.skin,1.5,[-.22,0,0]);
  box(arm,'hand',0,-24.5,9,heavy?14:10,8,10,human?p.dark:p.skin,1.2);
  for(let j=0;j<3;j++)box(arm,'knuckle',-3+j*3,-24,14.1,2.1,3,1.1,demon?'#5d1714':human?'#717958':p.light,.3);
  scuff(arm,0,-13,7,side+3);
  tile(arm,'blood',2,-12,7.6,3,5,BLOOD,'blood');
  tile(arm,'blood',-3,-18,9.7,2,2,BLOOD,'blood');
  if(human){
   box(arm,'shoulder-plate',0,2,0,13,6,15,'#778359',1);
   box(arm,'forearm-guard',0,-20,10,10,7,2.6,'#65734c',.6);
   tile(arm,'sleeve-patch',0,-1,7.7,4,3,'#b0b18b');
  }
  if(demon){
   box(arm,'deltoid',0,1,1,heavy?19:14,10,15,p.cloth,2,[0,0,-side*.13]);
   box(arm,'bicep-layer',0,-9,7,heavy?12:8,10,3,p.light,.6,[0,0,side*.08]);
   box(arm,'wrist-cuff',0,-21.5,7,heavy?17:12,4,13,kind==='boss'?'#464143':p.dark,.5);
  }
 }
 box('body','pelvis',0,26,0,width-5,10,16,p.pants,1.2);
 box('body','torso',0,41,0,width,23,18,human?p.cloth:demon?p.skin:p.cloth,2);
 if(kind==='brute'){
  box('body','belly',0,35,7,36,17,16,p.skin,3);
  box('body','overalls-bib',0,36,15,29,19,2.7,p.cloth,1);
  for(const side of [-1,1])box('body','overall-strap',side*11,49,9.8,4,17,3,'#373d46',.35,[0,0,-side*.04]);
  for(const side of [-1,1])box('body','buckle',side*11,42,12,3,3,1.8,'#afa883',.3,[0,0,0],'metal');
  box('body','bib-pocket',0,35,17,13,8,2,'#303a46',.5);
 }
 box('body','belt',0,28,width>30?10:8.7,width+1,3.1,2,BLACK,.3);
 box('body','belt-buckle',0,28,11,4.5,3.2,1.5,'#a2a38b',.3,[0,0,0],'metal');
 box('body','neck',0,55,1,11,7,11,p.skin,.8);
 if(human){
  box('body','vest-back',0,42,-10.5,24,20,4,p.dark,1);
  box('body','backpack',0,40,-15.5,19,22,9,'#46543b',1.6);
  box('body','pack-pocket',0,35,-21,15,11,3,'#5d6c48',.6);
  box('body','bedroll',0,53,-15,22,5.5,7,'#74815a',1);
  for(const side of [-1,1]){
   box('body','vest-panel',side*6.3,43,11.1,11.5,19,3.8,'#354432',.8,[0,0,side*.025]);
   box('body','shoulder-strap',side*9,51,2,4,3,22,'#252f27',.35);
   box('body','ammo-pouch',side*6.5,35,15,10.4,10,5.5,'#536445',.6);
   box('body','pouch-flap',side*6.5,39.5,16,10.8,2.4,6,'#819069',.3);
   tile('body','pouch-fastener',side*6.5,35,18,2,2,'#b8b690','metal');
   box('body','hip-pouch',side*14,28,0,5,8,10,'#4e5e3b',.6);
  }
  for(let i=0;i<3;i++)box('body','webbing',0,42+i*2.8,13.6,20,.8,.6,'#7b8964',.12);
  box('body','radio',10,45,15,4,6,4,BLACK,.4);
  box('body','antenna',11,51,15,.9,9,.9,'#191f1c',.1);
 }else if(demon){
  for(const side of [-1,1]){
   box('body','pectoral',side*7,47,10,heavy?15:12,9,4,p.light,1.2,[0,0,side*.06]);
   box('body','rib-plate',side*9,36,10,6,11,2.5,p.cloth,.7,[0,0,-side*.12]);
  }
  for(let y=32;y<=42;y+=4)box('body','abdominal',0,y,10.6,10,3.5,3,p.cloth,.6);
  for(let i=0;i<5;i++)box('body','spine',0,32+i*4.5,-10,4,3,2.2,p.dark,.5);
  for(const side of [-1,1])box('body','loin-plate',side*7,24,10,12,9,3,'#343039',.6,[0,0,side*.15]);
 }else{
  for(let i=0;i<7;i++)box('body','shirt-hem',-width/2+2+i*(width-4)/6,30+(i%3),10,3.4,3+(i%2),1.5,p.dark,.12);
  box('body','shirt-collar',0,51,9,12,3.2,2,p.dark,.3);
  for(let i=0;i<6;i++)tile('body','cloth-panels',-9+(i%3)*8,34+Math.floor(i/3)*10,9.3,5,7,i%2?p.cloth:p.dark);
  if(kind==='runner'){
   box('body','exposed-ribs',7,36,10,5,9,1.5,p.skin,.3);
   for(let i=0;i<3;i++)box('body','ribs',7,33+i*3,11.2,5,1.3,.7,p.light,.2);
  }
 }
 tile('body','blood',7,43,kind==='brute'?17.6:human?13.6:11,3,9,BLOOD,'blood');
 tile('body','blood',-6,34,kind==='brute'?18.8:human?18:11,4,3,BLOOD,'blood');
 if(kind==='bomber'){
  box('body','bomb-vest',0,41,11,25,22,4,'#26302b',.6);
  for(const side of [-1,1])box('body','bomb-strap',side*10,51,0,3,3,23,'#202723',.3);
  box('body','rear-pack',0,42,-11,20,19,6,'#363f32',.8);
  for(let row=0;row<2;row++)for(let i=0;i<4;i++){
   const x=-9+i*6,y=35+row*10;
   box('body','explosive-charge',x,y,15.5,4.7,8,5.5,i%2?'#ae3529':'#c74a32',.7);
   box('body','charge-cap',x,y+4.4,15.5,3.5,1.3,4.2,'#b3ac8a',.3,[0,0,0],'metal');
   box('body','charge-strap',x,y-1,18.5,4.8,1.7,.8,'#242723',.1);
  }
  box('body','indicator-housing',0,29.5,15.8,8,7,4,'#231f1c',.6);
  box('body','indicator',0,29.5,18.2,4.3,4.3,.5,'#ff4f26',.2,[0,0,0],'glow');
 }
 if(kind==='boss'){
  for(const side of [-1,1]){
   const arm=side<0?'armL':'armR';
   box(arm,'pauldron',0,4,-1,22,9,21,'#492d30',1.4,[0,0,side*.1],'metal');
   box(arm,'pauldron-inset',0,8,-1,17,3,16,'#753329',.8);
   for(let j=0;j<3;j++)pieces.push({bone:arm,tag:'shoulder-spike',shape:'cone',position:[(j-1)*6,14,-1],size:[2.3,10,2.3],color:'#b4aba0',material:'metal',rotation:[0,0,-side*.15]});
   box(arm,'bracer',0,-17,8.7,18,9,6,'#574c50',1,[0,0,0],'metal');
   for(const x of [-6,6])box(arm,'rivet',x,-17,12,1.9,2,1,'#c7c0ab',.3,[0,0,0],'metal');
  }
  for(const side of [-1,1])for(let i=0;i<6;i++){
   const x=side*(14-i*2.4),y=52-i*3.2;
   ring('body','chain-link',x,y,15,4.4,i%2?'#9ca5a5':'#5d696c',[0,i%2?.7:0,side*.18]);
  }
  box('body','chain-clasp',0,32,16.5,7,6,3,'#bab6a7',.6,[0,0,0],'metal');
 }
 // Head volumes: face surface is at +Z. Mouth is a recessed dark cavity,
 // framed by real cheeks and a jaw; none of these parts are double-sided.
 const hw=heavy?27:24;
 box('head','cranium',0,9,0,hw,23,22,p.skin,1.9);
 box('head','jaw',0,-3.5,2,hw-3,4,21,demon?p.cloth:p.skin,1.1);
 for(const side of [-1,1]){
  box('head','ear',side*(hw/2+.9),7,0,3.5,7,5,demon?p.cloth:p.skin,.7);
  box('head','temple',side*(hw/2-2),10,10,4.5,12,2,p.light,.5);
  box('head','cheekbone',side*7,3,11.2,6,5,3,p.light,.7,[0,0,-side*.07]);
  box('head','eye-socket',side*5.5,10.5,11.4,7.5,5.8,1,'#302a21',.4);
  box('head','eye',side*5.5,10.5,12.05,human?3.2:4.6,2.8,.32,human?'#291e18':demon?'#ff422b':'#ffdd73',.09,[0,0,0],human?'matte':'glow');
  box('head','brow',side*5.5,14,12.3,8,3.2,3,demon?p.dark:human?p.hair:p.skin,.5,[0,0,side*.10]);
 }
 box('head','nose',0,7.8,12.5,human?4.4:4,5,3.8,demon?p.light:p.skin,.6);
 if(human){
  tile('head','mouth',0,1.8,13,6,1.6,'#493528');
  for(const side of [-1,1])tile('head','stubble',side*4,0,13,2.5,2,'#8d795b');
  box('head','hair-back',0,12,-11,22,16,2.3,p.hair,.4);
  for(const side of [-1,1])box('head','sideburn',side*10.5,7.5,7.8,2,7,2,p.hair,.3);
  box('head','helmet-liner',0,20,-.5,26,5,24,p.dark,.6);
  box('head','helmet-crown',0,25,-.7,24,10,24,p.cloth,2.2);
  box('head','helmet-top',0,30,-1,19,2.5,19,p.light,.9);
  box('head','helmet-band',0,21,0,27,3,25,'#354732',.5);
  box('head','helmet-brim',0,20.7,13,28,2.4,10,'#3c512f',.5);
  for(const side of [-1,1]){
   box('head','helmet-sidepanel',side*12.4,25,-1,1.7,7,14,'#738258',.5);
   box('head','helmet-buckle',side*13,22,8,2.3,3.7,3,'#adb197',.3,[0,0,0],'metal');
  }
  box('head','helmet-badge',0,24.5,12.3,8,4,1,'#c4c5a8',.25);
 }else{
  box('head','mouth-cavity',0,.6,11.35,demon?14:12,7.8,1.2,'#241715',.2);
  for(const row of [0,1])for(let i=0;i<(demon?6:4);i++){
   if(!demon&&((i+row)%5===1))continue;
   box('head','tooth',-(demon?6.3:4.8)+i*(demon?2.5:3.3),row?3.25:-2,12.2,1.8,demon?(row?3.9:3.5):2.1,1.3,TOOTH,.2);
  }
  tile('head','tongue',0,-1,12.05,3.1,1.8,'#9e3326');
  if(!demon){
   box('head','hair-back',0,17,-9,hw-2,9,6,p.hair,.5);
   for(let i=0;i<9;i++)box('head','broken-scalp',-9+(i%4)*6,21+(i%2)*.6,-8+Math.floor(i/4)*6,5.9,2+(i%3),6,i%3?p.hair:p.skin,.25);
   tile('head','blood',-7,18,11.6,3,5,BLOOD,'blood');
   tile('head','blood',6,3,13,2,3,BLOOD,'blood');
   scuff('head',4,7,11.3,4);
  }
 }
 if(demon){
  box('head','forehead-ridge',0,18,10.4,8,7,4,p.cloth,.7);
  for(const side of [-1,1]){
   // Intersecting segments keep the base anchored to the skull at all angles.
   box('head','horn-root',side*12.5,19,0,8,8,10,p.dark,1);
   const bends=[[side*15.5,22,0,7,10,8,-side*.48],[side*19.3,29,-.7,6,10,7,-side*.16],[side*19.7,36,-2,4.5,8,5,side*.20],[side*18.6,42,-3,2.5,6,3,side*.23]];
   for(let i=0;i<bends.length;i++){
    const [x,y,z,w,h,d,rz]=bends[i];box('head','horn-segment',x,y,z,w,h,d,i<2?'#50201a':'#2c1614',.5,[.08,0,rz]);
    if(i<3)box('head','horn-ridge',x,y-2,z+.6,w+.5,1.4,d+.5,'#793025',.2,[.08,0,rz]);
   }
  }
  for(let i=0;i<5;i++)box('head','scalp-ridge',-8+i*4,21,0,3.5,2+(i%2)*2,17,i%2?p.cloth:p.light,.4);
 }
 if(human)buildWeapon(box,weapon);
 return {kind,weapon,bones,pieces,scale:kind==='boss'?1.65:kind==='brute'?1.28:kind==='runner'?.92:1,lean:kind==='runner'?.17:0};
}

function buildWeapon(box,id){
 const put=(tag,x,y,z,w,h,d,c,b=.35,rot=[0,0,0],mat='metal')=>box('weapon',tag,x,y,z,w,h,d,c,b,rot,mat);
 const dark='#242c2d',steel='#616e71',wood='#756143';
 if(id==='pistol'){
  put('pistol-slide',0,1,9,5.5,5,17,steel,.6);put('pistol-frame',0,-2,7,5,2.5,11,dark);put('pistol-grip',0,-6,3,4.5,9,6,dark,.5,[-.17,0,0]);
  put('muzzle',0,1,18,3.5,3.5,1.4,'#111817');put('front-sight',0,4,16,1,1.5,2,'#afbaa1');
 }else{
  const large=id==='launcher',mini=id==='minigun',flame=id==='flamer',rail=id==='railgun';
  put('receiver',0,1,8,large?10:mini?11:7,large?10:mini?8:7,large?28:19,dark,.9);
  put('stock',0,0,-8,6,8,12,id==='shotgun'?wood:'#45534a',.7);
  put('grip',0,-6,3,4.8,9,5,dark,.5,[-.25,0,0]);
  put('magazine',0,-7,12,4.8,10,7,steel,.5,[.1,0,0]);
  if(mini){for(let i=0;i<6;i++)put('minigun-barrel',Math.cos(i*Math.PI/3)*3,1+Math.sin(i*Math.PI/3)*3,26,2.2,2.2,19,steel,.3);put('barrel-ring',0,1,31,10,10,2.5,'#424f4e',.4);}
  else{put('barrel',0,2,25,large?11:4,large?11:4,large?14:18,steel,.6);put('muzzle',0,2,35,large?12:5.8,large?12:5.8,3.7,'#1a2424',.5);}
  put('upper-rail',0,5.5,9,4,1.2,17,steel,.2);
  for(let j=0;j<5;j++)put('rail-tooth',0,6.5,2+j*3,4.5,.8,1,dark,.08);
  if(rail){put('rail-core',0,2,24,2,2,21,'#76ccf8',.15,[0,0,0],'glow');put('scope',0,9,6,4,4,12,'#445f66',.5);}
  if(flame){put('fuel-cell',6,-2,7,6,12,12,'#a35b37',.9);put('igniter',0,2,38,2,2,1,'#ffac41',.2,[0,0,0],'glow');}
  if(id==='shotgun')put('pump',0,-1,22,7,5,9,wood,.6);
  if(large){put('rear-tube',0,1,-10,12,12,5,'#687654',.8);put('sight',4,8,8,2,6,4,'#778265');}
 }
}

// Flat chamfers: 6 faces + 12 beveled edges + 8 corners = 44 triangles.
function beveledBox(size,bevel){
 const half=size.map(n=>n/2),r=Math.min(bevel,...half)*.95,out={position:[],normal:[]};
 const face=(points,normal)=>{
  const a=new THREE.Vector3(...points[0]),b=new THREE.Vector3(...points[1]),c=new THREE.Vector3(...points[2]);
  if(b.sub(a).cross(c.sub(a)).dot(new THREE.Vector3(...normal))<0)points=points.toReversed();
  for(let i=1;i<points.length-1;i++)for(const pt of [points[0],points[i],points[i+1]]){out.position.push(...pt);out.normal.push(...normal);}
 };
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const other=[0,1,2].filter(i=>i!==axis),normal=[0,0,0];normal[axis]=sign;
  const pts=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{const p=[0,0,0];p[axis]=sign*half[axis];p[other[0]]=u*(half[other[0]]-r);p[other[1]]=v*(half[other[1]]-r);return p;});face(pts,normal);
 }
 for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)for(const sa of [-1,1])for(const sb of [-1,1]){
  const c=3-a-b,pts=[];for(const [edge,along] of [[0,-1],[1,-1],[1,1],[0,1]]){const p=[0,0,0];p[a]=sa*(half[a]-(edge?r:0));p[b]=sb*(half[b]-(edge?0:r));p[c]=along*(half[c]-r);pts.push(p);}
  const n=[0,0,0];n[a]=sa/Math.SQRT2;n[b]=sb/Math.SQRT2;face(pts,n);
 }
 for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
  const s=[sx,sy,sz],pts=[];for(let axis=0;axis<3;axis++)pts.push(half.map((h,i)=>s[i]*(h-(i===axis?0:r))));face(pts,s.map(n=>n/Math.sqrt(3)));
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out.position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(out.normal,3));return g;
}
const shapeCache=new Map();
export function compileModel(blueprint){
 const groups=new Map();
 for(const piece of blueprint.pieces){
  const key=piece.bone+':'+piece.material;if(!groups.has(key))groups.set(key,{bone:piece.bone,material:piece.material,position:[],normal:[],color:[],tags:[]});const group=groups.get(key);
  const shapeKey=JSON.stringify([piece.shape||'box',piece.size,piece.bevel]);
  if(!shapeCache.has(shapeKey))shapeCache.set(shapeKey,piece.shape==='cone'?new THREE.ConeGeometry(piece.size[0],piece.size[1],4).toNonIndexed():beveledBox(piece.size,piece.bevel??.3));
  const g=shapeCache.get(shapeKey),m=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...(piece.rotation||[0,0,0])));m.setPosition(...piece.position);
  const nm=new THREE.Matrix3().getNormalMatrix(m),v=new THREE.Vector3(),n=new THREE.Vector3(),color=new THREE.Color(piece.color);
  const pos=g.getAttribute('position'),norm=g.getAttribute('normal');
  for(let i=0;i<pos.count;i++){
   v.fromBufferAttribute(pos,i).applyMatrix4(m);n.fromBufferAttribute(norm,i).applyMatrix3(nm).normalize();group.position.push(v.x,v.y,v.z);group.normal.push(n.x,n.y,n.z);group.color.push(color.r,color.g,color.b);
  }group.tags.push(piece.tag);
 }
 return [...groups.values()].map(part=>{
  const geometry=new THREE.BufferGeometry();for(const k of ['position','normal','color'])geometry.setAttribute(k,new THREE.Float32BufferAttribute(part[k],3));geometry.computeBoundingSphere();geometry.computeBoundingBox();
  return {bone:part.bone,material:part.material,geometry,tags:part.tags};
 });
}
export const MODEL_NAMES={player:'Survivor',walker:'Standard zombie',runner:'Runner zombie',brute:'Heavy zombie',bomber:'Suicide bomber',cinder:'Devil demon',boss:'Heavy demon'};
