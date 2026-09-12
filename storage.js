import {validState} from './engine.js';
export const DEFAULT_SETTINGS={autoFire:true,sound:true,volume:.35,blood:true,reducedMotion:false,zoom:1,touch:'auto'};
// Namespacing by path keeps this game's data separate from other GitHub Pages projects.
export class RunStore{
 constructor(storage=null,namespace=null){
  this.prefix=namespace||`deadblock.rooms.v1:${globalThis.location?.pathname.replace(/index\.html$/,'')||'/'}:`;
  this.tab=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;this.available=true;this.memory=null;this.memorySettings={};this.memoryRecords={};this.error='';
  try{this.storage=storage||globalThis.localStorage;this.storage.setItem(this.prefix+'probe','1');this.storage.removeItem(this.prefix+'probe');}catch{this.available=false;this.error='Browser storage is unavailable. This run cannot survive a reload.';}
 }
 key(k){return this.prefix+k;}
 get(k){if(!this.available)return null;try{return this.storage.getItem(this.key(k));}catch{this.available=false;this.error='Browser storage stopped responding.';return null;}}
 put(k,v){if(!this.available)return false;try{this.storage.setItem(this.key(k),v);return true;}catch{this.error='Autosave failed. Browser storage may be full or blocked.';return false;}}
 remove(k){if(!this.available)return false;try{this.storage.removeItem(this.key(k));return true;}catch{this.error='Browser storage could not be cleared.';return false;}}
 readJSON(k){try{return JSON.parse(this.get(k)||'null');}catch{return null;}}
 lease(){return this.readJSON('lease');}
 canAcquire(){const l=this.lease();return !l||l.tab===this.tab||Date.now()-l.at>9000;}
 acquire(runId){if(!this.available)return true;if(!this.canAcquire())return false;return this.put('lease',JSON.stringify({tab:this.tab,runId,at:Date.now()}));}
 owns(runId){if(!this.available)return true;const l=this.lease();return !!l&&l.tab===this.tab&&l.runId===runId&&this.get('epoch')===runId;}
 release(){const l=this.lease();if(l?.tab===this.tab)this.remove('lease');}
 load(){
  if(!this.available)return this.memory;
  const text=this.get('run');if(!text)return null;if(text.length>1000000){this.error='Saved data is too large to load.';return null;}
  try{const entry=JSON.parse(text);if(!validState(entry.state)||entry.state.runId!==this.get('epoch')){this.error='The saved run is invalid or was ended in another tab.';return null;}return entry;}catch{this.error='The saved run could not be read.';return null;}
 }
 start(state){
  if(!validState(state))return false;if(!this.acquire(state.runId))return false;
  if(this.available&&!this.put('epoch',state.runId)){this.release();return false;}
  this.memory={savedAt:Date.now(),state};this.save(state);return true;
 }
 save(state){
  if(!validState(state))return false;this.memory={savedAt:Date.now(),state};if(!this.available)return false;
  if(!this.owns(state.runId)){this.error='This run has been opened or ended in another tab.';return false;}
  const ok=this.put('run',JSON.stringify(this.memory));if(ok){this.put('lease',JSON.stringify({tab:this.tab,runId:state.runId,at:Date.now()}));this.error='';}return ok;
 }
 end(runId){
  this.memory=null;
  // The epoch tombstone prevents an old tab from bringing a dead run back.
  if(this.get('epoch')===runId){this.put('epoch',`ended:${runId}`);this.remove('run');}
  this.release();
 }
 settings(){const raw=this.readJSON('settings')||this.memorySettings;const s={...DEFAULT_SETTINGS};for(const k of ['autoFire','sound','blood','reducedMotion'])if(typeof raw[k]==='boolean')s[k]=raw[k];if(Number.isFinite(raw.volume))s.volume=Math.max(0,Math.min(1,raw.volume));if([.8,1,1.2].includes(raw.zoom))s.zoom=raw.zoom;if(['auto','on','off'].includes(raw.touch))s.touch=raw.touch;return s;}
 saveSettings(s){this.memorySettings=s;this.put('settings',JSON.stringify(s));}
 records(){const r=this.readJSON('records')||this.memoryRecords;return{score:Number.isFinite(r.score)?r.score:0,wave:Number.isFinite(r.wave)?r.wave:0,kills:Number.isFinite(r.kills)?r.kills:0,combo:Number.isFinite(r.combo)?r.combo:0,runs:Number.isFinite(r.runs)?r.runs:0};}
 record(s){const r=this.records();r.runs++;r.score=Math.max(r.score,s.score);r.wave=Math.max(r.wave,s.wave);r.kills=Math.max(r.kills,s.kills);r.combo=Math.max(r.combo,s.bestCombo);this.memoryRecords=r;this.put('records',JSON.stringify(r));return r;}
}
