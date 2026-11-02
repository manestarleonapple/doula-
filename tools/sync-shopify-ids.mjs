#!/usr/bin/env node
// Holt die Varianten-IDs aus dem Shopify-Shop und schreibt assets/js/shopify-variants.js.
// Voraussetzung: products.csv importiert, Produkte im Vertriebskanal "Onlineshop" aktiv,
// Shop nicht passwortgeschützt (sonst ist /products.json nicht erreichbar).
//
//   node tools/sync-shopify-ids.mjs herr-biggie.myshopify.com
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, loadMenu, expectedKeys } from "./load-menu.mjs";

const domain = (process.argv[2] || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
if (!domain) {
  console.error("Aufruf: node tools/sync-shopify-ids.mjs <shop-domain>");
  process.exit(1);
}

const found = {};
for (let page = 1; page < 20; page++) {
  const res = await fetch(`https://${domain}/products.json?limit=250&page=${page}`);
  if (!res.ok) {
    console.error(`Fehler ${res.status} bei https://${domain}/products.json (Shop passwortgeschützt?)`);
    process.exit(1);
  }
  const { products } = await res.json();
  if (!products.length) break;
  for (const p of products) for (const v of p.variants) found[`${p.handle}|${v.title}`] = v.id;
}

const menu = loadMenu();
const map = {};
const missing = [];
for (const key of expectedKeys(menu)) {
  if (found[key]) map[key] = found[key];
  else missing.push(key);
}

const out =
  "/* Automatisch erzeugt von tools/sync-shopify-ids.mjs am " + new Date().toISOString() + " für " + domain + " */\n" +
  "window.SHOPIFY_VARIANTS = " + JSON.stringify(map, null, 2) + ";\n";
writeFileSync(join(ROOT, "assets/js/shopify-variants.js"), out);

console.log(`${Object.keys(map).length} Varianten zugeordnet.`);
if (missing.length) {
  console.warn(`${missing.length} fehlen im Shop:\n  ` + missing.join("\n  "));
  process.exitCode = 2;
}
console.log(`Jetzt in assets/js/config.js setzen: shopifyDomain: "${domain}"`);
