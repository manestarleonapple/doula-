# Herr Biggie: Website mit Online-Shop

Website mit Bestellsystem im Stil von Uber Eats für **Herr Biggie, Döner am Bahnhof Siegen** (Am Bahnhof 2, 57072 Siegen).
Kunden wählen Gerichte mit Soßen und Extras, entscheiden sich für **Abholen oder Liefern**, wählen eine Zeit und bezahlen **online über den Shopify-Checkout**.

- Statische Seite: HTML, CSS, JavaScript. Kein Framework, kein Build-Schritt.
- Läuft auf GitHub Pages, Netlify, Cloudflare Pages oder jedem Webspace.
- Deutsch und Englisch, heller und dunkler Modus, für Handys optimiert.
- DSGVO-freundlich: Schriften und Icons liegen lokal (kein Google Fonts), keine Cookies, kein Tracking.
  Das Instagram-Reel lädt erst nach einem Klick (2-Klick-Lösung).

## Aufbau

```
index.html                Startseite mit Shop
allergene.html            Allergenliste (muss ausgefüllt werden)
impressum.html            Impressum (muss ausgefüllt werden)
datenschutz.html          Datenschutzerklärung (Vorlage, prüfen lassen)
assets/js/config.js       Shop-Domain, Öffnungszeiten, Liefergebiet, Gebühren
assets/js/menu.js         Speisekarte, Preise, Optionen
assets/js/shopify-variants.js   Shopify-Varianten-IDs (wird per Skript erzeugt)
assets/js/i18n.js         Texte Deutsch / Englisch
assets/js/app.js          Warenkorb, Zeitfenster, Checkout
assets/css/styles.css     Design
assets/img/               Fotos und Logo von Herr Biggie
shopify/products.csv      Import-Datei für Shopify (wird per Skript erzeugt)
tools/                    Hilfsskripte für Shopify
```

## Lokal ansehen

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Solange in `config.js` keine `shopifyDomain` eingetragen ist, läuft der Shop im **Demo-Modus**:
Beim Klick auf „Zur Kasse“ erscheint eine Zusammenfassung der Bestellung, es wird nichts bestellt.

## Shopify anbinden (einmalig, ca. 30 Minuten)

Die Website übergibt den Warenkorb per Shopify-Cart-Permalink (`/cart/<varianten-id>:<menge>,...`) an den Shopify-Checkout.
Bezahlung, Rechnung, Steuern, Abholung und Lieferung laufen komplett über Shopify.

1. **Shop anlegen.** Einen Shopify-Shop eröffnen (jeder Tarif mit Onlineshop reicht). Währung EUR, Standort Siegen.
2. **Produkte importieren.**
   ```bash
   SITE_URL=https://eure-domain.de node tools/build-shopify-csv.mjs
   ```
   Danach in Shopify unter *Produkte > Importieren* die Datei `shopify/products.csv` hochladen.
   `SITE_URL` ist optional. Ist sie gesetzt, übernimmt Shopify die Produktfotos von der Website (sie muss dafür schon online sein).
3. **Zahlungen aktivieren.** Unter *Einstellungen > Zahlungen* Shopify Payments (Karte, Apple Pay, Google Pay) und bei Bedarf PayPal.
4. **Abholung und Lieferung einrichten.** Unter *Einstellungen > Versand und Zustellung*:
   - *Abholung vor Ort* für Am Bahnhof 2 aktivieren (Hinweis z. B. „Abholung am Kiosk, Bestellnummer nennen“).
   - *Lokale Zustellung* aktivieren. Dieselben PLZ, Gebühr und Mindestbestellwert wie in `config.js` eintragen.
   - Normalen Paketversand deaktivieren.
5. **Steuern.** Unter *Einstellungen > Steuern* den Steuersatz für Speisen zum Mitnehmen hinterlegen (mit Steuerberater klären).
6. **Rechtstexte.** AGB, Widerrufsbelehrung (bei verderblichen Lebensmitteln ausgeschlossen) und Datenschutz unter *Einstellungen > Richtlinien* generieren und prüfen.
7. **Varianten-IDs holen.** Der Shop darf dafür nicht passwortgeschützt sein.
   ```bash
   node tools/sync-shopify-ids.mjs euer-shop.myshopify.com
   ```
   Das Skript schreibt `assets/js/shopify-variants.js` und meldet, falls etwas fehlt.
8. **Domain eintragen.** In `assets/js/config.js`: `shopifyDomain: "euer-shop.myshopify.com"`.
9. **Testbestellung** mit dem Shopify-Testmodus machen: einmal Abholung, einmal Lieferung.

Die Bestellung kommt in Shopify mit Notiz an, zum Beispiel:

```
ABHOLUNG | 2026-11-03 13:45
2x Potato Döner (Sorte: Cheese; Fleisch oder Veggie: Fleisch vom Spieß; Soßen: Knoblauch; Extras: Extra Käse)
1x Ayran
```

Dazu die Bestellattribute `Bestellart` und `Wunschzeit`. Mit der kostenlosen **Shopify-App** aufs Handy oder Tablet im Kiosk
gibt es bei jeder neuen Bestellung eine Push-Benachrichtigung.

### Preise oder Gerichte ändern

1. `assets/js/menu.js` bearbeiten.
2. `node tools/build-shopify-csv.mjs` ausführen und die CSV erneut importieren. Dabei „Bestehende Produkte überschreiben“ wählen.
3. `node tools/sync-shopify-ids.mjs <shop>` ausführen.

Wichtig: Die Preise in Shopify sind maßgeblich. Website und Shop müssen übereinstimmen, sonst sieht der Kunde im Checkout einen anderen Betrag.

## Veröffentlichen (GitHub Pages)

*Repository > Settings > Pages > Deploy from branch*, Branch wählen, Ordner `/ (root)`.
Danach in `index.html` `og:image` und `og:url` auf absolute URLs der echten Domain setzen. Das ist für die Link-Vorschau in WhatsApp und Instagram nötig.

## Vor dem Livegang klären (offene Punkte)

| Thema | Wo | Warum |
|---|---|---|
| **Allergene und Zusatzstoffe** | `allergene.html`, optional `allergens` je Gericht in `menu.js` | Pflicht beim Onlineverkauf von Lebensmitteln (LMIV) |
| **Impressum** (Inhaber/in, USt-ID) | `impressum.html` | Pflicht (DDG) |
| **Datenschutz** (Hoster eintragen, prüfen lassen) | `datenschutz.html` | Pflicht (DSGVO) |
| **Liefergebiet, Gebühr, Mindestbestellwert** | `config.js` > `delivery` und Shopify | Platzhalter: PLZ 57072-57080, 2,50 €, ab 15 €, gratis ab 30 € |
| **Preise im Detail** | `menu.js` | Die PDF-Karte nennt Spannen (z. B. Potato 8-11 €, Wurst 4-9 €, Salate 8-12 €). Die Aufteilung auf einzelne Varianten ist abgeleitet und muss bestätigt werden |
| **Beschreibungen** Spezial, Hawaii, Teller, Taxi Teller | `menu.js` | Zusammensetzung laut Betrieb eintragen |
| **Getränkesorten** | `menu.js` > `G.drink` | Platzhalter Cola, Cola Zero, Fanta, Sprite |
| **Veggie bei Dürüm** | `menu.js` | Die Karte nennt Veggie (-1 €) nur beim Fladenbrot |
| **Fleischart** | überall | Bewusst keine Aussage (laut Brand-Profil offen). Nur „Fleisch vom Spieß“ |
| **Einverständnis der abgebildeten Personen** | `assets/img/` | Vor allem das Eröffnungsfoto mit Gast |
| **Logo/Maskottchen** | | Unverändert übernommen, wie im Brand-Profil empfohlen |

## Design

- Farben aus der „We are open“-Story: Orange `#EF5400`, Ultramarin `#1A2AA8`, Creme `#FDF4DB`, Gold als Akzent im Infoband.
- Schriften: Bricolage Grotesque (OFL) für Text und Überschriften, Permanent Marker (OFL) für die Sticker-Akzente.
- Icons: Phosphor Bold (MIT). Die Icon-Schrift ist auf die genutzten 23 Glyphen gekürzt (3 KB).
  Für neue Icons die vollständige Schrift aus `@phosphor-icons/web` nehmen oder neu subsetten.
- Buttons im „Sticker“-Look: Orange mit dunkelblauer Schrift und versetztem Schatten (Kontrast nach WCAG AA).
