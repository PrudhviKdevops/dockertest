/* Zesty — vanilla JS single-page UI */
const $ = (s) => document.querySelector(s);
const app = $('#app');
const money = (n) => '₹' + Number(n).toFixed(n % 1 ? 2 : 0);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const api = async (url, opts) => {
  const res = await fetch(url, opts && { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};

/* ---------- State ---------- */
const state = {
  cart: load('cart', { restaurantId: null, restaurantName: '', items: {} }), // items: {id:{id,name,price,qty}}
  coupon: '',
  filters: { cuisine: 'All', veg: false, q: '' },
  restaurantCache: {},
  pollTimer: null
};
function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } }
function save() { localStorage.setItem('cart', JSON.stringify(state.cart)); updateBadge(); }

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Cart logic ---------- */
const cartCount = () => Object.values(state.cart.items).reduce((s, i) => s + i.qty, 0);
const cartSubtotal = () => Object.values(state.cart.items).reduce((s, i) => s + i.qty * i.price, 0);
function updateBadge() { $('#cartCount').textContent = cartCount(); }

function addItem(r, item) {
  if (state.cart.restaurantId && state.cart.restaurantId !== r.id && cartCount() > 0) {
    if (!confirm(`Your cart has items from ${state.cart.restaurantName}. Start a new cart with ${r.name}?`)) return;
    state.cart = { restaurantId: null, restaurantName: '', items: {} };
  }
  state.cart.restaurantId = r.id;
  state.cart.restaurantName = r.name;
  const cur = state.cart.items[item.id];
  if (cur) cur.qty = Math.min(20, cur.qty + 1);
  else state.cart.items[item.id] = { id: item.id, name: item.name, price: item.price, qty: 1 };
  save(); refreshMenuQty(); renderCart();
}
function changeQty(id, delta) {
  const it = state.cart.items[id]; if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) delete state.cart.items[id];
  if (it.qty > 20) it.qty = 20;
  if (cartCount() === 0) { state.cart.restaurantId = null; state.cart.restaurantName = ''; state.coupon = ''; }
  save(); refreshMenuQty(); renderCart();
}

/* ---------- Drawer ---------- */
const drawer = $('#drawer'), overlay = $('#overlay');
function openCart() { renderCart(); drawer.classList.add('open'); overlay.classList.remove('hidden'); }
function closeCart() { drawer.classList.remove('open'); overlay.classList.add('hidden'); }
$('#cartBtn').onclick = openCart;
$('#closeCart').onclick = closeCart;
overlay.onclick = () => { closeCart(); closeModal(); };

let quoteSeq = 0;
async function renderCart() {
  const body = $('#cartBody');
  const items = Object.values(state.cart.items);
  if (!items.length) {
    body.innerHTML = `<div class="empty"><div class="em">🛒</div><h3>Your cart is empty</h3><p>Add something tasty from a restaurant.</p></div>`;
    return;
  }
  const lines = items.map((i) => `
    <div class="cline">
      <div><b>${esc(i.name)}</b><div class="muted">${money(i.price)} each</div></div>
      <div class="qty"><button data-d="-1" data-id="${i.id}">−</button><span>${i.qty}</span><button data-d="1" data-id="${i.id}">+</button></div>
      <b>${money(i.price * i.qty)}</b>
    </div>`).join('');

  body.innerHTML = `
    <div class="muted">from <b>${esc(state.cart.restaurantName)}</b></div>
    ${lines}
    <div class="coupon">
      <input id="couponInput" placeholder="Coupon code" value="${esc(state.coupon)}" />
      <button class="btn ghost" id="applyCoupon">Apply</button>
    </div>
    <div class="hint">Try <b>WELCOME10</b> or <b>FREESHIP</b></div>
    <div id="couponErr" class="err"></div>
    <div class="bill" id="bill"><div>Calculating…</div></div>
    <button class="btn block" id="checkoutBtn" disabled>Checkout</button>`;

  body.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => changeQty(b.dataset.id, +b.dataset.d)));
  $('#applyCoupon').onclick = () => { state.coupon = $('#couponInput').value.trim(); renderCart(); };

  const seq = ++quoteSeq;
  try {
    const q = await api('/api/quote', {
      method: 'POST',
      body: JSON.stringify({ restaurantId: state.cart.restaurantId, items: items.map((i) => ({ id: i.id, qty: i.qty })), coupon: state.coupon })
    });
    if (seq !== quoteSeq) return;
    $('#bill').innerHTML = `
      <div><span>Subtotal</span><span>${money(q.subtotal)}</span></div>
      ${q.discount ? `<div class="save"><span>Discount (${esc(q.coupon.code)})</span><span>− ${money(q.discount)}</span></div>` : ''}
      <div><span>Delivery fee</span><span>${q.deliveryFee ? money(q.deliveryFee) : 'FREE'}</span></div>
      <div><span>Taxes (5%)</span><span>${money(q.tax)}</span></div>
      <div class="total"><span>Total</span><span>${money(q.total)}</span></div>`;
    $('#checkoutBtn').disabled = false;
    $('#checkoutBtn').onclick = () => openCheckout(q);
  } catch (e) {
    if (seq !== quoteSeq) return;
    if (e.message.includes('coupon')) { state.coupon = ''; $('#couponErr').textContent = e.message; renderCartNoCoupon(); }
    else { $('#bill').innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  }
}
async function renderCartNoCoupon() { const c = $('#couponErr').textContent; await renderCart(); $('#couponErr').textContent = c; }

/* ---------- Checkout modal ---------- */
const modal = $('#modal');
function closeModal() { modal.classList.add('hidden'); }
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

function openCheckout(q) {
  const saved = load('customer', { name: '', phone: '', address: '' });
  $('#modalCard').innerHTML = `
    <h2>Delivery details</h2>
    <form id="coForm" novalidate>
      <div class="field"><label>Full name</label><input name="name" value="${esc(saved.name)}" placeholder="e.g. Ravi Kumar" required /></div>
      <div class="field"><label>Phone number</label><input name="phone" value="${esc(saved.phone)}" placeholder="10-digit mobile number" inputmode="tel" required /></div>
      <div class="field"><label>Delivery address</label><textarea name="address" rows="3" placeholder="House no, street, landmark, city" required>${esc(saved.address)}</textarea></div>
      <div class="pay">
        <label><input type="radio" name="payment" value="cod" checked /><span>💵 Cash on delivery</span></label>
        <label><input type="radio" name="payment" value="online" /><span>📱 Pay online (demo)</span></label>
      </div>
      <div id="coErr" class="err"></div>
      <button class="btn block" type="submit">Place order • ${money(q.total)}</button>
      <button class="btn ghost block" type="button" id="coCancel" style="margin-top:8px">Cancel</button>
    </form>`;
  modal.classList.remove('hidden');
  $('#coCancel').onclick = closeModal;
  $('#coForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const customer = { name: f.get('name'), phone: f.get('phone'), address: f.get('address') };
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Placing order…';
    try {
      const order = await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId: state.cart.restaurantId, coupon: state.coupon, payment: f.get('payment'), customer,
          items: Object.values(state.cart.items).map((i) => ({ id: i.id, qty: i.qty }))
        })
      });
      localStorage.setItem('customer', JSON.stringify(customer));
      state.cart = { restaurantId: null, restaurantName: '', items: {} }; state.coupon = ''; save();
      closeModal(); closeCart();
      location.hash = '#/order/' + order.id;
      toast('Order placed! 🎉');
    } catch (err) {
      $('#coErr').textContent = err.message; btn.disabled = false; btn.textContent = `Place order • ${money(q.total)}`;
    }
  };
}

/* ---------- Views ---------- */
function clearPoll() { clearInterval(state.pollTimer); state.pollTimer = null; }

async function homeView() {
  clearPoll();
  const { cuisine, veg, q } = state.filters;
  app.innerHTML = `
    <section class="hero">
      <div><h1>Hungry? We’ve got you.</h1><p>Order from the best local restaurants, delivered fast.</p><span class="promo">Use WELCOME10 for 10% off</span></div>
      <div class="big">🍜</div>
    </section>
    <div class="row">
      <div class="chips" id="chips"></div>
      <label class="toggle"><input type="checkbox" id="vegToggle" ${veg ? 'checked' : ''}/> Veg options</label>
    </div>
    <h2 class="section-title" id="listTitle">Restaurants near you</h2>
    <div class="grid" id="grid">${'<div class="skeleton"></div>'.repeat(6)}</div>`;

  try {
    const cuisines = await api('/api/cuisines');
    $('#chips').innerHTML = ['All', ...cuisines].map((c) => `<button class="chip ${c === cuisine ? 'active' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
    $('#chips').querySelectorAll('.chip').forEach((b) => (b.onclick = () => { state.filters.cuisine = b.dataset.c; homeView(); }));
    $('#vegToggle').onchange = (e) => { state.filters.veg = e.target.checked; homeView(); };

    const params = new URLSearchParams({ cuisine, veg, q });
    const list = await api('/api/restaurants?' + params);
    $('#listTitle').textContent = list.length ? `${list.length} restaurant${list.length > 1 ? 's' : ''} for you` : 'No results';
    $('#grid').innerHTML = list.length ? list.map((r) => `
      <a class="rcard" href="#/r/${r.id}">
        <div class="rcover" style="background:linear-gradient(135deg, ${r.color}, ${r.color}cc)">${r.emoji}</div>
        <div class="rbody">
          <h3>${esc(r.name)}</h3>
          <div class="muted">${esc(r.cuisine)} • ${esc(r.tagline)}</div>
          <div class="meta"><span class="rating">★ ${r.rating}</span><span>⏱ ${r.eta} min</span><span>🛵 ${money(r.deliveryFee)}</span></div>
        </div>
      </a>`).join('') : `<div class="empty"><div class="em">🔍</div><p>Nothing matched your search. Try something else.</p></div>`;
  } catch (e) { $('#grid').innerHTML = `<div class="err">${esc(e.message)}</div>`; }
}

async function restaurantView(id) {
  clearPoll();
  app.innerHTML = `<div class="skeleton" style="height:140px"></div>`;
  try {
    const r = await api('/api/restaurants/' + id);
    state.restaurantCache[id] = r;
    app.innerHTML = `
      <a class="back" href="#/">← All restaurants</a>
      <div class="rhead" style="background:linear-gradient(120deg, ${r.color}, ${r.color}bb)">
        <div class="em">${r.emoji}</div>
        <div><h1>${esc(r.name)}</h1><p>${esc(r.cuisine)} • ★ ${r.rating} • ${r.eta} min • Min order ${money(r.minOrder)}</p></div>
      </div>
      <h2 class="section-title">Menu</h2>
      <div class="menu">${r.menu.map((m) => `
        <div class="item">
          <div class="pic">${m.emoji}</div>
          <div class="info">
            <h4><span class="dot ${m.veg ? '' : 'nv'}"></span>${esc(m.name)}</h4>
            <div class="muted">${esc(m.desc)}</div>
            <div class="price">${money(m.price)}</div>
          </div>
          <div class="slot" data-id="${m.id}"></div>
        </div>`).join('')}</div>`;
    refreshMenuQty();
  } catch (e) { app.innerHTML = `<a class="back" href="#/">← Back</a><div class="empty"><div class="em">😕</div><p>${esc(e.message)}</p></div>`; }
}

function refreshMenuQty() {
  document.querySelectorAll('.slot').forEach((slot) => {
    const id = slot.dataset.id;
    const rid = id.split('m')[0];
    const r = state.restaurantCache[rid]; if (!r) return;
    const item = r.menu.find((m) => m.id === id);
    const cur = state.cart.items[id];
    slot.innerHTML = cur
      ? `<div class="qty"><button data-d="-1">−</button><span>${cur.qty}</span><button data-d="1">+</button></div>`
      : `<button class="btn add">ADD</button>`;
    if (cur) slot.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => changeQty(id, +b.dataset.d)));
    else slot.querySelector('.add').onclick = () => { addItem(r, item); toast(`${item.name} added`); };
  });
}

async function orderView(id) {
  clearPoll();
  const draw = async () => {
    try {
      const o = await api('/api/orders/' + id);
      app.innerHTML = `
        <div class="track">
          <a class="back" href="#/">← Back to restaurants</a>
          <h1>${o.status === 'delivered' ? 'Enjoy your meal! 🎉' : 'Tracking your order'}</h1>
          <div class="muted">Order <b>${esc(o.id)}</b> from <b>${esc(o.restaurant.name)}</b></div>
          <ul class="steps">${o.steps.map((s) => `<li class="${s.done ? 'done' : ''}">${esc(s.label)}</li>`).join('')}</ul>
          <div class="summary">
            ${o.lines.map((l) => `<div class="r"><span>${l.qty} × ${esc(l.name)}</span><span>${money(l.total)}</span></div>`).join('')}
            <div class="r"><span>Delivery fee</span><span>${o.deliveryFee ? money(o.deliveryFee) : 'FREE'}</span></div>
            <div class="r"><span>Taxes</span><span>${money(o.tax)}</span></div>
            ${o.discount ? `<div class="r"><span>Discount</span><span>− ${money(o.discount)}</span></div>` : ''}
            <div class="r"><b>Total (${o.payment === 'cod' ? 'Cash on delivery' : 'Paid online'})</b><b>${money(o.total)}</b></div>
          </div>
          <p class="muted" style="margin-top:14px">📍 ${esc(o.customer.address)}</p>
          <p class="muted">Demo: the status advances automatically every few seconds.</p>
        </div>`;
      if (o.status === 'delivered') clearPoll();
    } catch (e) {
      clearPoll();
      app.innerHTML = `<div class="empty"><div class="em">🧾</div><p>${esc(e.message)}</p><a class="btn" href="#/">Go home</a></div>`;
    }
  };
  await draw();
  state.pollTimer = setInterval(draw, 3000);
}

/* ---------- Router + search ---------- */
function route() {
  closeCart();
  window.scrollTo(0, 0);
  const h = location.hash || '#/';
  let m;
  if ((m = h.match(/^#\/r\/(\w+)/))) restaurantView(m[1]);
  else if ((m = h.match(/^#\/order\/([\w-]+)/))) orderView(m[1]);
  else homeView();
}
window.addEventListener('hashchange', route);

let searchTimer;
$('#search').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.filters.q = e.target.value.trim();
    if (location.hash && location.hash !== '#/') location.hash = '#/'; else homeView();
  }, 250);
});

updateBadge();
route();

