// Original game data. No assets or source from the Boxhead games are used.
export const VERSION = '1.0.0';
export const WORLD = { w: 1440, h: 1000, cell: 40 };
export const MAPS = [
  { id: 'yard', name: 'The yard', tag: 'ROOM TO RUN', description: 'An open killing floor. Learn to circle the horde.', floor: '#777867', line: '#858573', accent: '#d9b755', walls: [[280,250,160,95],[1000,250,160,95],[280,660,160,95],[1000,660,160,95]], spawn: [720,500] },
  { id: 'cross', name: 'Crossfire', tag: 'FOUR CORNERS', description: 'Wide lanes, blind corners, and very few second chances.', floor: '#727877', line: '#808784', accent: '#84c6b7', walls: [[230,200,310,200],[900,200,310,200],[230,650,310,170],[900,650,310,170]], spawn: [720,500] },
  { id: 'pillars', name: 'Dead works', tag: 'BREAK THEIR SIGHT', description: 'Thread the columns. Turn a crowd into a line.', floor: '#82796a', line: '#918775', accent: '#dc9573', walls: [[280,240,90,90],[675,200,90,90],[1070,240,90,90],[280,650,90,90],[675,710,90,90],[1070,650,90,90],[485,440,90,100],[870,440,90,100]], spawn: [720,490] },
  { id: 'bunker', name: 'Last shelter', tag: 'HOLD THE GAP', description: 'A broken bunker. Defenses buy time, not safety.', floor: '#686f67', line: '#798075', accent: '#b3be79', walls: [[360,250,255,70],[825,250,255,70],[360,250,70,180],[1010,250,70,180],[360,650,255,70],[825,650,255,70],[360,540,70,180],[1010,540,70,180]], spawn: [720,480] }
];
export const DIFFICULTIES = {
  casual: { name: 'Casual', hp: 160, damage: .65, speed: .88, count: .85, text: 'More health. A little breathing room.' },
  normal: { name: 'Survival', hp: 120, damage: 1, speed: 1, count: 1, text: 'The intended fight. One life, no rewind.' },
  nightmare: { name: 'Nightmare', hp: 100, damage: 1.3, speed: 1.12, count: 1.25, text: 'Faster crowds. Harder hits. Good luck.' }
};
export const WEAPONS = [
  { id:'pistol', name:'Pistol', short:'Pistol', price:0, damage:28, interval:.27, speed:880, spread:.025, range:690, ammo:-1, color:'#d6daca', description:'Reliable, accurate, and never out of ammunition.' },
  { id:'smg', name:'Submachine gun', short:'SMG', price:220, damage:15, interval:.085, speed:900, spread:.15, range:620, ammo:320, color:'#d5ef66', description:'A fast stream of lead. Keep the kill chain alive.' },
  { id:'shotgun', name:'Pump shotgun', short:'Shotgun', price:430, damage:15, pellets:7, interval:.68, speed:850, spread:.52, range:390, ammo:75, color:'#efb970', description:'Seven pellets. Get close, then make some space.' },
  { id:'carbine', name:'Assault carbine', short:'Carbine', price:720, damage:36, interval:.16, speed:1080, spread:.045, range:800, ammo:250, color:'#83d1c2', description:'Accurate bursts with enough punch for armored targets.' },
  { id:'flamer', name:'Flamethrower', short:'Flamer', price:1150, damage:9, interval:.065, range:205, spread:.5, ammo:650, color:'#ff9360', description:'Burn a whole cone of enemies. Fire lingers on contact.' },
  { id:'railgun', name:'Rail rifle', short:'Railgun', price:1700, damage:190, interval:.8, range:1150, ammo:80, color:'#9cceff', description:'A piercing beam. Line them up and cut through.' },
  { id:'launcher', name:'Rocket launcher', short:'Rockets', price:2200, damage:260, interval:.86, speed:490, spread:0, range:1000, ammo:50, color:'#ef887b', description:'Wide blast radius. Your own explosions can hurt you.' },
  { id:'minigun', name:'Minigun', short:'Minigun', price:3200, damage:26, interval:.05, speed:1050, spread:.13, range:770, ammo:900, color:'#e4da94', description:'Overwhelming firepower. Overwhelming ammunition use.' }
];
export const GUN = Object.fromEntries(WEAPONS.map(w => [w.id,w]));
export const UPGRADES = [
  { id:'power', name:'Stopping power', price:160, max:5, description:'+15% damage per level.' },
  { id:'cycle', name:'Fast action', price:180, max:5, description:'+10% firing speed per level.' },
  { id:'vitality', name:'Field conditioning', price:140, max:5, description:'+30 maximum health; heals 30 now.' },
  { id:'armor', name:'Ballistic plates', price:180, max:5, description:'8% less incoming damage per level.' },
  { id:'boots', name:'Light footwork', price:150, max:5, description:'+7% movement speed; shorter dash cooldown.' },
  { id:'magnet', name:'Supply reach', price:110, max:4, description:'Collect supplies from 45 units farther away.' }
];
export const SUPPLIES = [
  { id:'heal', name:'Field dressing', price:65, description:'Restore 60 health.' },
  { id:'ammo', name:'Ammo resupply', price:100, description:'Fill every weapon you own.' },
  { id:'grenade', name:'Grenades ×3', price:100, description:'Throw toward your aim. Mind the blast.' },
  { id:'barrel', name:'Explosive barrels ×3', price:85, description:'Place, retreat, and shoot for chain reactions.' },
  { id:'mine', name:'Proximity mines ×3', price:120, description:'Arm after a moment. Only enemies trigger them.' },
  { id:'wall', name:'Barricades ×3', price:80, description:'Block a lane. Enemies will tear them down.' },
  { id:'turret', name:'Sentry turret', price:350, description:'An automatic ally with 450 rounds.' }
];
export const ENEMIES = {
  walker: { name:'Shambler', hp:50, speed:64, damage:13, radius:14, reward:12, score:100, body:'#adb9ab', head:'#bec5b2' },
  runner: { name:'Runner', hp:38, speed:124, damage:11, radius:12, reward:16, score:150, body:'#b7a875', head:'#d1c59a' },
  brute: { name:'Brute', hp:255, speed:44, damage:26, radius:23, reward:40, score:400, body:'#667a72', head:'#8a9b7e' },
  cinder: { name:'Cinder', hp:140, speed:58, damage:18, radius:17, reward:35, score:350, body:'#a94e40', head:'#d37659' },
  bomber: { name:'Bloater', hp:85, speed:78, damage:45, radius:18, reward:26, score:260, body:'#a5a353', head:'#c6c478' },
  boss: { name:'The warden', hp:1100, speed:47, damage:34, radius:30, reward:300, score:4000, body:'#7c4941', head:'#ad7a57' }
};
export const BUILD_TYPES = ['barrel','mine','wall','turret'];
export const UPGRADE_PRICE = (u, level) => Math.round(u.price * Math.pow(1.65,level));
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export function segmentCircle(ax,ay,bx,by,cx,cy,r) {
  const dx=bx-ax, dy=by-ay, fx=ax-cx, fy=ay-cy;
  const a=dx*dx+dy*dy, c=fx*fx+fy*fy-r*r;
  if(c<=0) return 0;
  if(a<1e-9) return Infinity;
  const b=2*(fx*dx+fy*dy), d=b*b-4*a*c;
  if(d<0) return Infinity;
  const t=(-b-Math.sqrt(d))/(2*a);
  return t>=0 && t<=1 ? t : Infinity;
}
export function segmentRect(ax,ay,bx,by,r,pad=0) {
  let lo=0, hi=1;
  for(const [a,d,mn,mx] of [[ax,bx-ax,r[0]-pad,r[0]+r[2]+pad],[ay,by-ay,r[1]-pad,r[1]+r[3]+pad]]) {
    if(Math.abs(d)<1e-9) { if(a<mn || a>mx) return Infinity; }
    else { let u=(mn-a)/d,v=(mx-a)/d; if(u>v) [u,v]=[v,u]; lo=Math.max(lo,u); hi=Math.min(hi,v); if(lo>hi) return Infinity; }
  }
  return lo;
}
export function circleRect(x,y,r,box) {
  const qx=clamp(x,box[0],box[0]+box[2]), qy=clamp(y,box[1],box[1]+box[3]);
  return (x-qx)**2+(y-qy)**2<r*r;
}
