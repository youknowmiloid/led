# MILOID LED

Steuerung fuer ELK-BLEDOM LED-Baender ueber Web Bluetooth, direkt vom iPhone.

- `index.html` — die Steuerung (Farben, Helligkeit, eingebaute Modi, Messung)
- `sprosse0.html` — Test: haelt das Handy zwei Baender im Strobo-Takt?
- `sw.js` — speichert die Seite auf dem Geraet, damit sie ohne Netz laeuft

## Wichtig

Safari kann kein Web Bluetooth. Die Seite laeuft auf dem iPhone nur in
**[Bluefy](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055)**.

Bluefy weicht an vier Stellen von Chrome ab — wer hier etwas aendert, sollte das
kennen, sonst passiert auf dem Geraet gar nichts:

1. UUIDs immer als volle 128-Bit-Zeichenkette, nie als Zahl (`0xfff0`).
   Sonst wird die **ganze** `requestDevice`-Anfrage verweigert.
2. Kein `namePrefix`-Filter — damit bleibt die Geraeteliste leer.
   Stattdessen `acceptAllDevices: true`.
3. `writeValueWithoutResponse` fehlt in aelteren Fassungen. Schreibart beim
   Verbinden bestimmen statt fest verdrahten.
4. `device.id` kann fehlen. Nie ungeprueft benutzen.

Dazu: `writeValue()` wartet auf die Quittung des Bandes. Immer nur **ein**
Schreibvorgang gleichzeitig, sonst wirft iOS `GATT operation already in progress`.

## Aendern

Nach jeder Aenderung in `sw.js` die `FASSUNG` hochzaehlen. Sonst behalten die
Geraete die alte Version aus dem Speicher.
