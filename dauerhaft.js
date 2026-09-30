"use strict";
/* dauerhaft.js — damit die App weiterlaeuft, wenn MILOID das Handy weglegt.
 *
 * Die harte Grenze zuerst, damit niemand daran vorbeiplant:
 * WKWebView (und damit Bluefy) HAELT JAVASCRIPT AN, sobald die App in den
 * Hintergrund geht oder der Bildschirm ausgeht. Keine Timer, keine
 * BLE-Schreibbefehle, kein Mikrofon. Das ist Apples Entscheidung, kein
 * Fehler im Code, und keine Zeile JavaScript umgeht das.
 *
 * Was deshalb wirklich hilft, in dieser Reihenfolge:
 *
 *  1. WACH HALTEN — der Bildschirm geht gar nicht erst aus. Das loest den
 *     haeufigsten Fall: Handy liegt am Pult, sperrt sich nach 30 s selbst,
 *     Licht steht. Mit Wake Lock passiert das nicht mehr.
 *  2. RUECKFALL — geht es doch in den Hintergrund, bekommt das Band VORHER
 *     einen eingebauten Controller-Modus. Der laeuft in der Hardware weiter,
 *     ohne Handy, ohne Verbindung. Das Band steht dann nicht dumm auf einer
 *     Farbe, sondern animiert weiter.
 *  3. ZURUECKHOLEN — beim Aufwachen Verbindung pruefen und notfalls neu
 *     aufbauen, ohne dass MILOID irgendwas antippen muss.
 */

const Dauerhaft = (() => {
  let wakeLock = null;
  let video = null;
  let konf = null;
  const zuhoerer = [];

  function melde(t) { zuhoerer.forEach(f => { try { f(t); } catch (e) {} }); }

  /* --- 1. Wach halten ------------------------------------------------- */
  async function wachAn() {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => melde("Wake Lock wurde freigegeben"));
        melde("Bildschirm wird wachgehalten (Wake Lock)");
        return true;
      }
    } catch (e) {
      melde("Wake Lock abgelehnt: " + e.message);
    }
    // Rueckfall fuer aeltere iOS-Fassungen: ein winziges, stummes Video in
    // Dauerschleife. Solange Video laeuft, sperrt iOS den Bildschirm nicht.
    try {
      if (!video) {
        video = document.createElement("video");
        video.setAttribute("playsinline", "");
        video.muted = true; video.loop = true;
        video.style.cssText = "position:fixed;width:1px;height:1px;opacity:.01;pointer-events:none;bottom:0;left:0";
        // 1 Frame schwarzes MP4, base64 — kein externer Abruf noetig.
        video.src = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAr1tZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1NSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMTggLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwAgAAAAA9liIQAK//+9dP7AAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAAAA";
        document.body.appendChild(video);
      }
      await video.play();
      melde("Bildschirm wird wachgehalten (Video-Rueckfall)");
      return true;
    } catch (e) {
      melde("Wachhalten geht hier nicht: " + e.message);
      return false;
    }
  }

  function wachAus() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
    if (video) { try { video.pause(); } catch (e) {} }
    melde("Wachhalten aus");
  }

  /* --- 2. Rueckfall: Band laeuft in der Hardware weiter ---------------- */
  async function inDenHintergrund() {
    if (!konf || !konf.rueckfall) return;
    // Hier bleiben typisch nur Millisekunden, bevor WKWebView zumacht.
    // Darum ohne Quittung und ohne await auf alles - einmal raus ist besser
    // als sauber und zu spaet.
    for (const b of konf.baender()) {
      if (!b) continue;
      // Bluefy hat nur writeValue(). b.art haelt fest, welche Methode es hier gibt.
      try { b.merkmal[b.art || "writeValue"](konf.rueckfall); } catch (e) {}
    }
    melde("in den Hintergrund — Rueckfallmodus ans Band geschickt");
  }

  /* --- 3. Zurueckholen ------------------------------------------------- */
  async function ausDemHintergrund() {
    melde("zurueck im Vordergrund");
    if (konf && konf.wach) wachAn();          // Wake Lock geht beim Sperren verloren
    if (!konf) return;
    for (const b of konf.baender()) {
      if (!b || !b.geraet) continue;
      if (b.geraet.gatt.connected) continue;
      try {
        melde("Verbindung war weg — baue neu auf …");
        await b.geraet.gatt.connect();
        const dienst = await b.geraet.gatt.getPrimaryService(konf.dienst);
        b.merkmal = await dienst.getCharacteristic(konf.schreib);
        // Nach dem Neuaufbau ist das Merkmal ein anderes Objekt - Schreibart neu bestimmen.
        if (konf.schreibweise) b.art = konf.schreibweise(b.merkmal);
        melde("wieder verbunden");
      } catch (e) {
        melde("Wiederverbinden fehlgeschlagen: " + (e && (e.message || e.name) || String(e)));
      }
    }
    if (konf.zurueck) konf.zurueck();
  }

  function start(einstellungen) {
    konf = einstellungen;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") inDenHintergrund();
      else ausDemHintergrund();
    });
    if (konf.wach) wachAn();
  }

  return { start, wachAn, wachAus, beiMeldung: (f) => zuhoerer.push(f) };
})();
