/* ================= PWA: register service worker ================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* รันจากไฟล์ local (file://) จะ register ไม่ได้ — ใช้งานปกติได้ แค่ไม่ cache */
    });
  });
}
