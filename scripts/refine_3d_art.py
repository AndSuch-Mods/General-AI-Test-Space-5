"""Refine the real game meshes after inspecting CI renders, then remove on release."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'src/models3d.js';s=p.read_text()
if "tag:'surface-layer'" not in s:
 s=s.replace("box('head','eye-socket',side*5.5,10.5,11.4,7.5,5.8,1,'#302a21',.4);", "box('head','eye-socket',side*5.5,10.5,12.1,7.5,5.8,1,'#302a21',.4);\n  if(human)box('head','eye-white',side*5.5,10.5,12.8,5.8,3.6,.3,'#dcdac4',.08);")
 s=s.replace("box('head','eye',side*5.5,10.5,12.05,human?3.2:4.6,2.8,.32", "box('head','eye',side*5.5,10.5,13.25,human?2.8:4.9,3.3,.32")
 s=s.replace("box('head','brow',side*5.5,14,12.3,8,3.2,3", "box('head','brow',side*5.5,15,12.1,8,2.5,1.8")
 s=s.replace("box('head','jaw',0,-3.5,2,hw-3,4,21", "box('head','jaw',0,human?-3.5:-7.3,2,hw-3,4,21")
 s=s.replace("box('head','mouth-cavity',0,.6,11.35,demon?14:12,7.8,1.2", "box('head','mouth-cavity',0,-.6,11.55,demon?14:12,11.5,1.2")
 s=s.replace("row?3.25:-2,12.2,1.8,demon?(row?3.9:3.5):2.1", "row?3.8:-5,12.6,1.8,demon?2.8:2.2")
 s=s.replace("tile('head','tongue',0,-1,12.05,3.1,1.8", "tile('head','tongue',0,-3.3,12.3,3.1,1.8")
 s=s.replace("tile('head','mouth',0,1.8,13,6,1.6,'#493528');", "box('head','muzzle-plane',0,1.4,11.5,13,6,3,p.skin,.55);\n  tile('head','mouth',0,1.8,13.15,6,1.6,'#493528');")
 needle=" if(human)buildWeapon(box,weapon);"
 assert needle in s
 detail="""
 // Deterministic relief patches break up broad faces without using a texture
 // image or adding one draw call per patch. Never use the simulation RNG.
 const textured=new Set(['torso','belly','cranium','upper-arm','forearm','thigh','shin','helmet-crown','helmet-top','helmet-sidepanel','backpack','pack-pocket','pauldron','bracer','pectoral','deltoid','overalls-bib']);
 let surfaceSeed=kind.split('').reduce((n,ch)=>n*31+ch.charCodeAt(0),173)>>>0;
 const surfaceRandom=()=>{surfaceSeed=(Math.imul(surfaceSeed,1664525)+1013904223)>>>0;return surfaceSeed/4294967296;};
 for(const parent of [...pieces]){
  if(!textured.has(parent.tag))continue;
  for(const axis of [0,1,2])for(const side of [-1,1]){
   if(axis===1&&side<0)continue;
   if(parent.tag==='cranium'&&axis===2&&side>0)continue;
   const axes=[0,1,2].filter(i=>i!==axis),u=axes[0],v=axes[1];
   const usableU=parent.size[u]-2*(parent.bevel+.5),usableV=parent.size[v]-2*(parent.bevel+.5);
   if(usableU<3||usableV<3)continue;
   const nu=Math.min(7,Math.max(1,Math.floor(usableU/3.5))),nv=Math.min(7,Math.max(1,Math.floor(usableV/3.5)));
   for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
    if(surfaceRandom()>.29)continue;
    const pos=[0,0,0],size=[0,0,0];
    pos[axis]=side*(parent.size[axis]/2+.08);pos[u]=(-.5+(i+.5)/nu)*usableU;pos[v]=(-.5+(j+.5)/nv)*usableV;
    size[axis]=.2;size[u]=usableU/nu*.90;size[v]=usableV/nv*.90;
    const rotation=parent.rotation||[0,0,0],pt=new THREE.Vector3(...pos).applyEuler(new THREE.Euler(...rotation)).add(new THREE.Vector3(...parent.position));
    const tint=new THREE.Color(parent.color).multiplyScalar(.67+surfaceRandom()*.45).getHexString();
    pieces.push({bone:parent.bone,tag:'surface-layer',shape:'microbox',position:pt.toArray(),size,color:'#'+tint,bevel:.04,rotation:[...rotation],material:parent.material});
   }
  }
 }
"""
 s=s.replace(needle,detail+needle)
 s=s.replace("piece.shape==='cone'?new THREE.ConeGeometry", "piece.shape==='microbox'?new THREE.BoxGeometry(...piece.size).toNonIndexed():piece.shape==='cone'?new THREE.ConeGeometry")
 p.write_text(s)
p=root/'src/renderer3d.js';s=p.read_text().replace('toneMappingExposure=1.35','toneMappingExposure=1.08').replace("'#3b392f',2.05","'#3b392f',1.65").replace("'#ffdfb0',3.2","'#ffdfb0',2.8")
s=s.replace("(this.w/this.h)*245","(this.w/this.h)*(kind==='boss'?245:kind==='brute'?185:160)")
p.write_text(s)
p=root/'src/gallery3d.js';s=p.read_text().replace("setAngle(a){angle=a;rotating=false;}","setAngle(a){angle=a;rotating=false;document.querySelector('#rotate').textContent='Rotate: off';document.querySelector('#rotate').classList.remove('active');}")
p.write_text(s)
p=root/'tests/browser.py';s=p.read_text();needle="     assert page.evaluate('__deadblock.renderer.metrics.triangles')>1000";s=s.replace(needle,"     page.wait_for_function('window.__deadblock?.renderer.metrics?.triangles>1000')\n"+needle);p.write_text(s)
p=root/'src/app.js';s=p.read_text().replace("'Low detail reduces particles on older devices.'","'Low detail lowers render resolution and disables dynamic shadows.'");p.write_text(s)
p=root/'README.md';s=p.read_text().replace('120–195 separately authored pieces before batching','120–195 primary modeled pieces plus smaller surface-relief patches before batching');p.write_text(s)
print('Applied visual refinements and first-frame synchronization')
