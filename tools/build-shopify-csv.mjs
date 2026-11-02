#!/usr/bin/env node
// Erzeugt shopify/products.csv aus assets/js/menu.js.
// Import in Shopify: Produkte > Importieren > products.csv
//
//   node tools/build-shopify-csv.mjs
//   SITE_URL=https://www.herr-biggie.de node tools/build-shopify-csv.mjs   (mit Produktbildern)
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadMenu, variantsOf } from "./load-menu.mjs";

const menu = loadMenu();
const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
const catName = Object.fromEntries(menu.CATEGORIES.map((c) => [c.id, c.name.de]));

const HEADER = [
  "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
  "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value",
  "Variant SKU", "Variant Grams", "Variant Inventory Tracker", "Variant Inventory Policy",
  "Variant Fulfillment Service", "Variant Price", "Variant Requires Shipping", "Variant Taxable",
  "Image Src", "Image Position", "Image Alt Text", "Gift Card", "Status",
];

const esc = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

const rows = [];
function pushProduct({ handle, title, body, type, tags, optionNames, variants, img }) {
  variants.forEach((v, i) => {
    const first = i === 0;
    rows.push({
      Handle: handle,
      Title: first ? title : "",
      "Body (HTML)": first ? body : "",
      Vendor: first ? "Herr Biggie" : "",
      Type: first ? type : "",
      Tags: first ? tags.join(", ") : "",
      Published: first ? "TRUE" : "",
      "Option1 Name": first ? optionNames[0] || "Title" : "",
      "Option1 Value": v.options[0] || "Default Title",
      "Option2 Name": first ? optionNames[1] || "" : "",
      "Option2 Value": v.options[1] || "",
      "Variant SKU": (handle + "-" + (v.options.join("-") || "std")).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      "Variant Grams": 0,
      "Variant Inventory Tracker": "",
      "Variant Inventory Policy": "continue",
      "Variant Fulfillment Service": "manual",
      "Variant Price": v.price.toFixed(2),
      // Muss TRUE sein, damit Shopify "Abholung vor Ort" und "Lokale Zustellung" anbietet.
      "Variant Requires Shipping": "TRUE",
      "Variant Taxable": "TRUE",
      "Image Src": first && img && siteUrl ? siteUrl + "/" + img : "",
      "Image Position": first && img && siteUrl ? 1 : "",
      "Image Alt Text": first && img && siteUrl ? title : "",
      "Gift Card": first ? "FALSE" : "",
      Status: first ? "active" : "",
    });
  });
}

for (const item of menu.ITEMS) {
  const vg = item.groups.filter((g) => g.type === "variant");
  pushProduct({
    handle: item.id,
    title: item.name.de,
    body: "<p>" + item.desc.de + "</p>",
    type: catName[item.cat],
    tags: ["herr-biggie", item.cat, item.badge].filter(Boolean),
    optionNames: vg.map((g) => g.label.de),
    variants: variantsOf(item),
    img: item.img,
  });
}
for (const a of Object.values(menu.ADDONS)) {
  pushProduct({
    handle: a.id,
    title: a.name.de,
    body: "<p>Extra zu einem Gericht. Wird über die Website automatisch hinzugefügt.</p>",
    type: "Extras",
    tags: ["herr-biggie", "extra"],
    optionNames: [],
    variants: [{ title: "Default Title", options: [], price: a.price }],
  });
}

mkdirSync(join(ROOT, "shopify"), { recursive: true });
const csv = [HEADER.join(","), ...rows.map((r) => HEADER.map((h) => esc(r[h])).join(","))].join("\n") + "\n";
writeFileSync(join(ROOT, "shopify/products.csv"), csv);
console.log(`shopify/products.csv: ${menu.ITEMS.length + Object.keys(menu.ADDONS).length} Produkte, ${rows.length} Varianten` + (siteUrl ? `, Bilder von ${siteUrl}` : ", ohne Bilder (SITE_URL nicht gesetzt)"));
