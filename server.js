const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- Static in-memory data ---------------- */

const restaurants = [
  {
    id: 'r1', name: 'Spice Route', cuisine: 'Indian', emoji: '🍛', rating: 4.6,
    eta: '25-35', deliveryFee: 30, minOrder: 150, color: '#f59e0b',
    tagline: 'Authentic curries & biryanis',
    menu: [
      { id: 'r1m1', name: 'Chicken Biryani', price: 260, veg: false, emoji: '🍗', desc: 'Basmati rice, tender chicken, house spices.' },
      { id: 'r1m2', name: 'Paneer Butter Masala', price: 220, veg: true, emoji: '🧀', desc: 'Creamy tomato gravy with soft paneer.' },
      { id: 'r1m3', name: 'Veg Dum Biryani', price: 210, veg: true, emoji: '🍚', desc: 'Slow-cooked with seasonal vegetables.' },
      { id: 'r1m4', name: 'Butter Naan', price: 45, veg: true, emoji: '🫓', desc: 'Soft tandoor-baked bread.' },
      { id: 'r1m5', name: 'Gulab Jamun (2 pcs)', price: 70, veg: true, emoji: '🍮', desc: 'Warm syrup-soaked milk dumplings.' }
    ]
  },
  {
    id: 'r2', name: 'Napoli Slice', cuisine: 'Pizza', emoji: '🍕', rating: 4.4,
    eta: '20-30', deliveryFee: 40, minOrder: 200, color: '#ef4444',
    tagline: 'Wood-fired style pizzas',
    menu: [
      { id: 'r2m1', name: 'Margherita', price: 249, veg: true, emoji: '🍕', desc: 'Tomato, mozzarella, fresh basil.' },
      { id: 'r2m2', name: 'Pepperoni Feast', price: 349, veg: false, emoji: '🍕', desc: 'Loaded with spicy pepperoni.' },
      { id: 'r2m3', name: 'Farmhouse', price: 319, veg: true, emoji: '🫑', desc: 'Capsicum, onion, mushroom, corn.' },
      { id: 'r2m4', name: 'Garlic Bread', price: 99, veg: true, emoji: '🥖', desc: 'Buttery, toasty, with herbs.' }
    ]
  },
  {
    id: 'r3', name: 'Burger Barn', cuisine: 'Burgers', emoji: '🍔', rating: 4.3,
    eta: '15-25', deliveryFee: 25, minOrder: 120, color: '#f97316',
    tagline: 'Juicy burgers, crispy fries',
    menu: [
      { id: 'r3m1', name: 'Classic Chicken Burger', price: 169, veg: false, emoji: '🍔', desc: 'Crispy chicken, lettuce, mayo.' },
      { id: 'r3m2', name: 'Veggie Crunch Burger', price: 139, veg: true, emoji: '🥬', desc: 'Golden veg patty with cheese.' },
      { id: 'r3m3', name: 'Peri Peri Fries', price: 99, veg: true, emoji: '🍟', desc: 'Crispy fries with peri peri dust.' },
      { id: 'r3m4', name: 'Chocolate Shake', price: 129, veg: true, emoji: '🥤', desc: 'Thick, cold, chocolatey.' }
    ]
  },
  {
    id: 'r4', name: 'Dragon Wok', cuisine: 'Chinese', emoji: '🥡', rating: 4.2,
    eta: '25-40', deliveryFee: 35, minOrder: 180, color: '#dc2626',
    tagline: 'Noodles, momos & more',
    menu: [
      { id: 'r4m1', name: 'Veg Hakka Noodles', price: 160, veg: true, emoji: '🍜', desc: 'Wok-tossed noodles with crunchy veggies.' },
      { id: 'r4m2', name: 'Chicken Manchurian', price: 210, veg: false, emoji: '🍗', desc: 'Spicy-tangy chicken in dark sauce.' },
      { id: 'r4m3', name: 'Steamed Veg Momos (8)', price: 120, veg: true, emoji: '🥟', desc: 'Served with red chilli chutney.' },
      { id: 'r4m4', name: 'Schezwan Fried Rice', price: 180, veg: true, emoji: '🍚', desc: 'Fiery fried rice with schezwan sauce.' }
    ]
  },
  {
    id: 'r5', name: 'Green Bowl', cuisine: 'Healthy', emoji: '🥗', rating: 4.7,
    eta: '20-30', deliveryFee: 30, minOrder: 150, color: '#16a34a',
    tagline: 'Fresh salads & power bowls',
    menu: [
      { id: 'r5m1', name: 'Caesar Salad', price: 199, veg: false, emoji: '🥗', desc: 'Romaine, grilled chicken, parmesan.' },
      { id: 'r5m2', name: 'Quinoa Power Bowl', price: 229, veg: true, emoji: '🥙', desc: 'Quinoa, chickpeas, avocado, tahini.' },
      { id: 'r5m3', name: 'Fresh Fruit Bowl', price: 119, veg: true, emoji: '🍓', desc: 'Seasonal cut fruits.' },
      { id: 'r5m4', name: 'Cold Pressed Juice', price: 109, veg: true, emoji: '🧃', desc: 'Orange, carrot & ginger.' }
    ]
  },
  {
    id: 'r6', name: 'Sweet Tooth', cuisine: 'Desserts', emoji: '🍰', rating: 4.5,
    eta: '15-25', deliveryFee: 20, minOrder: 100, color: '#ec4899',
    tagline: 'Cakes, ice creams & brownies',
    menu: [
      { id: 'r6m1', name: 'Choco Lava Cake', price: 99, veg: true, emoji: '🍫', desc: 'Molten chocolate centre.' },
      { id: 'r6m2', name: 'Walnut Brownie', price: 89, veg: true, emoji: '🍪', desc: 'Fudgy brownie with walnuts.' },
      { id: 'r6m3', name: 'Vanilla Ice Cream Tub', price: 149, veg: true, emoji: '🍨', desc: 'Creamy classic vanilla.' },
      { id: 'r6m4', name: 'Red Velvet Slice', price: 129, veg: true, emoji: '🍰', desc: 'Cream cheese frosting.' }
    ]
  }
];

const COUPONS = {
  WELCOME10: { type: 'percent', value: 10, label: '10% off your order' },
  FREESHIP: { type: 'freeship', value: 0, label: 'Free delivery' }
};

const TAX_RATE = 0.05;

// In-memory orders (lost on restart — by design, no database)
const orders = new Map();

/* ---------------- Helpers ---------------- */

const publicRestaurant = ({ menu, ...r }) => r;

function priceCart(restaurantId, items, couponCode) {
  const restaurant = restaurants.find(r => r.id === restaurantId);
  if (!restaurant) return { error: 'Restaurant not found' };
  if (!Array.isArray(items) || items.length === 0) return { error: 'Cart is empty' };

  const lines = [];
  for (const it of items) {
    const menuItem = restaurant.menu.find(m => m.id === it.id);
    const qty = Number.parseInt(it.qty, 10);
    if (!menuItem) return { error: `Item ${it.id} not found in this restaurant` };
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return { error: 'Quantity must be between 1 and 20' };
    lines.push({ id: menuItem.id, name: menuItem.name, price: menuItem.price, qty, total: menuItem.price * qty });
  }

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  let deliveryFee = restaurant.deliveryFee;
  let discount = 0;
  let coupon = null;

  if (couponCode) {
    const c = COUPONS[String(couponCode).trim().toUpperCase()];
    if (!c) return { error: 'Invalid coupon code' };
    coupon = { code: String(couponCode).trim().toUpperCase(), label: c.label };
    if (c.type === 'percent') discount = Math.round(subtotal * c.value) / 100;
    if (c.type === 'freeship') deliveryFee = 0;
  }

  if (subtotal < restaurant.minOrder) {
    return { error: `Minimum order for ${restaurant.name} is ₹${restaurant.minOrder}` };
  }

  const tax = Math.round((subtotal - discount) * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal - discount + tax + deliveryFee) * 100) / 100;

  return {
    restaurant: publicRestaurant(restaurant),
    lines, subtotal, discount, tax, deliveryFee, total, coupon
  };
}

// Demo status timeline driven by elapsed time (seconds)
const STATUS_STEPS = [
  { key: 'placed', label: 'Order placed', at: 0 },
  { key: 'preparing', label: 'Preparing your food', at: 10 },
  { key: 'out_for_delivery', label: 'Out for delivery', at: 30 },
  { key: 'delivered', label: 'Delivered', at: 60 }
];

function orderView(order) {
  const elapsed = (Date.now() - order.createdAt) / 1000;
  let current = 0;
  STATUS_STEPS.forEach((s, i) => { if (elapsed >= s.at) current = i; });
  return {
    ...order,
    status: STATUS_STEPS[current].key,
    statusLabel: STATUS_STEPS[current].label,
    steps: STATUS_STEPS.map((s, i) => ({ key: s.key, label: s.label, done: i <= current }))
  };
}

/* ---------------- API ---------------- */

app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('/api/restaurants', (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const cuisine = String(req.query.cuisine || '').toLowerCase().trim();
  const veg = req.query.veg === 'true';

  let list = restaurants.filter(r => {
    if (cuisine && cuisine !== 'all' && r.cuisine.toLowerCase() !== cuisine) return false;
    if (veg && !r.menu.some(m => m.veg)) return false;
    if (q) {
      const hay = `${r.name} ${r.cuisine} ${r.menu.map(m => m.name).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  res.json(list.map(publicRestaurant));
});

app.get('/api/cuisines', (_req, res) => {
  res.json([...new Set(restaurants.map(r => r.cuisine))]);
});

app.get('/api/restaurants/:id', (req, res) => {
  const r = restaurants.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(r);
});

app.post('/api/quote', (req, res) => {
  const { restaurantId, items, coupon } = req.body || {};
  const result = priceCart(restaurantId, items, coupon);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.post('/api/orders', (req, res) => {
  const { restaurantId, items, coupon, customer } = req.body || {};
  const name = String(customer?.name || '').trim();
  const phone = String(customer?.phone || '').trim();
  const address = String(customer?.address || '').trim();

  if (name.length < 2) return res.status(400).json({ error: 'Please enter your name' });
  if (!/^[0-9+\-\s]{10,15}$/.test(phone)) return res.status(400).json({ error: 'Please enter a valid phone number' });
  if (address.length < 8) return res.status(400).json({ error: 'Please enter a complete delivery address' });

  const priced = priceCart(restaurantId, items, coupon);
  if (priced.error) return res.status(400).json({ error: priced.error });

  const id = 'ORD-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const order = {
    id,
    createdAt: Date.now(),
    customer: { name, phone, address },
    payment: String(req.body.payment || 'cod'),
    ...priced
  };
  orders.set(id, order);
  res.status(201).json(orderView(order));
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.get(req.params.id.toUpperCase());
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(orderView(order));
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// SPA fallback
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Food delivery app running on http://localhost:${PORT}`));

