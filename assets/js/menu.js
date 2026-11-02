/*
 * Herr Biggie - Speisekarte.
 * Quelle: Speisekarte (PDF) laut Research Brand Profile, Stand 02.11.2026.
 *
 * So funktionieren die Optionen:
 *  - type "variant": Pflichtauswahl, wird in Shopify zu einer Produktvariante
 *    (Option1/Option2). "delta" ist der Aufpreis gegenüber dem Grundpreis.
 *  - type "choice":  kostenlose Wünsche (Soßen, ohne Zwiebeln ...). Landen als
 *    Notiz in der Shopify-Bestellung.
 *  - type "addon":   kostenpflichtige Extras. Werden in Shopify als eigene
 *    Produkte (siehe ADDONS) in den Warenkorb gelegt.
 *
 * Die "id" eines Artikels ist gleichzeitig der Shopify-Produkt-Handle.
 */
(function () {
  const t = (de, en) => ({ de, en: en || de });

  const ADDONS = {
    "extra-kaese": { id: "extra-kaese", name: t("Extra Käse", "Extra cheese"), price: 1 },
    "extra-sosse": { id: "extra-sosse", name: t("Extra Soße", "Extra sauce"), price: 0.5 },
  };

  const G = {
    meatOrVeggie: {
      id: "art",
      type: "variant",
      label: t("Fleisch oder Veggie", "Meat or veggie"),
      values: [
        { id: "Fleisch", label: t("Fleisch vom Spieß", "Meat from the spit"), delta: 0 },
        { id: "Veggie", label: t("Veggie, ohne Fleisch", "Veggie, no meat"), delta: -1 },
      ],
    },
    styleSHC: {
      id: "sorte",
      type: "variant",
      label: t("Sorte", "Style"),
      values: [
        { id: "Spezial", label: t("Spezial"), delta: 0 },
        { id: "Hawaii", label: t("Hawaii"), delta: 0 },
        { id: "Cheese", label: t("Cheese"), delta: 0 },
      ],
    },
    potatoStyle: {
      id: "sorte",
      type: "variant",
      label: t("Sorte", "Style"),
      values: [
        { id: "Klassik", label: t("Klassik"), delta: 0 },
        { id: "Cheese", label: t("Cheese"), delta: 1 },
        { id: "Chilli Cheese", label: t("Chilli Cheese"), delta: 2 },
      ],
    },
    sizeSB: (biggieDelta) => ({
      id: "groesse",
      type: "variant",
      label: t("Größe", "Size"),
      values: [
        { id: "Smalls", label: t("Smalls"), delta: 0 },
        { id: "Biggie", label: t("Biggie"), delta: biggieDelta },
      ],
    }),
    sauces: {
      id: "sossen",
      type: "choice",
      multi: true,
      max: 3,
      label: t("Soßen", "Sauces"),
      hint: t("Bis zu 3, inklusive", "Up to 3, included"),
      values: [
        { id: "Kräuter", label: t("Kräuter", "Herb") },
        { id: "Knoblauch", label: t("Knoblauch", "Garlic") },
        { id: "Scharf", label: t("Scharf", "Hot") },
      ],
    },
    without: {
      id: "ohne",
      type: "choice",
      multi: true,
      label: t("Ohne", "Leave out"),
      values: [
        { id: "Zwiebeln", label: t("Zwiebeln", "Onions") },
        { id: "Tomate", label: t("Tomate", "Tomato") },
        { id: "Rotkohl", label: t("Rotkohl", "Red cabbage") },
        { id: "Salat", label: t("Salat", "Lettuce") },
      ],
    },
    extras: {
      id: "extras",
      type: "addon",
      multi: true,
      label: t("Extras", "Extras"),
      values: [{ id: "extra-kaese" }, { id: "extra-sosse" }],
    },
    extraSauce: {
      id: "extras",
      type: "addon",
      multi: true,
      label: t("Extras", "Extras"),
      values: [{ id: "extra-sosse" }],
    },
    drink: {
      id: "sorte",
      type: "choice",
      multi: false,
      required: true,
      label: t("Sorte", "Flavour"),
      // TODO: tatsächliches Getränkeangebot vom Kühlschrank übernehmen
      values: [
        { id: "Cola", label: t("Cola") },
        { id: "Cola Zero", label: t("Cola Zero") },
        { id: "Fanta", label: t("Fanta") },
        { id: "Sprite", label: t("Sprite") },
      ],
    },
  };

  const wrapGroups = [G.meatOrVeggie, G.sauces, G.without, G.extras];

  const CATEGORIES = [
    { id: "fladenbrot", name: t("Döner im Fladenbrot", "Döner in flatbread") },
    { id: "duerum", name: t("Dürüm", "Dürüm wrap") },
    { id: "teller", name: t("Teller", "Plates") },
    { id: "box", name: t("Boxen", "Boxes") },
    { id: "pommes", name: t("Pommes & Co", "Fries & sides") },
    { id: "wurst-salat", name: t("Wurst & Salate", "Sausages & salads") },
    { id: "getraenke", name: t("Getränke", "Drinks") },
  ];

  const ITEMS = [
    // Fladenbrot
    {
      id: "potato-doener",
      cat: "fladenbrot",
      name: t("Potato Döner"),
      desc: t(
        "Unser Signature: knusprige Pommes direkt im Döner, dazu Salat und Soße im fluffigen Fladenbrot.",
        "Our signature: crispy fries right inside the döner, with salad and sauce in fluffy flatbread."
      ),
      price: 9,
      img: "assets/img/doener-potato.jpg",
      badge: "signature",
      groups: [G.potatoStyle, G.meatOrVeggie, G.sauces, G.without, G.extras],
    },
    {
      id: "doener-klassik",
      cat: "fladenbrot",
      name: t("Döner Klassik"),
      desc: t(
        "Fleisch vom Spieß, frischer Salat, Zwiebeln, Rotkohl und Tomate im fluffigen Fladenbrot.",
        "Meat from the spit, fresh salad, onions, red cabbage and tomato in fluffy flatbread."
      ),
      price: 8,
      img: "assets/img/doener-handover.jpg",
      badge: "popular",
      groups: wrapGroups,
    },
    {
      id: "doener-spezial-hawaii-cheese",
      cat: "fladenbrot",
      name: t("Döner Spezial, Hawaii oder Cheese", "Döner Spezial, Hawaii or Cheese"),
      desc: t(
        "Der Klassiker in drei Varianten. Gleicher Preis, du hast die Wahl.",
        "The classic in three versions. Same price, your pick."
      ),
      price: 9,
      groups: [G.styleSHC, ...wrapGroups],
    },
    {
      id: "doener-chilli-cheese",
      cat: "fladenbrot",
      name: t("Döner Chilli Cheese"),
      desc: t("Mit Käse und Chili, für alle, die es kräftig mögen.", "With cheese and chilli, for those who like it bold."),
      price: 10,
      badge: "hot",
      groups: wrapGroups,
    },

    // Dürüm
    {
      id: "potato-duerum",
      cat: "duerum",
      name: t("Potato Dürüm"),
      desc: t("Pommes, Fleisch vom Spieß, Salat und Soße, fest eingerollt.", "Fries, meat from the spit, salad and sauce, rolled tight."),
      price: 10,
      badge: "signature",
      groups: [G.potatoStyle, G.sauces, G.without, G.extras],
    },
    {
      id: "duerum-klassik",
      cat: "duerum",
      name: t("Dürüm Klassik"),
      desc: t("Fleisch vom Spieß, Salat und Soße im dünnen Fladen gerollt.", "Meat from the spit, salad and sauce rolled in thin flatbread."),
      price: 9,
      groups: [G.sauces, G.without, G.extras],
    },
    {
      id: "duerum-spezial-hawaii-cheese",
      cat: "duerum",
      name: t("Dürüm Spezial, Hawaii oder Cheese", "Dürüm Spezial, Hawaii or Cheese"),
      desc: t("Drei Varianten, ein Preis.", "Three versions, one price."),
      price: 10,
      groups: [G.styleSHC, G.sauces, G.without, G.extras],
    },
    {
      id: "duerum-chilli-cheese",
      cat: "duerum",
      name: t("Dürüm Chilli Cheese"),
      desc: t("Gerollt mit Käse und Chili.", "Rolled with cheese and chilli."),
      price: 11,
      badge: "hot",
      groups: [G.sauces, G.without, G.extras],
    },

    // Teller
    {
      id: "doener-teller",
      cat: "teller",
      name: t("Döner Teller"),
      desc: t("Fleisch vom Spieß mit Pommes, Salat und Soße.", "Meat from the spit with fries, salad and sauce."),
      price: 11,
      img: "assets/img/team-teller.jpg",
      groups: [G.sizeSB(3), G.sauces, G.without, G.extras],
    },
    {
      id: "veggie-teller",
      cat: "teller",
      name: t("Veggie Teller"),
      desc: t("Ohne Fleisch, mit Pommes, Salat und Soße.", "No meat, with fries, salad and sauce."),
      price: 10,
      badge: "veggie",
      groups: [G.sizeSB(2), G.sauces, G.without, G.extras],
    },
    {
      id: "taxi-teller",
      cat: "teller",
      name: t("Taxi Teller"),
      desc: t("Der große Teller mit Currywurst. Für den richtig großen Hunger.", "The big plate with currywurst. For a serious appetite."),
      price: 16,
      groups: [G.sauces, G.extraSauce],
    },

    // Boxen
    {
      id: "doener-box",
      cat: "box",
      name: t("Döner Box"),
      desc: t("Schnell, satt, günstig. Die Box für unterwegs zum Zug.", "Quick, filling, cheap. The box to take on the train."),
      price: 6,
      img: "assets/img/doener-cone.jpg",
      badge: "deal",
      groups: [
        {
          id: "sorte",
          type: "variant",
          label: t("Sorte", "Style"),
          values: [
            { id: "Klassik", label: t("Klassik"), delta: 0 },
            { id: "Potato", label: t("Potato, mit Pommes", "Potato, with fries"), delta: 0 },
            { id: "Salat", label: t("Salat", "Salad"), delta: 0 },
          ],
        },
        G.sizeSB(2),
        G.sauces,
        G.extraSauce,
      ],
    },
    {
      id: "fleischportion",
      cat: "box",
      name: t("Fleischportion", "Meat portion"),
      desc: t("Nur Fleisch vom Spieß, ohne alles. Zum Teilen oder Mitnehmen.", "Just meat from the spit. To share or take home."),
      price: 8,
      groups: [
        {
          id: "groesse",
          type: "variant",
          label: t("Größe", "Size"),
          values: [
            { id: "Smalls", label: t("Smalls"), delta: 0 },
            { id: "Biggie", label: t("Biggie"), delta: 4 },
            { id: "XXL", label: t("XXL"), delta: 14 },
          ],
        },
        G.extraSauce,
      ],
    },

    // Pommes & Co
    {
      id: "pommes",
      cat: "pommes",
      name: t("Pommes", "Fries"),
      desc: t("Goldgelb und knusprig.", "Golden and crispy."),
      price: 4,
      groups: [G.sizeSB(1), G.extraSauce],
    },
    {
      id: "chicken-nuggets",
      cat: "pommes",
      name: t("Chicken Nuggets"),
      desc: t("Mit Soße nach Wahl.", "With your choice of sauce."),
      price: 6,
      groups: [
        {
          id: "stueck",
          type: "variant",
          label: t("Stückzahl", "Pieces"),
          values: [
            { id: "6er", label: t("6 Stück", "6 pieces"), delta: 0 },
            { id: "9er", label: t("9 Stück", "9 pieces"), delta: 3 },
            { id: "20er", label: t("20 Stück", "20 pieces"), delta: 11 },
          ],
        },
        G.sauces,
        G.extraSauce,
      ],
    },
    {
      id: "falafel",
      cat: "pommes",
      name: t("Falafel, 6 Stück", "Falafel, 6 pieces"),
      desc: t("Sechs Falafel mit Soße nach Wahl.", "Six falafel with your choice of sauce."),
      price: 8,
      badge: "veggie",
      groups: [G.sauces, G.extraSauce],
    },

    // Wurst & Salate
    {
      id: "currywurst",
      cat: "wurst-salat",
      name: t("Currywurst"),
      desc: t("Klassisch mit Currysoße.", "Classic, with curry sauce."),
      price: 5,
      groups: [
        {
          id: "beilage",
          type: "variant",
          label: t("Beilage", "Side"),
          values: [
            { id: "Ohne Beilage", label: t("Ohne Beilage", "No side"), delta: 0 },
            { id: "Mit Pommes", label: t("Mit Pommes", "With fries"), delta: 4 },
          ],
        },
      ],
    },
    {
      id: "bratwurst",
      cat: "wurst-salat",
      name: t("Bratwurst"),
      desc: t("Vom Grill, im Brötchen oder mit Pommes.", "Grilled, in a bun or with fries."),
      price: 4,
      groups: [
        {
          id: "beilage",
          type: "variant",
          label: t("Beilage", "Side"),
          values: [
            { id: "Im Brötchen", label: t("Im Brötchen", "In a bun"), delta: 0 },
            { id: "Mit Pommes", label: t("Mit Pommes", "With fries"), delta: 4 },
          ],
        },
      ],
    },
    {
      id: "salat",
      cat: "wurst-salat",
      name: t("Salat", "Salad"),
      desc: t("Frischer gemischter Salat, auf Wunsch mit Fleisch vom Spieß.", "Fresh mixed salad, with meat from the spit if you like."),
      price: 8,
      groups: [
        {
          id: "art",
          type: "variant",
          label: t("Art", "Type"),
          values: [
            { id: "Gemischt", label: t("Gemischt", "Mixed"), delta: 0 },
            { id: "Mit Fleisch", label: t("Mit Fleisch vom Spieß", "With meat from the spit"), delta: 4 },
          ],
        },
        G.sauces,
        G.extras,
      ],
    },

    // Getränke
    {
      id: "softdrink",
      cat: "getraenke",
      name: t("Softdrink"),
      desc: t("Gekühlt aus dem Kühlschrank.", "Ice cold from the fridge."),
      price: 2.25,
      groups: [G.drink],
    },
    {
      id: "ayran",
      cat: "getraenke",
      name: t("Ayran"),
      desc: t("Der Klassiker zum Döner.", "The classic with döner."),
      price: 2,
      groups: [],
    },
  ];

  window.BIGGIE_MENU = { CATEGORIES, ITEMS, ADDONS };
})();
