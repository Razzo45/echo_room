self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }

  if (data.type !== 'room_ready') {
    return;
  }

  const title = 'Your Echo Room is ready';
  const options = {
    body: `${data.questName} in ${data.eventName} now has enough people to start.`,
    data: {
      roomId: data.roomId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const roomId = event.notification?.data?.roomId;
  if (!roomId) {
    return;
  }

  const url = `/room/${roomId}/play`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

if(!self.define){let e,s={};const t=(t,n)=>(t=new URL(t+".js",n).href,s[t]||new Promise(s=>{if("document"in self){const e=document.createElement("script");e.src=t,e.onload=s,document.head.appendChild(e)}else e=t,importScripts(t),s()}).then(()=>{let e=s[t];if(!e)throw new Error(`Module ${t} didn’t register its module`);return e}));self.define=(n,a)=>{const i=e||("document"in self?document.currentScript.src:"")||location.href;if(s[i])return;let c={};const r=e=>t(e,i),u={module:{uri:i},exports:c,require:r};s[i]=Promise.all(n.map(e=>u[e]||r(e))).then(e=>(a(...e),c))}}define(["./workbox-4754cb34"],function(e){"use strict";importScripts(),self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"/ICONS.md",revision:"4c9789683ea6cd8ee0f72bf4d4c0aa05"},{url:"/_next/app-build-manifest.json",revision:"a85cda9fcecc629a9118410490825b75"},{url:"/_next/static/Lrw_thgOASdPG_lPz4veu/_buildManifest.js",revision:"c155cce658e53418dec34664328b51ac"},{url:"/_next/static/Lrw_thgOASdPG_lPz4veu/_ssgManifest.js",revision:"b6652df95db52feb4daf4eca35380933"},{url:"/_next/static/chunks/117-76511fc2f4bdae8f.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/145-fc18a2cb2ce0d16a.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/448-3dd26c2568e93df9.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/_not-found/page-e769e465c85fdd6e.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/admin/audit-log/page-379eea83f946833b.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/admin/config/page-ba7d3bde466d0372.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/admin/events/page-6e221326ca0feb59.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/admin/login/page-1764157f0e74dfdf.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/admin/organisers/page-c1d652ae7a9d7dc4.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/admin/page-e437b9a9bc60ad45.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/admin/participants/page-d95e84cfeb87d8a5.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/admin/retention/page-b01d7c5fead2fc37.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/admin/rooms/page-38aaf75f7f738680.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/artifact/%5Bid%5D/page-e96f5672380a027a.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/badges/page-3183c7752530e364.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/district/page-f7457b76ae34eb54.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/layout-759c6853983eb082.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/me/page-1ee556d3897219d3.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/organiser/archived-artifact/%5Bid%5D/page-ec63c27c8da333b7.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/organiser/dashboard/page-977ad5b96b52f537.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/organiser/events/%5Bid%5D/page-e986402211eb9dee.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/organiser/events/new/page-7f100a825f183aad.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/organiser/insights/page-c2c0b592348c7780.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/organiser/page-37aac58bb654c8b9.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/organiser/quests/%5Bid%5D/page-5b9c74e6466aa9db.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/page-b57bb1a2c53f269c.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/people/page-2d59438643d77cbc.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/profile/page-26236b8ed8bb6b4b.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/room/%5Bid%5D/page-2c53d0e7ac2811b2.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/room/%5Bid%5D/play/page-9f7041f493347eb4.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/app/world/page-6113ce4411c30819.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/fd9d1056-5f55067fad1d0619.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/framework-d1703057b07599d4.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/main-app-b4153f3f32603193.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/main-b5649c7e190e03f9.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/pages/_app-72b849fbd24ac258.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/pages/_error-7ba65e1336b92748.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/chunks/polyfills-42372ed130431b0a.js",revision:"846118c33b2c0e922d7b3a7676f81f6f"},{url:"/_next/static/chunks/webpack-c81f7fd28659d64f.js",revision:"Lrw_thgOASdPG_lPz4veu"},{url:"/_next/static/css/d1ef7214bcbff42f.css",revision:"d1ef7214bcbff42f"},{url:"/city-district.png",revision:"594f148934e71fc72599ea6e11f21931"},{url:"/manifest.json",revision:"f6981065782bb6570f9ae5d0d3c731ad"}],{ignoreURLParametersMatching:[]}),e.cleanupOutdatedCaches(),e.registerRoute("/",new e.NetworkFirst({cacheName:"start-url",plugins:[{cacheWillUpdate:async({request:e,response:s,event:t,state:n})=>s&&"opaqueredirect"===s.type?new Response(s.body,{status:200,statusText:"OK",headers:s.headers}):s}]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,new e.CacheFirst({cacheName:"google-fonts-webfonts",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:31536e3})]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,new e.StaleWhileRevalidate({cacheName:"google-fonts-stylesheets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,new e.StaleWhileRevalidate({cacheName:"static-font-assets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,new e.StaleWhileRevalidate({cacheName:"static-image-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/image\?url=.+$/i,new e.StaleWhileRevalidate({cacheName:"next-image",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp3|wav|ogg)$/i,new e.CacheFirst({cacheName:"static-audio-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp4)$/i,new e.CacheFirst({cacheName:"static-video-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:js)$/i,new e.StaleWhileRevalidate({cacheName:"static-js-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:css|less)$/i,new e.StaleWhileRevalidate({cacheName:"static-style-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/data\/.+\/.+\.json$/i,new e.StaleWhileRevalidate({cacheName:"next-data",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:json|xml|csv)$/i,new e.NetworkFirst({cacheName:"static-data-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(({url:e})=>{if(!(self.origin===e.origin))return!1;const s=e.pathname;return!s.startsWith("/api/auth/")&&!!s.startsWith("/api/")},new e.NetworkFirst({cacheName:"apis",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:16,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(({url:e})=>{if(!(self.origin===e.origin))return!1;return!e.pathname.startsWith("/api/")},new e.NetworkFirst({cacheName:"others",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(({url:e})=>!(self.origin===e.origin),new e.NetworkFirst({cacheName:"cross-origin",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:3600})]}),"GET")});
