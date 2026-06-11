/* ================= Calc: business logic ================= */

/** ต้นทุนต่อ 1 หน่วยขายของเมนู (snapshot จากราคาวัตถุดิบปัจจุบัน) */
function menuCost(menu, ingredients) {
  if (menu.costMode === 'manual') return Number(menu.manualCost) || 0;
  return (menu.recipe || []).reduce((sum, r) => {
    const ing = ingredients.find(i => i.id === r.ingredientId);
    return sum + (ing ? (Number(ing.costPerUnit) || 0) * (Number(r.qty) || 0) : 0);
  }, 0);
}

function menuProfit(menu, ingredients) {
  return (Number(menu.price) || 0) - menuCost(menu, ingredients);
}

function menuMargin(menu, ingredients) {
  const p = Number(menu.price) || 0;
  if (!p) return 0;
  return (menuProfit(menu, ingredients) / p) * 100;
}

/** format ตัวเลขเงินบาท */
function baht(n) {
  return (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** format จำนวน (stock) */
function num(n) {
  return (Number(n) || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

/** วันเวลาแบบไทยสั้นๆ */
function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* ---------- ช่วงเวลา (สำหรับหน้าสรุป) ---------- */
function rangeToday() {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  return [s.getTime(), Date.now()];
}
function rangeDays(n) {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - (n - 1));
  return [s.getTime(), Date.now()];
}
function rangeMonth() {
  const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(1);
  return [s.getTime(), Date.now()];
}

/* ---------- Toast ---------- */
function toast(msg, warn) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.toggle('warn', !!warn);
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- Modal helpers ---------- */
function openSheet(id) {
  document.getElementById(id).classList.add('open');
  document.getElementById(id + 'Backdrop').classList.add('open');
}
function closeSheet(id) {
  document.getElementById(id).classList.remove('open');
  document.getElementById(id + 'Backdrop').classList.remove('open');
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
