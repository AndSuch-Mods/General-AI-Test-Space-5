// This worker only caches this project. It never touches another app's caches.
const PREFIX='deadblock-survival-',CACHE=PREFIX+'1.0.0';
const FILES=['./','./index.html','./styles.css','./src/data.js','./src/engine.js','./src/storage.js','./src/renderer.js','./src/audio.js','./src/app.js','./manifest.webmanifest','./icon.svg','./icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
// Updates wait for old game windows to close, rather than replacing code mid-run.
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(req.mode==='navigate')return await cache.match('./index.html')||fetch(req);
    const saved=await cache.match(req,{ignoreSearch:true});
    return saved||fetch(req);
  })());
});
