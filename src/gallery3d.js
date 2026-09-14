import {Renderer} from './renderer3d.js';
import {MODEL_KINDS,MODEL_NAMES,createModelBlueprint} from './models3d.js';
const canvas=document.querySelector('#modelCanvas'),settings={blood:true,shake:false,quality:'high'};
let renderer;
try{renderer=new Renderer(canvas,settings,{stage:true,fixedCamera:true,hidePlayerRing:true,animateAll:true});}
catch(error){const el=document.querySelector('#failure');el.hidden=false;el.textContent='WebGL 2 could not start. Your game save is unchanged. Close other graphics-heavy tabs and reload.';throw error;}
const select=document.querySelector('#kind');select.innerHTML=MODEL_KINDS.map(k=>`<option value="${k}">${MODEL_NAMES[k]}</option>`).join('');
let kind='player',angle=.92,rotating=true,last=performance.now(),drag=null;
const stage={id:'model-stage',floor:'#596358',line:'#596358',name:'Model stage',flow:'',walls:[],approaches:[]};
function label(){document.querySelector('#modelName').textContent=MODEL_NAMES[kind];const b=createModelBlueprint(kind,'carbine');document.querySelector('#stats').textContent=b.pieces.length+' modeled pieces · same in-game mesh';}
select.addEventListener('change',()=>{kind=select.value;angle=.92;label();});
for(const [id,a] of [['front',Math.PI/2],['threequarter',.92],['back',-Math.PI/2]])document.querySelector('#'+id).onclick=()=>{angle=a;rotating=false;document.querySelector('#rotate').textContent='Rotate: off';};
document.querySelector('#rotate').onclick=e=>{rotating=!rotating;e.target.textContent='Rotate: '+(rotating?'on':'off');e.target.classList.toggle('active',rotating);};
document.querySelector('#blood').onclick=e=>{settings.blood=!settings.blood;e.target.textContent='Blood: '+(settings.blood?'on':'off');e.target.classList.toggle('active',settings.blood);};
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag=e.clientX;rotating=false;document.querySelector('#rotate').textContent='Rotate: off';};
canvas.onpointermove=e=>{if(drag===null)return;angle+=(e.clientX-drag)*.012;drag=e.clientX;};for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>drag=null);
window.addEventListener('resize',()=>renderer.resize());
label();
function frame(now){const dt=document.hidden?0:Math.min(.04,(now-last)/1000);last=now;if(!document.hidden){if(rotating)angle+=dt*.28;const state=renderer.focusModel(kind,angle);renderer.draw(state,stage,dt,true);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
if(['localhost','127.0.0.1'].includes(location.hostname))window.__models3d={renderer,setKind(k){select.value=k;kind=k;angle=.92;label();},setAngle(a){angle=a;rotating=false;document.querySelector('#rotate').textContent='Rotate: off';document.querySelector('#rotate').classList.remove('active');}};
