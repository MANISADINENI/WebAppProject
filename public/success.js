const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const el = document.getElementById("receipt");
const sessionId = new URLSearchParams(location.search).get("session_id");

function fail(msg) {
  el.innerHTML = `<p class="mono muted">order / unknown</p><h1>We couldn't find that order.</h1>
    <p>${esc(msg)}</p><div class="actions"><a class="btn btn-primary" href="/">Back to the catalog</a></div>`;
}

async function load() {
  if (!sessionId) return fail("The confirmation link is missing its session id.");
  const res = await fetch(`/api/orders/${encodeURIComponent(sessionId)}`);
  if (!res.ok) return fail("If you were charged, your email receipt from Stripe has the details.");
  const order = await res.json();
  const paid = order.status === "paid";
  if (paid) localStorage.removeItem("rollback-cart");

  el.innerHTML = `
    <p class="mono muted">order / #${String(order.id).padStart(5, "0")}</p>
    <h1>${paid ? "Shipped to production." : "Payment processing."}</h1>
    <p>${paid
      ? `Thanks for your order${order.email ? `. A receipt is on its way to <strong>${esc(order.email)}</strong>` : ""}.`
      : "Your payment is still being confirmed. This page updates automatically."}</p>
    <span class="status mono ${paid ? "paid" : "pending"}">${paid ? "● paid" : "○ pending"}</span>
    <table>
      <tbody>${order.items.map((i) => `<tr><td>${esc(i.name)} × ${i.quantity}</td><td>${money(i.unitPriceCents * i.quantity)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>Subtotal</td><td>${money(order.amountCents)}</td></tr></tfoot>
    </table>
    <p class="mono muted small">Shipping and tax appear on your Stripe receipt.</p>
    <div class="actions"><a class="btn btn-primary" href="/">Keep shopping</a></div>`;

  if (!paid) setTimeout(load, 4000);
}
load().catch(() => fail("Something went wrong loading your order."));
