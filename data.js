// Deadblock Rooms: original game data. Distances are world units, time is seconds.
export const VERSION = '1.0.0';
export const WORLD = { w: 1440, h: 1040, cell: 40 };
export const WEAPONS = [
  { id:'pistol', name:'Pistol', short:'PISTOL', key:'1', kind:'bullet', damage:24, delay:.27, range:650, pellets:1, spread:.025, ammo:-1, cost:0, combo:0, color:'#dfbb65', desc:'Reliable sidearm. Unlimited ammunition.' },
  { id:'uzi', name:'Uzi', short:'UZI', key:'2', kind:'bullet', damage:15, delay:.078, range:590, pellets:1, spread:.11, ammo:260, cost:300, combo:5, color:'#71a7a2', desc:'Rapid fire. Keeps devils from throwing fireballs.' },
  { id:'shotgun', name:'Shotgun', short:'SHOTGUN', key:'3', kind:'bullet', damage:18, delay:.57, range:400, pellets:7, spread:.39, ammo:55, cost:550, combo:12, color:'#d09366', desc:'Seven pellets. Make the whole group regret getting close.' },
  { id:'barrel', name:'Explosive barrel', short:'BARREL', key:'4', kind:'barrel', damage:160, delay:.55, radius:135, ammo:12, cost:380, combo:18, color:'#c94c3d', desc:'Place a barrel, switch weapons, then shoot it. Chain reactions count.' },
  { id:'grenade', name:'Grenades', short:'GRENADE', key:'5', kind:'grenade', damage:155, delay:.9, radius:145, range:250, ammo:18, cost:650, combo:25, color:'#879767', desc:'A short fuse and a wide blast. Aim beyond the front row.' },
  { id:'wall', name:'Barricades', short:'WALL', key:'6', kind:'wall', damage:0, delay:.4, ammo:14, cost:450, combo:32, color:'#9b8e79', desc:'Destructible cover. Zombies will tear through it eventually.' },
  { id:'mine', name:'Land mines', short:'MINE', key:'7', kind:'mine', damage:180, delay:.55, radius:145, ammo:14, cost:800, combo:40, color:'#a7a273', desc:'Arms after a moment. A nearby zombie sets it off.' },
  { id:'rocket', name:'Rocket launcher', short:'ROCKET', key:'8', kind:'rocket', damage:210, delay:.8, range:820, radius:155, ammo:28, cost:1200, combo:50, color:'#d26845', desc:'A direct answer to a crowded room. Watch the blast radius.' },
  { id:'rail', name:'Railgun', short:'RAILGUN', key:'9', kind:'rail', damage:180, delay:.63, range:1100, pellets:1, spread:0, ammo:48, cost:1700, combo:65, color:'#5da9ad', desc:'Punches through a line of enemies. Walls still stop the beam.' },
  { id:'charge', name:'Remote charges', short:'CHARGE', key:'0', kind:'charge', damage:250, delay:.45, radius:180, ammo:12, cost:1050, combo:80, color:'#a9879f', desc:'Place a trap. Tap DETONATE or press X when the room is full.' }
];
export const GUN = Object.fromEntries(WEAPONS.map(w=>[w.id,w]));
export const UPGRADES = [
  {id:'damage',name:'Stopping power',desc:'+15% damage per level, for every weapon.',cost:180,max:8},
  {id:'rate',name:'Quick trigger',desc:'+9% fire rate per level.',cost:180,max:8},
  {id:'health',name:'Field conditioning',desc:'+20 maximum health and restore 20 health.',cost:200,max:6},
  {id:'speed',name:'Light on your feet',desc:'+6% movement speed per level.',cost:220,max:5},
  {id:'armor',name:'Body armor',desc:'Reduce incoming damage by 7% per level.',cost:240,max:6},
  {id:'magnet',name:'Supply reach',desc:'+20 pickup range per level.',cost:140,max:5},
  {id:'blast',name:'Demolition training',desc:'+8% explosive radius per level.',cost:230,max:5},
  {id:'capacity',name:'Deep pockets',desc:'+25% ammo capacity and a partial refill.',cost:180,max:5}
];
export const SKINS = [
  {id:'ranger',name:'Ranger',shirt:'#34474a',trim:'#e3b854',skin:'#d3aa80',hair:'#38332f'},
  {id:'agent',name:'Agent',shirt:'#29303b',trim:'#d7d8cf',skin:'#cfa07e',hair:'#282626'},
  {id:'scout',name:'Scout',shirt:'#9b5e3b',trim:'#bcb28c',skin:'#b58060',hair:'#372d29'},
  {id:'medic',name:'Medic',shirt:'#c2c6b7',trim:'#b34436',skin:'#bd936f',hair:'#504536'}
];
export const DIFFICULTIES = {
  relaxed:{name:'Relaxed',health:.8,speed:.84,damage:.65,count:.8},
  normal:{name:'Normal',health:1,speed:1,damage:1,count:1},
  nightmare:{name:'Nightmare',health:1.3,speed:1.16,damage:1.35,count:1.3}
};
export const ENEMIES = {
  zombie:{hp:40,speed:43,damage:10,r:13,value:16,score:10,shirt:'#9aa8a2',skin:'#bcc5ae'},
  runner:{hp:29,speed:88,damage:8,r:11,value:22,score:20,shirt:'#88745d',skin:'#afbb8e'},
  devil:{hp:190,speed:40,damage:17,r:17,value:65,score:70,shirt:'#ae382d',skin:'#e85239'},
  brute:{hp:290,speed:32,damage:22,r:22,value:75,score:90,shirt:'#596750',skin:'#8f9c6c'},
  overlord:{hp:1150,speed:34,damage:25,r:30,value:350,score:500,shirt:'#782e29',skin:'#d44a34'}
};
const rect=(x,y,w,h)=>({x,y,w,h});
const row=(ys,xs,w=80,h=80)=>ys.flatMap(y=>xs.map(x=>rect(x,y,w,h)));
// All rooms are original layouts, not extracted or traced from the Flash game.
export const MAPS = [
 {id:'outpost',name:'Outpost',desc:'Four covers. Open lanes. A good place to begin.',walls:row([240,680],[360,920],160,120)},
 {id:'empty',name:'Empty room',desc:'Nowhere to hide. Plenty of room to run.',walls:[]},
 {id:'pillars',name:'Pillars',desc:'Thread the columns and line up your shots.',walls:row([240,480,720],[280,560,840,1120])},
 {id:'crossfire',name:'Crossfire',desc:'Four long walls divide the approach.',walls:[rect(680,160,80,200),rect(680,680,80,200),rect(200,480,320,80),rect(920,480,320,80)]},
 {id:'warehouse',name:'Warehouse',desc:'Storage aisles turn crowds into queues.',walls:row([240,640],[280,600,920],200,120)},
 {id:'courtyard',name:'Courtyard',desc:'A broken perimeter around a central refuge.',walls:[rect(320,240,320,80),rect(800,240,320,80),rect(320,720,320,80),rect(800,720,320,80),rect(320,320,80,120),rect(320,600,80,120),rect(1040,320,80,120),rect(1040,600,80,120)]},
 {id:'twinhalls',name:'Twin halls',desc:'Two walls. Three dangerous corridors.',walls:[rect(440,160,80,640),rect(920,240,80,640)]},
 {id:'foundry',name:'Foundry',desc:'Heavy machinery breaks up every sightline.',walls:[rect(240,200,200,160),rect(960,200,200,160),rect(240,680,200,160),rect(960,680,200,160),rect(640,400,160,200)]},
 {id:'switchback',name:'Switchback',desc:'Long turns reward patient crowd control.',walls:[rect(280,160,80,560),rect(640,320,80,560),rect(1000,160,80,560)]},
 {id:'junction',name:'Junction',desc:'An open crossing between four blocks.',walls:row([200,640],[280,920],240,200)},
 {id:'bastion',name:'Bastion',desc:'Fortify the central bunker or circle outside.',walls:[rect(480,320,160,80),rect(800,320,160,80),rect(480,640,160,80),rect(800,640,160,80),rect(480,400,80,240),rect(880,400,80,240)]},
 {id:'gauntlet',name:'Gauntlet',desc:'Short staggered walls. Keep moving.',walls:[rect(240,200,280,80),rect(760,360,400,80),rect(240,520,280,80),rect(760,680,400,80),rect(240,840,280,40)]},
 {id:'fourcorners',name:'Four corners',desc:'Cover at the edges. Trouble in the center.',walls:row([120,760],[160,1080],200,160)},
 {id:'vault',name:'The vault',desc:'A square stronghold with four open doors.',walls:[rect(440,280,200,80),rect(800,280,200,80),rect(440,680,200,80),rect(800,680,200,80),rect(440,360,80,80),rect(440,600,80,80),rect(920,360,80,80),rect(920,600,80,80)]},
 {id:'gridlock',name:'Gridlock',desc:'A dense grid makes the railgun work for you.',walls:row([160,400,640,840],[240,480,880,1120],80,80)},
 {id:'catacombs',name:'Catacombs',desc:'Broken walls and narrow escapes.',walls:[rect(240,200,360,80),rect(240,280,80,240),rect(840,200,360,80),rect(1120,280,80,240),rect(240,760,360,80),rect(240,600,80,160),rect(840,760,360,80),rect(1120,600,80,160)]},
 {id:'dogleg',name:'Dogleg',desc:'Opposing corners trap careless survivors.',walls:[rect(360,200,80,400),rect(440,520,160,80),rect(1000,440,80,400),rect(840,440,160,80)]},
 {id:'laststand',name:'Last stand',desc:'An exposed center. Four barricade-ready exits.',walls:[rect(320,240,280,80),rect(840,240,280,80),rect(320,720,280,80),rect(840,720,280,80),rect(320,320,80,120),rect(320,600,80,120),rect(1040,320,80,120),rect(1040,600,80,120),rect(160,440,80,160),rect(1200,440,80,160)]}
];
export const MAP = Object.fromEntries(MAPS.map(m=>[m.id,m]));
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function upgradeCost(id,level){const u=UPGRADES.find(u=>u.id===id);return u?Math.round(u.cost*Math.pow(1.55,level)/10)*10:Infinity;}
export function ammoMax(w,up){return w.ammo<0?-1:Math.round(w.ammo*(1+.25*(up.capacity||0)));}
