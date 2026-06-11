/* ================= หน้าขาย (POS) ================= */
const $ = id => document.getElementById(id);

let cart = {};   // { menuId: qty }

/* ---------- header ---------- */
function renderHeader() {
  const meta = Store.getMeta();
  if (meta.shopName) $('shopName').textContent = meta.shopName;
  const [s, e] = rangeToday();
  const total = Store.getOrders()
    .filter(o => o.ts >= s && o.ts <= e)
    .reduce((sum, o) => sum + o.total, 0);
  $('todayTotal').textContent = 'วันนี้ ' + baht(total) + ' ฿';
}

/* ---------- grid เมนู ---------- */
function renderGrid() {
  const menus = Store.getMenus();
  const box = $('posGrid');

  if (!menus.length) {
    box.innerHTML = `<div class="empty"><div class="ic">🛒</div>
      <p class="bold" style="color:var(--black)">ยังไม่มีเมนูให้ขาย</p>
      <p class="mt-8">ไปที่แท็บ "เมนู" เพื่อสร้างเมนูก่อน<br>(และเพิ่มวัตถุดิบที่แท็บ "วัตถุดิบ")</p></div>`;
    return;
  }

  box.innerHTML = `<div class="pos-grid">` + menus.map(m => `
    <button class="pos-tile" data-id="${m.id}">
      ${cart[m.id] ? `<span class="qty-badge">${cart[m.id]}</span>` : ''}
      <span class="name">${escapeHtml(m.name)}</span>
      <span class="price">${baht(m.price)} ฿</span>
    </button>`).join('') + `</div>`;

  box.querySelectorAll('.pos-tile').forEach(t =>
    t.addEventListener('click', () => addToCart(t.dataset.id)));
}

/* ---------- ตะกร้า ---------- */
function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  renderGrid(); renderCartBar();
}

function cartItems() {
  const menus = Store.getMenus();
  return Object.entries(cart)
    .map(([id, qty]) => ({ menu: menus.find(m => m.id === id), qty }))
    .filter(x => x.menu && x.qty > 0);
}

function renderCartBar() {
  const items = cartItems();
  const count = items.reduce((s, x) => s + x.qty, 0);
  const total = items.reduce((s, x) => s + x.menu.price * x.qty, 0);
  $('cartCount').textContent = count;
  $('cartTotal').textContent = baht(total) + ' ฿';
  $('cartBar').classList.toggle('show', count > 0);
}

function renderCartSheet() {
  const items = cartItems();
  $('cartLines').innerHTML = items.map(x => `
    <div class="cart-line">
      <div style="flex:1; min-width:0">
        <div class="bold">${escapeHtml(x.menu.name)}</div>
        <div class="small muted">${baht(x.menu.price)} ฿ × ${x.qty} = ${baht(x.menu.price * x.qty)} ฿</div>
      </div>
      <div class="qty-ctrl">
        <button data-id="${x.menu.id}" data-d="-1">−</button>
        <span class="q">${x.qty}</span>
        <button data-id="${x.menu.id}" data-d="1">＋</button>
      </div>
    </div>`).join('') || '<p class="muted small">ตะกร้าว่าง</p>';

  const total = items.reduce((s, x) => s + x.menu.price * x.qty, 0);
  $('sheetTotal').textContent = baht(total) + ' ฿';

  $('cartLines').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id;
    cart[id] = (cart[id] || 0) + Number(b.dataset.d);
    if (cart[id] <= 0) delete cart[id];
    renderGrid(); renderCartBar(); renderCartSheet();
    if (!Object.keys(cart).length) closeSheet('cartSheet');
  }));
}

/* ---------- ยืนยันการขาย ---------- */
function confirmSale() {
  const items = cartItems();
  if (!items.length) return;

  const ings = Store.getIngredients();
  const lowWarn = [];

  // สร้าง order พร้อม snapshot ต้นทุน ณ ตอนขาย
  const orderItems = items.map(x => ({
    menuId: x.menu.id,
    name: x.menu.name,
    qty: x.qty,
    price: x.menu.price,
    cost: menuCost(x.menu, ings),
  }));

  const order = {
    id: Store.genId('ord'),
    ts: Date.now(),
    items: orderItems,
    total: orderItems.reduce((s, i) => s + i.price * i.qty, 0),
    totalCost: orderItems.reduce((s, i) => s + i.cost * i.qty, 0),
    stockDeducted: [],   // snapshot การตัดสต็อก ไว้คืนตอนยกเลิกออเดอร์
  };

  // ตัดสต็อก (เฉพาะเมนูที่ผูกสูตร) — ขายได้แม้สต็อกไม่พอ แค่เตือน
  items.forEach(x => {
    if (x.menu.costMode === 'manual') return;
    (x.menu.recipe || []).forEach(r => {
      const ing = ings.find(i => i.id === r.ingredientId);
      if (!ing) return;
      const used = (Number(r.qty) || 0) * x.qty;
      ing.stock = (Number(ing.stock) || 0) - used;
      order.stockDeducted.push({ ingredientId: ing.id, qty: used });
      const lo = Number(ing.lowAt) || 0;
      if ((ing.stock <= 0 || (lo && ing.stock <= lo)) && !lowWarn.includes(ing.name)) lowWarn.push(ing.name);
    });
  });

  Store.setIngredients(ings);
  const orders = Store.getOrders();
  orders.push(order);
  Store.setOrders(orders);

  cart = {};
  closeSheet('cartSheet');
  renderGrid(); renderCartBar(); renderHeader();

  if (lowWarn.length) {
    toast('ขายแล้ว ' + baht(order.total) + ' ฿ — ⚠️ ใกล้หมด: ' + lowWarn.join(', '), true);
  } else {
    toast('บันทึกการขาย ' + baht(order.total) + ' ฿ แล้ว ✓');
  }
}

/* ---------- bind ---------- */
$('cartBar').addEventListener('click', () => { renderCartSheet(); openSheet('cartSheet'); });
$('btnConfirm').addEventListener('click', confirmSale);
$('btnClear').addEventListener('click', () => {
  cart = {};
  closeSheet('cartSheet');
  renderGrid(); renderCartBar();
});
$('cartSheetBackdrop').addEventListener('click', () => closeSheet('cartSheet'));

renderHeader();
renderGrid();
renderCartBar();
