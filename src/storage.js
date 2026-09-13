import { validState } from './engine.js';
// Namespaced to this app: neighboring GitHub Pages projects are not touched.
export const SAVE_KEY='deadblock.survival.run.v1';
const SETTINGS_KEY='deadblock.survival.settings.v1', RECORD_KEY='deadblock.survival.record.v1';
export class SaveStore {
  constructor(storage=globalThis.localStorage) { this.storage=storage;this.owner=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;this.error='';this.conflict=false; }
  read() {
    try { const raw=this.storage.getItem(SAVE_KEY);if(!raw)return null;const r=JSON.parse(raw);if(r.version!==1||!validState(r.data))throw new Error('Invalid save');return r; }
    catch { this.error='This save cannot be read. Start a new run to replace it.';return null; }
  }
  put(record) { try{this.storage.setItem(SAVE_KEY,JSON.stringify(record));this.error='';return true;}catch{this.error='Autosave is unavailable. Storage may be full or blocked. Keep this window open.';return false;} }
  start(game) { this.conflict=false;return this.put({version:1,owner:this.owner,savedAt:Date.now(),data:game.snapshot()}); }
  claim() { const r=this.read();if(!r)return null;this.conflict=false;r.owner=this.owner;r.savedAt=Date.now();this.put(r);return r.data; }
  write(game) {
    if(game.s.phase==='dead')return this.clear(game.s.id);
    const r=this.read();
    if(r&&(r.owner!==this.owner||r.data.id!==game.s.id)){this.conflict=true;return false;}
    if(!r&&!this.error){this.conflict=true;return false;}
    return this.put({version:1,owner:this.owner,savedAt:Date.now(),data:game.snapshot()});
  }
  clear(id) {
    try{const r=this.read();if(r&&id&&(r.owner!==this.owner||r.data.id!==id)){this.conflict=true;return false;}this.storage.removeItem(SAVE_KEY);this.error='';return true;}
    catch{this.error='Could not clear the saved run. Browser storage is blocked.';return false;}
  }
  record(score,wave,kills) {
    let best={score:0,wave:0,kills:0};try{best={...best,...JSON.parse(this.storage.getItem(RECORD_KEY)||'{}')};if(score!==undefined){best.score=Math.max(best.score,score);best.wave=Math.max(best.wave,wave);best.kills=Math.max(best.kills,kills);this.storage.setItem(RECORD_KEY,JSON.stringify(best));}}catch{}return best;
  }
  settings(value) {
    const defaults={sound:true,blood:true,shake:true,quality:'high'};
    try{if(value)this.storage.setItem(SETTINGS_KEY,JSON.stringify(value));const saved=JSON.parse(this.storage.getItem(SETTINGS_KEY)||'{}');return Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,saved[k]??v]));}catch{return value||defaults;}
  }
}
