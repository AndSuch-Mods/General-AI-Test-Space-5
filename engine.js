import {WORLD,WEAPONS,GUN,UPGRADES,SKINS,DIFFICULTIES,ENEMIES,MAP,clamp,distance,ammoMax,upgradeCost} from './data.js';

export function circleRect(x,y,r,b){const dx=x-clamp(x,b.x,b.x+b.w),dy=y-clamp(y,b.y,b.y+b.h);return dx*dx+dy*dy<r*r;}
export function rayBox(x,y,dx,dy,b,max){
  let lo=0,hi=max;
  for(const [p,d,a,z] of [[x,dx,b.x,b.x+b.w],[y,dy,b.y,b.y+b.h]]){
    if(Math.abs(d)<1e-8){if(p<a||p>z)return Infinity;}else{let t=(a-p)/d,u=(z-p)/d;if(t>u)[t,u]=[u,t];lo=Math.max(lo,t);hi=Math.min(hi,u);if(lo>hi)return Infinity;}
  }return lo;
}
function rayCircle(x,y,dx,dy,e){const vx=e.x-x,vy=e.y-y,t=vx*dx+vy*dy,h2=vx*vx+vy*vy-t*t;if(h2>e.r*e.r)return Infinity;const h=Math.sqrt(Math.max(0,e.r*e.r-h2));return t+h<0?Infinity:Math.max(0,t-h);}
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function validState(s){
  if(!s||s.version!==1||!MAP[s.map]||!DIFFICULTIES[s.difficulty]||!['classic','survival'].includes(s.mode)||!['wave','shop'].includes(s.phase)||typeof s.runId!=='string'||s.runId.length>100)return false;
  if(!SKINS.some(k=>k.id===s.skin)||!finite(s.seed)||!s.player||!finite(s.player.x)||!finite(s.player.y)||!finite(s.player.hp)||s.player.hp<=0||s.player.hp>1000||!finite(s.player.angle)||!finite(s.player.cool)||!finite(s.player.hurt))return false;
  if(s.player.x<0||s.player.x>WORLD.w||s.player.y<0||s.player.y>WORLD.h||!Number.isInteger(s.wave)||s.wave<1||s.wave>100000||!finite(s.cash)||s.cash<0||!finite(s.score)||!finite(s.kills)||!finite(s.combo)||!finite(s.bestCombo)||!finite(s.comboGrace)||!finite(s.time)||!finite(s.spawnLeft)||s.spawnLeft<0||s.spawnLeft>500||!finite(s.spawnTimer)||!finite(s.total)||!finite(s.nextId)||!finite(s.classicAwards))return false;
  if(!s.up||!UPGRADES.every(u=>Number.isInteger(s.up[u.id])&&s.up[u.id]>=0&&s.up[u.id]<=u.max)||!Array.isArray(s.owned)||!s.owned.includes('pistol')||s.owned.length>10||!s.owned.every(id=>GUN[id])||!s.owned.includes(s.selected)||!s.ammo||!s.owned.every(id=>finite(s.ammo[id])&&s.ammo[id]>=-1)||!s.options||typeof s.options.devils!=='boolean'||typeof s.options.selfDamage!=='boolean')return false;
  for(const [key,cap] of [['enemies',150],['objects',80],['projectiles',200],['pickups',200]])if(!Array.isArray(s[key])||s[key].length>cap||!s[key].every(e=>e&&finite(e.x)&&finite(e.y)))return false;
  if(!s.enemies.every(e=>ENEMIES[e.type]&&['hp','maxHp','r','speed','attack','stun','id','angle'].every(k=>finite(e[k]))))return false;
  if(!s.objects.every(e=>['barrel','wall','mine','charge'].includes(e.type)&&['hp','arm','id','damage','radius'].every(k=>finite(e[k]))))return false;
  if(!s.projectiles.every(e=>['rocket','grenade','fireball'].includes(e.kind)&&['vx','vy','life','damage','radius','age'].every(k=>finite(e[k]))))return false;
  if(!s.pickups.every(e=>['health','ammo','cash'].includes(e.kind)&&finite(e.life)&&finite(e.id)))return false;
  return true;
}

export class Game {
  constructor(options={},saved=null){
    this.events=[];this.flowTime=0;this.flow=null;this.blastQueue=[];this.exploding=false;
    if(saved){if(!validState(saved))throw new Error('The saved run is invalid or belongs to another version.');this.s=JSON.parse(JSON.stringify(saved));}
    else{
      const up=Object.fromEntries(UPGRADES.map(u=>[u.id,0]));
      this.s={version:1,runId:options.runId||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,seed:(options.seed||((Math.random()*0xffffffff)>>>0)||1)>>>0,map:MAP[options.map]?options.map:'outpost',difficulty:DIFFICULTIES[options.difficulty]?options.difficulty:'normal',mode:options.mode==='classic'?'classic':'survival',skin:SKINS.some(k=>k.id===options.skin)?options.skin:'ranger',options:{devils:options.devils!==false,selfDamage:options.selfDamage===true},phase:'wave',wave:1,time:0,cash:0,score:0,kills:0,combo:0,bestCombo:0,comboGrace:0,classicAwards:0,nextId:1,up,owned:['pistol'],selected:'pistol',ammo:{pistol:-1},player:{x:720,y:520,hp:100,angle:-Math.PI/2,cool:0,hurt:0,walk:0},enemies:[],objects:[],projectiles:[],pickups:[],spawnLeft:0,spawnTimer:0,total:0};
    }
    this.walls=MAP[this.s.map].walls;
    this.buildGrid();
    if(!saved){const spot=this.findFree(720,520,22);this.s.player.x=spot.x;this.s.player.y=spot.y;this.scatterBarrels(8);this.startWave();}
    this.buildFlow();
  }
  rng(){let x=this.s.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.s.seed=x>>>0;return this.s.seed/4294967296;}
  emit(type,data={}){if(this.events.length<512)this.events.push({type,...data});}
  drainEvents(){const a=this.events;this.events=[];return a;}
  snapshot(){return JSON.parse(JSON.stringify(this.s));}
  get maxHp(){return 100+this.s.up.health*20;}
  get damageScale(){return 1+this.s.up.damage*.15;}
  get radiusScale(){return 1+this.s.up.blast*.08;}
  get difficulty(){return DIFFICULTIES[this.s.difficulty];}
  get remaining(){return this.s.spawnLeft+this.s.enemies.filter(e=>e.hp>0).length;}
  buildGrid(){
    const {w,h,cell}=WORLD;this.cols=w/cell;this.rows=h/cell;this.blocked=new Uint8Array(this.cols*this.rows);
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++)if(this.walls.some(b=>circleRect(x*cell+cell/2,y*cell+cell/2,16,b)))this.blocked[y*this.cols+x]=1;
  }
  findFree(x,y,r=16){
    if(!this.walls.some(b=>circleRect(x,y,r,b)))return{x,y};
    let best=null,d=Infinity;for(let j=1;j<this.rows-1;j++)for(let i=1;i<this.cols-1;i++){const q={x:i*40+20,y:j*40+20};if(!this.walls.some(b=>circleRect(q.x,q.y,r,b))){const z=distance(q,{x,y});if(z<d){best=q;d=z;}}}return best||{x:60,y:60};
  }
  cellIndex(x,y){return clamp(Math.floor(y/40),0,this.rows-1)*this.cols+clamp(Math.floor(x/40),0,this.cols-1);}
  buildFlow(){
    const p=this.s.player;let start=this.cellIndex(p.x,p.y);
    if(this.blocked[start]){let best=Infinity;for(let i=0;i<this.blocked.length;i++)if(!this.blocked[i]){const d=Math.hypot(i%this.cols*40+20-p.x,Math.floor(i/this.cols)*40+20-p.y);if(d<best){best=d;start=i;}}}
    this.flow=new Int16Array(this.blocked.length).fill(-1);const q=new Int16Array(this.blocked.length);let head=0,tail=1;q[0]=start;this.flow[start]=0;
    while(head<tail){const i=q[head++],x=i%this.cols,y=Math.floor(i/this.cols);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=this.cols||ny>=this.rows)continue;const n=ny*this.cols+nx;if(this.flow[n]<0&&!this.blocked[n]){this.flow[n]=this.flow[i]+1;q[tail++]=n;}}}
  }
  solidObjects(){return this.s.objects.filter(o=>o.hp>0&&(o.type==='wall'||o.type==='barrel')).map(o=>({x:o.x-18,y:o.y-18,w:36,h:36,object:o}));}
  lineLimit(x,y,dx,dy,max,objects=true){let end=max;for(const b of this.walls)end=Math.min(end,rayBox(x,y,dx,dy,b,end));if(objects)for(const b of this.solidObjects())end=Math.min(end,rayBox(x,y,dx,dy,b,end));return end;}
  clearLine(a,b,objects=false){const d=distance(a,b);return d<1||this.lineLimit(a.x,a.y,(b.x-a.x)/d,(b.y-a.y)/d,d,objects)>=d-2;}
  move(e,dx,dy,r,solids){
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/9));let hit=null;
    for(let k=0;k<steps;k++){
      let nx=clamp(e.x+dx/steps,r+8,WORLD.w-r-8);let b=solids.find(b=>circleRect(nx,e.y,r,b));if(!b)e.x=nx;else hit=b;
      let ny=clamp(e.y+dy/steps,r+8,WORLD.h-r-8);b=solids.find(b=>circleRect(e.x,ny,r,b));if(!b)e.y=ny;else hit=b;
    }return hit;
  }
  scatterBarrels(n){
    for(let k=0;k<n;k++)for(let t=0;t<30;t++){const x=100+this.rng()*(WORLD.w-200),y=100+this.rng()*(WORLD.h-200);if(distance({x,y},this.s.player)>200&&!this.walls.some(b=>circleRect(x,y,35,b))&&!this.s.objects.some(o=>distance(o,{x,y})<85)){this.s.objects.push({id:this.s.nextId++,type:'barrel',x,y,hp:26,arm:0,damage:160,radius:135});break;}}
  }
  startWave(){
    const s=this.s;s.phase='wave';s.total=Math.min(240,Math.round((9+s.wave*7)*this.difficulty.count));s.spawnLeft=s.total;s.spawnTimer=.8;this.emit('wave',{wave:s.wave});
  }
  nextWave(){if(this.s.phase!=='shop')return false;this.s.wave++;if(this.s.objects.length<25)this.scatterBarrels(2);this.startWave();return true;}
  spawn(){
    const s=this.s,w=s.wave;let type='zombie';const roll=this.rng();
    if(s.options.devils&&w%5===0&&s.spawnLeft===s.total)type='overlord';
    else if(s.options.devils&&w>=3&&roll<Math.min(.18,.045+w*.006))type='devil';
    else if(w>=7&&roll>.89)type='brute';
    else if(w>=2&&roll>.68)type='runner';
    const base=ENEMIES[type],p=s.player;let spot={x:60,y:60};
    for(let i=0;i<32;i++){const side=Math.floor(this.rng()*4),j=(this.rng()-.5)*240;const q=side===0?{x:720+j,y:55}:side===1?{x:WORLD.w-55,y:520+j}:side===2?{x:720+j,y:WORLD.h-55}:{x:55,y:520+j};if(distance(q,p)>240&&this.flow[this.cellIndex(q.x,q.y)]>=0){spot=q;break;}}
    spot=this.findFree(spot.x,spot.y,base.r);const hp=base.hp*(1+(w-1)*.07)*this.difficulty.health;
    s.enemies.push({id:s.nextId++,type,...spot,hp,maxHp:hp,r:base.r,speed:base.speed*Math.min(1.55,1+(w-1)*.012)*this.difficulty.speed,angle:0,attack:1+this.rng(),stun:0,walk:this.rng()*10});s.spawnLeft--;
    if(type==='overlord')this.emit('toast',{text:'OVERLORD INBOUND',tone:'danger'});
  }
  target(){let best=null,d=Infinity;const p=this.s.player,max=GUN[this.s.selected].range||600;for(const e of this.s.enemies){if(e.hp<=0)continue;const z=distance(p,e);if(z<d&&z<max&&this.clearLine(p,e)){best=e;d=z;}}return best;}
  select(id){if(!this.s.owned.includes(id))return false;this.s.selected=id;return true;}
  cycle(step=1){const ids=WEAPONS.filter(w=>this.s.owned.includes(w.id)).map(w=>w.id),i=ids.indexOf(this.s.selected);return this.select(ids[(i+step+ids.length)%ids.length]);}
  grant(id){const s=this.s,w=GUN[id];if(!w||s.owned.includes(id))return false;s.owned.push(id);s.ammo[id]=ammoMax(w,s.up);this.emit('unlock',{id,name:w.name});return true;}
  buyWeapon(id){const s=this.s,w=GUN[id];if(s.phase!=='shop'||s.mode!=='survival'||!w||s.owned.includes(id)||s.cash<w.cost)return false;s.cash-=w.cost;this.grant(id);s.selected=id;return true;}
  upgrade(id,free=false){
    const s=this.s,u=UPGRADES.find(u=>u.id===id);if(!u||s.up[id]>=u.max||(!free&&(s.phase!=='shop'||s.mode!=='survival')))return false;
    const cost=upgradeCost(id,s.up[id]);if(!free&&s.cash<cost)return false;if(!free)s.cash-=cost;s.up[id]++;
    if(id==='health')s.player.hp=Math.min(this.maxHp,s.player.hp+20);
    if(id==='capacity')for(const w of WEAPONS)if(s.owned.includes(w.id)&&w.ammo>0)s.ammo[w.id]=Math.min(ammoMax(w,s.up),s.ammo[w.id]+Math.ceil(w.ammo*.25));
    this.emit('upgrade',{id,name:u.name,level:s.up[id]});return true;
  }
  supply(kind){
    const s=this.s;if(s.phase!=='shop'||s.mode!=='survival')return false;
    if(kind==='heal'){if(s.cash<100||s.player.hp>=this.maxHp)return false;s.cash-=100;s.player.hp=Math.min(this.maxHp,s.player.hp+60);}
    else if(kind==='ammo'){if(s.cash<130||!s.owned.some(id=>GUN[id].ammo>0&&s.ammo[id]<ammoMax(GUN[id],s.up)))return false;s.cash-=130;for(const id of s.owned)s.ammo[id]=ammoMax(GUN[id],s.up);}
    else return false;this.emit('supply');return true;
  }
  shoot(forceId=null){
    const s=this.s,p=s.player,w=GUN[forceId||s.selected];if(s.phase!=='wave'||p.cool>0||!s.owned.includes(w.id))return false;
    if(s.ammo[w.id]===0){if(!forceId){s.selected='pistol';this.emit('toast',{text:'Out of ammunition. Pistol equipped.'});}return false;}
    const a=p.angle,dx=Math.cos(a),dy=Math.sin(a),power=w.damage*this.damageScale;
    if(['wall','barrel','mine','charge'].includes(w.kind)){
      if(s.objects.length>=70){this.emit('toast',{text:'Field limit: 70 deployed objects.'});p.cool=.5;return false;}
      const x=clamp(p.x+dx*56,35,WORLD.w-35),y=clamp(p.y+dy*56,35,WORLD.h-35);
      if(this.walls.some(b=>circleRect(x,y,23,b))||s.objects.some(o=>o.hp>0&&distance(o,{x,y})<42)||s.enemies.some(e=>e.hp>0&&distance(e,{x,y})<e.r+20)){p.cool=.18;this.emit('blocked');return false;}
      s.objects.push({id:s.nextId++,type:w.kind,x,y,hp:w.kind==='wall'?250+40*s.up.health:30,arm:.8,damage:power,radius:(w.radius||0)*this.radiusScale});this.emit('place',{x,y});
    }else if(w.kind==='rocket'||w.kind==='grenade'){
      s.projectiles.push({kind:w.kind,x:p.x+dx*24,y:p.y+dy*24,vx:dx*(w.kind==='rocket'?460:285),vy:dy*(w.kind==='rocket'?460:285),life:w.kind==='rocket'?1.8:.86,age:0,damage:power,radius:w.radius*this.radiusScale});
    }else{
      for(let i=0;i<w.pellets;i++){
        const angle=a+(this.rng()-.5)*w.spread,ux=Math.cos(angle),uy=Math.sin(angle);let end=w.range,wall=null;
        for(const b of [...this.walls,...this.solidObjects()]){const t=rayBox(p.x,p.y,ux,uy,b,end);if(t<end){end=t;wall=b;}}
        const hits=s.enemies.filter(e=>e.hp>0).map(e=>({e,t:rayCircle(p.x,p.y,ux,uy,e)})).filter(h=>h.t<=end).sort((a,b)=>a.t-b.t);
        if(w.kind==='rail'){for(const h of hits)this.hit(h.e,power,ux,uy);}
        else if(hits.length){end=hits[0].t;wall=null;this.hit(hits[0].e,power,ux,uy);}
        if(wall?.object){const o=wall.object;o.hp-=power;if(o.hp<=0&&o.type==='barrel')this.explode(o.x,o.y,o.damage,o.radius);}
        this.emit('tracer',{x:p.x+ux*20,y:p.y+uy*20,tx:p.x+ux*end,ty:p.y+uy*end,rail:w.kind==='rail'});
      }
    }
    if(w.ammo>=0)s.ammo[w.id]--;p.cool=w.delay/(1+s.up.rate*.09);this.emit('shot',{id:w.id,x:p.x+dx*28,y:p.y+dy*28,angle:a});return true;
  }
  hit(e,amount,dx=0,dy=0){
    if(e.hp<=0)return;e.hp-=amount;e.stun=Math.max(e.stun,['devil','overlord'].includes(e.type)?.55:.08);e.flash=.1;
    if(e.hp<=0)this.kill(e);else if(e.type!=='overlord')this.move(e,dx*3,dy*3,e.r,[...this.walls,...this.solidObjects()]);
  }
  kill(e){
    const s=this.s,b=ENEMIES[e.type];e.hp=0;s.kills++;s.combo=Math.min(999,Math.floor(s.combo)+1);s.bestCombo=Math.max(s.bestCombo,s.combo);s.comboGrace=2.6;s.score+=b.score*Math.max(1,s.combo);s.cash+=b.value;this.emit('kill',{x:e.x,y:e.y,type:e.type,combo:s.combo});
    const r=this.rng();let kind=null;if(r<.09)kind='health';else if(r<.3)kind='ammo';else if(r<.4)kind='cash';
    if(kind&&s.pickups.length<150)s.pickups.push({id:s.nextId++,x:e.x,y:e.y,kind,life:35});
    if(e.type==='overlord'){s.pickups.push({id:s.nextId++,x:e.x+25,y:e.y,kind:'health',life:50},{id:s.nextId++,x:e.x-25,y:e.y,kind:'ammo',life:50});this.emit('toast',{text:'OVERLORD DOWN. +350 credits.'});}
    if(s.mode==='classic'){
      for(const w of WEAPONS)if(s.bestCombo>=w.combo)this.grant(w.id);
      const awards=Math.floor(s.bestCombo/10);while(s.classicAwards<awards){s.classicAwards++;const available=UPGRADES.filter(u=>s.up[u.id]<u.max);if(available.length)this.upgrade(available[(s.classicAwards-1)%available.length].id,true);}
    }
  }
  hurt(amount){
    const s=this.s,p=s.player;if(s.phase!=='wave'||p.hurt>0)return;p.hp=Math.max(0,p.hp-amount*(1-s.up.armor*.07));p.hurt=.55;this.emit('hurt',{amount});
    if(p.hp<=0){s.phase='dead';this.emit('death',{wave:s.wave,score:s.score,kills:s.kills,time:s.time,bestCombo:s.bestCombo});}
  }
  explode(x,y,power,radius,enemy=false){
    this.blastQueue.push({x,y,power,radius,enemy});if(this.exploding)return;this.exploding=true;
    while(this.blastQueue.length){const b=this.blastQueue.shift();this.emit('explosion',{x:b.x,y:b.y,radius:b.radius});
      for(const e of this.s.enemies){const d=distance(e,b);if(e.hp>0&&d<b.radius+e.r&&this.clearLine(b,e))this.hit(e,b.power*Math.max(.3,1-d/b.radius));}
      const p=this.s.player,d=distance(p,b);if(d<b.radius&&this.clearLine(b,p)&&(b.enemy||this.s.options.selfDamage))this.hurt(b.power*(b.enemy?1:.3)*Math.max(.2,1-d/b.radius));
      for(const o of this.s.objects){if(o.hp<=0||distance(o,b)>b.radius+16||!this.clearLine(b,o))continue;if(o.type==='wall')o.hp-=b.power;else{o.hp=0;this.blastQueue.push({x:o.x,y:o.y,power:o.damage,radius:o.radius,enemy:false});}}
    }this.exploding=false;
  }
  detonate(){if(this.s.phase!=='wave')return;for(const o of [...this.s.objects])if(o.type==='charge'&&o.hp>0){o.hp=0;this.explode(o.x,o.y,o.damage,o.radius);}}
  collect(q){
    const s=this.s;if(q.kind==='health')s.player.hp=Math.min(this.maxHp,s.player.hp+25);if(q.kind==='cash')s.cash+=35;
    if(q.kind==='ammo')for(const id of s.owned){const w=GUN[id];if(w.ammo>0)s.ammo[id]=Math.min(ammoMax(w,s.up),s.ammo[id]+Math.max(2,Math.ceil(ammoMax(w,s.up)*.17)));}
    q.life=0;this.emit('pickup',{kind:q.kind,x:q.x,y:q.y});
  }
  update(dt,input={}){
    const s=this.s;if(s.phase!=='wave')return;dt=clamp(dt,0,.05);s.time+=dt;const p=s.player;
    p.cool=Math.max(0,p.cool-dt);p.hurt=Math.max(0,p.hurt-dt);s.comboGrace-=dt;if(s.comboGrace<0)s.combo=Math.max(0,s.combo-dt*(1+s.combo*.11));
    this.flowTime-=dt;if(this.flowTime<=0){this.buildFlow();this.flowTime=.28;}
    const solids=[...this.walls,...this.solidObjects()];let mx=input.mx||0,my=input.my||0;const mag=Math.hypot(mx,my);if(mag>1){mx/=mag;my/=mag;}
    const speed=170*(1+s.up.speed*.06);this.move(p,mx*speed*dt,my*speed*dt,14,solids);p.walk=(p.walk||0)+Math.hypot(mx,my)*dt*11;
    const ax=input.ax||0,ay=input.ay||0;let fire=!!input.fire;
    if(Math.hypot(ax,ay)>.15)p.angle=Math.atan2(ay,ax);
    else if(input.auto&&!['barrel','wall','mine','charge'].includes(GUN[s.selected].kind)){const target=this.target();if(target){p.angle=Math.atan2(target.y-p.y,target.x-p.x);fire=true;}else if(mag>.1)p.angle=Math.atan2(my,mx);}
    else if(mag>.1)p.angle=Math.atan2(my,mx);
    if(fire)this.shoot();
    s.spawnTimer-=dt;if(s.spawnLeft>0&&s.spawnTimer<=0&&s.enemies.length<130){this.spawn();s.spawnTimer=Math.max(.14,.77-s.wave*.023);}
    const buckets=new Map(),bs=65;for(const e of s.enemies){const key=`${Math.floor(e.x/bs)},${Math.floor(e.y/bs)}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(e);}
    for(const e of s.enemies){
      if(e.hp<=0)continue;e.attack-=dt;e.stun=Math.max(0,e.stun-dt);e.flash=Math.max(0,(e.flash||0)-dt);const d=distance(e,p);e.angle=Math.atan2(p.y-e.y,p.x-e.x);
      if(['devil','overlord'].includes(e.type)&&e.stun<=0&&e.attack<=0&&d<570&&this.clearLine(e,p)){
        const spread=e.type==='overlord'?[-.18,0,.18]:[0];for(const da of spread){const a=e.angle+da;s.projectiles.push({kind:'fireball',x:e.x+Math.cos(a)*(e.r+10),y:e.y+Math.sin(a)*(e.r+10),vx:Math.cos(a)*210,vy:Math.sin(a)*210,life:3,age:0,damage:ENEMIES[e.type].damage*this.difficulty.damage,radius:32});}
        e.attack=e.type==='overlord'?1.8:2.3;this.emit('fireball',{x:e.x,y:e.y});
      }
      let dx=p.x-e.x,dy=p.y-e.y;
      if(!this.clearLine(e,p)){
        const cx=clamp(Math.floor(e.x/40),0,this.cols-1),cy=clamp(Math.floor(e.y/40),0,this.rows-1);let best=Infinity,q=null;
        for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){if(!ox&&!oy)continue;const nx=cx+ox,ny=cy+oy;if(nx<0||ny<0||nx>=this.cols||ny>=this.rows)continue;const ni=ny*this.cols+nx;if(this.flow[ni]<0||this.blocked[cy*this.cols+nx]||this.blocked[ny*this.cols+cx])continue;const point={x:nx*40+20,y:ny*40+20};const cost=this.flow[ni]*40+distance(point,e)*.5;if(cost<best){best=cost;q=point;}}
        if(q){dx=q.x-e.x;dy=q.y-e.y;}else{dx=0;dy=0;}
      }
      let len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
      if(['devil','overlord'].includes(e.type)&&d<310&&d>150&&this.clearLine(e,p)){dx*=.15;dy*=.15;}
      const cx=Math.floor(e.x/bs),cy=Math.floor(e.y/bs);let sx=0,sy=0;
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)for(const other of buckets.get(`${cx+ox},${cy+oy}`)||[]){if(other===e||other.hp<=0)continue;let xx=e.x-other.x,yy=e.y-other.y,dd=Math.hypot(xx,yy);const rr=e.r+other.r+3;if(dd<rr){if(dd<.01){xx=(e.id%2?1:-1)*.1;yy=.1;dd=.14;}const f=(rr-dd)/rr;sx+=xx/dd*f;sy+=yy/dd*f;}}
      const slow=e.stun>0?.3:1;const hit=this.move(e,(dx*e.speed*slow+sx*60)*dt,(dy*e.speed*slow+sy*60)*dt,e.r,solids);e.walk=(e.walk||0)+dt*e.speed*.13;
      if(hit?.object&&e.attack<=0){const o=hit.object;o.hp-=ENEMIES[e.type].damage*2;e.attack=.7;if(o.hp<=0&&o.type==='barrel')this.explode(o.x,o.y,o.damage,o.radius);}
      if(distance(e,p)<e.r+16)this.hurt(ENEMIES[e.type].damage*this.difficulty.damage);
    }
    for(const q of s.projectiles){
      if(q.life<=0)continue;q.age+=dt;q.life-=dt;const nx=q.x+q.vx*dt,ny=q.y+q.vy*dt;
      const hitWall=solids.find(b=>circleRect(nx,ny,5,b));
      if(q.kind==='grenade'){if(hitWall){q.vx*=-.35;q.vy*=-.35;}else{q.x=nx;q.y=ny;}q.vx*=Math.pow(.55,dt);q.vy*=Math.pow(.55,dt);if(q.life<=0)this.explode(q.x,q.y,q.damage,q.radius);}
      else{
        q.x=nx;q.y=ny;const enemy=q.kind==='rocket'&&s.enemies.some(e=>e.hp>0&&distance(e,q)<e.r+7);const player=q.kind==='fireball'&&distance(q,p)<19;
        if(hitWall||enemy||player||q.life<=0||q.x<0||q.x>WORLD.w||q.y<0||q.y>WORLD.h){q.life=0;if(q.kind==='rocket')this.explode(q.x,q.y,q.damage,q.radius);else{this.emit('spark',{x:q.x,y:q.y});if(player)this.hurt(q.damage);if(hitWall?.object){const o=hitWall.object;o.hp-=q.damage;if(o.hp<=0&&o.type==='barrel')this.explode(o.x,o.y,o.damage,o.radius);}}}
      }
    }
    for(const o of s.objects){o.arm=Math.max(0,o.arm-dt);if(o.hp>0&&o.type==='mine'&&o.arm<=0&&s.enemies.some(e=>e.hp>0&&distance(e,o)<e.r+28)){o.hp=0;this.explode(o.x,o.y,o.damage,o.radius);}}
    for(const q of s.pickups){q.life-=dt;const d=distance(q,p),reach=52+s.up.magnet*20;if(d<reach&&d>17){q.x+=(p.x-q.x)/d*250*dt;q.y+=(p.y-q.y)/d*250*dt;}if(d<20&&q.life>0)this.collect(q);}
    s.enemies=s.enemies.filter(e=>e.hp>0);s.objects=s.objects.filter(o=>o.hp>0);s.projectiles=s.projectiles.filter(q=>q.life>0).slice(-180);s.pickups=s.pickups.filter(q=>q.life>0);
    if(s.phase==='wave'&&s.spawnLeft===0&&s.enemies.length===0){
      for(const q of s.pickups)this.collect(q);s.pickups=[];s.projectiles=[];s.cash+=50+s.wave*25;p.hp=Math.min(this.maxHp,p.hp+12);s.phase='shop';this.emit('clear',{wave:s.wave,bonus:50+s.wave*25});
    }
  }
}
