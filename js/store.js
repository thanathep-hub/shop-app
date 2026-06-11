/* ================= Store: localStorage layer ================= */
const Store = {
  SCHEMA: 1,
  keys: {
    ingredients: 'shop_ingredients',
    menus: 'shop_menus',
    orders: 'shop_orders',
    purchases: 'shop_purchases',
    meta: 'shop_meta',
  },

  _read(k, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(this.keys[k]));
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  },
  _write(k, v) { localStorage.setItem(this.keys[k], JSON.stringify(v)); },

  getIngredients() { return this._read('ingredients', []); },
  setIngredients(v) { this._write('ingredients', v); },
  getMenus() { return this._read('menus', []); },
  setMenus(v) { this._write('menus', v); },
  getOrders() { return this._read('orders', []); },
  setOrders(v) { this._write('orders', v); },
  getPurchases() { return this._read('purchases', []); },
  setPurchases(v) { this._write('purchases', v); },
  getMeta() { return this._read('meta', { shopName: '', schema: this.SCHEMA }); },
  setMeta(v) { this._write('meta', v); },

  genId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  /* ---------- Export / Import ---------- */
  exportAll() {
    return {
      app: 'shop-mini-app',
      schema: this.SCHEMA,
      exportedAt: new Date().toISOString(),
      meta: this.getMeta(),
      ingredients: this.getIngredients(),
      menus: this.getMenus(),
      orders: this.getOrders(),
      purchases: this.getPurchases(),
    };
  },

  importAll(data) {
    if (!data || data.app !== 'shop-mini-app') {
      throw new Error('ไฟล์นี้ไม่ใช่ไฟล์ backup ของแอพ');
    }
    const need = ['ingredients', 'menus', 'orders', 'purchases'];
    for (const k of need) {
      if (!Array.isArray(data[k])) throw new Error('โครงสร้างไฟล์ไม่ถูกต้อง (ขาด ' + k + ')');
    }
    this.setIngredients(data.ingredients);
    this.setMenus(data.menus);
    this.setOrders(data.orders);
    this.setPurchases(data.purchases);
    this.setMeta(data.meta || { shopName: '', schema: this.SCHEMA });
  },

  clearAll() {
    Object.values(this.keys).forEach(k => localStorage.removeItem(k));
  },
};
