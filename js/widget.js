/**
 * widget.js
 * 负责：
 *  1. 实时时钟
 *  2. 顶部信息卡所有 contenteditable 持久化（blur 时写入，加载时读取）
 *  3. 头像、左侧图片小组件、右侧图片小组件 — 上传后持久化，刷新恢复
 */
document.addEventListener("DOMContentLoaded", () => {
  /* ══════════════════════════
     1. 实时时钟
  ══════════════════════════ */
  function tick() {
    const now = new Date();
    const el = document.getElementById("statusTime");
    if (!el) return;
    el.textContent =
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0");
  }
  tick();
  setInterval(tick, 10000);

  /* ══════════════════════════
     2. contenteditable 持久化
     所有带 data-key 的可编辑元素
  ══════════════════════════ */
  document.querySelectorAll("[contenteditable][data-key]").forEach((el) => {
    const key = el.dataset.key;
    const fallback = el.dataset.default || "";

    // 读取已保存内容，否则用 data-default
    const saved = Storage.getTxt(key, null);
    el.textContent = saved !== null ? saved : fallback;

    // 失焦保存
    el.addEventListener("blur", () => {
      Storage.setTxt(key, el.textContent.trim());
    });

    // 回车 = 失焦（不换行）
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    });
  });

  /* ══════════════════════════
     3. 图片上传 & 持久化
  ══════════════════════════ */

  /**
   * 通用图片绑定
   * @param {string} inputId   - <input type=file> id
   * @param {string} imgId     - <img> id
   * @param {string} storageKey
   * @param {Function} [onLoad] - 图片加载完后额外处理（可选）
   */
  function bindImg(inputId, imgId, storageKey, onLoad) {
    const input = document.getElementById(inputId);
    const img = document.getElementById(imgId);
    if (!input || !img) return;

    // 恢复已保存图片
    const saved = Storage.getImg(storageKey);
    if (saved) showImg(img, saved, onLoad);

    // 选文件后读取
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) {
        alert("图片建议不超过 8MB～");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target.result;
        Storage.setImg(storageKey, url); // 持久化
        showImg(img, url, onLoad);
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * 将 dataURL 显示到 <img>，并隐藏占位符
   */
  function showImg(imgEl, url, onLoad) {
    imgEl.src = url;
    imgEl.classList.remove("hidden");

    // 隐藏同级占位符
    const area = imgEl.closest(".sw-img-area") || imgEl.closest(".tw-avatar");
    if (area) {
      const ph = area.querySelector(".sw-placeholder");
      if (ph) ph.style.display = "none";
    }

    if (typeof onLoad === "function") onLoad(url);
  }

  /* —— 头像 —— */
  (() => {
    const input = document.getElementById("avatarInput");
    const imgEl = document.getElementById("avatarImg");
    const svgEl = document.getElementById("avatarPlaceholder");
    if (!input || !imgEl) return;

    function applyAvatar(url) {
      imgEl.src = url;
      imgEl.classList.remove("hidden");
      if (svgEl) svgEl.style.display = "none";
    }

    const saved = Storage.getImg("avatar");
    if (saved) applyAvatar(saved);

    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        Storage.setImg("avatar", e.target.result);
        applyAvatar(e.target.result);
      };
      reader.readAsDataURL(file);
    });
  })();

  /* —— 左侧图片小组件 —— */
  bindImg("swLeftInput", "swLeftImg", "sw_left");

  /* —— 右侧图片小组件 —— */
  bindImg("swRightInput", "swRightImg", "sw_right");

  /* ══════════════════════════
     4. 壁纸（供设置APP调用）
  ══════════════════════════ */
  function applyWallpaper(url) {
    const layer = document.getElementById("wallpaperLayer");
    if (!layer) return;
    layer.style.backgroundImage = `url(${url})`;
    layer.style.backgroundSize = "cover";
  }

  const savedWp = Storage.getImg("wallpaper");
  if (savedWp) applyWallpaper(savedWp);

  // 挂到全局，设置APP开发后可直接调用 XiXi.setWallpaper(dataURL)
  window.XiXi = window.XiXi || {};
  window.XiXi.setWallpaper = (url) => {
    Storage.setImg("wallpaper", url);
    applyWallpaper(url);
  };
});
