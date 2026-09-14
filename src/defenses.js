import {circleRect, segmentRect, segmentCircle} from './data.js';
export const DEFENSE_LIMIT = 64;
export const defenseBox = d => [d.x - 20, d.y - 20, 40, 40];
export function defenseTouches(d, x, y, radius = 0) {
  return d.kind === 'wall' ? circleRect(x, y, radius, defenseBox(d))
    : Math.hypot(x - d.x, y - d.y) < radius + d.r;
}
export function defenseHit(d, ax, ay, bx, by, pad = 0) {
  return d.kind === 'wall' ? segmentRect(ax, ay, bx, by, defenseBox(d), pad)
    : segmentCircle(ax, ay, bx, by, d.x, d.y, d.r + pad);
}
export function defensesOverlap(a, b) {
  if(a.kind === 'wall' && b.kind === 'wall')
    return Math.abs(a.x - b.x) < 39.5 && Math.abs(a.y - b.y) < 39.5;
  if(a.kind === 'wall')return defenseTouches(a, b.x, b.y, b.r + 1);
  if(b.kind === 'wall')return defenseTouches(b, a.x, a.y, a.r + 1);
  return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + 1;
}
export function placementCandidate(state) {
  const p=state.player, kind=state.build;
  let x=p.x+Math.cos(p.angle)*70, y=p.y+Math.sin(p.angle)*70;
  if(kind === 'barrel' || kind === 'wall') {
    x=Math.round((x-20)/40)*40+20;
    y=Math.round((y-20)/40)*40+20;
  }
  return {kind,x,y,r:kind==='wall'?28.3:kind==='turret'?21:17};
}
