import {WORLD,GUN,SKINS,MAP,clamp} from './data.js';
const TAU=Math.PI*2;
function shade(hex,k){const n=parseInt(hex.slice(1),16);return `rgb(${clamp((n>>16)+k,0,255)},${clamp(((n>>8)&255)+k,0,255)},${clamp((n&255)+k,0,255)})`;}
export function weaponSVG(id){
 const common='fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="miter"';
 const shapes={pistol:'<path d="M8 15h33v8H25v14H15V24H8z"/><path d="M25 23h11v8H25"/>',uzi:'<path d="M7 15h34v11H24v13H14V26H7z"/><path d="M30 26v13h7V26M41 18h8M17 15V9h12v6"/>',shotgun:'<path d="M4 21h42v6H21L10 36H4V25z"/><path d="M29 27v5h10v-5M46 21h5"/>',barrel:'<path d="M15 7h24v34H15zM15 15h24M15 33h24"/><path d="m26 19-5 8h7l-3 5 9-10h-8l2-3"/>',grenade:'<path d="M20 15h16l5 8-3 15-10 5-11-6-3-14zM24 15V7h8v8M32 8h11v13"/><path d="M16 25h24M20 33h16"/>',wall:'<path d="M5 13h44v28H5zM5 27h44M19 13v14M35 13v14M12 27v14M28 27v14M43 27v14"/>',mine:'<path d="m8 33 9-14h20l10 14v7H8zM8 33h39M23 19v-6h8v6"/><path d="M20 33h15"/>',rocket:'<path d="M5 20h33v11H5zM38 17l12 8-12 10zM15 31v10h7V31M11 20v-6h12v6"/>',rail:'<path d="M5 19h38v12H23v9h-9v-9H5zM43 22h9v6h-9M25 14v22M32 14v22"/>',charge:'<path d="M8 18h29v23H8zM14 23h17v9H14zM37 29h9V10h-8M43 10V4"/><path d="m17 18 3-8h8l3 8"/>'};
 return `<svg viewBox="0 0 56 48" aria-hidden="true" ${common}>${shapes[id]||shapes.pistol}</svg>`;
}
export function mapSVG(map){return `<svg viewBox="0 0 1440 1040" aria-label="Room layout" role="img"><rect width="1440" height="1040" fill="#d8d8ca"/><path d="M0 520H1440M720 0V1040" stroke="#c1c4b7" stroke-width="4"/><rect x="16" y="16" width="1408" height="1008" fill="none" stroke="#7f8476" stroke-width="22"/>${map.walls.map(b=>`<rect x="${b.x+12}" y="${b.y+18}" width="${b.w}" height="${b.h}" fill="#9da291"/><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#555f54"/>`).join('')}<circle cx="720" cy="520" r="26" fill="#c54e35"/></svg>`;}

export class Renderer{
 constructor(canvas,settings){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.settings=settings;this.w=0;this.h=0;this.camera={x:720,y:520};this.zoom=1;this.time=0;this.effects=[];this.decals=[];this.shake=0;this.hurt=0;this.sx=0;this.sy=0;this.resize();}
 resize(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);this.w=Math.max(1,r.width);this.h=Math.max(1,r.height);this.dpr=dpr;this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);this.ctx.imageSmoothingEnabled=false;}
 project(x,y,z=0){return{x:(x-this.camera.x-z*.22)*this.zoom+this.cx+this.sx,y:((y-this.camera.y)*.74-z)*this.zoom+this.cy+this.sy};}
 unproject(x,y){return{x:(x-this.cx-this.sx)/this.zoom+this.camera.x,y:(y-this.cy-this.sy)/(.74*this.zoom)+this.camera.y};}
 polygon(points,fill,stroke=null){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=Math.max(.6,this.zoom*.7);c.stroke();}}
 cube(x,y,w,d,h,color,z=0){const p=(dx,dy,dz)=>this.project(x+dx,y+dy,z+dz),a=p(-w/2,-d/2,h),b=p(w/2,-d/2,h),cc=p(w/2,d/2,h),dd=p(-w/2,d/2,h),e=p(w/2,-d/2,0),f=p(w/2,d/2,0),g=p(-w/2,d/2,0);this.polygon([b,e,f,cc],shade(color,-30),'#26312e55');this.polygon([dd,cc,f,g],shade(color,-15),'#26312e55');this.polygon([a,b,cc,dd],shade(color,18),'#26312e55');}
 shadow(x,y,rx,ry,alpha=.17){const p=this.project(x+7,y+8),c=this.ctx;c.fillStyle=`rgba(26,33,29,${alpha})`;c.beginPath();c.ellipse(p.x,p.y,rx*this.zoom,ry*this.zoom,0,0,TAU);c.fill();}
 text(text,x,y,size,color,align='center',font='900'){const c=this.ctx;c.font=`${font} ${size}px system-ui, sans-serif`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(text,x,y);}
 event(e){
  if(e.type==='tracer')this.effects.push({...e,life:e.rail?.18:.085,max:e.rail?.18:.085});
  if(e.type==='shot')this.effects.push({...e,life:.07,max:.07});
  if(e.type==='explosion'){this.effects.push({...e,life:.42,max:.42});if(!this.settings.reducedMotion)this.shake=Math.min(8,this.shake+4);for(let i=0;i<12;i++)this.effects.push({type:'particle',x:e.x,y:e.y,vx:(Math.random()-.5)*230,vy:(Math.random()-.5)*230,z:Math.random()*35,vz:70+Math.random()*80,life:.55,max:.55,color:i%2?'#dcaa53':'#777b6a',size:3+Math.random()*4});}
  if(e.type==='kill'){
    if(this.settings.blood){this.decals.push({x:e.x,y:e.y,size:12+Math.random()*13,angle:Math.random()*TAU});if(this.decals.length>100)this.decals.shift();}
    for(let i=0;i<5;i++)this.effects.push({type:'particle',x:e.x,y:e.y,vx:(Math.random()-.5)*110,vy:(Math.random()-.5)*100,z:12+Math.random()*25,vz:40+Math.random()*80,life:.65,max:.65,color:e.type==='devil'||e.type==='overlord'?'#aa4836':'#8e9b83',size:4+Math.random()*5});
  }
  if(e.type==='pickup')this.effects.push({...e,life:.65,max:.65});
  if(e.type==='spark')this.effects.push({...e,life:.12,max:.12});
  if(e.type==='hurt'){this.hurt=.3;if(!this.settings.reducedMotion)this.shake=5;}
  if(this.effects.length>250)this.effects=this.effects.slice(-250);
 }
 clear(){this.effects=[];this.decals=[];this.shake=0;this.hurt=0;}
 actor(e,player=false,skinId='ranger'){
  const isDevil=['devil','overlord'].includes(e.type),scale=player?1:e.type==='overlord'?1.85:e.type==='brute'?1.4:isDevil?1.14:e.type==='runner'?.9:1;
  let shirt,skin,trim,hair;
  if(player){const sk=SKINS.find(s=>s.id===skinId)||SKINS[0];({shirt,skin,trim,hair}=sk);}else{shirt=isDevil?'#b1372b':e.type==='brute'?'#626d52':e.type==='runner'?'#897456':'#a5b2ae';skin=isDevil?'#e4533a':e.type==='brute'?'#94a275':'#bcc8ac';trim='#75806b';hair=isDevil?'#862e23':'#788477';}
  if(e.flash>0){shirt='#e2d6b8';skin='#f5e5c5';}
  const x=e.x,y=e.y,c=this.ctx,z=this.zoom;
  this.shadow(x,y,18*scale,9*scale);
  if(player){const pp=this.project(x,y);c.strokeStyle='#cf713b';c.lineWidth=1.6;c.beginPath();c.ellipse(pp.x,pp.y+4*z,22*z,12*z,0,0,TAU);c.stroke();const a=e.angle;const pt=this.project(x+Math.cos(a)*35,y+Math.sin(a)*35);this.polygon([{x:pt.x,y:pt.y-3},{x:pt.x+4,y:pt.y+3},{x:pt.x-4,y:pt.y+3}],'#c76137');}
  const step=Math.sin(e.walk||0)*3*scale;
  const cb=(xx,yy,w,d,h,col,zz=0)=>this.cube(x+xx*scale,y+yy*scale,w*scale,d*scale,h*scale,col,zz*scale);
  cb(-6,-step,8,12,9,'#313833');cb(6,step,8,12,9,'#313833');
  cb(0,0,22,14,19,shirt,9);cb(0,1,23,15,3,trim,10);
  const a=e.angle||0,dx=Math.cos(a),dy=Math.sin(a);
  if(!player){cb(-15,dy*9,7,10,14,shirt,12);cb(15,dy*9,7,10,14,shirt,12);cb(-15,dy*14,7,9,6,skin,13);cb(15,dy*14,7,9,6,skin,13);}
  else {cb(-13,0,7,10,15,shirt,12);cb(13,1,7,10,15,shirt,12);cb(dx*14,dy*12,8,8,7,skin,17);}
  cb(0,-1,20,16,17,skin,29);
  if(!isDevil){cb(0,-4,21,12,5,hair,43);if(player&&skinId==='ranger'){cb(0,-1,22,17,5,shirt,43);cb(0,-11,23,8,2,shirt,43);}if(player&&skinId==='scout')cb(0,-1,21,17,3,'#9f4836',39);}
  else{cb(-8,-1,5,7,13,'#482b25',44);cb(8,-1,5,7,13,'#482b25',44);}
  const eyeY=dy>-.35?7:-7,ex=dx>0?4:-4;cb(ex-4,eyeY,3,1,3,isDevil?'#ffd383':'#303b31',35);cb(ex+4,eyeY,3,1,3,isDevil?'#ffd383':'#303b31',35);
  if(player){const p=this.project(x+dx*13,y+dy*13,22);c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(dy*.74,dx));c.fillStyle='#252f2d';c.fillRect(-4*z,-4*z,26*z,7*z);c.fillStyle='#707c75';c.fillRect(7*z,-4*z,15*z,2*z);c.fillStyle='#bd9560';c.fillRect(0,-1*z,7*z,5*z);c.restore();}
  if(!player&&(e.hp<e.maxHp||isDevil||e.type==='brute')){const p=this.project(x,y,58*scale),width=32*scale*z;c.fillStyle='#40473bb5';c.fillRect(p.x-width/2,p.y,width,3*z);c.fillStyle=isDevil?'#ce553e':'#72805b';c.fillRect(p.x-width/2,p.y,width*clamp(e.hp/e.maxHp,0,1),3*z);}
 }
 object(o){
  const x=o.x,y=o.y;if(o.type==='wall'){this.shadow(x,y,24,11);this.cube(x,y,36,36,30,'#9e9781');const p=this.project(x,y,32);this.text('///',p.x,p.y,12*this.zoom,'#6e695b');return;}
  if(o.type==='barrel'){this.shadow(x,y,23,10);this.cube(x,y,29,28,6,'#664f3d');this.cube(x,y,31,30,24,'#a54a35',6);this.cube(x,y,32,31,4,'#584e3b',12);this.cube(x,y,32,31,4,'#584e3b',28);this.cube(x,y,29,28,4,'#b9613c',32);const p=this.project(x,y+16,21);this.text('!',p.x,p.y,14*this.zoom,'#f3d494');return;}
  this.shadow(x,y,15,7,.1);this.cube(x,y,24,22,5,o.type==='mine'?'#737c55':'#8a6758');this.cube(x,y,9,8,4,'#343e35',5);const p=this.project(x,y,10);this.ctx.fillStyle=o.arm>0?'#c9ac67':Math.sin(this.time*6)>0?'#e67047':'#ae4536';this.ctx.fillRect(p.x-2,p.y-2,4,3);
 }
 floor(game){
  const c=this.ctx;c.fillStyle='#c7cbbf';c.fillRect(0,0,this.w,this.h);
  const a=this.unproject(-100,-100),b=this.unproject(this.w+100,this.h+100);const x0=clamp(Math.floor(a.x/80)*80,0,WORLD.w),x1=clamp(b.x+80,0,WORLD.w),y0=clamp(Math.floor(a.y/80)*80,0,WORLD.h),y1=clamp(b.y+80,0,WORLD.h);
  this.polygon([this.project(0,0),this.project(WORLD.w,0),this.project(WORLD.w,WORLD.h),this.project(0,WORLD.h)],'#d4d6c9');
  c.lineWidth=.65;c.strokeStyle='#b9bfb244';c.beginPath();for(let x=x0;x<=x1;x+=80){const p=this.project(x,0),q=this.project(x,WORLD.h);c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);}for(let y=y0;y<=y1;y+=80){const p=this.project(0,y),q=this.project(WORLD.w,y);c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);}c.stroke();
  for(let x=x0;x<x1;x+=80)for(let y=y0;y<y1;y+=80){if((x*13+y*7)%11<3){const p=this.project(x+21,y+32);c.fillStyle='#9fa79130';c.fillRect(p.x,p.y,17*this.zoom,2*this.zoom);}}
  for(const d of this.decals){const p=this.project(d.x,d.y);c.save();c.translate(p.x,p.y);c.rotate(d.angle);c.globalAlpha=.4;c.fillStyle='#a9543d';c.fillRect(-d.size/2,-d.size/5,d.size,d.size*.4);c.fillRect(-d.size/4,-d.size/2,d.size*.55,d.size);c.restore();}
  const mid=this.project(720,520);c.globalAlpha=.13;this.text('ROOM '+String(game.s.wave).padStart(2,'0'),mid.x,mid.y,65*this.zoom,'#465540');c.globalAlpha=1;
  for(const [x,y,a] of [[720,22,0],[720,1018,0],[22,520,1],[1418,520,1]]){const p=this.project(x,y);c.save();c.translate(p.x,p.y);if(a)c.rotate(Math.PI/2);for(let k=-4;k<=4;k++){c.fillStyle=k%2?'#555e4b':'#bfab69';c.fillRect(k*16*this.zoom,-5*this.zoom,16*this.zoom,10*this.zoom);}c.restore();}
  c.strokeStyle='#78836e';c.lineWidth=8*this.zoom;const corners=[this.project(5,5),this.project(1435,5),this.project(1435,1035),this.project(5,1035)];c.beginPath();corners.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke();
 }
 radar(game){
  if(this.w<600)return;const c=this.ctx,width=115,height=83,x=this.w-width-18,y=92;
  c.fillStyle='#eef0e5bf';c.fillRect(x-5,y-5,width+10,height+10);c.strokeStyle='#52664e66';c.strokeRect(x-5,y-5,width+10,height+10);c.fillStyle='#7a856a';for(const b of game.walls)c.fillRect(x+b.x/1440*width,y+b.y/1040*height,Math.max(2,b.w/1440*width),Math.max(2,b.h/1040*height));
  for(const e of game.s.enemies){c.fillStyle=e.type==='devil'||e.type==='overlord'?'#bd4c34':'#859268';c.fillRect(x+e.x/1440*width-1,y+e.y/1040*height-1,3,3);}c.fillStyle='#314e58';c.fillRect(x+game.s.player.x/1440*width-2,y+game.s.player.y/1040*height-2,4,4);
 }
 render(game,dt,{menu=false,touch=false}={}){
  this.time+=dt;const p=game.s.player;this.zoom=(this.w<600?.92:Math.min(1.1,Math.max(.86,this.h/650)))*(this.settings.zoom||1);this.cx=menu?(this.w>=800?this.w*.72:this.w*.76):this.w*.5;this.cy=menu?(this.h<500?this.h*.55:220):this.h*(touch&&this.w<this.h?.40:.51);
  const lerp=menu?1:Math.min(1,dt*10);this.camera.x+=(p.x-this.camera.x)*lerp;this.camera.y+=(p.y-this.camera.y)*lerp;
  this.shake=Math.max(0,this.shake-dt*25);this.sx=this.settings.reducedMotion?0:(Math.random()-.5)*this.shake;this.sy=this.settings.reducedMotion?0:(Math.random()-.5)*this.shake;
  this.floor(game);
  for(const q of game.s.pickups){const pt=this.project(q.x,q.y,9+Math.sin(this.time*3+q.id)*3);const c=this.ctx;c.save();c.translate(pt.x,pt.y);const z=this.zoom;c.fillStyle=q.kind==='health'?'#e4e4cd':q.kind==='ammo'?'#857855':'#bd9d55';c.strokeStyle='#68735c';c.lineWidth=1;c.fillRect(-9*z,-8*z,18*z,16*z);c.strokeRect(-9*z,-8*z,18*z,16*z);c.fillStyle=q.kind==='health'?'#b44f3c':'#e0d4a9';if(q.kind==='health'){c.fillRect(-2*z,-6*z,4*z,12*z);c.fillRect(-6*z,-2*z,12*z,4*z);}else if(q.kind==='ammo'){for(let i=-1;i<=1;i++)c.fillRect((i*5-1)*z,-5*z,3*z,10*z);}else this.text('$',0,0,14*z,'#f1e0a6');c.restore();}
  const sprites=[...game.walls.map(b=>({sort:b.y+b.h,kind:'wall',b})),...game.s.objects.map(o=>({sort:o.y+18,kind:'object',o})),...game.s.enemies.map(e=>({sort:e.y+7,kind:'actor',e})),{sort:p.y+8,kind:'player',e:p}].sort((a,b)=>a.sort-b.sort);
  for(const sp of sprites){let wp=sp.e||sp.o||(sp.b&&{x:sp.b.x+sp.b.w/2,y:sp.b.y+sp.b.h/2});const pt=this.project(wp.x,wp.y);if(pt.x<-450||pt.x>this.w+450||pt.y<-250||pt.y>this.h+250)continue;
    if(sp.kind==='wall'){const b=sp.b;this.shadow(b.x+b.w/2,b.y+b.h/2,b.w/2+12,b.h*.4,.1);this.cube(b.x+b.w/2,b.y+b.h/2,b.w,b.h,45,'#a7ad9b');const c=this.ctx,aa=this.project(b.x,b.y+b.h,24),bb=this.project(b.x+b.w,b.y+b.h,24);c.strokeStyle='#5d6d5955';c.lineWidth=1;c.beginPath();c.moveTo(aa.x,aa.y);c.lineTo(bb.x,bb.y);c.stroke();}
    else if(sp.kind==='object')this.object(sp.o);
    else this.actor(sp.e,sp.kind==='player',game.s.skin);
  }
  for(const q of game.s.projectiles){const z=q.kind==='grenade'?14+Math.sin(Math.min(1,q.age/.86)*Math.PI)*85:22,pt=this.project(q.x,q.y,z);this.shadow(q.x,q.y,6,3,.12);const c=this.ctx;c.save();c.translate(pt.x,pt.y);c.rotate(Math.atan2(q.vy*.74,q.vx));if(q.kind==='rocket'){c.fillStyle='#f5b953';c.fillRect(-17,-2,10,4);c.fillStyle='#42483a';c.fillRect(-8,-3,15,6);}else if(q.kind==='grenade'){c.fillStyle='#53623e';c.fillRect(-5,-5,10,10);c.fillStyle='#e7d3a0';c.fillRect(1,-7,4,4);}else{c.fillStyle='#e56a37';c.beginPath();c.arc(0,0,7,0,TAU);c.fill();c.fillStyle='#f7ce79';c.fillRect(-3,-3,6,6);}c.restore();}
  const c=this.ctx;
  for(const e of this.effects){e.life-=dt;const t=clamp(e.life/e.max,0,1);if(e.life<=0)continue;c.globalAlpha=t;
    if(e.type==='tracer'){const a=this.project(e.x,e.y,21),b=this.project(e.tx,e.ty,21);c.lineWidth=(e.rail?3:1.7)*this.zoom;c.strokeStyle=e.rail?'#467f87':'#dbac58';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();if(e.rail){c.lineWidth=1;c.strokeStyle='#eefcf4';c.stroke();}}
    else if(e.type==='shot'){const p=this.project(e.x,e.y,23);c.save();c.translate(p.x,p.y);c.rotate(e.angle);this.polygon([{x:0,y:-4},{x:11,y:-7},{x:7,y:0},{x:11,y:6},{x:0,y:4}],'#ffdc8b');c.restore();}
    else if(e.type==='explosion'){const p=this.project(e.x,e.y,10),r=e.radius*(1-t)*this.zoom;c.strokeStyle='#b96934';c.lineWidth=6*t+1;c.beginPath();c.ellipse(p.x,p.y,r,r*.74,0,0,TAU);c.stroke();c.fillStyle='#efba63';c.globalAlpha=t*.5;c.beginPath();c.ellipse(p.x,p.y,r*.68,r*.5,0,0,TAU);c.fill();}
    else if(e.type==='particle'){e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;e.vz-=380*dt;if(e.z<0){e.z=0;e.vz=0;e.vx*=.8;e.vy*=.8;}const p=this.project(e.x,e.y,e.z);c.fillStyle=e.color;c.fillRect(p.x,p.y,e.size*this.zoom,e.size*this.zoom);}
    else if(e.type==='pickup'){const p=this.project(e.x,e.y,22+(1-t)*30);this.text(e.kind==='health'?'+25 HP':e.kind==='ammo'?'+AMMO':'+35',p.x,p.y,11,'#456044');}
    else if(e.type==='spark'){const p=this.project(e.x,e.y,20);c.fillStyle='#f3bd67';c.fillRect(p.x-6,p.y-6,12,12);}
    c.globalAlpha=1;
  }this.effects=this.effects.filter(e=>e.life>0);
  if(!menu)this.radar(game);
  this.hurt=Math.max(0,this.hurt-dt);if(this.hurt>0&&!this.settings.reducedMotion){c.strokeStyle=`rgba(167,51,31,${this.hurt})`;c.lineWidth=18;c.strokeRect(0,0,this.w,this.h);}
 }
}
