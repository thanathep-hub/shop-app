/* ================= หน้าวัตถุดิบ ================= */
let editingId = null;   // id ที่กำลังแก้ไข (null = เพิ่มใหม่)
let buyingId = null;    // id ที่กำลังกดซื้อเพิ่ม

const $ = id => document.getElementById(id);

function render() {
  const ings = Store.getIngredients();
  const box = $('ingList');

  if (!ings.length) {
    box.innerHTML = `<div class="empty"><div class="ic">📦</div>
      <p class="bold" style="color:var(--black)">ยังไม่มีวัตถุดิบ</p>
      <p class="mt-8">กดปุ่ม + มุมขวาบน เพื่อเพิ่มวัตถุดิบตัวแรก<br>เช่น "ผงชาไทย ซื้อ 500g ราคา 250 บาท"</p></div>`;
    return;
  }

  box.innerHTML = `<div class="list">` + ings.map(i => {
    const stock = Number(i.stock) || 0;
    let badge = '';
    const lowAt = Number(i.lowAt) || 0;
    if (stock <= 0) badge = `<span class="badge low">หมด/ติดลบ</span>`;
    else if (lowAt && stock <= lowAt) badge = `<span class="badge warn">ใกล้หมด</span>`;
    return `
    <div class="list-item" data-id="${i.id}">
      <div style="flex:1; min-width:0" class="item-main">
        <div class="title">${escapeHtml(i.name)} ${badge}</div>
        <div class="meta">คงเหลือ ${num(stock)} ${escapeHtml(i.unit)} · ต้นทุน ${baht(i.costPerUnit)} ฿/${escapeHtml(i.unit)}</div>
      </div>
      <button class="btn btn-secondary btn-sm buy-btn" data-id="${i.id}">+ ซื้อเพิ่ม</button>
    </div>`;
  }).join('') + `</div>`;

  box.querySelectorAll('.buy-btn').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    openBuy(b.dataset.id);
  }));
  box.querySelectorAll('.item-main').forEach(el => el.addEventListener('click', () => {
    openEdit(el.parentElement.dataset.id);
  }));
}

/* ---------- เพิ่ม/แก้ไข ---------- */
function openAdd() {
  editingId = null;
  $('ingSheetTitle').textContent = 'เพิ่มวัตถุดิบ';
  $('fName').value = ''; $('fUnit').value = ''; $('fQty').value = ''; $('fPrice').value = ''; $('fLow').value = '';
  $('buyBlock').style.display = '';
  $('editBlock').style.display = 'none';
  $('btnDelete').style.display = 'none';
  updateCpuPreview();
  openSheet('ingSheet');
}

function openEdit(id) {
  const ing = Store.getIngredients().find(i => i.id === id);
  if (!ing) return;
  editingId = id;
  $('ingSheetTitle').textContent = 'แก้ไขวัตถุดิบ';
  $('fName').value = ing.name; $('fUnit').value = ing.unit;
  $('fCpu').value = ing.costPerUnit; $('fStock').value = ing.stock; $('fLow').value = ing.lowAt || '';
  $('buyBlock').style.display = 'none';
  $('editBlock').style.display = '';
  $('btnDelete').style.display = '';
  openSheet('ingSheet');
}

function updateCpuPreview() {
  const q = parseFloat($('fQty').value), p = parseFloat($('fPrice').value);
  const ok = q > 0 && p >= 0;
  $('costPreview').style.display = ok ? '' : 'none';
  if (ok) $('cpuText').textContent = baht(p / q) + ' ฿/' + ($('fUnit').value || 'หน่วย');
}

function save() {
  const name = $('fName').value.trim();
  const unit = $('fUnit').value.trim() || 'หน่วย';
  if (!name) { toast('กรุณาใส่ชื่อวัตถุดิบ', true); return; }

  const ings = Store.getIngredients();

  if (editingId) {
    const ing = ings.find(i => i.id === editingId);
    ing.name = name; ing.unit = unit;
    ing.costPerUnit = parseFloat($('fCpu').value) || 0;
    ing.stock = parseFloat($('fStock').value) || 0;
    ing.lowAt = parseFloat($('fLow').value) || 0;
    Store.setIngredients(ings);
    toast('บันทึกแล้ว');
  } else {
    const qty = parseFloat($('fQty').value) || 0;
    const price = parseFloat($('fPrice').value) || 0;
    if (qty <= 0) { toast('กรุณาใส่จำนวนที่ซื้อ', true); return; }
    const ing = {
      id: Store.genId('ing'),
      name, unit,
      stock: qty,
      costPerUnit: price / qty,
      lowAt: parseFloat($('fLow').value) || 0,
    };
    ings.push(ing);
    Store.setIngredients(ings);
    // บันทึกเป็นรายการซื้อด้วย เพื่อให้หน้าสรุปเห็นยอดซื้อ
    const purchases = Store.getPurchases();
    purchases.push({ id: Store.genId('pur'), ts: Date.now(), ingredientId: ing.id, ingredientName: name, qty, totalPrice: price });
    Store.setPurchases(purchases);
    toast('เพิ่ม "' + name + '" แล้ว');
  }
  closeSheet('ingSheet');
  render();
}

function del() {
  const ings = Store.getIngredients();
  const ing = ings.find(i => i.id === editingId);
  const usedBy = Store.getMenus().filter(m => (m.recipe || []).some(r => r.ingredientId === editingId));
  let msg = 'ลบ "' + ing.name + '" ?';
  if (usedBy.length) msg += '\n\nวัตถุดิบนี้ถูกใช้ในสูตร: ' + usedBy.map(m => m.name).join(', ') + '\nสูตรเหล่านั้นจะคำนวณต้นทุนไม่ครบ';
  if (!confirm(msg)) return;
  Store.setIngredients(ings.filter(i => i.id !== editingId));
  closeSheet('ingSheet');
  render();
  toast('ลบแล้ว');
}

/* ---------- ซื้อเพิ่ม ---------- */
function openBuy(id) {
  const ing = Store.getIngredients().find(i => i.id === id);
  if (!ing) return;
  buyingId = id;
  $('buyTitle').textContent = 'ซื้อเพิ่ม · ' + ing.name;
  $('buyUnit').textContent = '(' + ing.unit + ')';
  $('bQty').value = ''; $('bPrice').value = ''; $('bCpu').textContent = '—';
  openSheet('buySheet');
}

function updateBuyCpu() {
  const q = parseFloat($('bQty').value), p = parseFloat($('bPrice').value);
  $('bCpu').textContent = (q > 0 && p >= 0) ? baht(p / q) + ' ฿/หน่วย' : '—';
}

function saveBuy() {
  const q = parseFloat($('bQty').value) || 0;
  const p = parseFloat($('bPrice').value) || 0;
  if (q <= 0) { toast('กรุณาใส่จำนวนที่ซื้อ', true); return; }

  const ings = Store.getIngredients();
  const ing = ings.find(i => i.id === buyingId);
  ing.stock = (Number(ing.stock) || 0) + q;
  ing.costPerUnit = p / q; // อัพเดทตามราคาซื้อล่าสุด
  Store.setIngredients(ings);

  const purchases = Store.getPurchases();
  purchases.push({ id: Store.genId('pur'), ts: Date.now(), ingredientId: ing.id, ingredientName: ing.name, qty: q, totalPrice: p });
  Store.setPurchases(purchases);

  closeSheet('buySheet');
  render();
  toast('บันทึกการซื้อแล้ว');
}

/* ---------- bind ---------- */
$('btnAdd').addEventListener('click', openAdd);
$('btnSave').addEventListener('click', save);
$('btnDelete').addEventListener('click', del);
$('btnCancel').addEventListener('click', () => closeSheet('ingSheet'));
$('ingSheetBackdrop').addEventListener('click', () => closeSheet('ingSheet'));
$('btnBuySave').addEventListener('click', saveBuy);
$('btnBuyCancel').addEventListener('click', () => closeSheet('buySheet'));
$('buySheetBackdrop').addEventListener('click', () => closeSheet('buySheet'));
['fQty', 'fPrice', 'fUnit'].forEach(id => $(id).addEventListener('input', updateCpuPreview));
['bQty', 'bPrice'].forEach(id => $(id).addEventListener('input', updateBuyCpu));

render();
