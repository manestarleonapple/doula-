// Lädt assets/js/menu.js (Browser-Skript) in Node, damit die Tools dieselben Daten nutzen.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadMenu() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, "assets/js/menu.js"), "utf8"), ctx);
  return ctx.window.BIGGIE_MENU;
}

/** Alle Shopify-Varianten eines Artikels: [{ title, options: [..], price }] */
export function variantsOf(item) {
  const groups = item.groups.filter((g) => g.type === "variant");
  if (!groups.length) return [{ title: "Default Title", options: [], price: item.price }];
  let combos = [{ options: [], price: item.price }];
  for (const g of groups) {
    combos = combos.flatMap((c) =>
      g.values.map((v) => ({ options: [...c.options, v.id], price: c.price + (v.delta || 0) }))
    );
  }
  return combos.map((c) => ({ ...c, title: c.options.join(" / "), price: Math.round(c.price * 100) / 100 }));
}

/** Alle Schlüssel "<handle>|<variante>", die der Shop kennen muss (inkl. Extras). */
export function expectedKeys(menu) {
  const keys = [];
  for (const item of menu.ITEMS) for (const v of variantsOf(item)) keys.push(item.id + "|" + v.title);
  for (const id of Object.keys(menu.ADDONS)) keys.push(id + "|Default Title");
  return keys;
}
