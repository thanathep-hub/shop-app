/* ================= หน้าเมนู ================= */
const $ = id => document.getElementById(id);

let editingId = null;
let mode = 'recipe';            // 'recipe' | 'manual'
let recipe = [];                // [{ingredientId, qty}]

/* ---------- รายการเมนู ---------- */
function render() {
  const menus = Store.getMenus();
  const ings = Store.getIngredients();
  const box = $('menuList');

  if (!menus.length) {
    box.innerHTML = `<div class="empty"><div class="ic">📋</div>
      <p class="bold" style="color:var(--black)">ยังไม่มีเมนู</p>
      <p class="mt-8">กดปุ่ม + เพื่อสร้างเมนูแรก<br>${ings.length ? '' : 'แนะนำให้ไปเพิ่มวัตถุดิบที่แท็บ "วัตถุดิบ" ก่อน หรือสร้างจากในนี้ก็ได้'}</p></div>`;
    return;
  }

  box.innerHTML = `<div class="list">` + menus.map(m => {
    const cost = menuCost(m, ings);
    const profit = (Number(m.price) || 0) - cost;
    const margin = m.price ? (profit / m.price * 100) : 0;
    const badge = m.costMode === 'manual'
      ? `<span class="badge warn">ยังไม่ผูกสูตร</span>`
      : `<span class="badge ok">${(m.recipe || []).length} วัตถุดิบ</span>`;
    return `
    <div class="list-item" data-id="${m.id}">
      <div style="flex:1; min-width:0">
        <div class="title">${escapeHtml(m.name)} ${badge}</div>
        <div class="meta">ขาย ${baht(m.price)} ฿ · ต้นทุน ${baht(cost)} ฿ · กำไร <span class="${profit >= 0 ? 'green' : 'red'}">${baht(profit)} ฿ (${margin.toFixed(0)}%)</span></div>
      </div>
      <span class="muted">›</span>
    </div>`;
  }).join('') + `</div>`;

  box.querySelectorAll('.list-item').forEach(el =>
    el.addEventListener('click', () => openEdit(el.dataset.id)));
}

/* ---------- sheet เพิ่ม/แก้ไข ---------- */
function openAdd() {
  editingId = null; mode = 'recipe'; recipe = [];
  $('menuSheetTitle').textContent = 'เพิ่มเมนู';
  $('mName').value = ''; $('mPrice').value = ''; $('mManualCost').value = '';
  $('btnDelete').style.display = 'none';
  setMode('recipe');
  renderRecipeRows();
  updatePreview();
  openSheet('menuSheet');
}

function openEdit(id) {
  const m = Store.getMenus().find(x => x.id === id);
  if (!m) return;
  editingId = id;
  $('menuSheetTitle').textContent = 'แก้ไขเมนู';
  $('mName').value = m.name; $('mPrice').value = m.price;
  $('mManualCost').value = m.manualCost ?? '';
  recipe = JSON.parse(JSON.stringify(m.recipe || []));
  setMode(m.costMode === 'manual' ? 'manual' : 'recipe');
  $('btnDelete').style.display = '';
  renderRecipeRows();
  updatePreview();
  openSheet('menuSheet');
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('#modeSeg button').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === m));
  $('recipeBlock').style.display = m === 'recipe' ? '' : 'none';
  $('manualBlock').style.display = m === 'manual' ? '' : 'none';
  updatePreview();
}

/* ---------- แถวสูตร ---------- */
function renderRecipeRows() {
  const ings = Store.getIngredients();
  const box = $('recipeRows');

  if (!recipe.length) {
    box.innerHTML = `<p class="small muted">ยังไม่มีวัตถุดิบในสูตร — กด "+ เพิ่มวัตถุดิบในสูตร"</p>`;
    return;
  }

  box.innerHTML = recipe.map((r, idx) => {
    const ing = ings.find(i => i.id === r.ingredientId);
    const opts = ings.map(i =>
      `<option value="${i.id}" ${i.id === r.ingredientId ? 'selected' : ''}>${escapeHtml(i.name)}</option>`
    ).join('');
    return `
    <div class="recipe-row" data-idx="${idx}">
      <select data-f="ing"><option value="">เลือกวัตถุดิบ…</option>${opts}</select>
      <input type="number" inputmode="decimal" data-f="qty" placeholder="จำนวน" value="${r.qty ?? ''}">
      <span class="unit">${ing ? escapeHtml(ing.unit) : ''}</span>
      <button class="rm" data-f="rm" aria-label="ลบแถว">✕</button>
    </div>`;
  }).join('');

  box.querySelectorAll('.recipe-row').forEach(row => {
    const idx = Number(row.dataset.idx);
    row.querySelector('[data-f="ing"]').addEventListener('change', e => {
      recipe[idx].ingredientId = e.target.value;
      renderRecipeRows(); updatePreview();
    });
    row.querySelector('[data-f="qty"]').addEventListener('input', e => {
      recipe[idx].qty = parseFloat(e.target.value) || 0;
      updatePreview();
    });
    row.querySelector('[data-f="rm"]').addEventListener('click', () => {
      recipe.splice(idx, 1);
      renderRecipeRows(); updatePreview();
    });
  });
}

/* ---------- preview ต้นทุน/กำไร ---------- */
function updatePreview() {
  const ings = Store.getIngredients();
  const price = parseFloat($('mPrice').value) || 0;
  const fake = { costMode: mode, manualCost: parseFloat($('mManualCost').value) || 0, recipe };
  const cost = menuCost(fake, ings);
  const profit = price - cost;
  $('pvCost').textContent = baht(cost) + ' ฿';
  $('pvProfit').textContent = baht(profit) + ' ฿';
  $('pvProfit').className = 'bold ' + (profit >= 0 ? 'orange' : 'red');
  $('pvMargin').textContent = price ? (profit / price * 100).toFixed(0) + '%' : '—';
}

/* ---------- บันทึก / ลบ ---------- */
function save() {
  const name = $('mName').value.trim();
  const price = parseFloat($('mPrice').value);
  if (!name) { toast('กรุณาใส่ชื่อเมนู', true); return; }
  if (!(price > 0)) { toast('กรุณาใส่ราคาขาย', true); return; }

  const cleanRecipe = recipe.filter(r => r.ingredientId && r.qty > 0);
  if (mode === 'recipe' && !cleanRecipe.length) {
    if (!confirm('ยังไม่ได้ใส่สูตร — บันทึกเป็นเมนูแบบ "ยังไม่ผูกสูตร" (ต้นทุน 0) ไปก่อนไหม?')) return;
  }

  const menus = Store.getMenus();
  const data = {
    name, price,
    costMode: mode,
    manualCost: mode === 'manual' ? (parseFloat($('mManualCost').value) || 0) : 0,
    recipe: mode === 'recipe' ? cleanRecipe : [],
  };

  if (editingId) {
    Object.assign(menus.find(m => m.id === editingId), data);
  } else {
    menus.push({ id: Store.genId('menu'), ...data });
  }
  Store.setMenus(menus);
  closeSheet('menuSheet');
  render();
  toast('บันทึกเมนู "' + name + '" แล้ว');
}

function del() {
  if (!confirm('ลบเมนูนี้? ประวัติการขายเดิมจะยังอยู่')) return;
  Store.setMenus(Store.getMenus().filter(m => m.id !== editingId));
  closeSheet('menuSheet');
  render();
  toast('ลบเมนูแล้ว');
}

/* ---------- quick add วัตถุดิบ ---------- */
function quickSave() {
  const name = $('qName').value.trim();
  const unit = $('qUnit').value.trim() || 'หน่วย';
  const qty = parseFloat($('qQty').value) || 0;
  const price = parseFloat($('qPrice').value) || 0;
  if (!name) { toast('กรุณาใส่ชื่อวัตถุดิบ', true); return; }
  if (qty <= 0) { toast('กรุณาใส่จำนวนที่ซื้อ', true); return; }

  const ings = Store.getIngredients();
  const ing = { id: Store.genId('ing'), name, unit, stock: qty, costPerUnit: price / qty };
  ings.push(ing);
  Store.setIngredients(ings);

  const purchases = Store.getPurchases();
  purchases.push({ id: Store.genId('pur'), ts: Date.now(), ingredientId: ing.id, ingredientName: name, qty, totalPrice: price });
  Store.setPurchases(purchases);

  recipe.push({ ingredientId: ing.id, qty: 0 });   // ใส่เข้าสูตรให้เลย รอกรอกจำนวน
  closeSheet('quickIng');
  renderRecipeRows(); updatePreview();
  toast('เพิ่ม "' + name + '" เข้าสูตรแล้ว — กรอกจำนวนที่ใช้');
}

/* ---------- bind ---------- */
$('btnAdd').addEventListener('click', openAdd);
$('btnSave').addEventListener('click', save);
$('btnDelete').addEventListener('click', del);
$('btnCancel').addEventListener('click', () => closeSheet('menuSheet'));
$('menuSheetBackdrop').addEventListener('click', () => closeSheet('menuSheet'));
$('btnAddRow').addEventListener('click', () => {
  if (!Store.getIngredients().length) { toast('ยังไม่มีวัตถุดิบ — กด "+ สร้างวัตถุดิบใหม่"', true); return; }
  recipe.push({ ingredientId: '', qty: 0 });
  renderRecipeRows();
});
$('btnNewIng').addEventListener('click', () => {
  ['qName', 'qUnit', 'qQty', 'qPrice'].forEach(id => $(id).value = '');
  openSheet('quickIng');
});
$('btnQuickSave').addEventListener('click', quickSave);
$('btnQuickCancel').addEventListener('click', () => closeSheet('quickIng'));
$('quickIngBackdrop').addEventListener('click', () => closeSheet('quickIng'));
document.querySelectorAll('#modeSeg button').forEach(b =>
  b.addEventListener('click', () => setMode(b.dataset.mode)));
['mPrice', 'mManualCost'].forEach(id => $(id).addEventListener('input', updatePreview));

render();
