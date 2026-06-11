/* ================= หน้าสรุป ================= */
const $ = id => document.getElementById(id);
let range = 'today';

function getRange() {
  if (range === 'today') return rangeToday();
  if (range === 'd7') return rangeDays(7);
  if (range === 'month') return rangeMonth();
  return [0, Date.now()];
}

function render() {
  const [s, e] = getRange();
  const orders = Store.getOrders().filter(o => o.ts >= s && o.ts <= e);
  const purchases = Store.getPurchases().filter(p => p.ts >= s && p.ts <= e);

  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const cogs = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);   // ต้นทุนขาย (จากสูตร)
  const grossProfit = revenue - cogs;
  const purchaseTotal = purchases.reduce((sum, p) => sum + p.totalPrice, 0);
  const cashProfit = revenue - purchaseTotal;
  const orderCount = orders.length;

  $('stats').innerHTML = `
    <div class="stat-card hero">
      <div class="label">กำไรขั้นต้น (ยอดขาย − ต้นทุนตามสูตร)</div>
      <div class="value">${baht(grossProfit)} ฿</div>
    </div>
    <div class="stat-card">
      <div class="label">ยอดขาย</div>
      <div class="value">${baht(revenue)} ฿</div>
      <div class="small muted">${orderCount} ออเดอร์</div>
    </div>
    <div class="stat-card">
      <div class="label">ต้นทุนขาย</div>
      <div class="value">${baht(cogs)} ฿</div>
      <div class="small muted">ตามสูตรที่ผูกไว้</div>
    </div>
    <div class="stat-card">
      <div class="label">ยอดซื้อวัตถุดิบ</div>
      <div class="value">${baht(purchaseTotal)} ฿</div>
      <div class="small muted">${purchases.length} รายการ</div>
    </div>
    <div class="stat-card">
      <div class="label">กำไรตามเงินสด</div>
      <div class="value ${cashProfit >= 0 ? '' : 'red'}">${baht(cashProfit)} ฿</div>
      <div class="small muted">ยอดขาย − ยอดซื้อ</div>
    </div>`;

  renderChart7d();
  renderTop(orders);
  renderRecent(orders);
}

/* ---------- เมนูขายดี top 5 ---------- */
function renderTop(orders) {
  const agg = {};
  orders.forEach(o => o.items.forEach(it => {
    if (!agg[it.menuId]) agg[it.menuId] = { name: it.name, qty: 0, revenue: 0, profit: 0 };
    agg[it.menuId].qty += it.qty;
    agg[it.menuId].revenue += it.price * it.qty;
    agg[it.menuId].profit += (it.price - it.cost) * it.qty;
  }));
  const top = Object.values(agg).sort((a, b) => b.qty - a.qty).slice(0, 5);

  $('topMenus').innerHTML = top.length
    ? `<div class="list">` + top.map((t, i) => `
        <div class="list-item">
          <div style="flex:1">
            <div class="title">${i + 1}. ${escapeHtml(t.name)}</div>
            <div class="meta">ขาย ${num(t.qty)} หน่วย · ยอด ${baht(t.revenue)} ฿</div>
          </div>
          <span class="bold green">+${baht(t.profit)} ฿</span>
        </div>`).join('') + `</div>`
    : `<div class="card muted small">ยังไม่มีการขายในช่วงนี้</div>`;
}

/* ---------- กราฟยอดขาย 7 วัน (SVG ล้วน ไม่ใช้ library) ---------- */
function renderChart7d() {
  const orders = Store.getOrders();
  const DAY = 86400000;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const s = d.getTime(), e = s + DAY;
    days.push({
      label: d.toLocaleDateString('th-TH', { weekday: 'short' }),
      isToday: i === 0,
      total: orders.filter(o => o.ts >= s && o.ts < e).reduce((sum, o) => sum + o.total, 0),
    });
  }

  const max = Math.max(...days.map(d => d.total), 1);
  const W = 320, H = 150, padB = 24, padT = 18, bw = 28, gap = (W - bw * 7) / 8;

  const bars = days.map((d, i) => {
    const h = Math.max((d.total / max) * (H - padB - padT), d.total > 0 ? 4 : 2);
    const x = gap + i * (bw + gap);
    const y = H - padB - h;
    const color = d.isToday ? 'var(--orange)' : '#FFC9A8';
    return `
      <rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="6" fill="${color}"/>
      ${d.total > 0 ? `<text x="${x + bw / 2}" y="${y - 5}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#555">${baht(d.total)}</text>` : ''}
      <text x="${x + bw / 2}" y="${H - 7}" text-anchor="middle" font-size="10.5" font-weight="${d.isToday ? 800 : 500}" fill="${d.isToday ? 'var(--orange)' : '#8A8A8E'}">${d.label}</text>`;
  }).join('');

  $('chart7d').innerHTML = days.some(d => d.total > 0)
    ? `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block">${bars}</svg>`
    : `<p class="muted small">ยังไม่มียอดขายใน 7 วันนี้</p>`;
}

/* ---------- ออเดอร์ล่าสุด + ยกเลิกออเดอร์ ---------- */
function renderRecent(orders) {
  const recent = [...orders].sort((a, b) => b.ts - a.ts).slice(0, 10);
  $('recentOrders').innerHTML = recent.length
    ? `<div class="list">` + recent.map(o => `
        <div class="list-item" data-oid="${o.id}">
          <div style="flex:1; min-width:0">
            <div class="title">${baht(o.total)} ฿</div>
            <div class="meta">${fmtTime(o.ts)} · ${o.items.map(i => escapeHtml(i.name) + '×' + i.qty).join(', ')}</div>
          </div>
          <span class="small green bold">+${baht(o.total - (o.totalCost || 0))} ฿</span>
        </div>`).join('') + `</div>`
    : `<div class="card muted small">ยังไม่มีออเดอร์ในช่วงนี้</div>`;

  $('recentOrders').querySelectorAll('.list-item').forEach(el =>
    el.addEventListener('click', () => cancelOrder(el.dataset.oid)));
}

function cancelOrder(oid) {
  const orders = Store.getOrders();
  const o = orders.find(x => x.id === oid);
  if (!o) return;
  const detail = o.items.map(i => i.name + '×' + i.qty).join(', ');
  if (!confirm('ยกเลิกออเดอร์นี้?\n' + detail + ' — ' + baht(o.total) + ' ฿\n\nระบบจะคืนสต็อกวัตถุดิบให้')) return;

  // คืนสต็อกจาก snapshot ที่บันทึกไว้ตอนขาย (แม่นยำแม้สูตรถูกแก้ภายหลัง)
  if (Array.isArray(o.stockDeducted) && o.stockDeducted.length) {
    const ings = Store.getIngredients();
    o.stockDeducted.forEach(d => {
      const ing = ings.find(i => i.id === d.ingredientId);
      if (ing) ing.stock = (Number(ing.stock) || 0) + (Number(d.qty) || 0);
    });
    Store.setIngredients(ings);
  }

  Store.setOrders(orders.filter(x => x.id !== oid));
  render();
  toast('ยกเลิกออเดอร์และคืนสต็อกแล้ว');
}

/* ---------- bind ---------- */
document.querySelectorAll('#rangeSeg button').forEach(b =>
  b.addEventListener('click', () => {
    range = b.dataset.r;
    document.querySelectorAll('#rangeSeg button').forEach(x =>
      x.classList.toggle('active', x === b));
    render();
  }));

render();
