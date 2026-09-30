/* Service Worker — speichert die Seite auf dem Geraet, damit sie im Club auch
   ohne Netz laeuft.

   WICHTIG beim Aendern: FASSUNG hochzaehlen. Sonst behaelt das Handy ewig die
   alte Version, weil hier bewusst zuerst aus dem Speicher geliefert wird
   (Speicher zuerst = laeuft garantiert ohne Netz, dafuer nur auf Ansage neu).  */

const FASSUNG = "v1";
const SPEICHER = "miloid-led-" + FASSUNG;

const DATEIEN = [
  "./",
  "./index.html",
  "./sprosse0.html",
  "./dauerhaft.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SPEICHER)
      .then(function (c) { return c.addAll(DATEIEN); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (namen) {
        return Promise.all(namen
          .filter(function (n) { return n !== SPEICHER; })
          .map(function (n) { return caches.delete(n); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  const u = new URL(e.request.url);
  // Nur eigene GET-Anfragen. Die Rueckmeldung an den PC ist ein POST und
  // muss durchlaufen, sonst faengt der Speicher sie ab.
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function (treffer) {
      if (treffer) return treffer;
      return fetch(e.request).then(function (antwort) {
        if (antwort && antwort.ok && antwort.type === "basic") {
          const kopie = antwort.clone();
          caches.open(SPEICHER).then(function (c) { c.put(e.request, kopie); });
        }
        return antwort;
      }).catch(function () {
        // Kein Netz und nichts im Speicher: wenigstens die Startseite liefern.
        return caches.match("./index.html");
      });
    })
  );
});
