import { WORLD, MAPS, DIFFICULTIES, GUN, WEAPONS, UPGRADES, SUPPLIES, ENEMIES, UPGRADE_PRICE, clamp, distance, segmentCircle, segmentRect, circleRect } from './data.js';

// Simulation has no DOM dependency. All gameplay randomness lives in the saved state.
export class Game {
  constructor(state) {
    this.s=state;
    this.map=MAPS.find(m=>m.id===state.map);
    this.difficulty=DIFFICULTIES[state.difficulty];
    this.events=[];
    this.flowTime=0;
    this.flow=new Int16Array(36*25);
    this.blocked=new Uint8Array(36*25);
    for(let y=0;y<25;y++) for(let x=0;x<36;x++) {
      const px=x*40+20,py=y*40+20;
      this.blocked[y*36+x]=this.map.walls.some(w=>circleRect(px,py,22,w))?1:0;
    }
    this.hash=new Map();
  }
  static create(map='yard',difficulty='normal',seed=Date.now()) {
    const m=MAPS.find(v=>v.id===map)||MAPS[0];
    const d=DIFFICULTIES[difficulty]||DIFFICULTIES.normal;
    const state={schema:1,id:`${Date.now().toString(36)}-${(seed>>>0).toString(36)}`,map:m.id,difficulty:DIFFICULTIES[difficulty]?difficulty:'normal',rng:(seed>>>0)||1234567,phase:'active',wave:0,elapsed:0,score:0,kills:0,cash:0,combo:0,bestCombo:0,comboTime:0,rewards:[],nextId:1,countdown:0,remaining:0,spawnTimer:0,bossPending:false,grenades:3,inventory:{barrel:2,mine:2,wall:3,turret:0},upgrades:{power:0,cycle:0,vitality:0,armor:0,boots:0,magnet:0},owned:['pistol'],ammo:{pistol:-1},weapon:'pistol',build:'barrel',player:{x:m.spawn[0],y:m.spawn[1],r:15,hp:d.hp,maxHp:d.hp,angle:-Math.PI/2,fire:0,hurt:0,dash:0,dashTime:0,dashX:0,dashY:0,grenadeCd:0,placeCd:0,walk:0},enemies:[],bullets:[],projectiles:[],defenses:[],pickups:[],marks:[]};
    const game=new Game(state); game.nextWave(); return game;
  }
  random() { let x=this.s.rng|0; x^=x<<13; x^=x>>>17; x^=x<<5; this.s.rng=x>>>0; return (x>>>0)/4294967296; }
  emit(type,props={}) { if(this.events.length<300) this.events.push({type,...props}); }
  drain() { const e=this.events; this.events=[]; return e; }
  snapshot() { return JSON.parse(JSON.stringify(this.s)); }
  nextWave() {
    const s=this.s;if(s.phase==='dead')return;
    s.wave++; s.phase='active'; s.countdown=2.1; s.spawnTimer=.2;
    s.remaining=Math.min(500,Math.round((10+s.wave*4+Math.pow(s.wave,1.2))*this.difficulty.count));
    s.bossPending=s.wave%5===0; s.comboTime=0; s.combo=0;
    s.player.hurt=1; this.flowTime=0;
    this.emit('wave',{wave:s.wave,boss:s.bossPending});
  }
  wallHit(ax,ay,bx,by,pad=0) {
    let t=Infinity; for(const w of this.map.walls)t=Math.min(t,segmentRect(ax,ay,bx,by,w,pad)); return t;
  }
  sight(a,b) { return this.wallHit(a.x,a.y,b.x,b.y,2)===Infinity; }
  move(o,dx,dy,includeDefenses=true) {
    const blocked=(x,y)=>this.map.walls.some(w=>circleRect(x,y,o.r,w)) || (includeDefenses&&this.s.defenses.some(d=>d.hp>0&&d.kind!=='mine'&&Math.hypot(x-d.x,y-d.y)<o.r+d.r));
    let x=clamp(o.x+dx,o.r+8,WORLD.w-o.r-8); if(!blocked(x,o.y))o.x=x;
    let y=clamp(o.y+dy,o.r+8,WORLD.h-o.r-8); if(!blocked(o.x,y))o.y=y;
  }
  updateFlow() {
    this.flow.fill(-1); const p=this.s.player;
    let ix=clamp(Math.floor(p.x/40),0,35),iy=clamp(Math.floor(p.y/40),0,24),start=iy*36+ix;
    if(this.blocked[start]) {
      let best=Infinity;
      for(let y=Math.max(0,iy-2);y<=Math.min(24,iy+2);y++)for(let x=Math.max(0,ix-2);x<=Math.min(35,ix+2);x++)if(!this.blocked[y*36+x]) {
        const dd=(x*40+20-p.x)**2+(y*40+20-p.y)**2;if(dd<best){best=dd;start=y*36+x;}
      }
    }
    const queue=new Int16Array(900);let head=0,tail=1;queue[0]=start;this.flow[start]=0;
    while(head<tail) {
      const i=queue[head++],x=i%36,y=(i/36)|0;
      for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
        if(nx<0||nx>=36||ny<0||ny>=25)continue;const j=ny*36+nx;
        if(this.blocked[j]||this.flow[j]>=0)continue;this.flow[j]=this.flow[i]+1;queue[tail++]=j;
      }
    }
  }
  rebuildHash() {
    this.hash.clear();for(const e of this.s.enemies)if(e.hp>0){const key=((e.x/80)|0)+','+((e.y/80)|0);if(!this.hash.has(key))this.hash.set(key,[]);this.hash.get(key).push(e);}
  }
  neighbors(x,y) {
    const a=[],cx=(x/80)|0,cy=(y/80)|0;
    for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const b=this.hash.get((cx+i)+','+(cy+j));if(b)a.push(...b);}return a;
  }
  spawn(kind) {
    const s=this.s,w=s.wave;
    if(!kind) {
      const r=this.random();
      kind=w>=7&&r<.12?'bomber':w>=4&&r<.23?'cinder':w>=3&&r<.38?'brute':w>=2&&r<.59?'runner':'walker';
    }
    const spec=ENEMIES[kind];let x=24,y=24;
    for(let i=0;i<12;i++) {
      const side=(this.random()*4)|0;
      if(side===0){x=35;y=35+this.random()*(WORLD.h-70);}if(side===1){x=WORLD.w-35;y=35+this.random()*(WORLD.h-70);}
      if(side===2){x=35+this.random()*(WORLD.w-70);y=35;}if(side===3){x=35+this.random()*(WORLD.w-70);y=WORLD.h-35;}
      if(distance({x,y},s.player)>330)break;
    }
    const hp=Math.round(spec.hp*(1+(w-1)*(kind==='boss'?.13:.075)));
    s.enemies.push({id:s.nextId++,kind,x,y,r:spec.radius,hp,maxHp:hp,angle:0,attack:.5+this.random(),shoot:2+this.random(),telegraph:0,fire:0,flash:0,walk:0,fuse:-1});
  }
  target(from,range=700) {
    let best=null,dd=range;
    for(const e of this.s.enemies)if(e.hp>0){const d=distance(from,e);if(d<dd&&this.sight(from,e)){best=e;dd=d;}}return best;
  }
  equip(id) { if(this.s.owned.includes(id)){this.s.weapon=id;this.s.player.fire=Math.max(this.s.player.fire,.08);this.emit('equip');return true;}return false; }
  cycle(dir=1) { const s=this.s,i=s.owned.indexOf(s.weapon);this.equip(s.owned[(i+dir+s.owned.length)%s.owned.length]); }
  dash(mx,my) {
    const p=this.s.player;if(this.s.phase!=='active'||this.s.countdown>0||p.dash>0)return false;
    let n=Math.hypot(mx,my);if(n<.1){mx=Math.cos(p.angle);my=Math.sin(p.angle);n=1;}
    p.dashX=mx/n;p.dashY=my/n;p.dashTime=.19;p.dash=3.5-this.s.upgrades.boots*.22;p.hurt=Math.max(p.hurt,.26);this.emit('dash',{x:p.x,y:p.y});return true;
  }
  grenade() {
    const s=this.s,p=s.player;if(s.phase!=='active'||s.countdown>0||s.grenades<=0||p.grenadeCd>0)return false;
    s.grenades--;p.grenadeCd=.6;
    s.projectiles.push({id:s.nextId++,kind:'grenade',x:p.x,y:p.y,vx:Math.cos(p.angle)*390,vy:Math.sin(p.angle)*390,life:.72,maxLife:.72,damage:180*(1+s.upgrades.power*.15),r:5,owner:'player'});
    this.emit('throw');return true;
  }
  place() {
    const s=this.s,p=s.player,k=s.build;
    if(s.phase!=='active'||s.countdown>0||p.placeCd>0||s.inventory[k]<=0)return false;
    if(s.defenses.length>=32){this.emit('notice',{text:'Defense limit reached (32).'});return false;}
    const r=k==='wall'?25:k==='turret'?21:17,x=p.x+Math.cos(p.angle)*70,y=p.y+Math.sin(p.angle)*70;
    if(x<40||x>WORLD.w-40||y<40||y>WORLD.h-40||this.map.walls.some(w=>circleRect(x,y,r+5,w))||s.defenses.some(d=>distance(d,{x,y})<d.r+r+8)||s.enemies.some(e=>e.hp>0&&distance(e,{x,y})<e.r+r)) {
      this.emit('notice',{text:'No room here. Face an open patch.'});return false;
    }
    s.inventory[k]--;p.placeCd=.35;
    s.defenses.push({id:s.nextId++,kind:k,x,y,r,hp:k==='wall'?400:k==='turret'?240:45,maxHp:k==='wall'?400:k==='turret'?240:45,armed:.7,fire:0,ammo:450,angle:p.angle});
    this.emit('place',{x,y});return true;
  }
  shoot(angle) {
    const s=this.s,p=s.player,w=GUN[s.weapon];if(p.fire>0)return;
    if(w.ammo!==-1&&s.ammo[w.id]<=0){this.equip('pistol');this.emit('notice',{text:'Out of ammo. Pistol equipped.'});return;}
    p.fire=w.interval/(1+s.upgrades.cycle*.1+(s.rewards.includes(25)?.08:0));
    if(w.ammo!==-1)s.ammo[w.id]--;
    const power=1+s.upgrades.power*.15+(s.rewards.includes(50)?.15:0);
    const ox=p.x+Math.cos(angle)*25,oy=p.y+Math.sin(angle)*25;
    // Muzzle cannot originate on the far side of a wall.
    if(this.wallHit(p.x,p.y,ox,oy,2)!==Infinity)return;
    this.emit('shot',{weapon:w.id,x:ox,y:oy,angle});
    if(w.id==='flamer') {
      for(const e of s.enemies)if(e.hp>0&&distance(p,e)<w.range+e.r&&this.sight(p,e)) {
        const a=Math.atan2(e.y-p.y,e.x-p.x),diff=Math.atan2(Math.sin(a-angle),Math.cos(a-angle));
        if(Math.abs(diff)<.34){this.damageEnemy(e,w.damage*power,angle,0);e.fire=2.2;}
      }return;
    }
    if(w.id==='railgun') {
      const ex=ox+Math.cos(angle)*w.range,ey=oy+Math.sin(angle)*w.range,t=Math.min(1,this.wallHit(ox,oy,ex,ey));
      const bx=ox+(ex-ox)*t,by=oy+(ey-oy)*t;
      for(const e of s.enemies)if(e.hp>0&&segmentCircle(ox,oy,bx,by,e.x,e.y,e.r+5)!==Infinity)this.damageEnemy(e,w.damage*power,angle,12);
      for(const d of s.defenses)if(d.kind==='barrel'&&d.hp>0&&segmentCircle(ox,oy,bx,by,d.x,d.y,d.r)!==Infinity)this.damageDefense(d,w.damage*power);
      this.emit('beam',{x:ox,y:oy,bx,by});return;
    }
    if(w.id==='launcher') {
      s.projectiles.push({id:s.nextId++,kind:'rocket',x:ox,y:oy,vx:Math.cos(angle)*w.speed,vy:Math.sin(angle)*w.speed,life:w.range/w.speed,damage:w.damage*power,r:5,owner:'player'});return;
    }
    for(let i=0;i<(w.pellets||1);i++) {
      const a=angle+(this.random()-.5)*w.spread;
      s.bullets.push({x:ox,y:oy,px:ox,py:oy,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,life:w.range/w.speed,damage:w.damage*power,owner:'player'});
    }
  }
  damageEnemy(e,damage,angle=0,knock=4) {
    if(e.hp<=0)return;e.hp-=damage;e.flash=.08;
    if(knock&&e.kind!=='boss')this.move(e,Math.cos(angle)*knock,Math.sin(angle)*knock,false);
    if(e.hp<=0)this.kill(e);
  }
  kill(e) {
    const s=this.s,spec=ENEMIES[e.kind];e.hp=0;s.kills++;s.combo++;s.comboTime=3.5;s.bestCombo=Math.max(s.bestCombo,s.combo);
    const multiplier=Math.min(20,1+Math.floor(s.combo/5));s.score+=spec.score*multiplier;s.cash+=spec.reward;
    const mark={x:e.x,y:e.y,size:e.r*(1.3+this.random()),seed:this.random()};s.marks.push(mark);if(s.marks.length>110)s.marks.shift();
    this.emit('kill',{x:e.x,y:e.y,kind:e.kind,combo:s.combo});
    if(e.kind==='bomber')this.explode(e.x,e.y,100,95,'enemy');
    if(e.kind==='boss') { this.emit('notice',{text:'Warden down. +300 credits.'});s.pickups.push({x:e.x,y:e.y,kind:'health',life:60}); }
    if(this.random()<.18&&s.pickups.length<60)s.pickups.push({x:e.x,y:e.y,kind:this.random()<.36?'health':'ammo',life:45});
    for(const [at,cash,text] of [[10,100,'10 chain! +100 credits'],[25,250,'25 chain! Faster firing +250 credits'],[50,500,'50 chain! +15% damage +500 credits'],[100,1000,'100 chain! +1,000 credits']]) {
      if(s.combo>=at&&!s.rewards.includes(at)){s.rewards.push(at);s.cash+=cash;this.emit('milestone',{text});}
    }
  }
  damagePlayer(damage) {
    const s=this.s,p=s.player;if(s.phase!=='active'||p.hurt>0)return;
    p.hp=Math.max(0,p.hp-damage*this.difficulty.damage*(1-s.upgrades.armor*.08));p.hurt=.62;
    this.emit('hurt',{x:p.x,y:p.y});
    if(p.hp<=0){s.phase='dead';this.emit('death');}
  }
  damageDefense(d,damage) {
    if(d.hp<=0)return;d.hp-=damage;
    if(d.hp<=0) { d.hp=0;if(d.kind==='barrel')this.explode(d.x,d.y,145,210,'player');else this.emit('debris',{x:d.x,y:d.y}); }
  }
  explode(x,y,r,damage,owner='player') {
    this.emit('explosion',{x,y,r});
    // Copy targets: chain reactions can remove enemies during this loop.
    for(const e of [...this.s.enemies])if(e.hp>0) {
      const d=Math.hypot(e.x-x,e.y-y);if(d<r+e.r&&this.sight({x,y},e))this.damageEnemy(e,damage*(1-.5*Math.min(1,d/r)),Math.atan2(e.y-y,e.x-x),13);
    }
    for(const d of [...this.s.defenses])if(d.hp>0&&Math.hypot(d.x-x,d.y-y)<r&&this.sight({x,y},d))this.damageDefense(d,damage);
    const p=this.s.player,dist=Math.hypot(p.x-x,p.y-y);
    if(owner!=='mine'&&dist<r&&this.sight({x,y},p))this.damagePlayer(damage*(owner==='enemy'?.65:.25)*(1-.5*dist/r));
  }
  buy(kind,id) {
    const s=this.s;if(s.phase!=='shop')return false;
    if(kind==='weapon') {
      const w=GUN[id];if(!w||s.owned.includes(id)||s.cash<w.price)return false;
      s.cash-=w.price;s.owned.push(id);s.ammo[id]=w.ammo;this.equip(id);
    } else if(kind==='upgrade') {
      const u=UPGRADES.find(x=>x.id===id);if(!u)return false;const n=s.upgrades[id],price=UPGRADE_PRICE(u,n);
      if(n>=u.max||s.cash<price)return false;s.cash-=price;s.upgrades[id]++;
      if(id==='vitality'){s.player.maxHp+=30;s.player.hp=Math.min(s.player.maxHp,s.player.hp+30);}
    } else if(kind==='supply') {
      const item=SUPPLIES.find(x=>x.id===id);if(!item||s.cash<item.price)return false;
      if(id==='heal'&&s.player.hp>=s.player.maxHp)return false;
      if(id==='ammo'&&s.owned.every(k=>GUN[k].ammo===-1||s.ammo[k]>=GUN[k].ammo))return false;
      if(id==='grenade'&&s.grenades>=99)return false;
      if(id in s.inventory&&s.inventory[id]>=99)return false;
      s.cash-=item.price;
      if(id==='heal')s.player.hp=Math.min(s.player.maxHp,s.player.hp+60);
      else if(id==='ammo')for(const k of s.owned)s.ammo[k]=GUN[k].ammo;
      else if(id==='grenade')s.grenades=Math.min(99,s.grenades+3);
      else s.inventory[id]=Math.min(99,s.inventory[id]+(id==='turret'?1:3));
    }else return false;
    this.emit('purchase');return true;
  }
  collect(drop) {
    const s=this.s,p=s.player;
    if(drop.kind==='health')p.hp=Math.min(p.maxHp,p.hp+28);
    else for(const id of s.owned)if(GUN[id].ammo>0)s.ammo[id]=Math.min(GUN[id].ammo,s.ammo[id]+Math.ceil(GUN[id].ammo*.16));
    this.emit('pickup',{x:drop.x,y:drop.y,kind:drop.kind});drop.life=0;
  }
  tick(dt,input={}) {
    const s=this.s,p=s.player;if(s.phase!=='active')return;
    dt=clamp(dt,0,.034);
    if(s.countdown>0){s.countdown=Math.max(0,s.countdown-dt);return;}
    s.elapsed+=dt;
    for(const k of ['fire','hurt','dash','dashTime','grenadeCd','placeCd'])p[k]=Math.max(0,p[k]-dt);
    s.comboTime=Math.max(0,s.comboTime-dt);if(!s.comboTime)s.combo=0;
    let mx=input.mx||0,my=input.my||0,n=Math.hypot(mx,my);if(n>1){mx/=n;my/=n;}
    const speed=216*(1+s.upgrades.boots*.07);
    const steps=p.dashTime>0?3:1;
    for(let i=0;i<steps;i++)this.move(p,(p.dashTime>0?p.dashX*820:mx*speed)*dt/steps,(p.dashTime>0?p.dashY*820:my*speed)*dt/steps);
    if(n>.1)p.walk+=dt*(p.dashTime>0?30:14);
    const target=input.auto?this.target(p,GUN[s.weapon].range):null;
    if(input.aim!==undefined&&input.aim!==null)p.angle=input.aim;else if(target)p.angle=Math.atan2(target.y-p.y,target.x-p.x);else if(n>.15&&!input.fire)p.angle=Math.atan2(my,mx);
    if(input.fire||target)this.shoot(p.angle);
    this.flowTime-=dt;if(this.flowTime<=0){this.updateFlow();this.flowTime=.38;}
    s.spawnTimer-=dt;
    if(s.remaining>0&&s.enemies.length<120&&s.spawnTimer<=0){this.spawn(s.bossPending?'boss':null);s.bossPending=false;s.remaining--;s.spawnTimer=Math.max(.09,.52-s.wave*.017);}
    this.rebuildHash();
    for(const e of s.enemies) {
      if(e.hp<=0)continue;
      const spec=ENEMIES[e.kind];e.flash=Math.max(0,e.flash-dt);e.attack-=dt;e.shoot-=dt;e.telegraph=Math.max(0,e.telegraph-dt);
      if(e.fire>0){e.fire-=dt;this.damageEnemy(e,15*dt*(1+s.upgrades.power*.15),0,0);if(e.hp<=0)continue;}
      let dx=p.x-e.x,dy=p.y-e.y,dist=Math.hypot(dx,dy),len=dist||1;
      const see=this.sight(e,p);
      if(!see) {
        const cx=clamp((e.x/40)|0,0,35),cy=clamp((e.y/40)|0,0,24);let best=Infinity,bx=cx,by=cy;
        for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++) {
          const nx=cx+xx,ny=cy+yy;if(nx<0||nx>=36||ny<0||ny>=25||(xx===0&&yy===0))continue;
          if(xx&&yy&&(this.blocked[cy*36+nx]||this.blocked[ny*36+cx]))continue;
          const v=this.flow[ny*36+nx];if(v>=0&&v<best){best=v;bx=nx;by=ny;}
        }
        dx=bx*40+20-e.x;dy=by*40+20-e.y;len=Math.hypot(dx,dy)||1;
      }
      let vx=dx/len,vy=dy/len;
      for(const other of this.neighbors(e.x,e.y))if(other!==e) {
        const ox=e.x-other.x,oy=e.y-other.y,d=Math.hypot(ox,oy),min=e.r+other.r+5;
        if(d>0&&d<min){vx+=ox/d*(min-d)/min*1.3;vy+=oy/d*(min-d)/min*1.3;}
      }
      if((e.kind==='cinder'||e.kind==='boss')&&dist<470&&see) {
        if(e.shoot<.5)e.telegraph=.12;
        if(e.shoot<=0) {
          const a=Math.atan2(p.y-e.y,p.x-e.x),count=e.kind==='boss'?9:1;
          for(let j=0;j<count;j++) {
            const b=count===1?a:a+j*Math.PI*2/count;
            s.projectiles.push({id:s.nextId++,kind:'fireball',x:e.x+Math.cos(b)*(e.r+8),y:e.y+Math.sin(b)*(e.r+8),vx:Math.cos(b)*220,vy:Math.sin(b)*220,life:4.5,damage:spec.damage,r:8,owner:'enemy'});
          }
          e.shoot=e.kind==='boss'?2.7:2.1;this.emit('enemyShot',{x:e.x,y:e.y});
        }
        if(e.kind==='cinder'&&dist<290){vx*=.3;vy*=.3;}
      }
      if(e.kind==='bomber'&&dist<72&&e.fuse<0)e.fuse=.65;
      if(e.fuse>=0){e.fuse-=dt;vx=0;vy=0;if(e.fuse<=0){this.damageEnemy(e,e.hp+1);continue;}}
      const norm=Math.max(1,Math.hypot(vx,vy)),es=spec.speed*this.difficulty.speed*Math.min(1.55,1+s.wave*.014);
      if(dist>p.r+e.r-2||!see)this.move(e,vx/norm*es*dt,vy/norm*es*dt);
      e.angle=Math.atan2(dy,dx);e.walk+=dt*es*.12;
      if(dist<e.r+p.r+7&&e.attack<=0&&see){this.damagePlayer(spec.damage);e.attack=1;}
      if(e.attack<=0)for(const d of s.defenses)if(d.hp>0&&d.kind!=='mine'&&distance(d,e)<d.r+e.r+10){this.damageDefense(d,spec.damage*2);e.attack=.8;break;}
    }
    for(const d of s.defenses) {
      if(d.hp<=0)continue;d.armed-=dt;d.fire-=dt;
      if(d.kind==='mine'&&d.armed<=0&&s.enemies.some(e=>e.hp>0&&distance(d,e)<e.r+34)){d.hp=0;this.explode(d.x,d.y,140,230,'mine');}
      if(d.kind==='turret'&&d.fire<=0&&d.ammo>0){const e=this.target(d,440);if(e){d.angle=Math.atan2(e.y-d.y,e.x-d.x);d.fire=.14;d.ammo--;s.bullets.push({x:d.x,y:d.y,px:d.x,py:d.y,vx:Math.cos(d.angle)*900,vy:Math.sin(d.angle)*900,life:.55,damage:20,owner:'turret'});this.emit('turretShot',{x:d.x,y:d.y,angle:d.angle});}}
    }
    for(const b of s.bullets) {
      b.px=b.x;b.py=b.y;const nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;b.life-=dt;
      let t=this.wallHit(b.x,b.y,nx,ny,2),hit=null,def=null;
      for(const e of s.enemies)if(e.hp>0){const v=segmentCircle(b.x,b.y,nx,ny,e.x,e.y,e.r+2);if(v<t){t=v;hit=e;def=null;}}
      if(b.owner!=='turret')for(const d of s.defenses)if(d.hp>0&&d.kind==='barrel'){const v=segmentCircle(b.x,b.y,nx,ny,d.x,d.y,d.r+2);if(v<t){t=v;def=d;hit=null;}}
      if(t!==Infinity){b.x+=(nx-b.x)*t;b.y+=(ny-b.y)*t;b.life=0;if(hit)this.damageEnemy(hit,b.damage,Math.atan2(b.vy,b.vx));if(def)this.damageDefense(def,b.damage);if(!hit&&!def)this.emit('spark',{x:b.x,y:b.y});}else{b.x=nx;b.y=ny;}
    }
    for(const b of s.projectiles) {
      if(b.life<=0)continue;
      const nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;let t=this.wallHit(b.x,b.y,nx,ny,b.r),def=null;
      if(b.kind==='rocket')for(const e of s.enemies)if(e.hp>0)t=Math.min(t,segmentCircle(b.x,b.y,nx,ny,e.x,e.y,e.r+b.r));
      if(b.kind==='fireball') {
        const pp=segmentCircle(b.x,b.y,nx,ny,p.x,p.y,p.r+b.r);
        if(pp<t){t=pp;def='player';}
        for(const d of s.defenses)if(d.hp>0&&d.kind!=='mine'){const dd=segmentCircle(b.x,b.y,nx,ny,d.x,d.y,d.r+b.r);if(dd<t){t=dd;def=d;}}
      }
      b.life-=dt;
      if(t!==Infinity) {
        b.x+=(nx-b.x)*Math.max(0,t-.02);b.y+=(ny-b.y)*Math.max(0,t-.02);
        if(b.kind==='grenade'){b.vx=0;b.vy=0;}else b.life=0;
      }else{b.x=nx;b.y=ny;}
      if(b.kind==='grenade'){b.vx*=Math.pow(.35,dt);b.vy*=Math.pow(.35,dt);}
      if(b.life<=0){if(b.kind==='rocket'||b.kind==='grenade')this.explode(b.x,b.y,b.kind==='rocket'?160:150,b.damage,'player');else{if(def==='player')this.damagePlayer(b.damage);else if(def)this.damageDefense(def,b.damage);this.emit('spark',{x:b.x,y:b.y});}}
    }
    for(const drop of s.pickups){drop.life-=dt;const d=distance(drop,p);if(drop.life>0&&d<70+s.upgrades.magnet*45&&this.sight(drop,p)){if(d<28)this.collect(drop);else{drop.x+=(p.x-drop.x)*Math.min(1,dt*9);drop.y+=(p.y-drop.y)*Math.min(1,dt*9);}}}
    s.enemies=s.enemies.filter(e=>e.hp>0);s.bullets=s.bullets.filter(b=>b.life>0&&b.x>0&&b.x<WORLD.w&&b.y>0&&b.y<WORLD.h).slice(-700);s.projectiles=s.projectiles.filter(b=>b.life>0).slice(-350);s.defenses=s.defenses.filter(d=>d.hp>0);s.pickups=s.pickups.filter(d=>d.life>0);
    if(s.phase==='active'&&s.remaining===0&&s.enemies.length===0) {
      for(const drop of s.pickups)this.collect(drop);s.pickups=[];s.projectiles=[];s.bullets=[];
      const reward=60+s.wave*22;s.cash+=reward;p.hp=Math.min(p.maxHp,p.hp+10);
      for(const id of s.owned)if(GUN[id].ammo>0)s.ammo[id]=Math.min(GUN[id].ammo,s.ammo[id]+Math.ceil(GUN[id].ammo*.12));
      s.phase='shop';this.emit('clear',{wave:s.wave,reward});
    }
  }
}

export function validState(s) {
  if(!s||s.schema!==1||typeof s.id!=='string'||!MAPS.some(m=>m.id===s.map)||!DIFFICULTIES[s.difficulty]||!['active','shop'].includes(s.phase))return false;
  const p=s.player;
  if(!p||!(p.hp>0)||!(p.maxHp>=p.hp)||p.maxHp>500||p.x<0||p.x>WORLD.w||p.y<0||p.y>WORLD.h||!GUN[s.weapon])return false;
  for(const [k,max] of [['enemies',120],['bullets',700],['projectiles',350],['defenses',32],['pickups',60],['marks',110],['owned',8],['rewards',4]])if(!Array.isArray(s[k])||s[k].length>max)return false;
  if(!s.owned.includes('pistol')||!s.owned.includes(s.weapon)||s.owned.some(k=>!GUN[k])||!s.ammo||s.owned.some(k=>typeof s.ammo[k]!=='number'))return false;
  if(!s.upgrades||UPGRADES.some(u=>!Number.isInteger(s.upgrades[u.id])||s.upgrades[u.id]<0||s.upgrades[u.id]>u.max))return false;
  if(!s.inventory||['barrel','mine','wall','turret'].some(k=>!Number.isInteger(s.inventory[k])||s.inventory[k]<0||s.inventory[k]>99)||!(s.build in s.inventory))return false;
  for(const k of ['x','y','r','hp','maxHp','angle','fire','hurt','dash','dashTime','dashX','dashY','grenadeCd','placeCd','walk'])if(typeof p[k]!=='number')return false;
  for(const k of ['wave','rng','elapsed','score','kills','cash','combo','comboTime','bestCombo','nextId','countdown','remaining','spawnTimer','grenades'])if(typeof s[k]!=='number'||s[k]<0)return false;
  if(s.enemies.some(e=>!ENEMIES[e.kind]||!(e.hp>0)||!['x','y','r','angle','maxHp','attack','shoot','telegraph','fire','flash','walk','fuse'].every(k=>typeof e[k]==='number')))return false;
  if(s.defenses.some(d=>!['barrel','mine','wall','turret'].includes(d.kind)||!['x','y','hp','r','maxHp','armed','fire','ammo','angle'].every(k=>typeof d[k]==='number')))return false;
  const finite=(v,depth=0)=>{if(depth>12)return false;if(typeof v==='number')return Number.isFinite(v);if(Array.isArray(v))return v.every(x=>finite(x,depth+1));if(v&&typeof v==='object')return Object.values(v).every(x=>finite(x,depth+1));return ['string','boolean','undefined'].includes(typeof v)||v===null;};
  return finite(s);
}
