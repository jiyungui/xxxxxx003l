/**
 * app.js
 * APP点击：已开发的跳转页面，未开发的弹提示
 */
document.addEventListener("DOMContentLoaded", () => {
  const NAMES = {
    chat: "聊天",
    worldbook: "世界书",
    voice: "心声",
    forum: "论坛",
    diary: "小芽日记",
    street: "街の声",
    candy: "糖果铺",
    music: "音乐",
    settings: "设置",
  };

  /**
   * 已完成的APP：key -> 跳转函数
   * 开发完一个就往这里加一行，data-ready 属性仅作备注用
   * 示例：
   * music:    () => location.href = 'apps/music.html',
   * settings: () => location.href = 'apps/settings.html',
   */
  const READY = {
    // music: () => location.href = 'apps/music.html',
  };

  /* 弹窗元素 */
  const overlay = document.getElementById("modalOverlay");
  const nameSpan = document.getElementById("modalAppName");
  const closeBtn = document.getElementById("modalClose");

  function openApp(key) {
    if (READY[key]) {
      READY[key]();
      return;
    }
    if (nameSpan) nameSpan.textContent = NAMES[key] || key;
    overlay?.classList.add("active");
  }

  function closeModal() {
    overlay?.classList.remove("active");
  }

  /* 绑定主屏APP */
  document
    .querySelectorAll(".app-item[data-app]")
    .forEach((el) =>
      el.addEventListener("click", () => openApp(el.dataset.app)),
    );

  /* 绑定Dock APP */
  document
    .querySelectorAll(".dock-item[data-app]")
    .forEach((el) =>
      el.addEventListener("click", () => openApp(el.dataset.app)),
    );

  /* 关闭弹窗 */
  closeBtn?.addEventListener("click", closeModal);
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
});
