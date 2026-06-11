/* ================= Bottom Nav (shared) ================= */
(function () {
  const I = {
    pos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a1.6 1.6 0 0 0 1.57 1.3h7.9a1.6 1.6 0 0 0 1.56-1.22L20.5 8H6"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="16.5" cy="20" r="1.4"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5"/></svg>',
    ing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 7v10l8 4 8-4V7l-8-4z"/><path d="M4 7l8 4 8-4M12 11v9"/></svg>',
    sum: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20V12M12 20V5M19 20v-6"/><path d="M3 20.5h18"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2z"/></svg>',
  };

  const tabs = [
    { href: './index.html', icon: I.pos, label: 'ขาย', key: 'pos' },
    { href: './menu.html', icon: I.menu, label: 'เมนู', key: 'menu' },
    { href: './ingredients.html', icon: I.ing, label: 'วัตถุดิบ', key: 'ing' },
    { href: './summary.html', icon: I.sum, label: 'สรุป', key: 'sum' },
    { href: './settings.html', icon: I.set, label: 'ตั้งค่า', key: 'set' },
  ];

  const active = document.body.dataset.page;
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.innerHTML = '<div class="tabs">' + tabs.map(t =>
    `<a href="${t.href}" class="${t.key === active ? 'active' : ''}" data-tab="${t.key}">
       ${t.icon}<span>${t.label}</span><span class="dot" id="dot-${t.key}"></span>
     </a>`
  ).join('') + '</div>';
  document.body.appendChild(nav);

  // badge เตือน: วัตถุดิบหมดหรือต่ำกว่าจุดเตือน / ไม่ได้ backup เกิน 3 วัน
  try {
    const lows = Store.getIngredients().filter(i => {
      const s = Number(i.stock) || 0, lo = Number(i.lowAt) || 0;
      return s <= 0 || (lo && s <= lo);
    });
    if (lows.length) document.getElementById('dot-ing').classList.add('show');

    const meta = Store.getMeta();
    const hasData = Store.getOrders().length > 0;
    const last = Number(meta.lastExportTs) || 0;
    const DAY = 86400000;
    if (hasData && (Date.now() - last) > 3 * DAY) {
      document.getElementById('dot-set').classList.add('show');
    }
  } catch (e) { /* noop */ }
})();
