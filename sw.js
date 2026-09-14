// Only this project's caches are touched. Saves live separately in localStorage.
const PREFIX='deadblock-survival-',CACHE=PREFIX+'1.4.0';
const FILES=['./models.html','./src/gallery3d.js','./src/models3d.js','./src/camera3d.js','./src/renderer3d.js','./vendor/three.module.min.js','./vendor/three.core.min.js','./','./index.html','./styles.css','./src/characters.js','./src/model.js','./src/defenses.js','./src/data.js','./src/engine.js','./src/storage.js','./src/renderer.js','./src/audio.js','./src/app.js','./manifest.webmanifest','./icon.svg','./icon.png','./assets/icon-180-v1.3.png','./assets/icon-192-v1.3.png','./assets/icon-512-v1.3.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(path=>new Request(path,{cache:'reload'})))).then(()=>self.skipWaiting())));
// Activate the complete cache immediately, but never reload a running game.
// Loaded game modules remain in memory; the next navigation gets the new build.
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 // The update page must remain reachable even under a previously cached game.
 if(url.pathname.endsWith('/update.html')||url.pathname.endsWith('/release.json'))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(req.mode==='navigate')return await cache.match(url.pathname.endsWith('/models.html')?'./models.html':'./index.html')||fetch(req);
  return await cache.match(req,{ignoreSearch:true})||fetch(req);
 })());
});
