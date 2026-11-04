# Herr Biggie: Website mit Online-Shop

Website mit Bestellsystem im Stil von Uber Eats für **Herr Biggie, Döner am Bahnhof Siegen** (Am Bahnhof 2, 57072 Siegen).
Kunden wählen Gerichte mit Soßen und Extras, entscheiden sich für **Abholen oder Liefern**, wählen eine Zeit und schicken die Bestellung ab.

- Statische Seite: HTML, CSS, JavaScript. Kein Framework, kein Build-Schritt.
- Deutsch und Englisch, heller und dunkler Modus, für Handys optimiert.
- DSGVO-freundlich: Schriften und Icons liegen lokal, keine Cookies, kein Tracking.
  Google Maps lädt erst nach Klick. Das Hintergrundvideo liegt auf dem eigenen Server.

## Live gehen: zwei Stufen

### Stufe 1: sofort live, Bestellung per WhatsApp (kostenlos, ca. 15 Minuten)

Solange kein Shopify-Shop verbunden ist, schickt der Warenkorb die fertige Bestellung **per WhatsApp** an den Kiosk.
Bezahlt wird bei Abholung oder Lieferung. Das funktioniert sofort.

1. **Prüfen, dass 0176 66201048 WhatsApp hat.** Sonst in `assets/js/config.js` bei `whatsapp` eine andere Nummer eintragen
   (Format `49176...`, ohne + und Leerzeichen) oder leer lassen, dann wird nur die Telefonnummer angezeigt.
2. **Instagram-Video einfügen** (siehe unten). Ohne Video zeigt der Hero das Foto mit Zoom-Effekt.
3. **Pflichtseiten ausfüllen:** `impressum.html` (Inhaber/in, USt-ID), `allergene.html` (Allergene je Gericht),
   in `datenschutz.html` den Hoster eintragen. Alle Stellen sind mit „BITTE AUSFÜLLEN“ markiert.
4. **Veröffentlichen mit GitHub Pages:** im Repository *Settings > Pages > Build and deployment*:
   Source „Deploy from a branch“, Branch `claude/skills-overview-9ge0fv` (oder `main` nach dem Merge), Ordner `/ (root)`, *Save*.
   Nach ca. 1 Minute ist die Seite erreichbar unter **https://manestarleonapple.github.io/doula-/**.
5. **Eigene Domain (optional):** z. B. `herr-biggie.de` kaufen, in *Settings > Pages > Custom domain* eintragen und beim Domain-Anbieter
   einen CNAME auf `manestarleonapple.github.io` setzen. Danach in `index.html` `og:image` auf die volle Adresse ändern
   (für die Link-Vorschau in WhatsApp und Instagram).

### Stufe 2: Online-Bezahlung mit Shopify (ab ca. 36 €/Monat plus Gebühren)

Sobald `shopifyDomain` gesetzt ist und alle Produkte eine Shopify-ID haben, schickt der Warenkorb automatisch in den
Shopify-Checkout. Bezahlung, Rechnung, Steuern, Abholung und Lieferung laufen dann über Shopify.

1. **Shop anlegen.** Shopify-Shop eröffnen (Tarif mit Onlineshop). Währung EUR, Standort Siegen.
2. **Produkte importieren.**
   ```bash
   SITE_URL=https://manestarleonapple.github.io/doula- node tools/build-shopify-csv.mjs
   ```
   In Shopify unter *Produkte > Importieren* die Datei `shopify/products.csv` hochladen (23 Produkte, 54 Varianten).
3. **Zahlungen aktivieren** unter *Einstellungen > Zahlungen* (Shopify Payments, PayPal).
4. **Abholung und Lieferung** unter *Einstellungen > Versand und Zustellung*: *Abholung vor Ort* (Am Bahnhof 2) und
   *Lokale Zustellung* mit denselben PLZ, Gebühren und Mindestbestellwert wie in `config.js`. Paketversand aus.
5. **Steuern** (Speisen zum Mitnehmen) und **Rechtstexte** (AGB, Widerruf bei verderblichen Lebensmitteln ausgeschlossen) in Shopify hinterlegen.
6. **Varianten-IDs holen** (Shop darf nicht passwortgeschützt sein):
   ```bash
   node tools/sync-shopify-ids.mjs euer-shop.myshopify.com
   ```
7. In `assets/js/config.js` `shopifyDomain: "euer-shop.myshopify.com"` setzen, committen, pushen.
8. Testbestellung im Shopify-Testmodus: einmal Abholung, einmal Lieferung.
   Mit der Shopify-App auf dem Handy im Kiosk kommt bei jeder Bestellung eine Push-Nachricht.

## Instagram-Video als Hintergrund

Instagram erlaubt es nicht, ein Reel als stummes Hintergrundvideo einzubetten. Deshalb läuft die **MP4-Datei des Reels**:

1. Reel herunterladen. Für eigene Reels in der Instagram-App: Reel öffnen > **···** > *Herunterladen* (oder das Original aus der Galerie nehmen).
2. Datei als `assets/video/hero.mp4` ablegen. Gut: Hochformat, ohne Ton, 10-20 Sekunden, unter ca. 8 MB.
   Zum Verkleinern zum Beispiel:
   ```bash
   ffmpeg -i reel.mp4 -an -vf "scale=720:-2" -c:v libx264 -crf 28 -preset slow -movflags +faststart assets/video/hero.mp4
   ```
3. Fertig. Das Video startet stumm in Schleife, hat einen Pause-Knopf, pausiert außerhalb des Bildschirms und
   wird bei „Datensparmodus“ oder „Weniger Bewegung“ nicht geladen (dann bleibt das Foto).

## Aufbau

```
index.html                Startseite mit Shop, Geschichte, Anfahrt
allergene.html            Allergenliste (muss ausgefüllt werden)
impressum.html            Impressum (muss ausgefüllt werden)
datenschutz.html          Datenschutzerklärung (Vorlage, prüfen lassen)
assets/js/config.js       Shop-Domain, WhatsApp, Video, Karte, Öffnungszeiten, Liefergebiet, Jahreszahlen der Geschichte
assets/js/menu.js         Speisekarte, Preise, Optionen
assets/js/shopify-variants.js   Shopify-Varianten-IDs (per Skript erzeugt)
assets/js/i18n.js         Texte Deutsch / Englisch (auch die Geschichte)
assets/js/app.js          Warenkorb, Zeitfenster, Checkout, Video, Animationen
assets/css/styles.css     Design
assets/img/               Fotos und Logo von Herr Biggie
assets/video/hero.mp4     Instagram-Reel als Hintergrundvideo (selbst ablegen)
shopify/products.csv      Import-Datei für Shopify (per Skript erzeugt)
tools/                    Hilfsskripte für Shopify
```

Lokal ansehen: `python3 -m http.server 8000`, dann http://localhost:8000 öffnen.

## Preise oder Gerichte ändern

1. `assets/js/menu.js` bearbeiten.
2. Mit Shopify: `node tools/build-shopify-csv.mjs`, CSV erneut importieren („Bestehende Produkte überschreiben“),
   dann `node tools/sync-shopify-ids.mjs <shop>`. Die Preise in Shopify sind maßgeblich.

## Vor dem Livegang klären (offene Punkte)

| Thema | Wo | Warum |
|---|---|---|
| **Allergene und Zusatzstoffe** | `allergene.html` | Pflicht beim Onlineverkauf von Lebensmitteln (LMIV) |
| **Impressum** (Inhaber/in, USt-ID) | `impressum.html` | Pflicht (DDG) |
| **Datenschutz** (Hoster eintragen, prüfen lassen) | `datenschutz.html` | Pflicht (DSGVO) |
| **WhatsApp-Nummer** | `config.js` > `whatsapp` | Bestellungen kommen dort an |
| **Instagram-Video** | `assets/video/hero.mp4` | Hintergrund im Hero |
| **Geschichte: Jahreszahlen und Details** | `config.js` > `storyYears`, Texte in `i18n.js` (`story.*`) | Wann Eiserfeld, wann Umzug, wann Eröffnung. Texte bitte vom Betrieb bestätigen |
| **Liefergebiet, Gebühr, Mindestbestellwert** | `config.js` > `delivery` | Platzhalter: PLZ 57072-57080, 2,50 €, ab 15 €, gratis ab 30 € |
| **Preise im Detail** | `menu.js` | Die PDF-Karte nennt Spannen. Die Aufteilung auf Varianten ist abgeleitet |
| **Beschreibungen** Spezial, Hawaii, Teller, Taxi Teller; **Getränkesorten** | `menu.js` | Zusammensetzung laut Betrieb eintragen |
| **Anfahrt** | `i18n.js` (`loc.*`) | Wegbeschreibung vor Ort prüfen (Parkhaus City-Galerie, Weg vom Bahnhof) |
| **Einverständnis der abgebildeten Personen** | `assets/img/` | Vor allem das Eröffnungsfoto mit Gast |

## Design und Bewegung

- Farben aus der „We are open“-Story: Orange, Ultramarin, Creme, Gold als Akzent.
- Schriften: Bricolage Grotesque und Permanent Marker (beide OFL), lokal eingebunden.
- Icons: Phosphor Bold (MIT), auf die genutzten 31 Glyphen gekürzt (4 KB).
- Animationen: Hero-Einstieg (Zeilen fahren hoch, Sticker wird aufgestempelt, Logo springt rein), Laufband,
  Einblendungen beim Scrollen (CSS `animation-timeline: view()`, ohne Unterstützung sofort sichtbar),
  wachsende Linie in der Geschichte, Punkt fliegt beim Hinzufügen in den Warenkorb.
  Bei „Weniger Bewegung“ im Betriebssystem ist alles statisch.
