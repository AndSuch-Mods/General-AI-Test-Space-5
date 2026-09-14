import { WORLD, GUN, ENEMIES, clamp } from './data.js';
import {drawCharacter} from './characters.js';
const shades = new Map();
function shade(hex, f) { const key = hex + f; if (shades.has(key))
    return shades.get(key); const n = parseInt(hex.slice(1), 16); const c = `rgb(${clamp((n >> 16) * f, 0, 255) | 0},${clamp(((n >> 8) & 255) * f, 0, 255) | 0},${clamp((n & 255) * f, 0, 255) | 0})`; shades.set(key, c); return c; }
function poly(c, points, fill, stroke) { c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 1;
    c.stroke();
} }
function cube(c, x, y, z, w, d, h, color, a = 0) { const ca = Math.cos(a), sa = Math.sin(a); const ps = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([px, py]) => [x + px * ca - py * sa, y + (px * sa + py * ca) * .68]); const faces = ps.map((p, i) => ({ p, q: ps[(i + 1) % 4], i })).sort((a, b) => (a.p[1] + a.q[1]) - (b.p[1] + b.q[1])); for (const { p, q, i } of faces)
    poly(c, [[p[0], p[1] - z], [q[0], q[1] - z], [q[0], q[1] - z - h], [p[0], p[1] - z - h]], shade(color, i % 2 ? .64 : .82), '#26302c'); poly(c, ps.map(p => [p[0], p[1] - z - h]), shade(color, 1.12), '#26302c'); }
function pickupTint(kind) { return ({ health: '#d0d5b3', ammo: '#939e8e', grenade: '#d3ba72', barrel: '#b66d48', mine: '#87945b', wall: '#9f9983', turret: '#8fa38a' })[kind] || '#939e8e'; }
function pickupLabel(kind) { return ({ health: '+ HEALTH', ammo: '+ AMMO', grenade: '+ FRAG', barrel: '+ BARREL', mine: '+ MINE', wall: '+ WALL', turret: '+ TURRET' })[kind] || '+ PICKUP'; }
export class Renderer {
    constructor(canvas, settings) { this.canvas = canvas; this.c = canvas.getContext('2d', { alpha: false }); this.settings = settings; this.w = 1; this.h = 1; this.scale = 1; this.cx = 720; this.cy = 500; this.tx = 0; this.ty = 0; this.parts = []; this.beams = []; this.blasts = []; this.texts = []; this.shake = 0; this.flash = 0; this.mapId = ''; this.time = 0; this.resize(); }
    resize() { const b = this.canvas.getBoundingClientRect(); this.w = Math.max(1, b.width); this.h = Math.max(1, b.height); this.dpr = Math.min(2, globalThis.devicePixelRatio || 1); this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr); }
    screenToWorld(x, y) { return { x: (x - this.tx) / this.scale, y: (y - this.ty) / this.scale + 26 }; }
    makeFloor(map) { const canvas = document.createElement('canvas'); canvas.width = WORLD.w; canvas.height = WORLD.h; const c = canvas.getContext('2d'); c.fillStyle = map.floor; c.fillRect(0, 0, WORLD.w, WORLD.h); c.strokeStyle = map.line; c.lineWidth = 1; c.beginPath(); for (let x = 0; x <= WORLD.w; x += 80) {
        c.moveTo(x, 0);
        c.lineTo(x, WORLD.h);
    } for (let y = 0; y <= WORLD.h; y += 80) {
        c.moveTo(0, y);
        c.lineTo(WORLD.w, y);
    } c.stroke(); let seed = 1711; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; for (let i = 0; i < 1800; i++) {
        c.fillStyle = i % 3 ? '#0000000c' : '#ffffff0b';
        c.fillRect(random() * WORLD.w, random() * WORLD.h, 1 + random() * 5, 1 + random() * 3);
    } c.strokeStyle = '#333d34'; c.lineWidth = 14; c.strokeRect(7, 7, WORLD.w - 14, WORLD.h - 14); c.strokeStyle = '#d6ce9c'; c.lineWidth = 2; c.strokeRect(26, 26, WORLD.w - 52, WORLD.h - 52); for (const [side, x, y, a] of [['N', WORLD.w / 2, 28, 0], ['S', WORLD.w / 2, WORLD.h - 28, 0], ['W', 28, WORLD.h / 2, Math.PI / 2], ['E', WORLD.w - 28, WORLD.h / 2, Math.PI / 2]]) {
        if (!map.approaches.includes(side))
            continue;
        c.save();
        c.translate(x, y);
        c.rotate(a);
        c.fillStyle = '#2f372e';
        c.fillRect(-90, -12, 180, 24);
        for (let k = -85; k < 85; k += 24)
            poly(c, [[k, -12], [k + 12, -12], [k + 26, 12], [k + 14, 12]], map.accent);
        c.restore();
    }
    if(map.id==='runway') {
      c.save();c.strokeStyle='#ddd9ac88';c.lineWidth=4;
      for(const y of [395,1125]){c.beginPath();c.moveTo(65,y);c.lineTo(WORLD.w-65,y);c.stroke();}
      c.setLineDash([75,65]);c.lineWidth=8;c.beginPath();c.moveTo(120,WORLD.h/2);c.lineTo(WORLD.w-120,WORLD.h/2);c.stroke();
      c.setLineDash([]);c.fillStyle='#f0e4ad99';c.font='900 64px monospace';c.fillText('09',130,680);c.fillText('27',WORLD.w-240,900);c.restore();
    }
    c.save(); c.globalAlpha = .15; c.fillStyle = '#e8e9d9'; c.font = '900 72px ui-monospace,monospace'; c.textAlign = 'center'; c.fillText(map.name.toUpperCase(), WORLD.w / 2, WORLD.h / 2); c.font = '700 18px ui-monospace,monospace'; c.fillText(map.flow || 'KEEP MOVING', WORLD.w / 2, WORLD.h / 2 + 37); c.restore(); this.floor = canvas; this.mapId = map.id; }
    event(e) { const limit = this.settings.quality === 'low' ? 90 : 350; const scatter = (n, color, speed = 130, z = 20) => { for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = Math.random() * speed;
        this.parts.push({ x: e.x, y: e.y - z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .15 + Math.random() * .35, size: 1 + Math.random() * 4, color });
    } }; if (e.type === 'shot') {
        const w = GUN[e.weapon];
        if (e.weapon === 'flamer') {
            for (let i = 0; i < 4; i++) {
                const a = e.angle + (Math.random() - .5) * .58;
                this.parts.push({ x: e.x, y: e.y - 28, vx: Math.cos(a) * (230 + Math.random() * 120), vy: Math.sin(a) * (230 + Math.random() * 120), life: .32 + Math.random() * .18, size: 7 + Math.random() * 10, color: i % 2 ? '#f7d276' : '#ed7946' });
            }
        }
        else if (e.weapon !== 'railgun') {
            scatter(e.weapon === 'shotgun' ? 8 : 3, w.color, 90, 28);
            this.shake = Math.max(this.shake, e.weapon === 'launcher' ? 4 : e.weapon === 'shotgun' ? 2 : .6);
        }
    } if (e.type === 'kill') {
        scatter(7, this.settings.blood ? '#853d35' : '#c2b799', 120, 20);
        if (e.combo > 1 && e.combo % 5 === 0)
            this.texts.push({ x: e.x, y: e.y - 55, text: `×${e.combo}`, life: 1, color: '#e3ef79' });
    } if (e.type === 'beam') {
        this.beams.push({ ...e, life: .23 });
        this.shake = 2;
    } if (e.type === 'explosion') {
        this.blasts.push({ ...e, life: .4 });
        scatter(22, '#f3bd70', 300, 5);
        this.shake = 8;
    } if (e.type === 'spark' || e.type === 'debris')
        scatter(5, '#d9c99b', 130, 23); if (e.type === 'pickup')
        this.texts.push({ x: e.x, y: e.y - 35, text: pickupLabel(e.kind), life: 1.1, color: e.kind === 'health' ? '#c3e582' : e.kind === 'ammo' ? '#b7dce3' : '#f1d67d' }); if (e.type === 'hurt') {
        this.flash = .3;
        this.shake = 5;
    } if (e.type === 'dash')
        scatter(9, '#e5ecbd', 100, 0); if (this.parts.length > limit)
        this.parts.splice(0, this.parts.length - limit); }
    actor(e, player = false) {
        drawCharacter(this.c,e,{player,weapon:this.state.weapon,blood:this.settings.blood!==false,time:this.time});
    }
    wall(w, map) { const c = this.c, [x, y, width, depth] = w, h = 37; c.fillStyle = '#18232133'; c.fillRect(x + 12, y + 8, width + 7, depth + 6); poly(c, [[x, y + depth - h], [x + width, y + depth - h], [x + width, y + depth], [x, y + depth]], '#3f4a45', '#2e3833'); poly(c, [[x + width, y - h], [x + width + 7, y - h + 7], [x + width + 7, y + depth - 3], [x + width, y + depth]], '#35413b', '#2e3833'); c.fillStyle = '#9da395'; c.fillRect(x, y - h, width, depth); c.strokeStyle = '#c4c9b9'; c.lineWidth = 2; c.strokeRect(x + 2, y - h + 2, width - 4, depth - 4); c.fillStyle = '#858d80'; c.fillRect(x + 8, y - h + 8, width - 16, depth - 16); c.fillStyle = map.accent; c.fillRect(x + 8, y + depth - 27, Math.min(width - 16, 60), 5); }
    defense(d) { const c = this.c; c.fillStyle = '#20281e40'; c.beginPath(); c.ellipse(d.x + 5, d.y + 5, d.r + 4, d.r * .5, 0, 0, Math.PI * 2); c.fill(); if (d.kind === 'barrel') {
        cube(c, d.x, d.y, 0, 25, 25, 34, '#a66540');
        cube(c, d.x, d.y, 10, 27, 27, 4, '#434b3b');
        cube(c, d.x, d.y, 28, 27, 27, 4, '#434b3b');
        c.fillStyle = '#e9be70';
        c.fillRect(d.x - 4, d.y - 27, 8, 10);
    } if (d.kind === 'wall') {
        this.wall([d.x-20,d.y-20,40,40],{accent:'#e3c17b'});
        c.strokeStyle='#495b4e';c.lineWidth=2;c.strokeRect(d.x-14,d.y-50,28,26);
    } if (d.kind === 'mine') {
        cube(c, d.x, d.y, 0, 22, 22, 5, '#777d4f');
        c.fillStyle = d.armed > 0 ? '#b9ba98' : Math.sin(this.time * 8) > 0 ? '#f1ca71' : '#985b3a';
        c.fillRect(d.x - 2, d.y - 7, 4, 4);
    } if (d.kind === 'turret') {
        cube(c, d.x, d.y, 0, 30, 28, 12, '#43564a');
        cube(c, d.x, d.y, 12, 18, 18, 17, '#a5ab83', d.angle);
        cube(c, d.x + Math.cos(d.angle) * 16, d.y + Math.sin(d.angle) * 16, 26, 32, 7, 7, '#37443a', d.angle);
        c.fillStyle = d.ammo > 0 ? '#d6ec7d' : '#a97861';
        c.fillRect(d.x - 3, d.y - 26, 6, 4);
    } if (d.hp < d.maxHp) {
        c.fillStyle = '#2b352b';
        c.fillRect(d.x - 17, d.y - 46, 34, 3);
        c.fillStyle = '#cad894';
        c.fillRect(d.x - 17, d.y - 46, 34 * d.hp / d.maxHp, 3);
    } }
    draw(state, map, dt = 0, menu = false) { this.state = state; this.time += dt; if (map.id !== this.mapId)
        this.makeFloor(map); const c = this.c, w = this.w, h = this.h, dpr = this.dpr; this.scale = menu ? Math.max(w / 1440, h / 950) : (w < h ? Math.max(w / 760, h / 1260) : Math.max(w / 1680, h / 1080)); const vw = w / this.scale, vh = h / this.scale, p = state.player; const tx = menu ? 950 : clamp(p.x + Math.cos(p.angle) * 20, Math.min(vw / 2, WORLD.w / 2), Math.max(WORLD.w - vw / 2, WORLD.w / 2)); const ty = menu ? 550 : clamp(p.y + Math.sin(p.angle) * 16, Math.min(vh / 2, WORLD.h / 2), Math.max(WORLD.h - vh / 2, WORLD.h / 2)); this.cx += (tx - this.cx) * Math.min(1, dt * 9); this.cy += (ty - this.cy) * Math.min(1, dt * 9); this.shake = Math.max(0, this.shake - dt * 25); const shake = this.settings.shake ? this.shake : 0; this.tx = w / 2 - this.cx * this.scale + (Math.random() - .5) * shake; this.ty = h / 2 - this.cy * this.scale + (Math.random() - .5) * shake; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#242e29'; c.fillRect(0, 0, w, h); c.translate(this.tx, this.ty); c.scale(this.scale, this.scale); c.drawImage(this.floor, 0, 0); if (this.settings.blood)
        for (const m of state.marks) {
            c.save();
            c.translate(m.x, m.y);
            c.rotate(m.seed * 6.28);
            const ps = [];
            for (let i = 0; i < 9; i++) {
                const a = i * Math.PI * 2 / 9, r = m.size * (.55 + ((i * 7 + m.seed * 5) % 3) / 5);
                ps.push([Math.cos(a) * r, Math.sin(a) * r * .72]);
            }
            poly(c, ps, '#633d32aa');
            c.restore();
        } for (const d of state.pickups) {
        const bob = Math.sin(this.time * 4 + d.x) * 2;
        const tint = pickupTint(d.kind);
        cube(c, d.x, d.y, 4 + bob, 20, 17, 15, tint);
        c.fillStyle = d.kind === 'health' ? '#8c5544' : '#28352e';
        c.fillRect(d.x - 5, d.y - 19 - bob, 10, 4);
        if (d.kind === 'health')
            c.fillRect(d.x - 2, d.y - 22 - bob, 4, 10);
        else if (d.kind === 'grenade')
            c.fillRect(d.x - 3, d.y - 22 - bob, 6, 8);
        else if (d.kind === 'barrel')
            c.fillRect(d.x - 5, d.y - 22 - bob, 10, 8);
        else if (d.kind === 'mine')
            c.fillRect(d.x - 5, d.y - 18 - bob, 10, 3);
        else if (d.kind === 'wall')
            c.fillRect(d.x - 6, d.y - 20 - bob, 12, 4);
        else if (d.kind === 'turret')
            c.fillRect(d.x - 6, d.y - 22 - bob, 12, 6);
    }
    if(state.phase==='prep' && this.placement && state.inventory[state.build]>0) {
      const q=this.placement;c.save();c.strokeStyle=q.valid?'#d5ed82':'#ef9277';c.lineWidth=2;
      c.fillStyle=q.valid?'#d5ed822b':'#ef92772b';c.setLineDash([6,4]);
      if(q.kind==='wall'||q.kind==='barrel'){c.fillRect(q.x-20,q.y-20,40,40);c.strokeRect(q.x-20,q.y-20,40,40);}
      else{c.beginPath();c.arc(q.x,q.y,q.r,0,Math.PI*2);c.fill();c.stroke();}
      c.restore();
    }
    const items = [...map.walls.map(w => ({ y: w[1] + w[3], wall: w })), ...state.defenses.map(d => ({ y: d.y+(d.kind==='wall'?20:0), def: d })), ...state.enemies.map(e => ({ y: e.y, enemy: e })), { y: p.y, player: p }].sort((a, b) => a.y - b.y); for (const i of items) {
        if (i.wall)
            this.wall(i.wall, map);
        else if (i.def)
            this.defense(i.def);
        else if (i.player) {
            if (state.phase === 'prep' || p.hurt <= 0 || Math.floor(this.time * 16) % 2 === 0)
                this.actor(p, true);
        }
        else
            this.actor(i.enemy);
    } c.lineCap = 'round'; for (const b of state.bullets) {
        c.strokeStyle = b.owner === 'turret' ? '#bee8c2' : '#f4e4ad';
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(b.x - b.vx * .018, b.y - b.vy * .018 - 28);
        c.lineTo(b.x, b.y - 28);
        c.stroke();
    } for (const b of state.projectiles) {
        const a = Math.atan2(b.vy, b.vx);
        if (b.kind === 'grenade') {
            const z = 12 + Math.sin(Math.PI * (1 - b.life / b.maxLife)) * 62;
            cube(c, b.x, b.y, z, 9, 9, 9, '#d3ba72');
        }
        else if (b.kind === 'rocket') {
            cube(c, b.x, b.y, 28, 18, 7, 7, '#c9b080', a);
            c.strokeStyle = '#efb168';
            c.lineWidth = 5;
            c.beginPath();
            c.moveTo(b.x, b.y - 30);
            c.lineTo(b.x - Math.cos(a) * 25, b.y - Math.sin(a) * 25 - 30);
            c.stroke();
        }
        else {
            c.fillStyle = '#f4c56d';
            c.beginPath();
            c.arc(b.x, b.y - 26, 8, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#e9854566';
            c.beginPath();
            c.arc(b.x, b.y - 26, 14, 0, Math.PI * 2);
            c.fill();
        }
    } for (const b of this.beams) {
        b.life -= dt;
        c.globalAlpha = clamp(b.life / .23, 0, 1);
        c.strokeStyle = '#8cccfa';
        c.lineWidth = 9;
        c.beginPath();
        c.moveTo(b.x, b.y - 28);
        c.lineTo(b.bx, b.by - 28);
        c.stroke();
        c.strokeStyle = '#f0fbff';
        c.lineWidth = 3;
        c.stroke();
    } c.globalAlpha = 1; this.beams = this.beams.filter(b => b.life > 0); for (const b of this.blasts) {
        b.life -= dt;
        const t = 1 - b.life / .4;
        c.globalAlpha = clamp(1 - t, 0, 1);
        c.fillStyle = t < .25 ? '#fff1bd' : '#eaa359';
        c.beginPath();
        c.arc(b.x, b.y - 12, b.r * Math.min(1, .25 + t * 1.4), 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#f7d68b';
        c.lineWidth = 4;
        c.beginPath();
        c.arc(b.x, b.y, b.r * (.3 + t), 0, Math.PI * 2);
        c.stroke();
    } c.globalAlpha = 1; this.blasts = this.blasts.filter(b => b.life > 0); for (const q of this.parts) {
        q.life -= dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vx *= Math.pow(.14, dt);
        q.vy *= Math.pow(.14, dt);
        c.globalAlpha = clamp(q.life / .25, 0, 1);
        c.fillStyle = q.color;
        c.fillRect(q.x, q.y, q.size, q.size);
    } c.globalAlpha = 1; this.parts = this.parts.filter(q => q.life > 0); c.font = 'bold 17px ui-monospace,monospace'; c.textAlign = 'center'; for (const t of this.texts) {
        t.life -= dt;
        t.y -= dt * 20;
        c.globalAlpha = clamp(t.life * 2, 0, 1);
        c.fillStyle = '#222c28';
        c.fillText(t.text, t.x + 1, t.y + 2);
        c.fillStyle = t.color;
        c.fillText(t.text, t.x, t.y);
    } c.globalAlpha = 1; this.texts = this.texts.filter(t => t.life > 0); c.setTransform(dpr, 0, 0, dpr, 0, 0); if (!menu) {
        for (const e of state.enemies) {
            const x = e.x * this.scale + this.tx, y = e.y * this.scale + this.ty;
            if (x > 15 && x < w - 15 && y > 65 && y < h - 12)
                continue;
            const a = Math.atan2(y - h / 2, x - w / 2);
            const r = Math.min((w / 2 - 16) / Math.max(.01, Math.abs(Math.cos(a))), Math.max(30, h / 2 - 75) / Math.max(.01, Math.abs(Math.sin(a))));
            c.save();
            c.translate(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
            c.rotate(a);
            poly(c, [[5, 0], [-4, -3], [-4, 3]], e.kind === 'boss' ? '#efad75' : '#d1cd9d88');
            c.restore();
        }
        if (state.countdown > 0) {
            c.fillStyle = '#17211ce8';
            c.fillRect(w / 2 - 120, h / 2 - 66, 240, 108);
            c.textAlign = 'center';
            c.fillStyle = '#ddec91';
            c.font = '700 13px ui-monospace,monospace';
            c.fillText(state.wave % 5 === 0 ? 'WARDEN INBOUND' : `WAVE ${String(state.wave).padStart(2, '0')}`, w / 2, h / 2 - 32);
            c.fillStyle = '#f3f1df';
            c.font = '900 45px system-ui';
            c.fillText(String(Math.ceil(state.countdown)), w / 2, h / 2 + 18);
        }
    } const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .15, w / 2, h / 2, Math.max(w, h) * .66); v.addColorStop(0, '#09140e00'); v.addColorStop(1, '#09140e65'); c.fillStyle = v; c.fillRect(0, 0, w, h); this.flash = Math.max(0, this.flash - dt); if (this.flash > 0) {
        c.fillStyle = `rgba(174,65,42,${this.flash * .5})`;
        c.fillRect(0, 0, w, h);
    } }
}
export function miniMap(canvas, map, selected = false) { const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height; c.fillStyle = map.floor; c.fillRect(0, 0, w, h); const sx = w / WORLD.w, sy = h / WORLD.h; for (const b of map.walls) {
    c.fillStyle = '#313f36';
    c.fillRect(b[0] * sx + 2, b[1] * sy + 2, b[2] * sx, b[3] * sy);
    c.fillStyle = '#b4bca7';
    c.fillRect(b[0] * sx, b[1] * sy, b[2] * sx, b[3] * sy);
} c.fillStyle = '#e2ee95'; c.fillRect(map.spawn[0] * sx - 4, map.spawn[1] * sy - 4, 8, 8); c.fillStyle = '#e3a46c'; c.font = 'bold 11px ui-monospace,monospace'; c.textAlign = 'center'; const arrows = { N: ['↓', w / 2, 14], S: ['↑', w / 2, h - 5], W: ['→', 11, h / 2 + 4], E: ['←', w - 11, h / 2 + 4] }; for (const side of map.approaches || ['N', 'S', 'E', 'W']) {
    const [symbol, x, y] = arrows[side];
    c.fillText(symbol, x, y);
} c.strokeStyle = selected ? '#d5eb7b' : '#adb7a344'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2); }
export function gunSvg(id) { const color = (GUN[id] || GUN.pistol).color; const shapes = { pistol: '<path d="M27 23h57v12H52l-3 23H35l2-22H27z" fill="#aab6b0"/><path d="M28 18h65v13H28z" fill="#dae1db"/><path d="M28 20h61v3H28zM70 31h15v6H70z" fill="#43534b"/><path d="M36 37h14l-2 19H35z" fill="#745842"/>', smg: '<path d="M16 23h15v12H16zM27 19h67v17H27zM91 25h23v6H91z" fill="#97a695"/><path d="M30 36h11v18H29zM58 36h11v25H58z" fill="#354139"/><path d="M47 15h22v5H47zM53 12h11v5H53z" fill="#cbd4c1"/><path d="M77 24h3v7H77zM83 24h3v7H83z" fill="#20312b"/>', shotgun: '<path d="M7 28h33v13L8 48z" fill="#a7794e"/><path d="M37 24h61v10H37zM95 26h31v5H95z" fill="#c9cfc2"/><path d="M63 34h33v10H63z" fill="#ad7c4b"/><path d="M39 33h14l-3 19H40zM69 36v6M76 36v6M83 36v6M90 36v6" fill="#69523e" stroke="#69492d"/><path d="M44 19h13v5H44z" fill="#dce3d4"/>', carbine: '<path d="M7 24h24v18L7 48zM29 23h62v16H29zM89 26h37v7H89z" fill="#889990"/><path d="M32 38h12l-3 19H30zM60 39h16l-5 23H58z" fill="#37483f"/><path d="M45 15h29v9H45z" fill="#3d4f46"/><path d="M48 16h23v3H48zM80 25h4v11H80z" fill="#b5d4c3"/>', flamer: '<path d="M15 17h25v30H15z" fill="#b47947"/><path d="M14 22h27v5H14zM14 38h27v4H14z" fill="#35433a"/><path d="M43 22h53v18H43zM90 25h30v11H90z" fill="#cd9a64"/><path d="M46 40h12v18H45z" fill="#465446"/><path d="M33 45Q40 62 52 51" fill="none" stroke="#282f29" stroke-width="5"/><path d="M116 20h10v19H116z" fill="#e1c795"/><path d="M126 30l8-5-3 9z" fill="#ff9f58"/>', railgun: '<path d="M9 28h19v17H9zM26 20h70v22H26zM91 24h39v9H91z" fill="#8fa7ae"/><path d="M45 43h13v15H44z" fill="#354853"/><path d="M58 20v22M69 20v22M80 20v22M91 20v22" stroke="#8bdeff" stroke-width="4"/><path d="M49 14h26v6H49z" fill="#3c596a"/><path d="M105 18h6v21h-6z" fill="#d4f1f8"/>', launcher: '<path d="M14 17h94v26H14z" fill="#a6ab87"/><path d="M7 12h18v36H7zM103 11h19v38h-19z" fill="#647355"/><path d="M111 16h14v29h-14z" fill="#232f2b"/><path d="M38 43h13v16H37zM70 43h11v11H70z" fill="#353d30"/><path d="M32 19h63v5H32z" fill="#d6d9b6"/><path d="M68 11h18v6H68z" fill="#414a3c"/>', minigun: '<path d="M10 26h24v19H10zM26 19h46v29H26z" fill="#a3a886"/><path d="M68 19h55v7H68zM68 29h55v7H68zM68 39h55v7H68z" fill="#d3d6bc"/><path d="M91 17h8v32h-8zM113 17h11v32h-11z" fill="#596547"/><path d="M31 47h17v14H29zM44 13h28v7H44z" fill="#3d4c3c"/><path d="M35 22h10v23H35z" fill="#dfc66e"/>' }; return `<svg viewBox="0 0 140 68" aria-hidden="true"><ellipse cx="72" cy="60" rx="53" ry="4" fill="#070e0a55"/><g stroke="#1c2923" stroke-width="1" stroke-linejoin="round">${shapes[id] || shapes.pistol}</g><path d="M28 63h84" stroke="${color}" stroke-width="2" opacity=".7"/></svg>`; }

export function gearSvg(id) {
 const shapes={
  wall:'<path d="M36 22l48-13 27 15-49 14z" fill="#c2c6ad"/><path d="M36 22l26 16v28L36 48z" fill="#697e67"/><path d="M62 38l49-14v29L62 66z" fill="#91a080"/><path d="M62 51l49-14M86 31v14M75 48v14M99 40v16" fill="none" stroke="#394c3c" stroke-width="2"/>',
  barrel:'<path d="M46 14h44v45H46z" fill="#a66844"/><path d="M46 14l15-7h43l-14 7z" fill="#c39264"/><path d="M90 14l14-7v44l-14 8z" fill="#724a33"/><path d="M44 24h48v6H44zm0 20h48v6H44z" fill="#405342"/><path d="M61 31h13v11H61z" fill="#e8d187"/>',
  mine:'<path d="M36 35l34-14 34 14v13L70 60 36 48z" fill="#738250"/><path d="M36 35l34 13 34-13" fill="none" stroke="#c2cb92" stroke-width="3"/><path d="M67 24h7v10h-7z" fill="#eca377"/>',
  turret:'<path d="M37 50l32-11 34 11-34 11z" fill="#657c64"/><path d="M59 24h23v28H59z" fill="#aeb688"/><path d="M70 19h49v9H70zM56 17h23v16H56z" fill="#526c5c"/>',
  grenade:'<path d="M57 20h27l7 31-20 11-19-11z" fill="#929b65"/><path d="M62 9h14v13H62zM75 10h12v23H75z" fill="#d5ca8e"/>',
  heal:'<path d="M36 15h67v44H36z" fill="#c9d2ba"/><path d="M63 22h14v30H63zM54 30h32v14H54z" fill="#ad5d4a"/>',
  ammo:'<path d="M35 23h72v34H35zM40 15h62v9H40z" fill="#8c9c7d"/><path d="M47 29h7v20h-7zm18 0h7v20h-7zm18 0h7v20h-7z" fill="#e4cf87"/>'
 };
 return `<svg viewBox="0 0 140 72" aria-hidden="true"><g stroke="#2b3c30" stroke-width="1.2" stroke-linejoin="round">${shapes[id]||shapes.wall}</g></svg>`;
}
