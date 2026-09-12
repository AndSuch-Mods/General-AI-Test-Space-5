// A release is cached as a unit. Never replace files underneath an active run.
const ROOT=new URL('./',self.location.href);
const PREFIX=`deadblock-rooms:${ROOT.pathname}:`;
const CACHE=PREFIX+'1.0.0';
const FILES=['./','./index.html','./styles.css','./app.js','./data.js','./engine.js','./render.js','./storage.js','./audio.js','./manifest.webmanifest','./icon.svg','./icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(p=>new Request(new URL(p,ROOT),{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(request.mode==='navigate'){const saved=await cache.match(new URL('index.html',ROOT));if(saved)return saved;return fetch(request);}
  const saved=await cache.match(request,{ignoreSearch:true});if(saved)return saved;
  return fetch(request);
 })());
});
