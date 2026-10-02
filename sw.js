/* Service Worker — speichert die Seite auf dem Geraet, damit sie im Club auch
   ohne Netz laeuft.

   Zwei verschiedene Wege, mit Absicht:
   - Seiten (HTML): NETZ zuerst, mit 3 s Geduld, danach Speicher. Sonst haengt
     das Handy ewig auf einer alten Fassung. Ausserdem faengt ein Captive Portal
     im Club Anfragen ab und schickt eine Anmeldeseite zurueck — die darf auf
     keinen Fall als "die App" im Speicher landen.
   - Alles andere (Bilder, Skripte): Speicher zuerst, das ist schnell und
     ueberlebt jedes Funkloch.

   WICHTIG beim Aendern: FASSUNG hochzaehlen.                                   */

const FASSUNG = "v12";
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

// Ist die Antwort brauchbar, oder ist sie eine Umleitung / Portalseite?
function brauchbar(a) {
  return !!a && a.ok && !a.redirected && a.type === "basic";
}

function ablegen(anfrage, antwort) {
  if (!brauchbar(antwort)) return;
  const kopie = antwort.clone();
  caches.open(SPEICHER).then(function (c) { c.put(anfrage, kopie); });
}

// Netz, aber nicht ewig warten. Im Club haengt eine Anfrage gern minutenlang,
// statt sauber fehlzuschlagen.
function netzMitGeduld(anfrage, ms) {
  return new Promise(function (fertig, daneben) {
    const uhr = setTimeout(function () { daneben(new Error("zu langsam")); }, ms);
    fetch(anfrage).then(
      function (a) { clearTimeout(uhr); fertig(a); },
      function (f) { clearTimeout(uhr); daneben(f); }
    );
  });
}

self.addEventListener("fetch", function (e) {
  const u = new URL(e.request.url);
  // Nur eigene GET-Anfragen. Die Rueckmeldung an den PC ist ein POST und
  // muss durchlaufen, sonst faengt der Speicher sie ab.
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;

  const istSeite = e.request.mode === "navigate" ||
    (e.request.headers.get("accept") || "").indexOf("text/html") !== -1;

  if (istSeite) {
    e.respondWith(
      netzMitGeduld(e.request, 3000).then(function (antwort) {
        if (brauchbar(antwort)) { ablegen(e.request, antwort); return antwort; }
        // Umleitung oder Fehlerseite: die gespeicherte Fassung ist besser.
        return caches.match(e.request).then(function (t) { return t || antwort; });
      }).catch(function () {
        return caches.match(e.request).then(function (t) {
          return t || caches.match("./index.html");
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (treffer) {
      if (treffer) return treffer;
      return fetch(e.request).then(function (antwort) {
        ablegen(e.request, antwort);
        return antwort;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
