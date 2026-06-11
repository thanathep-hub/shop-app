/* ================= หน้าตั้งค่า ================= */
const $ = id => document.getElementById(id);

function render() {
  $('fShopName').value = Store.getMeta().shopName || '';
  renderBackupStatus();
  $('dataInfo').innerHTML = `
    <div class="list-item"><span>วัตถุดิบ</span><span class="bold">${Store.getIngredients().length} รายการ</span></div>
    <div class="list-item"><span>เมนู</span><span class="bold">${Store.getMenus().length} รายการ</span></div>
    <div class="list-item"><span>ออเดอร์</span><span class="bold">${Store.getOrders().length} รายการ</span></div>
    <div class="list-item"><span>ประวัติการซื้อ</span><span class="bold">${Store.getPurchases().length} รายการ</span></div>`;
}

/* ---------- ชื่อร้าน ---------- */
$('btnSaveName').addEventListener('click', () => {
  const meta = Store.getMeta();
  meta.shopName = $('fShopName').value.trim();
  Store.setMeta(meta);
  toast('บันทึกชื่อร้านแล้ว');
});

/* ---------- Export ---------- */
$('btnExport').addEventListener('click', () => {
  const data = Store.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  a.href = URL.createObjectURL(blob);
  a.download = 'shop-backup-' + stamp + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  const meta = Store.getMeta();
  meta.lastExportTs = Date.now();
  Store.setMeta(meta);
  renderBackupStatus();
  toast('Export แล้ว — เก็บไฟล์ไว้ในที่ปลอดภัย');
});

/* ---------- Import ---------- */
$('btnImport').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!confirm('Import จะเขียนทับข้อมูลปัจจุบันทั้งหมด\nไฟล์: ' + file.name + '\nดำเนินการต่อ?')) return;
      Store.importAll(data);
      render();
      toast('Import สำเร็จ ✓');
    } catch (err) {
      toast('Import ไม่สำเร็จ: ' + err.message, true);
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

/* ---------- สถานะ backup ---------- */
function renderBackupStatus() {
  const last = Number(Store.getMeta().lastExportTs) || 0;
  const el = $('backupStatus');
  if (!el) return;
  if (!last) {
    el.innerHTML = Store.getOrders().length
      ? '<span class="badge low">ยังไม่เคย backup</span>'
      : '<span class="muted small">ยังไม่เคย backup</span>';
    return;
  }
  const days = Math.floor((Date.now() - last) / 86400000);
  const txt = days === 0 ? 'backup ล่าสุด: วันนี้' : 'backup ล่าสุด: ' + days + ' วันก่อน';
  el.innerHTML = days > 3
    ? '<span class="badge warn">' + txt + ' — ควร export ใหม่</span>'
    : '<span class="badge ok">' + txt + '</span>';
}

/* ---------- Clear ---------- */
$('btnClearAll').addEventListener('click', () => {
  if (!confirm('ล้างข้อมูลทั้งหมด? วัตถุดิบ เมนู และประวัติการขายจะหายถาวร')) return;
  if (!confirm('ยืนยันอีกครั้ง — แนะนำให้ Export เก็บไว้ก่อน\nล้างเลยไหม?')) return;
  Store.clearAll();
  render();
  toast('ล้างข้อมูลแล้ว');
});

render();
