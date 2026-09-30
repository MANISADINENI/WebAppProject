const CART_KEY = "rollback-cart";
const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (id) => document.getElementById(id);

let products = [];
let cart = loadCart();
let filter = "all";

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

function art(p, cls = "art") {
  return `<div class="${cls}" style="--tone:${esc(p.tone)}">
    <span class="art-cat">${esc(p.category)}</span>
    <span class="art-glyph">${esc(p.glyph)}</span>
  </div>`;
}

function renderGrid() {
  const grid = $("grid");
  const list = filter === "all" ? products : products.filter((p) => p.category === filter);
  if (list.length === 0) {
    grid.innerHTML = `<div class="empty">No products in <strong>${esc(filter)}</strong> right now. Check back after the next restock.</div>`;
    return;
  }
  grid.innerHTML = list
    .map(
      (p, i) => `
      <article class="card${i === 0 && filter === "all" ? " feature" : ""}" style="animation-delay:${i * 45}ms">
        <button class="card-open" data-open="${esc(p.slug)}" aria-label="View ${esc(p.name)}">
          ${art(p)}
        </button>
        <div class="card-body">
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.tagline)}</p>
          <div class="card-foot">
            <span class="price">${money(p.priceCents)}</span>
            <button class="add" type="button" data-add="${esc(p.slug)}">Add +</button>
          </div>
        </div>
      </article>`,
    )
    .join("");
}

function renderCart() {
  const entries = Object.entries(cart).filter(([slug]) => products.some((p) => p.slug === slug));
  const count = entries.reduce((n, [, q]) => n + q, 0);
  const countEl = $("cart-count");
  if (countEl.textContent !== String(count)) {
    countEl.textContent = count;
    countEl.classList.remove("bump");
    void countEl.offsetWidth;
    countEl.classList.add("bump");
  }

  const body = $("cart-lines");
  if (entries.length === 0) {
    body.innerHTML = `<div class="cart-empty">
      <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="18" width="44" height="36" rx="3"/><path d="M22 18v-4a10 10 0 0 1 20 0v4"/></svg>
      <p class="mono">Nothing staged for release yet.</p>
    </div>`;
  } else {
    body.innerHTML = entries
      .map(([slug, qty]) => {
        const p = products.find((x) => x.slug === slug);
        return `<div class="line">
          <div class="line-art" style="--tone:${esc(p.tone)}">${esc(p.glyph)}</div>
          <div>
            <h4>${esc(p.name)}</h4>
            <div class="qty">
              <button type="button" data-dec="${esc(slug)}" aria-label="Decrease ${esc(p.name)}">−</button>
              <output>${qty}</output>
              <button type="button" data-inc="${esc(slug)}" aria-label="Increase ${esc(p.name)}">+</button>
            </div>
          </div>
          <div class="line-right">
            <span class="price">${money(p.priceCents * qty)}</span>
            <button class="remove" type="button" data-remove="${esc(slug)}">remove</button>
          </div>
        </div>`;
      })
      .join("");
  }
  const subtotal = entries.reduce((sum, [slug, q]) => sum + products.find((p) => p.slug === slug).priceCents * q, 0);
  $("cart-subtotal").textContent = money(subtotal);
  $("checkout").disabled = entries.length === 0;
}

function addToCart(slug, qty = 1) {
  cart[slug] = Math.min(20, (cart[slug] || 0) + qty);
  saveCart();
  const p = products.find((x) => x.slug === slug);
  toast(`${p.name} added to cart`);
}

let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

// Drawer
function openDrawer() {
  $("scrim").hidden = false;
  requestAnimationFrame(() => $("scrim").classList.add("show"));
  $("drawer").classList.add("open");
  $("drawer").setAttribute("aria-hidden", "false");
  document.body.classList.add("locked");
  $("cart-close").focus();
}
function closeDrawer() {
  $("scrim").classList.remove("show");
  $("drawer").classList.remove("open");
  $("drawer").setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked");
  setTimeout(() => ($("scrim").hidden = true), 300);
}

// Detail dialog
let detailSlug = null;
let detailQty = 1;
function openDetail(slug) {
  const p = products.find((x) => x.slug === slug);
  if (!p) return;
  detailSlug = slug;
  detailQty = 1;
  $("detail-art").outerHTML = art(p, "art detail-art").replace('class="art detail-art"', 'class="art detail-art" id="detail-art"');
  $("detail-cat").textContent = `/${p.category}`;
  $("detail-name").textContent = p.name;
  $("detail-tagline").textContent = p.tagline;
  $("detail-desc").textContent = p.description;
  $("detail-price").textContent = money(p.priceCents);
  $("qty-val").textContent = detailQty;
  $("detail").showModal();
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.add) {
    addToCart(t.dataset.add);
    t.classList.add("added");
    t.textContent = "Added";
    setTimeout(() => { t.classList.remove("added"); t.textContent = "Add +"; }, 1200);
  } else if (t.dataset.open) openDetail(t.dataset.open);
  else if (t.dataset.inc) { cart[t.dataset.inc] = Math.min(20, cart[t.dataset.inc] + 1); saveCart(); }
  else if (t.dataset.dec) {
    cart[t.dataset.dec] -= 1;
    if (cart[t.dataset.dec] <= 0) delete cart[t.dataset.dec];
    saveCart();
  } else if (t.dataset.remove) { delete cart[t.dataset.remove]; saveCart(); }
});

$("filters").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-cat]");
  if (!b) return;
  filter = b.dataset.cat;
  for (const btn of $("filters").querySelectorAll("button")) btn.setAttribute("aria-selected", String(btn === b));
  renderGrid();
});

$("cart-open").addEventListener("click", openDrawer);
$("cart-close").addEventListener("click", closeDrawer);
$("scrim").addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("drawer").classList.contains("open")) closeDrawer();
});

$("detail-close").addEventListener("click", () => $("detail").close());
$("detail").addEventListener("click", (e) => { if (e.target === $("detail")) $("detail").close(); });
$("qty-dec").addEventListener("click", () => { detailQty = Math.max(1, detailQty - 1); $("qty-val").textContent = detailQty; });
$("qty-inc").addEventListener("click", () => { detailQty = Math.min(20, detailQty + 1); $("qty-val").textContent = detailQty; });
$("detail-add").addEventListener("click", () => {
  addToCart(detailSlug, detailQty);
  $("detail").close();
});

$("checkout").addEventListener("click", async () => {
  const btn = $("checkout");
  const err = $("checkout-error");
  err.textContent = "";
  btn.disabled = true;
  btn.textContent = "Opening secure checkout…";
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: Object.entries(cart).map(([slug, quantity]) => ({ slug, quantity })) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed. Please try again.");
    window.location.href = data.url;
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false;
    btn.textContent = "Check out securely";
  }
});

async function init() {
  try {
    const res = await fetch("/api/products");
    if (!res.ok) throw new Error();
    products = await res.json();
    renderGrid();
    renderCart();
  } catch {
    $("grid").innerHTML = `<div class="empty">Couldn't load the catalog. <button class="add" type="button" id="retry">Retry</button></div>`;
    $("retry").addEventListener("click", init);
  }
  if (new URLSearchParams(location.search).get("checkout") === "cancelled") {
    toast("Checkout cancelled. Your cart is still here.");
    history.replaceState(null, "", "/");
  }
}
init();
