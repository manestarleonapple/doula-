/*
 * Herr Biggie - zentrale Einstellungen.
 * Alles, was der Betrieb selbst anpassen muss, steht hier.
 * Werte mit "TODO" bitte vor dem Livegang bestätigen.
 */
window.BIGGIE_CONFIG = {
  // Shopify-Shop, an den der Warenkorb übergeben wird (z. B. "herr-biggie.myshopify.com"
  // oder eure eigene Shop-Domain). Leer = Demo-Modus, es wird nichts bestellt.
  shopifyDomain: "",

  business: {
    name: "Herr Biggie",
    street: "Am Bahnhof 2",
    zip: "57072",
    city: "Siegen",
    phone: "+4917666201048",
    phoneDisplay: "0176 66201048",
    email: "herrbiggie@hotmail.com",
    instagram: "https://www.instagram.com/herr_biggie/",
    facebook: "https://www.facebook.com/herrbiggie",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Herr+Biggie+Am+Bahnhof+2+57072+Siegen",
  },

  // Instagram-Reel. Als Hintergrundvideo im Hero läuft die MP4-Datei des Reels
  // (Instagram erlaubt kein Einbetten als Hintergrund). Datei ablegen unter:
  // assets/video/hero.mp4  (Hochformat, stumm, max. ca. 8 MB). Fehlt sie, zeigt der Hero das Foto.
  reel: {
    url: "https://www.instagram.com/reel/CztRO9YMEO1/",
    video: "assets/video/hero.mp4",
  },

  // Bestellung, solange kein Shopify-Shop verbunden ist: per WhatsApp an diese Nummer
  // (international, ohne + und ohne Leerzeichen). Leer = nur Telefon.
  // TODO: bestätigen, dass die Nummer WhatsApp hat.
  whatsapp: "4917666201048",

  // Karte im Bereich "Anfahrt" (wird erst nach Klick geladen, DSGVO). Leer = nur Routen-Links.
  mapEmbed: "https://www.google.com/maps?q=Herr+Biggie,+Am+Bahnhof+2,+57072+Siegen&output=embed",

  // Jahreszahlen für "Unsere Geschichte" (Eiserfeld, Umzug, Eröffnung, heute).
  // TODO: vom Betrieb erfragen. Leer = es wird nur der Text angezeigt.
  storyYears: ["", "", "", ""],

  timezone: "Europe/Berlin",
  // Öffnungszeiten je Wochentag (0 = Sonntag). null = geschlossen.
  hours: {
    0: null,
    1: [12, 22],
    2: [12, 22],
    3: [12, 22],
    4: [12, 22],
    5: [12, 22],
    6: [12, 22],
  },

  pickup: {
    prepMinutes: 15, // Vorlauf bis zur ersten Abholzeit
    slotMinutes: 15,
  },

  delivery: {
    enabled: true,
    // TODO: Liefergebiet, Gebühr und Mindestbestellwert mit dem Betrieb klären
    // und identisch in Shopify (Versand > Lokale Zustellung) hinterlegen.
    zips: ["57072", "57074", "57076", "57078", "57080"],
    fee: 2.5,
    freeFrom: 30,
    minOrder: 15,
    etaMinutes: [35, 50],
  },

  currency: "EUR",
  locale: { de: "de-DE", en: "en-GB" },
};
