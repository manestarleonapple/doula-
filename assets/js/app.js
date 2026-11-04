/* Herr Biggie - Shop-Logik (ohne Framework, ohne Build-Schritt) */
(function () {
  "use strict";

  const C = window.BIGGIE_CONFIG;
  const MENU = window.BIGGIE_MENU;
  const I18N = window.BIGGIE_I18N;
  const VARIANTS = window.SHOPIFY_VARIANTS || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Speicher (robust, falls localStorage blockiert ist) ---------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* privat / blockiert: Seite funktioniert trotzdem */
      }
    },
  };

  /* ---------- Sprache ---------- */
  const browserLang = (navigator.language || "de").toLowerCase().startsWith("de") ? "de" : "en";
  let lang = store.get("hb.lang", browserLang) === "en" ? "en" : "de";

  function tr(key, vars) {
    let s = (I18N[lang] && I18N[lang][key]) ?? I18N.de[key] ?? key;
    if (vars && typeof s === "string") {
      Object.keys(vars).forEach((k) => {
        s = s.split("{" + k + "}").join(vars[k]);
      });
    }
    return s;
  }
  const L = (obj) => (obj ? obj[lang] || obj.de : "");

  function money(n) {
    return new Intl.NumberFormat(C.locale[lang], { style: "currency", currency: C.currency }).format(n);
  }
  function signedMoney(n) {
    return (n > 0 ? "+" : "-") + money(Math.abs(n));
  }

  /* ---------- Zeit in Siegen (Europe/Berlin) ---------- */
  function berlinNow() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: C.timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const dows = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      y: +get("year"),
      m: +get("month"),
      d: +get("day"),
      dow: dows[get("weekday")],
      minutes: +get("hour") * 60 + +get("minute"),
    };
  }

  function dateAfter(now, offset) {
    const dt = new Date(Date.UTC(now.y, now.m - 1, now.d + offset));
    const pad = (n) => String(n).padStart(2, "0");
    return dt.getUTCFullYear() + "-" + pad(dt.getUTCMonth() + 1) + "-" + pad(dt.getUTCDate());
  }

  function hhmm(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  function openState() {
    const now = berlinNow();
    const h = C.hours[now.dow];
    if (h && now.minutes >= h[0] * 60 && now.minutes < h[1] * 60) {
      return { open: true, closesAt: h[1] * 60, closingSoon: h[1] * 60 - now.minutes <= 60, now };
    }
    // nächste Öffnung suchen
    for (let off = 0; off < 8; off++) {
      const dow = (now.dow + off) % 7;
      const hh = C.hours[dow];
      if (!hh) continue;
      if (off === 0 && now.minutes >= hh[0] * 60) continue;
      return { open: false, next: { off, dow, at: hh[0] * 60 }, now };
    }
    return { open: false, now };
  }

  function dayName(off, dow) {
    if (off === 0) return tr("time.today");
    if (off === 1) return tr("time.tomorrow");
    return tr("days")[dow];
  }

  function buildSlots(mode) {
    const now = berlinNow();
    const step = C.pickup.slotMinutes;
    const lead = mode === "delivery" ? C.delivery.etaMinutes[0] : C.pickup.prepMinutes;
    const state = openState();
    const days = [];
    for (let off = 0; off < 8 && days.length < 2; off++) {
      const dow = (now.dow + off) % 7;
      const h = C.hours[dow];
      if (!h) continue;
      const earliest = off === 0 ? Math.max(now.minutes + lead, h[0] * 60 + lead) : h[0] * 60 + lead;
      const start = Math.ceil(earliest / step) * step;
      const end = h[1] * 60 - step;
      const slots = [];
      for (let t = start; t <= end; t += step) slots.push(t);
      if (slots.length) days.push({ off, dow, date: dateAfter(now, off), slots });
    }
    return { state, days, lead };
  }

  /* ---------- Warenkorb-Status ---------- */
  const itemsById = Object.fromEntries(MENU.ITEMS.map((i) => [i.id, i]));
  let cart = store.get("hb.cart", []).filter((l) => itemsById[l.itemId]);
  let mode = store.get("hb.mode", "pickup");
  if (mode === "delivery" && !C.delivery.enabled) mode = "pickup";

  function saveCart() {
    store.set("hb.cart", cart);
    store.set("hb.mode", mode);
  }

  function variantGroups(item) {
    return item.groups.filter((g) => g.type === "variant");
  }

  function unitPrice(item, sel) {
    let p = item.price;
    item.groups.forEach((g) => {
      if (g.type === "variant") {
        const v = g.values.find((x) => x.id === sel[g.id]);
        if (v) p += v.delta || 0;
      } else if (g.type === "addon") {
        (sel[g.id] || []).forEach((a) => (p += MENU.ADDONS[a].price));
      }
    });
    return Math.round(p * 100) / 100;
  }

  function minPrice(item) {
    let p = item.price;
    variantGroups(item).forEach((g) => (p += Math.min(...g.values.map((v) => v.delta || 0))));
    return p;
  }

  function hasPriceRange(item) {
    return variantGroups(item).some((g) => g.values.some((v) => (v.delta || 0) !== 0));
  }

  function variantTitle(item, sel) {
    const vg = variantGroups(item);
    if (!vg.length) return "Default Title";
    return vg.map((g) => sel[g.id]).join(" / ");
  }

  function selectionSummary(item, sel, forShop) {
    const out = [];
    item.groups.forEach((g) => {
      const val = sel[g.id];
      if (val == null || (Array.isArray(val) && !val.length)) return;
      const labelOf = (id) => {
        if (g.type === "addon") return forShop ? MENU.ADDONS[id].name.de : L(MENU.ADDONS[id].name);
        const v = g.values.find((x) => x.id === id);
        return forShop ? v.label.de : L(v.label);
      };
      const text = Array.isArray(val) ? val.map(labelOf).join(", ") : labelOf(val);
      if (g.type === "variant" && !forShop) {
        out.push(text);
      } else {
        out.push((forShop ? g.label.de : L(g.label)) + ": " + text);
      }
    });
    return out;
  }

  function cartCount() {
    return cart.reduce((n, l) => n + l.qty, 0);
  }
  function subtotal() {
    return cart.reduce((s, l) => s + unitPrice(itemsById[l.itemId], l.sel) * l.qty, 0);
  }
  function deliveryFee(sub) {
    if (mode !== "delivery") return 0;
    return sub >= C.delivery.freeFrom ? 0 : C.delivery.fee;
  }

  function addToCart(itemId, sel, qty) {
    const key = itemId + "::" + JSON.stringify(sel);
    const existing = cart.find((l) => l.key === key);
    if (existing) existing.qty = Math.min(existing.qty + qty, 50);
    else cart.push({ key, itemId, sel, qty });
    saveCart();
    renderCart();
    bump();
  }

  /* ---------- Menü rendern ---------- */
  const menuList = $("#menuList");
  const catScroll = $("#catScroll");

  function badgeHtml(item) {
    if (!item.badge) return "";
    return '<span class="badge badge-' + item.badge + '">' + escapeHtml(tr("badge." + item.badge)) + "</span>";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function renderMenu() {
    const q = ($("#menuSearch").value || "").trim().toLowerCase();
    let html = "";
    let any = false;
    MENU.CATEGORIES.forEach((cat) => {
      const items = MENU.ITEMS.filter((i) => i.cat === cat.id).filter((i) => {
        if (!q) return true;
        const hay = (L(i.name) + " " + L(i.desc) + " " + (i.badge ? tr("badge." + i.badge) : "") + " " + L(cat.name)).toLowerCase();
        return hay.includes(q);
      });
      if (!items.length) return;
      any = true;
      html += '<section class="menu-cat reveal" id="cat-' + cat.id + '" aria-labelledby="h-' + cat.id + '">';
      html += '<h3 id="h-' + cat.id + '">' + escapeHtml(L(cat.name)) + "</h3>";
      html += '<div class="item-grid">';
      items.forEach((item) => {
        const price = (hasPriceRange(item) ? tr("menu.from") + " " : "") + money(minPrice(item));
        html +=
          '<button type="button" class="item-card' + (item.img ? " has-img" : "") + '" data-item="' + item.id + '">' +
          '<span class="item-text">' +
          '<span class="item-name">' + badgeHtml(item) + escapeHtml(L(item.name)) + "</span>" +
          '<span class="item-desc">' + escapeHtml(L(item.desc)) + "</span>" +
          '<span class="item-price">' + price + "</span>" +
          "</span>" +
          (item.img
            ? '<span class="item-img"><img src="' + item.img + '" alt="" loading="lazy" width="240" height="240"></span>'
            : "") +
          '<span class="item-add" aria-hidden="true"><i class="ph-bold ph-plus"></i></span>' +
          '<span class="sr-only">' + escapeHtml(tr("menu.add")) + "</span>" +
          "</button>";
      });
      html += "</div></section>";
    });
    if (!any) {
      html = '<div class="menu-empty"><i class="ph-bold ph-magnifying-glass" aria-hidden="true"></i><p>' + escapeHtml(tr("menu.empty", { q })) + "</p></div>";
    }
    menuList.innerHTML = html;

    // Kategorie-Leiste
    catScroll.innerHTML = MENU.CATEGORIES.filter((c) => document.getElementById("cat-" + c.id))
      .map((c) => '<a class="cat-pill" href="#cat-' + c.id + '" data-cat="' + c.id + '">' + escapeHtml(L(c.name)) + "</a>")
      .join("");

    observeCategories();
    observeReveals();
  }

  menuList.addEventListener("click", (e) => {
    const card = e.target.closest(".item-card");
    if (card) openItem(card.dataset.item);
  });

  let searchTimer;
  $("#menuSearch").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderMenu, 120);
  });

  let catObserver;
  function observeCategories() {
    if (catObserver) catObserver.disconnect();
    if (!("IntersectionObserver" in window)) return;
    catObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const id = en.target.id.replace("cat-", "");
          $$(".cat-pill").forEach((p) => {
            const active = p.dataset.cat === id;
            p.classList.toggle("is-active", active);
            if (active) p.setAttribute("aria-current", "true");
            else p.removeAttribute("aria-current");
            if (active) {
              const bar = catScroll;
              const left = p.offsetLeft - bar.clientWidth / 2 + p.clientWidth / 2;
              bar.scrollTo({ left, behavior: "smooth" });
            }
          });
        });
      },
      { rootMargin: "-140px 0px -60% 0px" }
    );
    $$(".menu-cat").forEach((s) => catObserver.observe(s));
  }

  /* ---------- Artikel-Dialog ---------- */
  const dlg = $("#itemDialog");
  let current = null; // { item, sel, qty }

  function defaultSelection(item) {
    const sel = {};
    item.groups.forEach((g) => {
      if (g.type === "variant" || (g.type === "choice" && g.required && !g.multi)) sel[g.id] = g.values[0].id;
      else if (g.multi) sel[g.id] = [];
    });
    return sel;
  }

  function openItem(id) {
    const item = itemsById[id];
    current = { item, sel: defaultSelection(item), qty: 1 };
    $("#dlgTitle").textContent = L(item.name);
    $("#dlgDesc").textContent = L(item.desc);
    $("#dlgMedia").innerHTML = item.img ? '<img src="' + item.img + '" alt="' + escapeHtml(L(item.name)) + '">' : "";
    $("#dlgMedia").hidden = !item.img;
    $("#dlgAllergens").textContent = item.allergens ? L(item.allergens) : tr("item.allergensText");
    renderGroups();
    updateDialogPrice();
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    document.body.classList.add("no-scroll");
  }

  function renderGroups() {
    const { item, sel } = current;
    $("#dlgGroups").innerHTML = item.groups
      .map((g) => {
        const isRadio = !g.multi;
        const req = g.type === "variant" || g.required;
        const meta = req ? tr("item.required") : g.max ? tr("item.max", { n: g.max }) : tr("item.optional");
        const opts = g.values
          .map((v) => {
            const isAddon = g.type === "addon";
            const label = isAddon ? L(MENU.ADDONS[v.id].name) : L(v.label);
            const priceTxt = isAddon ? signedMoney(MENU.ADDONS[v.id].price) : v.delta ? signedMoney(v.delta) : "";
            const checked = isRadio ? sel[g.id] === v.id : (sel[g.id] || []).includes(v.id);
            const inputId = "o-" + g.id + "-" + v.id.replace(/\W+/g, "_");
            return (
              '<label class="opt" for="' + inputId + '">' +
              '<input type="' + (isRadio ? "radio" : "checkbox") + '" id="' + inputId + '" name="g-' + g.id + '" value="' + escapeHtml(v.id) + '" data-group="' + g.id + '"' + (checked ? " checked" : "") + ">" +
              '<span class="opt-label">' + escapeHtml(label) + "</span>" +
              (priceTxt ? '<span class="opt-price">' + priceTxt + "</span>" : "") +
              "</label>"
            );
          })
          .join("");
        return (
          '<fieldset class="opt-group">' +
          '<legend><span>' + escapeHtml(L(g.label)) + '</span><span class="opt-meta' + (req ? " is-req" : "") + '">' + escapeHtml(meta) + "</span></legend>" +
          (g.hint ? '<p class="opt-hint">' + escapeHtml(L(g.hint)) + "</p>" : "") +
          opts +
          "</fieldset>"
        );
      })
      .join("");
    enforceMax();
  }

  function enforceMax() {
    current.item.groups.forEach((g) => {
      if (!g.max) return;
      const chosen = current.sel[g.id] || [];
      $$('input[data-group="' + g.id + '"]', dlg).forEach((inp) => {
        inp.disabled = chosen.length >= g.max && !inp.checked;
      });
    });
  }

  $("#dlgGroups").addEventListener("change", (e) => {
    const inp = e.target;
    if (!inp.dataset.group) return;
    const g = current.item.groups.find((x) => x.id === inp.dataset.group);
    if (g.multi) {
      const set = new Set(current.sel[g.id] || []);
      if (inp.checked) set.add(inp.value);
      else set.delete(inp.value);
      // Reihenfolge wie im Menü behalten
      current.sel[g.id] = g.values.map((v) => v.id).filter((id) => set.has(id));
    } else {
      current.sel[g.id] = inp.value;
    }
    enforceMax();
    updateDialogPrice();
  });

  function updateDialogPrice() {
    $("#qtyOut").textContent = current.qty;
    $("#dlgPrice").textContent = money(unitPrice(current.item, current.sel) * current.qty);
    $("#qtyMinus").disabled = current.qty <= 1;
  }

  $("#qtyMinus").addEventListener("click", () => {
    current.qty = Math.max(1, current.qty - 1);
    updateDialogPrice();
  });
  $("#qtyPlus").addEventListener("click", () => {
    current.qty = Math.min(20, current.qty + 1);
    updateDialogPrice();
  });
  $("#dlgAdd").addEventListener("click", () => {
    flyToCart($("#dlgAdd"));
    addToCart(current.item.id, current.sel, current.qty);
    toast(tr("cart.added", { name: L(current.item.name) }));
    dlg.close();
  });
  $("#dlgClose").addEventListener("click", () => dlg.close());
  dlg.addEventListener("close", () => {
    if (!$("#cartPanel").classList.contains("is-open")) document.body.classList.remove("no-scroll");
  });
  // Klick auf den abgedunkelten Hintergrund schließt den Dialog
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });

  /* ---------- Warenkorb rendern ---------- */
  const cartPanel = $("#cartPanel");

  function renderCart() {
    const linesEl = $("#cartLines");
    if (!cart.length) {
      linesEl.innerHTML = '<div class="cart-empty"><i class="ph-bold ph-shopping-bag" aria-hidden="true"></i><p>' + escapeHtml(tr("cart.empty")) + "</p></div>";
    } else {
      linesEl.innerHTML = cart
        .map((l, idx) => {
          const item = itemsById[l.itemId];
          const details = selectionSummary(item, l.sel, false);
          return (
            '<div class="cart-line">' +
            '<div class="line-qty" role="group" aria-label="' + escapeHtml(L(item.name)) + '">' +
            '<button type="button" class="icon-btn" data-dec="' + idx + '" aria-label="' + (l.qty === 1 ? escapeHtml(tr("cart.remove")) : "-1") + '"><i class="ph-bold ' + (l.qty === 1 ? "ph-trash" : "ph-minus") + '" aria-hidden="true"></i></button>' +
            "<span>" + l.qty + "</span>" +
            '<button type="button" class="icon-btn" data-inc="' + idx + '" aria-label="+1"><i class="ph-bold ph-plus" aria-hidden="true"></i></button>' +
            "</div>" +
            '<div class="line-text"><strong>' + escapeHtml(L(item.name)) + "</strong>" +
            (details.length ? "<small>" + escapeHtml(details.join(" · ")) + "</small>" : "") +
            "</div>" +
            '<span class="line-price">' + money(unitPrice(item, l.sel) * l.qty) + "</span>" +
            "</div>"
          );
        })
        .join("");
    }

    const sub = subtotal();
    const fee = deliveryFee(sub);
    $("#subtotal").textContent = money(sub);
    $("#feeRow").hidden = mode !== "delivery";
    $("#fee").textContent = fee === 0 && mode === "delivery" ? tr("cart.feeFree") : money(fee);
    $("#total").textContent = money(sub + fee);

    const minHint = $("#minHint");
    if (mode === "delivery" && cart.length) {
      if (sub < C.delivery.minOrder) {
        minHint.textContent = tr("cart.minOrder", { min: money(C.delivery.minOrder), missing: money(C.delivery.minOrder - sub) });
        minHint.hidden = false;
      } else if (sub < C.delivery.freeFrom) {
        minHint.textContent = tr("cart.freeFrom", { free: money(C.delivery.freeFrom) });
        minHint.hidden = false;
      } else minHint.hidden = true;
    } else minHint.hidden = true;

    $("#checkoutBtn").disabled = !cart.length || (mode === "delivery" && sub < C.delivery.minOrder);

    const count = cartCount();
    $("#headerCount").textContent = count;
    $("#headerCount").hidden = !count;
    $("#headerTotal").textContent = money(sub + fee);
    $("#barCount").textContent = count;
    $("#barTotal").textContent = money(sub + fee);
    $("#cartBar").hidden = !count;
  }

  $("#cartLines").addEventListener("click", (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    if (inc) cart[+inc.dataset.inc].qty = Math.min(50, cart[+inc.dataset.inc].qty + 1);
    if (dec) {
      const i = +dec.dataset.dec;
      cart[i].qty -= 1;
      if (cart[i].qty <= 0) cart.splice(i, 1);
    }
    if (inc || dec) {
      saveCart();
      renderCart();
    }
  });

  function bump() {
    [$("#cartOpen"), $("#cartBar")].forEach((el) => {
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
    });
  }

  /* Warenkorb als Sheet (mobil) öffnen/schließen */
  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  document.body.appendChild(backdrop);
  let lastFocus = null;

  function isDrawer() {
    return window.matchMedia("(max-width: 1099px)").matches;
  }
  function openCart() {
    if (!isDrawer()) {
      cartPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    lastFocus = document.activeElement;
    $("#toast").classList.remove("is-on");
    cartPanel.classList.add("is-open");
    backdrop.classList.add("is-on");
    document.body.classList.add("no-scroll");
    setTimeout(() => $("#cartClose").focus(), 50);
  }
  function closeCart() {
    cartPanel.classList.remove("is-open");
    backdrop.classList.remove("is-on");
    document.body.classList.remove("no-scroll");
    if (lastFocus) lastFocus.focus();
  }
  $("#cartOpen").addEventListener("click", openCart);
  $("#cartBar").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  backdrop.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cartPanel.classList.contains("is-open")) closeCart();
  });

  /* ---------- Bestellart & Zeitfenster ---------- */
  function renderMode() {
    $$(".mode-btn").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.mode === mode)));
    $("#deliveryFields").hidden = mode !== "delivery";
    $("#slotLabel").textContent = tr(mode === "delivery" ? "form.slotDelivery" : "form.slotPickup");
    renderSlots();
    renderCart();
  }

  function renderSlots() {
    const sel = $("#slot");
    const prev = sel.value;
    const { state, days, lead } = buildSlots(mode);
    let html = "";
    if (state.open) {
      const eta = mode === "delivery" ? C.delivery.etaMinutes.join("-") : String(lead);
      html += '<option value="asap">' + escapeHtml(tr("form.asap", { min: eta })) + "</option>";
    }
    days.forEach((d, i) => {
      const label = !state.open && i === 0 ? tr("form.preorder", { day: dayName(d.off, d.dow) }) : dayName(d.off, d.dow);
      html += '<optgroup label="' + escapeHtml(label) + '">';
      d.slots.forEach((t) => {
        const val = d.date + " " + hhmm(t);
        html += '<option value="' + val + '">' + escapeHtml(dayName(d.off, d.dow) + ", " + tr("clock", { h: hhmm(t) })) + "</option>";
      });
      html += "</optgroup>";
    });
    sel.innerHTML = html;
    if (prev && $$("option", sel).some((o) => o.value === prev)) sel.value = prev;
  }

  $$(".mode-btn").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      saveCart();
      renderMode();
    })
  );
  // Pfeiltasten in der Radiogruppe
  $(".mode-switch").addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    mode = mode === "pickup" ? "delivery" : "pickup";
    saveCart();
    renderMode();
    $('.mode-btn[data-mode="' + mode + '"]').focus();
  });

  /* ---------- Checkout (Shopify Cart-Permalink) ---------- */
  function fieldError(msg) {
    const el = $("#zipError");
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function slotText() {
    const v = $("#slot").value;
    if (v === "asap") return "So schnell wie möglich";
    return v;
  }

  function buildOrder() {
    const lines = {}; // variantId -> qty
    const missing = [];
    const noteLines = [];
    cart.forEach((l) => {
      const item = itemsById[l.itemId];
      const vt = variantTitle(item, l.sel);
      const vid = VARIANTS[item.id + "|" + vt];
      if (vid) lines[vid] = (lines[vid] || 0) + l.qty;
      else missing.push(item.id + "|" + vt);
      item.groups
        .filter((g) => g.type === "addon")
        .forEach((g) =>
          (l.sel[g.id] || []).forEach((a) => {
            const aid = VARIANTS[a + "|Default Title"];
            if (aid) lines[aid] = (lines[aid] || 0) + l.qty;
            else missing.push(a + "|Default Title");
          })
        );
      const details = selectionSummary(item, l.sel, true);
      noteLines.push(l.qty + "x " + item.name.de + (details.length ? " (" + details.join("; ") + ")" : ""));
    });
    const extra = $("#note").value.trim();
    const note =
      (mode === "delivery" ? "LIEFERUNG" : "ABHOLUNG") + " | " + slotText() + "\n" + noteLines.join("\n") + (extra ? "\nAnmerkung: " + extra : "");
    return { lines, missing, note };
  }

  function checkoutUrl(order) {
    const path = Object.entries(order.lines)
      .map(([id, q]) => id + ":" + q)
      .join(",");
    const p = new URLSearchParams();
    p.set("note", order.note);
    p.set("attributes[Bestellart]", mode === "delivery" ? "Lieferung" : "Abholung");
    p.set("attributes[Wunschzeit]", slotText());
    if (mode === "delivery") {
      p.set("checkout[shipping_address][address1]", $("#street").value.trim());
      p.set("checkout[shipping_address][zip]", $("#zip").value.trim());
      p.set("checkout[shipping_address][city]", $("#city").value.trim());
      p.set("checkout[shipping_address][country]", "DE");
    }
    return "https://" + C.shopifyDomain.replace(/^https?:\/\//, "").replace(/\/$/, "") + "/cart/" + path + "?" + p.toString();
  }

  $("#checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    fieldError("");
    if (!cart.length) return;
    if (mode === "delivery") {
      const zip = $("#zip").value.trim();
      if (!$("#street").value.trim()) {
        fieldError(tr("form.streetMissing"));
        $("#street").focus();
        return;
      }
      if (!/^\d{5}$/.test(zip)) {
        fieldError(tr("form.zipInvalid"));
        $("#zip").focus();
        return;
      }
      if (!C.delivery.zips.includes(zip)) {
        fieldError(tr("form.zipOutside", { zip }));
        $("#zip").focus();
        return;
      }
      if (subtotal() < C.delivery.minOrder) return;
    }

    const order = buildOrder();
    if (!shopifyReady()) {
      if (C.shopifyDomain && order.missing.length && window.console) {
        console.warn("Shopify-Varianten fehlen, Bestellung läuft über WhatsApp:", order.missing);
      }
      const text = localOrderText();
      $("#demoSummary").textContent = text;
      const wa = $("#waOrder");
      wa.hidden = !C.whatsapp;
      if (C.whatsapp) wa.href = "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(text);
      const dd = $("#demoDialog");
      if (typeof dd.showModal === "function") dd.showModal();
      else dd.setAttribute("open", "");
      return;
    }
    toast(tr("redirect"));
    window.location.href = checkoutUrl(order);
  });

  /* Shopify ist "bereit", wenn eine Domain gesetzt ist und alle Varianten im Warenkorb eine ID haben. */
  function shopifyReady() {
    if (!C.shopifyDomain) return false;
    return buildOrder().missing.length === 0;
  }

  /* Gut lesbare Bestellung für WhatsApp (in der gewählten Sprache) */
  function localOrderText() {
    const lines = cart.map((l) => {
      const item = itemsById[l.itemId];
      const details = selectionSummary(item, l.sel, false);
      return "- " + l.qty + "x " + L(item.name) + (details.length ? " (" + details.join(", ") + ")" : "") + "  " + money(unitPrice(item, l.sel) * l.qty);
    });
    const v = $("#slot").value;
    const time = v === "asap" ? tr("wa.asap") : $("#slot").selectedOptions[0].textContent;
    const where =
      mode === "delivery"
        ? tr("wa.delivery") + ": " + $("#street").value.trim() + ", " + $("#zip").value.trim() + " " + $("#city").value.trim()
        : tr("wa.pickup") + ": Am Bahnhof 2";
    const extra = $("#note").value.trim();
    const sub = subtotal();
    const fee = deliveryFee(sub);
    return [
      tr("wa.intro"),
      "",
      ...lines,
      "",
      where,
      tr("wa.time") + ": " + time,
      extra ? tr("wa.note") + ": " + extra : null,
      "",
      (fee ? tr("cart.fee") + ": " + money(fee) + "\n" : "") + tr("cart.total") + ": " + money(sub + fee),
    ]
      .filter((x) => x !== null)
      .join("\n");
  }

  function closeDemo() {
    const dd = $("#demoDialog");
    if (typeof dd.close === "function") dd.close();
    else dd.removeAttribute("open");
  }
  $("#demoClose").addEventListener("click", closeDemo);
  $("#waOrder").addEventListener("click", () => setTimeout(closeDemo, 300));
  $("#demoDialog").addEventListener("click", (e) => {
    if (e.target === $("#demoDialog")) closeDemo();
  });

  /* Kasse-Button und Hinweis je nach Bestellweg */
  function renderCheckoutLabel() {
    const viaShop = !!C.shopifyDomain;
    $('#checkoutBtn [data-i18n]').textContent = tr(viaShop ? "cart.checkout" : "cart.order");
    $(".pay-note").textContent = tr(viaShop ? "cart.payNote" : "cart.payNoteLocal");
    const icon = $("#checkoutBtn i");
    icon.className = "ph-bold " + (viaShop ? "ph-lock-simple" : "ph-whatsapp-logo");
  }

  $("#zip").addEventListener("input", () => fieldError(""));
  $("#street").addEventListener("input", () => fieldError(""));

  /* ---------- Öffnungsstatus, Zeiten ---------- */
  function renderStatus() {
    const st = openState();
    const sticker = $("#openSticker");
    const text = $("#openStickerText");
    sticker.classList.toggle("is-closed", !st.open);
    if (st.open) {
      text.textContent = st.closingSoon ? tr("status.closingSoon", { time: tr("clock", { h: hhmm(st.closesAt) }) }) : tr("status.open");
    } else {
      text.textContent = tr("status.closed");
    }

    const rows = [1, 2, 3, 4, 5, 6, 0]
      .map((dow) => {
        const h = C.hours[dow];
        const isToday = dow === st.now.dow;
        return (
          "<tr" + (isToday ? ' class="is-today"' : "") + ">" +
          '<th scope="row">' + escapeHtml(tr("days")[dow]) + (isToday ? " <small>(" + escapeHtml(tr("loc.today")) + ")</small>" : "") + "</th>" +
          "<td>" + (h ? tr("clock", { h: hhmm(h[0] * 60) + " - " + hhmm(h[1] * 60) }) : escapeHtml(tr("loc.closed"))) + "</td>" +
          "</tr>"
        );
      })
      .join("");
    $("#hoursTable").innerHTML = rows;
    $("#factHoursTitle").textContent = tr("hoursFact");
    $("#factDeliverySub").textContent = tr("facts.deliverySub", { min: money(C.delivery.minOrder) });
  }

  /* ---------- Hero: Instagram-Reel als Hintergrundvideo ---------- */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const video = $("#heroVideo");
  const videoToggle = $("#videoToggle");
  let videoWanted = true; // Nutzer hat nicht auf Pause gedrückt

  function setToggleIcon() {
    const paused = video.paused;
    videoToggle.querySelector("i").className = "ph-bold " + (paused ? "ph-play" : "ph-pause");
    videoToggle.setAttribute("aria-label", tr(paused ? "video.play" : "video.pause"));
  }

  function startHeroVideo() {
    const saveData = navigator.connection && navigator.connection.saveData;
    if (!C.reel.video || saveData || reduceMotion.matches) return;
    video.src = C.reel.video;
    video.addEventListener(
      "loadeddata",
      () => {
        document.querySelector(".hero").classList.add("has-video");
        videoToggle.hidden = false;
        video.play().then(setToggleIcon).catch(setToggleIcon);
      },
      { once: true }
    );
    // Fehlt die Datei: Foto bleibt einfach stehen, kein Fehler für den Kunden
    video.addEventListener("error", () => video.removeAttribute("src"), { once: true });
    video.load();

    // Pausieren, wenn der Hero nicht sichtbar ist (spart Akku und Daten)
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!video.src) return;
          if (en.isIntersecting && videoWanted) video.play().catch(() => {});
          else video.pause();
        });
      }).observe(video);
    }
  }
  videoToggle.addEventListener("click", () => {
    if (video.paused) {
      videoWanted = true;
      video.play().catch(() => {});
    } else {
      videoWanted = false;
      video.pause();
    }
  });
  video.addEventListener("play", setToggleIcon);
  video.addEventListener("pause", setToggleIcon);

  /* ---------- Karte (2-Klick-Lösung) ---------- */
  $("#mapLoad").addEventListener("click", () => {
    if (!C.mapEmbed) {
      window.open($("#routeGoogle").href, "_blank", "noopener");
      return;
    }
    const card = $("#mapCard");
    card.classList.add("is-map");
    card.innerHTML =
      '<iframe src="' + C.mapEmbed + '" title="Karte: Herr Biggie, Am Bahnhof 2, Siegen" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>';
  });

  /* ---------- Geschichte: Jahreszahlen, wenn hinterlegt ---------- */
  function renderStoryYears() {
    const years = C.storyYears || [];
    $$(".stop-when[data-year]").forEach((el) => {
      const y = years[+el.dataset.year];
      if (y) el.textContent = y + " · " + tr(el.dataset.i18n);
    });
  }

  /* ---------- Fly-to-Cart: kleiner Punkt fliegt in den Warenkorb ---------- */
  function flyToCart(fromEl) {
    if (reduceMotion.matches || !fromEl || !document.body.animate) return;
    const bar = $("#cartBar");
    const target = !bar.hidden && bar.offsetParent ? bar : $("#cartOpen");
    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const dot = document.createElement("span");
    dot.className = "fly-dot";
    dot.innerHTML = '<i class="ph-bold ph-shopping-bag" aria-hidden="true"></i>';
    document.body.appendChild(dot);
    const x0 = a.left + a.width / 2 - 20;
    const y0 = a.top + a.height / 2 - 20;
    const x1 = b.left + b.width / 2 - 20;
    const y1 = b.top + b.height / 2 - 20;
    const lift = Math.min(160, Math.abs(y1 - y0) / 2 + 60);
    dot
      .animate(
        [
          { transform: `translate(${x0}px, ${y0}px) scale(0.6)`, opacity: 0 },
          { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - lift}px) scale(1.15)`, opacity: 1, offset: 0.5 },
          { transform: `translate(${x1}px, ${y1}px) scale(0.5)`, opacity: 0.4 },
        ],
        { duration: 700, easing: "cubic-bezier(0.5, 0, 0.3, 1)" }
      )
      .finished.then(() => dot.remove(), () => dot.remove());
  }

  /* ---------- Sprache anwenden ---------- */
  function applyLang() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => {
      el.textContent = tr(el.dataset.i18n);
    });
    $$("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", tr(el.dataset.i18nPlaceholder));
    });
    $("#langLabel").textContent = lang === "de" ? "EN" : "DE";
    $("#langToggle").setAttribute("aria-label", lang === "de" ? "Switch to English" : "Auf Deutsch wechseln");
    renderMenu();
    renderStatus();
    renderMode();
    renderCheckoutLabel();
    renderStoryYears();
    if (video.src) setToggleIcon();
  }
  $("#langToggle").addEventListener("click", () => {
    lang = lang === "de" ? "en" : "de";
    store.set("hb.lang", lang);
    applyLang();
  });

  /* ---------- Kleinkram ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 2400);
  }

  // Einblend-Animationen laufen per CSS (scroll-driven, animation-timeline: view()).
  // Ohne Browser-Unterstützung ist alles sofort sichtbar, nichts wartet auf JavaScript.
  function observeReveals() {}

  applyLang();
  startHeroVideo();
  // Status und Zeitfenster jede Minute aktualisieren
  setInterval(() => {
    renderStatus();
    renderSlots();
  }, 60000);
})();
